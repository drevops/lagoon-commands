const html = require('eslint-plugin-html');

module.exports = [
  {
    files: ['**/*.html'],
    plugins: { html },
  },
  {
    files: ['**/*.js', '**/*.html'],
    rules: {
      'no-unused-vars': ['warn', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'caughtErrorsIgnorePattern': '^_' }],
      'no-undef': 'off',
      'no-redeclare': 'warn',
    },
  },
];
