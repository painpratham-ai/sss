#!/bin/bash
# Keep Next.js alive — restart if dead
cd /home/z/my-project

# Check if server is listening on 3000
if lsof -i:3000 -sTCP:LISTEN > /dev/null 2>&1; then
  echo "[$(date)] Server already running"
  exit 0
fi

echo "[$(date)] Server down — starting..."
pkill -9 -f "node.*server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Start standalone production server (lowest memory)
NODE_OPTIONS="--max-old-space-size=1024" nohup node .next/standalone/server.js > dev.log 2>&1 &
echo "[$(date)] Started PID $!"
sleep 5

# Verify
if lsof -i:3000 -sTCP:LISTEN > /dev/null 2>&1; then
  echo "[$(date)] ✅ Server up on port 3000"
else
  echo "[$(date)] ❌ Server failed to start"
fi
