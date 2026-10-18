# Enterprise Healthcare: Diabetes Readmission Intervention Queue MVP

## 1. Enterprise Scenario & Business Problem
Hospitals face significant challenges with patients returning within 30 days of discharge due to chronic conditions like diabetes. Because the care-management team cannot manually review every discharged patient, this application converts historical healthcare data into an actionable, prioritized care-management workflow. 

* **Primary Business Decision:** Which recently discharged diabetes patients should the care-management team review first[cite: 39]?

---

## 2. Users and Business Outcomes
| User | What They Need | Business Outcome |
| :--- | :--- | :--- |
| **Care Management Team** | Prioritized review queue[cite: 39] | Focus limited capacity on higher-risk cases[cite: 39] |
| **Hospital Operations** | Queue and workload visibility[cite: 39] | Understand intervention volume and backlog[cite: 39] |
| **Clinical Leadership** | Explainable rationale[cite: 39] | Review whether prioritization is operationally sensible[cite: 39] |
| **Finance/Transformation** | Outcome and value signals[cite: 39] | Assess whether the intervention is worth scaling[cite: 39] |

---

## 3. FDE Discovery & Assumptions
| What the dataset tells us | What we do NOT know | MVP hypothesis |
| :--- | :--- | :--- |
| Historical encounters[cite: 40] | Which readmissions were preventable?[cite: 40] | Prior utilization may help prioritize follow-up[cite: 40] |
| Historical <30-day readmissions[cite: 40] | Cost of a readmission?[cite: 40] | Care-management capacity is limited[cite: 40] |
| Prior healthcare utilization[cite: 40] | Current discharge workflow?[cite: 40] | A risk queue may be better than reviewing everyone[cite: 40] |
| Operational/treatment attributes[cite: 40] | Cost of intervention?[cite: 40] | Rules are acceptable for an explainable MVP[cite: 40] |
| Historical outcome[cite: 40] | Clinical validity of rules?[cite: 40] | Historical outcomes can be used to evaluate the rule after scoring[cite: 40] |

---

## 4. Prioritization Rule (Explainable Scoring)
To ensure transparency for clinical leadership, a deterministic point system is applied (avoiding historical outcome leakage during scoring):
* `number_inpatient >= 3` (+3 points)[cite: 41]
* `number_emergency >= 2` (+2 points)[cite: 41]
* `number_outpatient >= 3` (+1 point)[cite: 41]
* `time_in_hospital >= 7` (+1 point)[cite: 41]
* `num_medications >= 20` (+1 point)[cite: 41]

**Risk Level Mapping:** $0-2 = \text{LOW}$ | $3-4 = \text{MEDIUM}$ | $5+ = \text{HIGH}$[cite: 41]

---

## 5. Target Architecture & Stack
* **Core Stack:** Python, FastAPI, PostgreSQL, Psycopg 3, Pydantic, Pandas[cite: 39, 45]
* **Layering Rule:** 
  * `database.py` — Database configuration and connection pooling[cite: 41].
  * `repository.py` — Raw parameterized SQL queries and persistence[cite: 41].
  * `service.py` — Business rules and risk-scoring logic[cite: 41].
  * `models.py` — Pydantic request/response data validation schemas.
---
  * `main.py` — FastAPI routing and HTTP request/response handling[cite: 41].


## 6. Mandatory API Endpoints
* `GET /encounters` — List all patient encounters (paginated)[cite: 43]
* `GET /encounters/{encounter_id}` — Get single encounter details (returns 404 if missing)[cite: 43, 44]
* `GET /care-queue` — Return MEDIUM + HIGH risk care-management queue[cite: 43]
* `GET /care-queue/high` — Return strictly HIGH risk care queue[cite: 43]
* `PATCH /interventions/{encounter_id}` — Update workflow status (`PENDING_REVIEW` $\rightarrow$ `ASSIGNED` $\rightarrow$ `CONTACTED` $\rightarrow$ `FOLLOW_UP_SCHEDULED` $\rightarrow$ `CLOSED`), owner, and notes[cite: 42, 43]
* `GET /operations/summary` — Operational workload and queue metrics[cite: 43]
* `GET /operations/readmission-analysis` — Compare risk groups against historical <30-day readmissions[cite: 43, 44]
* `GET /management/dashboard` — Executive summary combining operations and clinical validation[cite: 43]

---

## 7. Run Instructions
1. **Set up PostgreSQL and execute schema:**
   ```bash
   psql -U your_username -d your_database -f schema.sql