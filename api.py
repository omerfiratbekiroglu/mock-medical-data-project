from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import psycopg2.extras
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import asyncio
import json
from datetime import datetime

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

# DB Connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

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
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO vitals (patient_id, time, heart_rate, oxygen_level, temp)
            VALUES (%s, NOW(), %s, %s, %s)
        """, (vitals.patient_id, vitals.heart_rate, vitals.oxygen_level, vitals.temp))
        conn.commit()
        asyncio.create_task(broadcast_vitals(vitals))
        return {"message": "Inserted and broadcasted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Read vitals
@app.get("/read")
def read_vitals(limit: int = 10, patient_id: Optional[str] = None):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if patient_id:
            cur.execute("""
                SELECT * FROM vitals WHERE patient_id = %s
                ORDER BY time DESC LIMIT %s
            """, (patient_id, limit))
        else:
            cur.execute("""
                SELECT * FROM vitals ORDER BY time DESC LIMIT %s
            """, (limit,))
        return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

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
