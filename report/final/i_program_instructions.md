# i. Program Instructions

## i.1. Installation and Setup Instructions

### i.1.1. Environment requirements

| Component | Version verified |
|---|---|
| OS | Windows 11 + PowerShell |
| Python | 3.14.0 |
| Node.js / npm | 24.14.1 / 11.11.0 |
| Backend | FastAPI 0.140.0, Pydantic 2.13.4 |
| Frontend | Next.js 15.5.22, React 19.2.8, TypeScript 5.9.3 |

Python dependencies are pinned in `backend/requirements.txt`; frontend
dependencies are locked in `frontend/package-lock.json`.

### i.1.2. Install dependencies (run once)

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

### i.1.3. Run the application (two terminals)

**Terminal 1 - backend (FastAPI, port 8000):**

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

**Terminal 2 - frontend (Next.js, port 3000):**

```powershell
Set-Location frontend
npm run dev
```

### i.1.4. Open the app

| What | URL |
|---|---|
| Main GUI | <http://localhost:3000> |
| Benchmark viewer (read-only) | <http://localhost:3000/benchmark> |
| Backend API docs (Swagger) | <http://localhost:8000/docs> |

![Two terminal windows running](../assets/screenshot-01-terminals.png)

---

## i.2. Guidelines for Using the GUI

### i.2.1. Overall layout

The app opens in Vietnamese by default. In the top bar there is a
**language switcher** (globe/languages icon, showing "Tiếng Việt" /
"English") - open it and pick **English**; the whole interface (labels,
buttons, tooltips, toast messages) re-renders in English immediately. Place
names on the map and in the Start/Goal/stop dropdowns are real data, so
they stay in Vietnamese either way.

The main screen then has three areas:

1. **Left panel - Setup:** graph, time slot, objective, problem type,
   start/goal (or stop list), run mode, and algorithm.
2. **Center - Map:** the graph, the timeline player, and the resulting
   route(s). A single run uses one large map; comparing algorithms opens
   one map per algorithm side by side.
3. **Right drawer - Results:** four tabs - **Metrics**, **Explanation**,
   **Compare**, **Experiment**.

![Language switcher open](../assets/screenshot-02-language-switch.png)


![Idle GUI in English](../assets/screenshot-03-idle-ui.png)

### i.2.1.1. `G_demo` vs `G_real`, and why this walkthrough uses `G_demo`

The **Graph** field at the top of the Setup panel switches between the two
datasets the app ships with:

- **`G_demo`** - 51 curated points of interest (40 landmarks, 7 schools,
  3 hospitals, and 1 warehouse) connected by 298 directed edges. Small enough
  that every expanded/frontier node during a search trace stays individually
  readable on screen, which is why it is the graph used for the dropdown
  Start/Goal pickers (§2.2.1 step 5).
- **`G_real`** - the processed OpenStreetMap-derived road network for the
  covered area of HCMC, with 2,118 nodes and 4,699 directed edges. Realistic
  scale, but far too dense to read individual trace steps by eye; endpoints
  are picked by clicking directly on the map instead of a dropdown.

Every remaining example, screenshot, and step-by-step section in this
document uses **`G_demo`**, so the algorithm behavior and the trace stay
legible throughout.

G_real:
![G_real - full-size OSM network](../assets/screenshot-03b-graph-real.png)
G_demo:
![G_demo - teaching graph](../assets/screenshot-03c-graph-demo.png)

### i.2.1.2. Adjusting `G_demo`'s node count

Still on `G_demo`, the **Displayed node count** field in the Setup panel
(default 51, the full teaching graph) shrinks the graph down to a smaller
*connected* subgraph - type any number from 3 to 51 and click **Apply**.
This reloads a smaller `G_demo` subgraph and clears any existing
journey/results; the field is disabled outside `G_demo` (`G_real` always
stays at its full 2,118 nodes). It is handy for projector-scale demos:
shrinking to a small subgraph (e.g. 7-20 nodes) keeps every expanded/
frontier node individually legible even from the back of a room, at the
cost of fewer landmarks to route between.

![G_demo shrunk to 20 nodes](../assets/screenshot-03d-graph-demo-20nodes.png)

*`G_demo` with Displayed node count set to 20*

### i.2.1.3. Display options: Congestion layer and Offline mode

Two switches under **Display** in the Setup panel toggle map overlays only -
neither one changes which route gets computed, only what is drawn on top of
it:

- **Congestion layer** - colors every edge on the map by its congestion
  level (1-5) for the currently selected time slot: green (level 1,
  free-flowing) through yellow/orange up to red (level 5, most congested).
  Useful for visually sanity-checking why the Balanced/Fastest objective
  favored a given route over a shorter-looking alternative.
- **Offline mode** - turns off the MapLibre/Carto basemap tiles (which need
  network access to load) and falls back to drawing only the graph itself
  (nodes + edges) on a blank background. Meant for presenting/demoing
  without a live internet connection; it has no effect on routing or search
  behavior, only on the background rendering.

![Congestion layer and Offline mode both enabled](../assets/screenshot-03e-display-options.png)

*`G_demo` with Congestion layer / Offline mode enabled*

### i.2.1.4. Theme picker

The **palette dropdown** in the top bar (next to the language switcher,
showing a palette icon plus the current theme's name) swaps the color
palette across the entire UI - map, panels, badges, and text. It ships
with 7 themes: **Default** (control-room palette in cyan, violet, and
amber), **White** (bright, clean, neutral), **Black** (deep black with
electric-blue accents), **Pastel pink** (pastel pink with baby blue),
**Lavender** (lavender with berry pink), **Sage & cream**, and **Lemon**
(lemon paired with pale green). This is purely cosmetic - it has no effect
on routing, search behavior, or any number shown on screen.

![Theme picker dropdown open](../assets/screenshot-03f-theme-picker.png)

*Top bar with the palette dropdown open, showing the swatch + name +
description for each of the 7 themes, Default currently selected.*

### i.2.1.5. Benchmark viewer

The **Benchmark** link in the top bar (same row as the language switcher
and theme picker) opens `/benchmark`, a visual overview of the project's 7
official offline experiments (nodes expanded and runtime per algorithm,
congestion/route-change stats, gamma weight sensitivity, ATSP comparison,
...). It only reads the pre-built result files already saved under
`results/` - it never re-runs a benchmark or writes anything, so opening it
has no effect on the rest of the app.

![Benchmark page - charts and gamma sensitivity table](../assets/screenshot-03g-benchmark.png)

*The Benchmark page: nodes-expanded and runtime bar charts per algorithm,
and the gamma weight-sensitivity line chart with its data table below.*

### i.2.2. Two-point search

#### i.2.2.1. Step by step - running a single algorithm

1. **Graph** - pick `G_demo` (small teaching graph, shows the full trace)
   or `G_real` (full-size real network, 2,118 nodes).
2. **Time slot** - one of `07:30`, `12:00`, `17:30`, `22:00`. Each slot has
   a different congestion profile.
3. **Objective** (`Balanced` / `Fastest` / `Shortest`):
   - **Balanced** - travel time plus a penalty for risk factors (flood,
     construction, narrow alley, traffic light).
   - **Fastest** - estimated travel time under the chosen slot's
     congestion, no risk penalty.
   - **Shortest** - raw distance; congestion/risk are shown for context
     only, they do not change the route chosen.
4. **Problem type** - choose **Two points**.
5. **Start / Destination** - the picker depends on which graph is selected:
   - On **G_demo** (51 named nodes), pick Start and Goal from a **dropdown
     list**.
   - On **G_real** (2,118 nodes - too many to list usefully), there is no
     dropdown; instead click **"Pick on map"**, then click two nodes
     directly on the map.
6. **Run mode** - choose **Single run**.
7. **Algorithm** - pick one of the 9 available algorithms
   (`BFS`, `DFS`, `IDDFS`, `UCS`, `A*`, `Greedy Best-First`,
   `Bidirectional Dijkstra`, `IDA*`, `Beam Search`). Beam and IDA\* expose an
   extra numeric field (beam width / epsilon) if you want to override the
   default.
8. Click the run button. Its label follows the pattern **"Run {algorithm}:
   Start → Destination"** (e.g. `"Run A*: Start → Destination"` - the
   button itself always says "Start"/"Destination", it does not print the
   actual place names).

Once it finishes, the map draws the final route and the right drawer opens
automatically.

![Setup panel filled in for the A* example](../assets/screenshot-04-setup-astar.png)

*Left panel with all the fields above filled in for the example: G_demo,
slot 17:30, objective Balanced, problem type Two points, Start = Chợ Bến
Thành, Goal = Dinh Độc Lập, run mode Single run, algorithm A\*. Capture right
before clicking Run, so every dropdown is visible in the same screenshot.*

#### i.2.2.2. Reading a result: Metrics, Explanation, and the timeline

- **Metrics tab** - separates *journey outcome* (distance, time, cost under
  the chosen objective) from *search effort* (nodes expanded, max frontier
  size, runtime in ms). It also shows one of three optimality badges:
  **Optimality guaranteed**, **Additive ε-bound guaranteed** (IDA\* only),
  or **No optimality guarantee - trade-off** (e.g. Greedy, Beam).
- **Timeline** (floating bar under the map) - step back/forward, play/pause,
  drag the slider, change speed. The highlighted node, the frontier, and
  the expanded set on the map all update to match the step currently shown.
- **Explanation tab** - a plain-language write-up of the specific result,
  stacked top to bottom:
  - **Conclusion** - verdict headline plus optimality/gap badges (e.g.
    Exact optimum, Total balanced cost, Gap from exact optimum).
  - **"Why was this route selected?"** (single two-point run only) - pick
    one of up to two post-run reference routes (computed after the fact by
    UCS) from the **Compare with** dropdown, click **Show on map** to draw
    it as a dashed line next to the solid result route, and read a
    side-by-side table (Distance / Congestion-adjusted time / Congestion
    delay / Total risk penalty / Balanced cost - an **Included** badge
    marks the rows that count toward the active objective) plus a one-line
    verdict on how much better or worse the result route is.
  - **"How is the cost broken down?"** - every cost component (distance,
    free-flow time, congestion-adjusted time, congestion delay, risk
    penalty, balanced cost) as a flat list, each tagged **Context only** or
    **Included in the objective**.
  - **"Why does the total cost have this value?"** - the same components
    again, this time as narrative cards (e.g. congestion delay, traffic-light
    penalty) with their added amount and an expandable **Data source** note
    per card. If any segment of the result route has congestion level 4-5
    for the selected time slot, this section also shows a note that those
    segments are drawn in **red on the map** - that red highlight is result
    evidence only, not the algorithm's current timeline position.
  - **"What is the algorithm doing? · Step N/N"** - a one-line plain-language
    explanation of the algorithm's current step (tied to the timeline's
    current step), with expandable technical detail: the node being
    expanded, the exact selection rule, the evidence right before the step,
    and the effect right after it.

![A* result - Metrics tab and timeline](../assets/screenshot-05-astar-metrics.png)

*The A\* result from §2.2.1: right drawer open on the Metrics tab, timeline
mid-playback (a few steps in, so the expanded/frontier nodes are visible on
the map along with the highlighted current node).*

![A* result - Explanation tab](../assets/screenshot-06-astar-explanation.png)

*Same result, right drawer switched to the Explanation tab, map showing the
dashed reference route next to the solid result route after clicking Show
on map: Conclusion, the "Why was this route selected?" panel with the
reference-route dropdown, and the Distance/Time/Delay/Risk/Balanced
comparison table.*

![A* result - Explanation tab, cost breakdown and algorithm step](../assets/screenshot-06b-astar-explanation-cost.png)

*Same result, scrolled further down the Explanation tab: "How is the cost
broken down?", "Why does the total cost have this value?" with per-factor
Data source notes, and "What is the algorithm doing? · Step N/N" with its
expandable technical detail. On the map, the red segment of the result
route marks a congestion level 4-5 stretch for the selected time slot.*

#### i.2.2.3. Step by step - comparing 2 to 4 algorithms

1. Keep the same Start/Goal (or the same stop sequence) you want to compare
   on.
2. In **Run mode**, choose **Compare multiple**.
3. Add between 2 and 4 algorithms to the comparison list (adding a 5th
   requires removing one first).
4. Click the compare button, labeled **"Compare {N} algorithms"** (N =
   however many you picked).

The map splits into N independent panes (one per algorithm - pan/zoom on
one pane never moves the others), and the **Compare** tab shows an N-way
table (Status, Objective-cost rank, the outcome metrics for the active
mode, Nodes expanded, Maximum frontier size, Runtime, Result guarantee),
with the lowest value in each row highlighted. A failed or "no path"
algorithm does not block the others, and can be retried alone.

Below the table, each algorithm has its own **Explanation** button that
switches the drawer to the Explanation tab bound to that one result - with
two differences from a single run's Explanation tab: Compare mode has no
timeline, so the **"What is the algorithm doing?"** section is fixed on
one step instead of scrubbable; and the interactive **"Why was this route
selected?"** reference-route panel (the **Compare with** dropdown plus
**Show on map**) is single-run only and does not appear here.

![4-algorithm comparison - map panes](../assets/screenshot-07-compare-4algo-map.png)

*Compare mode set up with A\*, DFS, BFS, and Greedy Best-First on the same
Chợ Bến Thành → Dinh Độc Lập pair, right after clicking "Compare 4
algorithms": 4 map panes visible side by side.*

![4-algorithm comparison - Compare tab table](../assets/screenshot-08-compare-4algo-table.png)

*Right drawer, Compare tab: the metrics table (Status, Objective-cost rank,
Balanced cost, Distance, Nodes expanded, Maximum frontier size, Runtime,
Result guarantee) plus the per-algorithm Status/Explanation row list below
it.*

### i.2.3. Multi-point journey (ATSP)

#### i.2.3.1. Step by step - running a multi-point journey

Under **Problem type**, choose **Multiple stops**, enter a **Start** (the
depot) and add several **stops** (the deliveries), then pick one of two
strategies:

- **Visit stops in the selected order** - visits the stops in exactly the
  order you added them, using whichever algorithm you picked (§2.2.1).
  Internally this chains one two-point search per leg (Start→stop 1, stop
  1→stop 2, ...) and stitches the legs into one continuous route. Run mode
  **Single run**; the run button follows the pattern **"Run {algorithm} in
  the selected order"**.
- **Optimize visit order with ATSP** - you only choose the stop *set*; the
  backend works out the best *order* to visit them in. Pick one of three
  methods, keep run mode **Single run**, then click the run button, labeled
  **"Optimize with {method}"** (e.g. *"Optimize with Held–Karp"*):
  - **Held–Karp** - exact optimum (guaranteed best order), practical up to
    15 points total.
  - **NN + 2-opt/Or-opt** - fast nearest-neighbour heuristic with local
    improvement.
  - **Simulated Annealing** - heuristic search over 5 fixed random seeds.

Two more controls sit in the Setup panel alongside the stop list:

- **Return to the start after the last stop** (default off, applies to
  either strategy) - when on, adds exactly one closing leg back to Start
  after the last stop (Start does not become a new delivery stop); when
  off, the route is open and ends at the last delivery stop.
- **Show optimization trace** (single-run ATSP strategy only, default off)
  - records the optimizer's step-by-step decisions so they can be replayed
  on the timeline after the run; see §2.3.2 for how to read it. It is not
  available in Compare mode.

Once it finishes, the map draws the optimized multi-leg route and the right
drawer opens automatically, same as a two-point run.

![ATSP setup panel (Held–Karp)](../assets/screenshot-09-atsp-setup.png)

*Setup panel for the ATSP example: Start = Điểm trung chuyển Hàm Nghi, stops
= Nhà thờ Đức Bà, Bitexco Financial Tower, Dinh Độc Lập, Bảo tàng Mỹ thuật
TP.HCM, strategy Optimize visit order with ATSP, method Held–Karp, right
before clicking Run.*

#### i.2.3.2. Reading an ATSP result: Metrics and Explanation

- **Metrics tab** - shows an optimality badge (**guaranteed** for
  Held–Karp, **approximate** for NN + 2-opt/Or-opt and Simulated Annealing),
  a before/after comparison (cost of the order as typed in vs the optimized
  order) with the percentage saved, and the full optimized visiting order as
  a numbered list (Start → stop 1 → stop 2 → ...). If **Show optimization
  trace** was on before running, it also shows an **"Optimization process"**
  card: play it on the timeline to step through the optimizer's own
  decisions (e.g. a Held–Karp DP subset update, an NN nearest-neighbour
  pick, an SA accepted/rejected move), with the order/subset being
  considered at that step and an expandable technical detail (sampling
  policy, raw event JSON). While playing, the map draws that candidate
  order as a **dashed** line - a visualization of the search, not the
  actual delivery route - until the final step, where it switches to the
  real legs.
- **Explanation tab** - a plain-language write-up, stacked top to bottom:
  **Conclusion** (verdict plus optimality/gap badges), **Entered order and
  result** (user-entered order vs. optimizer result order, side by side),
  a cost/savings **summary**, a **cost breakdown** (same Context
  only / Included in the objective rows as a two-point run), **directed
  cost matrix** evidence (asymmetric-pair example, matrix/optimizer
  runtime), and **method-specific statistics**: DP states solved for
  Held–Karp, candidate/accepted-move counts for NN + 2-opt/Or-opt, and
  per-seed best-cost/accepted-move counts for Simulated Annealing.

![ATSP result - Metrics tab and optimized route](../assets/screenshot-10-atsp-result.png)

*Result from §2.3.1: map showing the optimized multi-stop route (all legs),
right drawer Metrics tab showing the optimized order and the % saved versus
the order typed in.*

![ATSP result - Explanation tab](../assets/screenshot-10b-atsp-explanation.png)

*Same result, right drawer switched to the Explanation tab, showing the
plain-language verdict and Held–Karp's DP search statistics.*

#### i.2.3.3. Step by step - comparing 2 to 3 ATSP methods

1. Same Start + stops as §2.3.1.
2. Run mode: **Compare multiple**.
3. Select 2 or 3 methods (e.g. Held–Karp, NN + 2-opt/Or-opt, Simulated
   Annealing).
4. Click the compare button, labeled **"Compare {N} ATSP methods"**.

Just like the two-point comparison, this opens N independent map panes (one
per method). The **Compare** tab shows a **Baseline: entered order** card
first (the order as typed, not an ATSP method - it does not get its own
map), then an N-way table (Status, Objective-cost rank, Stops/legs,
Optimized visit order, the outcome metrics for the active mode, matrix-build
effort, optimizer/backend runtime, savings vs. the entered-order baseline,
and - only when Held–Karp is one of the methods and succeeds - the exact
gap from Held–Karp), with the lowest value in each row highlighted. Below
the table, each method has its own **Explanation** button (§2.3.2), except
Compare mode never records an optimization trace, so its "Optimization
process" card is not available here.

![3-method ATSP comparison - map panes](../assets/screenshot-11-atsp-compare-map.png)

*All 3 ATSP methods compared on the same depot + 4 stops as §2.3.1: 3 map
panes side by side.*

![3-method ATSP comparison - Compare tab table](../assets/screenshot-12-atsp-compare-table.png)

*Right drawer, Compare tab: the Baseline: entered order card, the
Held–Karp/NN+2-opt/SA comparison table (cost, distance, matrix/optimizer
effort, savings, gap from exact Held–Karp, guarantee, method-specific
details), and the per-method Status/Explanation row list below it.*

### i.2.4. Scenario sandbox ("Experiment" tab)

Editing is only available in **Single run** mode, for either problem type
(Two points or Multiple stops):

1. Enable edge-edit mode, then click two nodes on the map **in sequence -
   from, then to.**
2. In the **Experiment** tab, either pick **Quick presets** (e.g. "add a
   flood") or manually edit length, free speed, per-slot congestion, or
   risk flags under **Detailed editing**.
3. The tab shows a side-by-side **Original / Experimental** comparison of
   the edge's cost.
4. Run (or re-run) the algorithm - the new run now uses the edited edge;
   nothing on disk is changed, and only this browser session sees the edit.

**Why two clicks, not one.** The graph is directed, so the two travel
directions between the same pair of nodes are two separate edges - often
with different names and lengths (e.g. one direction is "Nam Kỳ Khởi
Nghĩa", the reverse between the same two nodes is "Pasteur") - and they can
render on the exact same screen line. A single click on that line could
never reliably tell the two directions apart, so edge-edit mode picks
edges by two node clicks instead: click the **from** node, then the **to**
node, in the direction your route actually travels. If only the reverse
direction exists between those two nodes, the app tells you so and lets
you click again in the other order, instead of silently editing an edge
your route never uses.

The edit itself is not tied to a run mode - it is stored the moment you
apply it, before you click any run/compare button. So editing an edge in
**Single run** mode and then switching **Run mode** to **Compare multiple**
still works: the edit carries over, and clicking **Compare** runs every
selected algorithm/method against that same edited scenario. The only
restriction is where the edit can be *made*: the edge-edit entry point
itself is hidden while **Compare multiple** is selected, so a new edit (or
a change to an existing one) can only be created back in **Single run**
mode; Compare mode can apply an edit already made, but not create one.

![Experiment tab - Original/Experimental comparison](../assets/screenshot-13-experiment-tab.png)

*Single run mode, same Chợ Bến Thành → Dinh Độc Lập pair and 17:30 slot as
§2.2.1, with the "Pasteur" segment on that route set to 2× distance. The
route switched to a different path, since the old path's cost is now
higher.*

---

## i.3. Example Inputs and Outputs

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

### i.3.1. Single algorithm run - A*

- **Input:** Start = Chợ Bến Thành, Goal = Dinh Độc Lập, algorithm = A*,
  mode = Balanced, slot = 17:30.
- **Output:** a found route drawn on the map (solid line), a step-by-step
  trace replayable on the timeline (expanded node, frontier, and the g/h/f
  values used at each step), and in the Metrics tab: total cost, distance,
  travel time, nodes expanded, runtime, and an **Optimality guaranteed**
  badge (A* with an admissible heuristic always finds the optimal route on
  this graph).

See §2.2.1–§2.2.2 above for the matching screenshots.

### i.3.2. Single ATSP method run - Held–Karp

- **Input:** Start (depot) = Điểm trung chuyển Hàm Nghi, stops = Nhà thờ
  Đức Bà, Bitexco Financial Tower, Dinh Độc Lập, Bảo tàng Mỹ thuật TP.HCM
  (4 stops + depot = 5 points), method = Held–Karp, mode = Balanced,
  slot = 17:30.
- **Output:** the exact optimal visiting order (guaranteed, since 5 points
  is well within Held–Karp's exact-solution range), the full multi-leg
  route on the map, and - in the Metrics tab - the total cost of the
  optimized order versus the cost of the order as typed in, with the
  percentage saved.

See §2.3.1–§2.3.2 above for the matching screenshots.

### i.3.3. Comparison - two-point (A* vs DFS vs BFS vs Greedy Best-First)

- **Input:** same pair as §3.1 (Chợ Bến Thành → Dinh Độc Lập), 4 algorithms
  selected: A*, DFS, BFS, Greedy Best-First.
- **Output:** 4 map panes (one route per algorithm) and one N-way table.

See §2.2.3 above for the matching screenshots.

### i.3.4. Comparison - multi-point (Held–Karp vs NN+2-opt vs Simulated Annealing)

- **Input:** same depot + 4 stops as §3.2, 3 ATSP methods selected:
  Held–Karp, NN + 2-opt/Or-opt, Simulated Annealing.
- **Output:** 3 map panes (one visiting order per method) and one 3-way
  table with total cost, % saved versus the typed-in order, and (for
  Held–Karp) the exact-optimal reference used to judge the other two.

See §2.3.3 above for the matching screenshots.
