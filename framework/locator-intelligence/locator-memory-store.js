const path = require('path');
const { promisify } = require('util');

class LocatorMemoryStore {
    constructor() {
        this.dbPath = path.resolve(process.cwd(), 'framework/locator-intelligence/locator-memory.db');
        this.db = null;
        this._initPromise = null;
    }

    async _ensureDb() {
        if (this.db) return true;
        
        try {
            const sqlite3 = require('sqlite3').verbose();
            this.db = new sqlite3.Database(this.dbPath);
            this._initPromise = this._init();
            await this._initPromise;
            return true;
        } catch (e) {
            // Silently degrade if sqlite3 is missing and LIE is conceptually disabled
            // If ENABLE_LIE is true but sqlite3 is missing, we log a warning.
            if (process.env.ENABLE_LIE === 'true') {
                console.error('[LIE] CRITICAL: sqlite3 dependency missing but ENABLE_LIE=true. Performance learning disabled.');
            }
            return false;
        }
    }

    async _init() {
        if (!this.db) return;
        const run = promisify(this.db.run.bind(this.db));
        await run(`
            CREATE TABLE IF NOT EXISTS locators (
                locator_key TEXT,
                strategy TEXT,
                success_rate FLOAT DEFAULT 0,
                avg_exec_time FLOAT DEFAULT 0,
                last_used DATETIME,
                dom_signature TEXT,
                PRIMARY KEY (locator_key, strategy)
            )
        `);
        await run(`
            CREATE TABLE IF NOT EXISTS locator_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                locator_key TEXT,
                strategy TEXT,
                status TEXT,
                execution_time FLOAT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async getCandidates(locatorKey) {
        if (!await this._ensureDb()) return [];
        const all = promisify(this.db.all.bind(this.db));
        return await all('SELECT * FROM locators WHERE locator_key = ? ORDER BY success_rate DESC', [locatorKey]);
    }

    async updateStats(locatorKey, strategy, success, executionTime, domSignature = null) {
        if (!await this._ensureDb()) return;
        const run = promisify(this.db.run.bind(this.db));
        const get = promisify(this.db.get.bind(this.db));

        const existing = await get('SELECT * FROM locators WHERE locator_key = ? AND strategy = ?', [locatorKey, strategy]);
        const status = success ? 'SUCCESS' : 'FAILURE';

        if (existing) {
            const newSuccessRate = success 
                ? (existing.success_rate * 0.9 + 0.1) 
                : (existing.success_rate * 0.9);
            const newAvgTime = success 
                ? (existing.avg_exec_time * 0.8 + executionTime * 0.2) 
                : existing.avg_exec_time;

            await run(`
                UPDATE locators 
                SET success_rate = ?, avg_exec_time = ?, last_used = CURRENT_TIMESTAMP, dom_signature = ?
                WHERE locator_key = ? AND strategy = ?
            `, [newSuccessRate, newAvgTime, domSignature || existing.dom_signature, locatorKey, strategy]);
        } else {
            await run(`
                INSERT INTO locators (locator_key, strategy, success_rate, avg_exec_time, last_used, dom_signature)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            `, [locatorKey, strategy, success ? 1.0 : 0.0, executionTime, domSignature]);
        }

        await run(`
            INSERT INTO locator_history (locator_key, strategy, status, execution_time)
            VALUES (?, ?, ?, ?)
        `, [locatorKey, strategy, status, executionTime]);
    }
}

module.exports = new LocatorMemoryStore();
