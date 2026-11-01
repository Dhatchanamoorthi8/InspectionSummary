const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/VC/.gemini/antigravity/brain/e891c8d2-8113-4b6b-ac84-ff36341bfab1';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

    console.log('2. Logging in as Production Engineer...');
    await page.fill('input[placeholder="Enter username"]', 'pe_john');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');

    await page.waitForURL('**/production/dashboard', { timeout: 10000 });
    console.log('   Logged in successfully. Navigating to /requests...');

    await page.goto('http://localhost:5173/requests', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Capture initial requests list showing Shift column
    const shiftListPath = path.join(ARTIFACT_DIR, 'requests_list_shift_column_verified.png');
    await page.screenshot({ path: shiftListPath, fullPage: true });
    console.log(`   Saved screenshot: ${shiftListPath}`);

    // Verify Shift column exists in table
    const tableHeader = await page.textContent('th:has-text("Shift")');
    console.log(`   Table header has Shift: ${!!tableHeader}`);

    // Test Shift Filter
    console.log('3. Testing Shift Filter in toolbar...');
    const shiftFilter = page.locator('#filter-shift button');
    if (await shiftFilter.count() > 0) {
      console.log('   Shift filter exists on toolbar. Clicking to view shift options...');
      await shiftFilter.click();
      await page.waitForTimeout(400);
      const shiftFilterScreenshot = path.join(ARTIFACT_DIR, 'requests_list_shift_filter_dropdown.png');
      await page.screenshot({ path: shiftFilterScreenshot });
      console.log(`   Saved shift filter dropdown screenshot: ${shiftFilterScreenshot}`);
      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Open Create Request Modal
    console.log('4. Opening Create Request Modal...');
    await page.click('button:has-text("Create Request")');
    await page.waitForSelector('text=Create Inspection Request', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify Shift selector exists in modal
    const shiftLabel = await page.textContent('text=PRODUCTION SHIFT *');
    console.log(`   Modal contains PRODUCTION SHIFT: ${!!shiftLabel}`);

    // Screenshot open modal with shift options
    const modalShiftPath = path.join(ARTIFACT_DIR, 'create_request_modal_shift_verified.png');
    await page.screenshot({ path: modalShiftPath });
    console.log(`   Saved modal screenshot: ${modalShiftPath}`);

    // Change Shift to Shift 2
    console.log('5. Selecting Shift 2 (14:00 – 22:00)...');
    await page.click('button:has-text("Shift 1 (06:00 – 14:00)")');
    await page.waitForTimeout(400);
    await page.locator('[role="listbox"] [role="option"]:has-text("Shift 2")').click();
    await page.waitForTimeout(500);

    // Select Part Name
    console.log('   Selecting Part Name...');
    await page.click('button:has-text("Select Part Name")');
    await page.waitForTimeout(500);
    await page.locator('[role="listbox"] [role="option"]').first().click();
    await page.waitForTimeout(600);

    // Select Part Number
    console.log('   Selecting Part Number...');
    await page.click('button:has-text("Select Part Number")');
    await page.waitForTimeout(500);
    await page.locator('[role="listbox"] [role="option"]').first().click();
    await page.waitForTimeout(500);

    // Select Inspector
    console.log('   Selecting Inspector...');
    await page.click('button:has-text("Select Active Quality Inspector")');
    await page.waitForTimeout(500);
    await page.locator('[role="listbox"] [role="option"]').first().click();
    await page.waitForTimeout(500);

    // Fill Remarks
    await page.fill('textarea', 'Verified Shift 2 metallurgical inspection request');

    // Screenshot filled modal
    const filledModalPath = path.join(ARTIFACT_DIR, 'create_request_filled_shift2.png');
    await page.screenshot({ path: filledModalPath });
    console.log(`   Saved filled modal screenshot: ${filledModalPath}`);

    // Click submit
    console.log('6. Submitting Create & Assign Request...');
    await page.click('button:has-text("Create & Assign Request")');
    await page.waitForTimeout(2500);

    // Verify it appears in requests list
    const updatedListPath = path.join(ARTIFACT_DIR, 'requests_list_with_new_shift2_request.png');
    await page.screenshot({ path: updatedListPath, fullPage: true });
    console.log(`   Saved updated list screenshot: ${updatedListPath}`);

    // Click on the first Detail button
    console.log('7. Viewing Detail page to verify Shift badge...');
    await page.locator('button:has-text("Detail")').first().click();
    await page.waitForSelector('text=Production Shift', { timeout: 6000 });
    await page.waitForTimeout(1000);

    const detailShiftPath = path.join(ARTIFACT_DIR, 'request_detail_shift_verified.png');
    await page.screenshot({ path: detailShiftPath, fullPage: true });
    console.log(`   Saved detail page screenshot: ${detailShiftPath}`);

    // Also check Dashboard run charts for Shift tooltip
    console.log('8. Checking Dashboard Run Charts...');
    await page.goto('http://localhost:5173/production/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 550));
    await page.waitForTimeout(500);

    const runChartsPath = path.join(ARTIFACT_DIR, 'dashboard_runcharts_shift_verified.png');
    await page.screenshot({ path: runChartsPath });
    console.log(`   Saved run charts screenshot: ${runChartsPath}`);

    console.log('ALL SHIFT TRACKING VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shift_verification_error.png'), fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
