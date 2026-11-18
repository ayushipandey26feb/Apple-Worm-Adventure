import time

ADMIN_EMAIL = "admin@appleworm.local"
ADMIN_PASSWORD = "AppleAdmin123!"


def test_admin_sees_economy_and_can_save_config_player_is_denied(client):
    # A normal freshly-registered player must be denied access to admin economy endpoints.
    email = f"tscheck-admin-deny-{time.time_ns()}@example.com"
    registered = client.post("/auth/register", json={"email": email, "password": "Apple123!", "name": "TS Player"})
    assert registered.status_code == 200, registered.text[:300]
    client.cookies.set("access_token", registered.cookies.get("access_token"))
    denied = client.get("/admin/economy")
    assert denied.status_code == 403, denied.text[:300]
    client.cookies.clear()

    # Admin login must succeed and expose metrics + an editable config that can be saved back.
    admin_login = client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert admin_login.status_code == 200, admin_login.text[:300]
    client.cookies.set("access_token", admin_login.cookies.get("access_token"))

    metrics = client.get("/admin/economy")
    assert metrics.status_code == 200, metrics.text[:300]
    data = metrics.json()
    for key in ["ad_opportunities", "completed_ads", "failed_ads", "completion_rate", "coins_granted", "coins_spent", "by_placement", "economy"]:
        assert key in data, data

    config = data["economy"]
    save = client.put("/admin/economy", json=config)
    assert save.status_code == 200, save.text[:300]
    assert save.json()["min_seconds_between_ads"] == config["min_seconds_between_ads"]
