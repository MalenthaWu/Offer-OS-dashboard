import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    restoreMocks: true,
    include: ['tests/{unit,structure}/**/*.test.js'],
  },
});
