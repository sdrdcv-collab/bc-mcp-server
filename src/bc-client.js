class BCApiClient {
  constructor(config) {
    this.baseUrl = 'https://api.businesscentral.dynamics.com/v2.0';
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.environment = config.environment;
    this.company = config.company;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://api.businesscentral.dynamics.com/.default'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  }

  buildUrl(entity, id = null) {
    const companyEncoded = encodeURIComponent(this.company);
    let url = `${this.baseUrl}/${this.tenantId}/${this.environment}/api/v2.0/companies(${companyEncoded})/${entity}`;
    if (id) {
      url += `(${id})`;
    }
    return url;
  }

  async request(method, url, body = null) {
    await this.authenticate();

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    if (method === 'PATCH' || method === 'DELETE') {
      options.headers['If-Match'] = '*';
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`BC API Error (${response.status}): ${error}`);
    }

    if (method === 'DELETE') {
      return { success: true };
    }

    return response.json();
  }

  async query(entity, filter = null, select = null, top = 100) {
    let url = this.buildUrl(entity);
    const params = new URLSearchParams();
    
    params.append('$top', top.toString());
    if (filter) params.append('$filter', filter);
    if (select) params.append('$select', select);
    
    url += '?' + params.toString();
    return this.request('GET', url);
  }

  async getById(entity, id) {
    const url = this.buildUrl(entity, id);
    return this.request('GET', url);
  }

  async create(entity, data) {
    const url = this.buildUrl(entity);
    return this.request('POST', url, data);
  }

  async update(entity, id, data) {
    const url = this.buildUrl(entity, id);
    return this.request('PATCH', url, data);
  }

  async delete(entity, id) {
    const url = this.buildUrl(entity, id);
    return this.request('DELETE', url);
  }

  async listCompanies() {
    await this.authenticate();
    const url = `${this.baseUrl}/${this.tenantId}/${this.environment}/api/v2.0/companies`;
    return this.request('GET', url);
  }

  async listEntities() {
    return {
      entities: [
        'customers', 'vendors', 'items', 'salesOrders', 'salesInvoices',
        'purchaseOrders', 'purchaseInvoices', 'generalLedgerEntries',
        'bankAccounts', 'employees', 'locations', 'currencies'
      ]
    };
  }

  async getMetadata(entity) {
    await this.authenticate();
    const url = `${this.baseUrl}/${this.tenantId}/${this.environment}/api/v2.0/$metadata#${entity}`;
    return this.request('GET', url);
  }
}

module.exports = { BCApiClient };
