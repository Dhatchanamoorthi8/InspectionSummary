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

    console.log('2. Logging in as Quality Inspector (qi_david)...');
    await page.fill('input[placeholder="Enter username"]', 'qi_david');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');

    await page.waitForURL('**/inspector/dashboard', { timeout: 10000 });
    console.log('   Logged in successfully. On Quality Inspector Workspace.');
    await page.waitForTimeout(1500);

    const initialDashboardPath = path.join(ARTIFACT_DIR, 'inspector_dashboard_kpi_cards.png');
    await page.screenshot({ path: initialDashboardPath, fullPage: true });
    console.log(`   Saved inspector dashboard screenshot: ${initialDashboardPath}`);

    // Test 1: Click "Pending (Not Started)" card
    console.log('3. Clicking "Pending (Not Started)" KPI card...');
    await page.locator('text=Pending (Not Started)').click();
    await page.waitForURL('**/tasks?status=Assigned', { timeout: 6000 });
    await page.waitForTimeout(1000);

    const pendingScreenshotPath = path.join(ARTIFACT_DIR, 'inspector_kpi_click_pending_assigned.png');
    await page.screenshot({ path: pendingScreenshotPath, fullPage: true });
    console.log(`   Saved pending click screenshot: ${pendingScreenshotPath}`);

    // Verify filter active tag
    const filterActiveText = await page.textContent('text=Status: Assigned');
    console.log(`   Filter Active shows Status: Assigned -> ${!!filterActiveText}`);

    // Test 2: Return to dashboard, click "Done / Completed"
    console.log('4. Returning to dashboard and clicking "Done / Completed" KPI card...');
    await page.goto('http://localhost:5173/inspector/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('text=Done / Completed').click();
    await page.waitForURL('**/tasks?status=Completed', { timeout: 6000 });
    await page.waitForTimeout(1000);

    const completedScreenshotPath = path.join(ARTIFACT_DIR, 'inspector_kpi_click_completed.png');
    await page.screenshot({ path: completedScreenshotPath, fullPage: true });
    console.log(`   Saved completed click screenshot: ${completedScreenshotPath}`);

    // Test 3: Return to dashboard, click "Heat Treatment Fail" (BHN < 80)
    console.log('5. Returning to dashboard and clicking "Heat Treatment Fail" KPI card...');
    await page.goto('http://localhost:5173/inspector/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('text=Heat Treatment Fail').click();
    await page.waitForURL('**/tasks?status=Completed&hardnessStatus=NOT_OK', { timeout: 6000 });
    await page.waitForTimeout(1000);

    const htFailScreenshotPath = path.join(ARTIFACT_DIR, 'inspector_kpi_click_ht_fail.png');
    await page.screenshot({ path: htFailScreenshotPath, fullPage: true });
    console.log(`   Saved HT Fail click screenshot: ${htFailScreenshotPath}`);

    const htTag = await page.textContent('text=Hardness (BHN): BHN < 80 Sub-Spec');
    console.log(`   Filter Active shows Hardness Sub-Spec -> ${!!htTag}`);

    // Test 4: Return to dashboard, click "Tensile Qty Fail"
    console.log('6. Returning to dashboard and clicking "Tensile Qty Fail" KPI card...');
    await page.goto('http://localhost:5173/inspector/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('text=Tensile Qty Fail').click();
    await page.waitForURL('**/tasks?status=Completed&mechanicalStatus=NOT_OK', { timeout: 6000 });
    await page.waitForTimeout(1000);

    const tensileFailScreenshotPath = path.join(ARTIFACT_DIR, 'inspector_kpi_click_tensile_fail.png');
    await page.screenshot({ path: tensileFailScreenshotPath, fullPage: true });
    console.log(`   Saved Tensile Fail click screenshot: ${tensileFailScreenshotPath}`);

    const tensileTag = await page.textContent('text=Tensile Mechanical: Sub-Spec (Rej)');
    console.log(`   Filter Active shows Tensile Sub-Spec -> ${!!tensileTag}`);

    // Test 5: Click "Clear Filters ×"
    console.log('7. Testing "Clear Filters ×" button...');
    await page.click('button:has-text("Clear Filters ×")');
    await page.waitForTimeout(1000);

    const clearedScreenshotPath = path.join(ARTIFACT_DIR, 'inspector_kpi_cleared_filters.png');
    await page.screenshot({ path: clearedScreenshotPath, fullPage: true });
    console.log(`   Saved cleared filters screenshot: ${clearedScreenshotPath}`);

    console.log('ALL QUALITY INSPECTOR KPI CARD CLICK & FILTER TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'inspector_kpi_error.png'), fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

