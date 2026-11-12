#!/usr/bin/env bash
# pre-push gate (data-fair-service skill, references/tooling.md): type check and the tests, against the
# running dev env (npm run dev-zellij); lint runs on pre-commit, the full quality checks in CI
set -e
npm run check-types
npm run test
