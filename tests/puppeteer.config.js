/**
 * Puppeteer configuration for E2E testing
 * Aplicación Control de Horarios
 */

const config = {
  launch: {
    headless: process.env.HEADLESS === 'true',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 50,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  },
  
  // URLs de la aplicación
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:8000/api',
  
  // Timeouts
  timeout: 30000,
  waitTimeout: 5000,
  
  // Test users
  testUsers: {
    admin: {
      email: 'admin@example.com',
      password: 'password'
    },
    user: {
      email: 'user@example.com', 
      password: 'userpassword'
    }
  },
  
  // Selectores comunes
  selectors: {
    // Login page
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    loginButton: 'button[type="submit"]',
    logoutButton: '[data-testid="logout-button"]',
    
    // Navigation
    sidebar: '.sidebar',
    dashboardLink: '[data-testid="nav-dashboard"]',
    employeeLink: '[data-testid="nav-employees"]',
    calendarLink: '[data-testid="nav-calendar"]',
    adminLink: '[data-testid="nav-admin"]',
    
    // Forms
    submitButton: 'button[type="submit"]',
    cancelButton: 'button[type="button"]',
    
    // Messages
    errorMessage: '.error-message, .alert-error',
    successMessage: '.success-message, .alert-success',
    loadingSpinner: '.loading, .spinner'
  }
};

module.exports = config;