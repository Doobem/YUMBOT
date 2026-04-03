from pydantic import BaseModel
from typing import List, Optional

class ProfileCreate(BaseModel):
    session_id: str
    people_count: int = 2
    cooking_confidence: str = "beginner"
    dietary_categories: List[str] = []
    allergies: List[str] = []

class MealPlanRequest(BaseModel):
    session_id: str
    week_start_date: Optional[str] = None

class SwapRequest(BaseModel):
    session_id: str
    day: str
    meal_type: str  # breakfast / lunch / dinner

class FeedbackCreate(BaseModel):
    session_id: str
    star_rating: int
    comment: Optional[str] = ""
    loved_meals: Optional[str] = ""
    week_ref: Optional[str] = ""
