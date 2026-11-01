const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');

async function snap() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Login
    console.log('Logging in as pe_john...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter username"]', 'pe_john');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');
    await page.waitForURL('**/production/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Screenshot Dashboard
    const dashPath = path.resolve(__dirname, '../clean_production_dashboard.png');
    await page.screenshot({ path: dashPath, fullPage: true });
    console.log('✔ Clean Dashboard screenshot captured:', dashPath);

    // Navigate to summary report
    await page.goto('http://localhost:5173/reports/summary');
    await page.waitForTimeout(1000);
    const summaryPath = path.resolve(__dirname, '../clean_summary_report.png');
    await page.screenshot({ path: summaryPath, fullPage: true });
    console.log('✔ Clean Summary Report screenshot captured:', summaryPath);

    // Navigate to requests list
    await page.goto('http://localhost:5173/requests');
    await page.waitForTimeout(1000);
    const requestsPath = path.resolve(__dirname, '../clean_requests_list.png');
    await page.screenshot({ path: requestsPath, fullPage: true });
    console.log('✔ Clean Requests List screenshot captured:', requestsPath);
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    await browser.close();
  }
}

snap();
