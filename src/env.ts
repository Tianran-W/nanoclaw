import fs from 'fs';
import path from 'path';
import { CONTAINER_RUNTIME_BIN } from './container-runtime.js';
import { logger } from './logger.js';

const PROXY_ENV_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
  'no_proxy',
];

const CONTAINER_PROXY_KEYS = new Set([
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
]);

function rewriteLoopbackProxyForContainer(
  value: string,
  runtimeBin: string = CONTAINER_RUNTIME_BIN,
): string {
  if (runtimeBin !== 'docker') {
    return value;
  }

  try {
    const url = new URL(value);
    if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
      return value;
    }

    url.hostname = 'host.docker.internal';
    return url.toString();
  } catch {
    return value;
  }
}

/**
 * Parse the .env file and return values for the requested keys.
 * Does NOT load anything into process.env — callers decide what to
 * do with the values. This keeps secrets out of the process environment
 * so they don't leak to child processes.
 */
export function readEnvFile(keys: string[]): Record<string, string> {
  const envFile = path.join(process.cwd(), '.env');
  let content: string;
  try {
    content = fs.readFileSync(envFile, 'utf-8');
  } catch (err) {
    logger.debug({ err }, '.env file not found, using defaults');
    return {};
  }

  const result: Record<string, string> = {};
  const wanted = new Set(keys);

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!wanted.has(key)) continue;
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) result[key] = value;
  }

  return result;
}

export function readProxyEnv(): Record<string, string> {
  const envFileValues = readEnvFile(PROXY_ENV_KEYS);
  const result: Record<string, string> = {};

  for (const key of PROXY_ENV_KEYS) {
    const value = process.env[key] || envFileValues[key];
    if (value) {
      result[key] = CONTAINER_PROXY_KEYS.has(key)
        ? rewriteLoopbackProxyForContainer(value)
        : value;
    }
  }

  return result;
}

export const __testUtils = {
  rewriteLoopbackProxyForContainer,
};
