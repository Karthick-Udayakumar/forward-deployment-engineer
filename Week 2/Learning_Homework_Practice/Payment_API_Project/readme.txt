===========================================================================
💳 PAYMENT LEDGER API MICROSERVICE — ARCHITECTURE DOCUMENTATION
===========================================================================

[PROJECT OVERVIEW]
This project is a standalone backend Payment Ledger API built using Python, 
FastAPI, and Pydantic. It follows the industry-standard 3-Tier (Layered) 
Architecture to achieve strong Separation of Concerns.

---------------------------------------------------------------------------
📁 PROJECT STRUCTURE
---------------------------------------------------------------------------
Payment_API_Project/
│
├── data/
│   └── payments.json    <-- The Persistence Layer (Your Storage Database)
│
├── main.py              <-- The Presentation Layer (API Routing / Gateway)
├── models.py            <-- The Data Shape Layer (Pydantic Verification)
├── repository.py        <-- The Data Access Layer (File Reading & Writing)
└── services.py          <-- The Business Logic Layer (The Application Brain)

---------------------------------------------------------------------------
🧱 ARCHITECTURE LAYERS BREAKDOWN
---------------------------------------------------------------------------

1. THE STORAGE ENGINE (data/payments.json)
   - A raw text JSON file holding all active payment records.
   - Initialized as a valid JSON list array '[]'.

2. THE DATA SHAPE CONTRACT (models.py)
   - Uses Pydantic schemas ('Payment' and 'PaymentUpdate') to validate incoming
     and outgoing data.
   - Ensures that properties like 'payment_id', 'invoice_id', and 'paid'
     follow strict data types (strings, floats greater than zero).

3. THE LIBRARIAN (repository.py)
   - Handles physical data stream operations directly with your Mac hard drive.
   - Contains 'load_payments()' (reads JSON to Python) and 'save_payments()' 
     (dumps Python memory back onto disk via json.dump).
   - This layer does not know anything about web URLs or pricing logic.

4. THE BRAIN (services.py)
   - Contains all the core application rules and transaction flows.
   - Connects the repository to the models. It explicitly unpacks incoming
     dictionary items into typed Pydantic models using '**item' syntax.
   - Auto-generates unique 'PAY-XXXXXX' transactional string tokens via UUID.

5. THE GATEKEEPER / CONTROLLER (main.py)
   - Powered by FastAPI. It captures incoming HTTP web requests (GET, POST, 
     PUT, DELETE) from the client browser and forwards tasks down to services.py.
   - Manages proper HTTP status codes (201 Created, 404 Not Found, etc.).

---------------------------------------------------------------------------
🚀 HOW TO LAUNCH AND RUN THE ENGINE (MAC OPERATIONAL GUIDE)
---------------------------------------------------------------------------

Follow these sequential steps in your terminal to avoid caching or out-of-bounds 
path routing errors:

1. Kill any existing server operations:
   Press [CTRL + C] in your active terminal panel window.

2. Navigate precisely into the local project directory boundary:
   cd /Users/karthickudayakumar/Documents/forward_deployment_engineer/Week2/Learning_Homework_Practice/Payment_API_Project

3. Boot up the reload server process:
   uvicorn main:app --reload

4. Open the Interactive Workbench Controls Dashboard in your web browser:
   Go to: http://127.0.0

---------------------------------------------------------------------------
🛠️ API ROUTE WORKBENCH REFERENCE
---------------------------------------------------------------------------
- GET    /payments/          -> Fetches the entire master payments database ledger.
- GET    /payments/{id}      -> Retrieves a specific settlement transaction by ID.
- POST   /payments/          -> Submits a brand new payment allocation to disk.
- PUT    /payments/{id}      -> Updates the allocation values of an existing record.
- DELETE /payments/{id}      -> Reverses and permanently purges a transaction log.
===========================================================================
