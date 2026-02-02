#!/bin/bash
# Regenerate icons for quiz images that are missing them
# Uses the gemini-3-pro-image-preview model

# Configuration
API_URL="https://trash.myx.is/api/quiz/generate-missing-icons"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-bobba}"  # Set ADMIN_PASSWORD env var or use default
LIMIT="${1:-10}"  # Number of icons to generate (default: 10, max: 10)

echo "🎨 Regenerating icons for quiz images..."
echo "Limit: $LIMIT images"
echo ""

# Make the API call
response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$ADMIN_PASSWORD\",\"limit\":$LIMIT}")

# Check if request was successful
if echo "$response" | grep -q '"error"'; then
  echo "❌ Error:"
  echo "$response" | jq -r '.error'
  exit 1
fi

# Display results
echo "✅ Results:"
echo "$response" | jq '.'

# Summary
total=$(echo "$response" | jq '.results | length')
successful=$(echo "$response" | jq '[.results[] | select(.success == true)] | length')
failed=$(echo "$response" | jq '[.results[] | select(.success == false)] | length')

echo ""
echo "📊 Summary:"
echo "  Total processed: $total"
echo "  Successful: $successful"
echo "  Failed: $failed"

if [ "$failed" -gt 0 ]; then
  echo ""
  echo "⚠️  Failed items:"
  echo "$response" | jq -r '.results[] | select(.success == false) | "  - \(.item): \(.error)"'
fi
