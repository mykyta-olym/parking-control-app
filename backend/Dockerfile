FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Create non-root user to run the service
RUN adduser --disabled-password --gecos "" appuser

# Install runtime dependencies
COPY requirements.txt .
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh

ENV DB_URL=sqlite:////app/SQLite/parking.db \
    APP_USER=appuser

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
