import httpx
import uuid
import asyncio
import json

async def test():
    session_id = str(uuid.uuid4())
    print(f"Starting E2E Test with session_id: {session_id}\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # ─── Test 1: Auto-Approve Fee Waiver (CUST-01) ───
        print(">> Sending Request: 'Can you waive my annual fee for card 1111?'")
        resp = await client.post("http://127.0.0.1:8000/api/chat", json={
            "session_id": session_id,
            "message": "Can you waive my annual fee for card 1111?"
        })
        print(f"Status Code: {resp.status_code}")
        print("Response:")
        print(json.dumps(resp.json(), indent=2))
        
        # ─── Test 2: Verify Audit Trail Integrity ───
        print("\n>> Fetching Audit Trail Verification")
        audit_resp = await client.get(
            f"http://127.0.0.1:8000/api/audit/{session_id}/verify",
            headers={"X-User-ID": "test-user-123"}
        )
        print(f"Status Code: {audit_resp.status_code}")
        print("Audit Result:")
        print(json.dumps(audit_resp.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(test())
