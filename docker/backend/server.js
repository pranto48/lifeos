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

// Setup: Check status
routes['GET /api/setup/status'] = async (req, res) => {
  try {
    if (!dbClient) {
      // Try to connect with env vars
      try {
        dbClient = await connectDatabase({});
      } catch {
        sendJson(res, 200, { isSetup: false });
        return;
      }
    }
    const rows = await query('SELECT setup_complete, db_type FROM app_settings LIMIT 1');
    if (rows.length > 0 && rows[0].setup_complete) {
      sendJson(res, 200, { isSetup: true, dbType: rows[0].db_type });
    } else {
      sendJson(res, 200, { isSetup: false });
    }
  } catch {
    sendJson(res, 200, { isSetup: false });
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

// --- License Verification (Proxy to portal.itsupport.com.bd) ---
const LICENSE_VERIFY_URL = 'https://portal.itsupport.com.bd/verify_license.php';
const LICENSE_ENCRYPTION_KEY = 'ITSupportBD_SecureKey_2024';

function decryptLicenseData(encryptedBase64) {
  try {
    const data = Buffer.from(encryptedBase64, 'base64');
    const ivLength = 16;
    const iv = data.slice(0, ivLength);
    const ciphertextBase64 = data.slice(ivLength).toString('utf8');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    // Derive key: PHP uses the key directly for aes-256-cbc (32 bytes, padded with null bytes)
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

// Get installation ID from app_settings or generate one
async function getOrCreateInstallationId() {
  try {
    const rows = await query("SELECT id FROM app_settings WHERE id = 'installation_id'");
    if (rows.length > 0) return rows[0].id;
    
    const installId = 'LIFEOS-' + uuid();
    if (dbType === 'postgresql') {
      await query("INSERT INTO app_settings (id, setup_complete) VALUES ($1, false) ON CONFLICT DO NOTHING", [installId]);
    }
    return installId;
  } catch {
    return 'LIFEOS-' + uuid();
  }
}

routes['POST /api/license/verify'] = async (req, res) => {
  const { license_key } = await parseBody(req);
  if (!license_key) {
    sendJson(res, 400, { success: false, message: 'License key is required.' });
    return;
  }

  try {
    const installationId = await getOrCreateInstallationId();
    const payload = getAuthUser(req);
    const userId = payload?.sub || 'anonymous';

    // Count active users for current_device_count
    let deviceCount = 1;
    try {
      const countRows = await query('SELECT COUNT(*) as cnt FROM users');
      deviceCount = parseInt(countRows[0].cnt) || 1;
    } catch {}

    // Call the portal verification endpoint
    const https = require('https');
    const http_mod = require('http');
    const url = new URL(LICENSE_VERIFY_URL);
    const requestModule = url.protocol === 'https:' ? https : http_mod;

    const postData = JSON.stringify({
      app_license_key: license_key,
      user_id: userId,
      current_device_count: deviceCount,
      installation_id: installationId,
    });

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
      };

      const request = requestModule.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve(body));
      });

      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('License verification timeout'));
      });
      request.write(postData);
      request.end();
    });

    // Decrypt the response
    const decrypted = decryptLicenseData(portalResponse);
    if (decrypted) {
      sendJson(res, 200, decrypted);
    } else {
      // Try as plain JSON fallback
      try {
        sendJson(res, 200, JSON.parse(portalResponse));
      } catch {
        sendJson(res, 500, { success: false, message: 'Failed to verify license with portal.' });
      }
    }
  } catch (err) {
    console.error('License verification error:', err.message);
    sendJson(res, 500, { success: false, message: 'License verification failed: ' + err.message });
  }
};

// Get current license status
routes['GET /api/license/status'] = async (req, res) => {
  sendJson(res, 200, { message: 'Use POST /api/license/verify with license_key to verify.' });
};

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
  const adminEmail = 'admin@lifeos.local';
  const adminPassword = 'LifeOS@2024!';
  const passwordHash = hashPassword(adminPassword);

  try {
    // Upsert admin user - always update password hash to ensure it's valid
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

    console.log('✅ Default admin user seeded: admin@lifeos.local / LifeOS@2024!');
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
