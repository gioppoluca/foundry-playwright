#!/usr/bin/env bash
set -euo pipefail

mkdir -p /work/node_modules/@foundry-test

if [ ! -e /work/node_modules/@foundry-test/core ]; then
  ln -s /opt/foundry-test /work/node_modules/@foundry-test/core
fi

if [ ! -e /work/node_modules/@playwright ]; then
  mkdir -p /work/node_modules/@playwright
fi

if [ ! -e /work/node_modules/@playwright/test ]; then
  ln -s /opt/foundry-test/node_modules/@playwright/test /work/node_modules/@playwright/test
fi

if [ ! -e /work/node_modules/playwright ]; then
  ln -s /opt/foundry-test/node_modules/playwright /work/node_modules/playwright
fi

if [ ! -e /work/node_modules/playwright-core ]; then
  ln -s /opt/foundry-test/node_modules/playwright-core /work/node_modules/playwright-core
fi

exec /opt/foundry-test/node_modules/.bin/playwright test "$@"
