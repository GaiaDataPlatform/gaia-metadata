from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, AsyncSessionLocal
from .models import User, Cruise, InstrumentCategory, OperationTemplate, Task, TaskOperation
from .routers import auth, users, cruises, instruments, tasks
from .core.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    yield
    await engine.dispose()

app = FastAPI(
    title="Gaia Metadata",
    version="2.1.0",
    description="Console di gestione campagne oceanografiche - R/V Gaia Blu",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(cruises.router, prefix=PREFIX)
app.include_router(instruments.router, prefix=PREFIX)
app.include_router(tasks.router, prefix=PREFIX)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.1.0", "service": "gaia-metadata"}
