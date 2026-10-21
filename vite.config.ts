import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // o cache de módulos em disco não percebe arquivos novos em import.meta.glob
    // (registro automático de Coringas), então fica desligado
    fsModuleCache: false,
  },
});
