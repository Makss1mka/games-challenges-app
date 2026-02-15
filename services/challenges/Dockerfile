FROM python:3.13-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir poetry

RUN poetry self add poetry-plugin-export

COPY pyproject.toml poetry.lock ./

RUN poetry export -f requirements.txt --output requirements.txt --without-hashes && \
    python -m venv /venv && \
    /venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .

FROM python:3.13-slim

WORKDIR /app

COPY --from=builder /venv /venv
COPY --from=builder /app /app

ENV PYTHONUNBUFFERED=1 \
    PATH="/venv/bin:$PATH"

EXPOSE 8080

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
