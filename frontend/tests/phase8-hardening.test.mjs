import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function frontendSources(path = new URL("../", import.meta.url)) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".next", "tests"].includes(entry.name)) return [];
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, path);
    if (entry.isDirectory()) return frontendSources(child);
    if (!statSync(child).isFile() || !/\.(ts|tsx|mjs)$/.test(entry.name)) return [];
    return [[child.pathname, readFileSync(child, "utf8")]];
  });
}

test("control disclosures expose expanded state and their controlled content", () => {
  const source = read("../components/control-panel.tsx");
  assert.match(source, /const contentId = React\.useId\(\)/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=\{contentId\}/);
  assert.match(source, /id=\{contentId\}/);
});

test("single-run backend errors persist in the drawer and remain retryable", () => {
  const store = read("../lib/store.ts");
  const metrics = read("../components/drawer/metrics-tab.tsx");
  assert.match(store, /singleRunError: \{ kind: "route" \| "atsp"; message: string \} \| null/);
  assert.match(store, /singleRunError: \{ kind: "route", message \}/);
  assert.match(store, /singleRunError: \{ kind: "atsp", message \}/);
  assert.match(metrics, /role="alert" aria-live="assertive"/);
  assert.match(metrics, /<RefreshCw \/> Chạy lại/);
});

test("reduced-motion removes indefinite loaders and programmatic camera flights", () => {
  const canvas = read("../components/route-map-canvas.tsx");
  const skeleton = read("../components/ui/skeleton.tsx");
  const button = read("../components/ui/button.tsx");
  assert.match(canvas, /transitionDuration: reducedMotion \? 0 : 250/);
  assert.match(canvas, /transitionDuration: reducedMotion \? 0 : 500/);
  assert.match(canvas, /motion-reduce:animate-none/);
  assert.match(skeleton, /motion-reduce:animate-none/);
  assert.match(button, /motion-reduce:active:scale-100/);
});

test("comparison map panes are memoized and announce item progress", () => {
  for (const path of [
    "../components/comparison/route-comparison-workspace.tsx",
    "../components/comparison/atsp-comparison-workspace.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /React\.memo\(function/);
    assert.match(source, /aria-live="polite"/);
    assert.match(source, /aria-busy=\{status === "running" \|\| undefined\}/);
  }
});

test("frontend ships without debug statements or the removed scalar comparison path", () => {
  for (const [path, source] of frontendSources()) {
    assert.doesNotMatch(source, /console\.(?:log|debug)\s*\(/, path);
    assert.doesNotMatch(source, /\bdebugger\b/, path);
    assert.doesNotMatch(source, /comparison_pending|compareAlgorithm|algorithmB/, path);
  }
});
