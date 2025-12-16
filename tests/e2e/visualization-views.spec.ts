import { test, expect } from '@playwright/test';

/**
 * Test Suite: Visualization Views
 * Tests the three main visualization modes: Graph, Metro Map, and Table
 */

test.describe('Visualization Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.node-group', { timeout: 10000 });
  });

  test.describe('Graph View (D3)', () => {
    test('should display D3 force-directed graph by default', async ({ page }) => {
      // Verify SVG canvas exists
      const svg = page.locator('svg').first();
      await expect(svg).toBeVisible();

      // Verify nodes are rendered
      const nodes = page.locator('.node-group');
      await expect(nodes.first()).toBeVisible();

      // Verify links are rendered
      const links = page.locator('.link-path');
      await expect(links.first()).toBeAttached();
    });

    test('should click on nodes to view element details', async ({ page }) => {
      // Click on a node
      await page.locator('.node-group').first().click();

      // Verify modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Element Details')).toBeVisible();
    });

    test('should display node labels', async ({ page }) => {
      // Verify text labels exist in nodes
      const nodeLabels = page.locator('.node-group text');
      await expect(nodeLabels.first()).toBeVisible();
    });

    test('should zoom with mouse wheel', async ({ page }) => {
      const svg = page.locator('svg').first();
      
      // The SVG container should support zoom
      await expect(svg).toBeVisible();
      
      // Perform zoom action
      await svg.hover();
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(500);

      // Verify SVG is still functional (zoom behavior is visual)
      await expect(svg).toBeVisible();
    });
  });

  test.describe('Metro Map View', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Map view
      await page.getByRole('tab', { name: /^map$/i }).click();
      await page.waitForTimeout(500);
    });

    test('should switch to map tab', async ({ page }) => {
      // Verify metro map SVG is visible
      const metroSvg = page.locator('svg.w-full.h-full.bg-background\\/50');
      await expect(metroSvg).toBeVisible();
    });

    test('should display metro nodes', async ({ page }) => {
      // Verify metro nodes exist
      const metroNodes = page.locator('.metro-node-group');
      await expect(metroNodes.first()).toBeAttached();
    });

    test('should display metro links', async ({ page }) => {
      // Verify metro links exist
      const metroLinks = page.locator('.metro-link');
      await expect(metroLinks.first()).toBeAttached();
    });
  });

  test.describe('Table View', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Table view
      await page.getByRole('tab', { name: /table/i }).click();
      await page.waitForTimeout(500);
    });

    test('should switch to table tab', async ({ page }) => {
      // Verify table is visible
      const table = page.getByRole('table').first();
      await expect(table).toBeVisible();
    });

    test('should display elements table', async ({ page }) => {
      // Verify table headers
      await expect(page.getByRole('columnheader', { name: 'Name' }).first()).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /buggy/i }).first()).toBeVisible();
    });

    test('should display scenarios table', async ({ page }) => {
      // Scroll down or look for scenarios section
      const scenariosTable = page.getByRole('table').nth(1);
      await expect(scenariosTable).toBeVisible();
    });
  });

  test.describe('View Switching', () => {
    test('should switch between all three views', async ({ page }) => {
      // Start on Graph view (default)
      await expect(page.locator('.node-group').first()).toBeVisible();

      // Switch to Map
      await page.getByRole('tab', { name: /^map$/i }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('.metro-node-group').first()).toBeAttached();

      // Switch to Table
      await page.getByRole('tab', { name: /table/i }).click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('table').first()).toBeVisible();

      // Switch back to Graph
      await page.getByRole('tab', { name: /graph/i }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('.node-group').first()).toBeVisible();
    });

    test('should preserve data when switching views', async ({ page }) => {
      // Add an element
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('View Test Element');
      await page.getByRole('button', { name: /^save$/i }).click();
      await page.waitForTimeout(500);

      // Verify in graph view
      await expect(page.locator('.node-group title', { hasText: 'View Test Element' })).toBeAttached();

      // Switch to table view
      await page.getByRole('tab', { name: /table/i }).click();
      await page.waitForTimeout(300);

      // Verify element appears in table
      await expect(page.getByRole('cell', { name: 'View Test Element' })).toBeVisible();

      // Switch back to graph
      await page.getByRole('tab', { name: /graph/i }).click();
      await page.waitForTimeout(300);

      // Still there
      await expect(page.locator('.node-group title', { hasText: 'View Test Element' })).toBeAttached();
    });
  });
});
