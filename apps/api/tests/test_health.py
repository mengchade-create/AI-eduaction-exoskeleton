"""Health endpoint tests."""


def test_health_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "version" in response.json()


def test_health_db_ok(client):
    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {"db": "ok"}
