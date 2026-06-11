# Bulk Order Automation Platform

A complete working demo of an automated bulk order processing pipeline. It showcases how bulk orders (e.g. from a CSV) can be imported, matched to supplier catalogs using fuzzy matching, and automatically fulfilled by driving a supplier's website via Playwright.

## Architecture

* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui.
* **Backend:** FastAPI, Python 3.10+, SQLite.
* **Processing:** Pandas (CSV parsing), RapidFuzz (fuzzy matching).
* **Automation:** Playwright (headless browser automation).

## Setup Instructions

### 1. Backend Setup

The backend runs on `http://localhost:8000`.

1. Open a terminal in the `backend/` directory.
2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Install Playwright browsers:
   ```bash
   playwright install chromium
   ```
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

*Note: On the first run, the backend will automatically create the SQLite database (`backend/data/bulkorder.db`) and populate it with 2 mockup suppliers, 20 products, and 50 sample orders. It will also generate a sample CSV at `backend/data/sample_orders.csv`.*

### 2. Frontend Setup

The frontend runs on `http://localhost:3000`.

1. Open a new terminal in the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Usage

1. Open `http://localhost:3000` in your browser.
2. **Dashboard:** View the overall metrics and the seeded 50 orders in various states.
3. **Upload:** Navigate to "Upload Orders" to drop the sample CSV located at `backend/data/sample_orders.csv`. This will import new orders.
4. **Matching:** Click "Run Matching" to use RapidFuzz to match the imported orders to the mockup supplier catalog.
5. **Processing:** Click "Process All" (or "Run Automation" on a specific order's detail page) to trigger Playwright. Playwright will invisibly navigate to the Mock Supplier Site (hosted by the backend at `http://localhost:8000/supplier-site/`), search the product, add it to the cart, checkout, and extract the generated Tracking Number and Order Reference.
6. **Timeline:** Click on any Order ID to view its complete timeline.

## Project Structure

* `/backend` — FastAPI application, Playwright automation, SQLite DB, and the mock supplier HTML site.
* `/frontend` — Next.js React application with shadcn UI components and premium styling.
