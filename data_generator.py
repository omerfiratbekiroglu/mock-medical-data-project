import aiohttp
import asyncio
import random
import time
import json
from crypto_utils import encrypt_data

API_URL = "http://localhost:8000/write_encrypted"  # or "http://api:8000/write_encrypted" if in Docker

def generate_random_vitals():
    return {
        "patient_id": "patient1",
        "heart_rate": random.randint(60, 100),
        "oxygen_level": random.randint(95, 100),
        "temp": round(random.uniform(36.0, 37.5), 1)
    }

async def send_vitals(session, data):
    try:
        async with session.post(API_URL, json=data, timeout=1) as resp:
            await resp.text()  # optional
    except Exception as e:
        print("Send error:", e)

async def run_generator(period=1.0):
    async with aiohttp.ClientSession() as session:
        while True:
            start = time.time()
            vitals = generate_random_vitals()
            # Encrypt the vitals as JSON string
            encrypted = encrypt_data(json.dumps(vitals))
            await send_vitals(session, {"encrypted_data": encrypted})
            elapsed = time.time() - start
            sleep_time = max(0, period - elapsed)
            print(f"Generated vitals: {vitals}")
            #print(f"Sent (encrypted): {encrypted}")
            print(f"Iteration took {elapsed:.2f} seconds")
            await asyncio.sleep(sleep_time)

if __name__ == "__main__":
    try:
        asyncio.run(run_generator(period=1.0))
    except KeyboardInterrupt:
        print("Stopped generator.")
