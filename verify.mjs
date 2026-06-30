import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = '/tmp/verify';
mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot:', name); };

async function dismissModals(page) {
  for (let i = 0; i < 5; i++) {
    const cont = page.locator('button').filter({ hasText: /^Continue$|^OK$|^Done$/i }).first();
    if (await cont.isVisible({ timeout: 800 }).catch(() => false)) { await cont.click(); await page.waitForTimeout(500); }
    else break;
  }
}

async function getContractTitle(page) {
  return page.locator('[data-testid="selected-contract-title"]').textContent({ timeout: 600 }).catch(() => null);
}

async function getReadinessStatus(page) {
  // PixelBadge now includes the icon glyph in textContent — normalize it
  const text = await page.locator('[data-testid="readiness-status"]').textContent({ timeout: 600 }).catch(() => null);
  if (!text) return null;
  if (text.includes('Reliable')) return 'Projected Reliable';
  if (text.includes('Risky')) return 'Projected Risky';
  if (text.includes('Fail')) return 'Projected to Fail';
  return text.trim();
}

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => console.warn('JS:', String(e).slice(0, 120)));
  await page.goto('http://localhost:9222/');
  await page.waitForTimeout(1500);
  // New Player.tsx: cartridge select cards, not a "Play" button
  await page.locator('button').filter({ hasText: /First Charter|Enter/i }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  await page.locator('button').filter({ hasText: /Swear the open charter/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  await dismissModals(page);
  await page.waitForTimeout(400);
  await page.locator('[data-testid="view-run-graph"]').click({ timeout: 4000 }).catch(async () => {
    await page.locator('button').filter({ hasText: /Run Graph/i }).first().click({ timeout: 4000 }).catch(() => {});
  });
  await page.waitForTimeout(800);
  return page;
}

async function findContractNode(page, targetTitle, xRange, yRange) {
  const [xMin, xMax, xStep] = xRange ?? [250, 1100, 60];
  const [yMin, yMax, yStep] = yRange ?? [150, 700, 60];
  for (let x = xMin; x <= xMax; x += xStep) {
    for (let y = yMin; y <= yMax; y += yStep) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(200);
      const title = await getContractTitle(page);
      if (title && title.includes(targetTitle)) {
        console.log(`Found "${targetTitle}" at (${x}, ${y})`);
        return true;
      }
    }
  }
  console.log(`Could not find "${targetTitle}"`);
  return false;
}

// Add ALL agents to the party (party starts empty after node selection)
async function addAllAgents(page) {
  const btns = page.locator('button[title="Assign to the selected contract"]');
  const count = await btns.count();
  console.log(`Adding ${count} agents to party...`);
  for (let i = 0; i < count; i++) {
    await btns.nth(i).click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
  return count;
}

// Remove agents until status matches targetKeyword or all removed
async function removeAgentsUntil(page, targetKeyword, maxRemove) {
  let removed = 0;
  for (let i = 0; i < maxRemove; i++) {
    const s = await getReadinessStatus(page);
    if (s?.toLowerCase().includes(targetKeyword.toLowerCase())) {
      console.log(`Reached "${targetKeyword}" after removing ${removed} agents`);
      return removed;
    }
    const btns = page.locator('button[title="Assign to the selected contract"]');
    const count = await btns.count();
    if (count === 0) break;
    // Remove the LAST added agent (nth from end) to avoid toggling same one
    await btns.nth(count - 1 - (i % count)).click().catch(() => {});
    await page.waitForTimeout(300);
    removed++;
  }
  return removed;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ── Desktop 1280×800 ──────────────────────────────────────────────────────────
const desk = await boot(browser, { width: 1280, height: 800 });

// Take a graph screenshot first to see layout
await shot(desk, '00_graph_layout');

// Scan for Bridge Troll
let found = await findContractNode(desk, 'Bridge Troll');
if (!found) {
  // Widen the scan
  found = await findContractNode(desk, 'Bridge Troll', [100, 1180, 40], [100, 750, 40]);
}

const contractTitle = await getContractTitle(desk);
console.log('Selected contract:', contractTitle);

// Add all agents to party
const agentCount = await addAllAgents(desk);
await shot(desk, 'A0_after_adding_all_agents');

const statusAfterAdd = await getReadinessStatus(desk);
console.log('Status (full party):', statusAfterAdd);

// ── Shot A: Risky/reliable state with full party ──────────────────────────────
await shot(desk, 'A_full_party_state');

// ── Shot B: Fix plan (if visible) ────────────────────────────────────────────
const hasFix = await desk.locator('[data-testid="fix-plan"]').isVisible({ timeout: 1000 }).catch(() => false);
console.log('Fix plan visible:', hasFix);
if (hasFix) await shot(desk, 'B_fix_plan');

// Check for buffer language in current state
const bodyText1 = await desk.evaluate(() => document.body.innerText);
console.log('Buffer language:', bodyText1.includes('more buffer'));
console.log('Failing language:', bodyText1.includes('Failing by'));

// ── Remove agents until failing ───────────────────────────────────────────────
const removed = await removeAgentsUntil(desk, 'Fail', agentCount);
const failStatus = await getReadinessStatus(desk);
console.log(`Status after removing ${removed} agents:`, failStatus);
await shot(desk, 'C_failing_state');

const hasFix2 = await desk.locator('[data-testid="fix-plan"]').isVisible({ timeout: 1000 }).catch(() => false);
if (hasFix2) await shot(desk, 'D_fix_plan_failing');

// ── Find Cellar for reliable reference ────────────────────────────────────────
await findContractNode(desk, 'Cellar', [100, 1180, 40], [100, 750, 40]);
await addAllAgents(desk);
const cellarStatus = await getReadinessStatus(desk);
console.log('Cellar status (full party):', cellarStatus);
await shot(desk, 'E_cellar_reliable');

// ── Roster and downtime ───────────────────────────────────────────────────────
await shot(desk, 'F_roster_gear_slots');
await shot(desk, 'G_downtime_labels');

await desk.close();

// ── Mobile 390×844 ────────────────────────────────────────────────────────────
const mob = await boot(browser, { width: 390, height: 844 });
await shot(mob, '00_mobile_graph');

// Try Bridge Troll on mobile
let mobFound = await findContractNode(mob, 'Bridge Troll', [30, 380, 35], [80, 760, 50]);
const mobTitle = await getContractTitle(mob);
console.log('Mobile contract:', mobTitle);

// Add all agents on mobile
await addAllAgents(mob);
const mobStatus = await getReadinessStatus(mob);
console.log('Mobile status (full party):', mobStatus);
await shot(mob, 'H_mobile_full_party');

// Remove one agent to shift state
const mobBtns = mob.locator('button[title="Assign to the selected contract"]');
const mobCount = await mobBtns.count();
if (mobCount > 0) {
  await mobBtns.nth(mobCount - 1).click().catch(() => {});
  await mob.waitForTimeout(400);
}
const mobStatus2 = await getReadinessStatus(mob);
console.log('Mobile after -1 agent:', mobStatus2);
await shot(mob, 'I_mobile_reduced');

await mob.close();
await browser.close();
console.log('\ndone — all screenshots in', OUT);
