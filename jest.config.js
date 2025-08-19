/**
 * Jest Configuration for Puppeteer E2E Testing
 * Aplicación Control de Horarios
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/e2e/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  
  // Test timeout
  testTimeout: 60000,
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Transform files (if needed)
  transform: {},
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/screenshots/',
    '/coverage/'
  ],
  
  // Global variables
  globals: {
    'NODE_ENV': 'test'
  },
  
  // Verbose output
  verbose: true,
  
  // Detect open handles (useful for debugging)
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Maximum concurrent tests
  maxConcurrency: 1,
  
  // Run tests in band (serial execution) for E2E stability
  runInBand: true
};