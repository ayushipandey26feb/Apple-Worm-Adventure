import time


def test_auth_session_progress_and_logged_out_rejection(client):
    email = f"tscheck-auth-{time.time_ns()}@example.com"
    password = "Apple123!"
    registered = client.post("/auth/register", json={"email": email, "password": password, "name": "TS Check"})
    assert registered.status_code == 200, registered.text[:300]
    assert registered.json()["email"] == email
    # The production cookie is Secure; localhost HTTP does not store Secure cookies automatically.
    client.cookies.set("access_token", registered.cookies.get("access_token"))
    me = client.get("/auth/me")
    assert me.status_code == 200, me.text[:300]
    saved = client.post("/progress", json={"level_id": 1, "score": 10, "moves": 4, "stars": 1, "apples": 2, "completed": False})
    assert saved.status_code == 200, saved.text[:300]
    assert saved.json().get("saved") is True
    progress = client.get("/progress")
    assert progress.status_code == 200, progress.text[:300]
    assert any(row.get("level_id") == 1 and row.get("score") == 10 for row in progress.json())
    logged_out = client.post("/auth/logout")
    assert logged_out.status_code == 200, logged_out.text[:300]
    rejected = client.get("/progress")
    assert rejected.status_code == 401, rejected.text[:300]
