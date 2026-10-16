#!/bin/sh
# pg_dump the production database and keep the last N daily dumps.
# Runs inside the `backup` compose service (postgres:17-alpine) once a day.
set -eu

: "${POSTGRES_DB:?}" "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
OUT_DIR="/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/${POSTGRES_DB}-${STAMP}.dump"

mkdir -p "$OUT_DIR"
export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6 --file="$FILE"
echo "backup: wrote $FILE"

find "$OUT_DIR" -name "${POSTGRES_DB}-*.dump" -mtime "+$RETENTION" -delete
echo "backup: pruned dumps older than $RETENTION days"
