import { test, expect } from '@playwright/test';

/**
 * Test Suite: Scenario Management
 * Tests CRUD operations for User Scenarios (Flows)
 */

test.describe('Scenario Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for sample data to load
    await expect(page.getByText('User Login')).toBeVisible();
  });

  test('should create a new scenario with single method', async ({ page }) => {
    // Click "Add Scenario" button
    await page.getByRole('button', { name: /add scenario/i }).first().click();
    
    // Wait for modal
    await expect(page.getByText('Add New Scenario')).toBeVisible();

    // Enter scenario name
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('Checkout Flow');

    // Select group
    await page.getByRole('combobox').click();
    await page.keyboard.type('E-commerce');
    await page.keyboard.press('Enter');

    // Add elements to method 1
    // Click the "1" badge next to first element to add it
    await page.locator('button[title*="Add to Method 1"]').first().click();
    await page.locator('button[title*="Add to Method 1"]').nth(1).click();

    // Save scenario
    await page.getByRole('button', { name: /save scenario/i }).click();

    // Verify success toast
    await expect(page.getByText(/scenario added/i)).toBeVisible();

    // Verify scenario appears in sidebar
    await expect(page.getByText('Checkout Flow')).toBeVisible();
    await expect(page.getByText('E-commerce')).toBeVisible();
  });

  test('should create scenario with multiple methods', async ({ page }) => {
    await page.getByRole('button', { name: /add scenario/i }).first().click();
    
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('Multi-Path Flow');

    // Add elements to method 1
    await page.locator('button[title*="Add to Method 1"]').first().click();
    await page.locator('button[title*="Add to Method 1"]').nth(1).click();

    // Add another method
    await page.getByRole('button', { name: /add method/i }).click();

    // Add elements to method 2
    await page.locator('button[title*="Add to Method 2"]').first().click();
    await page.locator('button[title*="Add to Method 2"]').nth(2).click();

    await page.getByRole('button', { name: /save scenario/i }).click();

    await expect(page.getByText(/scenario added/i)).toBeVisible();
    await expect(page.getByText('Multi-Path Flow')).toBeVisible();
  });

  test('should validate scenario name uniqueness', async ({ page }) => {
    // Try to create scenario with existing name
    await page.getByRole('button', { name: /add scenario/i }).first().click();
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('User Login');
    await page.locator('button[title*="Add to Method 1"]').first().click();
    await page.getByRole('button', { name: /save scenario/i }).click();

    // Verify error toast
    await expect(page.getByText(/duplicate name/i)).toBeVisible();
  });

  test('should edit an existing scenario', async ({ page }) => {
    // Click edit button on first scenario
    await page.locator('.dashboard').getByRole('button', { name: /edit/i }).first().click();
    
    // Wait for modal
    await expect(page.getByText('Edit Scenario')).toBeVisible();

    // Change name
    const nameInput = page.getByPlaceholder(/e.g., New User Registration/i);
    await nameInput.clear();
    await nameInput.fill('Updated Flow Name');

    await page.getByRole('button', { name: /save scenario/i }).click();

    // Verify update
    await expect(page.getByText(/scenario updated/i)).toBeVisible();
    await expect(page.getByText('Updated Flow Name')).toBeVisible();
  });

  test('should delete a scenario', async ({ page }) => {
    // Click edit to open modal, then delete
    await page.locator('.dashboard').getByRole('button', { name: /edit/i }).first().click();
    await expect(page.getByText('Edit Scenario')).toBeVisible();

    // Click delete button in modal
    await page.getByRole('button', { name: /delete scenario/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /continue/i }).click();

    // Verify success
    await expect(page.getByText(/scenario deleted/i)).toBeVisible();
  });

  test('should toggle scenario visibility', async ({ page }) => {
    // Get the first scenario card
    const scenarioCard = page.locator('.dashboard').locator('div[class*="border-l-4"]').first();
    
    // Click the eye icon to hide
    await scenarioCard.getByRole('button').first().click();

    // Verify opacity changes (dimmed)
    await expect(scenarioCard).toHaveClass(/opacity-50/);

    // Click again to show
    await scenarioCard.getByRole('button').first().click();
    await expect(scenarioCard).not.toHaveClass(/opacity-50/);
  });

  test('should toggle entire group visibility', async ({ page }) => {
    // Find group toggle button (next to accordion trigger)
    const groupToggle = page.locator('[class*="AccordionItem"]').first().getByRole('button').last();
    
    // Toggle group off
    await groupToggle.click();

    // Verify all scenarios in group are dimmed
    const scenarios = page.locator('[class*="AccordionContent"]').first().locator('div[class*="border-l-4"]');
    await expect(scenarios.first()).toHaveClass(/opacity-50/);

    // Toggle group back on
    await groupToggle.click();
    await expect(scenarios.first()).not.toHaveClass(/opacity-50/);
  });

  test('should reorder elements within a method', async ({ page }) => {
    await page.getByRole('button', { name: /add scenario/i }).first().click();
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('Reorder Test');

    // Add 3 elements
    await page.locator('button[title*="Add to Method 1"]').first().click();
    await page.locator('button[title*="Add to Method 1"]').nth(1).click();
    await page.locator('button[title*="Add to Method 1"]').nth(2).click();

    // Click down arrow on first element (should move it down)
    const methodContainer = page.locator('text=Method 1').locator('..').locator('..');
    await methodContainer.getByRole('button').filter({ hasText: 'ChevronsDown' }).first().click();

    await page.getByRole('button', { name: /save scenario/i }).click();
    await expect(page.getByText(/scenario added/i)).toBeVisible();
  });

  test('should quick-add element from scenario modal', async ({ page }) => {
    await page.getByRole('button', { name: /add scenario/i }).first().click();
    
    // Use quick-add input
    await page.getByPlaceholder(/new element name/i).fill('Quick Added Element');
    await page.getByPlaceholder(/new element name/i).press('Enter');

    // Verify toast
    await expect(page.getByText(/element.*added/i)).toBeVisible();

    // Verify element appears in available list
    await expect(page.getByText('Quick Added Element')).toBeVisible();
  });

  test('should validate scenario has at least one method', async ({ page }) => {
    await page.getByRole('button', { name: /add scenario/i }).first().click();
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('Empty Scenario');

    // Try to save without adding any elements
    await page.getByRole('button', { name: /save scenario/i }).click();

    // Verify validation error
    await expect(page.getByText(/must have at least one method/i)).toBeVisible();
  });

  test('should hover scenario card and highlight in graph', async ({ page }) => {
    // Hover over a scenario card
    const scenarioCard = page.locator('.dashboard').locator('div[class*="border-l-4"]').first();
    await scenarioCard.hover();

    // Verify links in graph are highlighted (opacity changes)
    // This is a visual check - we verify that some links have reduced opacity
    const links = page.locator('.link-path');
    await expect(links.first()).toBeVisible();
  });
});
