# backend/app/main.py - Updated complete version
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

# Import routes
from app.routes.inventory import router as inventory_router
from app.routes.line_webhook import router as webhook_router

load_dotenv()

app = FastAPI(
    title="LINE Inventory Copilot API",
    version="1.0.0",
    description="FastAPI backend for LINE-based inventory management"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "https://your-domain.com",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inventory_router, prefix="/api")
app.include_router(webhook_router)

@app.get("/")
def read_root():
    return {
        "message": "LINE Inventory Copilot API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {
        "status": "OK",
        "service": "FastAPI",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )
