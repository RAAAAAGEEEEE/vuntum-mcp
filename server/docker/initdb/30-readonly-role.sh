#!/bin/sh
# Docker Compose demo only: creates the read-only role with the password given
# in docker-compose.yml (MCP_READONLY_PASSWORD).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v ro_password="$MCP_READONLY_PASSWORD" -f /vuntum-sql/readonly-role.sql
