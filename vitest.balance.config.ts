import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tools/**/*.sim.ts'], testTimeout: 600_000, silent: false },
});
