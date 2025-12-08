from pydantic import BaseModel

class WeeklyEvolutionData(BaseModel):
    week: str
    tickets: int

class MonthlyEvolutionData(BaseModel):
    month: str
    tickets: int

class TopRecurringItem(BaseModel):
    name: str
    count: int
