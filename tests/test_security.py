from app.core.security import create_access_token


def test_invalid_sort_field_rejected(client, user_a_headers):
    """Ensure arbitrary SQL or unapproved fields in sort_by are rejected."""
    response = client.get(
        "/api/v1/tasks?sort_by=non_existent_column",
        headers=user_a_headers,
    )
    assert response.status_code == 400
    assert "Invalid sort field" in response.json()["error"]["message"]


def test_sql_injection_attempt_in_search(client, user_a_headers):
    """Ensure search queries with SQL injection strings do not crash or alter query logic."""
    payload = "test' OR '1'='1"
    response = client.get(
        f"/api/v1/tasks?search={payload}",
        headers=user_a_headers,
    )
    assert response.status_code == 200
    # Parameterized query searches literal string safely
    assert response.json()["total"] == 0


def test_expired_token_rejected(client):
    """Verify that expired tokens return 401 unauthorized."""
    from datetime import timedelta

    expired_token = create_access_token(
        subject="1",
        jti="test-jti-expired",
        expires_delta=timedelta(seconds=-10),
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["error"]["message"].lower()


def test_tampered_token_rejected(client, user_a_headers):
    token = user_a_headers["Authorization"].split(" ")[1]
    tampered_token = token[:-5] + "XXXXX"
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert response.status_code == 401
