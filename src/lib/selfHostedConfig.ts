// Self-hosted configuration detection and management
// Determines if the app is running in Cloud (Supabase) mode or Self-hosted (local DB) mode

export interface SelfHostedConfig {
  mode: 'cloud' | 'selfhosted';
  apiUrl: string;
  dbType?: 'postgresql' | 'mysql';
  isSetupComplete: boolean;
}

export function detectMode(): SelfHostedConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const selfHostedApi = import.meta.env.VITE_SELFHOSTED_API_URL;

  // If Supabase env vars are set, non-empty, and valid, use cloud mode
  if (supabaseUrl.length > 0 && supabaseKey.length > 0 && supabaseUrl.includes('supabase')) {
    return {
      mode: 'cloud',
      apiUrl: supabaseUrl,
      isSetupComplete: true,
    };
  }

  // Self-hosted mode
  const apiUrl = selfHostedApi || '/api';
  const setupDone = localStorage.getItem('lifeos_setup_complete') === 'true';

  return {
    mode: 'selfhosted',
    apiUrl,
    dbType: (localStorage.getItem('lifeos_db_type') as 'postgresql' | 'mysql') || undefined,
    isSetupComplete: setupDone,
  };
}

export function isSelfHosted(): boolean {
  return detectMode().mode === 'selfhosted';
}

export function markSetupComplete() {
  localStorage.setItem('lifeos_setup_complete', 'true');
}

export function getApiUrl(): string {
  return detectMode().apiUrl;
}

// Self-hosted API client for local database operations
export class SelfHostedApi {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('lifeos_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API error: ${res.status}`);
    }

    return res.json();
  }

  // Setup endpoints
  async testConnection(config: {
    dbType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }) {
    return this.request('/setup/test-connection', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async initializeDatabase(config: {
    dbType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }) {
    return this.request('/setup/initialize', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async checkSetupStatus(): Promise<{ isSetup: boolean; dbType?: string }> {
    return this.request('/setup/status');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.token;
    localStorage.setItem('lifeos_token', result.token);
    return result;
  }

  async register(email: string, password: string, fullName: string) {
    const result = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    this.token = result.token;
    localStorage.setItem('lifeos_token', result.token);
    return result;
  }

  async getSession() {
    try {
      return await this.request<{ user: any }>('/auth/session');
    } catch {
      return null;
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.token = null;
      localStorage.removeItem('lifeos_token');
    }
  }
}

export const selfHostedApi = new SelfHostedApi();
