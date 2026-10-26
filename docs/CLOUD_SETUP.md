# Cloud development

Use the existing fork https://github.com/MrSimonC/BathroomPlanner- and its existing
Codex Cloud environment. Do not create another fork or environment. The application
runs locally inside the cloud workspace; no public deployment or Firebase account
is required. See [validation evidence](CLOUD_VALIDATION.md) for this task's results
and [architecture](ARCHITECTURE.md) for the bathroom extension boundary.

## Fresh task setup

1. Open the connected checkout and inspect `git remote -v`, `git status --short`,
   `git branch --show-current`, and `git rev-parse HEAD`. Preserve existing edits.
2. Select Node.js **24**, as specified by `.nvmrc`. With nvm installed, run
   `nvm install && nvm use`; otherwise select Node 24 in the existing environment's
   runtime configuration. Do not assume nvm itself is installed.
3. Run the version-controlled setup script:

   ```sh
   bash tooling/cloud-setup.sh
   ```

   It checks Node, prints versions, runs `NODE_ENV=production NPM_CONFIG_INCLUDE=dev
   npm ci`, and downloads the lockfile-matched Chromium. The production/include-dev
   settings match upstream CI and avoid a harmless Svelte config-loader fallback
   warning during install. The underlying required installation is `npm ci`.
4. If the image lacks browser shared libraries, use
   `bash tooling/cloud-setup.sh --with-deps` in an environment with administrator
   privileges, or have its image administrator run
   `npx playwright install-deps chromium`. The current non-root image cannot satisfy
   the `su` password prompt; browser-only installation does not install OS libraries.

Set `bash tooling/cloud-setup.sh` as the existing environment's setup command where
that setting is available. No environment settings were changed by this task:
its runtime plugin exposes status, not a setup-setting write operation. The script
and instructions in Git are the reproducible source; installed packages, browser
caches, `/tmp` logs and running processes do not persist by contract across tasks.
Dependencies stay locked; do not replace tooling or run `npm audit fix --force`.

## Validation

```sh
npm test
npm run check
npm run build
npx playwright install --with-deps chromium
npm run test:browser -- --project=chromium
```

`npm run check` can print the existing Vite production guard during config discovery
then successfully fall back to `svelte.config.js`. Its exit code and final Svelte
summary determine success. `NODE_ENV=production npm run check` avoids that fallback.
Do not set NODE_ENV=development for production builds.

Additional existing CI checks are `npm run catalog:check`,
`npm audit --audit-level=high`, all three browser engines, and
`npm run benchmark:viewer`. See `.github/workflows/ci.yml`: six shards per engine,
production artifacts shared from the build job, and an aggregate required check.
A Chromium-only cloud run is not the full CI matrix.

The bathroom regression uses synthetic dimensions only:

```sh
npm test -- tests/synthetic-bathroom.test.ts
npm run test:browser -- tests/browser/synthetic-bathroom.spec.ts --project=chromium
```

Playwright starts `node build/index.js` itself on **127.0.0.1:4188**, with analytics
and handoff uploads disabled. Rebuild after application changes. Do not manually
start a second server on 4188. Failure traces/screenshots are in ignored
`test-results/`, and the HTML report is in ignored `playwright-report/`.

## Run the application

In separate task terminals:

```sh
npm run dev -- --host 0.0.0.0 --strictPort
npm run preview -- --host 0.0.0.0 --strictPort
```

Development listens on **5173**. Preview serves the completed production build on
**4173**. `--strictPort` prevents a hidden fallback to another port. Verify both:

```sh
curl --fail http://127.0.0.1:5173/editor -o /dev/null
curl --fail http://127.0.0.1:4173/editor -o /dev/null
```

Use the platform's authenticated workspace preview/port forwarding if available;
0.0.0.0 binding alone does not create a public URL. Stop a task terminal's server
with Ctrl-C. Inspect listeners before killing processes; do not kill another task's
server. Browser data is origin-specific (5173, 4173 and 4188 are separate libraries).
Export JSON before discarding a browser profile. The application stores projects
locally in IndexedDB with compatibility/recovery paths; Git does not save browser data.

## Restricted cloud troubleshooting

- A command sandbox may isolate networking even when the cloud proxy is healthy.
  In this task approved commands outside that sandbox could reach the configured
  proxy and localhost servers. Keep the inherited proxy and CA settings; do not
  bypass the proxy or disable TLS verification.
- npm needs registry.npmjs.org. Playwright's cdn.playwright.dev Chromium download
  redirected to **storage.googleapis.com** in this task, which was denied. Ask the
  environment owner to allow the required download destination through its supported
  network settings, then rerun installation. An allowed initial domain does not
  imply its redirects are allowed.
- For useful testing while that download is blocked, this image supplies
  `/usr/bin/chromium`. Explicitly opt into it:

  ```sh
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bash tooling/cloud-setup.sh
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser -- --project=chromium
  ```

  This uses the same tests/server and software WebGL flags, but is **not** verification
  of Playwright's pinned browser. Leave the variable unset for normal CI. Check
  `chromium --version` and report it alongside results. Do not symlink a different
  browser into the pinned browser cache.
- Git HTTPS access and GitHub API access are distinct. This task could read the
  public fork over Git, but `gh api` returned Forbidden. API operations need
  **api.github.com** allowed and a valid GitHub credential with repository access.
  The connected GitHub tool can separately access the fork and supports PR creation.
  `gh auth status` alone may misleadingly report invalid credentials when networking
  is denied. Never print tokens or embed them in remotes/scripts.
- `EADDRINUSE`: inspect ports 5173/4173/4188 and stop only your own conflicting server.
- Missing browser libraries: install image OS dependencies with administrator access;
  a downloaded browser alone is not sufficient. Headless software WebGL is a useful
  regression check, not proof of real GPU, Safari or touch-device behavior.
- Cloud uploads, external AI providers, LiDAR capture and physical device behavior
  require separate credentials/services/devices and are outside local verification.

## Private inputs

Follow [private data integration](PRIVATE_DATA.md). Keep real measurements and photos
in a separately authorised **private** BathroomPlannerData repository, checked out
outside this public project. Only synthetic fixtures and schema/docs go here.
