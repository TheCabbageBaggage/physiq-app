#!/bin/bash
export HOSTNAME=0.0.0.0
export PORT=3001
cd /data/.openclaw/workspace/healthhub-v2/frontend/.next/standalone
exec node server.js
