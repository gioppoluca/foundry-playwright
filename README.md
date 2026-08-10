# foundry-playwright

Unofficial Playwright Docker image and small helper library for testing Foundry VTT modules against an **already running Foundry world**.

The image does not install, start, stop, configure, or license Foundry VTT. Foundry remains an independent application/server. The container only opens a Chromium client against `FOUNDRY_URL` and executes the tests mounted from a module repository.

## Goals

- Keep common Foundry/Playwright code out of individual module repositories.
- Let each module repository own only its own behavioral tests.
- Support Foundry generations 12, 13 and 14 where the helper uses APIs common to all three.
- Keep the helper layer deliberately small and add compatibility branches only when a real API difference requires one.
- Run serially by default because E2E tests share one mutable Foundry world.

## Image contents

The image is based on the official Playwright Noble image and contains:

- Playwright Test + Chromium and browser dependencies supplied by the upstream image.
- `@foundry-test/core`, exposed to mounted test repositories.
- A container entrypoint that runs `playwright test` in `/work`.

Current Playwright version: **1.62.0**.

## Included helpers

The `foundry` fixture exposes:

- `connect(path = "/", { canvas, timeout })` — opens Foundry and handles `/join` when authentication is required
- `waitUntilReady({ canvas, timeout })`
- `info()`
- `assertEnvironment({ generations, systemId, moduleId })`
- `module(id)`
- `actor(idOrName)`
- `token(idOrName)`
- `tokenScreenPosition(idOrName)`
- `clickToken(idOrName, modifiers)`
- `controlToken(idOrName)`
- `evaluate(fn, arg)`

All document helpers return plain serializable data rather than Playwright handles to Foundry objects.

## Build

```bash
docker build -t foundry-playwright:0.1.0 .
```

## Minimal module repository

A module that consumes the image only needs:

```text
my-foundry-module/
├── module.json
├── scripts/
├── tests/
│   └── smoke.spec.mjs
└── playwright.config.mjs
```

`playwright.config.mjs`:

```js
import { defineFoundryConfig } from "@foundry-test/core/config";

export default defineFoundryConfig();
```

`tests/smoke.spec.mjs`:

```js
import { test, expect } from "@foundry-test/core";

const MODULE_ID = "my-foundry-module";

test("module is loaded", async ({ foundry }) => {
  await foundry.connect();
  await foundry.assertEnvironment({
    generations: [12, 13, 14],
    moduleId: MODULE_ID
  });

  const module = await foundry.module(MODULE_ID);
  expect(module.active).toBe(true);
});
```

The complete example is under `examples/module-tests/`.

## Run on Windows 11 / Docker Desktop

Start Foundry yourself and enter the world you want to test. Then, from the module repository:

```powershell
docker run --rm `
  -e FOUNDRY_URL=http://host.docker.internal:30000 `
  -v "${PWD}:/work" `
  foundry-playwright:0.1.0
```

The image creates only the package symlinks required by the test runner under the mounted repository's `node_modules` directory. It does not change module source files.

## Authentication

A Playwright Chromium browser has its own session. Being inside the world in the desktop Electron client does **not** authenticate Playwright.

`foundry.connect()` now handles the normal Foundry `/join` flow automatically. Configure the login through environment variables:

- `FOUNDRY_USER`: displayed Foundry user name or its select value.
- `FOUNDRY_PASSWORD`: optional password for that user.

If the world exposes only one selectable user, `FOUNDRY_USER` may be omitted. If multiple users exist, the helper also recognizes a user named `Gamemaster`, `Game Master`, or `GM`; otherwise set `FOUNDRY_USER` explicitly.

Example:

```powershell
docker run --rm `
  -e FOUNDRY_URL=http://host.docker.internal:30000 `
  -e FOUNDRY_USER=Gamemaster `
  -e FOUNDRY_PASSWORD="" `
  -v "${PWD}:/work" `
  ghcr.io/YOUR-OWNER/foundry-playwright:latest
```

Credentials are supplied at runtime and are not stored in the image or module repository.

If Foundry changes the `/join` markup, connection errors include the URL, page title, body classes, and detected form controls to make the compatibility adjustment explicit.

## Canvas/token coordinates

Foundry Tokens are PIXI canvas objects, not DOM nodes. `tokenScreenPosition()` converts the token's current scene center through the active canvas stage world transform, then offsets it by the `#board` DOM element. This is intended for real Playwright mouse input after pan/zoom rather than assuming scene coordinates equal browser pixels.

This is one of the helpers most likely to need a version-specific adjustment if Foundry changes its canvas implementation. Keep any such adjustment isolated here rather than in every module test.

## CI image build

The included `.gitlab-ci.yml` performs a syntax verification and builds/pushes the image to the GitLab Container Registry. Commit builds are tagged by SHA; Git tags additionally publish a version tag.

Do not use `latest` in consuming module pipelines. Pin the image, for example:

```yaml
image:
  name: registry.example.com/foundry-playwright:0.1.0
```

## Consuming module CI

A module's runner must be able to reach the independent Foundry server/world. If Foundry is running on your Windows development/test host, use a self-hosted runner on that host or on a network that can reach it.

Example job:

```yaml
foundry-e2e:
  stage: test
  tags:
    - foundry-test
  image:
    name: registry.example.com/foundry-playwright:0.1.0
  variables:
    FOUNDRY_URL: "http://host.docker.internal:30000"
  script:
    - foundry-playwright
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
```

Depending on how your GitLab Docker runner is configured, `host.docker.internal` may need an explicit host-gateway mapping at runner level. Docker Desktop supplies this hostname for containers reaching host services.

## Design boundary

This project intentionally does **not** include:

- automatic Foundry installation or startup;
- automatic world activation;
- module deployment/copying into Foundry Data;
- system-specific helpers;
- module-specific assertions;
- speculative v12/v13/v14 compatibility branches.

Those should be added only when an actual test workflow requires them.

## License

This project is not affiliated with or endorsed by Foundry Gaming LLC. Foundry Virtual Tabletop is a trademark of Foundry Gaming LLC.
