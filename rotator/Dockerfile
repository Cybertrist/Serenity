# syntax=docker/dockerfile:1
# The rotation executor: the only image with a browser, and the only one allowed to reach a
# site (docs/decisions/ADR-015). It holds no key and no database.
FROM mcr.microsoft.com/playwright/python:v1.56.0-noble

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN pip install --break-system-packages \
    "fastapi>=0.141,<1" \
    "uvicorn>=0.53,<1" \
    "playwright==1.56.0"

RUN useradd --system --uid 10004 --user-group --no-create-home --home-dir /app rotator
WORKDIR /app
COPY app.py recipes.py ./
COPY recipes ./recipes
USER rotator
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "warning"]
