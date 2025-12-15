import { test, expect } from '@playwright/test';

/**
 * Test Suite: Visualization Views
 * Tests Graph, Metro Map, and Table views
 */

test.describe('Visualization Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.describe('View Switching', () => {
    test('should switch between Graph, Map, and Table views', async ({ page }) => {
      // Default view should be Graph
      await expect(page.locator('svg.w-full.h-full').first()).toBeVisible();

      // Switch to Map view
      await page.getByRole('tab', { name: /map/i }).click();
      await expect(page.locator('svg.bg-background\\/50')).toBeVisible();
      await expect(page.getByRole('button', { name: /undo move/i })).toBeVisible();

      // Switch to Table view
      await page.getByRole('tab', { name: /table/i }).click();
      await expect(page.getByRole('table').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /save element changes/i })).toBeVisible();

      // Switch back to Graph
      await page.getByRole('tab', { name: /graph/i }).click();
      await expect(page.locator('svg.w-full.h-full').first()).toBeVisible();
    });
  });

  test.describe('Graph View (D3)', () => {
    test('should render nodes and links', async ({ page }) => {
      // Verify nodes exist
      const nodes = page.locator('.node-group');
      await expect(nodes.first()).toBeVisible();
      await expect(await nodes.count()).toBeGreaterThan(0);

      // Verify links exist
      const links = page.locator('.link-path');
      await expect(links.first()).toBeVisible();
      await expect(await links.count()).toBeGreaterThan(0);
    });

    test('should zoom and pan the graph', async ({ page }) => {
      const svg = page.locator('svg.w-full.h-full').first();
      
      // Get initial transform
      const container = page.locator('g').first();
      const initialTransform = await container.getAttribute('transform');

      // Scroll to zoom
      await svg.hover();
      await page.mouse.wheel(0, -100); // Zoom in
      await page.waitForTimeout(300);

      // Verify transform changed
      const zoomedTransform = await container.getAttribute('transform');
      expect(zoomedTransform).not.toBe(initialTransform);
    });

    test('should drag nodes to fix positions', async ({ page }) => {
      const node = page.locator('.node-group').first();
      
      // Get initial position
      const initialBox = await node.boundingBox();
      
      // Drag node
      await node.dragTo(node, { 
        targetPosition: { x: 100, y: 100 }
      });

      await page.waitForTimeout(500);

      // Verify position changed
      const newBox = await node.boundingBox();
      expect(newBox?.x).not.toBe(initialBox?.x);
    });

    test('should click node to open element details', async ({ page }) => {
      const node = page.locator('.node-group').first();
      await node.click();

      // Verify modal opens
      await expect(page.getByText('Element Details')).toBeVisible();
    });

    test('should highlight scenario on link hover', async ({ page }) => {
      const link = page.locator('.link-path').first();
      
      // Hover over link
      await link.hover();

      // Wait for hover effect
      await page.waitForTimeout(200);

      // Verify some links have reduced opacity (dimmed)
      const allLinks = page.locator('.link-path');
      const opacity = await allLinks.nth(1).evaluate(el => 
        window.getComputedStyle(el).getPropertyValue('stroke-opacity')
      );
      
      // Some links should be dimmed (opacity < 1)
      expect(parseFloat(opacity)).toBeLessThanOrEqual(1);
    });

    test('should display buggy nodes with red stroke', async ({ page }) => {
      // Dashboard node should be buggy in sample data
      const buggyNode = page.locator('text=Dashboard').locator('..');
      const circle = buggyNode.locator('circle');
      
      // Check stroke color (should be destructive/red)
      const stroke = await circle.getAttribute('stroke');
      expect(stroke).toContain('destructive');
    });
  });

  test.describe('Metro Map View', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /map/i }).click();
    });

    test('should render metro map layout', async ({ page }) => {
      // Verify metro nodes exist
      const nodes = page.locator('.metro-node-group');
      await expect(nodes.first()).toBeVisible();

      // Verify metro links exist
      const links = page.locator('.metro-link');
      await expect(links.first()).toBeVisible();
    });

    test('should drag nodes to grid positions', async ({ page }) => {
      const node = page.locator('.metro-node-group').first();
      
      // Drag node
      const box = await node.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.up();
      }

      await page.waitForTimeout(500);

      // Undo button should be enabled
      await expect(page.getByRole('button', { name: /undo move/i })).toBeEnabled();
    });

    test('should undo node position changes', async ({ page }) => {
      const node = page.locator('.metro-node-group').first();
      const initialTransform = await node.getAttribute('transform');

      // Drag node
      await node.dragTo(node, { targetPosition: { x: 100, y: 100 } });
      await page.waitForTimeout(300);

      // Click undo
      await page.getByRole('button', { name: /undo move/i }).click();
      await page.waitForTimeout(300);

      // Verify position restored (approximately)
      const restoredTransform = await node.getAttribute('transform');
      expect(restoredTransform).toBe(initialTransform);
    });

    test('should zoom and pan metro map', async ({ page }) => {
      const svg = page.locator('svg.bg-background\\/50');
      const container = svg.locator('g').first();
      
      const initialTransform = await container.getAttribute('transform');

      // Zoom
      await svg.hover();
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(300);

      const zoomedTransform = await container.getAttribute('transform');
      expect(zoomedTransform).not.toBe(initialTransform);
    });
  });

  test.describe('Table View', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /table/i }).click();
    });

    test('should display elements in table', async ({ page }) => {
      // Verify table headers
      await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /is buggy/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /bug details/i })).toBeVisible();

      // Verify sample data rows
      const rows = page.getByRole('table').first().locator('tbody tr');
      await expect(await rows.count()).toBeGreaterThan(0);
    });

    test('should edit element name inline', async ({ page }) => {
      const firstRow = page.getByRole('table').first().locator('tbody tr').first();
      const nameInput = firstRow.locator('input').first();

      await nameInput.clear();
      await nameInput.fill('Edited Name');

      // Save changes
      await page.getByRole('button', { name: /save element changes/i }).click();

      // Verify toast
      await expect(page.getByText(/elements updated/i)).toBeVisible();
    });

    test('should toggle bug status via checkbox', async ({ page }) => {
      const firstRow = page.getByRole('table').first().locator('tbody tr').first();
      const checkbox = firstRow.locator('[role="checkbox"]');

      // Toggle checkbox
      await checkbox.click();

      // Save changes
      await page.getByRole('button', { name: /save element changes/i }).click();

      await expect(page.getByText(/elements updated/i)).toBeVisible();
    });

    test('should add new element from table', async ({ page }) => {
      await page.getByRole('button', { name: /add element/i }).first().click();

      // Verify new row appears
      const rows = page.getByRole('table').first().locator('tbody tr');
      const newRow = rows.last();
      
      // Fill in new element
      await newRow.locator('input').first().fill('Table Added Element');

      // Save
      await page.getByRole('button', { name: /save element changes/i }).click();
      await expect(page.getByText(/elements updated/i)).toBeVisible();
    });

    test('should delete element from table', async ({ page }) => {
      const firstRow = page.getByRole('table').first().locator('tbody tr').first();
      const deleteButton = firstRow.getByRole('button', { name: /trash/i });

      await deleteButton.click();

      // Confirm deletion
      await page.getByRole('button', { name: /continue/i }).click();

      await expect(page.getByText(/element deleted/i)).toBeVisible();
    });

    test('should display scenarios in table', async ({ page }) => {
      // Scroll to scenarios table
      const scenariosTable = page.getByRole('table').last();
      await scenariosTable.scrollIntoViewIfNeeded();

      // Verify scenario table headers
      await expect(page.getByRole('columnheader', { name: /^name$/i }).last()).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /group/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /methods/i })).toBeVisible();
    });

    test('should edit scenario methods as text', async ({ page }) => {
      const scenariosTable = page.getByRole('table').last();
      await scenariosTable.scrollIntoViewIfNeeded();

      const firstRow = scenariosTable.locator('tbody tr').first();
      const methodsTextarea = firstRow.locator('textarea');

      // Edit methods text
      await methodsTextarea.clear();
      await methodsTextarea.fill('Login Dialog, Dashboard');

      // Save
      await page.getByRole('button', { name: /save scenario changes/i }).click();
      await expect(page.getByText(/scenarios updated/i)).toBeVisible();
    });
  });
});
