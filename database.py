import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "yumbot.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        people_count INTEGER DEFAULT 2,
        cooking_confidence TEXT DEFAULT 'beginner',
        lifecycle_stage TEXT DEFAULT 'connection'
    );

    CREATE TABLE IF NOT EXISTS dietary_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS allergies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        allergen TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        cook_time_mins INTEGER,
        difficulty TEXT,
        serves INTEGER DEFAULT 2,
        cuisine_type TEXT,
        dietary_tags TEXT,
        ingredients_json TEXT,
        steps_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        week_start_date TEXT,
        plan_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favourites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recipe_id INTEGER,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(recipe_id) REFERENCES recipes(id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        star_rating INTEGER,
        comment TEXT,
        loved_meals TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        week_ref TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    """)

    conn.commit()
    conn.close()
