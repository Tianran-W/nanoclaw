import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./container-runtime.js', async () => {
  const actual = await vi.importActual<typeof import('./container-runtime.js')>(
    './container-runtime.js',
  );

  return {
    ...actual,
    usesHostNetwork: vi.fn(() => true),
  };
});

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

  it('keeps loopback docker proxy hosts unchanged in host network mode', async () => {
    process.env.http_proxy = 'http://127.0.0.1:7897';
    process.env.https_proxy = 'http://localhost:7897';

    const { readProxyEnv } = await import('./env.js');
    const proxyEnv = readProxyEnv();

    expect(proxyEnv.HTTP_PROXY).toBe('http://127.0.0.1:7897');
    expect(proxyEnv.http_proxy).toBe('http://127.0.0.1:7897');
    expect(proxyEnv.HTTPS_PROXY).toBe('http://localhost:7897');
    expect(proxyEnv.https_proxy).toBe('http://localhost:7897');
  });

  it('does not rewrite NO_PROXY or non-loopback hosts', async () => {
    process.env.http_proxy = 'http://10.0.0.5:7897';
    process.env.no_proxy = '127.0.0.1,localhost,.internal';

    const { readProxyEnv } = await import('./env.js');
    const proxyEnv = readProxyEnv();

    expect(proxyEnv.HTTP_PROXY).toBe('http://10.0.0.5:7897');
    expect(proxyEnv.http_proxy).toBe('http://10.0.0.5:7897');
    expect(proxyEnv.NO_PROXY).toBe('127.0.0.1,localhost,.internal');
    expect(proxyEnv.no_proxy).toBe('127.0.0.1,localhost,.internal');
  });
});
