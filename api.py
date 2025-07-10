from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import time
from databases import Database
from crypto_utils import decrypt_data

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

class EncryptedDataIn(BaseModel):
    uuid: str
    seq_no: int
    patient_id: str
    encrypted_data: str
    late: bool = False


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
        return {"message": "Inserted"}
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

# Write encrypted data


@app.post("/write_encrypted")
async def write_encrypted(data: EncryptedDataIn):
    query = """
        INSERT INTO encrypted_vitals (uuid, seq_no, patient_id, encrypted_data, time, late)
        VALUES (:uuid, :seq_no, :patient_id, :encrypted_data, NOW(), :late)
        RETURNING time
    """
    values = {
        "uuid": data.uuid,
        "seq_no": data.seq_no,
        "patient_id": data.patient_id,
        "encrypted_data": data.encrypted_data,
        "late": data.late
    }

    try:
        result = await database.fetch_one(query=query, values=values)
        return {
            "message": "Encrypted data inserted",
            "uuid": data.uuid,
            "seq_no": data.seq_no,
            "time": result["time"] if result else None
        }
    except Exception as e:
        if "duplicate key" in str(e).lower():
            return {"message": "Duplicate packet", "uuid": data.uuid}
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/read_encrypted")
async def read_encrypted(limit: int = 10):
    query = """
        SELECT uuid, seq_no, patient_id, encrypted_data, time
        FROM encrypted_vitals
        ORDER BY time DESC
        LIMIT :limit
    """
    values = {"limit": limit}
    try:
        result = await database.fetch_all(query=query, values=values)
        return result
    except Exception as e:
        import traceback
        print("/read_encrypted error:", traceback.format_exc())
        return {"error": str(e), "trace": traceback.format_exc()}

class EncryptedDataOnly(BaseModel):
    encrypted_data: str

@app.post("/decrypt")
async def decrypt_endpoint(data: EncryptedDataOnly):
    try:
        decrypted = decrypt_data(data.encrypted_data)
        return {"decrypted_data": decrypted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")
    
@app.post("/write_fallback")
async def write_fallback(data: EncryptedDataIn):
    query = """
        INSERT INTO encrypted_vitals (uuid, seq_no, patient_id, encrypted_data, time, late)
        VALUES (:uuid, :seq_no, :patient_id, :encrypted_data, NOW(), :late)
        ON CONFLICT (uuid) DO NOTHING
    """
    try:
        await database.execute(query=query, values=data.dict())
        return {"message": "Fallback write accepted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/fetch_by_seq_range")
async def fetch_by_seq_range(patient_id: str, start: int, end: int):
    query = """
        SELECT * FROM encrypted_vitals
        WHERE patient_id = :pid AND seq_no BETWEEN :start AND :end
        ORDER BY seq_no
    """
    return await database.fetch_all(query=query, values={"pid": patient_id, "start": start, "end": end})

@app.get("/get_last_seq_nos")
async def get_last_seq_nos():
    query = """
        SELECT patient_id, MAX(seq_no) AS last_seq
        FROM encrypted_vitals
        GROUP BY patient_id
    """
    try:
        rows = await database.fetch_all(query)
        result = {row["patient_id"]: row["last_seq"] or 0 for row in rows}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))