import asyncio
import os
import sys

# Ensure backend path is in sys.path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.supabase import get_db

CUSTOMERS_DATA = [
    {
        "id": "CUST-01",
        "card_last_four": "1111",
        "loyalty_tier": "platinum",
        "account_age_months": 36,
        "fee_waivers_this_year": 0,
        "annual_spend_usd": 15000,
        "annual_fee_usd": 250,
        "risk_tier": "low",
        "utilization_percent": 15,
        "on_time_payment_percent": 100,
        "credit_limit_usd": 20000,
        "replacements_this_year": 0,
    },
    {
        "id": "CUST-02",
        "card_last_four": "2222",
        "loyalty_tier": "silver",
        "account_age_months": 24,
        "fee_waivers_this_year": 1,
        "annual_spend_usd": 8000,
        "annual_fee_usd": 95,
        "risk_tier": "low",
        "utilization_percent": 25,
        "on_time_payment_percent": 100,
        "credit_limit_usd": 5000,
        "last_limit_change_date": "2023-01-01T00:00:00Z",
        "replacements_this_year": 0,
    },
    {
        "id": "CUST-03",
        "card_last_four": "3333",
        "loyalty_tier": "basic",
        "account_age_months": 12,
        "fee_waivers_this_year": 0,
        "annual_spend_usd": 1200,
        "annual_fee_usd": 0,
        "risk_tier": "high",
        "utilization_percent": 92,
        "on_time_payment_percent": 85,
        "credit_limit_usd": 1000,
        "replacements_this_year": 0,
    },
    {
        "id": "CUST-04",
        "card_last_four": "4444",
        "loyalty_tier": "gold",
        "account_age_months": 48,
        "fee_waivers_this_year": 0,
        "annual_spend_usd": 25000,
        "annual_fee_usd": 150,
        "risk_tier": "low",
        "utilization_percent": 45,
        "on_time_payment_percent": 100,
        "credit_limit_usd": 30000,
        "replacements_this_year": 1,
    },
    {
        "id": "CUST-05",
        "card_last_four": "5555",
        "loyalty_tier": "basic",
        "account_age_months": 3,
        "fee_waivers_this_year": 0,
        "annual_spend_usd": 200,
        "annual_fee_usd": 0,
        "risk_tier": "medium",
        "utilization_percent": 10,
        "on_time_payment_percent": 100,
        "credit_limit_usd": 500,
        "replacements_this_year": 3,
    },
    {
        # Added customer 1234 to fix the exact issue you ran into!
        "id": "CUST-06",
        "card_last_four": "1234",
        "loyalty_tier": "silver",
        "account_age_months": 18,
        "fee_waivers_this_year": 0,
        "annual_spend_usd": 4500,
        "annual_fee_usd": 0,
        "risk_tier": "low",
        "utilization_percent": 30,
        "on_time_payment_percent": 100,
        "credit_limit_usd": 3000,
        "replacements_this_year": 0,
    }
]

def seed():
    print("Starting database seed...")
    db = get_db()
    
    # Optional: Clear existing data to avoid conflict
    try:
        db.table("bank_customers").delete().neq("id", "placeholder").execute()
    except Exception as e:
        print(f"Warning on cleanup (table might be empty or missing): {e}")

    try:
        response = db.table("bank_customers").insert(CUSTOMERS_DATA).execute()
        print(f"Successfully inserted {len(response.data)} customers into bank_customers.")
    except Exception as e:
        print(f"Error inserting data. Ensure you created the table in Supabase! Error: {e}")

if __name__ == "__main__":
    seed()
