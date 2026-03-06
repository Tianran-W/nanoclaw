import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'setup/**/*.test.ts',
      'skills-engine/**/*.test.ts',
      '.claude/skills/add-github-copilot-sdk/tests/**/*.test.ts',
    ],
  },
});
