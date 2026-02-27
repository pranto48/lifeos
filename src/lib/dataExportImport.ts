import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';

export type ExportableEntity = 
  | 'tasks' | 'task_categories' | 'task_checklists' | 'task_follow_up_notes'
  | 'notes' | 'support_users' | 'support_departments' | 'support_units'
  | 'device_inventory' | 'device_categories' | 'device_suppliers' | 'device_service_history'
  | 'projects' | 'project_milestones';

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
};

// Tables that don't filter by user_id (shared data)
const SHARED_TABLES = new Set(['support_units', 'support_departments', 'support_users', 'device_categories', 'device_suppliers', 'device_inventory', 'device_service_history']);

export async function fetchEntityData(entity: ExportableEntity, userId: string): Promise<any[]> {
  if (isSelfHosted()) {
    return selfHostedApi.selectAll(entity);
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

export async function exportData(
  preset: string,
  userId: string,
  format: ExportFormat
): Promise<{ blob: Blob; filename: string }> {
  const config = EXPORT_PRESETS[preset];
  if (!config) throw new Error(`Unknown preset: ${preset}`);

  const result: Record<string, any[]> = {};
  
  await Promise.all(
    config.entities.map(async (entity) => {
      result[entity] = await fetchEntityData(entity, userId);
    })
  );

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

  // Import in order (parents first)
  for (const entity of preset.entities) {
    const rows = payload.data[entity];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    onProgress?.(`Importing ${entity} (${rows.length} items)...`);

    // Strip generated columns and inject user_id for user-scoped tables
    const cleaned = rows.map((row: any) => {
      const { search_vector, ...rest } = row;
      if (!isShared(entity)) {
        rest.user_id = userId;
      }
      return rest;
    });

    try {
      if (isSelfHosted()) {
        await selfHostedApi.upsertBatch(entity, cleaned);
      } else {
        // Upsert in batches of 100
        for (let i = 0; i < cleaned.length; i += 100) {
          const batch = cleaned.slice(i, i + 100);
          const { error } = await supabase.from(entity as any).upsert(batch as any, { onConflict: 'id' });
          if (error) {
            errors.push(`${entity}: ${error.message}`);
          }
        }
      }
      imported += cleaned.length;
    } catch (err: any) {
      errors.push(`${entity}: ${err.message}`);
    }
  }

  return { imported, errors };
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

function xmlNodeToJson(node: Element): any {
  const result: any = {};

  for (const child of Array.from(node.children)) {
    const tag = child.tagName;

    // Check if this is an array (has <item> children)
    if (child.children.length > 0 && child.children[0]?.tagName === 'item') {
      result[tag] = Array.from(child.children)
        .filter(c => c.tagName === 'item')
        .map(item => {
          // If item has a single <value> child, return primitive
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
