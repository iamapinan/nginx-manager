import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export interface ProxySite {
  id?: number;
  name: string;
  domain: string;
  target: string;
  upstream_id?: number;
  ssl: boolean;
  ssl_forced: boolean;
  hsts_enabled: boolean;
  http2_support: boolean;
  block_exploits: boolean;
  caching_enabled: boolean;
  client_max_body_size: string;
  access_list_id?: number;
  advanced_config?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Upstream {
  id?: number;
  name: string;
  description: string;
  method: 'round_robin' | 'least_conn' | 'ip_hash' | 'hash';
  hash_key?: string;
  servers: UpstreamServer[];
  created_at?: string;
  updated_at?: string;
}

export interface UpstreamServer {
  id?: number;
  upstream_id: number;
  server: string;
  weight: number;
  max_fails: number;
  fail_timeout: string;
  backup: boolean;
  down: boolean;
}

export interface Redirection {
  id?: number;
  name: string;
  domain: string;
  target_url: string;
  ssl: boolean;
  preserve_path: boolean;
  status_code: number;
  created_at?: string;
  updated_at?: string;
}

export interface AccessList {
  id?: number;
  name: string;
  description: string;
  pass_auth: boolean;
  clients: AccessListClient[];
  created_at?: string;
  updated_at?: string;
}

export interface AccessListClient {
  id?: number;
  access_list_id: number;
  username: string;
  password: string;
  address?: string;
  directive: 'allow' | 'deny';
}

export interface SSLCertificate {
  id?: number;
  domain: string;
  email: string;
  status: 'pending' | 'active' | 'expired' | 'failed';
  certificate_path?: string;
  private_key_path?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  is_active: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  id?: number;
  user_id: number;
  session_token: string;
  expires_at: string;
  created_at?: string;
}

class Database {
  private db: sqlite3.Database;

  constructor() {
    // Ensure the data directory exists
    const dbPath = './data/proxy.db';
    const dbDir = dirname(dbPath);
    
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private async init() {
    const run = promisify(this.db.run.bind(this.db));
    
    // Proxy Sites Table
    await run(`
      CREATE TABLE IF NOT EXISTS proxy_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        target TEXT NOT NULL,
        upstream_id INTEGER,
        ssl BOOLEAN DEFAULT 0,
        ssl_forced BOOLEAN DEFAULT 0,
        hsts_enabled BOOLEAN DEFAULT 0,
        http2_support BOOLEAN DEFAULT 1,
        block_exploits BOOLEAN DEFAULT 1,
        caching_enabled BOOLEAN DEFAULT 0,
        client_max_body_size TEXT DEFAULT '1m',
        access_list_id INTEGER,
        advanced_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (access_list_id) REFERENCES access_lists (id),
        FOREIGN KEY (upstream_id) REFERENCES upstreams (id)
      )
    `);

    // Upstreams Table
    await run(`
      CREATE TABLE IF NOT EXISTS upstreams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        method TEXT DEFAULT 'round_robin',
        hash_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Upstream Servers Table
    await run(`
      CREATE TABLE IF NOT EXISTS upstream_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upstream_id INTEGER NOT NULL,
        server TEXT NOT NULL,
        weight INTEGER DEFAULT 1,
        max_fails INTEGER DEFAULT 1,
        fail_timeout TEXT DEFAULT '10s',
        backup BOOLEAN DEFAULT 0,
        down BOOLEAN DEFAULT 0,
        FOREIGN KEY (upstream_id) REFERENCES upstreams (id) ON DELETE CASCADE
      )
    `);

    // Redirections Table
    await run(`
      CREATE TABLE IF NOT EXISTS redirections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        target_url TEXT NOT NULL,
        ssl BOOLEAN DEFAULT 0,
        preserve_path BOOLEAN DEFAULT 1,
        status_code INTEGER DEFAULT 302,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Access Lists Table
    await run(`
      CREATE TABLE IF NOT EXISTS access_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        pass_auth BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Access List Clients Table
    await run(`
      CREATE TABLE IF NOT EXISTS access_list_clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        access_list_id INTEGER NOT NULL,
        username TEXT,
        password TEXT,
        address TEXT,
        directive TEXT CHECK(directive IN ('allow', 'deny')) DEFAULT 'allow',
        FOREIGN KEY (access_list_id) REFERENCES access_lists (id) ON DELETE CASCADE
      )
    `);

    // SSL Certificates Table
    await run(`
      CREATE TABLE IF NOT EXISTS ssl_certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'active', 'expired', 'failed')) DEFAULT 'pending',
        certificate_path TEXT,
        private_key_path TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users Table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'user')) DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions Table
    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create default admin user if no users exist
    const get = promisify(this.db.get.bind(this.db));
    const userCount = await get('SELECT COUNT(*) as count FROM users') as { count: number };
    
    if (userCount.count === 0) {
      const bcrypt = require('bcryptjs');
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await run(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES ('admin', 'admin@example.com', '${hashedPassword}', 'admin', 1)
      `);
      
      console.log('Default admin user created: admin / admin123');
    }
  }

  async getAllSites(): Promise<ProxySite[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM proxy_sites ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as ProxySite[]);
      });
    });
  }

  async getSiteById(id: number): Promise<ProxySite | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM proxy_sites WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row as ProxySite || null);
      });
    });
  }

  async createSite(site: Omit<ProxySite, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO proxy_sites (
          name, domain, target, upstream_id, ssl, ssl_forced, hsts_enabled, 
          http2_support, block_exploits, caching_enabled, client_max_body_size,
          access_list_id, advanced_config
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        site.name, site.domain, site.target, site.upstream_id || null,
        site.ssl ? 1 : 0, site.ssl_forced ? 1 : 0, site.hsts_enabled ? 1 : 0,
        site.http2_support ? 1 : 0, site.block_exploits ? 1 : 0, site.caching_enabled ? 1 : 0,
        site.client_max_body_size || '1m', site.access_list_id || null, site.advanced_config || null
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  async updateSite(id: number, site: Omit<ProxySite, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE proxy_sites 
        SET name = ?, domain = ?, target = ?, upstream_id = ?, ssl = ?, ssl_forced = ?, 
            hsts_enabled = ?, http2_support = ?, block_exploits = ?, 
            caching_enabled = ?, client_max_body_size = ?, access_list_id = ?, advanced_config = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run([
        site.name, site.domain, site.target, site.upstream_id || null,
        site.ssl ? 1 : 0, site.ssl_forced ? 1 : 0, site.hsts_enabled ? 1 : 0,
        site.http2_support ? 1 : 0, site.block_exploits ? 1 : 0, site.caching_enabled ? 1 : 0,
        site.client_max_body_size || '1m', site.access_list_id || null, site.advanced_config || null, id
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
      
      stmt.finalize();
    });
  }

  async deleteSite(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM proxy_sites WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Redirections methods
  async getAllRedirections(): Promise<Redirection[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM redirections ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Redirection[]);
      });
    });
  }

  async createRedirection(redirection: Omit<Redirection, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO redirections (name, domain, target_url, ssl, preserve_path, status_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        redirection.name, redirection.domain, redirection.target_url,
        redirection.ssl ? 1 : 0, redirection.preserve_path ? 1 : 0, redirection.status_code
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  async updateRedirection(id: number, redirection: Omit<Redirection, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE redirections 
        SET name = ?, domain = ?, target_url = ?, ssl = ?, preserve_path = ?, 
            status_code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run([
        redirection.name, redirection.domain, redirection.target_url,
        redirection.ssl ? 1 : 0, redirection.preserve_path ? 1 : 0, redirection.status_code, id
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
      
      stmt.finalize();
    });
  }

  async deleteRedirection(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM redirections WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Access Lists methods
  async getAllAccessLists(): Promise<AccessList[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM access_lists ORDER BY created_at DESC', async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const accessLists = rows as AccessList[];
        
        // Load clients for each access list
        for (const list of accessLists) {
          const clients = await this.getAccessListClients(list.id!);
          list.clients = clients;
        }
        
        resolve(accessLists);
      });
    });
  }

  async getAccessListClients(accessListId: number): Promise<AccessListClient[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM access_list_clients WHERE access_list_id = ?', [accessListId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as AccessListClient[]);
      });
    });
  }

  async createAccessList(accessList: Omit<AccessList, 'id' | 'created_at' | 'updated_at' | 'clients'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO access_lists (name, description, pass_auth)
        VALUES (?, ?, ?)
      `);
      
      stmt.run([accessList.name, accessList.description, accessList.pass_auth ? 1 : 0], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  // SSL Certificates methods
  async getAllCertificates(): Promise<SSLCertificate[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM ssl_certificates ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as SSLCertificate[]);
      });
    });
  }

  async getCertificateById(id: number): Promise<SSLCertificate | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM ssl_certificates WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve((row as SSLCertificate) || null);
      });
    });
  }

  async getCertificateByDomain(domain: string): Promise<SSLCertificate | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM ssl_certificates WHERE domain = ?', [domain], (err, row) => {
        if (err) reject(err);
        else resolve((row as SSLCertificate) || null);
      });
    });
  }

  async createCertificate(certificate: Omit<SSLCertificate, 'id' | 'created_at' | 'updated_at'>): Promise<SSLCertificate> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO ssl_certificates (domain, email, status, certificate_path, private_key_path, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
              stmt.run([
        certificate.domain,
        certificate.email,
        certificate.status,
        certificate.certificate_path || null,
        certificate.private_key_path || null,
        certificate.expires_at || null
      ], async function(err) {
        if (err) reject(err);
        else {
          const result = await database.getCertificateById(this.lastID);
          if (result) resolve(result);
          else reject(new Error('Failed to retrieve created certificate'));
        }
      });
      
      stmt.finalize();
    });
  }

  async updateCertificate(id: number, certificate: Partial<SSLCertificate>): Promise<SSLCertificate | null> {
    const fields = [];
    const values = [];
    
    if (certificate.domain !== undefined) {
      fields.push('domain = ?');
      values.push(certificate.domain);
    }
    if (certificate.email !== undefined) {
      fields.push('email = ?');
      values.push(certificate.email);
    }
    if (certificate.status !== undefined) {
      fields.push('status = ?');
      values.push(certificate.status);
    }
    if (certificate.certificate_path !== undefined) {
      fields.push('certificate_path = ?');
      values.push(certificate.certificate_path);
    }
    if (certificate.private_key_path !== undefined) {
      fields.push('private_key_path = ?');
      values.push(certificate.private_key_path);
    }
    if (certificate.expires_at !== undefined) {
      fields.push('expires_at = ?');
      values.push(certificate.expires_at);
    }
    
    if (fields.length === 0) return this.getCertificateById(id);
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE ssl_certificates 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getCertificateById(id);
  }

  async deleteCertificate(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM ssl_certificates WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Upstream Methods
  async getAllUpstreams(): Promise<Upstream[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM upstreams ORDER BY created_at DESC', async (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const upstreams = [];
          for (const row of rows as Upstream[]) {
            const servers = await this.getUpstreamServers(row.id!);
            upstreams.push({ ...row, servers });
          }
          resolve(upstreams);
        }
      });
    });
  }

  async getUpstreamById(id: number): Promise<Upstream | null> {
    return new Promise(async (resolve, reject) => {
      this.db.get('SELECT * FROM upstreams WHERE id = ?', [id], async (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          const servers = await this.getUpstreamServers(id);
          resolve({ ...row as Upstream, servers });
        } else {
          resolve(null);
        }
      });
    });
  }

  async getUpstreamServers(upstreamId: number): Promise<UpstreamServer[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM upstream_servers WHERE upstream_id = ?', [upstreamId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as UpstreamServer[]);
      });
    });
  }

  async createUpstream(upstream: Omit<Upstream, 'id' | 'created_at' | 'updated_at' | 'servers'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO upstreams (name, description, method, hash_key)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([
        upstream.name, upstream.description, upstream.method, upstream.hash_key || null
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  async updateUpstream(id: number, upstream: Omit<Upstream, 'id' | 'created_at' | 'updated_at' | 'servers'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE upstreams 
        SET name = ?, description = ?, method = ?, hash_key = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run([
        upstream.name, upstream.description, upstream.method, upstream.hash_key || null, id
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
      
      stmt.finalize();
    });
  }

  async deleteUpstream(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM upstreams WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createUpstreamServer(server: Omit<UpstreamServer, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO upstream_servers (
          upstream_id, server, weight, max_fails, fail_timeout, backup, down
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        server.upstream_id, server.server, server.weight, server.max_fails, 
        server.fail_timeout, server.backup ? 1 : 0, server.down ? 1 : 0
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  async updateUpstreamServer(id: number, server: Omit<UpstreamServer, 'id'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE upstream_servers 
        SET upstream_id = ?, server = ?, weight = ?, max_fails = ?, 
            fail_timeout = ?, backup = ?, down = ?
        WHERE id = ?
      `);
      
      stmt.run([
        server.upstream_id, server.server, server.weight, server.max_fails, 
        server.fail_timeout, server.backup ? 1 : 0, server.down ? 1 : 0, id
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
      
      stmt.finalize();
    });
  }

  async deleteUpstreamServer(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM upstream_servers WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // User Management Methods
  async getUserByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row as User || null);
      });
    });
  }

  async getUserById(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row as User || null);
      });
    });
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        user.username, user.email, user.password_hash, user.role, user.is_active ? 1 : 0
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as User[]);
      });
    });
  }

  async updateUser(id: number, user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET username = ?, email = ?, password_hash = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run([
        user.username, user.email, user.password_hash, user.role, user.is_active ? 1 : 0, id
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
      
      stmt.finalize();
    });
  }

  async deleteUser(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateUserLastLogin(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Session Management Methods
  async createSession(userId: number, sessionToken: string, expiresAt: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
      `);
      
      stmt.run([userId, sessionToken, expiresAt], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM sessions WHERE session_token = ? AND expires_at > datetime("now")', [sessionToken], (err, row) => {
        if (err) reject(err);
        else resolve(row as Session || null);
      });
    });
  }

  async deleteSession(sessionToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sessions WHERE session_token = ?', [sessionToken], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteExpiredSessions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sessions WHERE expires_at <= datetime("now")', function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    this.db.close();
  }
}

// Export singleton instance
let databaseInstance: Database;

export function getDatabase(): Database {
  if (!databaseInstance) {
    databaseInstance = new Database();
  }
  return databaseInstance;
}

// For backward compatibility
export const database = getDatabase(); 