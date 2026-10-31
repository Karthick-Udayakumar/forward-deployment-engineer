# Architecture Pattern: FastAPI + PostgreSQL API with React + TypeScript UI

Extracted from `healthcare-readmission-ui-api` (backend) and `fde-react-diabetic` (frontend).
Target: **Employee Performance Review Management**.
Section 9 lists what the reference projects did poorly, so the new project should not copy it.

---

## 1. System shape

```
React 19 + TS + Vite (:5173)  ──HTTP/JSON──>  FastAPI (:8000)  ──psycopg3──>  PostgreSQL
  pages -> hooks -> api/client                  main -> service -> repository     schema.sql
```

- Two independent projects (`<name>-api`, `<name>-react`). The UI talks to the API only over HTTP.
- No ORM. Raw parameterized SQL in one layer.
- No global state library or router. React `useState` plus custom hooks.
- Config comes from `.env` (`DATABASE_URL`). A `.env.example` is committed.
- The API serves a read-only reference list (`/reference/codes`) so dropdowns are not hard-coded twice.

## 2. Backend layering (strict, one direction)

| File | Responsibility | Must not |
|---|---|---|
| `main.py` | Routes, HTTP status codes, `HTTPException`, CORS, static mount | Contain SQL or scoring rules |
| `models.py` | Pydantic request models (`Field(ge=…, max_length=…)`, `Literal` enums) | Touch the DB |
| `service.py` | Business rules (the scoring function), reference data loading | Touch HTTP or SQL |
| `repository.py` | All SQL; returns `dict` rows via `dict_row`; one function per query | Raise HTTP errors or apply business rules |
| `database.py` | `get_connection()` from `DATABASE_URL` | |
| `schema.sql` | DDL: tables, FKs, sequences, defaults | |
| `data_loader.py` | One-off CSV seeding that reuses `service` rules | |

Dependency direction: `main -> (models, service, repository) -> database`. `main` computes derived values
(`calculate_risk`), then passes them into the repository (`insert_encounter(data, score, level)`).
The repository never calculates them.

## 3. Backend rules

1. **Server owns derived fields.** The client never sends `id`, `risk_score` or `risk_level`.
2. **Explainable, deterministic rules.** Scoring is an additive points table with threshold-to-level mapping.
   It lives in one function and is documented in the README. No ML in the MVP.
3. **Outcome fields are not scoring inputs.** The 30-day outcome is recorded after the fact and never feeds the score (no leakage).
4. **Validation sits on the edge.** Pydantic `Field` constraints for bodies, `Query(ge, le, min_length)` for params, `Literal[...]` for enums.
5. **Status codes are consistent:**
   - 201 on create.
   - 404 `detail="Encounter ID 'X' not found."` for a missing resource.
   - 409 for a conflict (value already set; the caller must send `overwrite: true`).
   - 422 for a bad or empty search (at least one filter required).
6. **Concurrency guard in SQL.** `UPDATE … WHERE id=%s AND (col IS NULL OR %s) RETURNING *`.
   Zero rows returned means 404 or 409, and the route disambiguates with a second lookup.
7. **Pagination.** Every list takes `limit` and `offset` (default 50 or 100, max 500) and has a stable `ORDER BY` with a tie-breaker (`risk_score DESC, encounter_id`).
8. **Dynamic search.** Build the WHERE clause from fixed fragments with `%s` params (AND semantics, `None` filters ignored). Never interpolate user values.
9. **Queue reads join the workflow table** with `LEFT JOIN`, so rows with no workflow record still appear (`status = NULL` means "Not started").
10. **Workflow as a table.** One parent row (`patient_encounters`) plus one workflow row (`care_interventions`) with a status enum string, `assigned_to`, `notes`, `created_at`, `updated_at`. A `PATCH` upserts it.
   The server generates IDs (`'MAN-' || LPAD(nextval(seq))`) and computes scores.
11. **Dashboard endpoints compose existing repository functions.** `/management/dashboard` returns `{operations, clinical_validation}` and adds no new SQL.
12. **Route order matters.** Declare `/encounters/search` before `/encounters/{id}`.
13. **Docstrings state the contract**: params, 404/409 behavior, side effects.

### Endpoint template

```
GET    /<things>                 paginated list
GET    /<things>/search          AND-combined filters, >=1 required
GET    /<things>/{id}            404 if missing
POST   /<things>                 201, server-generated id + derived fields
PATCH  /<things>/{id}            partial/outcome update (404/409)
GET    /<queue>, /<queue>/high   prioritized work lists
GET/PATCH /<workflow>/{id}       workflow record (GET returns nulls until first PATCH)
GET    /operations/summary       counts
GET    /operations/<validation>  rule vs. outcome analysis
GET    /management/dashboard     composed summary
GET    /reference/codes          dropdown data
```

## 4. Frontend architecture

```
src/
  main.tsx            StrictMode root
  App.tsx             page state, navigation, wires hooks to components
  types.ts            all API shapes (mirrors models.py/repository.py)
  constants.ts        enum arrays, Option{value,label}, dropdown lists, AppPage union
  format.ts           pure display helpers (statusLabel, teamLabel, formatTimestamp)
  api/client.ts       the only code that calls fetch
  api/errors.ts       maps ApiError / 422 to user-facing text
  hooks/              one hook per data concern
  components/         presentational, props-in / callbacks-out
```

### Layer rules
- **Components never call `fetch` or `api/client`.** They receive data and callbacks. Hooks call the client, and `App` connects hooks to components.
- **Types are the contract.** `types.ts` has a comment pointing at the backend files it mirrors. Update both together.
- **Enums are `as const` arrays.** `export const X = [...] as const; type X = (typeof X)[number]`. The same array drives runtime validation, dropdowns and types.
- **Stored value vs. label.** `Option{value,label}`: the code is stored, the label is shown. `format.ts` converts, with a fallback when a value is null ("Not started", "Unassigned").
- **No router.** `useState<AppPage>`. `goTo()` also reloads the target page's data and clears the notice. Detail pages (`update`) highlight their parent nav link.

### API client (`api/client.ts`) rules
- One `request<T>()` pipeline. Every endpoint is a one-line typed function, `export async function x(params, options?: RequestOptions)`.
- It always rejects with `ApiError{code, status, detail}`.
  Codes: `HTTP_ERROR | NETWORK_ERROR | TIMEOUT | ABORTED | INVALID_RESPONSE`.
- It supports a timeout (default 10 s), a caller `AbortSignal`, and a timer that stays armed while the body streams.
- It keeps a non-JSON error body (a proxy's HTML page) as raw text.
- It validates input before sending. Bad input throws `TypeError`/`RangeError`, and a bad request is never sent.
  Hooks use this to tell "fix your input" apart from "server problem".
- It encodes path params (`encodeURIComponent`) and exposes `configureApiClient({baseUrl, timeoutMs})`.
- `FastAPI detail` is a string for 404/409 and an array for 422. `ApiError.detail` is typed `unknown`.

### Hook patterns
- **`usePagedList(active, fetchRows, fetchTotal)`** is the generic server-paginated list.
  - It loads only while `active`.
  - It cancels in-flight requests with `AbortController` in the effect cleanup.
  - It keys results by `page:pageSize:reloadCount`, so stale results show as loading.
  - The total is optional (`.catch(() => null)`).
  - It steps back a page if the current page comes back empty.
  - Fetchers must be module-level (stable references).
  - Feature hooks are thin wrappers (`useEncounterPage`, `useHighRiskPage`).
- **Mutation hooks** (`useCreateEncounter`, `useIntervention`) expose `{ save, busy, message/serverErrors }`.
  - They set `busy` in `try/finally`.
  - They branch on `isApiError` and `status` (422 -> per-field errors, 409 -> "someone else changed this", NETWORK/TIMEOUT -> "can't reach server").
  - After a save they bump a `version` counter to reload from the server, so forms show what was stored.
- **Query hooks** with `useEffect` + `AbortController` + `if (controller.signal.aborted) return` in `.catch`.
- **Search hook** keeps `results: T[] | null` (`null` = not searched yet), and derives the status line ("No record found", "Showing first N") rather than storing it.
- Reference data hooks load lazily (`active = page === 'add'`) and degrade gracefully (optional fields still work if the load fails).

### Form pattern
- Field values are strings, as inputs report them. `validate()` returns `Partial<Record<Field,string>>`. `buildPayload()` converts to the API shape.
- Client validation mirrors the server rules. The server's 422s are also mapped onto fields (`splitValidationErrors`, with a `type -> plain message` table).
- Client errors win over server errors. Editing a field clears its error. On submit, focus the first invalid field. Show an "N fields need correcting" summary.
- `FormField` reserves error space so the layout does not jump. `noValidate` on the form, with `aria-invalid` on invalid inputs.
- Use `key={id-updated_at}` on a form to reset its state after a reload.

### Shared components
`AppHeader` (nav with `aria-current`), `Pager` (page size, prev/next, go-to-page, "Showing a–b of N"),
`SortableHeader` (button inside `th`, `aria-sort`), `StatusMessage` (always rendered, `aria-live="polite"`, variants default/success/error),
`ConfirmDialog` (native `<dialog>`, parent controls `open`), `FormField`, and one table component per list (empty-state row, `colSpan`).

### Conventions
- `data-testid` on interactive elements and rows (`row-queue-<id>`, `btn-save-encounter`, `input-<field>`).
- Accessibility baseline: labels tied to inputs, `aria-live` status, real buttons and links, keyboard-operable sorting.
- CSS: one `index.css` with design tokens in `:root` (`--primary`, `--border`, `--danger`, `--success`, `--radius`), plus `.card` > `section` layout.
- Tooling: Vite, `tsc -b && vite build`, ESLint with `react-hooks` and `react-refresh`, strict TS. Dev server on a fixed port with `strictPort`.
- Comments explain *why* and the contract, in a short, plain style. Avoid banner noise except the `// ----` section dividers in `client.ts`.

## 5. Domain mapping to Performance Review

| Reference | New project (suggested) |
|---|---|
| `patient_encounters` | `review_cycles` + `employees` + `performance_reviews` |
| `risk_score` / `risk_level` | `overall_score` / `rating` (e.g. Needs Improvement, Meets, Exceeds) from a points rule |
| `care_interventions` (status, assigned_to, notes) | `review_workflow` (status, reviewer, comments) |
| Status: PENDING_REVIEW -> ASSIGNED -> CONTACTED -> FOLLOW_UP_SCHEDULED -> CLOSED | `NOT_STARTED -> SELF_REVIEW -> MANAGER_REVIEW -> CALIBRATION -> ACKNOWLEDGED -> CLOSED` |
| `readmitted` (set once, 409 on overwrite) | `final_rating` / `calibrated_rating` (set once; `overwrite` flag) |
| `GET /care-queue`, `/care-queue/high` | `GET /review-queue` (pending), `/review-queue/at-risk` (low performers / overdue) |
| `/operations/summary` | review counts by status, rating distribution, overdue count |
| `/operations/readmission-analysis` | rating-calibration analysis (e.g. self vs. manager rating gap) |
| `/management/dashboard` | HR / executive dashboard |
| `/reference/codes` | departments, job levels, review periods, competencies |
| `TEAM_ROLES` | `REVIEWER_ROLES` (Manager, Skip-level, HR Partner, Peer) |
| `data_loader.py` + CSV | seed employees, cycles and competencies |
| UI pages Home / Add / Search / High-Risk / Update | Dashboard / Add Review / Search Employee / Review Queue / Update Review |

Suggested scoring rule: weighted competency scores summed into points, with threshold-to-rating mapping documented in the README, as in the reference.

## 6. New-project skeleton

```
employee-review-api/
  main.py  models.py  service.py  repository.py  database.py
  schema.sql  data_loader.py  requirements.txt  .env.example  README.md  tests/
employee-review-react/
  src/{App.tsx,main.tsx,types.ts,constants.ts,format.ts}
  src/api/{client.ts,errors.ts}
  src/hooks/  src/components/
  vite.config.ts  eslint.config.js  tsconfig*.json
```

README outline (the reference one is a good template): business problem -> users and outcomes -> discovery and assumptions
(known / unknown / hypothesis) -> explainable scoring rule -> layering rule -> endpoint list -> run instructions.

## 7. Build order

1. README (problem, users, assumptions, scoring rule).
2. `schema.sql`, then seed via `data_loader.py`.
3. `service.py` scoring with unit tests.
4. `models.py` -> `repository.py` -> `main.py`, endpoint by endpoint.
5. `types.ts` + `constants.ts`, then `api/client.ts` (one function per route).
6. Generic hooks (`usePagedList`), then feature hooks, then components, then `App.tsx`.
7. Run the API (`uvicorn main:app --reload`) and the UI (`npm run dev`), and check each page end to end.

## 8. Checklist for every new endpoint or feature

- [ ] Pydantic model or `Query` constraints
- [ ] Repository function with parameterized SQL and a stable ordering
- [ ] Business rule in `service.py`, not in the route or the SQL
- [ ] 404 / 409 / 422 paths decided and documented in the docstring
- [ ] Type in `types.ts` and a function in `api/client.ts` with input guards
- [ ] Hook with abort handling and an error message mapped in `errors.ts`
- [ ] Component with empty, loading and error states, a11y attributes and `data-testid`

## 9. Gaps in the references to fix in the new project

| Gap in reference | Do instead |
|---|---|
| No authentication or authorization. Anyone can PATCH any record. | Add auth (JWT or SSO) and role checks. For reviews: employee sees own, manager sees reports, HR sees all. This matters far more for HR data than for the demo data. |
| CORS `allow_origins=["*"]` | Read allowed origins from env. |
| A new connection on every call. `database.py` has no pool, despite the README saying "pooling". | Use `psycopg_pool.ConnectionPool` and a FastAPI dependency. |
| `InterventionUpdate.status` is a plain `str`, so the server accepts any status. Only the client checks it. | Use a `Literal` or `Enum` in Pydantic, and enforce allowed transitions in `service.py`. |
| Upsert is SELECT-then-INSERT/UPDATE, which races. `care_interventions` has no UNIQUE on `encounter_id`. | `UNIQUE(review_id)` + `INSERT … ON CONFLICT DO UPDATE`. |
| `get_operations_metrics` runs 6 separate COUNT queries. | One `COUNT(*) FILTER (WHERE …)` query. |
| Two COUNTs happen on every page load (the list plus `/operations/summary` for the total). | Return `{items, total}` from list endpoints. |
| Response models missing (`EncounterResponse` is defined but unused). Routes return raw dicts. | Use `response_model=` on every route. |
| Scoring thresholds are magic numbers inside `calculate_risk`. | Put them in a named config table or constants. Add pytest tests for the boundaries. |
| No audit trail. Only `updated_at` is kept. | For performance reviews, keep an append-only history of status and rating changes (who, when, from, to). |
| `data_loader` inserts row by row and stores `str(NaN)`. | Use `executemany` or `COPY` and handle nulls explicitly. |
| No tests, in the API or the UI. | pytest for service and API (TestClient); Vitest + Testing Library for hooks and forms (the `data-testid` hooks are already there). |
| No SQL migrations. | Alembic or numbered `.sql` files. |
| `README` has stray `[cite: …]` markers and a truncated run section. | Clean it up, and keep the README as the source of truth for the rules. |
| UI has a vanilla `ui/` copy and a React copy. | Build only the React UI and have the API serve `dist/` if single-origin is wanted. |
| `client.ts` is duplicated between the API repo and the React repo. | Keep a single one, in the React repo. |
