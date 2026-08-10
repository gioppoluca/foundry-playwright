/**
 * Thin wrapper around a Playwright Page for Foundry-specific operations.
 * Helpers intentionally return serializable data, never Foundry objects.
 */
export class FoundryClient {
  constructor(page) {
    this.page = page;
  }

  async connect(path = "/") {
    await this.page.goto(path);
    await this.waitUntilReady();
  }

  async waitUntilReady({ canvas = true, timeout = 30_000 } = {}) {
    await this.page.waitForFunction(
      ({ requireCanvas }) => {
        const gameReady = globalThis.game?.ready === true;
        if (!gameReady) return false;
        if (!requireCanvas) return true;
        return globalThis.canvas?.ready === true;
      },
      { requireCanvas: canvas },
      { timeout }
    );
  }

  async info() {
    return this.page.evaluate(() => ({
      generation: globalThis.game?.release?.generation ?? null,
      version: globalThis.game?.version ?? globalThis.game?.release?.version ?? null,
      systemId: globalThis.game?.system?.id ?? null,
      systemVersion: globalThis.game?.system?.version ?? null,
      worldId: globalThis.game?.world?.id ?? null,
      userId: globalThis.game?.user?.id ?? null,
      isGM: globalThis.game?.user?.isGM ?? false
    }));
  }

  async assertEnvironment({ generations, systemId, moduleId } = {}) {
    const result = await this.page.evaluate(({ generations, systemId, moduleId }) => {
      const generation = globalThis.game?.release?.generation ?? null;
      const activeSystem = globalThis.game?.system?.id ?? null;
      const module = moduleId ? globalThis.game?.modules?.get(moduleId) : null;

      const errors = [];
      if (generations?.length && !generations.includes(generation)) {
        errors.push(`Foundry generation ${generation} is not one of: ${generations.join(", ")}`);
      }
      if (systemId && activeSystem !== systemId) {
        errors.push(`Active system is ${activeSystem ?? "none"}; expected ${systemId}`);
      }
      if (moduleId && !module) errors.push(`Module ${moduleId} is not installed`);
      if (moduleId && module && !module.active) errors.push(`Module ${moduleId} is not active`);

      return { ok: errors.length === 0, errors };
    }, { generations, systemId, moduleId });

    if (!result.ok) throw new Error(result.errors.join("\n"));
  }

  async module(id) {
    return this.page.evaluate((moduleId) => {
      const module = globalThis.game?.modules?.get(moduleId);
      if (!module) return null;
      return {
        id: module.id,
        title: module.title,
        active: module.active,
        version: module.version
      };
    }, id);
  }

  async actor(query) {
    return this.page.evaluate((actorQuery) => {
      const actors = globalThis.game?.actors;
      if (!actors) return null;
      const actor = actors.get(actorQuery) ?? actors.find(a => a.name === actorQuery);
      if (!actor) return null;
      return {
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type
      };
    }, query);
  }

  async token(query) {
    return this.page.evaluate((tokenQuery) => {
      const tokens = globalThis.canvas?.tokens?.placeables ?? [];
      const token = tokens.find(t => t.id === tokenQuery || t.name === tokenQuery || t.document?.name === tokenQuery);
      if (!token) return null;
      return {
        id: token.id,
        name: token.name ?? token.document?.name ?? null,
        actorId: token.actor?.id ?? null,
        x: token.document?.x ?? null,
        y: token.document?.y ?? null,
        width: token.document?.width ?? null,
        height: token.document?.height ?? null
      };
    }, query);
  }

  async tokenScreenPosition(query) {
    const point = await this.page.evaluate((tokenQuery) => {
      const tokens = globalThis.canvas?.tokens?.placeables ?? [];
      const token = tokens.find(t => t.id === tokenQuery || t.name === tokenQuery || t.document?.name === tokenQuery);
      if (!token) return null;

      const center = token.center;
      const stage = globalThis.canvas?.stage ?? globalThis.canvas?.app?.stage;
      const transform = stage?.worldTransform;
      if (!center || !transform?.apply) return null;

      const screen = transform.apply(center);
      return { x: screen.x, y: screen.y };
    }, query);

    if (!point) throw new Error(`Unable to resolve token screen position: ${query}`);

    const board = this.page.locator("#board");
    const box = await board.boundingBox();
    if (!box) throw new Error("Foundry canvas element #board has no bounding box");

    return { x: box.x + point.x, y: box.y + point.y };
  }

  async clickToken(query, modifiers = {}) {
    const { x, y } = await this.tokenScreenPosition(query);
    const pressed = [];

    try {
      for (const [key, enabled] of [
        ["Shift", modifiers.shift],
        ["Alt", modifiers.alt],
        ["Control", modifiers.control],
        ["Meta", modifiers.meta]
      ]) {
        if (enabled) {
          await this.page.keyboard.down(key);
          pressed.push(key);
        }
      }

      await this.page.mouse.click(x, y, { button: modifiers.button ?? "left" });
    } finally {
      for (const key of pressed.reverse()) await this.page.keyboard.up(key);
    }
  }

  async controlToken(query, { releaseOthers = true } = {}) {
    const controlled = await this.page.evaluate(({ tokenQuery, releaseOthers }) => {
      const tokens = globalThis.canvas?.tokens?.placeables ?? [];
      const token = tokens.find(t => t.id === tokenQuery || t.name === tokenQuery || t.document?.name === tokenQuery);
      if (!token) return false;
      token.control({ releaseOthers });
      return true;
    }, { tokenQuery: query, releaseOthers });

    if (!controlled) throw new Error(`Token not found: ${query}`);
  }

  async evaluate(fn, arg) {
    return this.page.evaluate(fn, arg);
  }
}
