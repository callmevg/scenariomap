import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test Suite: Data Import/Export
 * Tests data portability features
 */

test.describe('Data Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should export graph as JSON file', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.getByRole('button', { name: /export/i }).click();

    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/.*-scenariomap\.json$/);

    // Save and verify content
    const filePath = path.join(__dirname, 'temp', download.suggestedFilename());
    await download.saveAs(filePath);

    // Read and parse JSON
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Verify structure
    expect(content).toHaveProperty('name');
    expect(content).toHaveProperty('elements');
    expect(content).toHaveProperty('scenarios');
    expect(Array.isArray(content.elements)).toBe(true);
    expect(Array.isArray(content.scenarios)).toBe(true);

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should import graph from JSON file', async ({ page }) => {
    // Create test JSON file
    const testData = {
      name: 'Imported Graph',
      elements: [
        {
          id: 'import-1',
          name: 'Imported Element 1',
          isBuggy: false,
          bugDetails: '',
          mediaLink: '',
          createdAt: new Date().toISOString()
        },
        {
          id: 'import-2',
          name: 'Imported Element 2',
          isBuggy: true,
          bugDetails: 'Import test bug',
          mediaLink: '',
          createdAt: new Date().toISOString()
        }
      ],
      scenarios: [
        {
          id: 'import-scenario-1',
          name: 'Imported Scenario',
          methods: [['import-1', 'import-2']],
          group: 'Imported'
        }
      ]
    };

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, 'test-import.json');
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));

    // Click import button (this will trigger file input)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Verify success toast
    await expect(page.getByText(/data merged/i)).toBeVisible();

    // Verify imported elements appear
    await expect(page.getByText('Imported Element 1')).toBeVisible();
    await expect(page.getByText('Imported Element 2')).toBeVisible();

    // Verify imported scenario appears
    await expect(page.getByText('Imported Scenario')).toBeVisible();

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should handle duplicate elements during import', async ({ page }) => {
    // First, add an element
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Duplicate Test');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Create import data with same element name
    const testData = {
      name: 'Test',
      elements: [
        {
          id: 'different-id',
          name: 'Duplicate Test', // Same name as existing
          isBuggy: true,
          bugDetails: 'Should not create duplicate',
          mediaLink: '',
          createdAt: new Date().toISOString()
        },
        {
          id: 'new-id',
          name: 'New Unique Element',
          isBuggy: false,
          bugDetails: '',
          mediaLink: '',
          createdAt: new Date().toISOString()
        }
      ],
      scenarios: []
    };

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, 'test-duplicate.json');
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));

    // Import
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await expect(page.getByText(/data merged/i)).toBeVisible();

    // Verify only one "Duplicate Test" exists
    await page.getByRole('tab', { name: /table/i }).click();
    const table = page.getByRole('table').first();
    const content = await table.textContent();
    const matches = content?.match(/Duplicate Test/g);
    expect(matches?.length).toBe(1);

    // Verify new unique element was added
    await expect(page.getByText('New Unique Element')).toBeVisible();

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should handle duplicate scenarios during import', async ({ page }) => {
    // Import data with scenario that matches existing one
    const testData = {
      name: 'Test',
      elements: [],
      scenarios: [
        {
          id: 'duplicate-scenario',
          name: 'User Login', // Matches sample data
          methods: [[]],
          group: 'Test'
        },
        {
          id: 'new-scenario',
          name: 'Unique Scenario',
          methods: [[]],
          group: 'Test'
        }
      ]
    };

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, 'test-scenario-duplicate.json');
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));

    // Import
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await expect(page.getByText(/data merged/i)).toBeVisible();

    // Verify "User Login" scenario count (should be only 1)
    const sidebar = page.locator('.dashboard');
    const sidebarContent = await sidebar.textContent();
    const matches = sidebarContent?.match(/User Login/g);
    expect(matches?.length).toBe(1);

    // Verify unique scenario was added
    await expect(page.getByText('Unique Scenario')).toBeVisible();

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should handle invalid JSON import', async ({ page }) => {
    // Create invalid JSON file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(filePath, 'This is not valid JSON {]');

    // Import
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Verify error toast
    await expect(page.getByText(/import error/i)).toBeVisible();

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should export and re-import maintaining data integrity', async ({ page }) => {
    // Add custom element
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Export Test Element');
    await page.getByLabel(/mark as buggy/i).check();
    await page.getByPlaceholder(/describe the bug/i).fill('Test bug for export');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    const download = await downloadPromise;
    const filePath = path.join(__dirname, 'temp', download.suggestedFilename());
    await download.saveAs(filePath);

    // Clear data
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Import the exported file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await expect(page.getByText(/data merged/i)).toBeVisible();

    // Verify element exists with all properties
    await page.locator('text=Export Test Element').click();
    await expect(page.getByText('Test bug for export')).toBeVisible();
    await expect(page.getByText(/buggy/i)).toBeVisible();

    // Cleanup
    fs.unlinkSync(filePath);
  });
});
