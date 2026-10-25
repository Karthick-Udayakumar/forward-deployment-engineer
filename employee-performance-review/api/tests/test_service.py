import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from service import calculate_average, period_accepts_reviews

def test_average_matches_spec_example():
    assert calculate_average({"quality_rating": 4, "delivery_rating": 5, "teamwork_rating": 4}) == 4.33

def test_average_bounds():
    assert calculate_average({"quality_rating": 1, "delivery_rating": 1, "teamwork_rating": 1}) == 1.0
    assert calculate_average({"quality_rating": 5, "delivery_rating": 5, "teamwork_rating": 5}) == 5.0
    assert calculate_average({"quality_rating": 2, "delivery_rating": 3, "teamwork_rating": 3}) == 2.67

def test_only_open_periods_accept_reviews():
    assert period_accepts_reviews({"status": "Open"})
    assert not period_accepts_reviews({"status": "Closed"})
