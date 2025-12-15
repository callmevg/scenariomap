import { test, expect, Page } from '@playwright/test';

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
  });

  test('should display sample data on first load', async ({ page }) => {
    // Verify sample elements exist
    await expect(page.getByText('Login Dialog')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Settings Page')).toBeVisible();
  });

  test('should create a new element via sidebar', async ({ page }) => {
    // Click "Add Element" button in sidebar
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

    // Verify success toast
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Verify element appears in graph
    await expect(page.getByText('Test Screen')).toBeVisible();
  });

  test('should validate element name uniqueness', async ({ page }) => {
    // Add first element
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Duplicate Name');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Try to add element with same name
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Duplicate Name');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Verify error toast
    await expect(page.getByText(/duplicate name/i)).toBeVisible();
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

    // Verify success toast
    await expect(page.getByText(/element updated/i)).toBeVisible();

    // Verify updated name in graph
    await expect(page.getByText('Updated Element Name')).toBeVisible();
  });

  test('should delete an element and remove from scenarios', async ({ page }) => {
    // Click on a node that is part of a scenario
    await page.locator('text=Login Dialog').click();
    
    // Wait for view modal
    await expect(page.getByText('Element Details')).toBeVisible();

    // Click delete button
    await page.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /continue/i }).click();

    // Verify success toast
    await expect(page.getByText(/element deleted/i)).toBeVisible();

    // Verify element is removed from graph
    await expect(page.getByText('Login Dialog')).not.toBeVisible();
  });

  test('should mark element as buggy and display red indicator', async ({ page }) => {
    // Add buggy element
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Buggy Screen');
    await page.getByLabel(/mark as buggy/i).check();
    await page.getByPlaceholder(/describe the bug/i).fill('Critical error');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Wait for element to be created
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Verify red stroke on node in graph view
    const buggyNode = page.locator('.node-circle').filter({ hasText: 'Buggy Screen' });
    await expect(buggyNode).toHaveCSS('stroke', /hsl.*destructive.*/);
  });

  test('should validate element name length', async ({ page }) => {
    await page.getByRole('button', { name: /add element/i }).click();
    
    // Try to save with name too short
    await page.getByPlaceholder(/e.g. Login Page/i).fill('A');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Verify validation error
    await expect(page.getByText(/must be at least 2 characters/i)).toBeVisible();
  });
});
