from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import retail, hotel

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Real Estate Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(retail.router, prefix="/api/retail", tags=["retail"])
app.include_router(hotel.router, prefix="/api/hotel", tags=["hotel"])

@app.get("/")
def root():
    return {"message": "Real Estate Management API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
