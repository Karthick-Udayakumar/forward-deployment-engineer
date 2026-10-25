RATING_FIELDS = ["quality_rating", "delivery_rating", "teamwork_rating"]

def calculate_average(review: dict) -> float:
    """Average rating = (quality + delivery + teamwork) / 3, rounded to 2 decimals."""
    return round(sum(review[field] for field in RATING_FIELDS) / len(RATING_FIELDS), 2)

def period_accepts_reviews(period: dict) -> bool:
    """Only open periods accept new reviews."""
    return period["status"] == "Open"
