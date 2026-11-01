const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  const artifactDir = 'C:/Users/VC/.gemini/antigravity/brain/e891c8d2-8113-4b6b-ac84-ff36341bfab1';

  try {
    console.log('1. Logging in as pe_john...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter username"]', 'pe_john');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');
    await page.waitForURL('**/production/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Scroll to the run charts
    await page.evaluate(() => window.scrollTo(0, 550));
    await page.waitForTimeout(500);

    // Select AX-1001 on Hardness chart and Yield Strength chart
    console.log('2. Selecting AX-1001 on charts...');
    await page.click('#run-chart-part-bhn button');
    await page.waitForTimeout(300);
    await page.click('#run-chart-part-bhn >> text=AX-1001');
    await page.waitForTimeout(400);

    await page.click('#run-chart-part-ys button');
    await page.waitForTimeout(300);
    await page.click('#run-chart-part-ys >> text=AX-1001');
    await page.waitForTimeout(800);

    // Capture Option A: Clean Heat Batch Numbers on X-Axis
    const snapPath1 = path.join(artifactDir, 'option_a_batch_numbers_verified.png');
    await page.screenshot({ path: snapPath1, fullPage: false });
    console.log('✔ Screenshot 1 saved (Option A - Batch Numbers):', snapPath1);

    // Scroll back to top to test Date Filter for September
    console.log('3. Testing September filter (2026-09-01 to 2026-09-30)...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Open date range picker
    const trigger = page.locator('button[data-scope="date-picker"][data-part="trigger"]');
    await trigger.click();
    await page.waitForTimeout(600);

    // Click previous month button in day view
    const prevBtn = page.getByRole('button', { name: 'Switch to previous month' });
    await prevBtn.click();
    await page.waitForTimeout(500);

    // Click Sept 01 and Sept 30
    const startDay = page.locator('[data-scope="date-picker"][data-part="table-cell-trigger"][data-value="2026-09-01"]');
    await startDay.click();
    await page.waitForTimeout(300);
    const endDay = page.locator('[data-scope="date-picker"][data-part="table-cell-trigger"][data-value="2026-09-30"]');
    await endDay.click();
    await page.waitForTimeout(1500);

    // Capture KPI and charts with September filter active
    const snapPath2 = path.join(artifactDir, 'september_filter_active_verified.png');
    await page.screenshot({ path: snapPath2, fullPage: false });
    console.log('✔ Screenshot 2 saved (September Filter):', snapPath2);

    // Scroll down to see run charts for September
    await page.evaluate(() => window.scrollTo(0, 550));
    await page.waitForTimeout(600);
    const snapPath3 = path.join(artifactDir, 'september_runcharts_verified.png');
    await page.screenshot({ path: snapPath3, fullPage: false });
    console.log('✔ Screenshot 3 saved (September Run Charts):', snapPath3);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verify();
