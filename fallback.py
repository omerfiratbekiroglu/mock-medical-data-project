import aiohttp, asyncio, os, json

RETRY_DIR = "retry_queue"
FALLBACK_URL = "http://localhost:8000/write_fallback"

async def retry_failed_packets():
    async with aiohttp.ClientSession() as session:
        for fname in os.listdir(RETRY_DIR):
            path = os.path.join(RETRY_DIR, fname)
            try:
                with open(path, "r") as f:
                    data = json.load(f)
                data['late'] = True
                async with session.post(FALLBACK_URL, json=data, timeout=2) as resp:
                    if resp.status == 200:
                        print(f"Retried {data['uuid']} successfully.")
                        os.remove(path)
                    else:
                        print(f"Retry failed: {resp.status}")
            except Exception as e:
                print("Retry error:", e)

async def run_loop():
    while True:
        await retry_failed_packets()
        await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(run_loop())
