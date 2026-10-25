INSERT INTO employees (employee_id, name, department, email) VALUES
  ('EMP101', 'John Smith',    'Engineering', 'john.smith@example.com'),
  ('EMP102', 'Sarah Johnson', 'Engineering', 'sarah.johnson@example.com'),
  ('EMP103', 'Michael Lee',   'Sales',       'michael.lee@example.com'),
  ('EMP104', 'Priya Sharma',  'Human Resources', 'priya.sharma@example.com'),
  ('EMP105', 'Ana Torres',    'Sales',       'ana.torres@example.com');

INSERT INTO review_periods (name, start_date, end_date, status) VALUES
  ('H2 2025', '2025-07-01', '2025-12-31', 'Closed'),
  ('H1 2026', '2026-01-01', '2026-06-30', 'Open');

INSERT INTO performance_reviews (employee_id, period_id, quality_rating, delivery_rating, teamwork_rating, average_rating, comments) VALUES
  (1, 2, 4, 5, 4, ROUND((4+5+4)/3.0, 2), 'Strong performer with great teamwork.'),
  (2, 2, 3, 4, 4, ROUND((3+4+4)/3.0, 2), 'Reliable delivery; keep growing mentoring.'),
  (3, 2, 5, 5, 5, ROUND((5+5+5)/3.0, 2), 'Outstanding quarter across the board.'),
  (4, 2, 2, 3, 3, ROUND((2+3+3)/3.0, 2), 'Needs a clearer plan on quality.'),
  (1, 1, 4, 4, 5, ROUND((4+4+5)/3.0, 2), 'Consistent and collaborative.');
