# Codex Baseline

Baseline date: 2026-07-27 (Asia/Saigon).

> This is a historical baseline, not current-state documentation. The absolute
> repository path and dirty-worktree inventory below describe the audit machine
> on 2026-07-27. For the 2026-08-08 state, use `README.md`, `data/DATA.md`,
> `docs/SCHEMA.md`, current code/data, and fresh commands.

This file began as a read-only onboarding except for the three permitted
context files. Subsequent user-authorized repair batches on the same date fixed
B-3, B-4, and B-5 plus the verified Beam, IDA*, Pydantic-error, keyboard, and
journey-state semantic defects. Directly coupled schema/proof/UI wording and
regression tests were synchronized. Data, results, report, generated
artifacts, dependencies, branch, commit, and remote state were not changed.

## Repository state

| Item | Value |
|---|---|
| Repository root | `D:\TAI_LIEU_HCMUS_K24\Năm 2 - Kì 3\Cơ sở Trí tuệ nhân tạo\Project01` |
| Branch | `main` tracking `origin/main` |
| HEAD | `aedcf7255c4beadd1de0be69e5638f146bae89ed` |
| Initial modified tracked file | `.gitignore` |
| Initial untracked file | `docs/AUDIT-CLAUDE-PRE-SUBMISSION.md` |
| Initial staged files | none |
| Instruction files found before creation | root `CLAUDE.md` only |
| Inventory | 132 tracked files; 7 backend test files; 35 TS/TSX files |

The `.gitignore` edit and audit document belonged to the user and were
preserved. `CLAUDE.md` applies repository-wide as legacy guidance; the current
onboarding request explicitly overrode its phase, commit, progress-log, and
stop-for-approval process.

At the end of onboarding, status added exactly the three permitted untracked
context files: `AGENTS.md`, `docs/CODEX-CODEBASE-MAP.md`, and
`docs/CODEX-BASELINE.md`. The later repairs intentionally modified backend
search/explanation/API/model code and tests, the benchmark page, four frontend
components, the store, `docs/SCHEMA.md`, and `docs/HEURISTIC-PROOF.md`; no
generated or data/result file was changed.

Recent HEAD history begins:

```text
aedcf72 fix: camera fits the actual node cloud, home button refits to live width
9b2e1d9 docs: sync all docs to post-v11 state, TomTom run-book, ignore audit_tmp
a4848fd fix: UI v11 - panel, drawer tabs, map polish (user review + 3-lens council)
```

## Environment

| Component | Observed value | Provenance |
|---|---|---|
| Shell | Windows PowerShell 5.1.26100.8894 | live command |
| Git | 2.51.2.windows.1 | live command |
| ripgrep | 15.2.0 | live command |
| project venv Python | 3.14.0 | `.venv\Scripts\python.exe` |
| PATH Python | 3.14.0 | `python` |
| Node.js | v24.14.1 | live command |
| npm | 11.11.0 | live command |
| Next.js | 15.5.22 | `frontend/package.json` |
| TypeScript | 5.9.3 | `frontend/package.json` |
| FastAPI | 0.140.0 | `backend/requirements.txt` |
| Pydantic | 2.13.4 | `backend/requirements.txt` |
| pytest | 9.1.1 | `backend/requirements.txt` |

`pip --version` was attempted inside the environment capture but failed while
rendering the Vietnamese repository path under CP1252. This did not affect
Python, pytest, or validation execution and did not install anything.

### Multi-agent routing

Runtime allowed a requested model and reasoning override, but exposed no
effective model/effort metadata after execution. It also exposed no enforced
read-only permission flag. All read-only constraints were prompt-enforced.

| Worker | Requested/fallback route | Requested reasoning | Effective metadata | Permission | Verified |
|---|---|---|---|---|---|
| Main coordinator | GPT-5.6 Sol target | highest session level | not exposed | normal coordinator | NO |
| Requirements/docs | Luna unavailable; requested `codex-auto-review` | low | not exposed | prompt read-only | NO |
| Backend/API | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |
| Search/trace | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |
| Data/benchmark | Luna unavailable; requested `codex-auto-review` | low | not exposed | prompt read-only | NO |
| Frontend | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |
| Baseline runner | Terra fallback | low | not exposed | prompt no-write/non-destructive | NO |
| B-3 repair analysis | `gpt-5.6-terra` | high | not exposed | prompt read-only | NO |
| B-4 repair analysis | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |
| B-3/B-4 independent review | `gpt-5.6-sol` | high | not exposed | prompt read-only | NO |
| B-5/keyboard analysis and final review | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |
| Beam/IDA* analysis and final review | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |
| Pydantic error analysis and final review | `gpt-5.6-terra` | medium | not exposed | prompt read-only | NO |

**MODEL ROUTING UNVERIFIED.** The onboarding does not claim proven model-cost or
usage savings.

The documentation-refresh audit reused three first-level read-only workers
(documentation freshness, code/data facts, README/ignore policy). Requested
Terra routes were accepted by the spawn API, but effective model/effort metadata
was again not exposed. One worker self-reported routing verified despite also
reporting that metadata was unavailable; the coordinator resolves that
contradiction conservatively as **UNVERIFIED**.

## Commands executed

Repo root means the path recorded in Repository state.

| Command | CWD | Exit code | Result | Duration/notes |
|---|---|---:|---|---|
| Git status/branch/HEAD/log/diff inventory | repo root | 0 | captured initial dirty state and HEAD | ~1.0 s |
| `rg --files` plus instruction inventory | repo root | 0 | 127 presented files after display exclusions; only `CLAUDE.md` instruction existed | ~0.6 s |
| environment/version/inventory batch | repo root | 0 overall | versions and counts captured; embedded pip display failed CP1252 | 3.798 s |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -v` | repo root | 0 | 82 passed, 1 deprecation warning | 17.092 s wall; 15.84 s pytest |
| `.venv\Scripts\python.exe scripts\validate_data.py` | repo root | 0 | `ALL DATA VALID`, with 2 profile-source warnings | 1.466 s |
| `npx tsc --noEmit` | `frontend` | 0 | no compiler output/errors | 35.823 s |
| process/`.next`/dependency/font/network inspection | `frontend` | 0 | two active Next dev trees; build gate false | 0.724 s |
| PDF extraction and PyMuPDF rendering of all 10 assignment pages | repo root | 0 | rubric text extracted; page 1 and page 10 visually checked | 1.4 s after Poppler fallback |
| `Get-Content`/`rg` contract, code, test, marker, and symbol batches | repo root | 0 for successful scans | requirements/code/audit evidence collected | grouped read-only inspection |
| current JSON metadata/profile/risk summaries | repo root | 0 | current graph/profile counts and source read directly | 1.0-1.8 s |
| local process and `GET /api/health`, `GET /api/graph?level=demo` probe | repo root | 0 | health current; live graph stale at 51/141 | 1.5 s |
| Pydantic MRO plus Starlette exception-handler lookup | repo root | 0 | internal `ValidationError` resolves to `on_value_error` | 1.0 s |
| static invariant `rg` batch | repo root | 0 wrapper; per-pattern status handled | libraries, RNG, cache, cap, markers checked | 0.404 s |
| final runner Git status/diff/untracked check | repo root | 0 | runner left initial state unchanged | 0.323 s |
| context heading/path/fence/trailing-whitespace checks | repo root | 0 | 27 map sections, 10 baseline sections, valid referenced paths, balanced fences | grouped QA |
| `git diff --check` and no-index `--check` for three untracked files | repo root | 0 / expected no-index 1 | no whitespace diagnostics | final QA |
| `git diff -- AGENTS.md docs/CODEX-CODEBASE-MAP.md docs/CODEX-BASELINE.md` | repo root | 0 | empty because the three files are untracked; no-index checks used instead | final QA |
| `git status --short` | repo root | 0 | only initial `.gitignore`/audit plus three permitted context files | final QA |
| targeted B-3/B-4 regression batch before source patch | `backend` | 1 | expected red phase: 5 failed, 4 passed | 2.4 s wall |
| same targeted B-3/B-4 batch after source patch | `backend` | 0 | 9 passed | 2.1 s wall |
| `pytest test_search.py test_search_advanced.py test_api.py -q` | `backend` | 0 | 56 passed, 1 deprecation warning | 13.2 s wall |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -v` after repair | repo root | 0 | 91 passed, 1 deprecation warning | 15.5 s wall; 14.33 s pytest |
| `.venv\Scripts\python.exe scripts\validate_data.py` after repair | repo root | 0 | `ALL DATA VALID`, same 2 source warnings | 1.5 s |
| `npx tsc --noEmit` after repair | `frontend` | 0 | no compiler output/errors | 3.9 s |
| targeted Beam/IDA*/Pydantic semantic batch before source patch | `backend` | 1 | expected red phase: 3 failed, exhaustive-unreachable control passed | 4 items |
| same targeted semantic batch after source patch | `backend` | 0 | 4 passed, 1 deprecation warning | 0.63 s pytest |
| `pytest test_search_advanced.py test_api.py -q` | `backend` | 0 | 47 passed, 1 deprecation warning | 3.17 s pytest |
| `npx tsc --noEmit` after B-5/UI repair | `frontend` | 0 | no compiler output/errors | 5.9 s |
| headless Chrome B-5 reproduction before patch | live `/benchmark` | 0 | 1366×768; content 796 px; no scroll owner reproduced | targeted runtime probe |
| headless Chrome B-5 verification after patch | live `/benchmark` | 0 | 1366×768; `main` 768/796 px; 28 px scroll range reached | targeted runtime probe |
| headless Chrome timeline keyboard matrix | live `/` | 0 | Space on switch changed only switch; Space on body still toggled playback | targeted runtime probe |
| headless Chrome journey-state matrix | live `/` | 0 | same-value trace preserved; stop excluded from start picker; tour swap disabled | targeted runtime probe |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -q` after semantic repair | repo root | 0 | 95 passed, 1 deprecation warning | 14.85 s pytest |
| `.venv\Scripts\python.exe scripts\validate_data.py` after semantic repair | repo root | 0 | `ALL DATA VALID`, same 2 source warnings | 1.7 s |
| `pytest test_api.py -q` after internal-error logging | `backend` | 0 | 29 passed, 1 deprecation warning | 1.27 s pytest |
| final `.venv\Scripts\python.exe -m pytest backend\tests\ -q` | repo root | 0 | 95 passed, 1 deprecation warning | 15.89 s pytest |
| final `npx tsc --noEmit` | `frontend` | 0 | no compiler output/errors | 5.2 s |
| documentation-refresh `.venv\Scripts\python.exe -m pytest backend\tests\ -q` | repo root | 0 | 95 passed, 1 deprecation warning | 14.62 s pytest |
| documentation-refresh `.venv\Scripts\python.exe scripts\validate_data.py` | repo root | 0 | `ALL DATA VALID`; two warnings that 2 raw TomTom snapshots are not in synthetic profiles | 1.6 s wall |
| documentation-refresh `npx tsc --noEmit` | `frontend` | 0 | no compiler output/errors | 4.8 s wall |
| documentation-refresh `GET /api/health` + `GET /api/graph?level=demo` | live localhost:8000 | 0 | backend still serves stale graph created 2026-07-26 with 51/141 | read-only probe |
| final Markdown H1/fence/local-link scan | repo root | 0 | all 20 project Markdown files pass; all local link targets exist | read-only PowerShell scan |
| final ignore-policy matrix + tracked-ignore scan | repo root | 0 | intended local files ignored; committed artifacts trackable; no tracked file matches ignore rules | read-only Git checks |
| final stale-claim/marker/diff scan | repo root | 0 | no selected stale current claim; 40 actionable markers on 30 content lines; `git diff --check` pass | read-only `rg`/Git checks |

Initial Poppler commands (`pdfinfo`, `pdftotext`, `pdftoppm`) were attempted and
failed because those executables were not installed. No package was installed.
The available `pypdf` and PyMuPDF libraries were then used successfully.

## Test results

| Gate | Result | Detail |
|---|---|---|
| Backend pytest | **PASS** | 95/95 items passed; 88 functions plus 7 extra parameterized items |
| Pytest warning | non-failing | Starlette TestClient/httpx deprecation warning |
| Data validator | **PASS WITH WARNING** | graph/profile/schema/SCC/invariants valid |
| Frontend type check | **PASS** | `npx tsc --noEmit`, exit 0 |
| Frontend production build | **NOT RUN** | active dev servers and Google-font/network risk |
| Browser/UI targeted tests | **PASS** | benchmark scrolling, keyboard ownership, and journey-state matrix |
| Benchmark exp1-exp7 | **NOT RUN** | prohibited generated write; existing results stale |

The backend test architecture contains:

- 88 textual test functions;
- 95 collected items after the two repair batches;
- NetworkX oracles inside search tests and benchmark exp1;
- large comparison loops inside a small number of pytest items.

The new tests now validate IDDFS/IDA* post-expand snapshots, Bidijkstra
active-frontier g ownership, mode-aware IDA*/gap explanation units, Beam
`frontier <= k`, IDA* cap/exhaustive termination guarantees, and generic
logged handling of internal Pydantic validation errors. Browser probes cover
the repaired scroll, keyboard, and journey-state behaviors. Passing 95 items
still does not validate live cache freshness or result provenance.

## Documentation and ignore refresh

- All 20 project-owned Markdown files were updated. `.agents`, `.claude`,
  dependencies, and generated vendor documentation were excluded from this
  inventory.
- `README.md` is now the primary human entrypoint: current status, rubric
  coverage, architecture, guarantees, environment, setup/run/test, API, data
  refresh, document map, submission checklist, troubleshooting, and license
  caveat.
- Current contracts/facts were synchronized; historical phase/audit files now
  carry explicit snapshot warnings instead of having their old evidence
  rewritten.
- Generated teaching content remains clearly provisional and was not
  regenerated from the partial TomTom set.
- `.gitignore` now covers local environment variants, `.agents`, Claude-local
  skills/settings, Python/Node/build/coverage caches, IDE noise, raw data, and
  disposable render scratch. `.env.example`, the frontend lockfile, committed
  data/results/report files, and context docs remain trackable.
- No file under `.claude/` was modified. Temporary assignment-PDF render
  artifacts under `tmp/` were removed after inspection.

## Data metadata

| Item | Current value |
|---|---|
| `G_demo` | created 2026-07-27; 51 nodes; 292 directed edges; 56 one-way edges |
| `G_real` | created 2026-07-27; 2,118 nodes; 4,699 directed edges; 1,433 one-way edges |
| demo risk flags | flood 24; construction 24; narrow alley 0; traffic light 131 |
| real risk flags | flood 54; construction 19; narrow alley 8; traffic light 185 |
| demo profiles | 4 slots × 292 edge values; source `synthetic` |
| real profiles | 4 slots × 4,699 edge values; source `synthetic` |
| raw TomTom coverage | two snapshots: 07:30 and 12:00; 17:30/22:00 absent |
| manual risks | 8 records; 8 TODO source placeholders; 0 usable URLs |
| validator | `ALL DATA VALID` with two synthetic-source/TomTom warnings |

The validator confirmed both graphs are strongly connected and the six
demo-vs-real contraction invariants pass.

Current results are older than current data. `results/README.md` explicitly says
the result set belongs to the 2026-07-26 synthetic run while graphs were rebuilt
2026-07-27.

## Static invariant checks

| Check | Finding |
|---|---|
| NetworkX | expected in data build, tests, benchmark; not found as product search/TSP dependency |
| OSMnx | expected in offline scripts 01/02 |
| HTTP clients | `requests` in optional TomTom crawler; `urllib` in contrast checker; no backend routing call |
| JS randomness | no `Math.random` found |
| Python randomness | explicit `random.Random` instances with seeds; no global `random.seed`/NumPy RNG hit |
| cache | `GraphStore.load` and `graph_payload` are process-lifetime `lru_cache`s |
| trace cap | `MAX_TRACE_STEPS = 5_000`; recorder active gate present |
| temporary numbers | five `SỐ TẠM` locations found |
| report fill markers | 40 actionable marker occurrences on 30 content lines, excluding the marker-legend line |
| source URLs | 8 `TODO` placeholders |
| frontend tests | no test script/runner; TypeScript only |

Repair verification confirmed:

- IDDFS and IDA* now snapshot frontier after successor generation;
- Bidijkstra g values now come only from the side(s) where a node is active;
- distance-mode IDA* epsilon and non-optimal cost gaps now use metres, while
  time/balanced continue to use seconds;
- Beam trace and `max_frontier` expose only the selected top-k next beam;
- IDA* reports no guarantee when the round cap stops an unfinished run;
- internal Pydantic validation failures return generic 500 and retain
  server-side traceback logging;
- benchmark scrolling and timeline keyboard ownership pass browser probes;
- same-value journey assignments preserve results, and a start cannot duplicate
  a delivery stop through either picker path.

## Audit status summary

| ID | Status | Evidence summary |
|---|---|---|
| B-1 stale results | `CONFIRMED` | result/data dates and explicit README warning |
| B-2 incomplete deliverables | `CONFIRMED` | missing final artifacts, fill/screenshots/URLs/package |
| B-3 trace semantics | `RESOLVED` | five red-before/green-after semantic assertions; full suite pass |
| B-4 explanation units | `RESOLVED` | all three modes covered for epsilon and non-optimal gap |
| B-5 benchmark scrolling | `RESOLVED` | browser reproduced before patch and scrolled 28 px after patch at 1366×768 |
| B-6 stale processes/cache | `CONFIRMED` | live API 51/141 vs disk 51/292 |

The full blocker, high-priority, and grouped lower-priority matrix is in
`docs/CODEX-CODEBASE-MAP.md` section 23.

Important reconciliation decisions:

- The audit's Pydantic/ValueError concern was correct; the new exact handler
  returns/logs a generic internal 500 while request-validation errors remain
  normalized 422 responses.
- Irrelevant route parameters do not cause signature errors because every
  registered algorithm accepts `**params`; schema says they are ignored.
- The audit's "31 placeholders" is stale; current count is 40 actionable
  occurrences on 30 content lines, excluding the marker-legend line.
- B-5 was reproduced before and verified after the fix at the audit's exact
  1366×768 viewport.

## Files intentionally not executed

| Item | Status | Reason |
|---|---|---|
| `scripts/01_download_osm.py` | NOT RUN | network/data rebuild prohibited |
| `scripts/02_build_graph.py` | NOT RUN | data rebuild prohibited |
| `scripts/03a_crawl_tomtom.py` | NOT RUN | crawler/network prohibited |
| `scripts/03b_build_profiles.py` | NOT RUN | user is collecting all 4 TomTom slots before the final data decision |
| `scripts/04_build_gdemo.py` | NOT RUN | generated data write prohibited |
| `scripts/05_calibrate_gamma.py` | NOT RUN | incomplete input/generated result write |
| `backend/app/benchmark.py` | NOT RUN | rewrites stale results; explicitly prohibited |
| `scripts/gen_teaching_doc.py` | NOT RUN | generated document write prohibited |
| `scripts/check_contrast.py` | NOT RUN | network/browser-adjacent, not baseline-required |
| `npm run build` | NOT RUN | two live Next dev trees write `.next`; Google fonts |
| backend/frontend restart | NOT RUN | onboarding did not authorize service mutation |
| report/slide/video/ZIP work | NOT RUN | manual deliverables outside onboarding writes |

## Environment limitations

- No Poppler executable; PDF verification used installed Python libraries.
- Targeted browser automation verified scrolling, keyboard ownership, and
  journey-state behavior. Map rendering, theme/contrast, offline behavior,
  general animation, accessibility, and responsive coverage remain unverified.
- Two Next dev process trees were active. Production build would risk `.next`
  corruption and was correctly skipped.
- `next/font/google` may require network on a fresh build/dev compilation.
- Carto basemaps and contrast-style fetching require network; offline mode only
  removes the basemap at runtime and is not persisted.
- Current live backend was stale and was deliberately not restarted.
- Effective subagent model/effort and enforced read-only permission metadata
  were not exposed.
- Benchmark runtime is wall-clock and was not refreshed.

## Readiness

**CODE BLOCKER REPAIR COMPLETE; DATA/DELIVERABLE WORK DEFERRED**

The authorized code repair batches are complete: B-3, B-4, and B-5 plus the
bounded Beam/IDA*, Pydantic-error, keyboard, and journey-state semantic defects
are fixed and covered by proportionate regression/runtime evidence.

It is **not ready for submission or final demo**. B-1, B-2, and B-6 remain.
The final data-source decision is deliberately deferred until all four TomTom
slots have been collected; results and generated/manual deliverables must then
be refreshed coherently, and old services must be restarted before capture.
