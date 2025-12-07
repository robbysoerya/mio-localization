#!/bin/bash

# Bulk Upsert Translation Test Script
# This script tests the POST /translations/bulk-upsert endpoint

BASE_URL="http://localhost:3000"

echo "Testing Bulk Upsert Endpoint"
echo "=============================="
echo ""

# First, get a key ID to test with
echo "1. Fetching existing keys..."
KEYS_RESPONSE=$(curl -s "${BASE_URL}/keys")
echo "Keys response: $KEYS_RESPONSE"
echo ""

# Extract first key ID (you'll need to replace this with an actual key ID)
# For manual testing, replace KEY_ID with an actual key ID from your database
KEY_ID="<replace-with-actual-key-id>"

echo "2. Testing bulk upsert with multiple locales..."
echo "Using keyId: $KEY_ID"
echo ""

# Test bulk upsert
curl -X POST "${BASE_URL}/translations/bulk-upsert" \
  -H "Content-Type: application/json" \
  -d "{
    \"keyId\": \"${KEY_ID}\",
    \"translations\": [
      { \"locale\": \"en\", \"value\": \"Hello World\" },
      { \"locale\": \"id\", \"value\": \"Halo Dunia\" },
      { \"locale\": \"zh\", \"value\": \"你好世界\" }
    ]
  }" | jq '.'

echo ""
echo "3. Verifying translations were created..."
curl -s "${BASE_URL}/translations/key/${KEY_ID}" | jq '.'

echo ""
echo "4. Testing update (running same request again)..."
curl -X POST "${BASE_URL}/translations/bulk-upsert" \
  -H "Content-Type: application/json" \
  -d "{
    \"keyId\": \"${KEY_ID}\",
    \"translations\": [
      { \"locale\": \"en\", \"value\": \"Hello World Updated\" },
      { \"locale\": \"id\", \"value\": \"Halo Dunia Updated\" },
      { \"locale\": \"zh\", \"value\": \"你好世界 Updated\" }
    ]
  }" | jq '.'

echo ""
echo "5. Verifying translations were updated..."
curl -s "${BASE_URL}/translations/key/${KEY_ID}" | jq '.'

echo ""
echo "Test completed!"
