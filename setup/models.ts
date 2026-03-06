import os from 'os';

import { CopilotClient } from '@github/copilot-sdk';

import { readEnvFile, readProxyEnv } from '../src/env.js';
import { logger } from '../src/logger.js';
import { emitStatus } from './status.js';

export async function run(_args: string[]): Promise<void> {
  const envVars = readEnvFile(['GITHUB_TOKEN', 'GH_TOKEN']);
  const githubToken =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    envVars.GITHUB_TOKEN ||
    envVars.GH_TOKEN;

  if (!githubToken) {
    emitStatus('MODELS', {
      STATUS: 'failed',
      ERROR: 'missing_github_token',
      HINT: 'Set GITHUB_TOKEN or GH_TOKEN in .env before listing models.',
    });
    process.exit(1);
  }

  const proxyEnv = readProxyEnv();

  const client = new CopilotClient({
    logLevel: 'info',
    cwd: process.cwd(),
    githubToken,
    env: {
      HOME: process.env.HOME || os.homedir(),
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
      LANG: process.env.LANG || 'C.UTF-8',
      ...proxyEnv,
    },
  });

  try {
    await client.start();
    const models = await client.listModels();
    const modelIds = models.map((model) => model.id).sort();

    emitStatus('MODELS', {
      STATUS: 'success',
      COUNT: modelIds.length,
      MODELS: modelIds.join(','),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Failed to list Copilot models');
    emitStatus('MODELS', {
      STATUS: 'failed',
      ERROR: message,
      HINT: 'If models.list is unavailable for your current Copilot auth, run a normal NanoClaw agent turn and check the logs for the "Available models:" line emitted by the agent runner.',
    });
    process.exit(1);
  } finally {
    await client.stop().catch(() => undefined);
  }
}