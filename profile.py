from fastapi import APIRouter
from models import ProfileCreate
from database import get_db

router = APIRouter()

@router.post("")
def create_or_update_profile(data: ProfileCreate):
    conn = get_db()
    c = conn.cursor()

    # Upsert user
    c.execute("""
        INSERT INTO users (session_id, people_count, cooking_confidence)
        VALUES (?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            people_count=excluded.people_count,
            cooking_confidence=excluded.cooking_confidence
    """, (data.session_id, data.people_count, data.cooking_confidence))

    user_id = c.execute("SELECT id FROM users WHERE session_id=?", (data.session_id,)).fetchone()["id"]

    # Replace preferences
    c.execute("DELETE FROM dietary_preferences WHERE user_id=?", (user_id,))
    for cat in data.dietary_categories:
        c.execute("INSERT INTO dietary_preferences (user_id, category) VALUES (?,?)", (user_id, cat))

    # Replace allergies
    c.execute("DELETE FROM allergies WHERE user_id=?", (user_id,))
    for allergen in data.allergies:
        c.execute("INSERT INTO allergies (user_id, allergen) VALUES (?,?)", (user_id, allergen))

    conn.commit()
    conn.close()
    return {"status": "saved", "session_id": data.session_id}


@router.get("/{session_id}")
def get_profile(session_id: str):
    conn = get_db()
    c = conn.cursor()
    user = c.execute("SELECT * FROM users WHERE session_id=?", (session_id,)).fetchone()
    if not user:
        return {"error": "We couldn't find your profile. Try setting it up again!"}

    prefs = c.execute("SELECT category FROM dietary_preferences WHERE user_id=?", (user["id"],)).fetchall()
    allergies = c.execute("SELECT allergen FROM allergies WHERE user_id=?", (user["id"],)).fetchall()
    conn.close()

    return {
        "session_id": session_id,
        "people_count": user["people_count"],
        "cooking_confidence": user["cooking_confidence"],
        "dietary_categories": [p["category"] for p in prefs],
        "allergies": [a["allergen"] for a in allergies],
        "lifecycle_stage": user["lifecycle_stage"],
    }
