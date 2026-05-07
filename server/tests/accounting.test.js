require('./setup');
const request = require('supertest');
const app     = require('../src/app');

const REG = { name: 'Accountant', email: 'acc@example.com', password: 'password123', orgName: 'Books Ltd' };

describe('Accounting routes', () => {
  let agent;

  beforeEach(async () => {
    agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(REG);
  });

  describe('Chart of Accounts', () => {
    it('creates an account', async () => {
      const res = await agent.post('/api/v1/finance/accounts').send({
        accountCode: '1000',
        accountName: 'Cash',
        accountType: 'asset'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.accountCode).toBe('1000');
    });

    it('rejects invalid accountType', async () => {
      const res = await agent.post('/api/v1/finance/accounts').send({
        accountCode: '1001',
        accountName: 'Mystery',
        accountType: 'invalid'
      });
      expect(res.status).toBe(400);
    });

    it('lists accounts with pagination metadata', async () => {
      await agent.post('/api/v1/finance/accounts').send({ accountCode:'1000', accountName:'Cash', accountType:'asset' });
      await agent.post('/api/v1/finance/accounts').send({ accountCode:'2000', accountName:'Loan', accountType:'liability' });
      const res = await agent.get('/api/v1/finance/accounts?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('Journal Entries', () => {
    it('creates a balanced journal entry', async () => {
      const res = await agent.post('/api/v1/finance/journal-entries').send({
        date: new Date().toISOString(),
        description: 'Initial capital',
        lines: [
          { accountCode: '1000', description: 'Cash in', debit: 1000, credit: 0 },
          { accountCode: '3000', description: 'Capital',  debit: 0,    credit: 1000 }
        ]
      });
      expect(res.status).toBe(201);
      expect(res.body.data.entryNumber).toMatch(/^JNL-/);
    });

    it('rejects unbalanced journal entry', async () => {
      const res = await agent.post('/api/v1/finance/journal-entries').send({
        date: new Date().toISOString(),
        description: 'Bad entry',
        lines: [
          { accountCode: '1000', debit: 500, credit: 0 },
          { accountCode: '3000', debit: 0,   credit: 999 }
        ]
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Invoices', () => {
    it('creates an invoice with computed totals', async () => {
      const res = await agent.post('/api/v1/ar/invoices').send({
        customerName: 'Test Client',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        lines: [
          { description: 'Consulting', quantity: 5, unitPrice: 100, amount: 500, taxRate: 20 }
        ]
      });
      expect(res.status).toBe(201);
      expect(res.body.data.invoiceNumber).toMatch(/^INV-/);
      expect(res.body.data.subtotal).toBe(500);
      expect(res.body.data.taxAmount).toBe(100);
      expect(res.body.data.totalAmount).toBe(600);
    });

    it('lists invoices with pagination', async () => {
      await agent.post('/api/v1/ar/invoices').send({
        customerName: 'Client A',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        lines: [{ description: 'Work', quantity: 1, unitPrice: 100, amount: 100, taxRate: 0 }]
      });
      const res = await agent.get('/api/v1/ar/invoices?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('Financial Reports', () => {
    it('returns trial balance', async () => {
      const res = await agent.get('/api/v1/finance/reports/trial-balance');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns P&L', async () => {
      const res = await agent.get('/api/v1/finance/reports/profit-loss');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('netProfit');
    });

    it('returns balance sheet', async () => {
      const res = await agent.get('/api/v1/finance/reports/balance-sheet');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalAssets');
    });
  });
});
