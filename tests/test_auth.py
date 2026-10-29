def test_user_registration_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "StrongPassword789!",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    # Enforce password hash is NEVER exposed
    assert "password" not in data
    assert "hashed_password" not in data


def test_user_registration_duplicate_email(client):
    user_payload = {
        "email": "duplicate@example.com",
        "password": "StrongPassword789!",
        "full_name": "Original User",
    }
    res1 = client.post("/api/v1/auth/register", json=user_payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=user_payload)
    assert res2.status_code == 409
    data = res2.json()
    assert data["error"]["code"] == "CONFLICT"


def test_login_success(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "Password123!"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in_seconds"] > 0


def test_login_invalid_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "login_wrong@example.com", "password": "Password123!"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login_wrong@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_get_current_user_me(client, user_a_headers):
    response = client.get("/api/v1/auth/me", headers=user_a_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "usera@example.com"
    assert "hashed_password" not in data


def test_logout_and_revocation(client, user_a_headers):
    # Verify access works before logout
    check_before = client.get("/api/v1/auth/me", headers=user_a_headers)
    assert check_before.status_code == 200

    # Execute logout
    logout_res = client.post("/api/v1/auth/logout", headers=user_a_headers)
    assert logout_res.status_code == 200
    logout_data = logout_res.json()
    assert logout_data["revoked_jti"] is not None

    # Immediate access using the revoked token must fail with 401
    check_after = client.get("/api/v1/auth/me", headers=user_a_headers)
    assert check_after.status_code == 401
    assert "revoked" in check_after.json()["error"]["message"].lower()


def test_unauthenticated_access_denied(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
