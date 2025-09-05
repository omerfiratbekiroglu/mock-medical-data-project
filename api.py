from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import time
from databases import Database
from crypto_utils import decrypt_data
import asyncpg
from fastapi import status
from fastapi import Request

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




@app.get("/read")
async def read_vitals(patient_id: Optional[str] = None, user_id: Optional[int] = None, role: Optional[str] = None, limit: int = 10):
    if role == "doctor":
        # Doktor herkesi görebilir
        query = """
            SELECT * FROM vitals
            ORDER BY time DESC
            LIMIT :limit
        """
        values = {"limit": limit}
    elif role == "patient" and user_id:
        # Hasta sadece kendisini görür
        query = """
            SELECT * FROM vitals
            WHERE patient_id = :patient_id
            ORDER BY time DESC
            LIMIT :limit
        """
        values = {"patient_id": str(user_id), "limit": limit}
    else:
        raise HTTPException(status_code=403, detail="Unauthorized or missing parameters")

    try:
        result = await database.fetch_all(query=query, values=values)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




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

class LoginInput(BaseModel):
    email: str
    password: str

# Caregiver Notes Models
class CaregiverNoteCreate(BaseModel):
    patient_id: int
    title: str
    content: str
    care_level: int = Field(ge=1, le=5)

class CaregiverNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None  
    care_level: Optional[int] = Field(None, ge=1, le=5)

class CaregiverNoteResponse(BaseModel):
    id: int
    patient_id: int
    caregiver_id: int
    caregiver_name: str
    patient_name: str
    title: str
    content: str
    care_level: int
    created_at: datetime
    updated_at: datetime

@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    role = data.get("role", "patient")  # Varsayılan olarak 'patient' verilir

    if not email or not password or not first_name or not last_name:
        raise HTTPException(status_code=400, detail="All fields are required")

    # E-posta zaten kayıtlı mı kontrol et
    check_query = "SELECT id FROM users WHERE email = :email"
    existing = await database.fetch_one(query=check_query, values={"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Yeni kullanıcıyı kaydet
    insert_query = """
        INSERT INTO users (email, password, role, first_name, last_name)
        VALUES (:email, :password, :role, :first_name, :last_name)
    """
    await database.execute(query=insert_query, values={
        "email": email,
        "password": password,
        "role": role,
        "first_name": first_name,
        "last_name": last_name
    })

    return {"success": True, "message": "User registered successfully"}





@app.post("/login")
async def login_user(data: LoginInput):
    email = data.email
    password = data.password

    query = "SELECT id, email, password, role, first_name, last_name FROM users WHERE email = :email"
    user = await database.fetch_one(query=query, values={"email": email})

    if user and user["password"] == password:
        return {
            "success": True,
            "message": "Login successful",
            "email": user["email"],
            "user_id": user["id"],
            "role": user["role"],
            "first_name": user["first_name"],
            "last_name": user["last_name"]
        }
    else:
        return {
            "success": False,
            "message": "Invalid credentials"
        }




@app.get("/get_patients")
async def get_patients(user_id: int = None, role: str = None):
    if role == "caregiver" and user_id:
        # Caregiver'a atanmış hasta id'lerini al
        caregiver = await database.fetch_one(
            "SELECT assigned_patients FROM users WHERE id = :id", {"id": user_id}
        )
        if not caregiver or not caregiver["assigned_patients"]:
            return []

        try:
            ids = [int(i.strip()) for i in caregiver["assigned_patients"].split(",")]
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid assigned_patients format")

        query = """
            SELECT id, email, first_name, last_name
            FROM users
            WHERE id = ANY(:ids)
        """
        return await database.fetch_all(query, {"ids": ids})
    
    else:
        query ="SELECT id, first_name, last_name FROM users WHERE role = 'patient'"

        return await database.fetch_all(query)

# Authorization Helper Functions
async def check_caregiver_patient_access(caregiver_id: int, patient_id: int):
    """Check if caregiver has access to this patient"""
    query = """
        SELECT assigned_patients FROM users 
        WHERE id = :caregiver_id AND role = 'caregiver'
    """
    caregiver = await database.fetch_one(query, {"caregiver_id": caregiver_id})
    
    if not caregiver or not caregiver["assigned_patients"]:
        return False
    
    try:
        assigned_ids = [int(i.strip()) for i in caregiver["assigned_patients"].split(",")]
        return patient_id in assigned_ids
    except:
        return False

async def check_note_ownership(caregiver_id: int, note_id: int):
    """Check if note belongs to this caregiver"""
    query = "SELECT caregiver_id FROM caregiver_notes WHERE id = :note_id"
    note = await database.fetch_one(query, {"note_id": note_id})
    return note and note["caregiver_id"] == caregiver_id

async def check_doctor_role(user_id: int):
    """Check if user is a doctor"""
    query = "SELECT role FROM users WHERE id = :user_id"
    user = await database.fetch_one(query, {"user_id": user_id})
    return user and user["role"] == "doctor"

# Caregiver Notes CRUD Endpoints
@app.post("/caregiver_notes")
async def create_caregiver_note(note: CaregiverNoteCreate, caregiver_id: int, role: str):
    # Check if user is caregiver
    if role != "caregiver":
        raise HTTPException(status_code=403, detail="Only caregivers can create notes")
    
    # Check if caregiver has access to this patient
    if not await check_caregiver_patient_access(caregiver_id, note.patient_id):
        raise HTTPException(status_code=403, detail="Access denied to this patient")
    
    query = """
        INSERT INTO caregiver_notes (patient_id, caregiver_id, title, content, care_level)
        VALUES (:patient_id, :caregiver_id, :title, :content, :care_level)
        RETURNING id, created_at, updated_at
    """
    try:
        result = await database.fetch_one(query, {
            "patient_id": note.patient_id,
            "caregiver_id": caregiver_id,
            "title": note.title,
            "content": note.content,
            "care_level": note.care_level
        })
        return {
            "message": "Note created successfully",
            "note_id": result["id"],
            "created_at": result["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/caregiver_notes")
async def get_caregiver_notes(caregiver_id: int, role: str, patient_id: Optional[int] = None):
    # Check if user is caregiver
    if role != "caregiver":
        raise HTTPException(status_code=403, detail="Only caregivers can access their notes")
    
    base_query = """
        SELECT 
            cn.id, cn.patient_id, cn.caregiver_id, cn.title, cn.content, 
            cn.care_level, cn.created_at, cn.updated_at,
            CONCAT(cu.first_name, ' ', cu.last_name) as caregiver_name,
            CONCAT(pu.first_name, ' ', pu.last_name) as patient_name
        FROM caregiver_notes cn
        JOIN users cu ON cn.caregiver_id = cu.id
        JOIN users pu ON cn.patient_id = pu.id
        WHERE cn.caregiver_id = :caregiver_id
    """
    
    values = {"caregiver_id": caregiver_id}
    
    if patient_id:
        # Check access to specific patient
        if not await check_caregiver_patient_access(caregiver_id, patient_id):
            raise HTTPException(status_code=403, detail="Access denied to this patient")
        base_query += " AND cn.patient_id = :patient_id"
        values["patient_id"] = patient_id
    
    base_query += " ORDER BY cn.created_at DESC"
    
    try:
        result = await database.fetch_all(base_query, values)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/caregiver_notes/{note_id}")
async def update_caregiver_note(note_id: int, note_update: CaregiverNoteUpdate, caregiver_id: int, role: str):
    # Check if user is caregiver
    if role != "caregiver":
        raise HTTPException(status_code=403, detail="Only caregivers can update notes")
    
    # Check note ownership
    if not await check_note_ownership(caregiver_id, note_id):
        raise HTTPException(status_code=403, detail="You can only update your own notes")
    
    # Build dynamic update query
    updates = []
    values = {"note_id": note_id}
    
    if note_update.title is not None:
        updates.append("title = :title")
        values["title"] = note_update.title
    if note_update.content is not None:
        updates.append("content = :content") 
        values["content"] = note_update.content
    if note_update.care_level is not None:
        updates.append("care_level = :care_level")
        values["care_level"] = note_update.care_level
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"UPDATE caregiver_notes SET {', '.join(updates)} WHERE id = :note_id RETURNING updated_at"
    
    try:
        result = await database.fetch_one(query, values)
        return {"message": "Note updated successfully", "updated_at": result["updated_at"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/caregiver_notes/{note_id}")
async def delete_caregiver_note(note_id: int, caregiver_id: int, role: str):
    # Check if user is caregiver
    if role != "caregiver":
        raise HTTPException(status_code=403, detail="Only caregivers can delete notes")
    
    # Check note ownership
    if not await check_note_ownership(caregiver_id, note_id):
        raise HTTPException(status_code=403, detail="You can only delete your own notes")
    
    query = "DELETE FROM caregiver_notes WHERE id = :note_id"
    
    try:
        await database.execute(query, {"note_id": note_id})
        return {"message": "Note deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Doctor Read-Only Endpoints
@app.get("/caregiver_notes/by_patient/{patient_id}")
async def get_notes_by_patient(patient_id: int, user_id: int, role: str):
    # Check if user is doctor
    if not await check_doctor_role(user_id):
        raise HTTPException(status_code=403, detail="Only doctors can view patient notes")
    
    query = """
        SELECT 
            cn.id, cn.patient_id, cn.caregiver_id, cn.title, cn.content, 
            cn.care_level, cn.created_at, cn.updated_at,
            CONCAT(cu.first_name, ' ', cu.last_name) as caregiver_name,
            CONCAT(pu.first_name, ' ', pu.last_name) as patient_name
        FROM caregiver_notes cn
        JOIN users cu ON cn.caregiver_id = cu.id
        JOIN users pu ON cn.patient_id = pu.id
        WHERE cn.patient_id = :patient_id
        ORDER BY cn.created_at DESC
    """
    
    try:
        result = await database.fetch_all(query, {"patient_id": patient_id})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/caregiver_notes/by_care_level")
async def get_notes_by_care_level(
    user_id: int, 
    role: str, 
    care_level: Optional[int] = None,
    patient_id: Optional[int] = None,
    limit: int = 50
):
    # Check if user is doctor
    if not await check_doctor_role(user_id):
        raise HTTPException(status_code=403, detail="Only doctors can filter notes")
    
    base_query = """
        SELECT 
            cn.id, cn.patient_id, cn.caregiver_id, cn.title, cn.content, 
            cn.care_level, cn.created_at, cn.updated_at,
            CONCAT(cu.first_name, ' ', cu.last_name) as caregiver_name,
            CONCAT(pu.first_name, ' ', pu.last_name) as patient_name
        FROM caregiver_notes cn
        JOIN users cu ON cn.caregiver_id = cu.id
        JOIN users pu ON cn.patient_id = pu.id
        WHERE 1=1
    """
    
    values = {"limit": limit}
    
    if care_level is not None:
        if care_level < 1 or care_level > 5:
            raise HTTPException(status_code=400, detail="Care level must be between 1 and 5")
        base_query += " AND cn.care_level = :care_level"
        values["care_level"] = care_level
    
    if patient_id is not None:
        base_query += " AND cn.patient_id = :patient_id"
        values["patient_id"] = patient_id
    
    base_query += " ORDER BY cn.created_at DESC LIMIT :limit"
    
    try:
        result = await database.fetch_all(base_query, values)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/caregiver_notes/all")
async def get_all_notes(user_id: int, role: str, limit: int = 100):
    # Check if user is doctor
    if not await check_doctor_role(user_id):
        raise HTTPException(status_code=403, detail="Only doctors can view all notes")
    
    query = """
        SELECT 
            cn.id, cn.patient_id, cn.caregiver_id, cn.title, cn.content, 
            cn.care_level, cn.created_at, cn.updated_at,
            CONCAT(cu.first_name, ' ', cu.last_name) as caregiver_name,
            CONCAT(pu.first_name, ' ', pu.last_name) as patient_name
        FROM caregiver_notes cn
        JOIN users cu ON cn.caregiver_id = cu.id
        JOIN users pu ON cn.patient_id = pu.id
        ORDER BY cn.created_at DESC
        LIMIT :limit
    """
    
    try:
        result = await database.fetch_all(query, {"limit": limit})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/doctor/my_patients_notes")
async def get_doctor_patients_notes(user_id: int, role: str, limit: int = 100):
    """Doktorun sahip olduğu hastaların tüm caregiver notlarını listele"""
    # Check if user is doctor
    if not await check_doctor_role(user_id):
        raise HTTPException(status_code=403, detail="Only doctors can view patient notes")
    
    query = """
        SELECT 
            cn.id, cn.patient_id, cn.caregiver_id, cn.title, cn.content, 
            cn.care_level, cn.created_at, cn.updated_at,
            CONCAT(cu.first_name, ' ', cu.last_name) as caregiver_name,
            CONCAT(pu.first_name, ' ', pu.last_name) as patient_name,
            pu.email as patient_email
        FROM caregiver_notes cn
        JOIN users cu ON cn.caregiver_id = cu.id
        JOIN users pu ON cn.patient_id = pu.id
        WHERE pu.role = 'patient'
        ORDER BY cn.created_at DESC, pu.first_name ASC
        LIMIT :limit
    """
    
    try:
        result = await database.fetch_all(query, {"limit": limit})
        
        # Grupla hastalara göre organize et
        patients_notes = {}
        for note in result:
            patient_key = f"{note['patient_name']} (ID: {note['patient_id']})"
            if patient_key not in patients_notes:
                patients_notes[patient_key] = {
                    "patient_info": {
                        "patient_id": note["patient_id"],
                        "patient_name": note["patient_name"],
                        "patient_email": note["patient_email"]
                    },
                    "notes": []
                }
            
            patients_notes[patient_key]["notes"].append({
                "note_id": note["id"],
                "title": note["title"],
                "content": note["content"],
                "care_level": note["care_level"],
                "caregiver_name": note["caregiver_name"],
                "caregiver_id": note["caregiver_id"],
                "created_at": note["created_at"],
                "updated_at": note["updated_at"]
            })
        
        return {
            "total_patients": len(patients_notes),
            "total_notes": len(result),
            "patients_with_notes": patients_notes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Critical Alert Models
class CriticalAlertInput(BaseModel):
    patient_id: int
    heart_rate: int
    threshold_value: int
    message: str

@app.post("/critical_alert")
async def send_critical_alert(alert_data: CriticalAlertInput):
    """Critical heart rate alert'ini hasta bakıcılara gönder"""
    try:
        # Hastaya atanmış caregiver'ları bul
        caregiver_query = """
            SELECT id FROM users 
            WHERE role = 'caregiver' 
            AND (assigned_patients IS NULL OR assigned_patients LIKE :patient_search)
        """
        patient_search = f"%{alert_data.patient_id}%"
        caregivers = await database.fetch_all(caregiver_query, {"patient_search": patient_search})
        
        if not caregivers:
            raise HTTPException(status_code=404, detail="No caregivers found for this patient")
        
        # Her caregiver'a alert gönder
        for caregiver in caregivers:
            alert_query = """
                INSERT INTO critical_alerts 
                (patient_id, caregiver_id, alert_type, heart_rate, threshold_value, message, is_read, created_at)
                VALUES (:patient_id, :caregiver_id, 'critical_heart_rate', :heart_rate, :threshold_value, :message, false, NOW())
            """
            await database.execute(alert_query, {
                "patient_id": alert_data.patient_id,
                "caregiver_id": caregiver["id"],
                "heart_rate": alert_data.heart_rate,
                "threshold_value": alert_data.threshold_value,
                "message": alert_data.message
            })
        
        return {
            "success": True,
            "message": f"Critical alert sent to {len(caregivers)} caregiver(s)",
            "caregivers_notified": len(caregivers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/critical_alerts")
async def get_critical_alerts(caregiver_id: int, role: str, unread_only: bool = False):
    """Caregiver'ın critical alert'lerini getir"""
    if role != 'caregiver':
        raise HTTPException(status_code=403, detail="Only caregivers can view alerts")
    
    try:
        where_clause = "WHERE ca.caregiver_id = :caregiver_id"
        if unread_only:
            where_clause += " AND ca.is_read = false"
            
        query = f"""
            SELECT 
                ca.id, ca.patient_id, ca.alert_type, ca.heart_rate, ca.threshold_value,
                ca.message, ca.is_read, ca.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                u.email as patient_email
            FROM critical_alerts ca
            JOIN users u ON ca.patient_id = u.id
            {where_clause}
            ORDER BY ca.created_at DESC
            LIMIT 50
        """
        
        alerts = await database.fetch_all(query, {"caregiver_id": caregiver_id})
        
        return {
            "success": True,
            "alerts": [dict(alert) for alert in alerts],
            "total_alerts": len(alerts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/critical_alerts/{alert_id}/mark_read")
async def mark_alert_as_read(alert_id: int, caregiver_id: int, role: str):
    """Critical alert'i okundu olarak işaretle"""
    if role != 'caregiver':
        raise HTTPException(status_code=403, detail="Only caregivers can mark alerts as read")
    
    try:
        # Önce alert'in bu caregiver'a ait olduğunu kontrol et
        check_query = "SELECT id FROM critical_alerts WHERE id = :alert_id AND caregiver_id = :caregiver_id"
        alert = await database.fetch_one(check_query, {"alert_id": alert_id, "caregiver_id": caregiver_id})
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found or unauthorized")
        
        # Alert'i okundu olarak işaretle
        update_query = """
            UPDATE critical_alerts 
            SET is_read = true 
            WHERE id = :alert_id AND caregiver_id = :caregiver_id
        """
        await database.execute(update_query, {"alert_id": alert_id, "caregiver_id": caregiver_id})
        
        return {"success": True, "message": "Alert marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Doctor Feedback Models
class DoctorFeedbackInput(BaseModel):
    note_id: int
    content: str

# Chat Models
class ChatMessage(BaseModel):
    note_id: int
    content: str

class ChatResponse(BaseModel):
    id: int
    note_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    created_at: datetime
    is_read: bool

@app.post("/doctor_feedback")
async def add_doctor_feedback(feedback_data: DoctorFeedbackInput, user_id: int, role: str):
    """Doktor caregiver notuna dönüt ekler"""
    if role != 'doctor':
        raise HTTPException(status_code=403, detail="Only doctors can add feedback")
    
    try:
        # Note'un varlığını ve hangi hastaya ait olduğunu kontrol et
        note_query = """
            SELECT patient_id, caregiver_id FROM caregiver_notes 
            WHERE id = :note_id
        """
        note = await database.fetch_one(note_query, {"note_id": feedback_data.note_id})
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Feedback'i ekle
        insert_query = """
            INSERT INTO doctor_feedback (note_id, doctor_id, patient_id, caregiver_id, content, created_at)
            VALUES (:note_id, :doctor_id, :patient_id, :caregiver_id, :content, NOW())
            RETURNING id, created_at
        """
        result = await database.fetch_one(insert_query, {
            "note_id": feedback_data.note_id,
            "doctor_id": user_id,
            "patient_id": note["patient_id"],
            "caregiver_id": note["caregiver_id"],
            "content": feedback_data.content
        })
        
        return {
            "success": True,
            "message": "Feedback added successfully",
            "feedback_id": result["id"],
            "created_at": result["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/doctor_feedback/{note_id}")
async def get_feedback_for_note(note_id: int, user_id: int, role: str):
    """Belirli bir note için doktor dönütlerini getir"""
    if role not in ['doctor', 'caregiver']:
        raise HTTPException(status_code=403, detail="Only doctors and caregivers can view feedback")
    
    try:
        query = """
            SELECT 
                df.id, df.content, df.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as doctor_name
            FROM doctor_feedback df
            JOIN users u ON df.doctor_id = u.id
            WHERE df.note_id = :note_id
            ORDER BY df.created_at ASC
        """
        
        feedback_list = await database.fetch_all(query, {"note_id": note_id})
        
        return {
            "success": True,
            "feedback": [dict(fb) for fb in feedback_list]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/caregiver_feedback")
async def get_caregiver_feedback(caregiver_id: int, role: str, limit: int = 50):
    """Bakıcının aldığı tüm doktor dönütlerini ve kendi notlarını getir"""
    if role != 'caregiver':
        raise HTTPException(status_code=403, detail="Only caregivers can view their feedback")
    
    try:
        # Doktor geri bildirimlerini getir (orijinal not içeriğiyle birlikte)
        feedback_query = """
            SELECT 
                df.id as feedback_id,
                df.content as feedback_content,
                df.created_at as feedback_created_at,
                cn.id as note_id,
                cn.title as note_title,
                cn.content as note_content,
                cn.care_level,
                cn.created_at as note_created_at,
                CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name,
                CONCAT(patient.first_name, ' ', patient.last_name) as patient_name,
                'doctor_feedback' as item_type
            FROM doctor_feedback df
            JOIN caregiver_notes cn ON df.note_id = cn.id
            JOIN users doctor ON df.doctor_id = doctor.id
            JOIN users patient ON df.patient_id = patient.id
            WHERE df.caregiver_id = :caregiver_id
        """
        
        # Bakıcının kendi notlarını getir
        notes_query = """
            SELECT 
                NULL as feedback_id,
                NULL as feedback_content,
                NULL as feedback_created_at,
                cn.id as note_id,
                cn.title as note_title,
                cn.content as note_content,
                cn.care_level,
                cn.created_at as note_created_at,
                NULL as doctor_name,
                CONCAT(patient.first_name, ' ', patient.last_name) as patient_name,
                'caregiver_note' as item_type
            FROM caregiver_notes cn
            JOIN users patient ON cn.patient_id = patient.id
            WHERE cn.caregiver_id = :caregiver_id
        """
        
        # Birleştir ve tarihe göre sırala
        combined_query = f"""
            ({feedback_query})
            UNION ALL
            ({notes_query})
            ORDER BY note_created_at DESC
            LIMIT :limit
        """
        
        feedback_list = await database.fetch_all(combined_query, {
            "caregiver_id": caregiver_id,
            "limit": limit
        })
        
        return {
            "success": True,
            "feedback": [dict(fb) for fb in feedback_list],
            "total": len(feedback_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Chat Endpoints
@app.post("/chat/send")
async def send_chat_message(message: ChatMessage, user_id: int, role: str):
    """Note için chat mesajı gönder"""
    if role not in ['doctor', 'caregiver']:
        raise HTTPException(status_code=403, detail="Only doctors and caregivers can send messages")
    
    try:
        # Note'un varlığını kontrol et ve caregiver bilgisini al
        note_query = """
            SELECT patient_id, caregiver_id FROM caregiver_notes 
            WHERE id = :note_id
        """
        note = await database.fetch_one(note_query, {"note_id": message.note_id})
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Yetki kontrolü - doktor veya notun sahibi caregiver olmalı
        if role == 'caregiver' and note["caregiver_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only chat on your own notes")
        
        # Mesajı kaydet
        insert_query = """
            INSERT INTO chat_messages (note_id, sender_id, sender_role, content, created_at)
            VALUES (:note_id, :sender_id, :sender_role, :content, NOW())
            RETURNING id, created_at
        """
        result = await database.fetch_one(insert_query, {
            "note_id": message.note_id,
            "sender_id": user_id,
            "sender_role": role,
            "content": message.content
        })
        
        return {
            "success": True,
            "message_id": result["id"],
            "created_at": result["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/{note_id}")
async def get_chat_messages(note_id: int, user_id: int, role: str):
    """Note için chat mesajlarını getir"""
    if role not in ['doctor', 'caregiver']:
        raise HTTPException(status_code=403, detail="Only doctors and caregivers can view messages")
    
    try:
        # Note'un varlığını ve yetki kontrolünü yap
        note_query = """
            SELECT patient_id, caregiver_id FROM caregiver_notes 
            WHERE id = :note_id
        """
        note = await database.fetch_one(note_query, {"note_id": note_id})
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Yetki kontrolü
        if role == 'caregiver' and note["caregiver_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only view chat on your own notes")
        
        # Chat mesajlarını getir
        messages_query = """
            SELECT 
                cm.id, cm.note_id, cm.sender_id, cm.sender_role, cm.content, 
                cm.created_at, cm.is_read,
                CONCAT(u.first_name, ' ', u.last_name) as sender_name
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.note_id = :note_id
            ORDER BY cm.created_at ASC
        """
        
        messages = await database.fetch_all(messages_query, {"note_id": note_id})
        
        # Okunmamış mesajları okundu olarak işaretle
        mark_read_query = """
            UPDATE chat_messages 
            SET is_read = true 
            WHERE note_id = :note_id AND sender_id != :user_id AND is_read = false
        """
        await database.execute(mark_read_query, {"note_id": note_id, "user_id": user_id})
        
        return {
            "success": True,
            "messages": [dict(msg) for msg in messages]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/unread_count")
async def get_unread_message_count(user_id: int, role: str):
    """Kullanıcının okunmamış mesaj sayısını getir"""
    if role not in ['doctor', 'caregiver']:
        raise HTTPException(status_code=403, detail="Only doctors and caregivers can check messages")
    
    try:
        if role == 'caregiver':
            # Caregiver sadece kendi notlarındaki okunmamış mesajları sayar
            query = """
                SELECT COUNT(*) as unread_count
                FROM chat_messages cm
                JOIN caregiver_notes cn ON cm.note_id = cn.id
                WHERE cn.caregiver_id = :user_id 
                AND cm.sender_id != :user_id 
                AND cm.is_read = false
            """
        else:  # doctor
            # Doktor tüm notlardaki okunmamış mesajları sayar
            query = """
                SELECT COUNT(*) as unread_count
                FROM chat_messages cm
                WHERE cm.sender_id != :user_id 
                AND cm.is_read = false
                AND cm.sender_role = 'caregiver'
            """
        
        result = await database.fetch_one(query, {"user_id": user_id})
        
        return {
            "success": True,
            "unread_count": result["unread_count"] or 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
