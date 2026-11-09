// TESTING LAB: Jest configuration (replaces the Vitest runner used by `ng test`).
const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  // jest-preset-angular compiles Angular components/templates and runs them in jsdom.
  ...createCjsPreset({ tsconfig: '<rootDir>/tsconfig.spec.json' }),

  // Loads zone.js + Angular's TestBed environment once, before every test file.
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  // Test files live next to the code they test: foo.ts → foo.spec.ts.
  testMatch: ['<rootDir>/src/**/*.spec.ts'],

  // Use the development environment in tests, like `ng serve` does (Jest doesn't read
  // angular.json's fileReplacements, so this does the same swap).
  moduleNameMapper: {
    '^(.*)/environments/environment$': '<rootDir>/src/environments/environment.development.ts',
  },

  // Reset every jest.fn()/spy between tests so tests never leak into each other.
  clearMocks: true,
  restoreMocks: true,

  // Coverage: measure all app code, but not the tests themselves.
  collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.spec.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'text', 'html'],

  // Minimum coverage — `npm run test:coverage` fails if the suite drops below these.
  coverageThreshold: {
    global: { statements: 90, branches: 80, functions: 90, lines: 90 },
  },
};
