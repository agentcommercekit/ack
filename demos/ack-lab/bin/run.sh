#!/usr/bin/env bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

print_color "$BLUE" "╔═══════════════════════════════════════════╗"
print_color "$BLUE" "║       🚀 ACK Lab Demo Setup & Run         ║"
print_color "$BLUE" "╚═══════════════════════════════════════════╝"
echo

# Change to project directory
cd "$PROJECT_DIR"

# Check for pnpm
if ! command_exists pnpm; then
    print_color "$RED" "❌ Error: pnpm is not installed."
    echo "Please install pnpm first: npm install -g pnpm"
    exit 1
fi

# Function to prompt for API key
prompt_for_key() {
    local key_name=$1
    local key_description=$2
    local key_value=""

    print_color "$YELLOW" "⚠️  $key_name not found in .env file"
    echo "$key_description"
    read -p "Enter your $key_name (or press Enter to skip): " key_value

    if [ -n "$key_value" ]; then
        echo "$key_name=$key_value" >> .env
        print_color "$GREEN" "✅ $key_name added to .env file"
    else
        print_color "$YELLOW" "⏭️  Skipping $key_name (you can add it later)"
    fi
    echo
}

# Check and create .env file
print_color "$BLUE" "📋 Checking environment configuration..."

if [ ! -f .env ]; then
    print_color "$YELLOW" "📝 Creating .env file..."
    touch .env
    ENV_CREATED=true
else
    print_color "$GREEN" "✅ .env file exists"
    ENV_CREATED=false
fi

# Load existing .env if it exists
if [ -f .env ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi

# Check for OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    if ! grep -q "^OPENAI_API_KEY=" .env 2>/dev/null; then
        prompt_for_key "OPENAI_API_KEY" "This is required for AI-powered agent responses using OpenAI."
    fi
else
    print_color "$GREEN" "✅ OPENAI_API_KEY is configured"
fi

# Check for ACK_LAB_API_KEY
if [ -z "$ACK_LAB_API_KEY" ]; then
    if ! grep -q "^ACK_LAB_API_KEY=" .env 2>/dev/null; then
        prompt_for_key "ACK_LAB_API_KEY" "This is required for ACK Lab services integration."
    fi
else
    print_color "$GREEN" "✅ ACK_LAB_API_KEY is configured"
fi

# Reload .env after potential modifications
if [ -f .env ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi

# Install dependencies
print_color "$BLUE" "📦 Installing dependencies..."
echo

# Install main project dependencies
print_color "$YELLOW" "Installing demo server dependencies..."
pnpm install

# Install web-ui dependencies
print_color "$YELLOW" "Installing web UI dependencies..."
cd "$PROJECT_DIR/web-ui"
pnpm install

# Return to project directory
cd "$PROJECT_DIR"

print_color "$GREEN" "✅ All dependencies installed!"
echo

# Function to cleanup on exit
cleanup() {
    print_color "$YELLOW" "\n🛑 Shutting down services..."

    # Kill all child processes
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ -n "$UI_PID" ]; then
        kill $UI_PID 2>/dev/null || true
    fi

    # Wait a moment for processes to clean up
    sleep 1

    print_color "$GREEN" "✅ All services stopped"
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM EXIT

# Start the services
print_color "$BLUE" "🚀 Starting services..."
echo

# Start the unified demo server
print_color "$YELLOW" "Starting unified demo server on port 3333..."
pnpm run demo:unified &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Start the web UI
print_color "$YELLOW" "Starting web UI on port 3000..."
cd "$PROJECT_DIR/web-ui"
pnpm run dev &
UI_PID=$!

# Return to project directory
cd "$PROJECT_DIR"

# Wait for services to be ready
sleep 3

print_color "$GREEN" "\n╔═══════════════════════════════════════════╗"
print_color "$GREEN" "║         🎉 Services are running!          ║"
print_color "$GREEN" "╚═══════════════════════════════════════════╝"
echo
print_color "$BLUE" "📡 Unified Demo Server: http://localhost:3333"
print_color "$BLUE" "🖥️  Web UI:             http://localhost:3000"
echo
print_color "$YELLOW" "Press Ctrl+C to stop all services"
echo

# Keep the script running
while true; do
    sleep 1
done
