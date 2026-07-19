<!-- TITLE AND TYPING ANIMATION -->
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=End-to-End%20Servicing%20Agent&fontSize=50&animation=fadeIn&fontAlignY=38" />
</div>

<div align="center">
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=3ECF8E&center=true&vCenter=true&width=600&lines=Intelligent+Fintech+Automation;LangGraph-Powered+Orchestration;Zero-Latency+Policy+Engine;Immutable+Audit+Trails" alt="Typing SVG" />
  </a>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/LangGraph-FF4F00?style=for-the-badge&logo=langchain&logoColor=white" />
</div>

<br/>

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="80%">
</div>

## 🌟 Vision & Architecture

Welcome to the future of **Financial Customer Servicing**. This project implements a **"Chain Breaker" architecture**: an intelligent AI agent that blends zero-latency keyword routing, Groq LLM intent classification, and a deterministic policy engine to safely automate banking requests.

If any regulatory or business policy threshold fails, the graph short-circuits instantly—generating a comprehensive, hash-chained escalation handoff for human agents. **Zero hallucinations, pure compliance.**

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="80%">
</div>

## 🚀 Hyper-Animated Feature Set

| Feature | Description | Tech Stack |
| :--- | :--- | :--- |
| **🛡️ Secure Auth** | Full Signup/Login flows integrated with database triggers | `<Supabase JWTs>` |
| **💅 Hybrid UI** | Framer Motion micro-animations & Tailwind styling | `<Next.js 15>` |
| **🤖 Auditable AI** | LangGraph orchestration with deterministic policies | `<FastAPI + LangChain>` |
| **📜 Hash-Chained** | Every graph node transition is immutably logged via SHA-256 | `<PostgreSQL>` |
| **🚀 Escalation** | Auto-generates detailed receipts of what passed/failed | `<Groq LLMs>` |

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="80%">
</div>

## 🛠️ Lightning Fast Setup

<details>
<summary><b>🔥 1. Prerequisites (Click to Expand)</b></summary>
<br/>

- Python 3.10+
- Node.js 18+
- [Groq API Key](https://console.groq.com/keys)
- [Supabase Project](https://supabase.com) (URL, Anon Key, and Service Role Key)

</details>

<details>
<summary><b>💾 2. Supabase Trigger (Click to Expand)</b></summary>
<br/>

Run the following SQL in your Supabase SQL Editor:
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

<details>
<summary><b>⚙️ 3. Backend (FastAPI)</b></summary>
<br/>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Add your real keys to `backend/.env`. Then start the API:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
</details>

<details>
<summary><b>🎨 4. Frontend (Next.js)</b></summary>
<br/>

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
</details>

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="80%">
</div>

## 🎮 Interactive Demos

> Open **[http://localhost:3000](http://localhost:3000)** to begin testing.

### ✅ The "Happy Path" (Instant Auto-Approval)
1. Log in.
2. Type: **"Waive my annual fee"**
3. *Magic:* The agent pulls your ID from the session, verifies your `platinum` tier in the database, ensures you have `0` waivers used, and approves it seamlessly.

### 🛑 The "Escalation" Path (Chain Breaker)
1. Type: **"Can you lower my interest rate?"**
2. *Magic:* LangGraph detects this is out of scope. The policy chain is instantly severed, and a pristine Handoff Card is generated for the human servicing team.

### 🔍 The Cryptographic Audit Trail
Click the **"Audit"** button in the chat. A ledger will slide out displaying the SHA-256 hash chain of every LangGraph node execution. Click **Verify Chain Integrity** to cryptographically prove no tampering occurred.

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="80%">
</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=100&section=footer" />
</div>
