#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 4 ]; then
  echo "Usage: $0 <url> <name> [timeout_seconds] [interval_seconds]" >&2
  exit 2
fi

url="$1"
name="$2"
timeout="${3:-180}"
interval="${4:-2}"

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but not installed." >&2
  exit 3
fi

start_ts="$(date +%s)"
attempt=0

while true; do
  attempt=$((attempt + 1))
  if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
    elapsed=$(( $(date +%s) - start_ts ))
    echo "[$name] reachable at $url after ${elapsed}s (${attempt} attempts)."
    exit 0
  fi

  now_ts="$(date +%s)"
  elapsed=$(( now_ts - start_ts ))
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "Error: timed out waiting for [$name] at $url after ${elapsed}s (timeout=${timeout}s, attempts=${attempt})." >&2
    exit 1
  fi

  echo "[$name] not ready yet at $url (${elapsed}s elapsed, retrying in ${interval}s)..."
  sleep "$interval"
done
