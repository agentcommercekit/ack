#!/usr/bin/env bash

# Setup and run ACK Swap Demo with UI
set -e  # Exit on any error

echo "🚀 Setting up and running ACK Swap Demo with UI..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists pnpm; then
    echo "❌ Error: pnpm is not installed. Please install pnpm first."
    echo "   Visit: https://pnpm.io/installation"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Error: npm is not installed. Please install Node.js and npm first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if we're in the right directory (should have package.json with demo:swap script)
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

if ! grep -q "demo:swap" package.json; then
    echo "❌ Error: demo:swap script not found in package.json. Please run this script from the correct project root."
    exit 1
fi

# Check for .env file in the swap demo directory
ENV_FILE="demos/swap/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Creating .env file for swap demo..."
    touch "$ENV_FILE"
fi

# Check if OPENAI_API_KEY exists in .env
if ! grep -q "OPENAI_API_KEY" "$ENV_FILE" || ! grep "OPENAI_API_KEY" "$ENV_FILE" | grep -q "=.*[^[:space:]]"; then
    echo "🔑 OPENAI_API_KEY not found or empty in $ENV_FILE"
    echo ""
    read -p "Please enter your OpenAI API Key: " api_key

    if [ -z "$api_key" ]; then
        echo "❌ Error: API key cannot be empty."
        exit 1
    fi

    # Remove any existing OPENAI_API_KEY line and add the new one
    grep -v "OPENAI_API_KEY" "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || touch "${ENV_FILE}.tmp"
    echo "OPENAI_API_KEY=$api_key" >> "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"

    echo "✅ OPENAI_API_KEY added to $ENV_FILE"
else
    echo "✅ OPENAI_API_KEY found in $ENV_FILE"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🌐 Starting ACK Lab UI (http://localhost:3000)..."
echo "This will run in the background..."

# Start ack-lab-ui in the background
cd demos/swap/ack-lab-ui
npm run dev &
ACK_LAB_UI_PID=$!

# Return to project root and wait a moment
cd ../../..
sleep 3

echo ""
echo "🌐 Starting Web UI (http://localhost:3001)..."
echo "This will run in the background..."

# Start web-ui in the background (on a different port)
cd demos/swap/web-ui
NEXT_PORT=3001 npm run dev &
WEB_UI_PID=$!

# Return to project root
cd ../../..

echo ""
echo "🎉 UI services are starting up!"
echo ""
echo "Services running:"
echo "  🔬 ACK Lab UI: http://localhost:3000 (PID: $ACK_LAB_UI_PID)"
echo "  🌐 Web UI: http://localhost:3001 (PID: $WEB_UI_PID)"
echo ""
echo "📊 To run the interactive swap demo, open a new terminal and run:"
echo "  pnpm run demo:swap"
echo ""
echo "Press Ctrl+C to stop the UI services..."

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping UI services..."
    kill $ACK_LAB_UI_PID 2>/dev/null || true
    kill $WEB_UI_PID 2>/dev/null || true
    echo "✅ All UI services stopped."
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT

# Wait for user to press Ctrl+C
while true; do
    sleep 1
done
