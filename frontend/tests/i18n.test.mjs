import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

import {
  DEFAULT_LANGUAGE,
  isLanguage,
  translateUiText,
} from "../lib/i18n.ts";
import { referenceTradeoffConclusion } from "../lib/reference-route-presentation.ts";

const VIETNAMESE_SPECIFIC = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵÀÁẢÃẠÈÉẺẼẸÌÍỈĨỊÒÓỎÕỌÙÚỦŨỤỲÝỶỸỴ]|[\u1EA0-\u1EF9]/u;
const I18N_MODULES = new Set([
  "i18n.ts",
  "i18n-curated.ts",
  "i18n-dynamic.ts",
  "i18n-messages.ts",
  "i18n-vietnamese.ts",
]);

function readGraph(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

const graphs = [
  readGraph("../../data/graph_demo.json"),
  readGraph("../../data/graph_real.json"),
];

const properNames = new Set(
  graphs.flatMap((graph) => [
    ...graph.nodes.map((node) => node.name),
    ...graph.edges.map((edge) => edge.name),
  ]).filter((name) => typeof name === "string" && name.trim() !== ""),
);

const allowedVietnamese = [...properNames, "Tiếng Việt"]
  .sort((left, right) => right.length - left.length);

function stripAllowedVietnamese(value) {
  let stripped = value;
  for (const allowed of allowedVietnamese) stripped = stripped.replaceAll(allowed, "");
  return stripped;
}

function sourceFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, root);
    if (entry.isDirectory()) return sourceFiles(child);
    if (!/\.tsx?$/.test(entry.name) || I18N_MODULES.has(entry.name)) return [];
    return [child];
  });
}

function representativeTemplateValue(expression) {
  if (
    ts.isStringLiteral(expression)
    || ts.isNoSubstitutionTemplateLiteral(expression)
    || ts.isNumericLiteral(expression)
  ) return expression.text;
  if (ts.isConditionalExpression(expression)) {
    return representativeTemplateValue(expression.whenTrue);
  }
  if (ts.isTemplateExpression(expression)) {
    return representativeTemplate(expression);
  }
  return "2";
}

function representativeTemplate(node) {
  return node.head.text + node.templateSpans.map((span) => (
    `${representativeTemplateValue(span.expression)}${span.literal.text}`
  )).join("");
}

function hasTemplateExpressionAncestor(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isTemplateExpression(parent)) return true;
    if (ts.isStatement(parent) || ts.isSourceFile(parent)) return false;
  }
  return false;
}

function vietnameseSourceMessages() {
  const roots = ["../app/", "../components/", "../lib/"]
    .map((path) => new URL(path, import.meta.url));
  const messages = [];

  for (const url of roots.flatMap(sourceFiles)) {
    const source = readFileSync(url, "utf8");
    const sourceFile = ts.createSourceFile(
      url.pathname,
      source,
      ts.ScriptTarget.Latest,
      true,
      url.pathname.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node) => {
      let message;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        message = node.text;
      } else if (
        ts.isTemplateExpression(node)
        && !ts.isBinaryExpression(node.parent)
        && !hasTemplateExpressionAncestor(node)
      ) {
        message = representativeTemplate(node);
      } else if (ts.isJsxText(node)) {
        message = node.getText(sourceFile).replace(/\s+/g, " ").trim();
      }
      if (message && VIETNAMESE_SPECIFIC.test(message)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        messages.push({
          message,
          location: `${url.pathname}:${position.line + 1}`,
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return messages;
}

test("language contract keeps Vietnamese as the compatibility default", () => {
  assert.equal(DEFAULT_LANGUAGE, "vi");
  assert.equal(isLanguage("vi"), true);
  assert.equal(isLanguage("en"), true);
  assert.equal(isLanguage("fr"), false);
  assert.equal(isLanguage(null), false);
});

test("English localization preserves dynamic values and surrounding whitespace", () => {
  assert.equal(translateUiText("Thiết lập", "en"), "Setup");
  assert.equal(translateUiText("  Bước 4/12  ", "en"), "  Step 4/12  ");
  assert.equal(
    translateUiText("Tổng quãng đường: 1,25 km", "en"),
    "Total distance: 1,25 km",
  );
  assert.equal(translateUiText("Chợ Bến Thành", "en"), "Chợ Bến Thành");
});

test("key graph-search and ATSP terminology is semantically explicit", () => {
  assert.equal(translateUiText("Dijkstra hai chiều", "en"), "Bidirectional Dijkstra");
  assert.equal(translateUiText("Điểm giao", "en"), "Delivery stop");
  assert.equal(translateUiText("Điểm giao", "vi"), "Điểm giao hàng");
  assert.equal(translateUiText("Tối ưu chính xác (exact)", "en"), "Exact optimum");
  assert.equal(translateUiText("Tối ưu chính xác (exact)", "vi"), "Tối ưu chính xác");
  assert.equal(translateUiText("Chi phí cân bằng", "en"), "Balanced cost");
  assert.equal(translateUiText("Bảo đảm trong biên ε", "en"), "Additive ε-bound guaranteed");
});

test("English localization covers dynamic controls, evidence, and backend errors", () => {
  assert.equal(
    translateUiText("Chuyển Chợ Bến Thành lên", "en"),
    "Move Chợ Bến Thành up",
  );
  assert.equal(
    translateUiText("Xóa điểm giao Chợ Bến Thành ở vị trí 2", "en"),
    "Remove delivery stop Chợ Bến Thành at position 2",
  );
  assert.equal(
    translateUiText(
      "Đã quét 3 cạnh; thêm 1 node; cải thiện 2 node; frontier sau bước có 4 node.",
      "en",
    ),
    "Scanned 3 edges; added 1 node; improved 2 nodes; the frontier contains 4 nodes after this step.",
  );
  assert.equal(
    translateUiText("Lỗi HTTP 503 từ backend.", "en"),
    "Backend HTTP error 503.",
  );
  assert.equal(
    translateUiText("Đã chọn điểm Đi và 1 điểm giao hàng.", "en"),
    "Selected Start and 1 delivery stop.",
  );
  assert.equal(
    translateUiText("Đã chọn điểm Đi và 2 điểm giao hàng.", "en"),
    "Selected Start and 2 delivery stops.",
  );
  assert.equal(
    translateUiText("0 đoạn đang điều chỉnh", "en"),
    "0 road segments being edited",
  );
  assert.equal(
    translateUiText("Thu gọn panel thử nghiệm", "en"),
    "Collapse the experiment panel",
  );
});

test("reference-route conclusions retain the precise post-run optimality meaning", () => {
  const reference = {
    reference_minus_selected_cost: 120,
    reference_minus_selected_distance_m: -500,
    reference_minus_selected_balanced_cost_s: 120,
    relation_to_selected: "worse",
  };
  const source = referenceTradeoffConclusion(
    "astar",
    "balanced",
    "exact",
    reference,
  );
  const english = translateUiText(source, "en");

  assert.match(english, /^The reference route is 0,50 km shorter/);
  assert.match(english, /balanced cost is 2 min higher/);
  assert.match(english, /A\* guarantees optimality for the active objective in this snapshot\.$/);
  assert.doesNotMatch(stripAllowedVietnamese(english), VIETNAMESE_SPECIFIC);

  assert.equal(
    translateUiText(
      "Tuyến kết quả có chi phí cân bằng thấp hơn tuyến tham chiếu 2,8 phút. A* có bảo đảm tối ưu theo tiêu chí hiện tại trong snapshot này.",
      "en",
    ),
    "The result route has 2,8 min lower balanced cost than the reference route. A* guarantees optimality for the active objective in this snapshot.",
  );
  assert.equal(
    translateUiText("Tăng thêm: 3,2 phút quy đổi", "en"),
    "Additional amount: 3,2 equivalent min",
  );
  assert.equal(
    translateUiText("Hậu kiểm bằng UCS · kém hơn 2,8 phút quy đổi", "en"),
    "Post-run UCS check · worse by 2,8 equivalent min",
  );
  assert.equal(
    translateUiText("kém hơn 2,8 phút quy đổi", "en"),
    "worse by 2,8 equivalent min",
  );
  assert.equal(
    translateUiText("Đã tối ưu thứ tự ghé theo hành trình mở.", "en"),
    "Optimized the visit order for the open route.",
  );
  assert.equal(
    translateUiText("0 phút · 0 %", "en"),
    "0 min · 0 %",
  );
  assert.equal(
    translateUiText(
      "5 seed · best seed 0 · best 13,6 phút · mean 13,6 phút · σ mẫu 0 phút · 10 000 move",
      "en",
    ),
    "5 seeds · best seed 0 · best 13,6 min · mean 13,6 min · sample σ 0 min · 10 000 moves",
  );
});

test("Vietnamese localization removes implementation jargon without rewriting fluent copy", () => {
  const source = "Tuyến được chọn · 4,2 phút";
  assert.equal(translateUiText(source, "vi"), source);

  const provenance = translateUiText(
    "Trang đang đọc bộ exp1–exp7 được tái sinh ngày 11/08/2026 từ graph/profile hiện hành, seed 42 và đã qua kiểm tra artifact độc lập. Chi tiết nguồn, môi trường và checksum nằm tại",
    "vi",
  );
  assert.equal(
    provenance,
    "Trang đang đọc bộ exp1–exp7 được tái sinh ngày 11/08/2026 từ đồ thị và hồ sơ hiện hành, với hạt giống ngẫu nhiên 42; các tệp kết quả đã được kiểm tra độc lập. Chi tiết nguồn, môi trường và mã kiểm tra nằm tại",
  );
  assert.doesNotMatch(
    provenance,
    /\b(?:artifact|benchmark|checksum|frontend|heuristic|runtime|seed|snapshot)\b/i,
  );

  assert.equal(
    translateUiText("BFS lấy node ở đầu hàng đợi FIFO.", "vi"),
    "BFS lấy đỉnh ở đầu hàng đợi FIFO.",
  );
  assert.equal(
    translateUiText(
      "Trace từng bước được yêu cầu cho G_real; chỉ nên dùng khi cần quan sát vì có thể rất dài. Giới hạn hiển thị 5.000 bước không cắt công việc tìm kiếm.",
      "vi",
    ),
    "G_real có thể ghi nhật ký từng bước; chỉ nên bật khi cần quan sát vì nhật ký có thể rất dài. Giới hạn hiển thị 5.000 bước không cắt ngắn quá trình tìm kiếm hay số liệu toàn lần chạy.",
  );
});

test("all current node and road names remain byte-for-byte unchanged", () => {
  assert.ok(properNames.size >= 600, "expected names from both committed graph snapshots");
  for (const name of properNames) {
    assert.equal(translateUiText(name, "vi"), name, `Vietnamese changed ${name}`);
    assert.equal(translateUiText(name, "en"), name, `English changed ${name}`);
  }
});

test("every static Vietnamese source message has an English rendering", () => {
  const failures = vietnameseSourceMessages().flatMap(({ message, location }) => {
    const english = translateUiText(message, "en");
    const residual = stripAllowedVietnamese(english);
    return VIETNAMESE_SPECIFIC.test(residual)
      ? [`${location}\n  source: ${message}\n  output: ${english}`]
      : [];
  });
  assert.deepEqual(failures, []);
});

test("language names are intentionally shown in their native form", () => {
  assert.equal(translateUiText("English", "vi"), "English");
  assert.equal(translateUiText("Tiếng Việt", "en"), "Tiếng Việt");
});

test("language provider excludes executable and code content from DOM translation", () => {
  const source = readFileSync(
    new URL("../components/language-provider.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /SKIPPED_ELEMENTS.*SCRIPT.*STYLE.*NOSCRIPT.*CODE.*PRE/);
  assert.match(source, /document\.documentElement\.lang = language/);
  assert.match(source, /aria-valuetext/);
  assert.match(source, /meta\[name=\"description\"\]/);
  assert.match(source, /headObserver\.observe\(document\.head/);
  assert.match(source, /MutationObserver/);
});
