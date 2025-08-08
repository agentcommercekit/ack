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

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_color "$YELLOW" "📦 Installing dependencies..."
    npm install
fi

if [ ! -d "web-ui/node_modules" ]; then
    print_color "$YELLOW" "📦 Installing web-ui dependencies..."
    cd web-ui && npm install && cd ..
fi

# Start the unified demo server in the background
print_color "$GREEN" "🚀 Starting unified demo server..."
npm run demo:unified &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Start the web UI
print_color "$GREEN" "🌐 Starting web UI..."
cd web-ui && npm run dev &
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
    print_color "$BLUE" "  • Router: https://$REPLIT_DEV_DOMAIN:5677"
    print_color "$BLUE" "  • ACK-Lab: https://$REPLIT_DEV_DOMAIN:5680"
    print_color "$BLUE" "  • Swap Requestor: https://$REPLIT_DEV_DOMAIN:5678"
    print_color "$BLUE" "  • Swap Executor: https://$REPLIT_DEV_DOMAIN:5679"
    print_color "$BLUE" "  • Data Requestor: https://$REPLIT_DEV_DOMAIN:5682"
    print_color "$BLUE" "  • Data Provider: https://$REPLIT_DEV_DOMAIN:5681"
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
