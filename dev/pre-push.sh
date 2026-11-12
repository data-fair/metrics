#!/usr/bin/env bash
# The pre-push gate, run by .husky/pre-push (lint already ran in pre-commit). The whole quality
# (lint, build, tests, audit) runs on pull requests and releases; `npm run quality` runs it locally.
#
# metrics' suite is small (node --test, about 15 s), it runs whole here instead of a @smoke set.
# The tests need the dev env up (npx --no df-dev status).
set -euo pipefail
cd "$(dirname "$0")/.."

npm run check-types
npm run test
