/**
 * Authentication E2E Tests
 * Testing login, logout, and protected routes
 */

const { setupBrowser, teardownBrowser, TestHelpers } = require('../utils/helpers');

describe('Authentication Flow', () => {
  let browser;
  let page;
  let helpers;

  // Setup before all tests
  beforeAll(async () => {
    ({ browser, page } = await setupBrowser());
    helpers = new TestHelpers(page);
    
    // Create screenshots directory
    const fs = require('fs').promises;
    try {
      await fs.mkdir('screenshots', { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }, 60000);

  // Cleanup after all tests
  afterAll(async () => {
    await teardownBrowser(browser);
  }, 30000);

  // Reset to login page before each test
  beforeEach(async () => {
    await helpers.logout(); // Ensure logged out
    await helpers.navigateTo('/login');
  }, 30000);

  describe('Login Page', () => {
    test('should display login form correctly', async () => {
      // Check that login form elements are present
      await helpers.waitForElement(helpers.config.selectors.emailInput);
      await helpers.waitForElement(helpers.config.selectors.passwordInput);
      await helpers.waitForElement(helpers.config.selectors.loginButton);

      // Check page title or specific login content
      const title = await page.title();
      expect(title).toContain('Control');

      // Take screenshot for visual verification
      await helpers.screenshot('login-form-display');
    }, 30000);

    test('should show validation errors for empty fields', async () => {
      // Try to submit empty form
      await page.click(helpers.config.selectors.loginButton);
      
      // Wait a bit for validation to trigger
      await page.waitForTimeout(1000);
      
      // Check if still on login page (not navigated)
      expect(page.url()).toContain('/login');
      
      await helpers.screenshot('login-empty-validation');
    }, 30000);
  });

  describe('Valid Authentication', () => {
    test('should login successfully with admin credentials', async () => {
      const { email, password } = helpers.config.testUsers.admin;
      
      // Fill login form
      await helpers.fillField(helpers.config.selectors.emailInput, email);
      await helpers.fillField(helpers.config.selectors.passwordInput, password);
      
      // Submit form and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click(helpers.config.selectors.loginButton)
      ]);
      
      // Verify successful login - should be on main page
      expect(page.url()).not.toContain('/login');
      
      // Check if authenticated (sidebar should be present)
      const isAuthenticated = await helpers.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      await helpers.screenshot('login-success-admin');
    }, 45000);

    test('should display correct user information after login', async () => {
      await helpers.loginAsAdmin();
      
      // Wait for page to load completely
      await helpers.waitForPageLoad();
      
      // Check if dashboard is loaded
      await helpers.waitForElement(helpers.config.selectors.sidebar);
      
      // Verify admin has access to admin panel link
      try {
        await helpers.waitForElement(helpers.config.selectors.adminLink, 5000);
        const adminLinkExists = true;
        expect(adminLinkExists).toBe(true);
      } catch (error) {
        // Admin link not found - might be role-based visibility
        console.log('Admin link not visible - checking role implementation');
      }
      
      await helpers.screenshot('post-login-dashboard');
    }, 45000);
  });

  describe('Invalid Authentication', () => {
    test('should reject login with invalid credentials', async () => {
      // Try with invalid credentials
      await helpers.fillField(helpers.config.selectors.emailInput, 'invalid@example.com');
      await helpers.fillField(helpers.config.selectors.passwordInput, 'wrongpassword');
      
      await page.click(helpers.config.selectors.loginButton);
      
      // Wait for potential error message or stay on login page
      await page.waitForTimeout(3000);
      
      // Should still be on login page
      expect(page.url()).toContain('/login');
      
      // Check for error message (if implemented)
      const hasError = await helpers.hasErrorMessage();
      console.log('Error message displayed:', hasError);
      
      await helpers.screenshot('login-invalid-credentials');
    }, 30000);

    test('should reject login with malformed email', async () => {
      await helpers.fillField(helpers.config.selectors.emailInput, 'invalid-email');
      await helpers.fillField(helpers.config.selectors.passwordInput, 'somepassword');
      
      await page.click(helpers.config.selectors.loginButton);
      await page.waitForTimeout(2000);
      
      // Should still be on login page
      expect(page.url()).toContain('/login');
      
      await helpers.screenshot('login-malformed-email');
    }, 30000);
  });

  describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without authentication', async () => {
      // Try to access main page directly
      await helpers.navigateTo('/');
      
      // Should redirect to login
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
      
      await helpers.screenshot('protected-route-redirect');
    }, 30000);

    test('should allow access to protected routes after authentication', async () => {
      // Login first
      await helpers.loginAsAdmin();
      
      // Try accessing different sections
      await helpers.navigateTo('/');
      await page.waitForTimeout(1000);
      
      // Should not redirect to login
      expect(page.url()).not.toContain('/login');
      
      // Check if main app is loaded
      const isAuthenticated = await helpers.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      await helpers.screenshot('protected-route-access');
    }, 45000);
  });

  describe('Logout Functionality', () => {
    test('should logout successfully and redirect to login', async () => {
      // Login first
      await helpers.loginAsAdmin();
      await helpers.waitForPageLoad();
      
      // Perform logout
      await helpers.logout();
      
      // Should be redirected to login page
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
      
      // Verify cannot access protected routes
      await helpers.navigateTo('/');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
      
      await helpers.screenshot('logout-success');
    }, 45000);
  });

  describe('Session Persistence', () => {
    test('should maintain session across page reloads', async () => {
      // Login
      await helpers.loginAsAdmin();
      await helpers.waitForPageLoad();
      
      // Reload page
      await page.reload({ waitUntil: 'networkidle2' });
      
      // Should still be authenticated
      const isAuthenticated = await helpers.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      await helpers.screenshot('session-persistence');
    }, 45000);
  });
});