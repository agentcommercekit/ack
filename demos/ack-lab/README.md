# ACK Lab Demo

This demo showcases AI agents conducting commerce using the Agent Commerce Kit (ACK).

## Features

- **Token Swap Demo**: Two AI agents negotiate and execute token swaps
- **Data Monetization Demo**: Agents discover, negotiate, and purchase dataset access
- **Unified Web UI**: Seamlessly switch between demos in the browser

## Quick Start

### Option 1: Automated Setup and Launch (Recommended)

Run the all-in-one script that handles setup and launches both services:

```bash
./bin/run.sh
```

This script will:

- Check for and prompt you to enter API keys if missing
- Install all dependencies
- Start both the server and web UI
- Open on http://localhost:3000

### Option 2: Manual Setup

1. **Run the setup script**:

   ```bash
   ./bin/setup
   ```

   This will prompt for API keys and install dependencies.

2. **Start the unified server**:

   ```bash
   pnpm run demo:unified
   ```

3. **Start the web UI** (in another terminal):

   ```bash
   cd web-ui
   pnpm run dev
   ```

4. **Open your browser** at http://localhost:3000

## API Keys

The demo supports two API keys:

- **OPENAI_API_KEY**: For AI-powered agent responses using OpenAI
- **ACK_LAB_API_KEY**: For ACK Lab services integration

These will be automatically requested during setup if not present in your `.env` file.

## Usage

- Use the tabs at the top to switch between Token Swap and Data Monetization demos
- Interact with the agents through the chat interface
- Watch the real-time transaction flow visualization

### Token Swap Commands

- "Swap 60 USDC for ETH"
- "Exchange my USDC for Ethereum"

### Data Monetization Commands

- "I need the financial-markets-2024 dataset for 10 hours"
- "Get me consumer behavior data"

## Architecture

The unified demo runs multiple services:

- **Router** (port 5677): Routes requests to the appropriate demo
- **Swap Requestor** (port 5678): Token swap initiator
- **Swap Executor** (port 5679): Token swap executor
- **Data Requestor** (port 5682): Data purchase initiator
- **Data Provider** (port 5681): Dataset provider
- **ACK-Lab** (port 5680): Mock policy and payment service

## Individual Demos

To run demos separately with terminal interaction:

- Token Swap: `pnpm run demo:swap`
- Data Monetization: `pnpm run demo:data`
