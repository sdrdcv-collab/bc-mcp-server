# BC MCP Server

[![npm version](https://badge.fury.io/js/@ciellos/bc-mcp-server.svg)](https://www.npmjs.com/package/@ciellos/bc-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP (Model Context Protocol) Server for Microsoft Dynamics 365 Business Central. Enables AI agents like **Windsurf**, **Claude**, and **Copilot Studio** to interact with Business Central ERP modules.

## Features

- 🔄 **Full CRUD Operations** - Query, Create, Update, Delete BC records
- 📊 **All BC Modules** - Finance, Sales, Purchasing, Inventory
- 🔐 **OAuth2 Authentication** - Secure Azure AD authentication
- 🛠️ **Standardized MCP Protocol** - Works with any MCP-compatible client

## Installation

### Via NPX (Recommended)

```bash
npx @ciellos/bc-mcp-server
```

### Via NPM

```bash
npm install -g @ciellos/bc-mcp-server
bc-mcp-server
```

### From Source

```bash
git clone https://github.com/ciellos-dev/bc-mcp-server.git
cd bc-mcp-server
npm install
npm start
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```env
BC_TENANT_ID=your-azure-tenant-id
BC_CLIENT_ID=your-app-client-id
BC_CLIENT_SECRET=your-app-client-secret
BC_ENVIRONMENT=Production
BC_COMPANY=CRONUS USA, Inc.
```

### Windsurf Configuration

Add to your Windsurf MCP settings (`%APPDATA%\Windsurf\mcp_settings.json`):

```json
{
  "mcpServers": {
    "business-central": {
      "command": "npx",
      "args": ["-y", "@ciellos/bc-mcp-server"],
      "env": {
        "BC_TENANT_ID": "your-tenant-id",
        "BC_CLIENT_ID": "your-client-id",
        "BC_CLIENT_SECRET": "your-client-secret",
        "BC_ENVIRONMENT": "Production",
        "BC_COMPANY": "CRONUS USA, Inc."
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "business-central": {
      "command": "npx",
      "args": ["-y", "@ciellos/bc-mcp-server"],
      "env": {
        "BC_TENANT_ID": "your-tenant-id",
        "BC_CLIENT_ID": "your-client-id",
        "BC_CLIENT_SECRET": "your-client-secret",
        "BC_ENVIRONMENT": "Production",
        "BC_COMPANY": "CRONUS USA, Inc."
      }
    }
  }
}
```

## Azure AD App Registration

1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Name: `BC MCP Server`
4. Click **Register**
5. Go to **API permissions** → **Add permission** → **Dynamics 365 Business Central**
6. Add `Financials.ReadWrite.All` permission
7. Click **Grant admin consent**
8. Go to **Certificates & secrets** → **New client secret**
9. Copy the secret value

## Available Tools

| Tool | Description |
|------|-------------|
| `bc_query` | Query BC entities with OData filters |
| `bc_get_record` | Get a single record by ID |
| `bc_create_record` | Create a new record |
| `bc_update_record` | Update an existing record |
| `bc_delete_record` | Delete a record |
| `bc_list_companies` | List all companies |
| `bc_get_metadata` | Get entity metadata/schema |

## Supported Entities

- `customers` - Customer records
- `vendors` - Vendor/Supplier records
- `items` - Inventory items
- `salesOrders` - Sales orders
- `salesInvoices` - Sales invoices
- `purchaseOrders` - Purchase orders
- `purchaseInvoices` - Purchase invoices
- `generalLedgerEntries` - GL entries
- `bankAccounts` - Bank accounts
- `employees` - Employee records

## Usage Examples

### In Windsurf/Claude

```
"List all customers from Business Central"
"Create a new vendor named Contoso Ltd"
"Show sales orders for customer 10000"
"Update item 1000 with new price 99.99"
```

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Windsurf/      │────▶│  BC MCP      │────▶│ Business Central │
│  Claude/Copilot │◀────│  Server      │◀────│ API              │
└─────────────────┘     └──────────────┘     └──────────────────┘
        │                      │                      │
        │    MCP Protocol      │    REST/OData        │
        │    (JSON-RPC 2.0)    │    (OAuth2)          │
```

## License

MIT © Ciellos

## Contributing

Contributions are welcome! Please open an issue or submit a PR.
