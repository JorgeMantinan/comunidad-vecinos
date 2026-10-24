import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/drizzle/**',
      '**/.pglite/**',
      '**/.vercel/**',
      // Función serverless generada por tsup (pnpm build).
      '**/apps/api/api/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
  {
    // Scripts de consola (servidor y CLI de base de datos).
    files: [
      '**/src/server.ts',
      '**/src/db/migrate.ts',
      '**/src/db/seed.ts',
      '**/src/test/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
);
