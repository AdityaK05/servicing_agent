# End-to-End Servicing Agent

A fully functional, LangGraph-powered customer service chatbot for financial institutions.

This project implements a "Chain Breaker" architecture: an intelligent agent that uses zero-latency keyword routing + Groq LLM intent classification, feeds into a deterministic policy engine, and short-circuits to an escalated human handoff packet the moment any policy threshold fails.

## Features
- **Hybrid Fintech UI:** Beautiful, responsive UI built with Next.js, Tailwind, and Framer Motion.
- **Auditable AI:** LangGraph orchestrates the flow. Pure deterministic policy engine ensures no LLM hallucinations in rule checks.
- **Hash-Chained Audit Trail:** Every node transition in the graph is immutably logged with SHA-256 chaining.
- **Escalation Handoff:** Clean, concise escalation summary generation with a detailed UI receipt showing exactly what passed/failed.

## Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- [Groq API Key](https://console.groq.com/keys)
- [Supabase Project](https://supabase.com) (URL & Anon Key)

### 2. Database (Supabase)
Create the `audit_log` table in your Supabase SQL editor:
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL,
    node TEXT NOT NULL,
    input JSONB,
    output JSONB,
    decision_reason TEXT,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
);
CREATE INDEX idx_audit_session ON audit_log(session_id);
```

### 3. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```
Edit `.env` and add your keys:
```
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```
Start the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application is now running at [http://localhost:3000](http://localhost:3000).

---

## Testing / Demo Script

The system includes a mock bank (`mock_bank.py`) with 5 seeded customers to demonstrate all possible graph pathways. Test these out in the chat UI:

### 1. Auto-Approve Fee Waiver (CUST-01, ends in 1111)
**User:** "Can you waive my annual fee?"
**Agent:** "I'd be happy to help with a fee waiver. Could you provide the last four digits of your card?"
**User:** "1111"
*Result:* Auto-approved based on Platinum tier and high tenure.

### 2. Auto-Approve Limit Increase (CUST-02, ends in 2222)
**User:** "I'd like to increase my credit limit to 5500"
**Agent:** "I can look into a credit limit increase for you. Which card (last four digits) would you like the increase on?"
**User:** "2222"
*Result:* Auto-approved. Limit goes from $5,000 to $5,500 (10% increase, perfectly on-time payments, low utilization).

### 3. Escalate: Limit Increase Denied (CUST-03, ends in 3333)
**User:** "Raise my credit limit please"
**Agent:** "I can look into a credit limit increase for you. Which card (last four digits) would you like the increase on?"
**User:** "3333"
*Result:* Chain breaks at `apply_policy` due to 92% utilization (limit is 85%). The UI shows the escalation handoff card detailing the exact policy failure.

### 4. Auto-Approve Card Replacement (CUST-04, ends in 4444)
**User:** "My card was stolen yesterday"
**Agent:** "I'm sorry to hear about your card. Could you confirm the last four digits of the affected card?"
**User:** "4444"
*Result:* Card is frozen immediately, replacement ordered with expedited shipping, and the user is offered a digital card.

### 5. Escalate: Unidentified / Low Confidence
**User:** "I want to talk to a manager about my interest rates."
*Result:* Immediate chain break (intent = ESCALATE or confidence < 0.7). Short-circuits directly to human handoff.

---

### Audit Trail
Click the "Audit" button in the top right of the chat at any time. It will slide out the ledger showing the cryptographic hash chain of the current session's LangGraph execution. Click "Verify Chain Integrity" to recompute hashes and prove no tampering occurred.
