import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('readProxyEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.all_proxy;
    delete process.env.no_proxy;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rewrites loopback docker proxy hosts to host.docker.internal', async () => {
    process.env.HTTP_PROXY = 'http://127.0.0.1:7897';
    process.env.HTTPS_PROXY = 'http://localhost:7897';

    const { readProxyEnv } = await import('./env.js');
    const proxyEnv = readProxyEnv();

    expect(proxyEnv.HTTP_PROXY).toBe('http://host.docker.internal:7897/');
    expect(proxyEnv.HTTPS_PROXY).toBe('http://host.docker.internal:7897/');
  });

  it('does not rewrite NO_PROXY or non-loopback hosts', async () => {
    process.env.HTTP_PROXY = 'http://10.0.0.5:7897';
    process.env.NO_PROXY = '127.0.0.1,localhost,.internal';

    const { readProxyEnv } = await import('./env.js');
    const proxyEnv = readProxyEnv();

    expect(proxyEnv.HTTP_PROXY).toBe('http://10.0.0.5:7897');
    expect(proxyEnv.NO_PROXY).toBe('127.0.0.1,localhost,.internal');
  });
});