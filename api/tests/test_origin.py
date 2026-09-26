"""Origin check on state-changing requests (defence in depth, next to the SameSite cookie)."""

from fastapi.testclient import TestClient

from serenity.origin import origin_of

BODY = {"username": "tristan"}


def test_a_foreign_origin_cannot_change_anything(client: TestClient) -> None:
    evil = client.post("/api/auth/prelogin", json=BODY, headers={"Origin": "https://evil.example"})
    assert evil.status_code == 403
    sandboxed = client.post("/api/auth/prelogin", json=BODY, headers={"Origin": "null"})
    assert sandboxed.status_code == 403


def test_the_public_url_and_a_missing_origin_pass(client: TestClient) -> None:
    # The test settings keep the default public URL, https://localhost.
    ours = client.post("/api/auth/prelogin", json=BODY, headers={"Origin": "https://LOCALHOST:443"})
    assert ours.status_code == 200
    # No Origin: a script, `make client`, the test client. Not a browser acting for someone else.
    assert client.post("/api/auth/prelogin", json=BODY).status_code == 200


def test_reading_is_never_blocked(client: TestClient) -> None:
    assert client.get("/api/health", headers={"Origin": "https://evil.example"}).status_code == 200


def test_the_origin_is_compared_in_the_form_browsers_send() -> None:
    assert origin_of("https://serenity.tail1234.ts.net/") == "https://serenity.tail1234.ts.net"
    assert origin_of("HTTP://127.0.0.1:8080") == "http://127.0.0.1:8080"
    assert origin_of("https://x.example:abc") != origin_of("https://x.example")
