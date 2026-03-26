#!/bin/bash

# Self-Healing Setup Script
# Quick setup for self-healing test automation

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🩹 Self-Healing Test Automation - Quick Setup           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file${NC}"
    else
        touch .env
        echo -e "${GREEN}✅ Created empty .env file${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Check for AI configuration
if ! grep -q "AI_PROVIDER" .env 2>/dev/null; then
    echo ""
    echo -e "${YELLOW}🤖 AI Provider not configured${NC}"
    echo ""
    echo "Select AI provider:"
    echo "  1. Groq (Recommended - Free tier)"
    echo "  2. Anthropic Claude"
    echo "  3. OpenAI GPT"
    echo "  4. Skip AI configuration"
    echo ""
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            echo "" >> .env
            echo "# AI Configuration for Self-Healing" >> .env
            echo "AI_PROVIDER=groq" >> .env
            echo "GROQ_API_KEY=your_groq_api_key_here" >> .env
            echo "GROQ_MODEL=llama-3.3-70b-versatile" >> .env
            echo ""
            echo -e "${GREEN}✅ Groq configuration added to .env${NC}"
            echo -e "${YELLOW}⚠️  Please update GROQ_API_KEY in .env file${NC}"
            echo "   Get free key: https://console.groq.com"
            ;;
        2)
            echo "" >> .env
            echo "# AI Configuration for Self-Healing" >> .env
            echo "AI_PROVIDER=anthropic" >> .env
            echo "AI_API_KEY=your_anthropic_api_key_here" >> .env
            echo "AI_MODEL=claude-3-sonnet-20240229" >> .env
            echo ""
            echo -e "${GREEN}✅ Anthropic configuration added to .env${NC}"
            echo -e "${YELLOW}⚠️  Please update AI_API_KEY in .env file${NC}"
            ;;
        3)
            echo "" >> .env
            echo "# AI Configuration for Self-Healing" >> .env
            echo "AI_PROVIDER=openai" >> .env
            echo "AI_API_KEY=your_openai_api_key_here" >> .env
            echo "AI_MODEL=gpt-4-turbo" >> .env
            echo ""
            echo -e "${GREEN}✅ OpenAI configuration added to .env${NC}"
            echo -e "${YELLOW}⚠️  Please update AI_API_KEY in .env file${NC}"
            ;;
        4)
            echo -e "${YELLOW}⚠️  Skipping AI configuration${NC}"
            echo "   (AI healing will not work without configuration)"
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            ;;
    esac
else
    echo -e "${GREEN}✅ AI provider configured${NC}"
fi

# Create required directories
echo ""
echo "📁 Creating required directories..."

directories=(
    ".auth"
    "generated-tests"
    "generated-tests/playwright"
    "generated-tests/yaml"
    "reports"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}✅ Created $dir${NC}"
    else
        echo -e "${GREEN}✅ $dir exists${NC}"
    fi
done

# Set permissions
echo ""
echo "🔒 Setting permissions..."
chmod 755 .auth 2>/dev/null || true
chmod 755 generated-tests 2>/dev/null || true
chmod 755 reports 2>/dev/null || true
echo -e "${GREEN}✅ Permissions set${NC}"

# Check if node_modules exists
echo ""
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    read -p "Install dependencies now? (y/n): " install_deps
    if [ "$install_deps" = "y" ] || [ "$install_deps" = "Y" ]; then
        echo "📦 Installing dependencies..."
        npm install
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    fi
else
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Run integration tests
echo ""
read -p "🧪 Run self-healing integration tests? (y/n): " run_tests
if [ "$run_tests" = "y" ] || [ "$run_tests" = "Y" ]; then
    echo ""
    echo "Running integration tests..."
    npm run test:healing || echo -e "${YELLOW}⚠️  Some tests may have failed (this is normal without AI configured)${NC}"
fi

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Setup Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: docs/README_SELF_HEALING.md"
echo "   - Complete Guide: docs/SELF_HEALING_GUIDE.md"
echo "   - Quick Reference: docs/SELF_HEALING_QUICK_REFERENCE.md"
echo ""
echo "🚀 Next Steps:"
echo "   1. Update .env with your AI API key"
echo "   2. Generate your first test:"
echo "      npm run generate:ui-test"
echo "   3. Run tests:"
echo "      npm test"
echo "   4. View analytics:"
echo "      npm run analyze:healing"
echo ""
echo "💡 Need help? Check docs/README_SELF_HEALING.md"
echo ""