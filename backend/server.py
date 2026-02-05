from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.staticfiles import StaticFiles
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
from functools import wraps
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'lumina-gallery-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
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

# Helper Functions
def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
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
        "exp": datetime.now(timezone.utc).timestamp() + 86400  # 24 hours
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
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Lumina Gallery API"}

# Admin Routes
@api_router.post("/admin/setup", response_model=TokenResponse)
async def setup_admin(admin_data: AdminCreate):
    """Initial admin setup - only works if no admin exists"""
    existing = await db.admins.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    admin_doc = {
        "id": str(uuid.uuid4()),
        "username": admin_data.username,
        "password_hash": hash_password(admin_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    token = create_token(admin_data.username)
    return TokenResponse(token=token, username=admin_data.username)

@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(login_data: AdminLogin):
    """Admin login"""
    admin = await db.admins.find_one({"username": login_data.username}, {"_id": 0})
    if not admin or not verify_password(login_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(login_data.username)
    return TokenResponse(token=token, username=login_data.username)

@api_router.get("/admin/check")
async def check_admin_exists():
    """Check if admin exists"""
    existing = await db.admins.find_one({})
    return {"exists": existing is not None}

@api_router.get("/admin/verify")
async def verify_admin(admin: dict = Depends(get_current_admin)):
    """Verify admin token"""
    return {"valid": True, "username": admin["username"]}

# Theme Routes
@api_router.get("/themes", response_model=List[Theme])
async def get_themes():
    """Get all themes"""
    themes = await db.themes.find({}, {"_id": 0}).to_list(100)
    if not themes:
        # Initialize default themes
        default_themes = [
            {"id": str(uuid.uuid4()), "name": "Nature", "slug": "nature", "description": "Landscapes and natural beauty"},
            {"id": str(uuid.uuid4()), "name": "City", "slug": "city", "description": "Urban photography and architecture"},
            {"id": str(uuid.uuid4()), "name": "Abstract", "slug": "abstract", "description": "Abstract art and creative compositions"},
            {"id": str(uuid.uuid4()), "name": "Portrait", "slug": "portrait", "description": "People and character studies"},
            {"id": str(uuid.uuid4()), "name": "Travel", "slug": "travel", "description": "Adventures around the world"},
        ]
        await db.themes.insert_many(default_themes)
        return default_themes
    return themes

class ThemeCreate(BaseModel):
    name: str
    description: Optional[str] = None

@api_router.post("/themes", response_model=Theme)
async def create_theme(theme_data: ThemeCreate, admin: dict = Depends(get_current_admin)):
    """Create a new theme (admin only)"""
    theme = Theme(
        name=theme_data.name,
        slug=theme_data.name.lower().replace(" ", "-"),
        description=theme_data.description
    )
    theme_doc = theme.model_dump()
    await db.themes.insert_one(theme_doc)
    return theme

@api_router.delete("/themes/{theme_slug}")
async def delete_theme(theme_slug: str, admin: dict = Depends(get_current_admin)):
    """Delete a theme (admin only)"""
    result = await db.themes.delete_one({"slug": theme_slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Theme not found")
    return {"message": "Theme deleted"}

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/admin/change-password")
async def change_password(data: PasswordChange, admin: dict = Depends(get_current_admin)):
    """Change admin password"""
    if not verify_password(data.current_password, admin["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(data.new_password)
    await db.admins.update_one(
        {"username": admin["username"]},
        {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Password changed successfully"}

# Photo Routes
@api_router.get("/photos", response_model=List[PhotoResponse])
async def get_photos(theme: Optional[str] = None):
    """Get all photos, optionally filtered by theme"""
    query = {}
    if theme and theme != "all":
        query["theme"] = theme
    
    photos = await db.photos.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return photos

@api_router.get("/photos/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: str):
    """Get a single photo"""
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo

@api_router.post("/photos", response_model=PhotoResponse)
async def upload_photo(
    request: Request,
    title: str = Form(...),
    theme: str = Form(...),
    description: Optional[str] = Form(None),
    image: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    """Upload a new photo (admin only)"""
    # Generate unique filename
    file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    # Create photo record
    backend_url = os.environ.get('BACKEND_URL', '')
    image_url = f"/api/uploads/{filename}"
    
    photo = Photo(
        title=title,
        description=description,
        image_url=image_url,
        theme=theme
    )
    
    photo_doc = photo.model_dump()
    await db.photos.insert_one(photo_doc)
    
    return PhotoResponse(**photo_doc)

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a photo (admin only)"""
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete file if it exists
    if photo["image_url"].startswith("/api/uploads/"):
        filename = photo["image_url"].split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
    
    await db.photos.delete_one({"id": photo_id})
    return {"message": "Photo deleted"}

@api_router.post("/photos/{photo_id}/like", response_model=LikeResponse)
async def like_photo(photo_id: str, request: Request):
    """Like a photo (IP-based to prevent spam)"""
    client_ip = get_client_ip(request)
    
    # Check if already liked
    existing_like = await db.likes.find_one({"photo_id": photo_id, "ip": client_ip})
    
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    if existing_like:
        return LikeResponse(photo_id=photo_id, likes=photo["likes"], already_liked=True)
    
    # Add like
    await db.likes.insert_one({
        "id": str(uuid.uuid4()),
        "photo_id": photo_id,
        "ip": client_ip,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update photo likes count
    new_likes = photo["likes"] + 1
    await db.photos.update_one({"id": photo_id}, {"$set": {"likes": new_likes}})
    
    return LikeResponse(photo_id=photo_id, likes=new_likes, already_liked=False)

@api_router.get("/photos/{photo_id}/liked")
async def check_liked(photo_id: str, request: Request):
    """Check if current IP has liked a photo"""
    client_ip = get_client_ip(request)
    existing_like = await db.likes.find_one({"photo_id": photo_id, "ip": client_ip})
    return {"liked": existing_like is not None}

# Include the router in the main app
app.include_router(api_router)

# Mount uploads directory
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
