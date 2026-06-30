import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = '/tmp/verify2';
mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); console.log('shot:', name); };

async function getReadinessStatus(page) {
  const text = await page.locator('[data-testid="readiness-status"]').textContent({ timeout: 800 }).catch(() => null);
  if (!text) return null;
  if (text.includes('Reliable')) return 'Projected Reliable';
  if (text.includes('Risky')) return 'Projected Risky';
  if (text.includes('Fail')) return 'Projected to Fail';
  return text.trim();
}

async function getContractTitle(page) {
  return page.locator('[data-testid="selected-contract-title"]').textContent({ timeout: 800 }).catch(() => null);
}

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => console.warn('JS error:', String(e).slice(0, 120)));
  await page.goto('http://localhost:9222/axm-world/game/');
  await page.waitForTimeout(1500);
  await page.locator('button').filter({ hasText: /First Charter|Enter/i }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  // dismiss oath
  await page.locator('button').filter({ hasText: /Swear the open charter/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  // dismiss modals
  for (let i = 0; i < 3; i++) {
    const cont = page.locator('button').filter({ hasText: /^Continue$|^OK$|^Done$/i }).first();
    if (await cont.isVisible({ timeout: 600 }).catch(() => false)) { await cont.click(); await page.waitForTimeout(400); }
    else break;
  }
  // switch to run graph
  await page.locator('[data-testid="view-run-graph"]').click({ timeout: 4000 }).catch(async () => {
    await page.locator('button').filter({ hasText: /Run Graph/i }).first().click({ timeout: 4000 }).catch(() => {});
  });
  await page.waitForTimeout(800);
  return page;
}

async function clickNode(page, title, xRange, yRange) {
  const [xMin, xMax, xStep] = xRange;
  const [yMin, yMax, yStep] = yRange;
  for (let x = xMin; x <= xMax; x += xStep) {
    for (let y = yMin; y <= yMax; y += yStep) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(150);
      const t = await getContractTitle(page);
      if (t && t.includes(title)) { console.log(`Found "${title}" at (${x},${y})`); return true; }
    }
  }
  return false;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ── DESKTOP 1280×800 ──────────────────────────────────────────────────────────
const desk = await boot(browser, { width: 1280, height: 800 });

// Verify: RodohRuntimeMark NOT in HUD (no dandelion in header)
const headerText = await desk.locator('[data-testid="cartridge-title"]').textContent({ timeout: 2000 }).catch(() => '');
console.log('cartridge-title text:', headerText);
const hasRodohInHud = await desk.locator('header .rodoh-mark, [class*="RodohRuntime"]').count().catch(() => 0);
console.log('Rodoh mark in HUD:', hasRodohInHud);

await shot(desk, '00_desktop_initial');

// Find and click Bridge Troll
const foundTroll = await clickNode(desk, 'Bridge Troll', [300, 900, 25], [200, 600, 25]);
console.log('Found Bridge Troll:', foundTroll);
await shot(desk, '01_desktop_bridge_troll_empty');

// Find a locked contract
const foundLocked = await clickNode(desk, "Warden", [300, 900, 25], [200, 600, 25]);
console.log('Found Warden:', foundLocked);
const unlockedText = await desk.locator('[data-testid="unlock-requirements"]').textContent({ timeout: 1000 }).catch(() => 'not found');
console.log('unlock-requirements text:', unlockedText?.slice(0, 60));
await shot(desk, '02_desktop_locked_contract');
// Verify no party count shown for locked
const partyCountVisible = await desk.locator('[data-testid="party-count"]').isVisible({ timeout: 500 }).catch(() => false);
const readinessVisible = await desk.locator('[data-testid="readiness-status"]').isVisible({ timeout: 500 }).catch(() => false);
console.log('party-count visible for locked:', partyCountVisible, '(should be false)');
console.log('readiness visible for locked:', readinessVisible, '(should be false)');

// Switch back to Bridge Troll and add agents
await clickNode(desk, 'Bridge Troll', [300, 900, 25], [200, 600, 25]);
const trollTitle = await getContractTitle(desk);
console.log('Selected:', trollTitle);
const assignBtns = desk.locator('button[title="Assign to the selected contract"]');
const agentCount = await assignBtns.count();
for (let i = 0; i < agentCount; i++) { await assignBtns.nth(i).click().catch(() => {}); await desk.waitForTimeout(100); }
await desk.waitForTimeout(400);
const status = await getReadinessStatus(desk);
console.log('Desktop readiness status:', status);
await shot(desk, '03_desktop_with_party');

// Fix plan visible?
const hasFix = await desk.locator('[data-testid="fix-plan"]').isVisible({ timeout: 1000 }).catch(() => false);
console.log('Fix plan visible:', hasFix);
if (hasFix) await shot(desk, '04_desktop_fix_plan');

await desk.close();

// ── MOBILE 390×844 ───────────────────────────────────────────────────────────
const page = await boot(browser, { width: 390, height: 844 });

await shot(page, '05_mobile_initial');

// Verify: no RodohRuntimeMark in HUD
const mobileHudMark = await page.locator('[class*="rodoh-mark"], [class*="RodohRuntime"]').count();
console.log('Mobile: Rodoh in HUD count:', mobileHudMark);

// Click Bridge Troll on mobile
const mobileFound = await clickNode(page, 'Bridge Troll', [20, 370, 15], [150, 230, 12]);
const mTitle = await getContractTitle(page);
console.log('Mobile contract:', mTitle);

await shot(page, '06_mobile_contract_selected');

// Add agents
const mBtns = page.locator('button[title="Assign to the selected contract"]');
const mCount = await mBtns.count();
console.log('Mobile agents to assign:', mCount);
for (let i = 0; i < mCount; i++) { await mBtns.nth(i).click().catch(() => {}); await page.waitForTimeout(100); }
await page.waitForTimeout(500);
const mStatus = await getReadinessStatus(page);
console.log('Mobile readiness:', mStatus);
await shot(page, '07_mobile_party_assigned');

// Verify roster card widths (no side-by-side clipping)
const cards = page.locator('[data-testid="roster-card"]');
const cardCount = await cards.count();
console.log('Roster card count:', cardCount);
if (cardCount > 0) {
  const box = await cards.first().boundingBox();
  console.log('First roster card width:', box?.width, '(should be ~85vw ≈', Math.round(390 * 0.85), ')');
  console.log('First roster card height:', box?.height);
}

// Scroll down to see roster — scroll the inner flex container, not window
await page.evaluate(() => {
  const shell = document.querySelector('[data-testid="engine-shell"]');
  if (shell) { for (const child of shell.children) { if (child.scrollHeight > child.clientHeight) child.scrollTop = child.scrollHeight; } }
});
await page.waitForTimeout(400);
await shot(page, '08_mobile_scrolled_roster');

// Scroll back to top so map is in viewport — the scrollable container is the flex child
// of engine-shell (position: absolute, so window.scrollTo has no effect)
await page.evaluate(() => {
  const shell = document.querySelector('[data-testid="engine-shell"]');
  if (shell) { for (const child of shell.children) { if (child.scrollTop > 0) child.scrollTop = 0; } }
});
await page.waitForTimeout(500);

// Click locked contract — Warden's Keep is typically right-half of the mobile map
const mLocked = await clickNode(page, 'Warden', [180, 370, 15], [150, 230, 12]).catch(() => false);
console.log('Mobile found Warden:', mLocked);
await shot(page, '09_mobile_locked_contract');

const mPartyVisible = await page.locator('[data-testid="party-count"]').isVisible({ timeout: 500 }).catch(() => false);
const mReadinessVisible = await page.locator('[data-testid="readiness-status"]').isVisible({ timeout: 500 }).catch(() => false);
const mUnlockReqs = await page.locator('[data-testid="unlock-requirements"]').isVisible({ timeout: 500 }).catch(() => false);
console.log('Mobile locked: party-count visible:', mPartyVisible, '(should be false)');
console.log('Mobile locked: readiness visible:', mReadinessVisible, '(should be false)');
console.log('Mobile locked: unlock-requirements visible:', mUnlockReqs, '(should be true)');

await page.close();
await browser.close();
console.log('\ndone — screenshots in', OUT);
