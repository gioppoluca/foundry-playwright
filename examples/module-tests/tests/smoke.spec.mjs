import { test, expect } from "@foundry-test/core";

const MODULE_ID = "replace-with-your-module-id";

test("Foundry world and module are ready", async ({ foundry }) => {
  await foundry.connect();

  await foundry.assertEnvironment({
    generations: [12, 13, 14],
    moduleId: MODULE_ID
  });

  const module = await foundry.module(MODULE_ID);
  expect(module?.active).toBe(true);
});
