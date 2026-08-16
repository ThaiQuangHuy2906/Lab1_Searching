# Program Instructions

*Skeleton for the report section "Program Instructions" — installation,
GUI guidelines, example inputs/outputs, and a screenshot checklist. Every
image below already has its `![...](../assets/screenshot-NN-....png)` link
wired in — save each screenshot into `report/assets/` under the exact
filename shown in the caption underneath it, and it will render here
automatically (no further editing needed). All examples reuse the same two
landmarks / the same depot + stops, so the whole section reads as one
consistent walkthrough instead of jumping between random algorithms.*

*The app is bilingual (Vietnamese/English), default language is
**Vietnamese**. This skeleton assumes the language toggle has been switched
to **English** first (see §2.1), so every UI label quoted below is the
English one. One thing does **not** translate: place names picked from the
graph (e.g. "Chợ Bến Thành", "Dinh Độc Lập") are real data, not UI text, so
they stay in Vietnamese even in English mode — that is expected, not a bug.*

---

## 1. Installation and Setup Instructions

### 1.1. Environment requirements

| Component | Version verified |
|---|---|
| OS | Windows 11 + PowerShell |
| Python | 3.14.0 |
| Node.js / npm | 24.14.1 / 11.11.0 |
| Backend | FastAPI 0.140.0, Pydantic 2.13.4 |
| Frontend | Next.js 15.5.22, React 19.2.8, TypeScript 5.9.3 |

Python dependencies are pinned in `backend/requirements.txt`; frontend
dependencies are locked in `frontend/package-lock.json`.

### 1.2. Install dependencies (run once)

From the repository root, in PowerShell:

```powershell
# 1) Create a Python virtual environment and install backend dependencies
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# 2) Install frontend dependencies
Set-Location frontend
npm ci
Set-Location ..
```

No API key or network access is required to run the demo: the graph and
traffic data the app uses are already pre-built and committed under `data/`.

### 1.3. Run the application (two terminals)

**Terminal 1 — backend (FastAPI, port 8000):**

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

**Terminal 2 — frontend (Next.js, port 3000):**

```powershell
Set-Location frontend
npm run dev
```

### 1.4. Open the app

| What | URL |
|---|---|
| Main GUI | <http://localhost:3000> |
| Benchmark viewer (read-only) | <http://localhost:3000/benchmark> |
| Backend API docs (Swagger) | <http://localhost:8000/docs> |

![Two terminal windows running](../assets/screenshot-01-terminals.png)

*Two terminal windows side by side, both running without errors: backend
showing "Uvicorn running on http://127.0.0.1:8000" and frontend showing
"Ready" / the localhost:3000 URL.*

---

## 2. Guidelines for Using the GUI

### 2.1. Overall layout, and switching the language to English

The app opens in Vietnamese by default. In the top bar there is a
**language switcher** (globe/languages icon, showing "Tiếng Việt" /
"English") — open it and pick **English**; the whole interface (labels,
buttons, tooltips, toast messages) re-renders in English immediately. Place
names on the map and in the Start/Goal/stop dropdowns are real data, so
they stay in Vietnamese either way.

The main screen then has three areas:

1. **Left panel — Setup:** graph, time slot, objective, problem type,
   start/goal (or stop list), run mode, and algorithm.
2. **Center — Map:** the graph, the timeline player, and the resulting
   route(s). A single run uses one large map; comparing algorithms opens
   one map per algorithm side by side.
3. **Right drawer — Results:** four tabs — **Metrics**, **Explanation**,
   **Compare**, **Experiment**.

![Language switcher open](../assets/screenshot-02-language-switch.png)

*Top bar with the language switcher open, showing both "English" and
"Tiếng Việt" options, language already set to English.*

![Idle GUI in English](../assets/screenshot-03-idle-ui.png)

*Full browser window with nothing run yet (English UI), showing the three
areas: left setup panel, empty map in the middle, and the closed/idle right
drawer.*

### 2.2. Step by step — running a single two-point search

1. **Graph** — pick `G_demo` (small teaching graph, shows the full trace)
   or `G_real` (full-size real network, ~2,100 nodes).
2. **Time slot** — one of `07:30`, `12:00`, `17:30`, `22:00`. Each slot has
   a different congestion profile.
3. **Objective** (`Balanced` / `Fastest` / `Shortest`):
   - **Balanced** — travel time plus a penalty for risk factors (flood,
     construction, narrow alley, traffic light).
   - **Fastest** — estimated travel time under the chosen slot's
     congestion, no risk penalty.
   - **Shortest** — raw distance; congestion/risk are shown for context
     only, they do not change the route chosen.
4. **Problem type** — choose **Two points**.
5. **Start / Goal** — the picker depends on which graph is selected:
   - On **G_demo** (51 named nodes), pick Start and Goal from a **dropdown
     list**.
   - On **G_real** (~2,100 nodes — too many to list usefully), there is no
     dropdown; instead click **"Pick on map"**, then click two nodes
     directly on the map.
6. **Run mode** — choose **Single run**.
7. **Algorithm** — pick one of the 9 available algorithms
   (`BFS`, `DFS`, `IDDFS`, `UCS`, `A*`, `Greedy Best-First`,
   `Bidirectional Dijkstra`, `IDA*`, `Beam Search`). Beam and IDA* expose an
   extra numeric field (beam width / epsilon) if you want to override the
   default.
8. Click the run button. Its label follows the pattern **"Run {algorithm}:
   Start → Destination"** (e.g. *"Run A*: Start → Destination"* — the
   button itself always says "Start"/"Destination", it does not print the
   actual place names).

Once it finishes, the map draws the final route and the right drawer opens
automatically.

![Setup panel filled in for the A* example](../assets/screenshot-04-setup-astar.png)

*Left panel with all the fields above filled in for the example: G_demo,
slot 17:30, objective Balanced, problem type Two points, Start = Chợ Bến
Thành, Goal = Dinh Độc Lập, run mode Single run, algorithm A*. Capture right
before clicking Run, so every dropdown is visible in the same screenshot.*

### 2.3. Reading a result: Metrics, Explanation, and the timeline

- **Metrics tab** — separates *journey outcome* (distance, time, cost under
  the chosen objective) from *search effort* (nodes expanded, max frontier
  size, runtime in ms). It also shows one of three optimality badges:
  **Optimality guaranteed**, **Additive ε-bound guaranteed** (IDA* only),
  or **No optimality guarantee — trade-off** (e.g. Greedy, Beam).
- **Timeline** (floating bar under the map) — step back/forward, play/pause,
  drag the slider, change speed. The highlighted node, the frontier, and
  the expanded set on the map all update to match the step currently shown.
- **Explanation tab** — a plain-language write-up of the specific result on
  screen: whether a route was found, the cost breakdown (free-flow time,
  congestion delay, risk penalties), which factors actually affected the
  objective, and — for a single two-point run — up to two reference routes
  (computed after the fact by UCS) to show how far the chosen algorithm's
  route is from optimal.

![A* result — Metrics tab and timeline](../assets/screenshot-05-astar-metrics.png)

*The A* result from §2.2: right drawer open on the Metrics tab, timeline
mid-playback (a few steps in, so the expanded/frontier nodes are visible on
the map along with the highlighted current node).*

![A* result — Explanation tab](../assets/screenshot-06-astar-explanation.png)

*Same result, right drawer switched to the Explanation tab, showing the
cost breakdown and (if available) a dashed reference route toggled on over
the map.*

### 2.4. Step by step — comparing 2 to 4 algorithms (two-point)

1. Keep the same Start/Goal (or the same stop sequence) you want to compare
   on.
2. In **Run mode**, choose **Compare multiple**.
3. Add between 2 and 4 algorithms to the comparison list (adding a 5th
   requires removing one first).
4. Click the compare button, labeled **"Compare {N} algorithms"** (N =
   however many you picked).

The map splits into N independent panes (one per algorithm — pan/zoom on
one pane never moves the others), and the **Compare** tab shows an N-way
table: every metric row, with the best value highlighted per row. A failed
or "no path" algorithm does not block the others, and can be retried alone.

![4-algorithm comparison — map panes](../assets/screenshot-07-compare-4algo-map.png)

*Compare mode set up with A*, UCS, Greedy Best-First, and BFS on the same
Chợ Bến Thành → Dinh Độc Lập pair, right after clicking "Compare 4
algorithms": 4 map panes visible side by side.*

![4-algorithm comparison — Compare tab table](../assets/screenshot-08-compare-4algo-table.png)

*Right drawer, Compare tab, showing the 4-column metrics table for the same
run (cost, distance, nodes expanded, runtime, and the optimality badge per
algorithm).*

### 2.5. Step by step — a multi-point journey

Under **Problem type**, choose **Multiple stops**, enter a **Start** and add
several **stops**, then pick one of two strategies:

- **Visit stops in the selected order** — visits the stops in exactly the
  order you added them. Internally this chains one two-point search per leg
  (Start→stop 1, stop 1→stop 2, ...) using whichever algorithm you picked,
  and stitches the legs into one continuous route.
- **Optimize visit order with ATSP** — you only choose the stop *set*; the
  backend works out the best *order* to visit them in, using one of three
  methods:
  - **Held–Karp** — exact optimum (guaranteed best order), practical up to
    15 points total.
  - **NN + 2-opt/Or-opt** — fast nearest-neighbour heuristic with local
    improvement.
  - **Simulated Annealing** — heuristic search over 5 fixed random seeds.

### 2.6. Step by step — running one ATSP method

1. Problem type: **Multiple stops**, strategy: **Optimize visit order with
   ATSP**.
2. Enter a **Start** (the depot) and add 3–5 **stops** (the deliveries).
3. Run mode: **Single run**.
4. Pick a method, e.g. **Held–Karp**.
5. Click the run button, labeled **"Optimize with Held–Karp"**.

The result shows the optimized visiting order, the route split into legs on
the map, and — compared against the order you originally typed the stops
in — the percentage saved by reordering them.

![ATSP setup panel (Held–Karp)](../assets/screenshot-09-atsp-setup.png)

*Setup panel for the ATSP example: Start = Điểm trung chuyển Hàm Nghi, stops
= Nhà thờ Đức Bà, Bitexco Financial Tower, Dinh Độc Lập, Bảo tàng Mỹ thuật
TP.HCM, strategy Optimize visit order with ATSP, method Held–Karp, right
before clicking Run.*

![ATSP result — optimized route](../assets/screenshot-10-atsp-result.png)

*Result: map showing the optimized multi-stop route (all legs), right
drawer Metrics tab showing the optimized order and the % saved versus the
order typed in.*

### 2.7. Step by step — comparing 2 to 3 ATSP methods

1. Same Start + stops as §2.6.
2. Run mode: **Compare multiple**.
3. Select 2 or 3 methods (e.g. Held–Karp, NN + 2-opt/Or-opt, Simulated
   Annealing).
4. Click the compare button, labeled **"Compare {N} ATSP methods"**.

Just like the two-point comparison, this opens N independent map panes (one
per method) plus an N-way table in the **Compare** tab. Because the same
depot/stops/objective/slot are frozen for every method, the comparison is
apples-to-apples; the order-as-typed baseline appears once in the table
only, it does not get its own map.

![3-method ATSP comparison — map panes](../assets/screenshot-11-atsp-compare-map.png)

*All 3 ATSP methods compared on the same depot + 4 stops as §2.6: 3 map
panes side by side, each showing a different visiting order/route shape.*

![3-method ATSP comparison — Compare tab table](../assets/screenshot-12-atsp-compare-table.png)

*Right drawer, Compare tab: 3-column table (Held–Karp vs NN+2-opt vs SA)
with total cost and % saved per method.*

### 2.8. Step by step — the scenario sandbox ("Experiment" tab)

1. Enable edge-edit mode, then click one edge on the map.
2. In the **Experiment** tab, either pick **Quick presets** (e.g. "add a
   flood") or manually edit length, free speed, per-slot congestion, or
   risk flags under **Detailed editing**.
3. The tab shows a side-by-side **Original / Experimental** comparison of
   the edge's cost.
4. Run (or re-run) the algorithm — the new run now uses the edited edge;
   nothing on disk is changed, and only this browser session sees the edit.

![Experiment tab — Original/Experimental comparison](../assets/screenshot-13-experiment-tab.png)

*Experiment tab open with one edge selected, showing the
Original/Experimental comparison table after applying an edit (e.g. added
congestion or a flood flag).*

---

## 3. Example Inputs and Outputs

All four examples below reuse the same two landmarks (for the two-point
cases) or the same depot + stop list (for the multi-point cases), so a
reader can follow one thread through the whole section. Landmark names stay
in Vietnamese even with the UI in English (see the note at the top of this
document).

- **Two-point pair:** Start = **Chợ Bến Thành**, Goal = **Dinh Độc Lập**
  (Ben Thanh Market → Independence Palace).
- **Multi-point set:** Start = **Điểm trung chuyển Hàm Nghi**, stops =
  **Nhà thờ Đức Bà**, **Bitexco Financial Tower**, **Dinh Độc Lập**,
  **Bảo tàng Mỹ thuật TP.HCM**.
- **Common settings:** graph `G_demo`, time slot `17:30`, objective
  `Balanced`.

### 3.1. Single algorithm run — A*

- **Input:** Start = Chợ Bến Thành, Goal = Dinh Độc Lập, algorithm = A*,
  mode = Balanced, slot = 17:30.
- **Output:** a found route drawn on the map (solid line), a step-by-step
  trace replayable on the timeline (expanded node, frontier, and the g/h/f
  values used at each step), and in the Metrics tab: total cost, distance,
  travel time, nodes expanded, runtime, and an **Optimality guaranteed**
  badge (A* with an admissible heuristic always finds the optimal route on
  this graph).
- **How to read it:** use the timeline to see A* expand fewer nodes toward
  the goal than an uninformed search like BFS/UCS would, because its
  heuristic (straight-line distance to the goal) steers it in the right
  direction. Open the Explanation tab for a plain-language version of the
  same reasoning.

See §2.2–§2.3 above for the matching screenshots.

### 3.2. Single ATSP method run — Held–Karp

- **Input:** Start (depot) = Điểm trung chuyển Hàm Nghi, stops = Nhà thờ
  Đức Bà, Bitexco Financial Tower, Dinh Độc Lập, Bảo tàng Mỹ thuật TP.HCM
  (4 stops + depot = 5 points), method = Held–Karp, mode = Balanced,
  slot = 07:30.
- **Output:** the exact optimal visiting order (guaranteed, since 5 points
  is well within Held–Karp's exact-solution range), the full multi-leg
  route on the map, and — in the Metrics tab — the total cost of the
  optimized order versus the cost of the order as typed in, with the
  percentage saved.
- **How to read it:** because the road network is directed (one-way
  streets), the cost from A to B is not always the same as B to A — this is
  why the visiting order matters and why a plain "shortest path per leg" is
  not enough; the whole tour has to be optimized together.

See §2.6 above for the matching screenshots.

### 3.3. Comparison — two-point (A* vs UCS vs Greedy Best-First vs BFS)

- **Input:** same pair as §3.1 (Chợ Bến Thành → Dinh Độc Lập), 4 algorithms
  selected: A*, UCS, Greedy Best-First, BFS.
- **Output:** 4 map panes (one route per algorithm) and one N-way table.
- **How to read it:** A* and UCS should land on the *same* optimal cost
  (both guarantee optimality on non-negative weights) but A* typically
  expands noticeably fewer nodes, since its heuristic focuses the search
  toward the goal while UCS expands outward in all directions. Greedy
  usually finds *a* route fast (few nodes expanded) but its cost is not
  guaranteed to be optimal — it can end up worse than A*/UCS. BFS, which
  ignores edge weights entirely, is expected to produce the worst cost of
  the four (fewest hops, not shortest real-world distance/time).

See §2.4 above for the matching screenshots.

### 3.4. Comparison — multi-point (Held–Karp vs NN+2-opt vs Simulated Annealing)

- **Input:** same depot + 4 stops as §3.2, 3 ATSP methods selected:
  Held–Karp, NN + 2-opt/Or-opt, Simulated Annealing.
- **Output:** 3 map panes (one visiting order per method) and one 3-way
  table with total cost, % saved versus the typed-in order, and (for
  Held–Karp) the exact-optimal reference used to judge the other two.
- **How to read it:** with only 5 points, NN+2-opt and Simulated Annealing
  should both land on — or very close to — the same optimal order Held–Karp
  finds exactly; the gap between them becomes far more visible on larger
  stop lists where Held–Karp is no longer usable (its cost grows
  exponentially with the number of points).

See §2.7 above for the matching screenshots.

---

## 4. Screenshots of the System

Checklist of every screenshot referenced above, in the order to take them.
Restart both the backend and frontend and hard-refresh the browser before
starting, so the graph is guaranteed to be the current one (G_demo = 51
nodes / 298 edges), and switch the language to English first (§2.1).

| # | What it shows | Save as (`report/assets/...`) | Where it's used |
|---|---|---|---|
| 1 | Both terminals running (backend + frontend), no errors | `screenshot-01-terminals.png` | §1.4 |
| 2 | Language switcher open, English selected | `screenshot-02-language-switch.png` | §2.1 |
| 3 | Idle GUI in English: empty map, closed/idle result drawer | `screenshot-03-idle-ui.png` | §2.1 |
| 4 | Setup panel filled in for A*, before clicking Run | `screenshot-04-setup-astar.png` | §2.2, §3.1 |
| 5 | A* result — Metrics tab + timeline mid-playback | `screenshot-05-astar-metrics.png` | §2.3, §3.1 |
| 6 | A* result — Explanation tab + reference route overlay | `screenshot-06-astar-explanation.png` | §2.3, §3.1 |
| 7 | 4-algorithm comparison — 4 map panes | `screenshot-07-compare-4algo-map.png` | §2.4, §3.3 |
| 8 | 4-algorithm comparison — Compare tab table | `screenshot-08-compare-4algo-table.png` | §2.4, §3.3 |
| 9 | ATSP setup panel (Held–Karp), before clicking Run | `screenshot-09-atsp-setup.png` | §2.6, §3.2 |
| 10 | ATSP result — optimized route + % saved | `screenshot-10-atsp-result.png` | §2.6, §3.2 |
| 11 | 3-method ATSP comparison — 3 map panes | `screenshot-11-atsp-compare-map.png` | §2.7, §3.4 |
| 12 | 3-method ATSP comparison — Compare tab table | `screenshot-12-atsp-compare-table.png` | §2.7, §3.4 |
| 13 | Experiment (scenario) tab — Original/Experimental comparison | `screenshot-13-experiment-tab.png` | §2.8 |

Optional extras worth adding if there's room in the report (not required by
the walkthrough above, but useful to show breadth):

- One of the app's other color themes (it ships with 7: default, light,
  dark, pink, lavender, sage, lemon), same result, for contrast.
- `G_real` (full-size graph) with the same two landmarks, for contrast with
  `G_demo`.
- The graph-view slider shrunk down to a small teaching subgraph (e.g. 7
  nodes) to show a fully legible trace on a projector.
- The `/benchmark` page (read-only viewer).
- A responsive/mobile layout screenshot.
- The Vietnamese UI (before switching to English), for contrast — since the
  app defaults to Vietnamese.
