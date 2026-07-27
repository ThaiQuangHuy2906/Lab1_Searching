# AGENTS.md

## Scope

This file applies to the whole repository.

Project-local legacy guidance lives in `CLAUDE.md`, but the current user request
always wins. Do not follow its phase/commit ritual unless the user explicitly
asks for it.

## Project summary

- Vietnamese urban-traffic AI lab for a multi-stop shipper in central HCMC.
- FastAPI backend and Next.js 15/TypeScript frontend.
- Two directed graph snapshots: `G_demo` for teaching/visualization and
  `G_real` for scale/benchmark work.
- Ten two-point search algorithms: BFS, DFS, IDDFS, UCS, Dijkstra, A*, Greedy,
  Bidirectional Dijkstra, IDA*, and Beam Search.
- Three ATSP methods: Held-Karp, Nearest Neighbor + asymmetric-safe 2-opt/Or-opt,
  and Simulated Annealing.
- Offline data pipeline, seven benchmark experiments, generated teaching
  material, and manual report/slide/video deliverables.

## Read first

Read in this order:

1. `docs/Lab 1 - Searching.pdf`
2. `docs/Lab1-ChotPhuongAn.md`
3. `PROMPT-MASTER.md`
4. `docs/SCHEMA.md`
5. `docs/CODEX-CODEBASE-MAP.md`
6. `docs/CODEX-BASELINE.md`
7. `docs/AUDIT-CLAUDE-PRE-SUBMISSION.md`

Then read the implementation and tests directly relevant to the requested
change. Treat `docs/TIENDO.md` and `docs/KIEMTOAN.md` as history/audit ledgers,
not proof of current behavior.

## Source-of-truth hierarchy

- Assignment requirements and grading: the assignment PDF.
- Settled project choices: `docs/Lab1-ChotPhuongAn.md`.
- Construction history and original build specification: `PROMPT-MASTER.md`;
  current-state notes inside that file supersede its historical phase ritual.
- Intended graph, trace, REST, and cost contracts: `docs/SCHEMA.md`.
- Executable schema: `backend/app/models.py`. Report a schema/model mismatch;
  do not silently choose one.
- Current behavior: current code/data plus a fresh command or runtime check.
- Tests: evidence only for the behavior they actually assert.
- UI design intent: `docs/DESIGN.md`; browser behavior still needs runtime QA.
- Data meaning and build rules: `data/DATA.md` plus current JSON metadata.
- Generated teaching content: `scripts/gen_teaching_doc.py` and its inputs.
- `docs/TIENDO.md`, `docs/KIEMTOAN.md`, `hdcrawl.md`, and audit files are
  historical/operational evidence and may be stale.

When describing current state, prefer current code/data and fresh command
results over schema prose, generated docs, and historical logs.

## Critical invariants

- Change the intended contract in `docs/SCHEMA.md` before changing a public
  graph/trace/API contract, unless the user explicitly freezes the schema.
- All ten route algorithms use one `Trace` contract.
- `distance` cost is metres; `time` and `balanced` costs are seconds.
- `total_time_s` is always the balanced path weight, even in another mode.
- Never print a seconds suffix for a distance-mode cost or epsilon.
- NetworkX is allowed in data build, tests, and benchmark baselines, not in
  product search/TSP/API execution.
- Backend demo routing reads committed snapshots and must not call the network.
- Keep random behavior seeded: default seed 42; SA seeds 0 through 4.
- The 5,000-step trace cap must not truncate full-run metrics or search work.
- A*/IDA* guarantees depend on the documented admissible/consistent heuristic;
  UCS/Dijkstra/Bidijkstra depend on non-negative weights.
- Traversal order and heap tie-breaks must remain stable and reproducible.
- Treat directed roads and the multiroute cost matrix as asymmetric.
- Do not rebuild `data/`, rerun benchmark results, or replace benchmark numbers
  unless the user explicitly authorizes the complete dependency chain.
- Regenerate `docs/GIAI-THICH-THUAT-TOAN.md` through
  `scripts/gen_teaching_doc.py`; do not hand-edit generated numerical sections.
- Existing `results/` are stale relative to current graph data. Never cite them
  as current official results.

## Baseline commands

Run from the repository root unless another CWD is stated.

### PowerShell

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -v
.venv\Scripts\python.exe scripts\validate_data.py

Set-Location frontend
npx tsc --noEmit
```

Backend development server, from `backend\`:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Frontend development server, from `frontend\`:

```powershell
npm run dev
```

### Git Bash on Windows

```bash
.venv/Scripts/python.exe -m pytest backend/tests/ -v
.venv/Scripts/python.exe scripts/validate_data.py

cd frontend
npx tsc --noEmit
```

Backend development server, from `backend/`:

```bash
../.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

Frontend development server, from `frontend/`:

```bash
npm run dev
```

### Conditional or generated-write commands

- Frontend build, from `frontend/`: `npm run build`.
  Run only after all Next dev processes have stopped, `.next` is not being
  written, dependencies already exist, and Google-font/network requirements
  are satisfied.
- Benchmark, from `backend/`:
  `..\.venv\Scripts\python.exe -m app.benchmark` in PowerShell or
  `../.venv/Scripts/python.exe -m app.benchmark` in Git Bash.
  Do not run by default; it rewrites `results/` and must run alone.
- Teaching generator, from repo root:
  `.venv\Scripts\python.exe scripts\gen_teaching_doc.py`.
  It writes a generated document; do not run by default.
- Contrast checker, from repo root:
  `.venv\Scripts\python.exe scripts\check_contrast.py`.
  It may need network access for Carto styles.

## Safe-edit workflow

1. Run `git status --short` and preserve user changes.
2. Read the relevant schema, implementation, consumer, and tests.
3. Confirm whether the target is hand-authored or generated.
4. Make the smallest scoped patch; do not format unrelated files.
5. Run targeted tests first.
6. Run the full backend suite, validator, and TypeScript check when relevant.
7. Use browser/runtime verification for scroll, keyboard, map, animation,
   offline, font, theme, and responsive claims.
8. Inspect `git diff --check`, `git diff`, and `git status --short`.
9. Do not commit, push, branch, crawl, rebuild, or benchmark unless requested.
10. Never report a command as passed if it was not executed.

## Pre-submission warnings

- `results/` predates the current 2026-07-27 graphs and is explicitly marked
  `SỐ TẠM`.
- Keep every `SỐ TẠM` banner until one coherent final data/validation/benchmark
  refresh has completed and all five banner locations have been synchronized.
- Current profiles are `synthetic`; raw TomTom snapshots exist for 07:30 and
  12:00 only. The remaining slots are 17:30 and 22:00.
- The user will collect all four TomTom time slots before the final data
  decision. Do not run `03b`, rebuild graphs/profiles, or benchmark from the
  current partial snapshot set.
- Eight manual risk `source_url` values are still TODO placeholders.
- Report, slide, video, screenshots, group identity, and submission ZIP remain
  manual deliverables.
- Before every demo or capture, stop old services, restart backend/frontend,
  hard-refresh the browser, and verify `/api/graph?level=demo` reports the
  current on-disk graph (currently 51 nodes and 292 edges).
- Never run `npm run build` while a Next dev server is active.
- Re-run browser checks at 1366x768 or the actual projector resolution.
