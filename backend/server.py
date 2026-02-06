from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import cloudinary
import cloudinary.uploader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'lumina-gallery-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Modely ---
class AdminCreate(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str

class Theme(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: Optional[str] = None

class Photo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    image_url: str
    cloudinary_public_id: Optional[str] = None
    theme: str
    likes: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PhotoResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    image_url: str
    theme: str
    likes: int
    created_at: str

class LikeResponse(BaseModel):
    photo_id: str
    likes: int
    already_liked: bool

# --- Pomocné funkce ---
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc).timestamp() + 86400
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        admin = await db.admins.find_one({"username": username}, {"_id": 0})
        if not admin: raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# --- Routes ---
@api_router.get("/")
async def root():
    return {"message": "Lumina Gallery API na Cloudinary"}

# Admin Routes
@api_router.get("/admin/check")
async def check_admin_exists():
    existing = await db.admins.find_one({})
    return {"exists": existing is not None}

@api_router.get("/admin/verify")
async def verify_admin(admin: dict = Depends(get_current_admin)):
    return {"valid": True, "username": admin["username"]}

@api_router.post("/admin/setup", response_model=TokenResponse)
async def setup_admin(admin_data: AdminCreate):
    existing = await db.admins.find_one({})
    if existing: raise HTTPException(status_code=400, detail="Admin already exists")
    admin_doc = {"id": str(uuid.uuid4()), "username": admin_data.username, "password_hash": hash_password(admin_data.password), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.admins.insert_one(admin_doc)
    return TokenResponse(token=create_token(admin_data.username), username=admin_data.username)

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(login_data: AdminLogin):
    admin = await db.admins.find_one({"username": login_data.username})
    if not admin or not verify_password(login_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(token=create_token(login_data.username), username=login_data.username)

@api_router.get("/themes", response_model=List[Theme])
async def get_themes():
    themes = await db.themes.find({}, {"_id": 0}).to_list(100)
    if not themes:
        default_themes = [
            {"id": str(uuid.uuid4()), "name": "Nature", "slug": "nature", "description": "Nature"},
            {"id": str(uuid.uuid4()), "name": "City", "slug": "city", "description": "City"},
        ]
        await db.themes.insert_many(default_themes)
        return default_themes
    return themes

@api_router.post("/photos", response_model=PhotoResponse)
async def upload_photo(
    request: Request,
    title: str = Form(...),
    theme: str = Form(...),
    description: Optional[str] = Form(None),
    image: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    try:
        file_content = await image.read()
        upload_result = cloudinary.uploader.upload(
            file_content,
            folder="lumina-gallery",
            resource_type="auto"
        )
        image_url = upload_result.get("secure_url")
        public_id = upload_result.get("public_id")
        
        photo = Photo(title=title, description=description, image_url=image_url, cloudinary_public_id=public_id, theme=theme)
        await db.photos.insert_one(photo.model_dump())
        return PhotoResponse(**photo.model_dump())
    except Exception as e:
        logging.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/photos", response_model=List[PhotoResponse])
async def get_photos(theme: Optional[str] = None):
    query = {"theme": theme} if theme and theme != "all" else {}
    return await db.photos.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, admin: dict = Depends(get_current_admin)):
    photo = await db.photos.find_one({"id": photo_id})
    if not photo: raise HTTPException(status_code=404, detail="Not found")
    if photo.get("cloudinary_public_id"):
        cloudinary.uploader.destroy(photo["cloudinary_public_id"])
    await db.photos.delete_one({"id": photo_id})
    return {"message": "Deleted"}

@api_router.post("/photos/{photo_id}/like", response_model=LikeResponse)
async def like_photo(photo_id: str, request: Request):
    client_ip = get_client_ip(request)
    photo = await db.photos.find_one({"id": photo_id})
    if not photo: raise HTTPException(status_code=404, detail="Photo not found")
    if await db.likes.find_one({"photo_id": photo_id, "ip": client_ip}):
        return LikeResponse(photo_id=photo_id, likes=photo["likes"], already_liked=True)
    await db.likes.insert_one({"id": str(uuid.uuid4()), "photo_id": photo_id, "ip": client_ip})
    new_likes = photo["likes"] + 1
    await db.photos.update_one({"id": photo_id}, {"$set": {"likes": new_likes}})
    return LikeResponse(photo_id=photo_id, likes=new_likes, already_liked=False)

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): client.close()
