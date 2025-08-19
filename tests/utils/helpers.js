/**
 * Test utilities and helpers for Puppeteer E2E tests
 * Aplicación Control de Horarios
 */

const config = require('../puppeteer.config');

class TestHelpers {
  constructor(page) {
    this.page = page;
    this.config = config;
  }

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateTo(path = '') {
    const url = `${this.config.baseUrl}${path}`;
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: this.config.timeout
    });
  }

  /**
   * Wait for an element to be visible and return it
   */
  async waitForElement(selector, timeout = this.config.waitTimeout) {
    return await this.page.waitForSelector(selector, {
      visible: true,
      timeout
    });
  }

  /**
   * Wait for text to appear on the page
   */
  async waitForText(text, timeout = this.config.waitTimeout) {
    await this.page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      { timeout },
      text
    );
  }

  /**
   * Fill form field by selector
   */
  async fillField(selector, value) {
    await this.page.waitForSelector(selector, { visible: true });
    await this.page.click(selector, { clickCount: 3 }); // Select all text
    await this.page.type(selector, value);
  }

  /**
   * Login with provided credentials
   */
  async login(email, password) {
    await this.navigateTo('/login');
    
    await this.fillField(this.config.selectors.emailInput, email);
    await this.fillField(this.config.selectors.passwordInput, password);
    
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(this.config.selectors.loginButton)
    ]);
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    const { email, password } = this.config.testUsers.admin;
    await this.login(email, password);
  }

  /**
   * Login as regular user
   */
  async loginAsUser() {
    const { email, password } = this.config.testUsers.user;
    await this.login(email, password);
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      await this.page.click(this.config.selectors.logoutButton);
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch (error) {
      console.warn('Logout button not found, might already be logged out');
    }
  }

  /**
   * Check if user is authenticated (on main page)
   */
  async isAuthenticated() {
    try {
      await this.waitForElement(this.config.selectors.sidebar, 2000);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Additional buffer
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshots/${name}-${timestamp}.png`;
    await this.page.screenshot({ 
      path: filename,
      fullPage: true 
    });
    console.log(`Screenshot saved: ${filename}`);
  }

  /**
   * Check for error messages on the page
   */
  async hasErrorMessage() {
    try {
      await this.waitForElement(this.config.selectors.errorMessage, 2000);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for success messages on the page
   */
  async hasSuccessMessage() {
    try {
      await this.waitForElement(this.config.selectors.successMessage, 2000);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get text content from an element
   */
  async getTextContent(selector) {
    const element = await this.waitForElement(selector);
    return await this.page.evaluate(el => el.textContent, element);
  }

  /**
   * Click and wait for navigation
   */
  async clickAndWaitForNavigation(selector) {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(selector)
    ]);
  }

  /**
   * Wait for API request to complete
   */
  async waitForApiRequest(urlPattern) {
    return new Promise((resolve) => {
      this.page.on('response', (response) => {
        if (response.url().includes(urlPattern)) {
          resolve(response);
        }
      });
    });
  }

  /**
   * Navigate using sidebar
   */
  async navigateToSection(section) {
    const sectionMap = {
      'dashboard': this.config.selectors.dashboardLink,
      'employees': this.config.selectors.employeeLink,
      'calendar': this.config.selectors.calendarLink,
      'admin': this.config.selectors.adminLink
    };

    const selector = sectionMap[section];
    if (selector) {
      await this.clickAndWaitForNavigation(selector);
    } else {
      throw new Error(`Unknown section: ${section}`);
    }
  }
}

/**
 * Initialize Puppeteer browser and page
 */
async function setupBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch(config.launch);
  const page = await browser.newPage();
  
  // Setup page
  await page.setViewport(config.launch.defaultViewport);
  
  // Listen to console messages for debugging
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('PAGE ERROR:', msg.text());
    }
  });

  // Listen to page errors
  page.on('pageerror', (error) => {
    console.error('PAGE ERROR:', error.message);
  });

  return { browser, page };
}

/**
 * Cleanup browser and page
 */
async function teardownBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}

module.exports = {
  TestHelpers,
  setupBrowser,
  teardownBrowser,
  config
};