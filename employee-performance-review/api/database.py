import os
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Opened lazily on first use so importing this module (e.g. in tests) needs no database
pool = ConnectionPool(DATABASE_URL or "", open=False, min_size=1, max_size=10)

def get_connection():
    """Use as `with get_connection() as conn:`. Commits on success, rolls back on error."""
    if pool.closed:
        pool.open()
    return pool.connection()
