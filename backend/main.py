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
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
SECRET_KEY = os.getenv('SECRET_KEY') or secrets.token_urlsafe(32)
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
    content: Any

class BlogCreate(BaseModel):
    title: str
    cells: List[Cell]
    folder_id: Optional[int] = None

class BlogResponse(BaseModel):
    id: int
    title: str
    cells: List[dict]
    author: str
    folder_id: Optional[int]
    created_at: str
    updated_at: str

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: str

class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    author: str
    created_at: str

class BlogMoveRequest(BaseModel):
    folder_id: Optional[int] = None

# Database initialization
def get_conn():
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
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

def init_db():
    conn = safe_get_conn()
    cursor = conn.cursor()

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
        CREATE TABLE IF NOT EXISTS folders (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
            author TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blogs (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            cells JSONB NOT NULL,
            author TEXT NOT NULL,
            folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Agar blogs jadvali mavjud bo'lsa, folder_id ustunini qo'shish
    try:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='blogs' AND column_name='folder_id'")
        folder_id_exists = cursor.fetchone()
        
        if not folder_id_exists:
            print("Adding folder_id column to blogs table...")
            cursor.execute('ALTER TABLE blogs ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL')
    except Exception as e:
        print(f"Error checking/adding folder_id column: {e}")

    conn.commit()
    conn.close()

try:
    init_db()
    print("Database initialization completed successfully!")
except Exception as e:
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
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"Token invalid: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    return payload["username"]

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Blog Platform API", "docs": "/docs"}

# Auth endpoints
@app.post("/api/register")
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

@app.post("/api/login")
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

# Folder endpoints
@app.post("/api/folders", response_model=FolderResponse)
async def create_folder(folder: FolderCreate, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO folders (name, parent_id, author) VALUES (%s, %s, %s) RETURNING *",
            (folder.name, folder.parent_id, current_user)
        )
        result = cursor.fetchone()
        conn.commit()

        created = result.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()

        return {
            "id": result["id"],
            "name": result["name"],
            "parent_id": result["parent_id"],
            "author": result["author"],
            "created_at": created
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.put("/api/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(folder_id: int, folder: FolderUpdate, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    # Faqat papka egasi yangilasa olishi uchun tekshirish
    cursor.execute("SELECT author FROM folders WHERE id = %s", (folder_id,))
    result = cursor.fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if result["author"] != current_user:
        raise HTTPException(status_code=403, detail="You can only update your own folders")
    
    try:
        cursor.execute(
            "UPDATE folders SET name = %s WHERE id = %s RETURNING *",
            (folder.name, folder_id)
        )
        result = cursor.fetchone()
        conn.commit()

        created = result.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()

        return {
            "id": result["id"],
            "name": result["name"],
            "parent_id": result["parent_id"],
            "author": result["author"],
            "created_at": created
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/folders", response_model=List[FolderResponse])
async def get_folders(current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM folders WHERE author = %s ORDER BY created_at DESC",
        (current_user,)
    )
    results = cursor.fetchall()
    conn.close()
    
    folders = []
    for result in results:
        created = result.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()

        folders.append({
            "id": result["id"],
            "name": result["name"],
            "parent_id": result["parent_id"],
            "author": result["author"],
            "created_at": created
        })
    
    return folders

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: int, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    cursor.execute("SELECT author FROM folders WHERE id = %s", (folder_id,))
    result = cursor.fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if result["author"] != current_user:
        raise HTTPException(status_code=403, detail="You can only delete your own folders")
    
    try:
        # Papka va uning ichidagi barcha narsalar o'chadi (CASCADE tufayli)
        cursor.execute("DELETE FROM folders WHERE id = %s", (folder_id,))
        conn.commit()
        return {"message": "Folder and all its contents deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# Blog endpoints
@app.post("/api/blogs", response_model=BlogResponse)
async def create_blog(blog: BlogCreate, current_user: str = Depends(get_current_user)):
    print(f"Creating blog with folder_id: {blog.folder_id}")
    
    conn = safe_get_conn()
    cursor = conn.cursor()
    
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
            "INSERT INTO blogs (title, cells, author, folder_id) VALUES (%s, %s::jsonb, %s, %s) RETURNING *",
            (blog.title, cells_json, current_user, blog.folder_id)
        )
        result = cursor.fetchone()
        conn.commit()

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
            "folder_id": result["folder_id"],
            "created_at": created,
            "updated_at": updated
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/blogs", response_model=List[BlogResponse])
async def get_blogs(current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
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
            "folder_id": result["folder_id"],
            "created_at": created,
            "updated_at": updated
        })
    
    return blogs

@app.get("/api/blogs/{blog_id}", response_model=BlogResponse)
async def get_blog(blog_id: int):
    conn = safe_get_conn()
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
        "folder_id": result["folder_id"],
        "created_at": created,
        "updated_at": updated
    }

@app.put("/api/blogs/{blog_id}", response_model=BlogResponse)
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
    
    cells_data = []
    for cell in blog.cells:
        cell_data = {
            "id": cell.id,
            "type": cell.type,
            "content": cell.content
        }
        cells_data.append(cell_data)
    
    cells_json = json.dumps(cells_data)

    cursor.execute(
        "UPDATE blogs SET title = %s, cells = %s::jsonb, folder_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *",
        (blog.title, cells_json, blog.folder_id, blog_id)
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
        "folder_id": result["folder_id"],
        "created_at": created,
        "updated_at": updated
    }

@app.delete("/api/blogs/{blog_id}")
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

@app.get("/api/my-blogs", response_model=List[BlogResponse])
async def get_my_blogs(current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
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
            "folder_id": result["folder_id"],
            "created_at": created,
            "updated_at": updated
        })
    
    return blogs

@app.put("/api/blogs/{blog_id}/move")
async def move_blog(blog_id: int, move_request: BlogMoveRequest, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()
    
    cursor.execute("SELECT author FROM blogs WHERE id = %s", (blog_id,))
    result = cursor.fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    if result["author"] != current_user:
        raise HTTPException(status_code=403, detail="You can only move your own blogs")
    
    if move_request.folder_id:
        cursor.execute("SELECT id FROM folders WHERE id = %s AND author = %s", 
                      (move_request.folder_id, current_user))
        folder_exists = cursor.fetchone()
        if not folder_exists:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    cursor.execute(
        "UPDATE blogs SET folder_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (move_request.folder_id, blog_id)
    )
    conn.commit()
    conn.close()
    
    return {"message": "Blog moved successfully"}

@app.get("/api/root-blogs", response_model=List[BlogResponse])
async def get_root_blogs(current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM blogs WHERE (folder_id IS NULL) AND author = %s ORDER BY created_at DESC",
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
            "folder_id": result["folder_id"],
            "created_at": created,
            "updated_at": updated
        })
    
    return blogs

@app.get("/api/folders/{folder_id}/blogs", response_model=List[BlogResponse])
async def get_folder_blogs(folder_id: int, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM blogs WHERE folder_id = %s AND author = %s ORDER BY created_at DESC",
        (folder_id, current_user)
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
            "folder_id": result["folder_id"],
            "created_at": created,
            "updated_at": updated
        })
    
    return blogs

# Nested folder structure uchun yangi endpointlar
@app.get("/api/folders/{folder_id}/contents")
async def get_folder_contents(folder_id: int, current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()

    # Folder ichidagi papkalar
    cursor.execute(
        "SELECT * FROM folders WHERE parent_id = %s AND author = %s ORDER BY created_at DESC",
        (folder_id, current_user)
    )
    subfolders = cursor.fetchall()

    # Folder ichidagi bloglar
    cursor.execute(
        "SELECT * FROM blogs WHERE folder_id = %s AND author = %s ORDER BY created_at DESC",
        (folder_id, current_user)
    )
    blogs = cursor.fetchall()

    conn.close()
    
    # Format folders
    formatted_folders = []
    for folder in subfolders:
        created = folder.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()

        formatted_folders.append({
            "id": folder["id"],
            "name": folder["name"],
            "parent_id": folder["parent_id"],
            "author": folder["author"],
            "created_at": created,
            "type": "folder"
        })

    # Format blogs
    formatted_blogs = []
    for blog in blogs:
        created = blog.get("created_at")
        updated = blog.get("updated_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        if isinstance(updated, datetime):
            updated = updated.isoformat()

        formatted_blogs.append({
            "id": blog["id"],
            "title": blog["title"],
            "cells": blog["cells"],
            "author": blog["author"],
            "folder_id": blog["folder_id"],
            "created_at": created,
            "updated_at": updated,
            "type": "blog"
        })

    return {
        "folders": formatted_folders,
        "blogs": formatted_blogs
    }

# Root papka contents
@app.get("/api/root-contents")
async def get_root_contents(current_user: str = Depends(get_current_user)):
    conn = safe_get_conn()
    cursor = conn.cursor()

    # Root papkadagi papkalar (parent_id NULL)
    cursor.execute(
        "SELECT * FROM folders WHERE parent_id IS NULL AND author = %s ORDER BY created_at DESC",
        (current_user,)
    )
    folders = cursor.fetchall()

    # Root papkadagi bloglar (folder_id NULL)
    cursor.execute(
        "SELECT * FROM blogs WHERE folder_id IS NULL AND author = %s ORDER BY created_at DESC",
        (current_user,)
    )
    blogs = cursor.fetchall()

    conn.close()
    
    # Format folders
    formatted_folders = []
    for folder in folders:
        created = folder.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()

        formatted_folders.append({
            "id": folder["id"],
            "name": folder["name"],
            "parent_id": folder["parent_id"],
            "author": folder["author"],
            "created_at": created,
            "type": "folder"
        })

    # Format blogs
    formatted_blogs = []
    for blog in blogs:
        created = blog.get("created_at")
        updated = blog.get("updated_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        if isinstance(updated, datetime):
            updated = updated.isoformat()

        formatted_blogs.append({
            "id": blog["id"],
            "title": blog["title"],
            "cells": blog["cells"],
            "author": blog["author"],
            "folder_id": blog["folder_id"],
            "created_at": created,
            "updated_at": updated,
            "type": "blog"
        })

    return {
        "folders": formatted_folders,
        "blogs": formatted_blogs
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)