const tools = [
  {
    name: 'bc_query',
    description: 'Query Business Central entities (customers, vendors, items, sales orders, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'BC entity to query (e.g., customers, vendors, items, salesOrders, purchaseOrders)',
          enum: [
            'customers', 'vendors', 'items', 'salesOrders', 'salesInvoices',
            'purchaseOrders', 'purchaseInvoices', 'generalLedgerEntries',
            'bankAccounts', 'employees', 'locations', 'currencies'
          ]
        },
        filter: {
          type: 'string',
          description: 'OData filter expression (e.g., "displayName eq \'Contoso\'")'
        },
        select: {
          type: 'string',
          description: 'Comma-separated fields to return (e.g., "id,displayName,email")'
        },
        top: {
          type: 'integer',
          description: 'Maximum number of records to return',
          default: 100
        }
      },
      required: ['entity']
    }
  },
  {
    name: 'bc_get_record',
    description: 'Get a single Business Central record by ID',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'BC entity type'
        },
        id: {
          type: 'string',
          description: 'Record ID (GUID)'
        }
      },
      required: ['entity', 'id']
    }
  },
  {
    name: 'bc_create_record',
    description: 'Create a new record in Business Central',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'BC entity type to create'
        },
        data: {
          type: 'object',
          description: 'Record data as JSON object'
        }
      },
      required: ['entity', 'data']
    }
  },
  {
    name: 'bc_update_record',
    description: 'Update an existing Business Central record',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'BC entity type'
        },
        id: {
          type: 'string',
          description: 'Record ID (GUID)'
        },
        data: {
          type: 'object',
          description: 'Fields to update as JSON object'
        }
      },
      required: ['entity', 'id', 'data']
    }
  },
  {
    name: 'bc_delete_record',
    description: 'Delete a Business Central record',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'BC entity type'
        },
        id: {
          type: 'string',
          description: 'Record ID (GUID)'
        }
      },
      required: ['entity', 'id']
    }
  },
  {
    name: 'bc_list_companies',
    description: 'List all companies in the Business Central environment',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'bc_get_metadata',
    description: 'Get metadata/schema for a Business Central entity',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'BC entity to get metadata for'
        }
      },
      required: ['entity']
    }
  }
];

const resources = [
  {
    uri: 'bc://entities',
    name: 'BC Entities List',
    description: 'List of available Business Central entities',
    mimeType: 'application/json'
  },
  {
    uri: 'bc://schema/{entity}',
    name: 'BC Entity Schema',
    description: 'Schema/metadata for a specific BC entity',
    mimeType: 'application/json'
  }
];

module.exports = { tools, resources };
