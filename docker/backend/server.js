/**
 * LifeOS Self-Hosted Backend API Server
 * Provides REST API for setup, authentication, and data operations
 * when running in self-hosted mode (Docker/XAMPP) without Supabase.
 */

const http = require('http');
const crypto = require('crypto');

// --- Configuration ---
const PORT = process.env.API_PORT || 3001;
let dbClient = null;
let dbType = process.env.DB_TYPE || 'postgresql'; // postgresql or mysql

// --- Database Connection ---
async function connectDatabase(config) {
  const type = config.dbType || dbType;

  if (type === 'postgresql') {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'lifeos',
      user: config.username || process.env.DB_USER || 'lifeos',
      password: config.password || process.env.DB_PASSWORD || '',
      max: 20,
    });
    await pool.query('SELECT 1');
    return { type: 'postgresql', pool };
  }

  if (type === 'mysql') {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 3306,
      database: config.database || process.env.DB_NAME || 'lifeos',
      user: config.username || process.env.DB_USER || 'root',
      password: config.password || process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 20,
    });
    await pool.query('SELECT 1');
    return { type: 'mysql', pool };
  }

  throw new Error(`Unsupported database type: ${type}`);
}

async function query(sql, params = []) {
  if (!dbClient) throw new Error('Database not connected');

  if (dbClient.type === 'postgresql') {
    const result = await dbClient.pool.query(sql, params);
    return result.rows;
  }

  if (dbClient.type === 'mysql') {
    // Convert $1, $2 placeholders to ? for MySQL
    const mysqlSql = sql.replace(/\$(\d+)/g, '?');
    const [rows] = await dbClient.pool.query(mysqlSql, params);
    return rows;
  }
}

// --- Password Hashing ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// --- JWT-like Token ---
function createToken(userId, email) {
  const payload = {
    sub: userId,
    email,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'lifeos-self-hosted-secret-change-me')
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  try {
    const [data, signature] = token.split('.');
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'lifeos-self-hosted-secret-change-me')
      .update(data)
      .digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- UUID Generator ---
function uuid() {
  return crypto.randomUUID();
}

// --- Schema Initialization ---
const PG_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  onboarding_enabled BOOLEAN DEFAULT true,
  setup_complete BOOLEAN DEFAULT false,
  db_type VARCHAR(20) DEFAULT 'postgresql',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const MYSQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id CHAR(36) PRIMARY KEY,
  onboarding_enabled BOOLEAN DEFAULT TRUE,
  setup_complete BOOLEAN DEFAULT FALSE,
  db_type VARCHAR(20) DEFAULT 'mysql',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_settings (
  id CHAR(36) PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

// --- Request Helpers ---
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function getAuthUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// --- Route Handlers ---
const routes = {};

// Setup: Test connection
routes['POST /api/setup/test-connection'] = async (req, res) => {
  const body = await parseBody(req);
  try {
    const conn = await connectDatabase(body);
    if (conn.type === 'postgresql') await conn.pool.end();
    if (conn.type === 'mysql') await conn.pool.end();
    sendJson(res, 200, { success: true, message: 'Connection successful' });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
};

// Setup: Check status (enhanced for Docker-aware flow)
routes['GET /api/setup/status'] = async (req, res) => {
  try {
    if (!dbClient) {
      // Try to connect with env vars
      try {
        dbClient = await connectDatabase({});
      } catch {
        sendJson(res, 200, { isSetup: false, needsSetup: true, isDocker: !!process.env.DB_HOST });
        return;
      }
    }
    const rows = await query('SELECT setup_complete, db_type FROM app_settings LIMIT 1');
    const isDocker = !!process.env.DB_HOST;

    if (rows.length > 0 && rows[0].setup_complete) {
      sendJson(res, 200, { isSetup: true, needsSetup: false, dbType: rows[0].db_type, isDocker });
    } else {
      // Check if any admin user exists (wizard-created)
      let hasAdmin = false;
      try {
        const adminRows = await query("SELECT COUNT(*) as cnt FROM user_roles WHERE role = 'admin'");
        hasAdmin = parseInt(adminRows[0].cnt) > 0;
      } catch {}
      sendJson(res, 200, { isSetup: false, needsSetup: true, hasAdmin, isDocker, dbType: rows.length > 0 ? rows[0].db_type : dbType });
    }
  } catch {
    sendJson(res, 200, { isSetup: false, needsSetup: true, isDocker: !!process.env.DB_HOST });
  }
};

// Setup: Create admin account (Docker first-run wizard)
routes['POST /api/setup/admin'] = async (req, res) => {
  const body = await parseBody(req);
  const { email, password, name } = body;

  if (!email || !password) {
    sendJson(res, 400, { success: false, message: 'Email and password are required.' });
    return;
  }
  if (password.length < 6) {
    sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters.' });
    return;
  }

  try {
    // Ensure DB is connected and schema exists
    if (!dbClient) {
      dbClient = await connectDatabase({});
      await ensureSchema();
    }

    const adminId = uuid();
    const passwordHash = hashPassword(password);
    const adminName = name || 'Administrator';

    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password_hash = $3, full_name = $4`,
        [adminId, email, passwordHash, adminName]
      );
      const adminRows = await query('SELECT id FROM users WHERE email = $1', [email]);
      const realAdminId = adminRows[0].id;
      await query(
        `INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id) DO UPDATE SET full_name = $3, email = $4`,
        [uuid(), realAdminId, adminName, email]
      );
      // Mark setup as started (not complete until license is done)
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', false, $1)
         ON CONFLICT (id) DO UPDATE SET setup_complete = false`,
        [dbType]
      );
    } else {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES (?, ?, ?, ?, true) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name)`,
        [adminId, email, passwordHash, adminName]
      );
      const adminRows = await query('SELECT id FROM users WHERE email = ?', [email]);
      const realAdminId = adminRows[0].id;
      await query(
        `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email)`,
        [uuid(), realAdminId, adminName, email]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', false, ?)
         ON DUPLICATE KEY UPDATE setup_complete = false`,
        [dbType]
      );
    }

    // Mark that admin was created via wizard (so seedDefaultAdmin skips)
    await setLicenseSetting('wizard_admin_created', 'true');

    sendJson(res, 200, { success: true, message: 'Admin account created successfully.' });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
};

// Setup: Initialize database
routes['POST /api/setup/initialize'] = async (req, res) => {
  const body = await parseBody(req);
  try {
    dbClient = await connectDatabase(body);
    dbType = body.dbType;

    // Create schema
    const schema = dbType === 'mysql' ? MYSQL_SCHEMA : PG_SCHEMA;
    const statements = schema.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) await query(stmt + ';');
    }

    // Create admin user
    const adminId = uuid();
    const passwordHash = hashPassword(body.adminPassword);

    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
        [adminId, body.adminEmail, passwordHash, body.adminName || 'Administrator']
      );
      await query(
        `INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin'::app_role) ON CONFLICT DO NOTHING`,
        [uuid(), adminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id) DO UPDATE SET full_name = $3, email = $4`,
        [uuid(), adminId, body.adminName || 'Administrator', body.adminEmail]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ($1, true, $2)
         ON CONFLICT DO NOTHING`,
        [uuid(), dbType]
      );
    } else {
      // MySQL
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES (?, ?, ?, ?, true) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [adminId, body.adminEmail, passwordHash, body.adminName || 'Administrator']
      );
      await query(
        `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
        [uuid(), adminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email)`,
        [uuid(), adminId, body.adminName || 'Administrator', body.adminEmail]
      );
      await query(
        `INSERT IGNORE INTO app_settings (id, setup_complete, db_type) VALUES (?, true, ?)`,
        [uuid(), dbType]
      );
    }

    sendJson(res, 200, { success: true, message: 'Database initialized successfully' });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
};

// Auth: Login
routes['POST /api/auth/login'] = async (req, res) => {
  const { email, password } = await parseBody(req);
  try {
    const users = await query('SELECT id, email, password_hash, full_name FROM users WHERE email = $1', [email]);
    if (users.length === 0) {
      sendJson(res, 401, { message: 'Invalid email or password' });
      return;
    }
    const user = users[0];
    if (!verifyPassword(password, user.password_hash)) {
      sendJson(res, 401, { message: 'Invalid email or password' });
      return;
    }
    const token = createToken(user.id, user.email);

    // Get roles
    const roles = await query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);

    sendJson(res, 200, {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        roles: roles.map((r) => r.role),
      },
    });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
};

// Auth: Register
routes['POST /api/auth/register'] = async (req, res) => {
  const { email, password, full_name } = await parseBody(req);
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      sendJson(res, 409, { message: 'Email already registered' });
      return;
    }

    const userId = uuid();
    const passwordHash = hashPassword(password);

    await query(
      'INSERT INTO users (id, email, password_hash, full_name, email_verified) VALUES ($1, $2, $3, $4, true)',
      [userId, email, passwordHash, full_name || '']
    );
    await query('INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, $3::app_role)', [uuid(), userId, 'user']);
    await query(
      'INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, $3, $4)',
      [uuid(), userId, full_name || '', email]
    );

    const token = createToken(userId, email);
    sendJson(res, 201, {
      token,
      user: { id: userId, email, full_name, roles: ['user'] },
    });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
};

// Auth: Session
routes['GET /api/auth/session'] = async (req, res) => {
  const payload = getAuthUser(req);
  if (!payload) {
    sendJson(res, 401, { message: 'Not authenticated' });
    return;
  }
  try {
    const users = await query('SELECT id, email, full_name FROM users WHERE id = $1', [payload.sub]);
    if (users.length === 0) {
      sendJson(res, 401, { message: 'User not found' });
      return;
    }
    const roles = await query('SELECT role FROM user_roles WHERE user_id = $1', [payload.sub]);
    sendJson(res, 200, {
      user: { ...users[0], roles: roles.map((r) => r.role) },
    });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
};

// Auth: Logout
routes['POST /api/auth/logout'] = async (req, res) => {
  sendJson(res, 200, { success: true });
};

// --- License Verification via Supabase Edge Function ---
const LICENSE_VERIFY_URL = process.env.LICENSE_API_URL || 'https://abcytwvuntyicdknpzju.supabase.co/functions/v1/verify-license';
const LICENSE_ENCRYPTION_KEY = 'ITSupportBD_SecureKey_2024';
const LICENSE_VERIFICATION_INTERVAL = 86400; // 24 hours
const LICENSE_GRACE_PERIOD_DAYS = 7;
const LICENSE_OFFLINE_MAX_DAYS = 30;
const LICENSE_OFFLINE_WARNING_DAYS = 9;

// In-memory license cache (persisted to DB)
let licenseCache = {
  status: 'unknown',
  message: 'License status unknown.',
  max_devices: 0,
  expires_at: null,
  last_verified: 0,
  last_verified_key: null,
  last_successful_connection: null,
};

function decryptLicenseData(encryptedBase64) {
  try {
    const data = Buffer.from(encryptedBase64, 'base64');
    const ivLength = 16;
    const iv = data.slice(0, ivLength);
    const ciphertextBase64 = data.slice(ivLength).toString('utf8');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    const keyBuffer = Buffer.alloc(32);
    Buffer.from(LICENSE_ENCRYPTION_KEY, 'utf8').copy(keyBuffer);

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('License decryption error:', err.message);
    return null;
  }
}

// Get or create installation ID
async function getOrCreateInstallationId() {
  try {
    if (dbType === 'postgresql') {
      const rows = await query("SELECT setting_value FROM license_settings WHERE setting_key = 'installation_id'");
      if (rows.length > 0 && rows[0].setting_value) return rows[0].setting_value;
      
      const installId = 'LIFEOS-' + uuid();
      await query(
        "INSERT INTO license_settings (id, setting_key, setting_value) VALUES ($1, 'installation_id', $2) ON CONFLICT (setting_key) DO NOTHING",
        [uuid(), installId]
      );
      return installId;
    } else {
      const rows = await query("SELECT setting_value FROM license_settings WHERE setting_key = 'installation_id'");
      if (rows.length > 0 && rows[0].setting_value) return rows[0].setting_value;
      
      const installId = 'LIFEOS-' + uuid();
      await query(
        "INSERT IGNORE INTO license_settings (id, setting_key, setting_value) VALUES (?, 'installation_id', ?)",
        [uuid(), installId]
      );
      return installId;
    }
  } catch {
    return 'LIFEOS-' + uuid();
  }
}

// Get/set license settings from DB
async function getLicenseSetting(key) {
  try {
    const rows = await query("SELECT setting_value FROM license_settings WHERE setting_key = $1", [key]);
    return rows.length > 0 ? rows[0].setting_value : null;
  } catch { return null; }
}

async function setLicenseSetting(key, value) {
  try {
    if (dbType === 'postgresql') {
      await query(
        "INSERT INTO license_settings (id, setting_key, setting_value) VALUES ($1, $2, $3) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $3, updated_at = NOW()",
        [uuid(), key, value]
      );
    } else {
      await query(
        "INSERT INTO license_settings (id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP",
        [uuid(), key, value]
      );
    }
  } catch (err) {
    console.error(`Error setting license setting ${key}:`, err.message);
  }
}

// Load license cache from DB
async function loadLicenseCache() {
  const cached = await getLicenseSetting('license_cache');
  if (cached) {
    try {
      const data = JSON.parse(cached);
      Object.assign(licenseCache, data);
    } catch {}
  }
}

// Save license cache to DB
async function saveLicenseCache() {
  await setLicenseSetting('license_cache', JSON.stringify(licenseCache));
}

// Core license verification function
async function verifyLicenseWithPortal(licenseKey, force = false) {
  if (!licenseKey) {
    licenseCache.status = 'unconfigured';
    licenseCache.message = 'Application license key is missing.';
    return licenseCache;
  }

  // Check if key changed
  if (licenseCache.last_verified_key !== licenseKey) force = true;

  // Use cached data if within interval
  if (!force && licenseCache.last_verified && (Date.now() / 1000 - licenseCache.last_verified) < LICENSE_VERIFICATION_INTERVAL) {
    return licenseCache;
  }

  const installationId = await getOrCreateInstallationId();
  let deviceCount = 1;
  try {
    const countRows = await query('SELECT COUNT(*) as cnt FROM users');
    deviceCount = parseInt(countRows[0].cnt) || 1;
  } catch {}

  const postData = JSON.stringify({
    app_license_key: licenseKey,
    user_id: 'lifeos-backend',
    current_device_count: deviceCount,
    installation_id: installationId,
  });

  try {
    const https = require('https');
    const http_mod = require('http');
    const url = new URL(LICENSE_VERIFY_URL);
    const requestModule = url.protocol === 'https:' ? https : http_mod;

    const portalResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        rejectUnauthorized: false,
      };

      const request = requestModule.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve(body));
      });

      request.on('error', reject);
      request.setTimeout(10000, () => { request.destroy(); reject(new Error('Timeout')); });
      request.write(postData);
      request.end();
    });

    const result = decryptLicenseData(portalResponse);
    if (!result) {
      // Try plain JSON fallback
      try {
        const plain = JSON.parse(portalResponse);
        Object.assign(result || {}, plain);
      } catch {
        licenseCache.status = 'error';
        licenseCache.message = 'Failed to decrypt license response.';
        licenseCache.last_verified = Math.floor(Date.now() / 1000);
        await saveLicenseCache();
        return licenseCache;
      }
    }

    // Successful connection - reset offline counter
    licenseCache.last_successful_connection = Math.floor(Date.now() / 1000);
    await setLicenseSetting('last_successful_portal_connection', String(licenseCache.last_successful_connection));

    licenseCache.status = result.actual_status || 'invalid';
    licenseCache.message = result.message || 'License is invalid.';
    licenseCache.max_devices = result.max_devices || 0;
    licenseCache.expires_at = result.expires_at || null;

    // Handle grace period
    if (licenseCache.status === 'expired' && licenseCache.expires_at) {
      const expiryTs = new Date(licenseCache.expires_at).getTime() / 1000;
      const graceEnd = expiryTs + LICENSE_GRACE_PERIOD_DAYS * 86400;
      if (Date.now() / 1000 < graceEnd) {
        licenseCache.status = 'grace_period';
        licenseCache.message = `License expired. Grace period until ${new Date(graceEnd * 1000).toISOString()}.`;
      } else {
        licenseCache.status = 'disabled';
        licenseCache.message = 'License expired and grace period ended.';
      }
    }

    licenseCache.last_verified = Math.floor(Date.now() / 1000);
    licenseCache.last_verified_key = licenseKey;
    await saveLicenseCache();

    console.log(`LICENSE_INFO: Verification completed. Status: ${licenseCache.status}`);
    return licenseCache;

  } catch (err) {
    console.error('LICENSE_ERROR: Portal unreachable:', err.message);

    // Offline mode handling
    let lastConn = licenseCache.last_successful_connection;
    if (!lastConn) {
      const stored = await getLicenseSetting('last_successful_portal_connection');
      lastConn = stored ? parseInt(stored) : Math.floor(Date.now() / 1000);
      if (!stored) await setLicenseSetting('last_successful_portal_connection', String(lastConn));
      licenseCache.last_successful_connection = lastConn;
    }

    const daysOffline = Math.floor((Date.now() / 1000 - lastConn) / 86400);

    if (daysOffline >= LICENSE_OFFLINE_MAX_DAYS) {
      licenseCache.status = 'offline_expired';
      licenseCache.message = `Disabled: Unable to verify for ${daysOffline} days.`;
    } else if (daysOffline >= LICENSE_OFFLINE_WARNING_DAYS) {
      const remaining = LICENSE_OFFLINE_MAX_DAYS - daysOffline;
      licenseCache.status = 'offline_warning';
      licenseCache.message = `WARNING: Offline for ${daysOffline} days. Disabled in ${remaining} days.`;
    } else {
      licenseCache.status = 'offline_mode';
      licenseCache.message = `Offline mode (Day ${daysOffline}/${LICENSE_OFFLINE_MAX_DAYS}).`;
    }

    licenseCache.last_verified = Math.floor(Date.now() / 1000);
    await saveLicenseCache();
    return licenseCache;
  }
}

// API: Verify license
routes['POST /api/license/verify'] = async (req, res) => {
  const { license_key } = await parseBody(req);
  if (!license_key) {
    sendJson(res, 400, { success: false, message: 'License key is required.' });
    return;
  }

  try {
    const result = await verifyLicenseWithPortal(license_key, true);
    const isActive = ['active', 'free', 'grace_period', 'offline_mode', 'offline_warning'].includes(result.status);

    // Save license key on success
    if (isActive) {
      await setLicenseSetting('app_license_key', license_key);
    }

    sendJson(res, 200, {
      success: isActive,
      message: result.message,
      actual_status: result.status,
      max_devices: result.max_devices,
      expires_at: result.expires_at,
    });
  } catch (err) {
    console.error('License verification error:', err.message);
    sendJson(res, 500, { success: false, message: 'License verification failed: ' + err.message });
  }
};

// API: Get license status (for UI)
routes['GET /api/license/status'] = async (req, res) => {
  await loadLicenseCache();
  const licenseKey = await getLicenseSetting('app_license_key');
  const hasKey = !!licenseKey;

  sendJson(res, 200, {
    configured: hasKey,
    status: licenseCache.status,
    message: licenseCache.message,
    max_devices: licenseCache.max_devices,
    expires_at: licenseCache.expires_at,
    last_verified: licenseCache.last_verified,
  });
};

// API: Setup license (initial activation) — marks setup_complete = true
routes['POST /api/license/setup'] = async (req, res) => {
  const { license_key } = await parseBody(req);
  if (!license_key || license_key.trim().length === 0) {
    sendJson(res, 400, { success: false, message: 'License key is required.' });
    return;
  }

  try {
    const result = await verifyLicenseWithPortal(license_key.trim(), true);
    const isActive = ['active', 'free', 'grace_period'].includes(result.status);

    if (isActive) {
      await setLicenseSetting('app_license_key', license_key.trim());

      // Mark setup as fully complete now that license is activated
      if (dbType === 'postgresql') {
        await query(
          `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, $1)
           ON CONFLICT (id) DO UPDATE SET setup_complete = true`,
          [dbType]
        );
      } else {
        await query(
          `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, ?)
           ON DUPLICATE KEY UPDATE setup_complete = true`,
          [dbType]
        );
      }

      sendJson(res, 200, { success: true, message: 'License activated successfully!', status: result.status });
    } else {
      sendJson(res, 200, { success: false, message: result.message, status: result.status });
    }
  } catch (err) {
    sendJson(res, 500, { success: false, message: 'Verification failed: ' + err.message });
  }
};

// --- License Enforcement Middleware ---
const LICENSE_EXEMPT_ROUTES = [
  'POST /api/license/verify',
  'POST /api/license/setup',
  'GET /api/license/status',
  'POST /api/setup/test-connection',
  'GET /api/setup/status',
  'POST /api/setup/initialize',
  'POST /api/setup/admin',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/auth/register',
];

async function checkLicenseMiddleware(req) {
  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  if (LICENSE_EXEMPT_ROUTES.includes(routeKey)) return true;

  // If license not loaded yet, try to load
  if (licenseCache.status === 'unknown') {
    await loadLicenseCache();
  }

  const allowedStatuses = ['active', 'free', 'grace_period', 'offline_mode', 'offline_warning', 'unknown'];
  return allowedStatuses.includes(licenseCache.status);
}

// --- Setup Enforcement Middleware ---
async function checkSetupMiddleware(req) {
  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  // Always allow setup, license, and auth routes
  const setupExempt = [
    'GET /api/setup/status', 'POST /api/setup/admin', 'POST /api/setup/initialize', 'POST /api/setup/test-connection',
    'POST /api/license/verify', 'POST /api/license/setup', 'GET /api/license/status',
    'POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/auth/register', 'GET /api/auth/session',
  ];
  if (setupExempt.includes(routeKey)) return true;

  // Check if setup is complete
  try {
    const rows = await query('SELECT setup_complete FROM app_settings LIMIT 1');
    if (rows.length > 0 && rows[0].setup_complete) return true;
  } catch {}
  return false;
}

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end();
    return;
  }

  // Setup enforcement — block everything until setup is complete
  const setupOk = await checkSetupMiddleware(req);
  if (!setupOk) {
    sendJson(res, 403, {
      message: 'Setup not complete. Please complete the setup wizard first.',
      needs_setup: true,
    });
    return;
  }

  // License enforcement
  const licenseOk = await checkLicenseMiddleware(req);
  if (!licenseOk) {
    sendJson(res, 403, {
      message: 'License is not active. Please configure a valid license.',
      license_status: licenseCache.status,
      license_message: licenseCache.message,
    });
    return;
  }

  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  const handler = routes[routeKey];

  if (handler) {
    try {
      await handler(req, res);
    } catch (err) {
      sendJson(res, 500, { message: err.message });
    }
  } else {
    sendJson(res, 404, { message: 'Not found' });
  }
});

// --- Seed Default Admin ---
async function seedDefaultAdmin() {
  try {
    // Skip seeding if admin was already created through the setup wizard
    const wizardCreated = await getLicenseSetting('wizard_admin_created');
    if (wizardCreated === 'true') {
      console.log('✅ Admin already configured via setup wizard — skipping default seed.');
      return;
    }

    // Also skip if running in Docker mode and no ADMIN_EMAIL env var (let wizard handle it)
    if (process.env.DB_HOST && !process.env.ADMIN_EMAIL) {
      // Check if any admin exists
      const existingAdmins = await query("SELECT COUNT(*) as cnt FROM user_roles WHERE role = 'admin'");
      if (parseInt(existingAdmins[0].cnt) === 0) {
        // No admin exists, and no env vars — setup wizard will handle it
        console.log('⏳ No admin configured. Setup wizard will prompt for admin credentials.');
        // Don't mark setup_complete — let the wizard do it
        await query(
          dbType === 'postgresql'
            ? `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', false, $1) ON CONFLICT (id) DO NOTHING`
            : `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', false, ?) ON DUPLICATE KEY UPDATE id = id`,
          [dbType]
        );
        return;
      }
    }

    // Use env vars for headless setup if provided
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lifeos.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'LifeOS@2024!';
    const passwordHash = hashPassword(adminPassword);

    // Upsert admin user
    const adminId = uuid();
    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES ($1, $2, $3, 'System Administrator', true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
        [adminId, adminEmail, passwordHash]
      );
    } else {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES (?, ?, ?, 'System Administrator', true)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [adminId, adminEmail, passwordHash]
      );
    }

    // Get the actual admin user id (may differ if user already existed)
    const adminRows = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const realAdminId = adminRows[0].id;

    // Ensure admin role
    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, 'System Administrator', $3)
         ON CONFLICT (user_id) DO UPDATE SET full_name = 'System Administrator', email = $3`,
        [uuid(), realAdminId, adminEmail]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, $1)
         ON CONFLICT (id) DO UPDATE SET setup_complete = true`,
        [dbType]
      );
    } else {
      await query(
        `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, 'System Administrator', ?)
         ON DUPLICATE KEY UPDATE full_name = 'System Administrator', email = VALUES(email)`,
        [uuid(), realAdminId, adminEmail]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, ?)
         ON DUPLICATE KEY UPDATE setup_complete = true`,
        [dbType]
      );
    }

    console.log(`✅ Admin user seeded: ${adminEmail}`);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    throw err; // Re-throw so retry logic can catch it
  }
}

// --- Ensure Schema Exists ---
async function ensureSchema() {
  try {
    // Check if app_settings table exists
    if (dbType === 'postgresql') {
      const check = await query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_settings') AS exists"
      );
      if (!check[0].exists) {
        console.log('Running schema initialization...');
        const schema = PG_SCHEMA;
        const statements = schema.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) await query(stmt + ';');
        }
        console.log('Schema initialized successfully');
      }
    } else {
      const check = await query(
        "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'app_settings'"
      );
      if (check[0].cnt === 0) {
        console.log('Running schema initialization...');
        const schema = MYSQL_SCHEMA;
        const statements = schema.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) await query(stmt + ';');
        }
        console.log('Schema initialized successfully');
      }
    }
  } catch (err) {
    console.error('Error ensuring schema:', err.message);
  }
}

// --- Startup with Retry ---
async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      dbClient = await connectDatabase({});
      console.log(`✅ Connected to ${dbType} database (attempt ${attempt})`);
      return true;
    } catch (err) {
      console.log(`⏳ DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  return false;
}

async function start() {
  if (process.env.DB_HOST) {
    const connected = await connectWithRetry();
    if (connected) {
      try {
        await ensureSchema();
        console.log('✅ Schema verified');
      } catch (err) {
        console.error('❌ Schema init failed:', err.message);
      }
      try {
        await seedDefaultAdmin();
      } catch (err) {
        console.error('❌ Admin seeding failed after retries:', err.message);
      }

      // Auto-verify license on startup
      try {
        await loadLicenseCache();
        const envKey = process.env.APP_LICENSE_KEY;
        const storedKey = await getLicenseSetting('app_license_key');
        const licenseKey = envKey || storedKey;

        if (licenseKey) {
          // Save env key to DB if provided
          if (envKey && envKey !== storedKey) {
            await setLicenseSetting('app_license_key', envKey);
          }
          console.log('🔑 Verifying license on startup...');
          const result = await verifyLicenseWithPortal(licenseKey, true);
          console.log(`🔑 License status: ${result.status} - ${result.message}`);

          // Schedule periodic re-verification every 30 days
          const RECHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
          setInterval(async () => {
            try {
              const currentKey = await getLicenseSetting('app_license_key');
              if (currentKey) {
                console.log('🔄 Periodic license re-verification (30-day interval)...');
                const recheckResult = await verifyLicenseWithPortal(currentKey, true);
                console.log(`🔄 License recheck: ${recheckResult.status} - ${recheckResult.message}`);
              }
            } catch (recheckErr) {
              console.error('⚠️ Periodic license recheck failed:', recheckErr.message);
            }
          }, RECHECK_INTERVAL_MS);
          console.log('⏰ Periodic license re-check scheduled (every 30 days)');
        } else {
          console.log('⚠️ No license key configured. Set APP_LICENSE_KEY in docker-compose.yml or use /api/license/setup');
        }
      } catch (err) {
        console.error('⚠️ License check on startup failed:', err.message);
      }
    } else {
      console.error('❌ Could not connect to database after all retries');
    }
  } else {
    console.log('No database configured. Setup wizard will guide you.');
  }

  server.listen(PORT, () => {
    console.log(`✅ LifeOS API server running on port ${PORT}`);
  });
}

start();
