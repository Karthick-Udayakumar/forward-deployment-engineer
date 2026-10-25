CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,      -- employee code, e.g. EMP101
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE review_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                    -- e.g. H1 2026
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Open'             -- Open / Closed
);

CREATE TABLE performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    period_id INTEGER NOT NULL REFERENCES review_periods(id),
    quality_rating INTEGER NOT NULL CHECK (quality_rating BETWEEN 1 AND 5),
    delivery_rating INTEGER NOT NULL CHECK (delivery_rating BETWEEN 1 AND 5),
    teamwork_rating INTEGER NOT NULL CHECK (teamwork_rating BETWEEN 1 AND 5),
    average_rating DECIMAL(3,2) NOT NULL,         -- calculated by the server
    comments TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (employee_id, period_id)               -- one review per employee per period
);

CREATE INDEX idx_reviews_period ON performance_reviews(period_id);
