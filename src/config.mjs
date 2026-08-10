import { defineConfig } from "@playwright/test";

/**
 * Create a small, deterministic Playwright configuration for Foundry module tests.
 * Module repositories may override any returned Playwright option normally.
 */
export function defineFoundryConfig(options = {}) {
  const {
    testDir = "./tests",
    foundryUrl = process.env.FOUNDRY_URL ?? "http://host.docker.internal:30000",
    workers = 1,
    ...overrides
  } = options;

  return defineConfig({
    testDir,
    workers,
    fullyParallel: false,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
    use: {
      baseURL: foundryUrl,
      headless: true,
      screenshot: "only-on-failure",
      trace: "retain-on-failure",
      video: "retain-on-failure"
    },
    outputDir: "test-results",
    ...overrides
  });
}
