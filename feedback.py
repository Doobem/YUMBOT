from fastapi import APIRouter
from models import FeedbackCreate
from database import get_db

router = APIRouter()

@router.post("")
def submit_feedback(data: FeedbackCreate):
    conn = get_db()
    c = conn.cursor()
    user = c.execute("SELECT id FROM users WHERE session_id=?", (data.session_id,)).fetchone()
    user_id = user["id"] if user else None

    c.execute("""
        INSERT INTO feedback (user_id, star_rating, comment, loved_meals, week_ref)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, data.star_rating, data.comment, data.loved_meals, data.week_ref))

    if user_id:
        c.execute("UPDATE users SET lifecycle_stage='satisfaction' WHERE id=?", (user_id,))

    conn.commit()
    conn.close()

    return {
        "status": "received",
        "message": "Thank you! Your feedback has been heard. 🙏 We're already working on improvements — check back in 7 days to see what's new for you. 🍽️"
    }


@router.get("/summary")
def feedback_summary():
    conn = get_db()
    rows = conn.cursor().execute("SELECT * FROM feedback ORDER BY submitted_at DESC").fetchall()
    conn.close()

    if not rows:
        return {"message": "No feedback yet — check back after your first users!"}

    total = len(rows)
    avg_rating = round(sum(r["star_rating"] for r in rows) / total, 1)
    comments = [r["comment"] for r in rows if r["comment"]]

    return {
        "total_responses": total,
        "average_star_rating": avg_rating,
        "recent_comments": comments[-10:],
        "insight": f"{total} people have shared their thoughts. Average happiness: {avg_rating}/5 ⭐"
    }
