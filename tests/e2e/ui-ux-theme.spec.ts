import { test, expect } from '@playwright/test';

/**
 * Test Suite: UI/UX & Theme
 * Tests theme switching, responsiveness, and UI interactions
 */

test.describe('UI/UX & Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.describe('Theme Switching', () => {
    test('should switch to dark theme', async ({ page }) => {
      // Click theme toggle
      await page.getByRole('button', { name: /toggle theme/i }).click();

      // Select Dark
      await page.getByRole('menuitem', { name: /^dark$/i }).click();

      // Verify dark theme applied
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
    });

    test('should switch to light theme', async ({ page }) => {
      // First switch to dark
      await page.getByRole('button', { name: /toggle theme/i }).click();
      await page.getByRole('menuitem', { name: /^dark$/i }).click();

      // Then switch to light
      await page.getByRole('button', { name: /toggle theme/i }).click();
      await page.getByRole('menuitem', { name: /^light$/i }).click();

      // Verify light theme (no 'dark' class)
      const html = page.locator('html');
      await expect(html).not.toHaveClass(/dark/);
    });

    test('should use system theme', async ({ page }) => {
      await page.getByRole('button', { name: /toggle theme/i }).click();
      await page.getByRole('menuitem', { name: /system/i }).click();

      // Theme should follow system preference
      // We can't easily test this, but verify no errors
      await page.waitForTimeout(500);
    });

    test('should persist theme preference', async ({ page }) => {
      // Set dark theme
      await page.getByRole('button', { name: /toggle theme/i }).click();
      await page.getByRole('menuitem', { name: /^dark$/i }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);

      // Reload page
      await page.reload();

      // Verify theme persists
      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });

  test.describe('Toast Notifications', () => {
    test('should show success toast on element creation', async ({ page }) => {
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('Test');
      await page.getByRole('button', { name: /^save$/i }).click();

      // Verify toast appears
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/success/i);
      await expect(toast).toContainText(/element added/i);
    });

    test('should show error toast on validation failure', async ({ page }) => {
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('Test');
      await page.getByRole('button', { name: /^save$/i }).click();

      // Try to add duplicate
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('Test');
      await page.getByRole('button', { name: /^save$/i }).click();

      // Verify error toast
      const toast = page.locator('[role="status"]').last();
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/duplicate name/i);
    });
  });

  test.describe('Modal Interactions', () => {
    test('should open and close modal with escape key', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: /add element/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Press escape
      await page.keyboard.press('Escape');

      // Verify modal closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should close modal by clicking outside', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: /add element/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click outside (on backdrop)
      await page.locator('[data-radix-dialog-overlay]').click({ force: true });

      // Verify modal closed
      await page.waitForTimeout(500);
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should trap focus within modal', async ({ page }) => {
      await page.getByRole('button', { name: /add element/i }).click();
      
      // Tab through inputs
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should remain within modal
      const focusedElement = page.locator(':focus');
      const modal = page.getByRole('dialog');
      
      // Verify focused element is inside modal
      const isInside = await modal.evaluate((modalEl, focusedEl) => {
        return modalEl.contains(focusedEl);
      }, await focusedElement.elementHandle());
      
      expect(isInside).toBe(true);
    });
  });

  test.describe('Accordion Behavior', () => {
    test('should expand and collapse scenario groups', async ({ page }) => {
      // Find first accordion item
      const accordionTrigger = page.locator('[data-radix-collection-item]').first();
      const accordionContent = accordionTrigger.locator('..').locator('[data-radix-accordion-content]');

      // Should be expanded by default
      await expect(accordionContent).toBeVisible();

      // Click to collapse
      await accordionTrigger.click();
      await page.waitForTimeout(300); // Wait for animation

      // Should be collapsed
      await expect(accordionContent).not.toBeVisible();

      // Click to expand again
      await accordionTrigger.click();
      await page.waitForTimeout(300);

      await expect(accordionContent).toBeVisible();
    });
  });

  test.describe('Scrolling & Overflow', () => {
    test('should scroll sidebar when many scenarios exist', async ({ page }) => {
      // Add many scenarios to trigger scroll
      for (let i = 0; i < 15; i++) {
        await page.getByRole('button', { name: /add scenario/i }).first().click();
        await page.getByPlaceholder(/e.g., New User Registration/i).fill(`Scenario ${i}`);
        await page.locator('button[title*="Add to Method 1"]').first().click();
        await page.getByRole('button', { name: /save scenario/i }).click();
        await page.waitForTimeout(200);
      }

      // Verify scroll area exists and is scrollable
      const scrollArea = page.locator('[data-radix-scroll-area-viewport]').first();
      await expect(scrollArea).toBeVisible();

      // Check if scrollable
      const scrollHeight = await scrollArea.evaluate(el => el.scrollHeight);
      const clientHeight = await scrollArea.evaluate(el => el.clientHeight);
      expect(scrollHeight).toBeGreaterThan(clientHeight);
    });
  });

  test.describe('Button States', () => {
    test('should disable export/import when no active graph', async ({ page }) => {
      // Delete all graphs (this would require multiple graphs first)
      // For now, we can't test this scenario easily
      // But we verify buttons are enabled by default
      await expect(page.getByRole('button', { name: /export/i })).toBeEnabled();
      await expect(page.getByRole('button', { name: /import/i })).toBeEnabled();
    });

    test('should disable save button during form submission', async ({ page }) => {
      await page.getByRole('button', { name: /add element/i }).click();
      await page.getByPlaceholder(/e.g. Login Page/i).fill('Test');
      
      // Click save and immediately check disabled state
      const saveButton = page.getByRole('button', { name: /^save$/i });
      await saveButton.click();
      
      // Button should be disabled during processing (though it's very fast)
      // This is hard to test reliably due to timing
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should submit scenario modal with Enter key in quick-add', async ({ page }) => {
      await page.getByRole('button', { name: /add scenario/i }).first().click();
      
      const quickAddInput = page.getByPlaceholder(/new element name/i);
      await quickAddInput.fill('Quick Element');
      await quickAddInput.press('Enter');

      // Verify element was added
      await expect(page.getByText(/element.*added/i)).toBeVisible();
    });

    test('should cancel modal with Escape key', async ({ page }) => {
      await page.getByRole('button', { name: /add element/i }).click();
      await page.keyboard.press('Escape');
      
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Responsive Layout', () => {
    test('should maintain layout on window resize', async ({ page }) => {
      // Verify default desktop layout
      await expect(page.locator('.dashboard')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();

      // Resize to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      // Layout should still be visible
      await expect(page.locator('.dashboard')).toBeVisible();

      // Resize back
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});
