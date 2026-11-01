const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');

async function testCollapsibleParts() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login as PE John
    console.log('Logging in as pe_john...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter username"]', 'pe_john');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');
    await page.waitForURL('**/production/dashboard');
    await page.waitForTimeout(800);

    // 2. Navigate to Part Master
    console.log('Navigating to Part Master...');
    await page.goto('http://localhost:5173/parts');
    await page.waitForTimeout(1500);

    // Screenshot 1: Grouped Collapsible View (Default)
    const screen1Path = path.resolve(__dirname, '../screen_parts_collapsible_open.png');
    await page.screenshot({ path: screen1Path, fullPage: true });
    console.log('✔ Screenshot 1 captured:', screen1Path);

    // 3. Test Collapse All
    console.log('Testing Collapse All...');
    await page.click('button:has-text("Collapse All")');
    await page.waitForTimeout(500);
    const screen2Path = path.resolve(__dirname, '../screen_parts_collapsed_all.png');
    await page.screenshot({ path: screen2Path, fullPage: true });
    console.log('✔ Screenshot 2 captured:', screen2Path);

    // 4. Click specific part name to open it (e.g. Axle Shaft or TM BKT)
    console.log('Opening Axle Shaft...');
    await page.click('text="Axle Shaft"');
    await page.waitForTimeout(500);
    const screen3Path = path.resolve(__dirname, '../screen_parts_single_open.png');
    await page.screenshot({ path: screen3Path, fullPage: true });
    console.log('✔ Screenshot 3 captured:', screen3Path);

    // 5. Test Flat List View
    console.log('Testing Flat List view...');
    await page.click('button:has-text("Flat List")');
    await page.waitForTimeout(500);
    const screen4Path = path.resolve(__dirname, '../screen_parts_flat_list.png');
    await page.screenshot({ path: screen4Path, fullPage: true });
    console.log('✔ Screenshot 4 captured:', screen4Path);

    // 6. Switch back to Grouped and Dark Mode
    console.log('Testing Dark Mode in Grouped view...');
    await page.click('button:has-text("Grouped (Collapsible)")');
    await page.waitForTimeout(300);
    const themeToggle = await page.$('button[aria-label="Toggle light or dark color mode"]');
    if (themeToggle) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    const screen5Path = path.resolve(__dirname, '../screen_parts_dark_mode.png');
    await page.screenshot({ path: screen5Path, fullPage: true });
    console.log('✔ Screenshot 5 captured:', screen5Path);

    console.log('All Part Master collapsible tests and screenshots completed successfully!');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testCollapsibleParts();

