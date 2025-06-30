from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import psycopg2.extras
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()  # Load from .env

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

# FastAPI app
app = FastAPI()

# Enable CORS for all origins (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data model
class VitalsIn(BaseModel):
    patient_id: str
    heart_rate: int
    oxygen_level: int
    temp: float

# Endpoint: Write new vitals
@app.post("/write")
def write_vitals(vitals: VitalsIn):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO vitals (patient_id, time, heart_rate, oxygen_level, temp)
            VALUES (%s, NOW(), %s, %s, %s)
        """, (vitals.patient_id, vitals.heart_rate, vitals.oxygen_level, vitals.temp))
        conn.commit()
        return {"message": "Vitals inserted successfully"}
    except Exception as e:
        print(f"Error inserting vitals: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Endpoint: Read latest vitals (optionally filter)
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
                SELECT * FROM vitals
                ORDER BY time DESC LIMIT %s
            """, (limit,))
        results = cur.fetchall()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
