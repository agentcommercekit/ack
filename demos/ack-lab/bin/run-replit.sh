#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_color() {
    echo -e "${1}${2}${NC}"
}

# Check if running on Replit
if [ -n "$REPLIT_DEV_DOMAIN" ]; then
    print_color "$GREEN" "🌐 Running on Replit!"
    print_color "$BLUE" "Domain: $REPLIT_DEV_DOMAIN"
else
    print_color "$YELLOW" "💻 Running locally"
fi

# Kill any existing processes on our ports
print_color "$YELLOW" "🧹 Cleaning up existing processes..."
for port in 3000 5677 5678 5679 5680 5681 5682; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Check for .env file and OPENAI_API_KEY
if [ ! -f ".env" ]; then
    print_color "$YELLOW" "📝 Creating .env file..."
    touch .env
fi

# Load existing .env if it exists
if [ -f ".env" ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi

# Check for OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    if ! grep -q "^OPENAI_API_KEY=" .env 2>/dev/null; then
        print_color "$YELLOW" "⚠️  OPENAI_API_KEY not found!"
        print_color "$BLUE" "This is required for AI-powered agent responses."
        echo ""
        read -p "Enter your OPENAI_API_KEY (or press Enter to skip): " api_key

        if [ -n "$api_key" ]; then
            echo "OPENAI_API_KEY=$api_key" >> .env
            print_color "$GREEN" "✅ OPENAI_API_KEY added to .env file"
            # Reload environment
            set -a
            source .env 2>/dev/null || true
            set +a
        else
            print_color "$YELLOW" "⏭️  Skipping - agent responses will be limited"
            print_color "$YELLOW" "You can add it later to the .env file"
        fi
        echo ""
    fi
else
    print_color "$GREEN" "✅ OPENAI_API_KEY is configured"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_color "$YELLOW" "📦 Installing dependencies..."
    pnpm install
fi

if [ ! -d "web-ui/node_modules" ]; then
    print_color "$YELLOW" "📦 Installing web-ui dependencies..."
    cd web-ui && npm install && cd ..
fi

# Start the unified demo server in the background
print_color "$GREEN" "🚀 Starting unified demo server..."
pnpm run demo:unified &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Start the web UI
print_color "$GREEN" "🌐 Starting web UI..."
cd web-ui && pnpm run dev &
UI_PID=$!

# Function to cleanup on exit
cleanup() {
    print_color "$YELLOW" "\n🛑 Shutting down services..."
    kill $SERVER_PID 2>/dev/null || true
    kill $UI_PID 2>/dev/null || true
    # Kill any remaining processes on our ports
    for port in 3000 5677 5678 5679 5680 5681 5682; do
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    done
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

# Display access information
print_color "$GREEN" "\n✨ All services starting up!"
print_color "$BLUE" "\nAccess the demo at:"

if [ -n "$REPLIT_DEV_DOMAIN" ]; then
    print_color "$GREEN" "  🌐 Web UI: https://$REPLIT_DEV_DOMAIN"
    print_color "$BLUE" "\nService endpoints:"
    print_color "$BLUE" "  • Router: https://$REPLIT_DEV_DOMAIN:3000"
    print_color "$BLUE" "  • ACK-Lab: https://$REPLIT_DEV_DOMAIN:3003"
    print_color "$BLUE" "  • Swap Requestor: https://$REPLIT_DEV_DOMAIN:3001"
    print_color "$BLUE" "  • Swap Executor: https://$REPLIT_DEV_DOMAIN:3002"
    print_color "$BLUE" "  • Data Requestor: https://$REPLIT_DEV_DOMAIN:5000"
    print_color "$BLUE" "  • Data Provider: https://$REPLIT_DEV_DOMAIN:4200"
else
    print_color "$GREEN" "  🌐 Web UI: http://localhost:3000"
    print_color "$BLUE" "\nService endpoints:"
    print_color "$BLUE" "  • Router: http://localhost:5677"
    print_color "$BLUE" "  • ACK-Lab: http://localhost:5680"
    print_color "$BLUE" "  • Swap Requestor: http://localhost:5678"
    print_color "$BLUE" "  • Swap Executor: http://localhost:5679"
    print_color "$BLUE" "  • Data Requestor: http://localhost:5682"
    print_color "$BLUE" "  • Data Provider: http://localhost:5681"
fi

print_color "$YELLOW" "\n[Press Ctrl+C to stop all services]"

# Wait for processes
wait
