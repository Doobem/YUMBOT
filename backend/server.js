/* YUMBOT Backend Server with SQLite */
/* Run with: node backend/server.js */

const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = './yumbot.db';

let db = null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Initialize database
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    try {
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
            console.log('Loaded existing database');
        } else {
            db = new SQL.Database();
            console.log('Created new database');
        }
    } catch (err) {
        db = new SQL.Database();
        console.log('Created new database (error loading existing)');
    }
    
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            streak_count INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            mastery_level INTEGER DEFAULT 0,
            total_meals_planned INTEGER DEFAULT 0,
            badges TEXT DEFAULT '[]',
            kudos_given INTEGER DEFAULT 0,
            hasCompletedPreferences INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS meal_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            week_start TEXT,
            meals TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS feedbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            rating INTEGER,
            feedback_text TEXT,
            loved_meals TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    saveDatabase();
    console.log('Database tables initialized');
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Simple hash function
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'yumbot_salt_2024').digest('hex');
}

// Generate unique ID
function generateId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============ AUTH ROUTES ============

// Sign up
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const passwordHash = hashPassword(password);
    const id = generateId();
    
    try {
        // Check if email exists
        const existing = db.exec(`SELECT id FROM users WHERE email = '${email}'`);
        if (existing.length > 0 && existing[0].values.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }
        
        db.run(`INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)`, [id, email, passwordHash, name]);
        saveDatabase();
        
        res.json({
            success: true,
            user: {
                id: id,
                email: email,
                display_name: name
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const passwordHash = hashPassword(password);
    
    try {
        const result = db.exec(`SELECT * FROM users WHERE email = ? AND password_hash = ?`, [email, passwordHash]);
        
        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const cols = result[0].columns;
        const user = {};
        cols.forEach((col, i) => user[col] = result[0].values[0][i]);
        
        // Parse badges
        try {
            user.badges = JSON.parse(user.badges);
        } catch (e) {
            user.badges = [];
        }
        user.hasCompletedPreferences = !!user.hasCompletedPreferences;
        delete user.password_hash;
        
        res.json({ success: true, user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user profile
app.get('/api/profile', (req, res) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const result = db.exec(`SELECT * FROM users WHERE id = ?`, [userId]);
        
        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const cols = result[0].columns;
        const user = {};
        cols.forEach((col, i) => user[col] = result[0].values[0][i]);
        
        delete user.password_hash;
        
        try {
            user.badges = JSON.parse(user.badges);
        } catch (e) {
            user.badges = [];
        }
        user.hasCompletedPreferences = !!user.hasCompletedPreferences;
        
        res.json({ user });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update user profile
app.put('/api/profile', (req, res) => {
    const userId = req.headers['x-user-id'];
    const updates = req.body;
    
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const allowedFields = ['display_name', 'streak_count', 'longest_streak', 'mastery_level', 
                          'total_meals_planned', 'badges', 'kudos_given', 'hasCompletedPreferences'];
    
    const updateParts = [];
    const values = [];
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateParts.push(`${field} = ?`);
            if (field === 'badges' && Array.isArray(updates[field])) {
                values.push(JSON.stringify(updates[field]));
            } else {
                values.push(updates[field]);
            }
        }
    }
    
    if (updateParts.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(userId);
    
    try {
        db.run(`UPDATE users SET ${updateParts.join(', ')} WHERE id = ?`, values);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ ADMIN ROUTES ============

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== 'yumbot2024') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        const result = db.exec(`SELECT id, email, display_name, streak_count, longest_streak, mastery_level,
                               total_meals_planned, hasCompletedPreferences, created_at FROM users ORDER BY created_at DESC`);
        
        if (result.length === 0) {
            return res.json({ users: [] });
        }
        
        const cols = result[0].columns;
        const users = result[0].values.map(row => {
            const user = {};
            cols.forEach((col, i) => user[col] = row[i]);
            user.hasCompletedPreferences = !!user.hasCompletedPreferences;
            if (user.created_at) {
                user.created_at = new Date(user.created_at).toLocaleDateString();
            }
            return user;
        });
        
        res.json({ users });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ MEAL PLAN ROUTES ============

app.post('/api/meal-plans', (req, res) => {
    const userId = req.headers['x-user-id'];
    const { week_start, meals } = req.body;
    
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        db.run(`INSERT INTO meal_plans (user_id, week_start, meals) VALUES (?, ?, ?)`, 
               [userId, week_start, JSON.stringify(meals)]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        console.error('Save meal plan error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/meal-plans', (req, res) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const result = db.exec(`SELECT * FROM meal_plans WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
        
        if (result.length === 0) {
            return res.json({ plans: [] });
        }
        
        const cols = result[0].columns;
        const plans = result[0].values.map(row => {
            const plan = {};
            cols.forEach((col, i) => plan[col] = row[i]);
            if (plan.meals) {
                try {
                    plan.meals = JSON.parse(plan.meals);
                } catch (e) {}
            }
            return plan;
        });
        
        res.json({ plans });
    } catch (err) {
        console.error('Get meal plans error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ FEEDBACK ROUTES ============

app.post('/api/feedback', (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { rating, feedback_text, loved_meals } = req.body;
    
    try {
        db.run(`INSERT INTO feedbacks (user_id, rating, feedback_text, loved_meals) VALUES (?, ?, ?, ?)`,
               [userId, rating, feedback_text, loved_meals]);
        saveDatabase();
        res.json({ success: true });
    } catch (err) {
        console.error('Save feedback error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/feedbacks', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== 'yumbot2024') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        const result = db.exec(`SELECT f.*, u.email as user_email, u.display_name
                               FROM feedbacks f
                               LEFT JOIN users u ON f.user_id = u.id
                               ORDER BY f.created_at DESC`);
        
        if (result.length === 0) {
            return res.json({ feedbacks: [] });
        }
        
        const cols = result[0].columns;
        const feedbacks = result[0].values.map(row => {
            const fb = {};
            cols.forEach((col, i) => fb[col] = row[i]);
            return fb;
        });
        
        res.json({ feedbacks });
    } catch (err) {
        console.error('Get feedbacks error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Catch-all route - serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start server
async function start() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log('===========================================');
        console.log('  YUMBOT Server Running!');
        console.log('===========================================');
        console.log(`  Local:    http://localhost:${PORT}`);
        console.log(`  Network:  http://0.0.0.0:${PORT}`);
        console.log('===========================================');
        console.log('');
        console.log('Admin password: yumbot2024');
        console.log('');
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nClosing database...');
    saveDatabase();
    process.exit(0);
});

start();
