from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging
import bcrypt
import jwt
import io
import csv

# ------------------------------------------------------------------ DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ------------------------------------------------------------------ App
app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ Auth helpers
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Kimlik doğrulanamadı")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz oturum")

# ------------------------------------------------------------------ Models
PyObjectId = Annotated[str, BeforeValidator(str)]

class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

class ProductBase(BaseModel):
    name: str
    price: float
    stock: int = 0
    sku: Optional[str] = ""

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: str
    created_at: str

# ------------------------------------------------------------------ Auth routes
@api_router.post("/auth/login")
async def login(body: LoginRequest):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    token = create_access_token(str(user["_id"]), email)
    return {
        "token": token,
        "user": {"id": str(user["_id"]), "email": user["email"],
                 "name": user.get("name", ""), "role": user.get("role", "user")},
    }

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["_id"], "email": user["email"],
            "name": user.get("name", ""), "role": user.get("role", "user")}

# ------------------------------------------------------------------ Product routes
def serialize_product(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "price": doc.get("price", 0),
        "stock": doc.get("stock", 0),
        "sku": doc.get("sku", ""),
        "created_at": doc.get("created_at", ""),
    }

@api_router.get("/products", response_model=List[Product])
async def list_products(user: dict = Depends(get_current_user)):
    docs = await db.products.find().sort("created_at", -1).to_list(2000)
    return [serialize_product(d) for d in docs]

@api_router.post("/products", response_model=Product)
async def create_product(body: ProductCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.products.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_product(doc)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, body: ProductCreate, user: dict = Depends(get_current_user)):
    res = await db.products.find_one_and_update(
        {"_id": ObjectId(product_id)}, {"$set": body.model_dump()}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return serialize_product(res)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    res = await db.products.delete_one({"_id": ObjectId(product_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return {"ok": True}

@api_router.post("/products/import")
async def import_products(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    text = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="Dosya boş veya geçersiz")
    # normalize headers
    norm = {h: h.strip().lower() for h in reader.fieldnames}
    def find_key(row, *cands):
        for orig, low in norm.items():
            if low in cands:
                return row.get(orig)
        return None
    inserted = 0
    docs = []
    for row in reader:
        name = (find_key(row, "name", "ürün adı", "urun adi", "ad", "ürün") or "").strip()
        if not name:
            continue
        raw_price = (find_key(row, "price", "fiyat") or "0").strip().replace("₺", "").replace(",", ".")
        raw_stock = (find_key(row, "stock", "stok", "adet") or "0").strip()
        try:
            price = float(raw_price or 0)
        except ValueError:
            price = 0.0
        try:
            stock = int(float(raw_stock or 0))
        except ValueError:
            stock = 0
        sku = (find_key(row, "sku", "kod", "barkod") or "").strip()
        docs.append({"name": name, "price": price, "stock": stock, "sku": sku,
                     "created_at": datetime.now(timezone.utc).isoformat()})
    if docs:
        await db.products.insert_many(docs)
        inserted = len(docs)
    return {"inserted": inserted}

@api_router.get("/")
async def root():
    return {"message": "Dükkanım API"}

# ------------------------------------------------------------------ Startup
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Dükkan Sahibi", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info("Admin kullanıcı oluşturuldu")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
    # seed sample products
    if await db.products.count_documents({}) == 0:
        samples = [
            {"name": "Filtre Kahve 250g", "price": 149.90, "stock": 24, "sku": "KHV-250"},
            {"name": "Yeşil Çay 100g", "price": 89.50, "stock": 40, "sku": "CAY-100"},
            {"name": "Bal 850g Cam Kavanoz", "price": 219.00, "stock": 15, "sku": "BAL-850"},
            {"name": "Zeytinyağı 1L", "price": 329.90, "stock": 30, "sku": "ZYT-1L"},
            {"name": "Çikolatalı Bisküvi", "price": 24.75, "stock": 120, "sku": "BSK-CIK"},
            {"name": "Doğal Kaya Tuzu 500g", "price": 45.00, "stock": 60, "sku": "TUZ-500"},
        ]
        for s in samples:
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.insert_many(samples)
        logger.info("Örnek ürünler eklendi")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
