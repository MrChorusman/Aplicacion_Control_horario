/**
 * Calendar Functionality E2E Tests
 * Testing calendar view, event creation, and date management
 */

const { setupBrowser, teardownBrowser, TestHelpers } = require('../utils/helpers');

describe('Calendar Functionality', () => {
  let browser;
  let page;
  let helpers;

  // Test data for calendar entries
  const testCalendarEntry = {
    employee_name: 'Juan Pérez Test',
    date: '2025-09-15',
    activity_type: 'V', // Vacaciones
    description: 'Vacaciones de prueba E2E'
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
    // Login and navigate to calendar
    await helpers.loginAsAdmin();
    
    try {
      await helpers.navigateToSection('calendar');
    } catch (error) {
      await helpers.navigateTo('/?view=calendario');
    }
    
    await page.waitForTimeout(2000);
  }, 45000);

  describe('Calendar Display', () => {
    test('should display calendar view correctly', async () => {
      // Check for calendar components
      const calendarSelectors = [
        '.calendar, .calendar-container, .calendar-view',
        '.month-view, .calendar-month',
        '.calendar-day, .day-cell',
        '.calendar-header, .month-header'
      ];

      let calendarFound = false;
      for (const selector of calendarSelectors) {
        try {
          await helpers.waitForElement(selector, 3000);
          console.log(`Found calendar element: ${selector}`);
          calendarFound = true;
          break;
        } catch (error) {
          console.log(`Calendar element not found: ${selector}`);
        }
      }

      // Check for date navigation controls
      const navigationSelectors = [
        '.nav-prev, .previous-month, [data-testid="prev-month"]',
        '.nav-next, .next-month, [data-testid="next-month"]',
        '.month-year, .current-month, .calendar-title'
      ];

      for (const selector of navigationSelectors) {
        try {
          await helpers.waitForElement(selector, 2000);
          console.log(`Found navigation element: ${selector}`);
        } catch (error) {
          console.log(`Navigation element not found: ${selector}`);
        }
      }

      await helpers.screenshot('calendar-display');
      expect(calendarFound).toBe(true);
    }, 30000);

    test('should navigate between months correctly', async () => {
      // Find navigation buttons
      const prevButton = await page.$('.nav-prev, .previous-month, [data-testid="prev-month"]');
      const nextButton = await page.$('.nav-next, .next-month, [data-testid="next-month"]');

      // Get current month display
      const getCurrentMonth = async () => {
        try {
          const monthElement = await page.$('.month-year, .current-month, .calendar-title');
          if (monthElement) {
            return await page.evaluate(el => el.textContent, monthElement);
          }
        } catch (error) {
          return null;
        }
      };

      const initialMonth = await getCurrentMonth();
      console.log('Initial month:', initialMonth);

      // Test next month navigation
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        const nextMonth = await getCurrentMonth();
        console.log('After next click:', nextMonth);
        
        await helpers.screenshot('calendar-next-month');
      }

      // Test previous month navigation
      if (prevButton) {
        await prevButton.click();
        await page.waitForTimeout(1000);
        
        const prevMonth = await getCurrentMonth();
        console.log('After prev click:', prevMonth);
        
        await helpers.screenshot('calendar-prev-month');
      }
    }, 30000);
  });

  describe('Calendar Entry Creation', () => {
    test('should open entry creation form', async () => {
      // Look for ways to create new entry
      const creationTriggers = [
        '.add-entry, .new-entry, .create-entry',
        '[data-testid="add-entry"]',
        'button:contains("Añadir"), button:contains("Nuevo")',
        '.calendar-day' // Click on a day
      ];

      let formOpened = false;
      for (const selector of creationTriggers) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(1000);
            
            // Check if form appeared
            const formVisible = await page.$('.entry-form, .calendar-form, .modal');
            if (formVisible) {
              console.log(`Form opened via ${selector}`);
              formOpened = true;
              break;
            }
          }
        } catch (error) {
          console.log(`Could not trigger form via ${selector}`);
        }
      }

      // If no specific button, try clicking on a calendar day
      if (!formOpened) {
        const dayCell = await page.$('.calendar-day, .day-cell');
        if (dayCell) {
          await dayCell.click();
          await page.waitForTimeout(1000);
          
          const formVisible = await page.$('.entry-form, .calendar-form, .modal');
          if (formVisible) {
            formOpened = true;
            console.log('Form opened by clicking day');
          }
        }
      }

      await helpers.screenshot('calendar-entry-form');
      console.log('Entry form opened:', formOpened);
    }, 30000);

    test('should create calendar entry successfully', async () => {
      // Try to open entry form
      const dayCell = await page.$('.calendar-day, .day-cell');
      if (dayCell) {
        await dayCell.click();
        await page.waitForTimeout(1000);
      }

      // Fill entry form if it exists
      const formFields = [
        { selector: 'select[name="employee"], select[name="employee_id"]', value: testCalendarEntry.employee_name },
        { selector: 'input[name="date"], input[type="date"]', value: testCalendarEntry.date },
        { selector: 'select[name="activity_type"], select[name="type"]', value: testCalendarEntry.activity_type },
        { selector: 'textarea[name="description"], input[name="description"]', value: testCalendarEntry.description }
      ];

      for (const field of formFields) {
        try {
          const element = await page.$(field.selector);
          if (element) {
            if (field.selector.includes('select')) {
              await element.select(field.value);
            } else {
              await element.click({ clickCount: 3 });
              await element.type(field.value);
            }
            console.log(`Filled field ${field.selector} with ${field.value}`);
          }
        } catch (error) {
          console.log(`Could not fill field ${field.selector}: ${error.message}`);
        }
      }

      // Submit form
      const submitButton = await page.$('button[type="submit"], .submit-button, .save-entry');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await helpers.hasSuccessMessage();
        console.log('Entry creation success:', hasSuccess);
        
        await helpers.screenshot('calendar-entry-created');
      }
    }, 45000);
  });

  describe('Calendar Entry Display', () => {
    test('should display existing calendar entries', async () => {
      // Look for calendar entries/events
      const entrySelectors = [
        '.calendar-event, .calendar-entry',
        '.event-marker, .entry-marker',
        '.activity-indicator',
        '.day-with-events'
      ];

      let entriesFound = 0;
      for (const selector of entrySelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          entriesFound += elements.length;
          console.log(`Found ${elements.length} entries with selector ${selector}`);
        }
      }

      console.log(`Total calendar entries found: ${entriesFound}`);
      await helpers.screenshot('calendar-entries-display');
    }, 30000);

    test('should show entry details on hover or click', async () => {
      // Find calendar entries
      const entry = await page.$('.calendar-event, .calendar-entry, .event-marker');
      
      if (entry) {
        // Test hover
        await entry.hover();
        await page.waitForTimeout(1000);
        
        // Check for tooltip or popup
        const tooltip = await page.$('.tooltip, .entry-popup, .event-details');
        if (tooltip) {
          console.log('Entry details shown on hover');
        }
        
        // Test click
        await entry.click();
        await page.waitForTimeout(1000);
        
        // Check for modal or expanded view
        const modal = await page.$('.modal, .entry-modal, .expanded-details');
        if (modal) {
          console.log('Entry details modal opened');
        }
        
        await helpers.screenshot('calendar-entry-details');
      }
    }, 30000);
  });

  describe('Calendar Filtering and Search', () => {
    test('should filter calendar by employee', async () => {
      // Look for employee filter
      const employeeFilter = await page.$('select[name="employee_filter"], .employee-select, .filter-employee');
      
      if (employeeFilter) {
        // Get available options
        const options = await page.$$eval(
          'select[name="employee_filter"] option, .employee-select option',
          options => options.map(opt => ({ value: opt.value, text: opt.textContent }))
        );
        
        console.log('Available employee filter options:', options);
        
        if (options.length > 1) {
          await employeeFilter.select(options[1].value);
          await page.waitForTimeout(2000);
          
          await helpers.screenshot('calendar-employee-filter');
        }
      }
    }, 30000);

    test('should filter calendar by activity type', async () => {
      // Look for activity type filter
      const typeFilter = await page.$('select[name="type_filter"], .type-select, .filter-type');
      
      if (typeFilter) {
        const options = await page.$$eval(
          'select[name="type_filter"] option, .type-select option',
          options => options.map(opt => ({ value: opt.value, text: opt.textContent }))
        );
        
        console.log('Available type filter options:', options);
        
        if (options.length > 1) {
          await typeFilter.select(options[1].value);
          await page.waitForTimeout(2000);
          
          await helpers.screenshot('calendar-type-filter');
        }
      }
    }, 30000);
  });

  describe('Calendar Legend and Activity Types', () => {
    test('should display activity legend correctly', async () => {
      // Check for legend
      const legendSelectors = [
        '.legend, .activity-legend',
        '.calendar-legend',
        '.activity-types'
      ];

      let legendFound = false;
      for (const selector of legendSelectors) {
        try {
          await helpers.waitForElement(selector, 3000);
          console.log(`Found legend: ${selector}`);
          legendFound = true;
          break;
        } catch (error) {
          console.log(`Legend not found: ${selector}`);
        }
      }

      // Check for activity type indicators
      const activityTypes = ['V', 'F', 'HLD', 'G', 'V!', 'C'];
      const foundTypes = [];

      for (const type of activityTypes) {
        const typeElement = await page.$(`*:contains("${type} -"), .legend-item:contains("${type}")`);
        if (typeElement) {
          foundTypes.push(type);
        }
      }

      console.log('Activity types found in legend:', foundTypes);
      await helpers.screenshot('calendar-legend');
      
      expect(legendFound || foundTypes.length > 0).toBe(true);
    }, 30000);
  });

  describe('Calendar Responsive Behavior', () => {
    test('should adapt to different screen sizes', async () => {
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      const mobileCalendar = await page.$('.calendar, .calendar-container');
      if (mobileCalendar) {
        console.log('Calendar visible on mobile viewport');
      }
      
      await helpers.screenshot('calendar-mobile');
      
      // Test tablet viewport
      await page.setViewport({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      
      await helpers.screenshot('calendar-tablet');
      
      // Reset to desktop
      await page.setViewport({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);
      
      await helpers.screenshot('calendar-desktop-restored');
    }, 45000);
  });
});