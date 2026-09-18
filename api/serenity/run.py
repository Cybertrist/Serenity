"""Process entry point: `python -m serenity.run api|agent`.

Reads the service's key file as root, drops privileges, then starts the service.
"""

import sys

import uvicorn

from serenity.agent.service import run_agent
from serenity.config import get_settings
from serenity.main import create_app
from serenity.secrets import drop_privileges, read_key_file


def run_api() -> None:
    settings = get_settings()
    totp_key = read_key_file(settings.totp_key_file)
    drop_privileges()
    app = create_app(settings, totp_key=totp_key)
    # Only the web (nginx) container reaches the api on the internal network,
    # so forwarded headers are trusted from any peer.
    uvicorn.run(
        app,
        host="0.0.0.0",  # noqa: S104 (container port, never published on the host)
        port=8000,
        proxy_headers=True,
        forwarded_allow_ips="*",
        server_header=False,
        log_config=None,
    )


def run_agent_process() -> None:
    settings = get_settings()
    server_key = read_key_file(settings.server_key_file)
    drop_privileges()
    run_agent(settings, server_key)


def main(argv: list[str]) -> None:
    services = {"api": run_api, "agent": run_agent_process}
    if len(argv) != 2 or argv[1] not in services:
        raise SystemExit("usage: python -m serenity.run api|agent")
    services[argv[1]]()


if __name__ == "__main__":
    main(sys.argv)
