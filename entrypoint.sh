#!/bin/sh
set -e

# Seed DB if it doesn't exist
if [ ! -f data/obama.db ]; then
  echo "Seeding database..."
  node db/seed.js
fi

# Start all services
echo "Starting admin panel..."
cd admin && node server.js &
cd ..

echo "Starting Expo dev server..."
npx expo start --web --port 8082 --non-interactive &

# Wait for Expo to be ready
sleep 5

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
