const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/tranm/.gemini/antigravity/brain/5d5ce262-aab8-4cf2-bb5e-7029a96769ca';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge'
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Capture Main Screen showing new Thống Kê button and AI Playbook selector
  console.log('Capturing main screen...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'playbook-and-header.png'),
    fullPage: false
  });

  // 2. Click "Thống Kê" button to open Stats Dashboard
  console.log('Opening Stats Modal...');
  const statsButton = page.getByRole('button', { name: 'Thống Kê', exact: true });
  await statsButton.click();
  await page.waitForTimeout(600);

  // Capture Stats Modal Overview tab
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stats-dashboard-overview.png'),
    fullPage: false
  });

  // Switch to Playbook Tab inside modal
  console.log('Switching to Playbook tab...');
  const playbookTab = page.locator('.fixed button:has-text("Playbook (10 Bài Đánh Đỉnh Cao)")');
  await playbookTab.click();
  await page.waitForTimeout(500);

  // Click on Spain PnR card inside the modal
  const spainCard = page.locator('.fixed div:has-text("Spain PnR")').last();
  await spainCard.click();
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stats-playbook-drawer.png'),
    fullPage: false
  });

  // 4. Close modal and run simulation for a few seconds to record stats
  console.log('Closing modal and running simulation...');
  const closeBtn = page.locator('button:has-text("Đóng")').last();
  await closeBtn.click();
  await page.waitForTimeout(500);

  const simulateBtn = page.locator('button:has-text("Giả Lập Tấn Công")').first();
  await simulateBtn.click();
  console.log('Simulating 4 possessions...');
  await page.waitForTimeout(6000);

  // Stop simulation
  const stopBtn = page.locator('button:has-text("Dừng Tấn Công")').first();
  if (await stopBtn.isVisible()) {
    await stopBtn.click();
  }
  await page.waitForTimeout(500);

  // Open stats again to see updated numbers
  await statsButton.click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stats-after-simulation.png'),
    fullPage: false
  });

  // Check history tab
  const historyTab = page.locator('.fixed button:has-text("Nhật Ký Các Đợt Bóng")');
  await historyTab.click();
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stats-history-log.png'),
    fullPage: false
  });

  await browser.close();
  console.log('Verification completed successfully!');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
