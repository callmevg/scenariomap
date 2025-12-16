import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test Suite: Data Import/Export
 * Tests JSON import/export functionality and data portability
 */

test.describe('Data Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.node-group', { timeout: 10000 });
  });

  test.describe('Export Functionality', () => {
    test('should export current graph data', async ({ page }) => {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await page.getByRole('button', { name: /export/i }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download happened
      expect(download.suggestedFilename()).toContain('.json');
    });

    test('should export valid JSON structure', async ({ page }) => {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');

      await page.getByRole('button', { name: /export/i }).click();

      const download = await downloadPromise;
      
      // Save to temp file and read
      const tempPath = path.join(__dirname, 'temp', 'export-test.json');
      await download.saveAs(tempPath);

      const content = fs.readFileSync(tempPath, 'utf-8');
      const data = JSON.parse(content);

      // Verify structure
      expect(data).toHaveProperty('elements');
      expect(data).toHaveProperty('scenarios');
      expect(Array.isArray(data.elements)).toBe(true);
      expect(Array.isArray(data.scenarios)).toBe(true);
    });
  });

  test.describe('Import Functionality', () => {
    test('should have import input', async ({ page }) => {
      // The import is typically a file input (might be hidden)
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    });

    test('should import valid JSON file as new tab', async ({ page }) => {
      // Create test data
      const testData = {
        name: "Imported Graph",
        elements: [
          { id: "import-1", name: "Imported Element 1", isBuggy: false },
          { id: "import-2", name: "Imported Element 2", isBuggy: true, bugDetails: "Test bug" }
        ],
        scenarios: [
          { id: "scenario-1", name: "Imported Scenario", group: "Test", methods: [["import-1", "import-2"]] }
        ]
      };

      // Write test file
      const testFilePath = path.join(__dirname, 'temp', 'import-test.json');
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      fs.writeFileSync(testFilePath, JSON.stringify(testData));

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // Wait for import to complete
      await page.waitForTimeout(1000);

      // Verify new tab was created with imported graph name
      const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
      await expect(tabBar.locator('span', { hasText: 'Imported Graph' })).toBeVisible();

      // Verify imported elements appear in the new tab
      await expect(page.locator('.node-group title', { hasText: 'Imported Element 1' })).toBeAttached();
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist data across page reload', async ({ page }) => {
      // Add an element
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('Persistence Test');
      await page.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await page.waitForSelector('.node-group', { timeout: 10000 });

      // Verify data persists
      await expect(page.locator('.node-group title', { hasText: 'Persistence Test' })).toBeAttached();
    });

    test('should persist across browser sessions (localStorage)', async ({ page }) => {
      // Verify localStorage is being used
      const hasData = await page.evaluate(() => {
        return localStorage.getItem('scenario-map-data') !== null;
      });
      
      expect(hasData).toBe(true);
    });
  });

  test.describe('Export-Import Round Trip', () => {
    test('should maintain data integrity through export and re-import', async ({ page }) => {
      // Add a unique element
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('RoundTrip Element');
      await page.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(500);

      // Export
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /export/i }).click();
      const download = await downloadPromise;

      // Save export
      const exportPath = path.join(__dirname, 'temp', 'roundtrip.json');
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });
      await download.saveAs(exportPath);

      // Clear and reload
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector('.node-group', { timeout: 10000 });

      // Re-import
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(exportPath);
      await page.waitForTimeout(1000);

      // Verify element exists
      await expect(page.locator('.node-group title', { hasText: 'RoundTrip Element' })).toBeAttached();
    });
  });
});
