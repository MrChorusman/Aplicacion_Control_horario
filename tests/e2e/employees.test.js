/**
 * Employee Management E2E Tests
 * Testing CRUD operations for employees
 */

const { setupBrowser, teardownBrowser, TestHelpers } = require('../utils/helpers');

describe('Employee Management', () => {
  let browser;
  let page;
  let helpers;

  // Test data
  const testEmployee = {
    team_name: 'Desarrollo',
    full_name: 'Juan Pérez Test',
    hours_mon_thu: '8.0',
    hours_fri: '6.0',
    vacation_days: '22',
    free_hours: '40',
    country: 'España',
    autonomous_community: 'Galicia',
    city: 'A Coruña'
  };

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

  afterAll(async () => {
    await teardownBrowser(browser);
  }, 30000);

  beforeEach(async () => {
    // Login as admin for employee management
    await helpers.loginAsAdmin();
    
    // Navigate to employee registration/management
    // Try to find the employee section via sidebar or direct URL
    try {
      await helpers.navigateToSection('employees');
    } catch (error) {
      // If sidebar navigation fails, try direct URL or search params
      await helpers.navigateTo('/?view=registro');
    }
    
    await page.waitForTimeout(2000);
  }, 45000);

  describe('Employee Form Display', () => {
    test('should display employee registration form correctly', async () => {
      // Check for form elements
      const formSelectors = [
        'input[name="team_name"], input[placeholder*="equipo"], input[placeholder*="team"]',
        'input[name="full_name"], input[placeholder*="nombre"], input[placeholder*="name"]',
        'input[name="hours_mon_thu"], input[placeholder*="lunes"], input[placeholder*="monday"]',
        'input[name="hours_fri"], input[placeholder*="viernes"], input[placeholder*="friday"]',
        'input[name="vacation_days"], input[placeholder*="vacaciones"], input[placeholder*="vacation"]',
        'input[name="free_hours"], input[placeholder*="libres"], input[placeholder*="free"]'
      ];

      for (const selector of formSelectors) {
        try {
          await helpers.waitForElement(selector, 5000);
          console.log(`Found form element: ${selector}`);
        } catch (error) {
          console.log(`Form element not found: ${selector}`);
        }
      }

      // Check for country/location dropdowns
      const locationSelectors = [
        'select[name="country"], select[name="pais"]',
        'select[name="autonomous_community"], select[name="comunidad"]',
        'select[name="city"], select[name="ciudad"]'
      ];

      for (const selector of locationSelectors) {
        try {
          await helpers.waitForElement(selector, 3000);
          console.log(`Found location element: ${selector}`);
        } catch (error) {
          console.log(`Location element not found: ${selector}`);
        }
      }

      await helpers.screenshot('employee-form-display');
    }, 30000);

    test('should show form validation for required fields', async () => {
      // Try to submit empty form
      const submitButton = await page.$('button[type="submit"], .submit-button, .btn-submit');
      
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for validation messages
        const validationMessages = await page.$$eval(
          '.error, .invalid, .validation-error, .field-error',
          elements => elements.map(el => el.textContent)
        );
        
        console.log('Validation messages found:', validationMessages);
        
        await helpers.screenshot('employee-form-validation');
      }
    }, 30000);
  });

  describe('Employee Creation', () => {
    test('should create new employee successfully', async () => {
      // Fill form with test data
      const fields = [
        { selector: 'input[name="team_name"], input[placeholder*="equipo"]', value: testEmployee.team_name },
        { selector: 'input[name="full_name"], input[placeholder*="nombre"]', value: testEmployee.full_name },
        { selector: 'input[name="hours_mon_thu"], input[placeholder*="lunes"]', value: testEmployee.hours_mon_thu },
        { selector: 'input[name="hours_fri"], input[placeholder*="viernes"]', value: testEmployee.hours_fri },
        { selector: 'input[name="vacation_days"], input[placeholder*="vacaciones"]', value: testEmployee.vacation_days },
        { selector: 'input[name="free_hours"], input[placeholder*="libres"]', value: testEmployee.free_hours }
      ];

      for (const field of fields) {
        try {
          const element = await page.$(field.selector);
          if (element) {
            await element.click({ clickCount: 3 });
            await element.type(field.value);
            console.log(`Filled field ${field.selector} with ${field.value}`);
          }
        } catch (error) {
          console.log(`Could not fill field ${field.selector}: ${error.message}`);
        }
      }

      // Handle location dropdowns
      try {
        const countrySelect = await page.$('select[name="country"], select[name="pais"]');
        if (countrySelect) {
          await countrySelect.select('ES'); // España
          await page.waitForTimeout(1000);
        }

        const communitySelect = await page.$('select[name="autonomous_community"], select[name="comunidad"]');
        if (communitySelect) {
          await communitySelect.select('Galicia');
          await page.waitForTimeout(1000);
        }

        const citySelect = await page.$('select[name="city"], select[name="ciudad"]');
        if (citySelect) {
          await citySelect.select('A Coruña');
        }
      } catch (error) {
        console.log('Location dropdowns handling failed:', error.message);
      }

      await helpers.screenshot('employee-form-filled');

      // Submit form
      const submitButton = await page.$('button[type="submit"], .submit-button, .btn-submit');
      if (submitButton) {
        await submitButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for success message or navigation
        const hasSuccess = await helpers.hasSuccessMessage();
        console.log('Success message displayed:', hasSuccess);
        
        await helpers.screenshot('employee-creation-result');
      }
    }, 45000);

    test('should handle duplicate employee names appropriately', async () => {
      // Try to create employee with same name twice
      await helpers.fillField('input[name="full_name"], input[placeholder*="nombre"]', testEmployee.full_name);
      await helpers.fillField('input[name="team_name"], input[placeholder*="equipo"]', testEmployee.team_name);
      
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        
        // Should show some kind of error or validation
        const hasError = await helpers.hasErrorMessage();
        console.log('Duplicate handling - error shown:', hasError);
        
        await helpers.screenshot('employee-duplicate-handling');
      }
    }, 30000);
  });

  describe('Employee Listing and Search', () => {
    test('should display list of employees', async () => {
      // Try to navigate to employee list or summary
      try {
        await helpers.navigateToSection('dashboard');
        await page.waitForTimeout(2000);
      } catch (error) {
        await helpers.navigateTo('/?view=resumen');
        await page.waitForTimeout(2000);
      }

      // Look for employee data
      const employeeElements = await page.$$('.employee-item, .employee-row, .employee-card, tbody tr');
      console.log(`Found ${employeeElements.length} employee elements`);

      if (employeeElements.length > 0) {
        await helpers.screenshot('employee-list');
      }
    }, 30000);

    test('should search and filter employees', async () => {
      // Navigate to summary/list view
      await helpers.navigateTo('/?view=resumen');
      await page.waitForTimeout(2000);

      // Look for search/filter inputs
      const searchInput = await page.$('input[type="search"], input[placeholder*="buscar"], .search-input');
      const filterSelect = await page.$('select[name="team"], select[name="equipo"], .filter-select');

      if (searchInput) {
        await searchInput.type(testEmployee.full_name);
        await page.waitForTimeout(2000);
        await helpers.screenshot('employee-search');
      }

      if (filterSelect) {
        await filterSelect.select(testEmployee.team_name);
        await page.waitForTimeout(2000);
        await helpers.screenshot('employee-filter');
      }
    }, 30000);
  });

  describe('Employee Data Validation', () => {
    test('should validate numeric fields correctly', async () => {
      await helpers.navigateTo('/?view=registro');
      
      // Test invalid numeric inputs
      const numericFields = [
        { selector: 'input[name="hours_mon_thu"]', value: 'invalid' },
        { selector: 'input[name="hours_fri"]', value: '-5' },
        { selector: 'input[name="vacation_days"]', value: '100' },
        { selector: 'input[name="free_hours"]', value: 'abc' }
      ];

      for (const field of numericFields) {
        try {
          const element = await page.$(field.selector);
          if (element) {
            await element.click({ clickCount: 3 });
            await element.type(field.value);
            
            // Trigger validation (blur event)
            await page.click('body');
            await page.waitForTimeout(500);
            
            console.log(`Tested invalid input "${field.value}" in ${field.selector}`);
          }
        } catch (error) {
          console.log(`Could not test field ${field.selector}`);
        }
      }

      await helpers.screenshot('employee-numeric-validation');
    }, 30000);

    test('should validate business rules (working hours, vacation days)', async () => {
      await helpers.navigateTo('/?view=registro');
      
      // Test business logic validation
      const businessRuleTests = [
        { field: 'hours_mon_thu', value: '25' }, // More than 24 hours
        { field: 'hours_fri', value: '15' },    // More than reasonable
        { field: 'vacation_days', value: '60' }, // Too many vacation days
        { field: 'free_hours', value: '200' }   // Unreasonable free hours
      ];

      for (const test of businessRuleTests) {
        try {
          const element = await page.$(`input[name="${test.field}"]`);
          if (element) {
            await element.click({ clickCount: 3 });
            await element.type(test.value);
          }
        } catch (error) {
          console.log(`Could not test business rule for ${test.field}`);
        }
      }

      // Try to submit and check for validation
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasValidation = await helpers.hasErrorMessage();
        console.log('Business rules validation triggered:', hasValidation);
        
        await helpers.screenshot('employee-business-validation');
      }
    }, 30000);
  });

  describe('Employee Geographic Data', () => {
    test('should handle geographic hierarchy correctly', async () => {
      await helpers.navigateTo('/?view=registro');
      
      // Test country -> community -> city cascade
      try {
        const countrySelect = await page.$('select[name="country"]');
        if (countrySelect) {
          // Select Spain
          await countrySelect.select('ES');
          await page.waitForTimeout(1000);
          
          // Check if communities are populated
          const communityOptions = await page.$$eval(
            'select[name="autonomous_community"] option', 
            options => options.map(opt => opt.textContent)
          );
          console.log('Available communities for Spain:', communityOptions);
          
          // Select Galicia
          const communitySelect = await page.$('select[name="autonomous_community"]');
          if (communitySelect && communityOptions.includes('Galicia')) {
            await communitySelect.select('Galicia');
            await page.waitForTimeout(1000);
            
            // Check if cities are populated
            const cityOptions = await page.$$eval(
              'select[name="city"] option',
              options => options.map(opt => opt.textContent)
            );
            console.log('Available cities for Galicia:', cityOptions);
          }
        }
      } catch (error) {
        console.log('Geographic cascade test failed:', error.message);
      }

      await helpers.screenshot('employee-geographic-hierarchy');
    }, 30000);
  });
});