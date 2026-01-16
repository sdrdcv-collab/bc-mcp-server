#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { BCApiClient } = require('./bc-client.js');
const { MockBCClient } = require('./mock-data.js');

require('dotenv').config();

// Check for demo mode
const isDemoMode = process.env.BC_DEMO_MODE === 'true' || !process.env.BC_TENANT_ID;

// Initialize BC API Client (real or mock)
const bcClient = isDemoMode 
  ? new MockBCClient()
  : new BCApiClient({
      tenantId: process.env.BC_TENANT_ID,
      clientId: process.env.BC_CLIENT_ID,
      clientSecret: process.env.BC_CLIENT_SECRET,
      environment: process.env.BC_ENVIRONMENT || 'Production',
      company: process.env.BC_COMPANY || 'CRONUS USA, Inc.'
    });

// Define tools
const tools = [
  {
    name: 'bc_query',
    description: 'Query Business Central entities (customers, vendors, items, sales orders, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'BC entity (customers, vendors, items, salesOrders, purchaseOrders)' },
        filter: { type: 'string', description: 'OData filter expression' },
        top: { type: 'number', description: 'Max records to return' }
      },
      required: ['entity']
    }
  },
  {
    name: 'bc_create_record',
    description: 'Create a new record in Business Central',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'BC entity type' },
        data: { type: 'object', description: 'Record data' }
      },
      required: ['entity', 'data']
    }
  },
  {
    name: 'bc_list_companies',
    description: 'List all companies in Business Central',
    inputSchema: { type: 'object', properties: {} }
  }
];

// Create MCP Server
const server = new Server(
  { name: 'ciellos-bc-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handle tools/list
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// Handle tools/call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'bc_query':
        const result = await bcClient.query(args.entity, args.filter, null, args.top || 100);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      
      case 'bc_create_record':
        const created = await bcClient.create(args.entity, args.data);
        return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] };
      
      case 'bc_list_companies':
        const companies = await bcClient.listCompanies();
        return { content: [{ type: 'text', text: JSON.stringify(companies, null, 2) }] };
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const mode = isDemoMode ? '(DEMO MODE)' : '(Live BC)';
  console.error(`Ciellos BC MCP Server running ${mode}`);
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
