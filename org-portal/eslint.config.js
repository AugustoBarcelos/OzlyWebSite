// Flat config (ESLint 9). Mirrors admin-portal/eslint.config.js so the bar
// is identical across both portals. Bans dangerouslySetInnerHTML + eval +
// new Function() + setTimeout(string) per the shared security briefing.
//
// Why a local config (instead of inheriting the root eslint.config.js):
// the CI workflow runs `npm ci` inside org-portal/ only, so @eslint/js is
// installed under org-portal/node_modules. ESLint's config resolution walks
// upward and would otherwise pick up the root config, which fails to import
// @eslint/js because the root's node_modules isn't populated in CI.
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      'dist-node-types/**',
      'node_modules/**',
      'supabase/**',
      'functions/**',
      'e2e/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        crypto: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: '19' },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'dangerouslySetInnerHTML is banned. Use safe React rendering.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval() is banned.',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'new Function() is banned.',
        },
        {
          selector:
            "CallExpression[callee.name='setTimeout'][arguments.0.type='Literal']",
          message: 'setTimeout(string) is banned. Pass a function.',
        },
      ],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
