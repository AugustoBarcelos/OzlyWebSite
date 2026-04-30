// Flat config (ESLint 9). Bans dangerouslySetInnerHTML and eval per BRIEFING § 4.
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    // dist-node-types/ holds TS-emitted .d.ts files for vite.config etc — they
    // use `const` outside the parser's module-source scope and the rule fires
    // a false-positive "Unexpected token const" parsing error. They're build
    // artifacts; lint them when we lint the source they're emitted from.
    ignores: [
      'dist/**',
      'dist-node-types/**',
      'node_modules/**',
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
        // React types (React.ChangeEvent, etc) — the new JSX transform skips
        // the runtime import but referencing the namespace still needs the
        // identifier known to no-undef.
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

      // BRIEFING § 4 banned list — hard ban via AST selectors.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'dangerouslySetInnerHTML is banned (BRIEFING § 4). Use safe React rendering.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval() is banned (BRIEFING § 4).',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'new Function() is banned (BRIEFING § 4).',
        },
        {
          selector:
            "CallExpression[callee.name='setTimeout'][arguments.0.type='Literal']",
          message: 'setTimeout(string) is banned (BRIEFING § 4). Pass a function.',
        },
      ],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // `'` and `"` inside copy render fine — escaping them is a style quirk.
      // Saves us peppering JSX with &apos; / &quot; for legitimate prose.
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
