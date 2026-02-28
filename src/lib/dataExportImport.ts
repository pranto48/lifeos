import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';

export type ExportableEntity = 
  | 'tasks' | 'task_categories' | 'task_checklists' | 'task_follow_up_notes'
  | 'notes' | 'support_users' | 'support_departments' | 'support_units'
  | 'device_inventory' | 'device_categories' | 'device_suppliers' | 'device_service_history'
  | 'projects' | 'project_milestones'
  | 'profiles' | 'user_roles';

export type ExportFormat = 'json' | 'xml';

interface ExportConfig {
  entities: ExportableEntity[];
  label: string;
}

export const EXPORT_PRESETS: Record<string, ExportConfig> = {
  tasks: {
    label: 'Tasks',
    entities: ['tasks', 'task_categories', 'task_checklists', 'task_follow_up_notes'],
  },
  task_categories: {
    label: 'Task Categories',
    entities: ['task_categories'],
  },
  notes: {
    label: 'Notes',
    entities: ['notes'],
  },
  support_users: {
    label: 'Support Users',
    entities: ['support_units', 'support_departments', 'support_users'],
  },
  devices: {
    label: 'Devices',
    entities: ['device_categories', 'device_suppliers', 'device_inventory', 'device_service_history'],
  },
  projects: {
    label: 'Projects',
    entities: ['projects', 'project_milestones'],
  },
  users_roles: {
    label: 'Users & Roles',
    entities: ['profiles', 'user_roles'],
  },
};

// Tables that are NOT user-scoped (shared/global data)
const SHARED_TABLES = new Set([
  'support_units', 'support_departments', 'support_users',
  'device_categories', 'device_suppliers', 'device_inventory', 'device_service_history',
  'user_roles',
]);

export async function fetchEntityData(entity: ExportableEntity, userId: string): Promise<any[]> {
  if (isSelfHosted()) {
    // For self-hosted, use the PostgREST proxy which handles scoping properly
    const isShared = SHARED_TABLES.has(entity);
    try {
      if (isShared) {
        // Fetch all rows for shared tables via PostgREST proxy
        const response = await fetch(`${getApiBaseUrl()}/rest/v1/${entity}?select=*`, {
          headers: getRestHeaders(),
        });
        if (!response.ok) throw new Error(`Failed to fetch ${entity}`);
        return await response.json();
      } else {
        return selfHostedApi.selectAll(entity);
      }
    } catch {
      // Fallback to data API
      return selfHostedApi.selectAll(entity);
    }
  }
  const isShared = SHARED_TABLES.has(entity);
  let query = supabase.from(entity).select('*');
  if (!isShared) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function getApiBaseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl && !supabaseUrl.includes('__LIFEOS_URL_PLACEHOLDER__')) {
    return supabaseUrl;
  }
  return window.location.origin;
}

function getRestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'anon',
  };
  const token = localStorage.getItem('lifeos_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function exportData(
  preset: string,
  userId: string,
  format: ExportFormat,
  selectedEntities?: ExportableEntity[],
  onProgress?: (entity: string, pct: number) => void,
): Promise<{ blob: Blob; filename: string }> {
  const config = EXPORT_PRESETS[preset];
  if (!config) throw new Error(`Unknown preset: ${preset}`);

  const entities = selectedEntities && selectedEntities.length > 0 ? selectedEntities : config.entities;
  const result: Record<string, any[]> = {};
  const total = entities.length;

  for (let i = 0; i < total; i++) {
    const entity = entities[i];
    onProgress?.(entity, ((i) / total) * 100);
    result[entity] = await fetchEntityData(entity, userId);
    onProgress?.(entity, ((i + 1) / total) * 100);
  }

  const exportPayload = {
    exportType: preset,
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: result,
  };

  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    return { blob, filename: `lifeos-${preset}-${dateStr}.json` };
  } else {
    const xml = jsonToXml(exportPayload, 'LifeOSExport');
    const blob = new Blob([xml], { type: 'application/xml' });
    return { blob, filename: `lifeos-${preset}-${dateStr}.xml` };
  }
}

export async function importData(
  file: File,
  userId: string,
  onProgress?: (msg: string) => void,
  onPct?: (pct: number) => void,
  conflictResolution: 'overwrite' | 'skip' = 'overwrite',
): Promise<{ imported: number; errors: string[] }> {
  const text = await file.text();
  let payload: any;

  if (file.name.endsWith('.xml')) {
    payload = xmlToJson(text);
  } else {
    payload = JSON.parse(text);
  }

  if (!payload?.data || !payload?.exportType) {
    throw new Error('Invalid export file. Missing "data" or "exportType" field.');
  }

  const preset = EXPORT_PRESETS[payload.exportType];
  if (!preset) {
    throw new Error(`Unknown export type: ${payload.exportType}`);
  }

  let imported = 0;
  const errors: string[] = [];
  const isShared = (entity: string) => SHARED_TABLES.has(entity as ExportableEntity);
  const total = preset.entities.length;

  for (let idx = 0; idx < total; idx++) {
    const entity = preset.entities[idx];
    const rows = payload.data[entity];
    if (!Array.isArray(rows) || rows.length === 0) {
      onPct?.(((idx + 1) / total) * 100);
      continue;
    }

    onProgress?.(`Importing ${entity.replace(/_/g, ' ')} (${rows.length} items)...`);
    onPct?.((idx / total) * 100);

    // If skip mode, filter out existing IDs
    let filteredRows = rows;
    if (conflictResolution === 'skip') {
      try {
        const existingData = await fetchEntityData(entity as ExportableEntity, userId);
        const existingIds = new Set(existingData.map((r: any) => r.id));
        filteredRows = rows.filter((row: any) => !existingIds.has(row.id));
      } catch {
        // If fetch fails, proceed with all rows
      }
    }

    if (filteredRows.length === 0) {
      onPct?.(((idx + 1) / total) * 100);
      continue;
    }

    const cleaned = filteredRows.map((row: any) => {
      const { search_vector, ...rest } = row;
      // Remap user_id to current user for ALL tables during import
      // This ensures cross-platform compatibility (web <-> Docker)
      if (rest.user_id) {
        rest.user_id = userId;
      }
      return rest;
    });

    // Determine the correct onConflict key for upsert
    const onConflictKey = getOnConflictKey(entity);

    try {
      if (isSelfHosted()) {
        // Use PostgREST proxy for Docker imports (supports upsert via Prefer header)
        await upsertViaPostgrest(entity, cleaned);
      } else {
        for (let i = 0; i < cleaned.length; i += 100) {
          const batch = cleaned.slice(i, i + 100);
          const { error } = await supabase.from(entity as any).upsert(batch as any, { onConflict: onConflictKey });
          if (error) {
            errors.push(`${entity}: ${error.message}`);
          }
          // Sub-progress within entity
          const subPct = (idx / total + ((i + batch.length) / cleaned.length) / total) * 100;
          onPct?.(subPct);
        }
      }
      imported += cleaned.length;
    } catch (err: any) {
      errors.push(`${entity}: ${err.message}`);
    }

    onPct?.(((idx + 1) / total) * 100);
  }

  return { imported, errors };
}

// Use PostgREST proxy for Docker upserts - this preserves created_at/updated_at
async function upsertViaPostgrest(table: string, rows: any[]): Promise<void> {
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const response = await fetch(`${getApiBaseUrl()}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        ...getRestHeaders(),
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Import failed for ${table}`);
    }
  }
}

// Get the correct onConflict key for each entity during upsert
function getOnConflictKey(entity: string): string {
  switch (entity) {
    case 'profiles':
      return 'user_id';  // profiles has unique constraint on user_id
    case 'user_roles':
      return 'user_id,role';  // user_roles has unique(user_id, role)
    default:
      return 'id';
  }
}

// ---- XML helpers ----

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function jsonToXml(obj: any, rootName: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<${rootName}>\n`;
  xml += objectToXml(obj, 1);
  xml += `</${rootName}>`;
  return xml;
}

function objectToXml(obj: any, indent: number): string {
  const pad = '  '.repeat(indent);
  let xml = '';

  for (const [key, val] of Object.entries(obj)) {
    const tag = key.replace(/[^a-zA-Z0-9_]/g, '_');
    if (Array.isArray(val)) {
      xml += `${pad}<${tag}>\n`;
      for (const item of val) {
        xml += `${pad}  <item>\n`;
        if (typeof item === 'object' && item !== null) {
          xml += objectToXml(item, indent + 2);
        } else {
          xml += `${pad}    <value>${escapeXml(String(item ?? ''))}</value>\n`;
        }
        xml += `${pad}  </item>\n`;
      }
      xml += `${pad}</${tag}>\n`;
    } else if (typeof val === 'object' && val !== null) {
      xml += `${pad}<${tag}>\n`;
      xml += objectToXml(val, indent + 1);
      xml += `${pad}</${tag}>\n`;
    } else {
      xml += `${pad}<${tag}>${escapeXml(String(val ?? ''))}</${tag}>\n`;
    }
  }
  return xml;
}

function xmlToJson(xmlStr: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const root = doc.documentElement;

  if (root.querySelector('parsererror')) {
    throw new Error('Invalid XML file');
  }

  return xmlNodeToJson(root);
}

// Public wrapper for conflict detection in the component
export function xmlToJsonPublic(xmlStr: string): any {
  return xmlToJson(xmlStr);
}

function xmlNodeToJson(node: Element): any {
  const result: any = {};

  for (const child of Array.from(node.children)) {
    const tag = child.tagName;

    if (child.children.length > 0 && child.children[0]?.tagName === 'item') {
      result[tag] = Array.from(child.children)
        .filter(c => c.tagName === 'item')
        .map(item => {
          if (item.children.length === 1 && item.children[0].tagName === 'value') {
            return parsePrimitive(item.children[0].textContent || '');
          }
          return xmlNodeToJson(item);
        });
    } else if (child.children.length > 0) {
      result[tag] = xmlNodeToJson(child);
    } else {
      result[tag] = parsePrimitive(child.textContent || '');
    }
  }

  return result;
}

function parsePrimitive(val: string): any {
  if (val === 'null' || val === '') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val) && val.length < 16) return Number(val);
  return val;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
