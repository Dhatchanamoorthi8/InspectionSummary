#!/usr/bin/env node
// test-runner.mjs
// Standalone E2E Test Runner with ANSI Terminal Reporter & Summary Table
// Executes Tiers 1-4, tracks execution times, prints formatted summary table, and exits with 0 or 1.

import { setupTestEnvironment, teardownTestEnvironment, getBaseUrl } from './helpers.mjs';
import { tier1Tests } from './tier1-features.test.mjs';
import { tier2Tests } from './tier2-boundary.test.mjs';
import { tier3Tests } from './tier3-security.test.mjs';
import { tier4Tests } from './tier4-workflows.test.mjs';

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BG_RED = '\x1b[41m';
const BG_GREEN = '\x1b[42m';

// Parse Command Line Flags
const args = process.argv.slice(2);
let selectedTier = null;
let customBaseUrl = null;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    selectedTier = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--base-url=')) {
    customBaseUrl = arg.split('=')[1];
  } else if (arg === 'tier1' || arg === '1') {
    selectedTier = 1;
  } else if (arg === 'tier2' || arg === '2') {
    selectedTier = 2;
  } else if (arg === 'tier3' || arg === '3') {
    selectedTier = 3;
  } else if (arg === 'tier4' || arg === '4') {
    selectedTier = 4;
  }
}

const tiers = [
  { id: 1, name: 'Tier 1: Feature Coverage (R1-R5)', tests: tier1Tests },
  { id: 2, name: 'Tier 2: Boundary Value Analysis (BVA)', tests: tier2Tests },
  { id: 3, name: 'Tier 3: Cross-Feature & Security Invariants', tests: tier3Tests },
  { id: 4, name: 'Tier 4: Industrial Real-World Workflows', tests: tier4Tests },
];

function pad(str, len) {
  const visibleLength = String(str).replace(/\x1b\[[0-9;]*m/g, '').length;
  const diff = len - visibleLength;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function padLeft(str, len) {
  const visibleLength = String(str).replace(/\x1b\[[0-9;]*m/g, '').length;
  const diff = len - visibleLength;
  return diff > 0 ? ' '.repeat(diff) + str : str;
}

async function run() {
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   HEAT TREATMENT INSPECTION REPORT ENTRY - E2E TEST RUNNER   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  const activeUrl = await setupTestEnvironment(customBaseUrl);
  console.log(`${DIM}Target Base URL:${RESET} ${BOLD}${WHITE}${activeUrl}${RESET}`);
  console.log(`${DIM}Architecture:${RESET}   Modular Standalone E2E Test Framework`);
  console.log(`${DIM}Timestamp:${RESET}      ${new Date().toISOString()}\n`);

  const activeTiers = selectedTier
    ? tiers.filter((t) => t.id === selectedTier)
    : tiers;

  if (activeTiers.length === 0) {
    console.error(`${RED}Error: Tier ${selectedTier} does not exist. Available: 1, 2, 3, 4${RESET}`);
    await teardownTestEnvironment();
    process.exit(1);
  }

  const tierSummaries = [];
  let globalTotal = 0;
  let globalPassed = 0;
  let globalFailed = 0;
  const suiteStartTime = Date.now();

  for (const tier of activeTiers) {
    console.log(`${BOLD}${MAGENTA}▶ [TIER ${tier.id}] ${tier.name}${RESET} (${tier.tests.length} tests)`);
    console.log(`${DIM}${'─'.repeat(70)}${RESET}`);

    let tierPassed = 0;
    let tierFailed = 0;
    const tierStartTime = Date.now();

    for (const test of tier.tests) {
      const testStart = Date.now();
      try {
        await test.fn();
        const duration = Date.now() - testStart;
        console.log(`  ${GREEN}✔ PASS${RESET} ${DIM}[${test.id}]${RESET} ${test.name} ${DIM}(${duration}ms)${RESET}`);
        tierPassed++;
        globalPassed++;
      } catch (err) {
        const duration = Date.now() - testStart;
        console.log(`  ${RED}✖ FAIL${RESET} ${BOLD}[${test.id}]${RESET} ${test.name} ${RED}(${duration}ms)${RESET}`);
        console.log(`    ${RED}Error: ${err.message}${RESET}`);
        if (process.env.DEBUG || process.env.VERBOSE) {
          console.log(`    ${DIM}${err.stack}${RESET}`);
        }
        tierFailed++;
        globalFailed++;
      }
      globalTotal++;
    }

    const tierDuration = Date.now() - tierStartTime;
    tierSummaries.push({
      tierId: tier.id,
      name: tier.name,
      total: tier.tests.length,
      passed: tierPassed,
      failed: tierFailed,
      duration: tierDuration,
    });
    console.log('');
  }

  const totalDuration = Date.now() - suiteStartTime;

  // Print Summary Table
  console.log(`${BOLD}${WHITE}E2E TEST EXECUTION SUMMARY TABLE${RESET}`);
  console.log(`┌──────────────────────────────────────────────┬───────┬────────┬────────┬──────────┐`);
  console.log(`│ ${pad('Tier Name', 44)} │ ${pad('Total', 5)} │ ${pad('Passed', 6)} │ ${pad('Failed', 6)} │ ${pad('Duration', 8)} │`);
  console.log(`├──────────────────────────────────────────────┼───────┼────────┼────────┼──────────┤`);

  for (const s of tierSummaries) {
    const passedStr = s.passed > 0 ? `${GREEN}${padLeft(s.passed, 6)}${RESET}` : padLeft(s.passed, 6);
    const failedStr = s.failed > 0 ? `${RED}${BOLD}${padLeft(s.failed, 6)}${RESET}` : padLeft(s.failed, 6);
    console.log(
      `│ ${pad(s.name, 44)} │ ${padLeft(s.total, 5)} │ ${passedStr} │ ${failedStr} │ ${padLeft(`${s.duration}ms`, 8)} │`
    );
  }

  console.log(`├──────────────────────────────────────────────┼───────┼────────┼────────┼──────────┤`);
  const totalPassedStr = globalPassed > 0 ? `${GREEN}${BOLD}${padLeft(globalPassed, 6)}${RESET}` : padLeft(globalPassed, 6);
  const totalFailedStr = globalFailed > 0 ? `${RED}${BOLD}${padLeft(globalFailed, 6)}${RESET}` : padLeft(globalFailed, 6);
  console.log(
    `│ ${BOLD}${pad('TOTAL SUMMARY', 44)}${RESET} │ ${BOLD}${padLeft(globalTotal, 5)}${RESET} │ ${totalPassedStr} │ ${totalFailedStr} │ ${BOLD}${padLeft(`${totalDuration}ms`, 8)}${RESET} │`
  );
  console.log(`└──────────────────────────────────────────────┴───────┴────────┴────────┴──────────┘`);

  await teardownTestEnvironment();

  if (globalFailed === 0) {
    console.log(`\n${BG_GREEN}${WHITE}${BOLD}  SUCCESS: ALL ${globalPassed} E2E TESTS PASSED (100%)  ${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${BG_RED}${WHITE}${BOLD}  FAILURE: ${globalFailed} OF ${globalTotal} TESTS FAILED  ${RESET}\n`);
    process.exit(1);
  }
}

run().catch(async (err) => {
  console.error(`${RED}Fatal runner exception: ${err.message}${RESET}`);
  console.error(err.stack);
  await teardownTestEnvironment();
  process.exit(1);
});
