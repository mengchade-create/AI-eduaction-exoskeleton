"""Authentication endpoint tests."""

from datetime import timedelta

from app.security import create_access_token


def test_login_success(client, seed_users):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "pw123"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["access_token"], str)
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["username"] == "admin"
    assert body["user"]["role"] == "admin"
    assert "password_hash" not in body
    assert "password_hash" not in body["user"]


def test_legacy_login_path_not_registered(client, seed_users):
    response = client.post("/auth/login", json={"username": "admin", "password": "pw123"})

    assert response.status_code == 404


def test_login_wrong_password(client, seed_users):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_credentials"


def test_login_unknown_user(client, seed_users):
    response = client.post("/api/auth/login", json={"username": "ghost", "password": "x"})

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_credentials"


def test_me_with_valid_token(client, seed_users):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "pw123"})
    token = login.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["username"] == "admin"


def test_me_without_token(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_with_invalid_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"})

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_token"


def test_me_with_expired_token(client, seed_users):
    token = create_access_token(
        subject=str(seed_users["admin"].id),
        expires_delta=timedelta(seconds=-1),
    )

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_token"
