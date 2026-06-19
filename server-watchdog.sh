#!/bin/bash
while true; do
  # Check if server is alive
  if ! curl -s -o /dev/null -m 5 http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server down — restarting..." >> /home/z/my-project/dev.log
    pkill -9 -f "node.*server" 2>/dev/null
    sleep 2
    cd /home/z/my-project
    NODE_OPTIONS="--max-old-space-size=1024" node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1 &
    sleep 10
  fi
  sleep 30  # Check every 30 seconds
done
