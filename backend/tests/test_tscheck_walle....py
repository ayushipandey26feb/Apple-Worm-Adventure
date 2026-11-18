import time
import uuid


def test_wallet_ad_requires_login_and_grants_coins_with_ledger_entry(client):
    # Guests cannot open a WALLET ad opportunity.
    guest_id = str(uuid.uuid4())
    guest_attempt = client.post("/rewards/opportunity", json={"placement": "WALLET", "guest_id": guest_id})
    assert guest_attempt.status_code == 401, guest_attempt.text[:300]

    # A logged-in user can watch the WALLET ad fully and receives coins + a ledger entry.
    email = f"tscheck-wallet-{time.time_ns()}@example.com"
    registered = client.post("/auth/register", json={"email": email, "password": "Apple123!", "name": "TS Wallet"})
    assert registered.status_code == 200, registered.text[:300]
    client.cookies.set("access_token", registered.cookies.get("access_token"))

    before = client.get("/auth/me")
    assert before.status_code == 200, before.text[:300]
    before_coins = before.json().get("coins", 0)

    opp = client.post("/rewards/opportunity", json={"placement": "WALLET"})
    assert opp.status_code == 200, opp.text[:300]
    body = opp.json()
    time.sleep(body["required_seconds"] + 1)

    verify = client.post("/rewards/verify", json={"opportunity_id": body["opportunity_id"], "event_id": f"evt-{uuid.uuid4()}"})
    assert verify.status_code == 200, verify.text[:300]
    v = verify.json()
    assert v["status"] == "GRANTED"
    assert v["coins_granted"] > 0

    after = client.get("/auth/me")
    assert after.status_code == 200, after.text[:300]
    assert after.json()["coins"] == before_coins + v["coins_granted"]

    ledger = client.get("/wallet")
    assert ledger.status_code == 200, ledger.text[:300]
    wallet_data = ledger.json()
    assert wallet_data["coins"] == after.json()["coins"]
    rows = wallet_data["history"]
    assert any(row.get("placement") == "WALLET" and row.get("record_type") == "CREDIT" for row in rows), rows[:3]
