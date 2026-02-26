import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../database/submissions.db');

let db = null;

export function initDatabase() {
    if (db) return db;

    db = new Database(DB_PATH);

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
