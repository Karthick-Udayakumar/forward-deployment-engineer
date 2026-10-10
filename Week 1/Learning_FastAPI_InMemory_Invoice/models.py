from pydantic import BaseModel

class Invoice(BaseModel):
    id: int
    amount: int
    status: str