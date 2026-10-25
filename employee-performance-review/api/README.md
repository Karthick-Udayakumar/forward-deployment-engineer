# Employee Performance Review Management: API

Requirements, design and API specification: Testleaf.

## Business rules
- Ratings are 1 to 5 (quality, delivery, teamwork).
- `average_rating = (quality + delivery + teamwork) / 3`, calculated by the server.
- One employee has at most one review per period (409 otherwise).
- Comments are mandatory.
- Only `Open` periods accept new reviews (409 otherwise). Periods are configured as annual or half-yearly.

## Layering
`database.py` (pool) / `repository.py` (SQL) / `service.py` (rules) / `models.py` (Pydantic) / `main.py` (routes under `/api`).

## Endpoints (base `http://localhost:8000/api`)
| Method | Endpoint | Notes |
| :-- | :-- | :-- |
| GET | `/employees` | |
| GET | `/review-periods` | optional `?status=Open` |
| GET | `/reviews` | optional `period_id`, `employee_id`, `limit`, `offset`; total in `X-Total-Count` |
| GET | `/reviews/{id}` | 404 if missing (optional screen) |
| POST | `/reviews` | 201; 404 unknown employee/period; 409 closed period or duplicate; 422 invalid |

## Run
```bash
cp .env.example .env   # set DATABASE_URL
psql "$DATABASE_URL" -f schema.sql -f seed.sql
pip install -r requirements.txt
uvicorn main:app --reload      # docs at /docs, spec at /openapi.json
pytest
```
