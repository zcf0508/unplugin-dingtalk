import antfu from '@antfu/eslint-config';
import pluginSecurity from 'eslint-plugin-security';

export default antfu({
  typescript: true,
}, [
  pluginSecurity.configs.recommended,
  {
    ignores: [
      'playground',
    ],
  },
  {
    rules: {
      'curly': ['error', 'all'],
      'style/brace-style': 'error',
      'style/multiline-ternary': ['error', 'always'],
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': [
        'warn',
        { args: 'after-used', argsIgnorePattern: '^_', vars: 'all', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn'],
      'style/semi': ['error', 'always'],
      'style/indent': ['error', 2, { SwitchCase: 1 }],
      'style/max-len': [
        'error',
        {
          code: 120,
          tabWidth: 2,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreUrls: true,
        },
      ],
      'comma-dangle': ['error', 'always-multiline'],
      'style/quotes': ['error', 'single'],
    },
  },
]);
