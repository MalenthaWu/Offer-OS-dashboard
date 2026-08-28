import { defineConfig } from 'vite';

const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  test: {
    environment: 'node',
    restoreMocks: true,
    include: ['tests/{unit,structure}/**/*.test.js'],
  },
});
