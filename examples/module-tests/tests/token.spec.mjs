import { test, expect } from "@foundry-test/core";

test("can resolve a token on the active canvas", async ({ foundry }) => {
  await foundry.connect();

  const token = await foundry.token("Test Token");
  expect(token).not.toBeNull();

  const position = await foundry.tokenScreenPosition("Test Token");
  expect(position.x).toBeGreaterThanOrEqual(0);
  expect(position.y).toBeGreaterThanOrEqual(0);
});
