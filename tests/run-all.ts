import { spawn } from "node:child_process";
import path from "node:path";

console.log("\x1b[1;36m===================================================\x1b[0m");
console.log("\x1b[1;33m  LILLY'S RESTAURANT & CAFE POS SUITE - TEST RUNNER\x1b[0m");
console.log("\x1b[1;36m===================================================\x1b[0m\n");

const suites = [
  { name: "Unit Tests (Currency, ESC/POS, Settings)", pattern: "tests/unit/*.test.ts" },
  { name: "Integration Tests (Staff, Menu, Categories, Orders, Printer API)", pattern: "tests/integration/api.test.ts" },
  { name: "UI/UX & Security E2E Tests (Branding, Themes, Security Audits)", pattern: "tests/e2e/ui-ux.test.ts" },
];

async function runSuite(suite: { name: string; pattern: string }): Promise<boolean> {
  console.log(`\x1b[1;35m▶ Running: ${suite.name}...\x1b[0m`);
  return new Promise((resolve) => {
    const proc = spawn("npx", ["tsx", "--test", suite.pattern], {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`\x1b[1;32m✓ ${suite.name} PASSED\x1b[0m\n`);
        resolve(true);
      } else {
        console.error(`\x1b[1;31m✗ ${suite.name} FAILED (exit code: ${code})\x1b[0m\n`);
        resolve(false);
      }
    });
  });
}

async function main() {
  const startTime = Date.now();
  let allPassed = true;

  for (const suite of suites) {
    const passed = await runSuite(suite);
    if (!passed) allPassed = false;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\x1b[1;36m===================================================\x1b[0m");
  if (allPassed) {
    console.log(`\x1b[1;32m🎉 ALL TEST SUITES PASSED SUCCESSFULLY! (${duration}s)\x1b[0m`);
  } else {
    console.log(`\x1b[1;31m⚠️ SOME TEST SUITES FAILED (${duration}s)\x1b[0m`);
    process.exit(1);
  }
  console.log("\x1b[1;36m===================================================\x1b[0m");
}

main();
