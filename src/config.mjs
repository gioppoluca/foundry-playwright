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
    timeout: 60_000,
    expect: { timeout: 5_000 },
    reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
    use: {
      baseURL: foundryUrl,
      headless: true,

      // Foundry requires at least 1366x768. Use a deterministic desktop size
      // rather than Playwright's 1280x720 default.
      viewport: { width: 1920, height: 1080 },

      /*
       * Docker CI normally has no physical GPU.
       * Chromium's documented SwiftShader WebGL mode provides a software
       * WebGL implementation suitable for trusted/headless test environments.
       */
      launchOptions: {
        args: [
          "--use-gl=angle",
          "--use-angle=swiftshader-webgl",
          "--enable-unsafe-swiftshader"
        ]
      },

      screenshot: "only-on-failure",
      trace: "retain-on-failure",
      video: "retain-on-failure"
    },
    outputDir: "test-results",
    ...overrides
  });
}
