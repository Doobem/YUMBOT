# 🍽️ YUMBOT — Universal Meal Planner

A full-stack meal planning webapp built by a five-agent AI pipeline.
Premium dark UI · 50+ dietary categories · CSS food art · YouTube video guides

---

## 📁 Project Structure

```
yumbot/
├── frontend/
│   ├── index.html       ← Main webpage (links to styles.css + app.js)
│   ├── styles.css       ← All styling (dark theme, animations, steam effects)
│   └── app.js           ← All frontend logic (recipes, plan, shopping, feedback)
│
├── backend/
│   ├── main.py          ← FastAPI app entry point
│   ├── database.py      ← SQLite setup and connection
│   ├── models.py        ← Pydantic request/response models
│   ├── meal_logic.py    ← Dietary rules engine (50+ categories, 14 allergens)
│   ├── seed_recipes.py  ← 42 seed recipes across all dietary categories
│   ├── requirements.txt ← Python dependencies
│   └── routers/
│       ├── profile.py      ← User preference endpoints
│       ├── mealplan.py     ← Plan generation + meal swap
│       ├── recipes.py      ← Recipe list + detail
│       ├── shoppinglist.py ← Auto shopping list by aisle
│       └── feedback.py     ← Feedback collection + weekly summary
│
└── README.md
```

---

## 🚀 Quick Start — Frontend Only (Demo Mode)

Just open `frontend/index.html` in any browser. No server needed.
The app runs in demo mode with built-in recipes and CSS food art.

---

## 🔧 Running the Full Backend

### 1. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Seed the recipe database
```bash
python seed_recipes.py
```

### 3. Start the API server
```bash
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`

### 4. Open the frontend
Open `frontend/index.html` in your browser.
The frontend auto-connects to the backend at `http://127.0.0.1:8000`.

---

## 🌱 Dietary Categories Supported (50+)

**Plant-Based:** Vegan, Vegetarian, Pescatarian, Flexitarian  
**Avoid Ingredients:** Gluten-Free, Dairy-Free, Egg-Free, Nut-Free, Soy-Free, Shellfish-Free, Fish-Free, Corn-Free, Sesame-Free, Nightshade-Free  
**Cultural & Religious:** Halal, Kosher, Jain, Indian Vegetarian  
**World Cuisines:** Mediterranean, East Asian, West African, Middle Eastern, Latin American, Caribbean, Eastern European, Nordic  
**Health & Fitness:** High-Protein, High-Fibre, Keto, Low-Carb, Low-Fat, Low-Calorie, High-Calorie, Athlete, Muscle-Building  
**Medical Diets:** Low-FODMAP, Diabetic-Friendly, Heart-Healthy, Kidney-Friendly, Anti-Inflammatory, Autoimmune Protocol, Low-Histamine, Low-Purine, Low-Sodium, Low-Sugar, Coeliac-Safe, Lactose-Intolerant, PKU-Safe  
**Eating Styles:** Paleo, Whole30, Raw Food, DASH Diet, MIND Diet  
**Life Stage:** Baby-Toddler, Kids, Teen-Friendly, Senior-Friendly, Pregnancy-Safe, Post-Surgery Soft  
**Lifestyle:** Budget-Friendly, Student Meals, One-Pot Meals, 5-Ingredient Meals, Meal-Prep  

**Allergens covered:** Gluten, Dairy, Eggs, Peanuts, Tree Nuts, Soy, Fish, Shellfish, Sesame, Mustard, Celery, Lupin, Molluscs, Sulphites

---

## 🔄 Weekly Feedback Loop

1. Users submit star ratings + comments via the feedback page
2. The Researcher agent analyses feedback themes weekly  
3. The Maker agent applies improvements within 7 days
4. Users see a confirmation: *"Check back in 7 days to see what's new!"*

---

## 🎨 Design

- **Theme:** Deep dark purple-black with fire-orange, magenta, and electric cyan accents
- **Typography:** Playfair Display (headings) + Outfit (body)
- **Food visuals:** CSS gradient art + animated food emoji — works without any external images
- **Steam effects:** Animated CSS wisps on all hot dishes
- **Videos:** YouTube links open in new tab for every recipe

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/profile` | Save user preferences |
| GET | `/profile/{session_id}` | Get saved profile |
| POST | `/mealplan/generate` | Generate 7-day meal plan |
| GET | `/mealplan/{plan_id}` | Get a saved plan |
| POST | `/mealplan/{plan_id}/swap` | Swap one meal |
| GET | `/recipes` | List all recipes (with filters) |
| GET | `/recipes/{id}` | Get full recipe detail |
| GET | `/shoppinglist/{plan_id}` | Get shopping list by aisle |
| POST | `/feedback` | Submit feedback |
| GET | `/feedback/summary` | Weekly feedback summary |

---

*YUMBOT v3.0 — Built by a five-agent AI pipeline (Researcher · Designer · Maker · Communicator · Manager)*
