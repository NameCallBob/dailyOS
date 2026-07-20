"""
Smoke test: register -> login -> authenticated request with token.

Exercises the full auth flow the frontend relies on (contract §1) plus the
unauthenticated health-check endpoint (contract Docker health-check
requirement).
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_check_is_public():
    client = APIClient()
    response = client.get("/api/v1/health/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "ok"


@pytest.mark.django_db
def test_register_login_and_authenticated_me_roundtrip():
    client = APIClient()

    register_response = client.post(
        "/api/v1/auth/register/",
        {"email": "smoke@example.com", "password": "S3curePassw0rd!"},
        format="json",
    )
    assert register_response.status_code == status.HTTP_200_OK, register_response.data
    assert "token" in register_response.data
    assert register_response.data["user"]["email"] == "smoke@example.com"

    login_response = client.post(
        "/api/v1/auth/login/",
        {"email": "smoke@example.com", "password": "S3curePassw0rd!"},
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK, login_response.data
    token = login_response.data["token"]
    assert token

    authed_client = APIClient()
    authed_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    me_response = authed_client.get("/api/v1/auth/me/")
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["email"] == "smoke@example.com"

    health_response = authed_client.get("/api/v1/health/")
    assert health_response.status_code == status.HTTP_200_OK

    logout_response = authed_client.post("/api/v1/auth/logout/")
    assert logout_response.status_code == status.HTTP_204_NO_CONTENT

    # Token should now be invalid.
    me_after_logout = authed_client.get("/api/v1/auth/me/")
    assert me_after_logout.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_duplicate_registration_returns_email_taken_error():
    client = APIClient()
    client.post(
        "/api/v1/auth/register/",
        {"email": "dup@example.com", "password": "S3curePassw0rd!"},
        format="json",
    )
    response = client.post(
        "/api/v1/auth/register/",
        {"email": "dup@example.com", "password": "AnotherPassw0rd!"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "email_taken"
    assert "request_id" in response.data


@pytest.mark.django_db
def test_login_with_wrong_password_returns_standard_error_envelope():
    client = APIClient()
    client.post(
        "/api/v1/auth/register/",
        {"email": "wrongpass@example.com", "password": "S3curePassw0rd!"},
        format="json",
    )
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "wrongpass@example.com", "password": "totally-wrong"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.data["code"] == "invalid_credentials"
    assert "message" in response.data
