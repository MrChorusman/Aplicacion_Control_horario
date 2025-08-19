/**
 * Jest setup file for E2E tests
 * Global test configuration and utilities
 */

// Increase timeout for all tests
jest.setTimeout(60000);

// Global test variables
global.TEST_CONFIG = {
  // Retry configuration
  maxRetries: 2,
  retryDelay: 1000,
  
  // Screenshot configuration
  screenshotsEnabled: process.env.SCREENSHOTS !== 'false',
  screenshotPath: 'screenshots',
  
  // Application URLs
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:8000/api',
  
  // Test data
  testData: {
    admin: {
      email: 'admin@example.com',
      password: 'password'
    },
    user: {
      email: 'user@example.com',
      password: 'userpassword'
    },
    testEmployee: {
      team_name: 'Desarrollo E2E',
      full_name: 'Test Usuario E2E',
      hours_mon_thu: '8.0',
      hours_fri: '6.0',
      vacation_days: '22',
      free_hours: '40'
    }
  }
};

// Global setup function
beforeAll(async () => {
  console.log('🚀 Starting E2E Test Suite');
  console.log(`📍 Base URL: ${global.TEST_CONFIG.baseUrl}`);
  console.log(`🔧 API URL: ${global.TEST_CONFIG.apiUrl}`);
  
  // Create screenshots directory
  const fs = require('fs').promises;
  try {
    await fs.mkdir(global.TEST_CONFIG.screenshotPath, { recursive: true });
    console.log(`📸 Screenshots directory created: ${global.TEST_CONFIG.screenshotPath}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.warn('⚠️ Could not create screenshots directory:', error.message);
    }
  }
});

// Global teardown function
afterAll(async () => {
  console.log('🏁 E2E Test Suite Complete');
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Utility function to retry failed operations
global.retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`⚠️ Operation failed, retrying... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Utility function to wait
global.wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Custom matchers (if needed)
expect.extend({
  toBeVisible: async function(element) {
    const isVisible = await element.isVisible?.() || false;
    return {
      message: () => `expected element to ${this.isNot ? 'not ' : ''}be visible`,
      pass: isVisible
    };
  }
});

console.log('✅ Jest setup complete');