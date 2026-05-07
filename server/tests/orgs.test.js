require('./setup');
const request = require('supertest');
const app     = require('../src/app');

const REG = { name: 'Owner User', email: 'owner@example.com', password: 'password123', orgName: 'Acme Ltd' };
const MEMBER = { name: 'Member', email: 'member@example.com', password: 'password123', orgName: 'Other Org' };

describe('Organisation routes', () => {
  let agent;
  let orgId;

  beforeEach(async () => {
    agent = request.agent(app);
    const res = await agent.post('/api/v1/auth/register').send(REG);
    orgId = res.body.data.org._id;
  });

  describe('GET /api/v1/orgs', () => {
    it('returns org for authenticated owner', async () => {
      const res = await agent.get('/api/v1/orgs');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Acme Ltd');
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/orgs');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/orgs', () => {
    it('updates org name and settings', async () => {
      const res = await agent.put('/api/v1/orgs').send({ name: 'Acme Updated', currency: 'USD' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Acme Updated');
      expect(res.body.data.currency).toBe('USD');
    });

    it('rejects invalid currency length', async () => {
      const res = await agent.put('/api/v1/orgs').send({ currency: 'TOOLONG' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/orgs/invites', () => {
    it('creates invite and returns invite URL', async () => {
      const res = await agent.post('/api/v1/orgs/invites')
        .send({ email: 'invite@example.com', role: 'accountant' });
      expect(res.status).toBe(201);
      expect(res.body.data.inviteUrl).toContain('token=');
    });

    it('rejects invalid role', async () => {
      const res = await agent.post('/api/v1/orgs/invites')
        .send({ email: 'invite@example.com', role: 'superuser' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid email', async () => {
      const res = await agent.post('/api/v1/orgs/invites')
        .send({ email: 'not-an-email', role: 'accountant' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/orgs/members', () => {
    it('lists org members', async () => {
      const res = await agent.get('/api/v1/orgs/members');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].role).toBe('owner');
    });
  });

  describe('GET /api/v1/orgs/plan', () => {
    it('returns plan info with usage', async () => {
      const res = await agent.get('/api/v1/orgs/plan');
      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe('free');
      expect(res.body.data.usage).toBeDefined();
      expect(res.body.data.limits).toBeDefined();
    });
  });
});
