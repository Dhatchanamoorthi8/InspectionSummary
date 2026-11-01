const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function snapRunCharts() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  try {
    console.log('Logging in as pe_john...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter username"]', 'pe_john');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');
    await page.waitForURL('**/production/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Scroll to the run charts
    await page.evaluate(() => {
      window.scrollTo(0, 550);
    });
    await page.waitForTimeout(500);

    // Click custom select for BHN chart and choose AX-1001
    console.log('Selecting AX-1001 on Hardness chart...');
    await page.click('#run-chart-part-bhn button');
    await page.waitForTimeout(300);
    await page.click('#run-chart-part-bhn >> text=AX-1001');
    await page.waitForTimeout(500);

    // Click custom select for YS chart and choose AX-1001
    console.log('Selecting AX-1001 on Yield Strength chart...');
    await page.click('#run-chart-part-ys button');
    await page.waitForTimeout(300);
    await page.click('#run-chart-part-ys >> text=AX-1001');
    await page.waitForTimeout(800);

    const artifactDir = 'C:/Users/VC/.gemini/antigravity/brain/e891c8d2-8113-4b6b-ac84-ff36341bfab1';
    const targetPath = path.join(artifactDir, 'run_charts_date_axis_verified.png');
    await page.screenshot({ path: targetPath, fullPage: false });
    console.log('✔ Screenshot saved:', targetPath);

    const localSnapPath = path.resolve(__dirname, '../run_charts_date_axis_verified.png');
    fs.copyFileSync(targetPath, localSnapPath);
  } catch (err) {
    console.error('Error during snapRunCharts:', err);
  } finally {
    await browser.close();
  }
}

snapRunCharts();
