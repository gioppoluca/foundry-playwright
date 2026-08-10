import { test as base, expect } from "@playwright/test";
import { FoundryClient } from "./foundry-client.mjs";

export { expect, FoundryClient };

export const test = base.extend({
  foundry: async ({ page }, use) => {
    const foundry = new FoundryClient(page);
    await use(foundry);
  }
});
