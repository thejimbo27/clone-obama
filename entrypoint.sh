#!/bin/sh
set -e

cd /app

# Seed DB if it doesn't exist
if [ ! -f data/obama.db ]; then
  echo "Seeding database..."
  node db/seed.js
fi

# Start admin panel
echo "Starting admin panel..."
node admin/server.js &

# Start Expo dev server (--clear to avoid stale Metro cache)
echo "Starting Expo dev server..."
CI=1 npx expo start --web --port 8082 --clear &

# Wait for Expo to be ready
sleep 5

# Start proxy
echo "Starting proxy..."
node proxy.js &

echo ""
echo "  OBAMA HQ — ALL SYSTEMS GO"
echo "  Proxy:  http://localhost:4000"
echo "  App:    http://localhost:4000/"
echo "  Admin:  http://localhost:4000/admin/"
echo ""

# Wait for any process to exit
wait
