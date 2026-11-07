/**
 * Unit & Integration Test Suite for Monotonic Multi-Stage Export Progress
 */

import { ExportProgressController, EXPORT_STAGES_INFO } from '../src/lib/export/progress-controller';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
    console.log(`  ${GREEN}✓ PASS${RESET} : ${name}`);
  } else {
    failed++;
    console.error(`  ${RED}✗ FAIL${RESET} : ${name}`);
  }
}

console.log(`\n${CYAN}======================================================${RESET}`);
console.log(`${CYAN}   MONOTONIC EXPORT PROGRESS & CANCELLATION TEST      ${RESET}`);
console.log(`${CYAN}======================================================${RESET}\n`);

// Test 1: Monotonicity - Percentage must NEVER decrease
const history: number[] = [];
const controller = new ExportProgressController(1, (st) => {
  history.push(st.percentage);
});

controller.update('PREPARING', 1, 10);
controller.update('READING_ARCHIVE', 5, 29);
controller.update('READING_ARCHIVE', 15, 29);
controller.update('READING_ARCHIVE', 29, 29);
controller.update('FILTERING', 10000, 10000);
controller.update('BUILDING_STRUCTURE', 1, 2);
controller.update('FORMATTING', 100, 690);
controller.update('FORMATTING', 350, 690);
// Attempt to send a smaller percentage (e.g. simulated partition reset)
controller.update('FORMATTING', 50, 690);
controller.update('FORMATTING', 690, 690);
controller.update('GENERATING_FILE', 1, 2);
controller.update('PREPARING_DOWNLOAD', 2, 2);
controller.update('COMPLETED', 1, 1);

assert(history.length > 5, 'History recorded multiple progress events');
let isMonotonic = true;
for (let i = 1; i < history.length; i++) {
  if (history[i] < history[i - 1]) {
    isMonotonic = false;
    console.error(`Regression detected at index ${i}: ${history[i - 1]}% -> ${history[i]}%`);
  }
}
assert(isMonotonic, 'Progress percentage NEVER decreased throughout the job');
assert(history[history.length - 1] === 100, 'Final stage reached 100%');

// Test 2: Counter Monotonicity - Row formatting counter within stage
const counterHistory: number[] = [];
const controller2 = new ExportProgressController(2, (st) => {
  counterHistory.push(st.processed);
});

controller2.update('FORMATTING', 106, 690);
controller2.update('FORMATTING', 316, 690);
controller2.update('FORMATTING', 601, 690);
// Attempt to reset backwards to 106
controller2.update('FORMATTING', 106, 690);
controller2.update('FORMATTING', 690, 690);

let counterMonotonic = true;
for (let i = 1; i < counterHistory.length; i++) {
  if (counterHistory[i] < counterHistory[i - 1]) {
    counterMonotonic = false;
    console.error(`Counter moved backwards: ${counterHistory[i - 1]} -> ${counterHistory[i]}`);
  }
}
assert(counterMonotonic, 'Item formatting counter NEVER moves backwards within the stage');

// Test 3: Cancellation Support
const cancelController = new ExportProgressController(3);
assert(!cancelController.isAborted, 'Controller starts not aborted');
cancelController.cancel();
assert(cancelController.isAborted, 'Controller isAborted is true after cancel()');
let threwAbort = false;
try {
  cancelController.checkAborted();
} catch (e: any) {
  if (e.name === 'AbortError') threwAbort = true;
}
assert(threwAbort, 'checkAborted() throws AbortError when cancelled');

console.log(`\n======================================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`======================================================\n`);

if (failed > 0) process.exit(1);

