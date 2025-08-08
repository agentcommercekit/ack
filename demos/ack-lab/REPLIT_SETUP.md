# Running ACK-Lab Demos on Replit

This demo has been configured to work seamlessly on both local development environments and Replit.

## Quick Start on Replit

1. **Fork/Import the repository on Replit**
2. **Run the demo**: The `.replit` configuration will automatically run `npm run dev`
3. **Access the Web UI**: Open the webview or the external URL provided by Replit

## How It Works

### Dynamic Endpoint Configuration

The demo automatically detects whether it's running on Replit or locally and configures all service endpoints accordingly:

- **Local**: Uses `http://localhost:PORT`
- **Replit**: Uses `https://$REPLIT_DEV_DOMAIN:PORT`

### Port Mapping

The following ports are configured in `.replit`:

| Service        | Local Port | Replit External Port |
| -------------- | ---------- | -------------------- |
| Web UI         | 3000       | 80 (default)         |
| Router         | 5677       | 5677                 |
| Swap Requestor | 5678       | 5678                 |
| Swap Executor  | 5679       | 5679                 |
| ACK-Lab        | 5680       | 5680                 |
| Data Provider  | 5681       | 5681                 |
| Data Requestor | 5682       | 5682                 |

### Environment Detection

The system uses two methods to detect the environment:

1. **Backend (Node.js)**: Checks for `REPLIT_DEV_DOMAIN` environment variable
2. **Frontend (Browser)**: Checks if the hostname contains `replit.dev`

### Files Modified for Replit Support

#### Utility Files Created:

- `src/utils/endpoint-utils.ts` - Backend endpoint configuration
- `web-ui/src/utils/endpoint-utils.ts` - Frontend endpoint configuration
- `ack-lab-ui/src/utils/endpoint-utils.ts` - Admin UI endpoint configuration

#### Configuration Files:

- `.replit` - Replit configuration with port mappings
- `bin/run-replit.sh` - Combined startup script for backend and frontend

#### Updated Files:

All service files and components have been updated to use dynamic endpoints instead of hardcoded localhost URLs.

## Manual Setup (If Needed)

If the automatic setup doesn't work, you can manually:

1. Install dependencies:

```bash
npm install
cd web-ui && npm install
```

2. Create a `.env` file (optional, for AI features):

```
ANTHROPIC_API_KEY=your_key_here
# or
OPENAI_API_KEY=your_key_here
```

3. Run the demo:

```bash
npm run dev
```

## Accessing Services

Once running on Replit, you can access:

- **Web UI**: The main webview URL (no port needed)
- **Individual Services**: `https://your-replit-domain:PORT`
- **ACK-Lab Admin**: `https://your-replit-domain:5680/admin`

## Troubleshooting

### Services Not Responding

- Check that all ports are properly configured in the Replit "Ports" tab
- Ensure the external ports match the configuration in `.replit`

### CORS Issues

- The services are configured to accept requests from any origin
- If issues persist, check browser console for specific CORS errors

### Environment Variables

- Replit automatically sets `REPLIT_DEV_DOMAIN`
- You can add additional environment variables in the Replit Secrets tab

## Demo Features

Both demos work identically on Replit as they do locally:

### Token Swap Demo

- Natural language swap requests
- Automatic flow execution
- Real-time status updates

### Data Monetization Demo

- Dataset discovery and negotiation
- Automated price negotiation
- Token-based data access

## Development

To modify the endpoint configuration:

1. Edit `src/utils/endpoint-utils.ts` for backend changes
2. Edit `web-ui/src/utils/endpoint-utils.ts` for frontend changes
3. The system will automatically use the correct URLs based on the environment
