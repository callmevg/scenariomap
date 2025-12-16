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
    // Wait for app to fully load with sample data
    await page.waitForSelector('.node-group', { timeout: 10000 });
  });

  test('should display initial sample graph tab', async ({ page }) => {
    // Verify tab bar exists with sample graph
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    await expect(tabBar).toBeVisible();
    await expect(tabBar.locator('span', { hasText: 'Sample Graph' })).toBeVisible();
  });

  test('should create a new graph', async ({ page }) => {
    // Find and click the "+" button (last button in tab bar)
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    const addButton = tabBar.locator('button').last();
    await addButton.click();

    // Verify new tab appears with "Untitled Graph"
    await expect(tabBar.locator('span', { hasText: 'Untitled Graph' })).toBeVisible();

    // Verify new graph is empty (no sample data - shows "No scenarios created yet")
    await expect(page.locator('text=No scenarios created yet')).toBeVisible();
  });

  test('should switch between graphs', async ({ page }) => {
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    
    // Create second graph
    const addButton = tabBar.locator('button').last();
    await addButton.click();
    await expect(tabBar.locator('span', { hasText: 'Untitled Graph' })).toBeVisible();

    // Switch back to first graph
    await tabBar.locator('span', { hasText: 'Sample Graph' }).click();

    // Verify sample data nodes are visible (check for node groups)
    await expect(page.locator('.node-group').first()).toBeVisible();
  });

  test('should rename a graph via double-click', async ({ page }) => {
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    
    // Double-click on tab name
    await tabBar.locator('span', { hasText: 'Sample Graph' }).dblclick();

    // Verify input appears
    const input = tabBar.locator('input');
    await expect(input).toBeVisible();

    // Type new name
    await input.fill('My Custom Graph');
    await input.press('Enter');

    // Verify name updated
    await expect(tabBar.locator('span', { hasText: 'My Custom Graph' })).toBeVisible();
  });

  test('should close a graph tab without deleting data', async ({ page }) => {
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    
    // Create second graph first (so we're not closing the last one)
    await tabBar.locator('button').last().click();
    await expect(tabBar.locator('span', { hasText: 'Untitled Graph' })).toBeVisible();

    // Hover over first tab to show close button
    const sampleGraphTab = tabBar.locator('div.group').filter({ hasText: 'Sample Graph' }).first();
    await sampleGraphTab.hover();

    // Click close button (X icon - it's inside the tab div)
    // This should close immediately without confirmation since data is preserved
    await sampleGraphTab.locator('button').click();

    // Verify tab is closed (no longer visible)
    await expect(tabBar.locator('span', { hasText: 'Sample Graph' })).not.toBeVisible();
    
    // The Untitled Graph tab should now be active
    await expect(tabBar.locator('span', { hasText: 'Untitled Graph' })).toBeVisible();
    
    // Data should still be preserved in localStorage (can verify by checking localStorage)
    const graphData = await page.evaluate(() => {
      const data = localStorage.getItem('scenario-map-data');
      return data ? JSON.parse(data) : null;
    });
    
    // Sample Graph should still exist in the data
    const graphNames = graphData ? Object.values(graphData).map((g: any) => g.name) : [];
    expect(graphNames).toContain('Sample Graph');
  });

  test('should prevent closing the last graph tab', async ({ page }) => {
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    
    // Hover over the only tab
    const sampleGraphTab = tabBar.locator('div.group').filter({ hasText: 'Sample Graph' }).first();
    await sampleGraphTab.hover();

    // Set up dialog handler for the alert
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Click close button
    await sampleGraphTab.locator('button').click();

    // Tab should still be visible
    await page.waitForTimeout(500);
    await expect(tabBar.locator('span', { hasText: 'Sample Graph' })).toBeVisible();
  });

  test('should persist graph state across page reload', async ({ page }) => {
    // Add an element to the graph
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Persistent Element');
    await page.getByRole('button', { name: /^save$/i }).click();
    
    // Wait for element to be added
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForSelector('.node-group', { timeout: 10000 });

    // Verify element persists (check for node with that title)
    await expect(page.locator('.node-group title', { hasText: 'Persistent Element' })).toBeAttached();
  });

  test('should maintain separate element lists per graph', async ({ page }) => {
    const tabBar = page.locator('.flex.items-center.border.bg-background.rounded-lg');
    
    // Add element to first graph
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Graph 1 Element');
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForTimeout(500);

    // Create second graph
    await tabBar.locator('button').last().click();
    await expect(tabBar.locator('span', { hasText: 'Untitled Graph' })).toBeVisible();

    // Add element to second graph
    await page.getByRole('button', { name: /add element/i }).click();
    await page.getByPlaceholder(/e.g. Login Page/i).fill('Graph 2 Element');
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForTimeout(500);

    // Verify Graph 2 Element node exists
    await expect(page.locator('.node-group title', { hasText: 'Graph 2 Element' })).toBeAttached();

    // Switch back to first graph
    await tabBar.locator('span', { hasText: 'Sample Graph' }).click();
    await page.waitForTimeout(300);

    // Verify Graph 1 Element is present
    await expect(page.locator('.node-group title', { hasText: 'Graph 1 Element' })).toBeAttached();
  });
});
