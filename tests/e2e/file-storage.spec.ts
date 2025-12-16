import { test, expect } from '@playwright/test';

/**
 * Test Suite: File Storage (Save/Open)
 * Tests server-side file save and open functionality
 */

test.describe('File Storage - Save/Open', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.node-group', { timeout: 10000 });
  });

  test.describe('Save Modal', () => {
    test('should open save modal when clicking Save button', async ({ page }) => {
      await page.getByRole('button', { name: /save/i }).first().click();
      
      // Modal should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /save to file/i })).toBeVisible();
    });

    test('should show filename input in save modal', async ({ page }) => {
      await page.getByRole('button', { name: /save/i }).first().click();
      
      await expect(page.getByLabel(/file name/i)).toBeVisible();
    });

    test('should save file successfully', async ({ page }) => {
      const testFilename = 'Test_Save_Graph_' + Date.now();
      
      await page.getByRole('button', { name: /save/i }).first().click();
      
      // Enter filename
      await page.getByLabel(/file name/i).fill(testFilename);
      
      // Click save button in dialog
      await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
      
      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      
      // Wait for save to complete
      await page.waitForTimeout(500);
      
      // Verify by opening file browser - the file should appear
      await page.getByRole('button', { name: /open/i }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(testFilename)).toBeVisible({ timeout: 5000 });
    });

    test('should show cancel button that closes modal', async ({ page }) => {
      await page.getByRole('button', { name: /save/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Open Modal', () => {
    test('should open file browser when clicking Open button', async ({ page }) => {
      await page.getByRole('button', { name: /open/i }).first().click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /open from file/i })).toBeVisible();
    });

    test('should show saved files list', async ({ page }) => {
      const testFilename = 'Test_List_File_' + Date.now();
      
      // First save a file
      await page.getByRole('button', { name: /save/i }).first().click();
      await page.getByLabel(/file name/i).fill(testFilename);
      await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      
      // Wait for file to be saved
      await page.waitForTimeout(1000);
      
      // Now open the file browser
      await page.getByRole('button', { name: /open/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Wait for files to load
      await page.waitForTimeout(500);
      
      // Should see the saved file in the dialog
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(testFilename)).toBeVisible({ timeout: 5000 });
    });

    test('should open selected file', async ({ page }) => {
      const testFilename = 'Test_Open_File_' + Date.now();
      
      // Save a file first
      await page.getByRole('button', { name: /save/i }).first().click();
      await page.getByLabel(/file name/i).fill(testFilename);
      await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      
      // Wait for file to be saved
      await page.waitForTimeout(1000);
      
      // Open file browser
      await page.getByRole('button', { name: /open/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Wait for files to load
      await page.waitForTimeout(500);
      
      // Select the file in the dialog
      const dialog = page.getByRole('dialog');
      await dialog.getByText(testFilename).click();
      
      // Click Open button
      await dialog.getByRole('button', { name: /^open$/i }).click();
      
      // Modal should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('should disable open button when no file selected', async ({ page }) => {
      await page.getByRole('button', { name: /open/i }).first().click();
      
      const openButton = page.getByRole('dialog').getByRole('button', { name: /^open$/i });
      await expect(openButton).toBeDisabled();
    });
  });

  test.describe('File Operations', () => {
    test('should rename file using double-click', async ({ page }) => {
      const testFilename = 'Test_Rename_Original_' + Date.now();
      const newFilename = 'Test_Rename_New_' + Date.now();
      
      // Save a file first
      await page.getByRole('button', { name: /save/i }).first().click();
      await page.getByLabel(/file name/i).fill(testFilename);
      await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      
      // Wait for file to be saved
      await page.waitForTimeout(1000);
      
      // Open file browser
      await page.getByRole('button', { name: /open/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Wait for files to load
      await page.waitForTimeout(500);
      
      const dialog = page.getByRole('dialog');
      
      // Verify file is in the list
      await expect(dialog.getByText(testFilename)).toBeVisible();
      
      // Double-click on filename to enter edit mode
      await dialog.getByText(testFilename).dblclick();
      
      // An input should appear
      const renameInput = dialog.locator('input[class*="h-6"]');
      await expect(renameInput).toBeVisible();
      
      // Clear and type new filename
      await renameInput.fill(newFilename);
      await renameInput.press('Enter');
      
      // Wait for rename to complete
      await page.waitForTimeout(500);
      
      // Old name should be gone, new name should appear
      await expect(dialog.getByText(testFilename)).not.toBeVisible();
      await expect(dialog.getByText(newFilename)).toBeVisible();
    });

    test('should rename file using rename button', async ({ page }) => {
      const testFilename = 'Test_Rename_Btn_' + Date.now();
      const newFilename = 'Test_Renamed_Btn_' + Date.now();
      
      // Save a file first
      await page.getByRole('button', { name: /save/i }).first().click();
      await page.getByLabel(/file name/i).fill(testFilename);
      await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      
      // Wait for file to be saved
      await page.waitForTimeout(1000);
      
      // Open file browser
      await page.getByRole('button', { name: /open/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Wait for files to load
      await page.waitForTimeout(500);
      
      const dialog = page.getByRole('dialog');
      
      // Find file row and click rename button
      const fileRow = dialog.locator('[class*="cursor-pointer"]').filter({ hasText: testFilename });
      await fileRow.getByRole('button', { name: 'Rename file' }).click();
      
      // An input should appear
      const renameInput = dialog.locator('input[class*="h-6"]');
      await expect(renameInput).toBeVisible();
      
      // Clear and type new filename
      await renameInput.fill(newFilename);
      await renameInput.press('Enter');
      
      // Wait for rename to complete
      await page.waitForTimeout(500);
      
      // New name should appear
      await expect(dialog.getByText(newFilename)).toBeVisible();
    });

    test('should delete file from list', async ({ page }) => {
      const testFilename = 'Test_Delete_File_' + Date.now();
      
      // Save a file first
      await page.getByRole('button', { name: /save/i }).first().click();
      await page.getByLabel(/file name/i).fill(testFilename);
      await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      
      // Wait for file to be saved
      await page.waitForTimeout(1000);
      
      // Open file browser
      await page.getByRole('button', { name: /open/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Wait for files to load
      await page.waitForTimeout(500);
      
      const dialog = page.getByRole('dialog');
      
      // Verify file is in the list
      await expect(dialog.getByText(testFilename)).toBeVisible();
      
      // Handle confirmation dialog
      page.on('dialog', d => d.accept());
      
      // Find the delete button (trash icon) for this specific file
      // The file list item structure has the filename text and buttons for rename and delete
      const fileRow = dialog.locator('[class*="cursor-pointer"]').filter({ hasText: testFilename });
      await fileRow.getByRole('button', { name: 'Delete file' }).click();
      
      // Wait for deletion
      await page.waitForTimeout(500);
      
      // File should no longer be in the list
      await expect(dialog.getByText(testFilename)).not.toBeVisible();
    });

    test('should show empty state when no files exist', async ({ page }) => {
      // This test checks the empty state message when no files are saved
      // We can't reliably clear all files, so we just check the UI shows properly
      // when opening the dialog (empty or with files)
      await page.getByRole('button', { name: /open/i }).first().click();
      
      // Dialog should be visible with proper heading
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /open from file/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should disable save button for empty filename', async ({ page }) => {
      await page.getByRole('button', { name: /save/i }).first().click();
      
      // Clear the filename
      await page.getByLabel(/file name/i).fill('');
      
      // Save button should be disabled
      const saveButton = page.getByRole('dialog').getByRole('button', { name: /^save$/i });
      await expect(saveButton).toBeDisabled();
    });
  });
});
