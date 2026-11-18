import time
import uuid


def test_hint_reward_early_verify_rejected_and_duplicate_verify_conflicts(client):
    guest_id = str(uuid.uuid4())
    attempt_id = f"tscheck-hint-{time.time_ns()}"

    # --- Early verify: leaving before required_seconds must reject with 400 ---
    opp1 = client.post(
        "/rewards/opportunity",
        json={"placement": "HINT", "level_id": 1, "attempt_id": attempt_id, "guest_id": guest_id},
    )
    assert opp1.status_code == 200, opp1.text[:300]
    body1 = opp1.json()
    assert body1["placement"] == "HINT"
    assert body1["required_seconds"] >= 1

    early = client.post(
        "/rewards/verify",
        json={"opportunity_id": body1["opportunity_id"], "event_id": f"evt-{uuid.uuid4()}", "guest_id": guest_id},
    )
    assert early.status_code == 400, early.text[:300]

    # --- Full watch then duplicate verify: second call on a GRANTED opportunity returns 409 ---
    opp2 = client.post(
        "/rewards/opportunity",
        json={"placement": "HINT", "level_id": 1, "attempt_id": attempt_id, "guest_id": guest_id},
    )
    assert opp2.status_code == 200, opp2.text[:300]
    body2 = opp2.json()
    time.sleep(body2["required_seconds"] + 1)

    event_id = f"evt-{uuid.uuid4()}"
    granted = client.post(
        "/rewards/verify",
        json={"opportunity_id": body2["opportunity_id"], "event_id": event_id, "guest_id": guest_id},
    )
    assert granted.status_code == 200, granted.text[:300]
    assert granted.json()["status"] == "GRANTED"

    duplicate = client.post(
        "/rewards/verify",
        json={"opportunity_id": body2["opportunity_id"], "event_id": event_id, "guest_id": guest_id},
    )
    assert duplicate.status_code == 409, duplicate.text[:300]
