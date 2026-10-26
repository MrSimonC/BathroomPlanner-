# BathroomPlanner development

This is a fork of OpenPlan3D. Preserve its MIT licence, attribution, existing npm tooling,
formats and upstream update compatibility. Read CONTRIBUTING.md, docs/CLOUD_SETUP.md
and docs/ARCHITECTURE.md before changing the application.

- Use Node.js 24 (.nvmrc). Install the lockfile with npm ci; do not use npm update or
  npm audit fix merely to get the environment running.
- For a clean cloud workspace run bash tooling/cloud-setup.sh. OS browser dependencies
  need a pre-provisioned image or an administrator; see the --with-deps option.
- Run npm test, npm run check, npm run build. Rebuild application changes before browser
  tests. npm run test:browser -- --project=chromium owns production server port 4188;
  do not run another server there. Dev uses 5173; preview uses 4173.
- Report actual pass/fail/skip counts and distinguish focused tests from full CI.
  Do not disable or rewrite upstream tests to hide unrelated failures.
- Read docs/skills/openplan3d-plan-authoring/SKILL.md and current import/export code
  before generating plans. Canonical bathroom measurements are millimetres, native
  web plans centimetres, prepared RoomPlan metres. Wall endpoints are centrelines.
- Real measurements, photographs, plans and fixture selections belong in the separate
  private BathroomPlannerData repository. Never add them, credentials, browser profiles,
  or personal screenshots to this public fork. Use synthetic test fixtures only.
- Missing dimensions remain unknown. AI proposals cannot alter confirmed geometry or
  fixed elements; deterministic validation and human confirmation precede acceptance.
- Keep optional private data checkout outside this repository. Container files and caches
  are ephemeral; persist reproducible scripts/docs in Git, not assumptions about a Mac,
  Windows machine, or a previous task's running server.
- Do not deploy, enable cloud uploads, create paid infrastructure, or merge a PR as part
  of setup. Push feature branches and target PRs at MrSimonC/BathroomPlanner-, not upstream.
