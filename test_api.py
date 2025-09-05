#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"

def test_caregiver_notes():
    print("🧪 Testing Caregiver Notes System...")
    
    # Test 1: Create note (caregiver role)
    print("\n1. Creating note as caregiver...")
    note_data = {
        "patient_id": 1,
        "title": "Daily Observation",
        "content": "Patient shows good progress today.",
        "care_level": 4
    }
    
    response = requests.post(
        f"{BASE_URL}/caregiver_notes?caregiver_id=1&role=caregiver",
        json=note_data
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test 2: Get caregiver's notes
    print("\n2. Getting caregiver notes...")
    response = requests.get(f"{BASE_URL}/caregiver_notes?caregiver_id=1&role=caregiver")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test 3: Doctor viewing notes
    print("\n3. Doctor viewing all notes...")
    response = requests.get(f"{BASE_URL}/caregiver_notes/all?user_id=2&role=doctor")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test 4: Filter by care level
    print("\n4. Filter by care level (doctor)...")
    response = requests.get(f"{BASE_URL}/caregiver_notes/by_care_level?user_id=2&role=doctor&care_level=4")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    try:
        test_caregiver_notes()
    except requests.exceptions.ConnectionError:
        print("❌ API is not running! Start with: python -m uvicorn api:app --reload")
    except Exception as e:
        print(f"❌ Test failed: {e}")