#!/bin/bash

echo "Testing Client Server API with Session Authentication"
echo "===================================================="

BASE_URL="http://localhost:3001"
COOKIE_JAR="client-api-cookies.txt"

echo ""
echo "Step 1: Login with owner credentials"

curl -v -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
    "credentials": {
      "email": "owner3@mail.com",
      "password": "whm3vzn9jue!zcr7CQR"
    },
    "returnUrl": "/owner"
  }' \
    --cookie-jar "$COOKIE_JAR" \
    2>&1 | grep -E "(< HTTP|Set-Cookie:|role|owner|message)"

echo ""
echo "Step 2: Check session status"

curl -v -X GET "$BASE_URL/api/auth/session" \
    --cookie "$COOKIE_JAR" \
    2>&1 | grep -E "(< HTTP|role|owner|message|Authentication)"

echo ""
echo "Step 3: Test client servers API (the failing one)"

curl -v -X GET "$BASE_URL/api/clientServer/user/clients" \
    --cookie "$COOKIE_JAR" \
    2>&1 | grep -E "(< HTTP|500|401|error|message|data)"

echo ""
echo "Test complete!"

# Clean up
rm -f "$COOKIE_JAR"
