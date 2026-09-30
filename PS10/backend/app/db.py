from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .core.config import settings

DB_URL = settings.DATABASE_URL
if DB_URL.startswith("postgres://"):  # Heroku-style URL
    DB_URL = DB_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DB_URL.startswith("postgresql://"):
    DB_URL = DB_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    DB_URL,
    pool_pre_ping=True,
    **({"connect_args": {"check_same_thread": False}} if DB_URL.startswith("sqlite")
       else {"pool_size": 10, "max_overflow": 20}),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# MongoDB Atlas integration
mongo_client = None
mongo_db = None

if settings.MONGODB_URI:
    try:
        import pymongo
        mongo_client = pymongo.MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        mongo_db = mongo_client.get_default_database()
    except Exception:
        mongo_client = None
        mongo_db = None


def get_mongo_db():
    return mongo_db

