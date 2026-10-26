# Cloud validation — 2026-10-26

Repository: https://github.com/MrSimonC/BathroomPlanner- (public fork).
Initial branch: `work`; initial commit: `98f9cb467e4045c6abc5d9880ada1f03dff50c68`.
Initial working tree was clean. Remote `main` was verified at the same commit.
Working branch: `feature/bathroom-cloud-setup`.

The existing managed cloud environment was connected/running. No replacement
environment, public deployment, paid infrastructure, licence change or upstream PR
was created. Commands ran from `/workspace/BathroomPlanner-` unless noted.

## Installation and static/unit checks

| Check | Observed result |
| --- | --- |
| Node / npm | v24.19.0 / 11.9.0; upstream `.nvmrc` requires 24 |
| `npm ci` | Passed; 263 packages; lockfile unchanged |
| Initial `npm test` | 164 files, 1,596 tests passed |
| New bathroom focused unit test | 2 tests passed |
| Fresh-install full `npm test` | 165 files, 1,598 tests passed, including both new regressions |
| `npm run check` | Passed: 0 errors, 0 warnings (initial config discovery emitted fallback notice) |
| `NODE_ENV=production npm run check` | Passed: 0 errors, 0 warnings, without fallback notice |
| `npm run build` | Passed, Node adapter build produced |
| `npm run catalog:check` | Passed: 189 catalog entries, 204 bundled GLBs, 20 textures |
| `npm audit --audit-level=high` | Passed threshold; 3 low-severity vulnerabilities remain; no forced dependency changes |
| Fresh-directory setup | Passed in `/tmp/bathroom-clean`: Node 24 check, 263 packages installed, explicit system Chromium selection |
| JSON Schema | Draft 2020-12 meta-schema checked with Python jsonschema; optional metadata and invalid dimensions/confidence/verification cases exercised |
| Diff / shell | `git diff --check` and `bash -n tooling/cloud-setup.sh` passed |

Fresh-directory command (source copied without node_modules, build or Git metadata):

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bash tooling/cloud-setup.sh
```

The usual pinned-browser setup remains documented. The optional system-browser path
is explicit and does not alter CI defaults or the dependency lockfile.

## Browser environment and results

`npx playwright install --with-deps chromium` failed because dependency installation
attempted `su` and the image has no usable root-password flow. Browser-only
`npx playwright install chromium` then failed with HTTP 403 `Domain forbidden`:
cdn.playwright.dev redirects Chrome-for-Testing downloads to storage.googleapis.com,
which was not allowed. No network-policy bypass was attempted.

The preinstalled `/usr/bin/chromium` is **154.0.8037.57 (Debian 13)**. Tests ran with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`; Playwright 1.63.0 normally
pins Chrome 153.0.8010.12. These results do not establish a pinned-browser pass.

- Focused bathroom browser regression: **2 passed**, desktop 1440px and phone
  viewport 390px. A phone viewport is not a physical device.
- Initial exact serial suite command was deliberately interrupted to restart the
  entire suite with four workers: 8 passed, 1 interrupted, 448 not run. It is not
  counted as a complete suite.
- Complete run command:

  ```sh
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser -- --project=chromium --workers=4
  ```

**Complete run: 457 passed in 26.4 minutes, exit code 0; no failed or skipped tests.**
This includes both new bathroom browser cases. No upstream test assertions were
changed or disabled. Firefox, WebKit,
physical devices and rendering benchmarks were not run in this task. Existing CI
retains its wider matrix and benchmark gates.

## Demonstrated running application

Both requested servers were started, with `--strictPort` added to avoid silent port
changes. Playwright's separate production test server owned port 4188.

| Runtime | HTTP evidence | Independent browser smoke |
| --- | --- | --- |
| `npm run dev -- --host 0.0.0.0 --strictPort` | `/editor` on 5173 returned 200 | Synthetic JSON import, visible 2D and 3D, top-down view, zero page errors |
| `npm run preview -- --host 0.0.0.0 --strictPort` | `/editor` on 4173 returned 200 | Synthetic JSON import, visible 2D and 3D, top-down view, zero page errors |

Screenshots were captured locally under `/tmp/bathroom-{5173,4173}-{2d,3d}.png`.
The preview 3D screenshot was visually inspected: four enclosing walls, door/window,
bath, basin and toilet render around the bathroom floor. These transient screenshots
are not a persistence guarantee; reproduce them using the committed browser test,
which attaches screenshots to the Playwright report.

The synthetic fixture is a 3000 × 2400 mm **centreline** rectangle, not a survey of
the user's bathroom. Its 100 mm walls leave a 2900 × 2300 mm clear interior. Fixture
sizes are explicit: bath 1700 × 750 × 600 mm, basin 550 × 420 × 850 mm, toilet
400 × 650 × 400 mm. The door is 750 × 2050 mm; the window is 800 × 600 mm with
1500 mm sill height. The stored native JSON uses centimetres.

The regression checks native JSON validation, a detected room, native exact
roundtrip equality, prepared metre interchange roundtrip, browser import, saved
IndexedDB floors, reload, downloaded JSON and actual downloaded-file reimport.
The full floor geometry/dimensions match after export/reimport. It also exercises
2D and software-rendered 3D. This is not a code-compliance or optimal-layout claim.

## Functional coverage map

| Capability | Regression source |
| --- | --- |
| New blank plan and retaining earlier edits | `tests/browser/project-opening.spec.ts` |
| Drawing walls and inserting doors/windows from catalog | `tests/browser/opening-catalog-localization.spec.ts` |
| Exact wall and opening dimensions, joined geometry, units, undo/save | `tests/browser/wall-dimensions.spec.ts` |
| Furniture placement, rotation, wall snapping, save/reopen | `tests/browser/rotated-furniture-placement.spec.ts` |
| 3D furniture placement and return to 2D | `tests/browser/3d-furniture-localization.spec.ts` |
| Import/edit/save/reload/export and assets | `tests/browser/editor.spec.ts` |
| Synthetic bathroom import/export geometry and 2D/3D | `tests/browser/synthetic-bathroom.spec.ts`, `tests/synthetic-bathroom.test.ts` |

These operations are covered across separate tests. No single new workflow draws
an entire bathroom from scratch and places all fixtures interactively; the focused
bathroom regression imports the synthetic fixture. No real bathroom inputs were
available, measured, inferred or committed.

## Access and remaining boundaries

Git transport can read/push the public fork; a dry-run feature-branch push succeeded.
The cloud CLI's GitHub API requests returned Forbidden. The connected GitHub tool
independently verified fork metadata and admin/push access and supports PR creation.
Its private-data repository lookup returned 404, and it has no repository-creation
operation. BathroomPlannerData was not created or verified private. Follow
[PRIVATE_DATA.md](PRIVATE_DATA.md) once API access/permissions are available.

The measurement schema and architecture are preparation, not a completed survey
importer, immutable storage layer, constraint validator or AI optimisation engine.
See [ARCHITECTURE.md](ARCHITECTURE.md). Runtime environment settings were not writable
through the available runtime tool; setup is captured in version-controlled files.
