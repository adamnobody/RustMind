module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'src-tauri'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error', // strict mode, no any
  },
  overrides: [
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'react', message: 'Domain must not depend on React.' },
              { name: '@xyflow/react', message: 'Domain must not depend on canvas UI.' },
              { name: 'zustand', message: 'Domain must not depend on store infrastructure.' },
            ],
            patterns: [
              {
                group: ['@tauri-apps/*', '../../features/*', '../../shared/*', '../../store/*'],
                message: 'Domain must not depend on infrastructure or features.',
              },
            ],
          },
        ],
      },
    },
  ],
};
