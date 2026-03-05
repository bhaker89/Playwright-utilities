#!/bin/bash

echo "🎯 Waiting for Qwen model to finish downloading..."
echo ""

# Wait for the download to complete
while true; do
  if ollama list | grep -q "qwen2.5-coder"; then
    echo "✅ Qwen model is ready!"
    echo ""
    ollama list | grep qwen
    echo ""
    break
  else
    echo "⏳ Still downloading... waiting 20 seconds"
    sleep 20
  fi
done

echo "🚀 Starting E2E Test with Qwen..."
echo "=================================="
echo ""

# Run the E2E test
OLLAMA_MODEL=qwen2.5-coder:7b node platform/cli/index.js generate-from-curl \
  --curl 'curl https://jsonplaceholder.typicode.com/posts/1' \
  --service "jsonplaceholder-service" \
  --api "get-single-post" \
  --llm-provider ollama

# Check result
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ E2E TEST PASSED!"
  echo ""
  echo "📂 Generated Files:"
  echo "  1. Helper: services/jsonplaceholder-service/jsonplaceholder-service-helper.js"
  echo "  2. OpenAPI: services/jsonplaceholder-service/apis/get-single-post/openapi.yaml"
  echo "  3. Test: tests/api/jsonplaceholder-service/get-single-post.spec.js"
  echo ""
  echo "🎯 Run the generated test:"
  echo "  npx playwright test tests/api/jsonplaceholder-service/get-single-post.spec.js"
else
  echo ""
  echo "❌ E2E TEST FAILED"
  echo "Check logs above for details"
fi