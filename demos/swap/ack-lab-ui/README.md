# ACK-Lab Policy Manager UI

A web-based interface for managing agent policies in the ACK-Lab service. This UI allows you to configure security policies, transaction limits, and trusted agent lists for agents participating in the ACK Swap Demo.

## Features

- **Policy Management**: Configure security policies for individual agents
- **Transaction Limits**: Set maximum transaction sizes and daily limits
- **Identity Requirements**: Enable/disable Catena ICC requirements
- **Trusted Agents**: Manage whitelist of trusted agent DIDs
- **Policy Templates**: Apply pre-configured policy templates (Conservative, Moderate, Permissive)
- **Real-time Updates**: Changes are immediately applied to the running ACK-Lab service
- **Activity Monitoring**: View transaction history and policy violations
- **Risk Assessment**: Visual risk level indicators based on policy configuration

## Prerequisites

1. The ACK Swap Demo must be running with ACK-Lab service on port 5680
2. Node.js and npm installed

## Getting Started

1. **Start the ACK Swap Demo first**:

   ```bash
   cd ../
   npm run dev  # This starts the main swap demo and ACK-Lab service
   ```

2. **Start the Policy Manager UI**:

   ```bash
   cd ack-lab-ui
   npm install
   npm run dev -- -p 3001
   ```

3. **Access the Policy Manager**:
   - Open http://localhost:3001 in your browser
   - Or visit http://localhost:5680/admin for a quick link

## Usage

### Managing Agent Policies

1. **Select an Agent**: Click on an agent from the left sidebar to view and edit their policies
2. **Modify Settings**:
   - Toggle identity requirements (Catena ICC)
   - Adjust transaction limits using sliders
   - Add/remove trusted agents
3. **Apply Templates**: Use pre-configured templates for quick setup
4. **Save Changes**: Click "Save Changes" to apply policies to the running ACK-Lab service

### Policy Templates

- **Conservative**: Low limits with strict identity requirements
- **Moderate**: Balanced security and usability
- **Permissive**: High limits for trusted environments

### Advanced Settings

Enable "Show Advanced Settings" to:

- Edit policies as raw JSON
- Fine-tune specific policy parameters

### Monitoring Activity

Switch to the "Activity" tab to:

- View recent transactions
- Monitor policy violations
- Track compliance events

## API Integration

The UI connects to the ACK-Lab service running on `http://localhost:5680`:

- `GET /agents` - Retrieve all agents and their policies
- `PUT /agents/:did/policies` - Update policies for a specific agent
- `GET /admin` - Simple admin landing page

## Development

The UI is built with:

- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui components
- Lucide React icons

### Project Structure

```
src/
├── components/
│   ├── PolicyManager.tsx    # Main policy management interface
│   └── ui/                  # shadcn/ui components
├── app/
│   ├── layout.tsx          # App layout and metadata
│   └── page.tsx            # Main page
└── lib/
    └── utils.ts            # Utility functions
```

## Policy Configuration

### Security Policies

- **requireCatenaICC**: Requires counterparties to present Catena-issued credentials
- **maxTransactionSize**: Maximum USDC amount per transaction (in subunits)
- **dailyTransactionLimit**: Maximum USDC amount per day (in subunits)
- **trustedAgents**: Array of DID strings for trusted agents

### Risk Assessment

The system automatically calculates risk levels based on:

- Identity verification requirements
- Transaction size limits
- Daily volume limits
- Trusted agent configuration

Risk levels: Low, Medium, High

## Integration with Swap Demo

When policies are updated through this UI, they immediately affect:

- Transaction validation in the swap flow
- Identity verification requirements
- Payment processing limits
- Agent-to-agent communication policies

The changes are reflected in real-time in the main swap demo interface.
