const mockData = {
  customers: [
    { id: '10000', displayName: 'Adatum Corporation', email: 'contact@adatum.com', phone: '555-0100', balance: 15420.50 },
    { id: '20000', displayName: 'Contoso Ltd', email: 'info@contoso.com', phone: '555-0200', balance: 8750.00 },
    { id: '30000', displayName: 'Fabrikam Inc', email: 'sales@fabrikam.com', phone: '555-0300', balance: 22100.75 },
    { id: '40000', displayName: 'Northwind Traders', email: 'orders@northwind.com', phone: '555-0400', balance: 5600.25 }
  ],
  vendors: [
    { id: 'V10000', displayName: 'Wide World Importers', email: 'vendor@wwi.com', phone: '555-1100', balance: 12500.00 },
    { id: 'V20000', displayName: 'Lucerne Publishing', email: 'ap@lucerne.com', phone: '555-1200', balance: 3200.00 },
    { id: 'V30000', displayName: 'Proseware Inc', email: 'billing@proseware.com', phone: '555-1300', balance: 8900.50 }
  ],
  items: [
    { id: '1000', displayName: 'Bicycle', unitPrice: 499.99, inventory: 25, category: 'Products' },
    { id: '1100', displayName: 'Front Wheel', unitPrice: 75.00, inventory: 100, category: 'Parts' },
    { id: '1200', displayName: 'Back Wheel', unitPrice: 85.00, inventory: 80, category: 'Parts' },
    { id: '1300', displayName: 'Chain', unitPrice: 25.00, inventory: 200, category: 'Parts' },
    { id: '1400', displayName: 'Helmet', unitPrice: 45.00, inventory: 50, category: 'Accessories' }
  ],
  salesOrders: [
    { id: 'SO-1001', customerName: 'Adatum Corporation', orderDate: '2026-01-10', status: 'Open', totalAmount: 1499.97 },
    { id: 'SO-1002', customerName: 'Contoso Ltd', orderDate: '2026-01-12', status: 'Released', totalAmount: 2750.00 },
    { id: 'SO-1003', customerName: 'Fabrikam Inc', orderDate: '2026-01-15', status: 'Shipped', totalAmount: 999.98 }
  ],
  purchaseOrders: [
    { id: 'PO-2001', vendorName: 'Wide World Importers', orderDate: '2026-01-08', status: 'Open', totalAmount: 5000.00 },
    { id: 'PO-2002', vendorName: 'Proseware Inc', orderDate: '2026-01-11', status: 'Received', totalAmount: 3200.00 }
  ],
  companies: [
    { id: 'company-1', name: 'CRONUS USA, Inc.', displayName: 'CRONUS USA, Inc.' },
    { id: 'company-2', name: 'CRONUS International Ltd.', displayName: 'CRONUS International Ltd.' }
  ]
};

class MockBCClient {
  constructor() {
    this.data = mockData;
  }

  async query(entity, filter = null, select = null, top = 100) {
    const entityData = this.data[entity] || [];
    let result = [...entityData];
    
    if (filter && filter.includes('eq')) {
      const match = filter.match(/(\w+)\s+eq\s+'([^']+)'/);
      if (match) {
        const [, field, value] = match;
        result = result.filter(item => 
          item[field]?.toString().toLowerCase() === value.toLowerCase()
        );
      }
    }
    
    return { value: result.slice(0, top) };
  }

  async getById(entity, id) {
    const entityData = this.data[entity] || [];
    return entityData.find(item => item.id === id) || { error: 'Not found' };
  }

  async create(entity, data) {
    const newId = `NEW-${Date.now()}`;
    const newRecord = { id: newId, ...data };
    if (!this.data[entity]) this.data[entity] = [];
    this.data[entity].push(newRecord);
    return newRecord;
  }

  async update(entity, id, data) {
    const entityData = this.data[entity] || [];
    const index = entityData.findIndex(item => item.id === id);
    if (index >= 0) {
      this.data[entity][index] = { ...entityData[index], ...data };
      return this.data[entity][index];
    }
    return { error: 'Not found' };
  }

  async delete(entity, id) {
    const entityData = this.data[entity] || [];
    const index = entityData.findIndex(item => item.id === id);
    if (index >= 0) {
      this.data[entity].splice(index, 1);
      return { success: true };
    }
    return { error: 'Not found' };
  }

  async listCompanies() {
    return { value: this.data.companies };
  }

  async listEntities() {
    return { entities: Object.keys(this.data) };
  }

  async getMetadata(entity) {
    const sample = this.data[entity]?.[0] || {};
    return { 
      entity, 
      fields: Object.keys(sample).map(key => ({ name: key, type: typeof sample[key] }))
    };
  }
}

module.exports = { MockBCClient, mockData };
