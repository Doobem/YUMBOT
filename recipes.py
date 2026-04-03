from fastapi import APIRouter, Query
from database import get_db
from meal_logic import recipe_matches_profile
import json
from typing import Optional

router = APIRouter()

@router.get("")
def list_recipes(dietary: Optional[str] = Query(None), cuisine: Optional[str] = Query(None)):
    conn = get_db()
    recipes = conn.cursor().execute("SELECT * FROM recipes").fetchall()
    conn.close()

    results = []
    for r in recipes:
        if dietary:
            cats = [d.strip() for d in dietary.split(",")]
            if not recipe_matches_profile(r["dietary_tags"], r["ingredients_json"], cats, []):
                continue
        if cuisine and cuisine.lower() not in (r["cuisine_type"] or "").lower():
            continue
        results.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "cook_time_mins": r["cook_time_mins"],
            "difficulty": r["difficulty"],
            "cuisine_type": r["cuisine_type"],
            "dietary_tags": r["dietary_tags"],
        })
    return {"recipes": results, "count": len(results)}


@router.get("/{recipe_id}")
def get_recipe(recipe_id: int):
    conn = get_db()
    r = conn.cursor().execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
    conn.close()
    if not r:
        return {"error": "We couldn't find that recipe. Try searching for something else!"}
    return {
        "id": r["id"],
        "name": r["name"],
        "description": r["description"],
        "cook_time_mins": r["cook_time_mins"],
        "difficulty": r["difficulty"],
        "serves": r["serves"],
        "cuisine_type": r["cuisine_type"],
        "dietary_tags": r["dietary_tags"],
        "ingredients": json.loads(r["ingredients_json"] or "[]"),
        "steps": json.loads(r["steps_json"] or "[]"),
    }
