module.exports = {
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'import/extensions': [
      { js: 'always' },
    ],
  },
  extends: [
    'airbnb-base',
  ],
};
