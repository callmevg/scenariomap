import { test, expect } from '@playwright/test';

/**
 * Test Suite: Multi-Graph Workspace
 * Tests tab management and graph switching
 */

test.describe('Multi-Graph Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display initial sample graph tab', async ({ page }) => {
    // Verify tab bar exists
    const tabBar = page.locator('[class*="border bg-background rounded-lg"]').first();
    await expect(tabBar).toBeVisible();

    // Verify sample graph tab
    await expect(page.getByText('Sample Graph')).toBeVisible();
  });

  test('should create a new graph', async ({ page }) => {
    // Click the "+" button in tab bar
    await page.locator('[class*="border bg-background rounded-lg"]').getByRole('button', { name: /plus/i }).click();

    // Verify new tab appears
    await expect(page.getByText(/untitled graph/i)).toBeVisible();

    // Verify new graph is empty (no sample data)
    await expect(page.getByText('No scenarios created yet')).toBeVisible();
  });

  test('should switch between graphs', async ({ page }) => {
    // Create second graph
    await page.locator('[class*="border bg-background rounded-lg"]').getByRole('button', { name: /plus/i }).click();
    await expect(page.getByText(/untitled graph/i)).toBeVisible();

    // Switch back to first graph
    await page.getByText('Sample Graph').click();

    // Verify sample data is visible again
    await expect(page.getByText('User Login')).toBeVisible();
    await expect(page.getByText('Login Dialog')).toBeVisible();
  });

  test('should rename a graph via double-click', async ({ page }) => {
    // Double-click on tab
    await page.getByText('Sample Graph').dblclick();

    // Verify input appears
    const input = page.locator('input[class*="h-6 w-32"]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // Type new name
    await input.fill('My Custom Graph');
    await input.press('Enter');

    // Verify name updated
    await expect(page.getByText('My Custom Graph')).toBeVisible();
    await expect(page.getByText('Sample Graph')).not.toBeVisible();
  });

  test('should delete a graph with confirmation', async ({ page }) => {
    // Create second graph first (so we're not deleting the last one)
    await page.locator('[class*="border bg-background rounded-lg"]').getByRole('button', { name: /plus/i }).click();
    
    // Hover over first tab to show close button
    await page.getByText('Sample Graph').hover();

    // Click close button (X)
    const closeButton = page.getByText('Sample Graph').locator('..').getByRole('button').first();
    await closeButton.click();

    // Confirm deletion in dialog
    await expect(page.getByText(/are you absolutely sure/i)).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).click();

    // Verify graph is deleted
    await expect(page.getByText('Sample Graph')).not.toBeVisible();
    await expect(page.getByText(/untitled graph/i)).toBeVisible();
  });

  test('should prevent deleting the last graph', async ({ page }) => {
    // Try to delete the only graph
    await page.getByText('Sample Graph').hover();
    const closeButton = page.getByText('Sample Graph').locator('..').getByRole('button').first();
    await closeButton.click();

    // Should show alert (not the confirmation dialog)
    // Playwright can't easily test alert(), but we can verify deletion didn't happen
    await page.waitForTimeout(500);
    await expect(page.getByText('Sample Graph')).toBeVisible();
  });

  test('should persist graph state across page reload', async ({ page }) => {
    // Add an element to the graph
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Persistent Element');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Reload page
    await page.reload();

    // Verify element persists
    await expect(page.getByText('Persistent Element')).toBeVisible();
  });

  test('should maintain separate element lists per graph', async ({ page }) => {
    // Add element to first graph
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Graph 1 Element');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Create second graph
    await page.locator('[class*="border bg-background rounded-lg"]').getByRole('button', { name: /plus/i }).click();

    // Add element to second graph
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Graph 2 Element');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/element added/i)).toBeVisible();

    // Verify Graph 2 Element is visible
    await expect(page.getByText('Graph 2 Element')).toBeVisible();
    // Verify Graph 1 Element is NOT visible
    await expect(page.getByText('Graph 1 Element')).not.toBeVisible();

    // Switch back to first graph
    await page.getByText('Sample Graph').click();

    // Verify Graph 1 Element is visible
    await expect(page.getByText('Graph 1 Element')).toBeVisible();
    // Verify Graph 2 Element is NOT visible
    await expect(page.getByText('Graph 2 Element')).not.toBeVisible();
  });

  test('should reset hidden scenarios when switching tabs', async ({ page }) => {
    // Hide a scenario in first graph
    const scenarioCard = page.locator('.dashboard').locator('div[class*="border-l-4"]').first();
    await scenarioCard.getByRole('button').first().click();
    await expect(scenarioCard).toHaveClass(/opacity-50/);

    // Create and switch to second graph
    await page.locator('[class*="border bg-background rounded-lg"]').getByRole('button', { name: /plus/i }).click();

    // Switch back to first graph
    await page.getByText('Sample Graph').click();

    // Verify scenario visibility is reset (no longer hidden)
    await expect(scenarioCard).not.toHaveClass(/opacity-50/);
  });
});
