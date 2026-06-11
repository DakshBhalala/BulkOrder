# Backend - Bulk Order Automation

The backend is built with FastAPI, SQLite, and Playwright.

## Modules

* `app/main.py`: Entry point, CORS config, and static files for the mock supplier site.
* `app/models.py`: SQLAlchemy ORM models (Order, Product, Supplier, OrderHistory).
* `app/schemas.py`: Pydantic models for API validation.
* `app/crud.py`: Database query functions.
* `app/routes/`: API endpoints grouped by domain (orders, matching, automation, etc.).
* `app/services/matcher.py`: Fuzzy matching using `rapidfuzz`.
* `app/services/automation.py`: Playwright script to drive the mock supplier storefront.
* `app/services/supplier_adapter.py`: Mock adapters for Supplier A and Supplier B.
* `supplier_site/`: The mock HTML/CSS/JS storefront that Playwright interacts with.

## Setup

See the main README in the project root for full setup instructions. 

In brief:
```bash
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload
```

## API Docs

When running, visit `http://localhost:8000/docs` to see the interactive Swagger UI.
