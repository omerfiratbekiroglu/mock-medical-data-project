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
RETRY_DIR = "retry_queue"
os.makedirs(RETRY_DIR, exist_ok=True)

seq_counters = {}

def generate_random_vitals(patient_id="patient1"):
    global seq_counters

    if patient_id not in seq_counters:
        seq_counters[patient_id] = 1
    else:
        seq_counters[patient_id] += 1

    packet_dict = {
        "uuid": str(uuid.uuid4()),
        "seq_no": seq_counters[patient_id],
        "patient_id": patient_id,
        "heart_rate": random.randint(60, 100),
        "oxygen_level": random.randint(95, 100),
        "temp": round(random.uniform(36.0, 37.5), 1),
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
    async with aiohttp.ClientSession() as session:
        while True:
            start = time.time()
            packet_dict, padded_bytes = generate_random_vitals()
            await send_vitals(session, packet_dict, padded_bytes)
            elapsed = time.time() - start
            print(f"Generated vitals: {packet_dict['heart_rate']}, {packet_dict['oxygen_level']}, {packet_dict['temp']}")
            print(f"Sent seq_no={packet_dict['seq_no']} uuid={packet_dict['uuid']} ({elapsed:.2f}s)")
            await asyncio.sleep(max(0, period - elapsed))

if __name__ == "__main__":
    try:
        asyncio.run(run_generator(period=1.0))
    except KeyboardInterrupt:
        print("Stopped generator.")
