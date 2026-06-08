import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { rateLimiter } from './rateLimiter.js';

describe('rateLimiter middleware', () => {
  it('allows requests within limits', async () => {
    const app = new Hono();
    app.use('/api/*', rateLimiter);
    app.get('/api/test', (c) => c.text('ok'));

    const response = await app.request('/api/test', {
      headers: { 'x-forwarded-for': '1.1.1.1' }
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });

  it('enforces aggressive limit on auth endpoints', async () => {
    const app = new Hono();
    app.use('/api/*', rateLimiter);
    app.post('/api/auth/login', (c) => c.text('logged in'));

    // Send 5 requests (the limit is 5)
    for (let i = 0; i < 5; i++) {
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '2.2.2.2' }
      });
      expect(response.status).toBe(200);
    }

    // 6th request should fail with 429
    const response429 = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '2.2.2.2' }
    });
    expect(response429.status).toBe(429);
    
    const body = await response429.json() as any;
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toContain('Too many requests on auth endpoints');
    expect(body.retryAfter).toBeDefined();
    expect(response429.headers.get('Retry-After')).toBeDefined();
  });

  it('enforces normal limit on general endpoints', async () => {
    const app = new Hono();
    app.use('/api/*', rateLimiter);
    app.get('/api/media', (c) => c.text('media list'));

    // Send 60 requests (the limit is 60)
    for (let i = 0; i < 60; i++) {
      const response = await app.request('/api/media', {
        headers: { 'x-forwarded-for': '3.3.3.3' }
      });
      expect(response.status).toBe(200);
    }

    // 61st request should fail with 429
    const response429 = await app.request('/api/media', {
      headers: { 'x-forwarded-for': '3.3.3.3' }
    });
    expect(response429.status).toBe(429);
  });
});
