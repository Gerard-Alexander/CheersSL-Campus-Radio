#!/bin/bash

ENV_FILE="/app/.env"

# Check if .env already has SECRET_KEY
if [ ! -f "$ENV_FILE" ] || ! grep -q '^SECRET_KEY=' "$ENV_FILE"; then
  echo "Generating new SECRET_KEY..."
  SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
  echo "SECRET_KEY=$SECRET" > "$ENV_FILE"
fi

# Load .env into environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Start your app (e.g. Flask)
exec "$@"
