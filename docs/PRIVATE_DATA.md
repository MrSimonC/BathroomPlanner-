# Private bathroom data integration

The application repository is public. Actual room measurements, photographs, scans, quotes, annotated plans and generated layouts that reveal the room belong in a separate **private** repository named `BathroomPlannerData`. The private repository is not created or verified by these instructions; GitHub authentication and network access must work before the owner can perform the steps below. In the current environment, Git transport can reach GitHub with the permitted network path, but GitHub API requests return `Forbidden` and `api.github.com` is absent from the network allowlist. The connected GitHub tool separately verified access to the public application fork, but returned 404 for `MrSimonC/BathroomPlannerData`; that does not distinguish absence from lack of access. Its available operations do not include creating a repository. Repository creation and private visibility therefore cannot be verified here. Allow the GitHub API through the managed network policy and verify that the credential is authorised to create private repositories for the intended owner; a failed `gh auth status` under a network denial alone does not prove the token is invalid. Do not infer privacy from a repository name.

## Private repository layout

The initial private workspace uses this exact root structure. Do not put an address or client name in filenames:

```text
BathroomPlannerData/
  bathroom/
    measurements.json          # Starts as {}; replace with an evidence-backed draft
    constraints.md             # Requirements, unresolved questions and assumptions
    photos/                    # Survey photographs
    fixtures/                  # Product dimensions and specifications
    layouts/                   # Alternatives, exports and validation reports
    references/                # Surveys, drawings and other source evidence
```

Empty asset directories contain `.gitkeep` placeholders. `bathroom/measurements.json` initially contains `{}` and is intentionally **not schema-valid** until real evidence-backed measurements are supplied. No room dimensions are invented during setup. As the project develops, append-only confirmed snapshots can live in `bathroom/references/measurement-revisions/`; proposals in `bathroom/layouts/` retain their baseline revision and digest.

Source records use paths relative to `bathroom/`, such as `references/survey-notes.pdf#page=2` or `photos/wall-a.jpg`. Each supplied measurement may reference source IDs and carry confidence and verification metadata. Those evidence fields are optional; absence means unknown and never implies verification. Record estimates explicitly with `method: "estimated"`; do not invent confidence scores. Partial capture notes may be retained while dimensions are missing, but are not valid complete snapshots until the schema-required geometry is supplied. Do not use zero placeholders for missing dimensions. Existing editor files use centimetres, not the millimetres used by the [canonical schema](../schemas/bathroom-measurements.schema.json); see [the architecture](ARCHITECTURE.md) before converting them.

## Create and connect locally

Run these manually once authenticated. Replace `OWNER` with the authorised GitHub account or organisation. **Check for an existing repository before attempting creation:**

```sh
gh auth status
gh repo view OWNER/BathroomPlannerData --json nameWithOwner,visibility
```

If it exists, use that repository and require `visibility` to be `PRIVATE`. If this check fails, stop and resolve the error: `Forbidden`, network failure or even `404` can reflect insufficient access. Do not interpret an access failure as proof that the repository is absent. Once the owner has established that no such repository exists, create it and verify visibility:

```sh
gh repo create OWNER/BathroomPlannerData --private --description "Private bathroom survey evidence and planning artifacts"
gh repo view OWNER/BathroomPlannerData --json nameWithOwner,visibility
```

The following setup checks visibility again before cloning or creating placeholders. It exits on an inaccessible or non-private repository, an existing local destination, or any command failure. Use HTTPS because this cloud environment supports HTTPS Git transport; no token belongs in the URL. The private clone is a **sibling** of the public checkout:

```sh
bash <<'SH'
set -eu
owner='OWNER'
repo="$owner/BathroomPlannerData"
visibility=$(gh repo view "$repo" --json visibility --jq .visibility)
if [ "$visibility" != PRIVATE ]; then
  printf '%s\n' 'Stop: repository visibility is not PRIVATE.' >&2
  exit 1
fi
data_dir='/workspace/BathroomPlannerData'
if [ -e "$data_dir" ]; then
  printf '%s\n' 'Stop: local destination exists; inspect it before making changes.' >&2
  exit 1
fi
git clone "https://github.com/$repo.git" "$data_dir"
DATA_SETUP_DIR="$data_dir" python - <<'PY_SETUP'
import os
from pathlib import Path
bathroom = Path(os.environ['DATA_SETUP_DIR']) / 'bathroom'
# Exclusive creation preserves any existing content, including in an existing remote.
bathroom.mkdir(exist_ok=True)
files = {
    bathroom / 'measurements.json': '{}\n',
    bathroom / 'constraints.md': '# Bathroom constraints\n\nRecord requirements, unresolved measurements and assumptions here.\n',
}
for directory in ('photos', 'fixtures', 'layouts', 'references'):
    path = bathroom / directory
    path.mkdir(exist_ok=True)
    files[path / '.gitkeep'] = ''
for path, content in files.items():
    try:
        with path.open('x') as output:
            output.write(content)
    except FileExistsError:
        print(f'Preserved existing file: {path}')
print('Local placeholders prepared; no commit or push was made.')
PY_SETUP
SH
```

Grant access only to intended collaborators. Review any existing private repository content before changing its structure. Never put the clone underneath public `static`, `src`, `docs`, test fixtures or build output.

A sibling directory is deliberately outside the application's build tree. It is not a submodule, public dependency or remote asset URL. Do not add a token to a clone URL or commit credentials. An environment variable alone does not add integration: this foundation has no runtime reader for this private directory.

Use a local JSON Schema Draft 2020-12 validator to validate private snapshots against `schemas/bathroom-measurements.schema.json` from the public checkout, enabling `date-time` format assertions. For example, with Python's optional `jsonschema` package installed:

```sh
python - <<'PY'
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
schema = json.loads(Path('/workspace/BathroomPlanner-/schemas/bathroom-measurements.schema.json').read_text())
measurement_path = Path('/workspace/BathroomPlannerData/bathroom/measurements.json')
validator = Draft202012Validator(schema, format_checker=FormatChecker())
validator.validate(json.loads(measurement_path.read_text()))
print('Measurement structure is valid; geometry and references still need semantic review.')
PY
```

Do not run the example against the initial `{}` placeholder; it should fail until a real draft exists. This command is optional local tooling, not an application dependency or implemented geometry checker. Structural validity does not prove that source references resolve, a perimeter is simple or a layout fits.

Import a derived native `.openplan.json` through the editor's existing local JSON import. Do not import the canonical measurement snapshot directly: a survey-to-editor adapter is still planned. Keep the canonical snapshot alongside the export so metadata lost through interchange cannot become the sole measurement record.

## Confirmation and data handling

Record unresolved dimensions in private notes and keep the snapshot a draft. Once reviewed, assign a new revision, record who confirmed it and when, save an immutable revision file, and retain its content digest in proposal manifests. Correct a confirmed measurement by creating the next revision; preserve the prior evidence and record the reason. Git history is useful audit evidence but does not itself enforce append-only storage or prevent force pushes.

Keep private files out of public commits, public CI artifacts, screenshots, issue bodies and deployment bundles. Before publishing code, inspect the staged diff and tracked file list; the public repository must contain only generic documentation, schema and intentionally synthetic examples. Do not rely on `.gitignore` to protect files already tracked. Export files and browser-local copies remain private data even when they contain no photos. Existing optional sharing/handoff features involve separate services and must not be used as an implicit private-repository sync mechanism.

Public CI should validate the schema and synthetic examples without private checkout credentials. If private CI is introduced later, run it in the private repository with explicit checkout permissions and controlled artifacts. Never make public builds depend on private data. Local backups and repository permissions should cover the source evidence, snapshots and generated outputs together.
