#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { BCApiClient } = require('./bc-client.js');
const { MockBCClient } = require('./mock-data.js');
const { ATDDValidator, ATDD_RULES } = require('./atdd-validator.js');
const { ATDDTestGenerator } = require('./atdd-generator.js');

require('dotenv').config();

// Initialize ATDD Validator and Generator
const atddValidator = new ATDDValidator();
const atddGenerator = new ATDDTestGenerator();

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
  },
  // ATDD Validation Tools
  {
    name: 'atdd_validate_test',
    description: 'Validate AL test code against Ciellos ATDD guidelines. Returns all rule violations.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'AL test code to validate' }
      },
      required: ['code']
    }
  },
  {
    name: 'atdd_validate_naming',
    description: 'Validate test procedure naming conventions (T####_ prefix, PascalCase, no quotes)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'AL test code to validate' }
      },
      required: ['code']
    }
  },
  {
    name: 'atdd_validate_comments',
    description: 'Validate GIVEN-WHEN-THEN comment structure (no extra comments allowed)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'AL test code to validate' }
      },
      required: ['code']
    }
  },
  {
    name: 'atdd_validate_scenarios',
    description: 'Validate scenario count matches test procedure count',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'AL test code to validate' }
      },
      required: ['code']
    }
  },
  {
    name: 'atdd_get_rules',
    description: 'Get all ATDD Ciellos validation rules with descriptions and examples',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'atdd_create_unit_tests',
    description: 'Generate AL test codeunit from a test plan markdown following Ciellos ATDD guidelines. Returns complete AL code.',
    inputSchema: {
      type: 'object',
      properties: {
        testPlan: { type: 'string', description: 'Test plan content in markdown format with Gherkin scenarios' },
        codeunitId: { type: 'number', description: 'Codeunit ID (default: 50100)' },
        codeunitName: { type: 'string', description: 'Codeunit name (auto-generated if not provided)' },
        libraryCodeunit: { type: 'string', description: 'Library codeunit name to use (default: LibraryApprovedSupplier182FDW)' }
      },
      required: ['testPlan']
    }
  },
  {
    name: 'atdd_parse_test_plan',
    description: 'Parse a test plan markdown and extract scenarios without generating code. Useful for reviewing structure.',
    inputSchema: {
      type: 'object',
      properties: {
        testPlan: { type: 'string', description: 'Test plan content in markdown format' }
      },
      required: ['testPlan']
    }
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
      
      // ATDD Validation Tools
      case 'atdd_validate_test':
        const fullValidation = atddValidator.validateAll(args.code);
        const summary = atddValidator.getSummary(fullValidation);
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      
      case 'atdd_validate_naming':
        const namingIssues = atddValidator.validateTestNaming(args.code);
        return { content: [{ type: 'text', text: JSON.stringify({ issues: namingIssues, count: namingIssues.length }, null, 2) }] };
      
      case 'atdd_validate_comments':
        const commentIssues = atddValidator.validateCommentStructure(args.code);
        return { content: [{ type: 'text', text: JSON.stringify({ issues: commentIssues, count: commentIssues.length }, null, 2) }] };
      
      case 'atdd_validate_scenarios':
        const scenarioIssues = atddValidator.validateScenarioCount(args.code);
        return { content: [{ type: 'text', text: JSON.stringify({ issues: scenarioIssues, count: scenarioIssues.length }, null, 2) }] };
      
      case 'atdd_get_rules':
        return { content: [{ type: 'text', text: JSON.stringify(ATDD_RULES, null, 2) }] };
      
      case 'atdd_create_unit_tests':
        const parsedPlan = atddGenerator.parseTestPlan(args.testPlan);
        const generatedCode = atddGenerator.generateTestCodeunit(parsedPlan, {
          codeunitId: args.codeunitId,
          codeunitName: args.codeunitName,
          libraryCodeunit: args.libraryCodeunit
        });
        const appliedRules = atddGenerator.getAppliedRules();
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              code: generatedCode,
              scenarioCount: parsedPlan.scenarios.length,
              metadata: parsedPlan.metadata,
              appliedRules: appliedRules
            }, null, 2) 
          }] 
        };
      
      case 'atdd_parse_test_plan':
        const parsed = atddGenerator.parseTestPlan(args.testPlan);
        return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
      
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
