#!/bin/bash

# AI Translation Test Script
# This script tests the AI translation endpoints

BASE_URL="http://localhost:4000"

echo "AI Translation Test Script"
echo "=========================="
echo ""

# Check if GEMINI_API_KEY is set (Optional warn, since env might be in Docker)
if [ -z "$GEMINI_API_KEY" ]; then
  echo "ℹ️  Note: GEMINI_API_KEY environment variable is not set in this shell."
  echo "   (This is fine if running against Docker which has the key)"
  echo ""
fi

# Test 1: Single Key AI Translation
echo "Test 1: Single Key AI Translation"
echo "===================================="
echo ""

# Actual Key ID from DB (common.search)
KEY_ID="cmiv4kxq2001p01pjkpbi4lk1"

echo "Translating key ${KEY_ID} to Indonesian (id) and Chinese (zh)..."
curl -s -X POST "${BASE_URL}/translations/ai-translate" \
  -H "Content-Type: application/json" \
  -d "{
    \"keyId\": \"${KEY_ID}\",
    \"targetLocales\": [\"id\", \"zh\"]
  }" | jq '.'

echo ""
echo "Verifying translations..."
curl -s "${BASE_URL}/translations/key/${KEY_ID}" | jq '.'

echo ""
echo ""

# Test 2: Batch AI Translation for a Feature
echo "Test 2: Batch AI Translation"
echo "============================="
echo ""

# Actual Feature ID from DB (Common)
FEATURE_ID="cmiv4kiwr000001pjt0ojfw9y"

echo "Batch translating all missing translations for feature ${FEATURE_ID}..."
echo "NOTE: This will take time due to rate limiting (6s delay per request)..."
curl -s -X POST "${BASE_URL}/translations/ai-translate-batch" \
  -H "Content-Type: application/json" \
  -d "{
    \"featureId\": \"${FEATURE_ID}\"
  }" | jq '.'

echo ""
echo ""

# Test 3: Batch Translation with Specific Locales
echo "Test 3: Batch Translation (Specific Locales)"
echo "============================================="
echo ""

echo "Batch translating to Indonesian only for feature ${FEATURE_ID}..."
curl -X POST "${BASE_URL}/translations/ai-translate-batch" \
  -H "Content-Type: application/json" \
  -d "{
    \"featureId\": \"${FEATURE_ID}\",
    \"targetLocales\": [\"id\"]
  }" | jq '.'

echo ""
echo "Tests completed!"
echo ""
echo "Next steps:"
echo "1. Check that translations were created with isReviewed: false"
echo "2. Verify translation quality"
echo "3. Review and approve AI-generated translations"
