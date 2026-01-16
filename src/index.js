#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { BCApiClient } = require('./bc-client.js');
const { tools, resources } = require('./tools.js');

require('dotenv').config();

// Create MCP Server
const server = new Server(
  { 
    name: 'ciellos-bc-mcp-server', 
    version: '1.0.0' 
  },
  { 
    capabilities: { 
      tools: {}, 
      resources: {} 
    } 
  }
);

// Initialize BC API Client
const bcClient = new BCApiClient({
  tenantId: process.env.BC_TENANT_ID,
  clientId: process.env.BC_CLIENT_ID,
  clientSecret: process.env.BC_CLIENT_SECRET,
  environment: process.env.BC_ENVIRONMENT || 'Production',
  company: process.env.BC_COMPANY || 'CRONUS USA, Inc.'
});

// Register Tools List Handler
server.setRequestHandler('tools/list', async () => ({
  tools: tools
}));

// Register Tools Call Handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'bc_query':
        const queryResult = await bcClient.query(args.entity, args.filter, args.select, args.top);
        return { content: [{ type: 'text', text: JSON.stringify(queryResult, null, 2) }] };

      case 'bc_get_record':
        const record = await bcClient.getById(args.entity, args.id);
        return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };

      case 'bc_create_record':
        const created = await bcClient.create(args.entity, args.data);
        return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] };

      case 'bc_update_record':
        const updated = await bcClient.update(args.entity, args.id, args.data);
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };

      case 'bc_delete_record':
        await bcClient.delete(args.entity, args.id);
        return { content: [{ type: 'text', text: `Record ${args.id} deleted successfully` }] };

      case 'bc_list_companies':
        const companies = await bcClient.listCompanies();
        return { content: [{ type: 'text', text: JSON.stringify(companies, null, 2) }] };

      case 'bc_get_metadata':
        const metadata = await bcClient.getMetadata(args.entity);
        return { content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }] };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { 
      content: [{ type: 'text', text: `Error: ${error.message}` }], 
      isError: true 
    };
  }
});

// Register Resources List Handler
server.setRequestHandler('resources/list', async () => ({
  resources: resources
}));

// Register Resources Read Handler
server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;
  
  try {
    if (uri.startsWith('bc://entities')) {
      const entities = await bcClient.listEntities();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(entities, null, 2) }] };
    }
    
    if (uri.startsWith('bc://schema/')) {
      const entity = uri.replace('bc://schema/', '');
      const schema = await bcClient.getMetadata(entity);
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(schema, null, 2) }] };
    }

    throw new Error(`Unknown resource: ${uri}`);
  } catch (error) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ciellos BC MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
