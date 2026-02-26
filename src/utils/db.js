import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../database/submissions.db');

let db = null;

export function initDatabase() {
    if (db) return db;

    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Configure SQLite pragmas for better performance and safety
    try {
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');  // 5 seconds
        db.pragma('foreign_keys = ON');
    } catch (error) {
        console.error('Failed to configure SQLite pragmas:', error);
        throw error;
    }

    // Create submissions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_cognome TEXT NOT NULL,
            ragione_sociale TEXT,
            partita_iva TEXT,
            email TEXT NOT NULL,
            telefono TEXT NOT NULL,
            codice_preventivo TEXT NOT NULL UNIQUE,
            event_type TEXT,
            event_date TEXT,
            premium_amount REAL,
            currency TEXT DEFAULT 'EUR',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_email ON submissions(email);
        CREATE INDEX IF NOT EXISTS idx_codice ON submissions(codice_preventivo);
        CREATE INDEX IF NOT EXISTS idx_date ON submissions(created_at)
    `);

    // Create users table for admin management
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            nome_cognome TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index on users email
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin)
    `);

    return db;
}

export function getDatabase() {
    if (!db) {
        return initDatabase();
    }
    return db;
}

export function saveSubmission(data) {
    const db = getDatabase();

    const stmt = db.prepare(`
        INSERT INTO submissions
        (nome_cognome, ragione_sociale, partita_iva, email, telefono,
         codice_preventivo, event_type, event_date, premium_amount, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        data.nomeCognome || '',
        data.ragioneSociale || null,
        data.partitaIva || null,
        data.email || '',
        data.telefono || '',
        data.codicePreventivo || '',
        data.eventType || null,
        data.eventDate || null,
        data.premiumAmount || null,
        data.currency || 'EUR'
    );

    return result.lastInsertRowid;
}

export function getSubmissions(filters = {}) {
    const db = getDatabase();

    let query = 'SELECT * FROM submissions WHERE 1=1';
    const params = [];

    if (filters.search) {
        query += ` AND (
            nome_cognome LIKE ? OR
            email LIKE ? OR
            codice_preventivo LIKE ? OR
            telefono LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.dateFrom) {
        query += ' AND DATE(created_at) >= DATE(?)';
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        query += ' AND DATE(created_at) <= DATE(?)';
        params.push(filters.dateTo);
    }

    query += ' ORDER BY created_at DESC';

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

export function countSubmissions(filters = {}) {
    const db = getDatabase();

    let query = 'SELECT COUNT(*) as count FROM submissions WHERE 1=1';
    const params = [];

    if (filters.search) {
        query += ` AND (
            nome_cognome LIKE ? OR
            email LIKE ? OR
            codice_preventivo LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.dateFrom) {
        query += ' AND DATE(created_at) >= DATE(?)';
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        query += ' AND DATE(created_at) <= DATE(?)';
        params.push(filters.dateTo);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params).count;
}

// User management functions
export function getUsers(filters = {}) {
    const db = getDatabase();

    let query = 'SELECT id, email, nome_cognome, is_admin, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (filters.search) {
        query += ` AND (email LIKE ? OR nome_cognome LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
    }

    if (filters.isAdmin !== undefined) {
        query += ' AND is_admin = ?';
        params.push(filters.isAdmin ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

export function countUsers(filters = {}) {
    const db = getDatabase();

    let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const params = [];

    if (filters.search) {
        query += ` AND (email LIKE ? OR nome_cognome LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
    }

    if (filters.isAdmin !== undefined) {
        query += ' AND is_admin = ?';
        params.push(filters.isAdmin ? 1 : 0);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params).count;
}

export function getUserById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT id, email, nome_cognome, is_admin, created_at, updated_at FROM users WHERE id = ?');
    return stmt.get(id);
}

export function getUserByEmail(email) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT id, email, nome_cognome, is_admin, created_at, updated_at FROM users WHERE email = ?');
    return stmt.get(email);
}

export function createUser(data) {
    const db = getDatabase();

    const stmt = db.prepare(`
        INSERT INTO users (email, nome_cognome, is_admin)
        VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
            nome_cognome = excluded.nome_cognome,
            updated_at = CURRENT_TIMESTAMP
    `);

    const result = stmt.run(
        data.email,
        data.nomeCognome || null,
        data.isAdmin ? 1 : 0
    );

    return result.lastInsertRowid || getUserByEmail(data.email).id;
}

export function updateUser(id, data) {
    const db = getDatabase();

    const fields = [];
    const params = [];

    if (data.nomeCognome !== undefined) {
        fields.push('nome_cognome = ?');
        params.push(data.nomeCognome);
    }

    if (data.isAdmin !== undefined) {
        fields.push('is_admin = ?');
        params.push(data.isAdmin ? 1 : 0);
    }

    if (fields.length === 0) {
        return false;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);

    return result.changes > 0;
}

export function deleteUser(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

export function setUserAdminStatus(id, isAdmin) {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE users SET is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(isAdmin ? 1 : 0, id);
    return result.changes > 0;
}
