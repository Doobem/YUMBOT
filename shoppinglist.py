from fastapi import APIRouter
from database import get_db
import json

router = APIRouter()

SECTION_MAP = {
    "Fresh Produce": ["lettuce", "tomato", "carrot", "onion", "garlic", "spinach", "broccoli",
                      "courgette", "pepper", "mushroom", "cucumber", "avocado", "lemon", "lime",
                      "ginger", "herb", "basil", "coriander", "parsley", "spring onion", "leek",
                      "celery", "kale", "cabbage", "beetroot", "sweet potato", "potato", "radish",
                      "pea", "green bean", "asparagus", "corn", "chilli", "apple", "banana",
                      "mango", "orange", "strawberry", "blueberry", "raspberry"],
    "Meat & Fish": ["chicken", "beef", "pork", "lamb", "turkey", "duck", "fish", "salmon",
                    "tuna", "cod", "haddock", "prawn", "shrimp", "crab", "mince", "sausage",
                    "bacon", "ham", "steak", "fillet", "sardine", "anchovy", "mackerel"],
    "Dairy & Eggs": ["milk", "cheese", "butter", "cream", "yogurt", "egg", "feta", "mozzarella",
                     "cheddar", "parmesan", "ricotta", "sour cream", "creme fraiche"],
    "Tins & Jars": ["tomato", "chickpea", "lentil", "bean", "coconut milk", "stock", "paste",
                    "sauce", "tuna tin", "sardine tin", "olive", "sundried", "pesto", "tahini",
                    "peanut butter", "jam", "honey", "soy sauce", "fish sauce"],
    "Dry Goods": ["pasta", "rice", "flour", "oats", "bread", "noodle", "quinoa", "couscous",
                  "lentil dry", "sugar", "salt", "pepper", "spice", "cumin", "paprika", "turmeric",
                  "curry powder", "cinnamon", "oregano", "thyme", "bay leaf", "oil", "vinegar",
                  "baking powder", "cornstarch", "breadcrumb", "cereal"],
    "Frozen": ["frozen pea", "frozen corn", "frozen spinach", "frozen berry", "ice cream",
               "frozen fish", "frozen chicken", "frozen edamame"],
}

def categorise_ingredient(ingredient: str) -> str:
    ing_lower = ingredient.lower()
    for section, keywords in SECTION_MAP.items():
        for kw in keywords:
            if kw in ing_lower:
                return section
    return "Other"


@router.get("/{plan_id}")
def get_shopping_list(plan_id: int):
    conn = get_db()
    c = conn.cursor()
    plan_row = c.execute("SELECT plan_json FROM meal_plans WHERE id=?", (plan_id,)).fetchone()
    if not plan_row:
        conn.close()
        return {"error": "We couldn't find that meal plan. Try building a new one!"}

    plan = json.loads(plan_row["plan_json"])
    all_ingredients = []

    for day, meals in plan.items():
        for meal_type, meal in meals.items():
            recipe_id = meal.get("recipe_id")
            if recipe_id:
                recipe = c.execute("SELECT ingredients_json FROM recipes WHERE id=?",
                                   (recipe_id,)).fetchone()
                if recipe and recipe["ingredients_json"]:
                    ingredients = json.loads(recipe["ingredients_json"])
                    all_ingredients.extend(ingredients)

    conn.close()

    # Deduplicate and categorise
    seen = set()
    shopping_list = {}
    for ingredient in all_ingredients:
        key = ingredient.lower().strip()
        if key not in seen:
            seen.add(key)
            section = categorise_ingredient(ingredient)
            if section not in shopping_list:
                shopping_list[section] = []
            shopping_list[section].append(ingredient)

    # Sort sections in logical order
    section_order = ["Fresh Produce", "Meat & Fish", "Dairy & Eggs",
                     "Tins & Jars", "Dry Goods", "Frozen", "Other"]
    ordered = {s: shopping_list[s] for s in section_order if s in shopping_list}

    return {
        "plan_id": plan_id,
        "shopping_list": ordered,
        "total_items": len(seen),
        "message": "Here's everything you need for the week. Happy shopping! 🛒"
    }
