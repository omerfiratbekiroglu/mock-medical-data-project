from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
from typing import Optional, List
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import asyncio
import json
from datetime import datetime
import time
from databases import Database

# Load .env
load_dotenv()

# FastAPI app
app = FastAPI()

# Enable CORS for frontend.html
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Async DB connection
DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
database = Database(DATABASE_URL)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# Data model
class VitalsIn(BaseModel):
    patient_id: str
    heart_rate: int
    oxygen_level: int
    temp: float

# WebSocket clients
connected_clients: List[WebSocket] = []

# Broadcast function
async def broadcast_vitals(vitals: VitalsIn):
    now = datetime.utcnow().isoformat()
    payload = {
        "patient_id": vitals.patient_id,
        "heart_rate": vitals.heart_rate,
        "oxygen_level": vitals.oxygen_level,
        "temp": vitals.temp,
        "time": now
    }
    message = json.dumps(payload)
    disconnected = []
    for ws in connected_clients:
        try:
            await ws.send_text(message)
        except:
            disconnected.append(ws)
    for ws in disconnected:
        connected_clients.remove(ws)

# Write vitals + broadcast
@app.post("/write")
async def write_vitals(vitals: VitalsIn):
    start = time.time()
    query = """
        INSERT INTO vitals (patient_id, time, heart_rate, oxygen_level, temp)
        VALUES (:patient_id, NOW(), :heart_rate, :oxygen_level, :temp)
    """
    values = {
        "patient_id": vitals.patient_id,
        "heart_rate": vitals.heart_rate,
        "oxygen_level": vitals.oxygen_level,
        "temp": vitals.temp
    }
    try:
        await database.execute(query=query, values=values)
        elapsed = time.time() - start
        print(f"DB insert took {elapsed:.3f} seconds")
        asyncio.create_task(broadcast_vitals(vitals))
        return {"message": "Inserted and broadcasted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Read vitals
@app.get("/read")
async def read_vitals(limit: int = 10, patient_id: Optional[str] = None):
    query = """
        SELECT * FROM vitals
        WHERE (:patient_id IS NULL OR patient_id = :patient_id)
        ORDER BY time DESC
        LIMIT :limit
    """
    values = {
        "patient_id": patient_id,
        "limit": limit
    }
    try:
        result = await database.fetch_all(query=query, values=values)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await asyncio.sleep(10)
    except:
        pass
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
