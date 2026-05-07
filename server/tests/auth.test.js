require('./setup');
const request = require('supertest');
const app     = require('../src/app');

const VALID_REG = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  password: 'password123',
  orgName: 'Test Corp'
};

describe('POST /api/v1/auth/register', () => {
  it('creates user and org, returns 201', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(VALID_REG);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.org.name).toBe('Test Corp');
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_REG);
    const res = await request(app).post('/api/v1/auth/register').send(VALID_REG);
    expect(res.status).toBe(409);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ ...VALID_REG, email: 'bob@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects missing orgName with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_REG);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: VALID_REG.email, password: VALID_REG.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(VALID_REG.email);
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: VALID_REG.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user info when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(VALID_REG);
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(VALID_REG.email);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_REG);
  });

  it('returns 200 for known email', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password')
      .send({ email: VALID_REG.email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body._devResetUrl).toBeDefined();
  });

  it('returns 200 for unknown email (no enumeration)', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  let resetToken;

  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_REG);
    const res = await request(app).post('/api/v1/auth/forgot-password')
      .send({ email: VALID_REG.email });
    const url = new URL(res.body._devResetUrl);
    resetToken = url.searchParams.get('token');
  });

  it('resets password with valid token', async () => {
    const resetRes = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'newpassword456' });
    expect(resetRes.status).toBe(200);

    const loginRes = await request(app).post('/api/v1/auth/login')
      .send({ email: VALID_REG.email, password: 'newpassword456' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects invalid token with 400', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: 'badtoken', password: 'newpassword456' });
    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'short' });
    expect(res.status).toBe(400);
  });
});
