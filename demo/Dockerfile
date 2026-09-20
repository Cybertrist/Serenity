# syntax=docker/dockerfile:1
# Toy site for the rotation executor (compose profile "demo"). Standard library only.
FROM python:3.12.14-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --system --uid 10003 --user-group --no-create-home --home-dir /app demo
WORKDIR /app
COPY site.py ./
USER demo
EXPOSE 8000
CMD ["python", "site.py"]
