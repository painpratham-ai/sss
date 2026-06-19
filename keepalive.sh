#!/bin/bash
cd /home/z/my-project

# Check if anything is listening on port 3000
if ss -tlnp 2>/dev/null | grep -q ":3000.*LISTEN"; then
  exit 0  # Server is up, nothing to do
fi

# Server is down — restart it
echo "[$(date)] Server down — restarting..." >> /home/z/my-project/dev.log
pkill -9 -f "node.*server" 2>/dev/null
sleep 2
cd /home/z/my-project
NODE_OPTIONS="--max-old-space-size=1024" setsid sh -c 'node .next/standalone/server.js > /home/z/my-project/dev.log 2>&1' &
sleep 5
echo "[$(date)] Restarted PID $!" >> /home/z/my-project/dev.log
