/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    // @stellar/stellar-sdk advertises an ESM "default" export condition.
    // Prefer its CommonJS build so ts-jest (which emits CJS) can load it.
    customExportConditions: ['node', 'require', 'default'],
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
    // @stellar/stellar-sdk's CommonJS build depends on a few ESM-only
    // packages; babel-jest compiles those to CommonJS for the test runtime.
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@stellar|@exodus|uint8array-extras|@noble)/)',
  ],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
};
