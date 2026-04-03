from fastapi import APIRouter
from models import MealPlanRequest, SwapRequest
from database import get_db
from meal_logic import recipe_matches_profile
import json, random
from datetime import date

router = APIRouter()

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MEAL_TYPES = ["breakfast", "lunch", "dinner"]


def get_user_profile(session_id, conn):
    c = conn.cursor()
    user = c.execute("SELECT * FROM users WHERE session_id=?", (session_id,)).fetchone()
    if not user:
        return None, [], []
    prefs = [r["category"] for r in c.execute(
        "SELECT category FROM dietary_preferences WHERE user_id=?", (user["id"],)).fetchall()]
    allergies = [r["allergen"] for r in c.execute(
        "SELECT allergen FROM allergies WHERE user_id=?", (user["id"],)).fetchall()]
    return user, prefs, allergies


def pick_recipe(recipes, exclude_ids):
    available = [r for r in recipes if r["id"] not in exclude_ids]
    if not available:
        available = recipes  # relax if nothing left
    return random.choice(available) if available else None


@router.post("/generate")
def generate_meal_plan(data: MealPlanRequest):
    conn = get_db()
    c = conn.cursor()
    user, prefs, allergies = get_user_profile(data.session_id, conn)

    if not user:
        conn.close()
        return {"error": "We couldn't find your profile. Please set up your food preferences first!"}

    # Fetch all recipes
    all_recipes = c.execute("SELECT * FROM recipes").fetchall()

    # Filter by dietary rules
    matching = []
    for r in all_recipes:
        if recipe_matches_profile(r["dietary_tags"], r["ingredients_json"], prefs, allergies):
            matching.append(dict(r))

    if len(matching) < 5:
        matching = [dict(r) for r in all_recipes]  # fallback to all

    # Split by meal type tag
    breakfasts = [r for r in matching if "breakfast" in (r["dietary_tags"] or "").lower()] or matching
    lunches    = [r for r in matching if "lunch" in (r["dietary_tags"] or "").lower()] or matching
    dinners    = [r for r in matching if "dinner" in (r["dietary_tags"] or "").lower()] or matching

    plan = {}
    used_ids = set()
    for day in DAYS:
        plan[day] = {}
        for mtype, pool in [("breakfast", breakfasts), ("lunch", lunches), ("dinner", dinners)]:
            r = pick_recipe(pool, used_ids)
            if r:
                used_ids.add(r["id"])
                plan[day][mtype] = {
                    "recipe_id": r["id"],
                    "name": r["name"],
                    "cook_time_mins": r["cook_time_mins"],
                    "difficulty": r["difficulty"],
                    "cuisine_type": r["cuisine_type"],
                }

    week_start = data.week_start_date or str(date.today())
    c.execute("INSERT INTO meal_plans (user_id, week_start_date, plan_json) VALUES (?,?,?)",
              (user["id"], week_start, json.dumps(plan)))
    plan_id = c.lastrowid

    # Advance lifecycle
    c.execute("UPDATE users SET lifecycle_stage='interaction' WHERE id=?", (user["id"],))
    conn.commit()
    conn.close()

    return {"plan_id": plan_id, "week_start": week_start, "plan": plan,
            "message": "Here's your week of meals! Tap any meal to see the full recipe. 🍽️"}


@router.get("/{plan_id}")
def get_plan(plan_id: int):
    conn = get_db()
    row = conn.cursor().execute("SELECT * FROM meal_plans WHERE id=?", (plan_id,)).fetchone()
    conn.close()
    if not row:
        return {"error": "We couldn't find that meal plan. Try building a new one!"}
    return {"plan_id": plan_id, "week_start": row["week_start_date"],
            "plan": json.loads(row["plan_json"])}


@router.post("/{plan_id}/swap")
def swap_meal(plan_id: int, data: SwapRequest):
    conn = get_db()
    c = conn.cursor()
    row = c.execute("SELECT * FROM meal_plans WHERE id=?", (plan_id,)).fetchone()
    if not row:
        conn.close()
        return {"error": "We couldn't find that plan. Let's build you a fresh one!"}

    plan = json.loads(row["plan_json"])
    user, prefs, allergies = get_user_profile(data.session_id, conn)

    all_recipes = c.execute("SELECT * FROM recipes").fetchall()
    matching = [dict(r) for r in all_recipes
                if recipe_matches_profile(r["dietary_tags"], r["ingredients_json"], prefs, allergies)]

    current_id = plan.get(data.day, {}).get(data.meal_type, {}).get("recipe_id")
    new_r = pick_recipe(matching, {current_id} if current_id else set())

    if new_r:
        plan[data.day][data.meal_type] = {
            "recipe_id": new_r["id"],
            "name": new_r["name"],
            "cook_time_mins": new_r["cook_time_mins"],
            "difficulty": new_r["difficulty"],
            "cuisine_type": new_r["cuisine_type"],
        }
        c.execute("UPDATE meal_plans SET plan_json=? WHERE id=?", (json.dumps(plan), plan_id))
        conn.commit()

    conn.close()
    return {"message": f"Done! We found you a different {data.meal_type} for {data.day} 🔄",
            "new_meal": plan[data.day][data.meal_type]}
