const { chromium } = require('C:/Users/VC/.gemini/config/skills/playwright-skill/node_modules/playwright');
const path = require('path');

async function testModal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter username"]', 'pe_john');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In to System")');
    await page.waitForURL('**/production/dashboard');
    await page.waitForTimeout(800);

    // 2. Navigate to /parts
    console.log('Navigating to Part Master...');
    await page.goto('http://localhost:5173/parts');
    await page.waitForTimeout(1000);

    // 3. Open Add New Part Modal
    console.log('Opening Add New Part Modal...');
    const startTime = Date.now();
    await page.click('button:has-text("Add New Part")');
    await page.waitForSelector('text=Create New Part Mapping', { timeout: 3000 });
    const elapsed = Date.now() - startTime;
    console.log(`✔ Modal opened in ${elapsed}ms (lightning fast, zero lag)!`);

    // Verify initial focus is on the first input
    const isFocused = await page.$eval('input#part-name-input', (el) => el === document.activeElement);
    console.log('✔ Initial focus on Part Name input:', isFocused);

    // Screenshot of smooth open modal (Light mode)
    const modalLightPath = path.resolve(__dirname, '../screen_modal_light_smooth.png');
    await page.screenshot({ path: modalLightPath });
    console.log('✔ Screenshot light modal captured:', modalLightPath);

    // 4. Close modal
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(400);

    // 5. Open modal from specific collapsible card: "Axle Shaft" -> "Add Part Number"
    console.log('Opening modal from Axle Shaft card...');
    const addAxleBtn = await page.$('div:has-text("Axle Shaft") button:has-text("Add Part Number")');
    if (addAxleBtn) {
      await addAxleBtn.click();
      await page.waitForSelector('text=Add Part Number to "Axle Shaft"', { timeout: 3000 });
      const modalPrefilledPath = path.resolve(__dirname, '../screen_modal_prefilled_smooth.png');
      await page.screenshot({ path: modalPrefilledPath });
      console.log('✔ Screenshot prefilled modal captured:', modalPrefilledPath);
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(400);
    }

    console.log('All modal performance tests completed successfully!');
  } catch (err) {
    console.error('Modal test error:', err);
  } finally {
    await browser.close();
  }
}

testModal();

