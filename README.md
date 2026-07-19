<div align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/LangGraph-FF4F00?style=for-the-badge&logo=langchain&logoColor=white" />
</div>

<h1 align="center">End-to-End Servicing Agent</h1>

<p align="center">
  A fully functional, LangGraph-powered customer service chatbot for financial institutions.
</p>

This project implements a **"Chain Breaker" architecture**: an intelligent agent that uses zero-latency keyword routing + Groq LLM intent classification, feeds into a deterministic policy engine, and short-circuits to an escalated human handoff packet the moment any policy threshold fails.

## ✨ Features

- **🛡️ Secure Authentication:** Full Signup and Login flows integrated with Supabase Auth.
- **💅 Hybrid Fintech UI:** Beautiful, responsive UI built with Next.js, Tailwind, and Framer Motion micro-animations.
- **🤖 Auditable AI:** LangGraph orchestrates the flow. A pure deterministic policy engine ensures no LLM hallucinations in rule checks.
- **📜 Hash-Chained Audit Trail:** Every node transition in the graph is immutably logged with SHA-256 chaining.
- **🚀 Escalation Handoff:** Clean, concise escalation summary generation with a detailed UI receipt showing exactly what passed/failed for human agents.

---

## 🚀 Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- [Groq API Key](https://console.groq.com/keys)
- [Supabase Project](https://supabase.com) (URL, Anon Key, and Service Role Key)

### 2. Database Setup (Supabase)
Run the following SQL in your Supabase SQL Editor to set up the authentication trigger and the banking database:

<details>
<summary>Click here to expand the SQL Script</summary>

```sql
-- 1. Create the bank customers table
create table public.bank_customers (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  card_last_four text,
  loyalty_tier text default 'basic',
  annual_fee_usd numeric default 0,
  fee_waivers_this_year integer default 0,
  credit_limit_usd numeric default 1000,
  account_age_months integer default 0,
  annual_spend_usd numeric default 0,
  utilization_percent numeric default 0,
  on_time_payments_percent numeric default 100,
  replacements_this_year integer default 0,
  last_limit_change_date timestamp with time zone,
  risk_tier text default 'low',
  created_at timestamp with time zone default now()
);

-- 2. Create the audit log table
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

-- 3. Trigger to auto-create customer data on sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.bank_customers (id, name, email, card_last_four, loyalty_tier, annual_fee_usd, fee_waivers_this_year, credit_limit_usd, account_age_months, annual_spend_usd, utilization_percent, on_time_payments_percent, replacements_this_year, risk_tier)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name' ?? 'Valued Customer',
    new.email,
    '1234', -- Mock card number
    'platinum',
    500.00,
    0, -- 0 waivers used so the test works!
    15000.00,
    24,
    50000.00,
    30.5,
    100,
    0,
    'low'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```
</details>


### 3. Backend Setup (FastAPI + LangGraph)
Navigate to the `backend` directory and set up your Python environment:
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file from the example:
```bash
cp .env.example .env
```
Add your real keys to `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
Start the backend API:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup (Next.js)
Navigate to the `frontend` directory:
```bash
cd frontend
npm install
```

Create a `.env.local` file from the example:
```bash
cp .env.local.example .env.local
```
Start the frontend development server:
```bash
npm run dev
```

The application is now running at **[http://localhost:3000](http://localhost:3000)**! 🎉

---

## 🎮 How to Test the Agent

1. Open `http://localhost:3000` in your browser.
2. Click **"Log In / Sign Up"** and create a new account using any email/password.
3. Upon signing up, the Supabase trigger automatically creates a `platinum` tier mock bank account for you.
4. You will be redirected to the chat interface.

### ✅ Test: The "Happy Path" (Auto-Approval)
- **You:** *"Waive my annual fee"*
- **Agent:** Because you are logged in, the agent looks up your ID, recognizes your Platinum tier, sees you have 0 waivers used this year, and **Auto-Approves** the request instantly without asking for your card number!

### 🛑 Test: The "Escalation" Path
- **You:** *"Can you lower my interest rate?"*
- **Agent:** Immediately recognizes this is out of scope (or low confidence), breaks the LangGraph chain, and generates a **Handoff Summary** for a human agent.

### 🔍 Test: The Audit Trail
Click the **"Audit"** button in the top right of the chat at any time. It slides out a ledger showing the cryptographic hash chain of the current session's LangGraph execution. Click "Verify Chain Integrity" to recompute hashes and prove no tampering occurred.

---
