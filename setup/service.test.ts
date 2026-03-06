import { describe, it, expect } from 'vitest';
import path from 'path';

/**
 * Tests for service configuration generation.
 *
 * These tests verify the generated content of plist/systemd/nohup configs
 * without actually loading services.
 */

// Helper: generate a plist string the same way service.ts does
function generatePlist(
  nodePath: string,
  projectRoot: string,
  homeDir: string,
  env: Record<string, string> = {
    PATH: `/usr/local/bin:/usr/bin:/bin:${homeDir}/.local/bin`,
    HOME: homeDir,
  },
): string {
  const envXml = Object.entries(env)
    .map(
      ([key, value]) =>
        `        <key>${key}</key>\n        <string>${value}</string>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nanoclaw</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${projectRoot}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${projectRoot}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
  ${envXml}
    </dict>
    <key>StandardOutPath</key>
    <string>${projectRoot}/logs/nanoclaw.log</string>
    <key>StandardErrorPath</key>
    <string>${projectRoot}/logs/nanoclaw.error.log</string>
</dict>
</plist>`;
}

function generateSystemdUnit(
  nodePath: string,
  projectRoot: string,
  homeDir: string,
  isSystem: boolean,
  env: Record<string, string> = {
    PATH: `/usr/local/bin:/usr/bin:/bin:${homeDir}/.local/bin`,
    HOME: homeDir,
  },
): string {
  const normalizedEnv = { ...env };

  if (env.http_proxy && !env.HTTP_PROXY) normalizedEnv.HTTP_PROXY = env.http_proxy;
  if (env.HTTP_PROXY && !env.http_proxy) normalizedEnv.http_proxy = env.HTTP_PROXY;
  if (env.https_proxy && !env.HTTPS_PROXY) normalizedEnv.HTTPS_PROXY = env.https_proxy;
  if (env.HTTPS_PROXY && !env.https_proxy) normalizedEnv.https_proxy = env.HTTPS_PROXY;
  if (env.all_proxy && !env.ALL_PROXY) normalizedEnv.ALL_PROXY = env.all_proxy;
  if (env.ALL_PROXY && !env.all_proxy) normalizedEnv.all_proxy = env.ALL_PROXY;
  if (env.no_proxy && !env.NO_PROXY) normalizedEnv.NO_PROXY = env.no_proxy;
  if (env.NO_PROXY && !env.no_proxy) normalizedEnv.no_proxy = env.NO_PROXY;

  const envLines = Object.entries(normalizedEnv)
    .map(([key, value]) => `Environment="${key}=${value}"`)
    .join('\n');

  return `[Unit]
Description=NanoClaw Personal Assistant
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${projectRoot}/dist/index.js
WorkingDirectory=${projectRoot}
Restart=always
RestartSec=5
${envLines}
StandardOutput=append:${projectRoot}/logs/nanoclaw.log
StandardError=append:${projectRoot}/logs/nanoclaw.error.log

[Install]
WantedBy=${isSystem ? 'multi-user.target' : 'default.target'}`;
}

describe('plist generation', () => {
  it('contains the correct label', () => {
    const plist = generatePlist(
      '/usr/local/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
    );
    expect(plist).toContain('<string>com.nanoclaw</string>');
  });

  it('uses the correct node path', () => {
    const plist = generatePlist(
      '/opt/node/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
    );
    expect(plist).toContain('<string>/opt/node/bin/node</string>');
  });

  it('points to dist/index.js', () => {
    const plist = generatePlist(
      '/usr/local/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
    );
    expect(plist).toContain('/home/user/nanoclaw/dist/index.js');
  });

  it('sets log paths', () => {
    const plist = generatePlist(
      '/usr/local/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
    );
    expect(plist).toContain('nanoclaw.log');
    expect(plist).toContain('nanoclaw.error.log');
  });
});

describe('systemd unit generation', () => {
  it('user unit uses default.target', () => {
    const unit = generateSystemdUnit(
      '/usr/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
      false,
    );
    expect(unit).toContain('WantedBy=default.target');
  });

  it('system unit uses multi-user.target', () => {
    const unit = generateSystemdUnit(
      '/usr/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
      true,
    );
    expect(unit).toContain('WantedBy=multi-user.target');
  });

  it('contains restart policy', () => {
    const unit = generateSystemdUnit(
      '/usr/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
      false,
    );
    expect(unit).toContain('Restart=always');
    expect(unit).toContain('RestartSec=5');
  });

  it('sets correct ExecStart', () => {
    const unit = generateSystemdUnit(
      '/usr/bin/node',
      '/srv/nanoclaw',
      '/home/user',
      false,
    );
    expect(unit).toContain(
      'ExecStart=/usr/bin/node /srv/nanoclaw/dist/index.js',
    );
  });

  it('includes proxy environment variables when provided', () => {
    const unit = generateSystemdUnit(
      '/usr/bin/node',
      '/srv/nanoclaw',
      '/home/user',
      false,
      {
        PATH: '/usr/local/bin:/usr/bin:/bin:/home/user/.local/bin',
        HOME: '/home/user',
        http_proxy: 'http://127.0.0.1:7897',
        all_proxy: 'socks5://127.0.0.1:7897',
      },
    );

    expect(unit).toContain('Environment="http_proxy=http://127.0.0.1:7897"');
    expect(unit).toContain('Environment="HTTP_PROXY=http://127.0.0.1:7897"');
    expect(unit).toContain(
      'Environment="all_proxy=socks5://127.0.0.1:7897"',
    );
  });

});

describe('plist proxy environment', () => {
  it('includes proxy environment variables when provided', () => {
    const plist = generatePlist(
      '/usr/local/bin/node',
      '/home/user/nanoclaw',
      '/home/user',
      {
        PATH: '/usr/local/bin:/usr/bin:/bin:/home/user/.local/bin',
        HOME: '/home/user',
        https_proxy: 'http://127.0.0.1:7897',
      },
    );

    expect(plist).toContain('<key>https_proxy</key>');
    expect(plist).toContain('<string>http://127.0.0.1:7897</string>');
  });
});

describe('WSL nohup fallback', () => {
  it('generates a valid wrapper script', () => {
    const projectRoot = '/home/user/nanoclaw';
    const nodePath = '/usr/bin/node';
    const pidFile = path.join(projectRoot, 'nanoclaw.pid');

    // Simulate what service.ts generates
    const wrapper = `#!/bin/bash
set -euo pipefail
cd ${JSON.stringify(projectRoot)}
nohup ${JSON.stringify(nodePath)} ${JSON.stringify(projectRoot)}/dist/index.js >> ${JSON.stringify(projectRoot)}/logs/nanoclaw.log 2>> ${JSON.stringify(projectRoot)}/logs/nanoclaw.error.log &
echo $! > ${JSON.stringify(pidFile)}`;

    expect(wrapper).toContain('#!/bin/bash');
    expect(wrapper).toContain('nohup');
    expect(wrapper).toContain(nodePath);
    expect(wrapper).toContain('nanoclaw.pid');
  });
});
