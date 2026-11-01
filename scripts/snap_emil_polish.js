const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');

async function snapPolish() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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
    await page.waitForTimeout(1000);

    // Open Part Select dropdown
    console.log('2. Opening Part Select Dropdown...');
    await page.click('button:has-text("All Parts")');
    await page.waitForTimeout(400);

    const snap1 = path.join(artifactDir, 'emil_dropdown_scale_in.png');
    await page.screenshot({ path: snap1 });
    console.log('✔ Screenshot 1 saved:', snap1);

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Open Create Request Modal
    console.log('3. Opening Create Request Modal...');
    await page.click('button:has-text("Create Request")');
    await page.waitForTimeout(500);

    const snap2 = path.join(artifactDir, 'emil_modal_interaction.png');
    await page.screenshot({ path: snap2 });
    console.log('✔ Screenshot 2 saved:', snap2);

  } catch (err) {
    console.error('Error during snapPolish:', err);
  } finally {
    await browser.close();
  }
}

snapPolish();
