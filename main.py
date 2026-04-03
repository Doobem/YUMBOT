from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import mealplan, recipes, feedback, profile, shoppinglist
from database import init_db

app = FastAPI(title="YUMBOT API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(mealplan.router, prefix="/mealplan", tags=["Meal Plan"])
app.include_router(recipes.router, prefix="/recipes", tags=["Recipes"])
app.include_router(shoppinglist.router, prefix="/shoppinglist", tags=["Shopping List"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])

@app.get("/")
def root():
    return {"message": "Welcome to YUMBOT 🍽️"}
