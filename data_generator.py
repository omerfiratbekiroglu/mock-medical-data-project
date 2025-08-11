import aiohttp
import asyncio
import random
import time
import json
import uuid
import os
import datetime
from crypto_utils import encrypt_data

API_URL = "http://localhost:8000/write_encrypted"
SEQ_INIT_URL = "http://localhost:8000/get_last_seq_nos"
PATIENTS_URL = "http://localhost:8000/get_patients"
RETRY_DIR = "retry_queue"
os.makedirs(RETRY_DIR, exist_ok=True)

seq_counters = {}
patient_ids = []

async def initialize_seq_counters():
    global seq_counters
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(SEQ_INIT_URL) as resp:
                if resp.status != 200:
                    raise Exception(f"Failed to get seq counters: {resp.status}")
                data = await resp.json()
                for pid, seq in data.items():
                    seq_counters[pid] = seq
                print("Initialized seq_counters via API:", seq_counters)
    except Exception as e:
        print(f"[!] Could not initialize seq counters via API: {e}")

async def get_patient_ids():
    global patient_ids
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(PATIENTS_URL) as resp:
                if resp.status != 200:
                    raise Exception(f"Failed to get patients: {resp.status}")
                data = await resp.json()
                patient_ids = [str(patient['id']) for patient in data]
                print("Retrieved patient IDs:", patient_ids)
                return patient_ids
    except Exception as e:
        print(f"[!] Could not get patient IDs via API: {e}")
        # Fallback to default patient IDs if API fails
        patient_ids = ["1", "2", "3", "4", "5"]
        print("Using fallback patient IDs:", patient_ids)
        return patient_ids

def generate_random_vitals_for_patient(patient_id):
    global seq_counters

    if patient_id not in seq_counters:
        seq_counters[patient_id] = 1
    else:
        seq_counters[patient_id] += 1

    # Her hasta için farklı vital aralıkları
    patient_seed = hash(patient_id) % 1000
    random.seed(patient_seed + int(time.time()))
    
    # Hasta ID'sine göre farklı sağlık profilleri
    patient_num = int(patient_id) if patient_id.isdigit() else hash(patient_id) % 10
    
    if patient_num % 3 == 0:
        # Sağlıklı hasta profili
        heart_rate = random.randint(65, 85)
        oxygen_level = random.randint(97, 100)
        temp = round(random.uniform(36.2, 36.8), 1)
    elif patient_num % 3 == 1:
        # Orta risk hasta profili
        heart_rate = random.randint(70, 95)
        oxygen_level = random.randint(94, 98)
        temp = round(random.uniform(36.5, 37.2), 1)
    else:
        # Yüksek risk hasta profili
        heart_rate = random.randint(80, 110)
        oxygen_level = random.randint(90, 96)
        temp = round(random.uniform(37.0, 38.0), 1)

    packet_dict = {
        "uuid": str(uuid.uuid4()),
        "seq_no": seq_counters[patient_id],
        "patient_id": patient_id,
        "heart_rate": heart_rate,
        "oxygen_level": oxygen_level,
        "temp": temp,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

    json_bytes = json.dumps(packet_dict).encode('utf-8')
    padding_len = 5120 - len(json_bytes)
    if padding_len < 0:
        raise ValueError("Packet exceeds 5120 bytes")

    padded_bytes = json_bytes + b'X' * padding_len
    return packet_dict, padded_bytes

async def send_vitals(session, packet_dict, padded_bytes):
    encrypted = encrypt_data(padded_bytes)

    payload = {
        "uuid": packet_dict["uuid"],
        "seq_no": packet_dict["seq_no"],
        "patient_id": packet_dict["patient_id"],
        "encrypted_data": encrypted,
        "late": False  # default for live packets
    }

    try:
        async with session.post(API_URL, json=payload, timeout=1) as resp:
            if resp.status != 200:
                raise Exception(f"Server returned {resp.status}")
            await resp.text()
    except Exception as e:
        print(f"[!] Send failed (seq={packet_dict['seq_no']}): {e}")
        fallback_path = os.path.join(RETRY_DIR, f"{packet_dict['uuid']}.json")
        try:
            with open(fallback_path, "w") as f:
                json.dump(payload, f)
            print(f"→ Saved to retry queue: {fallback_path}")
        except Exception as file_err:
            print(f"[!!] Could not save to fallback queue: {file_err}")

async def run_generator(period=1.0):
    global patient_ids
    async with aiohttp.ClientSession() as session:
        while True:
            # Tüm hastalar için veri generate et
            for patient_id in patient_ids:
                start = time.time()
                packet_dict, padded_bytes = generate_random_vitals_for_patient(patient_id)
                await send_vitals(session, packet_dict, padded_bytes)
                elapsed = time.time() - start
                print(f"Patient {patient_id} - Generated vitals: HR={packet_dict['heart_rate']}, O2={packet_dict['oxygen_level']}, Temp={packet_dict['temp']}")
                print(f"Sent seq_no={packet_dict['seq_no']} uuid={packet_dict['uuid']} ({elapsed:.2f}s)")
            
            # Period kadar bekle
            await asyncio.sleep(period)

if __name__ == "__main__":
    try:
        asyncio.run(initialize_seq_counters())
        asyncio.run(get_patient_ids())
        asyncio.run(run_generator(period=2.0))  # Her 2 saniyede tüm hastalar için veri generate et
    except KeyboardInterrupt:
        print("Stopped generator.")
