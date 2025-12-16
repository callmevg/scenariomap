import { test, expect } from '@playwright/test';

/**
 * Test Suite: Element Management
 * Tests CRUD operations for UI Elements
 */

test.describe('Element Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for sample data to load
    await page.waitForSelector('.node-group', { timeout: 10000 });
  });

  test('should display sample data on first load', async ({ page }) => {
    // Verify sample elements exist in SVG (check for title elements)
    await expect(page.locator('.node-group title', { hasText: 'Login Dialog' })).toBeAttached();
    await expect(page.locator('.node-group title', { hasText: 'Dashboard' })).toBeAttached();
  });

  test('should create a new element via header button', async ({ page }) => {
    // Click "Add Element" button in header
    await page.getByRole('button', { name: /add element/i }).click();
    
    // Wait for modal to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Element')).toBeVisible();

    // Fill in element details
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Test Screen');
    await page.getByLabel(/mark as buggy/i).check();
    await page.getByPlaceholder(/describe the bug/i).fill('Button not clickable');

    // Save element
    await page.getByRole('button', { name: /^save$/i }).click();

    // Wait for modal to close and element to be added
    await page.waitForTimeout(500);

    // Verify element appears in graph (SVG title)
    await expect(page.locator('.node-group title', { hasText: 'Test Screen' })).toBeAttached();
  });

  test('should validate element name uniqueness', async ({ page }) => {
    // Add first element
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Duplicate Name');
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForTimeout(500);

    // Try to add element with same name
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Duplicate Name');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Verify error toast
    await expect(page.locator('[role="status"]').first()).toContainText(/duplicate|already exists/i);
  });

  test('should edit an existing element', async ({ page }) => {
    // Click on a node in the graph to view details
    await page.locator('.node-group').first().click();
    
    // Wait for view modal
    await expect(page.getByText('Element Details')).toBeVisible();

    // Click edit button
    await page.getByRole('button', { name: /^edit$/i }).click();

    // Edit the name
    const nameInput = page.getByPlaceholder(/e.g. Login Page/i);
    await nameInput.clear();
    await nameInput.fill('Updated Element Name');

    // Save changes
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForTimeout(500);

    // Verify updated name in graph
    await expect(page.locator('.node-group title', { hasText: 'Updated Element Name' })).toBeAttached();
  });

  test('should delete an element', async ({ page }) => {
    // Get the name of first element
    const firstNodeTitle = page.locator('.node-group title').first();
    const elementName = await firstNodeTitle.textContent();

    // Click on a node
    await page.locator('.node-group').first().click();
    
    // Wait for view modal
    await expect(page.getByText('Element Details')).toBeVisible();

    // Click delete button
    await page.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify element is removed from graph
    if (elementName) {
      await expect(page.locator('.node-group title', { hasText: elementName })).not.toBeAttached();
    }
  });

  test('should mark element as buggy', async ({ page }) => {
    // Add buggy element
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Buggy Screen');
    await page.getByLabel(/mark as buggy/i).check();
    await page.getByPlaceholder(/describe the bug/i).fill('Critical error');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Wait for element to be created
    await page.waitForTimeout(500);

    // Verify node exists
    await expect(page.locator('.node-group title', { hasText: 'Buggy Screen' })).toBeAttached();
  });
});
