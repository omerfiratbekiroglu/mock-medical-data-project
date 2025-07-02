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

period = 1.0  # seconds

try:
    while True:
        start_time = time.time()

        vitals = generate_random_vitals()
        response = requests.post(API_URL, json=vitals, timeout=2)
        print(f"Sent: {vitals} | Status: {response.status_code}")

        elapsed = time.time() - start_time
        print(f"Iteration took {elapsed:.2f} seconds")

        sleep_time = max(0, period - elapsed)
        print(f"Sleeping for {sleep_time:.2f} seconds\n")
        time.sleep(sleep_time)
        
except KeyboardInterrupt:
    print("\nGenerator stopped by user.")
