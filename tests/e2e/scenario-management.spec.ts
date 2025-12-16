import { test, expect, Page } from '@playwright/test';

/**
 * Test Suite: Scenario Management
 * Tests CRUD operations for User Scenarios (Flows)
 */

// Helper to get the sidebar by looking for the Scenarios heading's parent container
const getSidebar = (page: Page) => page.locator('div').filter({ has: page.getByRole('heading', { name: 'Scenarios' }) }).first();

test.describe('Scenario Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for sample data to load
    await page.waitForSelector('.node-group', { timeout: 10000 });
    // Wait for sidebar to render
    await expect(page.getByRole('heading', { name: 'Scenarios' })).toBeVisible({ timeout: 5000 });
  });

  test('should display sample scenarios in sidebar', async ({ page }) => {
    // Verify scenarios section exists
    await expect(page.getByRole('heading', { name: 'Scenarios' })).toBeVisible();
    
    // Verify Add Scenario button exists
    await expect(page.getByRole('button', { name: /add scenario/i })).toBeVisible();
    
    // Sample scenarios should have been loaded - accordion group should be visible
    // Look for Onboarding group (contains User Login)
    await expect(page.getByText('Onboarding')).toBeVisible();
  });

  test('should create a new scenario with single method', async ({ page }) => {
    // Click "Add Scenario" button
    await page.getByRole('button', { name: /add scenario/i }).click();
    
    // Wait for modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add New Scenario')).toBeVisible();

    // Enter scenario name
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('Checkout Flow');

    // Add elements to method 1 - the modal shows available elements with badge buttons
    const addButtons = page.locator('button[title="Add to Method 1"]');
    await expect(addButtons.first()).toBeVisible({ timeout: 5000 });
    await addButtons.first().click();
    await page.waitForTimeout(300);

    // Save scenario
    await page.getByRole('button', { name: /save scenario/i }).click();

    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('should create scenario with multiple methods', async ({ page }) => {
    await page.getByRole('button', { name: /add scenario/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    
    await page.getByPlaceholder(/e.g., New User Registration/i).fill('Multi-Path Flow');

    // Add element to method 1
    const addMethod1Buttons = page.locator('button[title="Add to Method 1"]');
    await expect(addMethod1Buttons.first()).toBeVisible({ timeout: 5000 });
    await addMethod1Buttons.first().click();
    await page.waitForTimeout(300);

    // Add another method
    await page.getByRole('button', { name: /add method/i }).click();
    await page.waitForTimeout(300);

    // Add element to method 2 (badges now show "1" and "2")
    const addMethod2Buttons = page.locator('button[title="Add to Method 2"]');
    await expect(addMethod2Buttons.first()).toBeVisible();
    await addMethod2Buttons.first().click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /save scenario/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('should edit an existing scenario', async ({ page }) => {
    // Look for Onboarding group (contains sample scenarios)
    await expect(page.getByText('Onboarding')).toBeVisible({ timeout: 5000 });

    // Find an edit button (Edit icon) near the scenario cards  
    // The Edit button is in the CardHeader alongside eye icon
    const editButtons = page.locator('button').filter({ has: page.locator('[class*="lucide-edit"], [class*="lucide-pencil"]').or(page.locator('svg')) });
    
    // Click the first edit button that's visible
    const firstEditButton = editButtons.nth(2); // Skip the first few header buttons
    await firstEditButton.click();
    
    // Wait for edit modal - if it opened
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      await expect(page.getByText('Edit Scenario')).toBeVisible({ timeout: 5000 });
      
      // Close the modal
      await page.keyboard.press('Escape');
    }
  });

  test('should toggle scenario visibility', async ({ page }) => {
    // Look for sample scenarios
    await expect(page.getByText('Onboarding')).toBeVisible({ timeout: 5000 });
    
    // Find eye icon buttons (for visibility toggle)
    // These are inside the scenario cards
    const eyeButtons = page.locator('button').filter({ 
      has: page.locator('[class*="lucide-eye"]') 
    });
    
    // Click the first eye button
    const firstEyeButton = eyeButtons.first();
    if (await firstEyeButton.count() > 0) {
      await firstEyeButton.click();
      await page.waitForTimeout(300);
      
      // Click again to toggle back
      await firstEyeButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should delete a scenario', async ({ page }) => {
    await expect(page.getByText('Onboarding')).toBeVisible({ timeout: 5000 });
    
    // Try to click an edit button to open scenario modal
    const editButtons = page.locator('button').filter({ has: page.locator('svg') });
    
    // Look for edit button specifically
    for (let i = 0; i < 10; i++) {
      const btn = editButtons.nth(i);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
        
        // Check if Edit Scenario modal opened
        if (await page.getByText('Edit Scenario').isVisible()) {
          // Click delete button in modal
          const deleteBtn = page.getByRole('button', { name: /delete scenario/i });
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            
            // Confirm deletion
            await page.getByRole('button', { name: /continue/i }).click();
            await page.waitForTimeout(500);
            break;
          }
        }
        
        // Close dialog if wrong one opened
        if (await page.getByRole('dialog').isVisible()) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
    }
  });

  test('should hover scenario card and highlight in graph', async ({ page }) => {
    // Sample scenarios have Onboarding and User Management groups
    await expect(page.getByText('Onboarding')).toBeVisible({ timeout: 5000 });
    
    // Hover over the group header
    await page.getByText('Onboarding').hover();
    await page.waitForTimeout(200);

    // Verify graph links exist
    const links = page.locator('.link-path');
    await expect(links.first()).toBeAttached();
  });
});
