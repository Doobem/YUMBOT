import json

# Maps each dietary category to ingredients that must be ABSENT from matching recipes
DIETARY_EXCLUSIONS = {
    "Vegan": ["meat", "chicken", "beef", "pork", "lamb", "fish", "salmon", "tuna", "prawn", "shrimp",
              "milk", "cheese", "butter", "cream", "yogurt", "egg", "honey", "gelatin", "lard", "bacon"],
    "Vegetarian": ["meat", "chicken", "beef", "pork", "lamb", "fish", "salmon", "tuna", "prawn",
                   "shrimp", "bacon", "lard", "gelatin"],
    "Pescatarian": ["meat", "chicken", "beef", "pork", "lamb", "bacon", "lard"],
    "Gluten-Free": ["wheat", "flour", "bread", "pasta", "barley", "rye", "oats", "spelt", "semolina",
                    "couscous", "bulgur", "soy sauce", "malt"],
    "Dairy-Free": ["milk", "cheese", "butter", "cream", "yogurt", "lactose", "whey", "casein",
                   "ghee", "custard", "ice cream"],
    "Egg-Free": ["egg", "eggs", "mayonnaise", "meringue", "albumin"],
    "Nut-Free": ["almond", "cashew", "walnut", "peanut", "pecan", "pistachio", "hazelnut",
                 "macadamia", "brazil nut", "pine nut", "nut butter"],
    "Soy-Free": ["soy", "tofu", "tempeh", "edamame", "miso", "soy sauce", "tamari", "natto"],
    "Shellfish-Free": ["prawn", "shrimp", "crab", "lobster", "crayfish", "scallop", "mussel", "oyster", "clam"],
    "Fish-Free": ["fish", "salmon", "tuna", "cod", "haddock", "tilapia", "anchovy", "sardine",
                  "mackerel", "halibut", "fish sauce"],
    "Halal": ["pork", "bacon", "ham", "lard", "gelatin", "alcohol", "wine", "beer"],
    "Kosher": ["pork", "bacon", "ham", "shellfish", "prawn", "crab", "lobster"],
    "Jain": ["meat", "chicken", "beef", "pork", "fish", "egg", "onion", "garlic", "potato",
             "carrot", "beetroot", "radish", "turnip"],
    "Keto": ["sugar", "bread", "pasta", "rice", "potato", "flour", "oats", "cereal",
             "fruit juice", "honey", "maple syrup", "corn"],
    "Low-Carb": ["sugar", "bread", "pasta", "rice", "flour", "potato", "corn", "oats"],
    "Low-Fat": ["butter", "oil", "cream", "lard", "bacon", "fatty meat", "cheese", "fried"],
    "Low-Sodium": ["salt", "soy sauce", "fish sauce", "miso", "stock cube", "canned soup", "pickles"],
    "Low-Sugar": ["sugar", "honey", "maple syrup", "corn syrup", "candy", "chocolate", "ice cream"],
    "Paleo": ["grain", "bread", "pasta", "rice", "dairy", "legume", "bean", "peanut", "sugar",
              "processed food", "flour", "corn"],
    "Whole30": ["sugar", "alcohol", "grain", "dairy", "legume", "soy", "carrageenan", "msg",
                "sulfite", "baked goods", "junk food"],
    "Low-FODMAP": ["onion", "garlic", "wheat", "rye", "apple", "pear", "mango", "watermelon",
                   "honey", "high-fructose corn syrup", "milk", "yogurt", "soft cheese", "legume",
                   "lentil", "cashew", "pistachio"],
    "Diabetic-Friendly": ["sugar", "white bread", "white rice", "white pasta", "fruit juice",
                          "honey", "candy", "cake", "sugary cereal"],
    "Heart-Healthy": ["butter", "lard", "red meat", "processed meat", "bacon", "full-fat dairy",
                      "trans fat", "salt", "fried food"],
    "Kidney-Friendly": ["potassium-rich", "banana", "orange", "potato", "tomato", "avocado",
                        "salt", "phosphorus", "dairy", "nuts", "chocolate", "cola"],
    "Anti-Inflammatory": ["sugar", "white flour", "processed food", "margarine", "shortening",
                          "vegetable oil", "alcohol", "red meat", "processed meat"],
    "Autoimmune Protocol": ["grain", "legume", "dairy", "egg", "nightshade", "tomato", "pepper",
                            "eggplant", "potato", "nut", "seed", "alcohol", "coffee", "chocolate"],
    "Nightshade-Free": ["tomato", "potato", "pepper", "eggplant", "paprika", "chili", "goji berry"],
    "Low-Histamine": ["alcohol", "wine", "beer", "vinegar", "fermented", "aged cheese",
                      "processed meat", "smoked fish", "spinach", "avocado", "strawberry",
                      "tomato", "chocolate", "leftover"],
    "Low-Purine": ["organ meat", "liver", "kidney", "anchovies", "sardines", "herring",
                   "mackerel", "yeast", "alcohol", "beer", "shellfish"],
    "Corn-Free": ["corn", "cornstarch", "corn syrup", "popcorn", "polenta", "corn flour",
                  "cornmeal", "hominy"],
    "Sesame-Free": ["sesame", "tahini", "sesame oil", "sesame seed", "hummus"],
    "Fructose-Free": ["apple", "pear", "mango", "honey", "high-fructose corn syrup",
                      "agave", "fruit juice"],
    "Raw Food": ["cooked", "baked", "fried", "processed", "pasteurised"],
    "Pregnancy-Safe": ["raw fish", "sushi", "raw egg", "soft cheese", "blue cheese",
                       "pate", "liver", "alcohol", "high-mercury fish", "shark", "swordfish"],
    "High-Protein": [],  # Inclusion filter, handled separately
    "High-Fibre": [],    # Inclusion filter
    "Mediterranean": [], # Style, no exclusions
    "DASH Diet": ["salt", "red meat", "full-fat dairy", "sugar", "alcohol"],
    "MIND Diet": ["red meat", "butter", "margarine", "cheese", "pastry", "sweets", "fried food"],
    "Athlete": [],       # High calorie, no exclusions
    "Muscle-Building": [],
    "High-Calorie": [],
    "Low-Calorie": ["butter", "oil", "cream", "sugar", "fried", "cheese", "lard"],
    "Budget-Friendly": [],
    "Student Meals": [],
    "One-Pot Meals": [],
    "5-Ingredient Meals": [],
    "Baby-Toddler": ["salt", "sugar", "honey", "whole nut", "raw fish", "raw egg",
                     "unpasteurised", "artificial sweetener", "choking hazard"],
    "Senior-Friendly": ["hard nut", "raw vegetable", "tough meat", "hard seed"],
    "Flexitarian": [],
    "PKU-Safe": ["aspartame", "phenylalanine", "meat", "fish", "egg", "dairy", "legume",
                 "nut", "soy"],
    "Coeliac-Safe": ["wheat", "barley", "rye", "oats", "spelt", "kamut", "triticale",
                     "malt", "brewer's yeast"],
    "Lactose-Intolerant": ["milk", "cream", "cheese", "butter", "yogurt", "ice cream",
                           "custard", "whey"],
    "Post-Surgery Soft": ["raw vegetable", "hard meat", "whole grain", "nut", "seed",
                          "hard fruit", "crusty bread"],
    "Indian Vegetarian": ["meat", "chicken", "beef", "pork", "fish", "egg"],
}

ALLERGEN_KEYWORDS = {
    "Gluten": ["wheat", "flour", "barley", "rye", "oats", "spelt", "semolina"],
    "Dairy": ["milk", "cheese", "butter", "cream", "yogurt", "lactose", "whey"],
    "Eggs": ["egg", "eggs", "mayonnaise", "albumin"],
    "Peanuts": ["peanut", "groundnut", "peanut butter"],
    "Tree Nuts": ["almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio",
                  "macadamia", "brazil nut", "pine nut"],
    "Soy": ["soy", "tofu", "tempeh", "edamame", "miso", "soy sauce"],
    "Fish": ["fish", "salmon", "tuna", "cod", "haddock", "anchovy", "sardine"],
    "Shellfish": ["prawn", "shrimp", "crab", "lobster", "scallop", "mussel", "oyster"],
    "Sesame": ["sesame", "tahini", "sesame oil"],
    "Mustard": ["mustard"],
    "Celery": ["celery"],
    "Lupin": ["lupin", "lupine"],
    "Molluscs": ["squid", "octopus", "snail", "mussel", "oyster", "clam"],
    "Sulphites": ["sulphite", "sulfite", "wine", "vinegar", "dried fruit"],
}


def recipe_matches_profile(recipe_tags: str, recipe_ingredients: str,
                             dietary_categories: list, allergies: list) -> bool:
    """Returns True if a recipe is safe and relevant for the user's profile."""
    tags = [t.strip().lower() for t in (recipe_tags or "").split(",")]
    ingredients_lower = recipe_ingredients.lower()

    # Check dietary exclusions
    for category in dietary_categories:
        exclusions = DIETARY_EXCLUSIONS.get(category, [])
        for blocked in exclusions:
            if blocked.lower() in ingredients_lower:
                return False

    # Check allergens
    for allergen in allergies:
        keywords = ALLERGEN_KEYWORDS.get(allergen, [allergen.lower()])
        for kw in keywords:
            if kw.lower() in ingredients_lower:
                return False

    return True
