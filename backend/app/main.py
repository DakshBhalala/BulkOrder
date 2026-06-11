"""
FastAPI application entry point.
Configures CORS, mounts static files, registers routers, and seeds the database.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.database import engine, Base, SessionLocal
from app.seed import seed_database


import sys
import asyncio
from app.services.engine import simulation_engine
from app.services.tracking import tracking_webhook_simulator

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    # Start background engines
    asyncio.create_task(simulation_engine())
    asyncio.create_task(tracking_webhook_simulator())
    yield


app = FastAPI(
    title="Bulk Order Automation Platform",
    description="Demo platform for automating bulk order processing",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the mock supplier site as static files
supplier_site_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supplier_site")
app.mount("/supplier-site", StaticFiles(directory=supplier_site_path, html=True), name="supplier-site")

# Mount screenshots directory
screenshots_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "screenshots")
os.makedirs(screenshots_path, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=screenshots_path), name="screenshots")

# Register routers
from app.routes import orders, dashboard, matching, suppliers, automation, scrape, campaigns, fleet

app.include_router(orders.router)
app.include_router(dashboard.router)
app.include_router(matching.router)
app.include_router(suppliers.router)
app.include_router(automation.router)
app.include_router(scrape.router)
app.include_router(campaigns.router)
app.include_router(fleet.router)


@app.get("/")
def root():
    return {
        "name": "Bulk Order Automation Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "supplier_site": "/supplier-site/",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}
