from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Any
import jwt
from datetime import datetime, timedelta
import json
import secrets
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
load_dotenv() 


app = FastAPI(title="Blog Platform API")

# CORS sozlamalari
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database sozlamalari



security = HTTPBearer()
SECRET_KEY = secrets.token_urlsafe(32)
ALGORITHM = "HS256"

# Pydantic modellari
class UserRegister(BaseModel):
    username: str
    password: str
    email: str

class UserLogin(BaseModel):
    username: str
    password: str

class Cell(BaseModel):
    id: int
    type: str
    content: Any  # Har xil turdagi content uchun

class BlogCreate(BaseModel):
    title: str
    cells: List[Cell]

class BlogResponse(BaseModel):
    id: int
    title: str
    cells: List[dict]  # JSON dan qaytgan ma'lumotlar
    author: str
    created_at: str
    updated_at: str

# Database initialization
def get_conn():
    """Create a new psycopg2 connection using environment variables.
    Caller should close the connection when done.
    """
    # ensure environment variables are present
    pg_db = os.getenv("PG_DB")
    pg_user = os.getenv("PG_USERNAME")
    pg_pass = os.getenv("PG_PASSWORD")
    pg_host = os.getenv("PG_HOST")
    pg_port = os.getenv("PG_PORT")

    missing = [name for name, val in [
        ("PG_DB", pg_db), ("PG_USERNAME", pg_user), ("PG_PASSWORD", pg_pass), ("PG_HOST", pg_host), ("PG_PORT", pg_port)
    ] if not val]

    if missing:
        raise RuntimeError(f"Missing required Postgres env vars: {', '.join(missing)}")

    return psycopg2.connect(
        dbname=pg_db,
        user=pg_user,
        password=pg_pass,
        host=pg_host,
        port=pg_port,
        cursor_factory=RealDictCursor
    )


def safe_get_conn():
    try:
        return get_conn()
    except Exception as e:
        # Turn connection problems into HTTP errors for endpoints
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


def init_db():
    conn = safe_get_conn()
    cursor = conn.cursor()

    # Create tables - use PostgreSQL-specific DDL (SERIAL / JSONB)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blogs (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            cells JSONB NOT NULL,
            author TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

try:
    init_db()
except Exception as e:
    # Provide a clear startup message so the terminal shows what's wrong (missing creds or db not available)
    print("WARNING: init_db failed — backend may not work until DB is available and environment variables are set.")
    print(str(e))

# Helper functions
def create_token(username: str):
    payload = {
        "username": username,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        # Token dan "Bearer " qismini olib tashlash
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"Token invalid: {str(e)}")  # Debug
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    print(f"Received token: {credentials.credentials}")  # Debug
    payload = verify_token(credentials.credentials)
    print(f"Token payload: {payload}")  # Debug
    return payload["username"]

@app.put("/blogs/{blog_id}", response_model=BlogResponse)
async def update_blog(blog_id: int, blog: BlogCreate, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    # Faqat blog egasi yangilasa olishi uchun tekshirish
    cursor.execute("SELECT author FROM blogs WHERE id = %s", (blog_id,))
    result = cursor.fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    if result["author"] != current_user:
        raise HTTPException(status_code=403, detail="You can only update your own blogs")
    
    cells_json = json.dumps([cell.dict() for cell in blog.cells])

    cursor.execute(
        "UPDATE blogs SET title = %s, cells = %s::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *",
        (blog.title, cells_json, blog_id)
    )
    result = cursor.fetchone()
    conn.commit()
    conn.close()
    
    # Ensure timestamps are strings for JSON serialization
    created = result.get("created_at")
    updated = result.get("updated_at")
    if isinstance(created, datetime):
        created = created.isoformat()
    if isinstance(updated, datetime):
        updated = updated.isoformat()

    return {
        "id": result["id"],
        "title": result["title"],
        "cells": result["cells"],
        "author": result["author"],
        "created_at": created,
        "updated_at": updated
    }

@app.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: int, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    # Faqat blog egasi o'chira olishi uchun tekshirish
    cursor.execute("SELECT author FROM blogs WHERE id = %s", (blog_id,))
    result = cursor.fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    if result["author"] != current_user:
        raise HTTPException(status_code=403, detail="You can only delete your own blogs")
    
    cursor.execute("DELETE FROM blogs WHERE id = %s", (blog_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Blog deleted successfully"}

# Auth endpoints
@app.post("/register")
async def register(user: UserRegister):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)",
            (user.username, user.password, user.email)
        )
        conn.commit()
        token = create_token(user.username)
        return {"message": "User registered successfully", "token": token}
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    finally:
        conn.close()

@app.post("/login")
async def login(user: UserLogin):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT username, password FROM users WHERE username = %s",
        (user.username,)
    )
    result = cursor.fetchone()
    conn.close()
    
    if not result or result["password"] != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user.username)
    return {"message": "Login successful", "token": token}

# Blog endpoints
@app.post("/blogs", response_model=BlogResponse)
async def create_blog(blog: BlogCreate, current_user: str = Depends(get_current_user)):
    print(f"Received blog data: {blog.dict()}")  # Debug uchun
    
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    # Cell ma'lumotlarini JSON ga o'tkazish
    cells_data = []
    for cell in blog.cells:
        cell_data = {
            "id": cell.id,
            "type": cell.type,
            "content": cell.content
        }
        cells_data.append(cell_data)
    
    cells_json = json.dumps(cells_data)
    
    try:
        cursor.execute(
            "INSERT INTO blogs (title, cells, author) VALUES (%s, %s::jsonb, %s) RETURNING *",
            (blog.title, cells_json, current_user)
        )
        result = cursor.fetchone()
        conn.commit()

        return {
            "id": result["id"],
            "title": result["title"],
            "cells": result["cells"],
            "author": result["author"],
            "created_at": result["created_at"],
            "updated_at": result["updated_at"]
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/blogs", response_model=List[BlogResponse])
async def get_blogs():
    conn = safe_get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM blogs ORDER BY created_at DESC")
    results = cursor.fetchall()
    conn.close()
    
    blogs = []
    for result in results:
        created = result.get("created_at")
        updated = result.get("updated_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        if isinstance(updated, datetime):
            updated = updated.isoformat()

        blogs.append({
            "id": result["id"],
            "title": result["title"],
            "cells": result["cells"],
            "author": result["author"],
            "created_at": created,
            "updated_at": updated
        })
    
    return blogs

@app.get("/blogs/{blog_id}", response_model=BlogResponse)
async def get_blog(blog_id: int):
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM blogs WHERE id = %s", (blog_id,))
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        raise HTTPException(status_code=404, detail="Blog not found")
    created = result.get("created_at")
    updated = result.get("updated_at")
    if isinstance(created, datetime):
        created = created.isoformat()
    if isinstance(updated, datetime):
        updated = updated.isoformat()

    return {
        "id": result["id"],
        "title": result["title"],
        "cells": result["cells"],
        "author": result["author"],
        "created_at": created,
        "updated_at": updated
    }

@app.get("/my-blogs", response_model=List[BlogResponse])
async def get_my_blogs(current_user: str = Depends(get_current_user)):
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM blogs WHERE author = %s ORDER BY created_at DESC",
        (current_user,)
    )
    results = cursor.fetchall()
    conn.close()
    
    blogs = []
    for result in results:
        created = result.get("created_at")
        updated = result.get("updated_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        if isinstance(updated, datetime):
            updated = updated.isoformat()

        blogs.append({
            "id": result["id"],
            "title": result["title"],
            "cells": result["cells"],
            "author": result["author"],
            "created_at": created,
            "updated_at": updated
        })
    
    return blogs

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)