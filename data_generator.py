import requests
import random
import time

API_URL = "http://localhost:8000/write"

def generate_random_vitals():
    return {
        "patient_id": "patient1",
        "heart_rate": random.randint(60, 100),
        "oxygen_level": random.randint(95, 100),
        "temp": round(random.uniform(36.0, 37.5), 1)
    }

try:
    while True:
        vitals = generate_random_vitals()
        response = requests.post(API_URL, json=vitals)
        print(f"Sent: {vitals} | Status: {response.status_code}")
        time.sleep(1)

except KeyboardInterrupt:
    print("Stopped generator.")
