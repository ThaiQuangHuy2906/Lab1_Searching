/**
 * Whole-message templates for UI copy that contains runtime values.
 *
 * Rules are deliberately anchored. Captured values such as node names, road
 * names, identifiers, algorithms, and measurements are preserved verbatim
 * unless a rule explicitly marks that capture as translatable UI copy.
 */

interface DynamicMessageRule {
  source: string;
  target: string;
  translateCaptures?: readonly number[];
}

const RULES: readonly DynamicMessageRule[] = [
  // Complete messages assembled from several template fragments.
  {
    source: "Đã quét {0} cạnh; thêm {1} node; cải thiện {2} node; frontier sau bước có {3} node.",
    target: "Scanned {0} {p0:edge|edges}; added {1} {p1:node|nodes}; improved {2} {p2:node|nodes}; the frontier contains {3} {p3:node|nodes} after this step.",
  },
  {
    source: "Vòng {0}; depth={1}; giới hạn={2}.",
    target: "Iteration {0}; depth={1}; limit={t2}.",
    translateCaptures: [2],
  },
  {
    source: "Node được chọn có g={0}; ứng viên kế tiếp {1} có g={2}.",
    target: "The selected node has g={t0}; the next candidate, {1}, has g={t2}.",
  },
  {
    source: "Node được chọn có h={0}; ứng viên kế tiếp {1} có h={2}.",
    target: "The selected node has h={t0}; the next candidate, {1}, has h={t2}.",
  },
  {
    source: "Node được chọn có g={0}, h={1}, f={2}; ứng viên kế tiếp {3} có f={4}.",
    target: "The selected node has g={t0}, h={t1}, and f={t2}; the next candidate, {3}, has f={t4}.",
  },
  {
    source: "Trước bước: chọn mở rộng {0} với g={1}; top F={2}, top B={3}, μ trước={4}.",
    target: "Before the step: selected the {t0} for expansion with g={t1}; top F={t2}, top B={t3}, and previous μ={t4}.",
    translateCaptures: [0],
  },
  {
    source: "{0} Hàng chờ phía Đi/Đến sau bước có {1}/{2} điểm; μ sau={3}, điểm gặp={4}.",
    target: "{t0} After the step, the Start/Destination frontiers contain {1}/{2} nodes; new μ={t3}, meeting node={4}.",
    translateCaptures: [0],
  },
  {
    source: "Vòng {0}; f={1}; bound={2}.",
    target: "Iteration {0}; f={t1}; bound={t2}.",
  },
  {
    source: "Lớp {0}; k={1}; f được chọn={2}; đã cắt {3} ứng viên.",
    target: "Layer {0}; k={1}; selected f={t2}; pruned {3} {p3:candidate|candidates}.",
  },
  {
    source: "Điều kiện dừng toàn bộ phép tìm: top F ({0}) + top B ({1}) ≥ μ ({2}), gặp tại {3}.",
    target: "Global stopping condition: top F ({t0}) + top B ({t1}) ≥ μ ({t2}), with meeting node {3}.",
  },
  {
    source: "{0} Timeline là payload rút gọn; metrics và kết quả vẫn là full run.",
    target: "{t0} The timeline is a reduced payload; the metrics and result still describe the full run.",
    translateCaptures: [0],
  },
  {
    source: "Tuyến tham chiếu ngắn hơn {0}, nhưng {1} cao hơn {2}. Vì đang tối ưu {3}, tuyến kết quả có lợi hơn theo tiêu chí này. {4}",
    target: "The reference route is {0} shorter, but its {t1} is {t2} higher. Because {t3} is the active objective, the result route is better under that objective. {t4}",
    translateCaptures: [1, 3, 4],
  },
  {
    source: "Tuyến tham chiếu có chi phí cân bằng thấp hơn {0}, nhưng dài hơn {1}. Vì đang tối ưu quãng đường, tuyến kết quả được ưu tiên. {2}",
    target: "The reference route has {t0} lower balanced cost but is {1} longer. Because distance is the active objective, the result route is preferred. {t2}",
    translateCaptures: [2],
  },
  {
    source: "Hai tuyến tương đương theo {0}; khác biệt nằm ở hình dạng tuyến hoặc các chỉ số phụ. {1}",
    target: "The two routes are equivalent by {t0}; they differ only in route shape or secondary metrics. {t1}",
    translateCaptures: [0, 1],
  },
  {
    source: "Hậu kiểm cho thấy tuyến tham chiếu có {0} thấp hơn {1}. {2}",
    target: "The post-run check found that the reference route has {t1} lower {t0}. {t2}",
    translateCaptures: [0, 2],
  },
  {
    source: "Tuyến kết quả có {0} thấp hơn tuyến tham chiếu {1}. {2}",
    target: "The result route has {t1} lower {t0} than the reference route. {t2}",
    translateCaptures: [0, 2],
  },
  {
    source: "{0} đã tìm đường qua {1} chặng theo đúng thứ tự đã nhập: {2}. Số liệu bên dưới là tổng của toàn bộ hành trình.",
    target: "{0} found routes across {1} {p1:leg|legs} in the entered order: {2}. The metrics below are totals for the entire journey.",
  },
  {
    source: "{0} không tìm thấy đường ở {1}: {2} → {3}. Hành trình đa điểm dừng tại chặng này.",
    target: "{0} found no route for {t1}: {2} → {3}. The multi-stop journey stops at this leg.",
    translateCaptures: [1],
  },
  {
    source: "{0} chưa chạy đủ toàn bộ hành trình đa điểm.",
    target: "{0} has not completed the entire multi-stop journey.",
  },
  {
    source: "Đã chạy {0} — {1} chặng, {2} bước, {3} node expand.",
    target: "Ran {0} — {1} {p1:leg|legs}, {2} recorded {p2:step|steps}, {3} nodes expanded.",
  },
  {
    source: "Đã chạy {0} — {1} chặng, {2} node expand.",
    target: "Ran {0} — {1} {p1:leg|legs}, {2} nodes expanded.",
  },
  {
    source: "Đã chạy {0} — {1} bước, {2} node expand.",
    target: "Ran {0} — {1} recorded {p1:step|steps}, {2} nodes expanded.",
  },
  {
    source: "Đã chạy {0} — {1} node expand.",
    target: "Ran {0} — {1} nodes expanded.",
  },

  // Components and accessible labels.
  { source: "Thứ tự sau tối ưu giảm {0} tổng chi phí {1}.", target: "The optimized order reduces total {t1} cost by {0}.", translateCaptures: [1] },
  { source: "Thứ tự sau tối ưu tăng {0} tổng chi phí {1}.", target: "The optimized order increases total {t1} cost by {0}.", translateCaptures: [1] },
  { source: "Điểm giao {0}", target: "Delivery stop {0}" },
  { source: "Chuyển {0} lên", target: "Move {0} up" },
  { source: "Chuyển {0} xuống", target: "Move {0} down" },
  { source: "Xóa điểm giao {0} ở vị trí {1}", target: "Remove delivery stop {0} at position {1}" },
  { source: "Danh sách hàng chờ {0}", target: "Frontier entries: {t0}", translateCaptures: [0] },
  { source: "Tăng {0}", target: "Increase {0}" },
  { source: "Giảm {0}", target: "Decrease {0}" },
  { source: "Đã chọn điểm Đi và {0} điểm giao hàng.", target: "Selected Start and {0} delivery {p0:stop|stops}." },
  { source: "{0} trạng thái DP · {1} transition", target: "{0} DP {p0:state|states} · {1} {p1:transition|transitions}" },
  { source: "{0} ứng viên · {1} move cải thiện được nhận", target: "{0} {p0:candidate|candidates} · {1} accepted improving {p1:move|moves}" },
  { source: "{0} seed · best seed {1} · best {2} · mean {3} · σ mẫu {4} · {5} move", target: "{0} {p0:seed|seeds} · best seed {1} · best {t2} · mean {t3} · sample σ {t4} · {5} {p5:move|moves}" },
  { source: "{0} phút · {1}", target: "{0} min · {1}" },
  { source: "Thiếu đường có hướng {0} → {1}; đổi optimizer không thể sửa ma trận này.", target: "Missing directed route {0} → {1}; changing the optimizer cannot repair this matrix." },
  { source: "Chạy lại {0}", target: "Run {0} again" },
  { source: "Xem giải thích {0}", target: "View explanation for {0}" },
  { source: "{0} quy đổi", target: "{0} equivalent" },
  { source: "Bảng so sánh {0} phương pháp ATSP", target: "Comparison table for {0} ATSP {p0:method|methods}" },
  { source: "Ma trận có hướng thiếu đường {0} → {1}. Hãy đổi tập điểm hoặc kịch bản đường.", target: "The directed cost matrix is missing route {0} → {1}. Change the location set or road scenario." },
  { source: "Bản đồ kết quả {0}", target: "Result map for {0}" },
  { source: "{0} · {1} đoạn thử", target: "{t0} · {1} experimental road {p1:override|overrides}", translateCaptures: [0] },
  { source: "{0} đoạn đã sửa", target: "{0} edited road {p0:segment|segments}" },
  { source: "Ùn tắc lúc {0}", target: "Congestion at {0}" },
  { source: "Ùn tắc {0}", target: "Congestion at {0}" },
  { source: "ε — nới ngưỡng ({0})", target: "ε — threshold increment ({t0})", translateCaptures: [0] },
  { source: "Mỗi vòng IDA* nới ngưỡng thêm ε {0}; nghiệm nằm trong khoảng tối ưu + ε.", target: "Each IDA* iteration increases the threshold by ε {t0}; the solution lies within the C* + ε bound.", translateCaptures: [0] },
  { source: "Mặc định {0}", target: "Default: {0}" },
  { source: "Đang chạy chặng {0}/{1}…", target: "Running leg {0}/{1}…" },
  { source: " · chặng {0}/{1}", target: " · leg {0}/{1}" },
  { source: "Bảng so sánh {0} thuật toán định tuyến", target: "Comparison table for {0} route-search {p0:algorithm|algorithms}" },
  { source: "Mở panel {0}", target: "Open the {t0} panel", translateCaptures: [0] },
  { source: "Đóng bảng {0}", target: "Close the {t0} panel", translateCaptures: [0] },
  { source: "Thu gọn panel {0}", target: "Collapse the {t0} panel", translateCaptures: [0] },
  { source: "với {0} đoạn đã chỉnh", target: "with {0} edited road {p0:segment|segments}" },
  { source: "{0} đoạn đang điều chỉnh", target: "{0} road {p0:segment|segments} being edited" },
  { source: "Chiều dài phải hữu hạn và không nhỏ hơn {0}.", target: "Length must be finite and at least {0}." },
  { source: "Rủi ro {0}", target: "{t0} risk", translateCaptures: [0] },
  { source: "{0} → … → {1} (qua {2} điểm trung gian)", target: "{0} → … → {1} (via {2} intermediate {p2:node|nodes})" },
  { source: "đầy đủ, {0} nút", target: "full graph, {0} nodes" },
  { source: "toàn bộ đồ thị, {0} đỉnh", target: "full graph, {0} nodes" },
  { source: "{0} điểm minh họa", target: "{0} teaching nodes" },
  { source: "· {0} đoạn thử", target: "· {0} experimental road {p0:override|overrides}" },
  { source: "Đã tìm đường qua {0} chặng theo đúng thứ tự đã khóa.", target: "Found routes across {0} {p0:leg|legs} in the locked order." },
  { source: "Nhảy tới bước duyệt {0}", target: "Jump to the step where {0} was expanded" },
  { source: "{0} — bấm để nhảy tới bước điểm này được duyệt", target: "{0} — click to jump to the step where this node was expanded" },
  { source: "{0} — điểm này chưa từng được duyệt", target: "{0} — this node has not been expanded" },
  { source: "Ngôn ngữ: {0}", target: "Language: {t0}", translateCaptures: [0] },
  { source: "Giao diện: {0}", target: "Theme: {t0}", translateCaptures: [0] },
  { source: "{0}\nĐoạn {1} · {2} → {3}", target: "{0}\nRoad segment {1} · {2} → {3}" },
  { source: "{0}\nNút {1}", target: "{0}\nNode {1}" },
  { source: "Nút {0}", target: "Node {0}" },
  { source: "Tìm đường · {0} chặng", target: "Route search · {0} {p0:leg|legs}" },
  { source: "Chặng {0}/{1}: {2} → {3}", target: "Leg {0}/{1}: {2} → {3}" },
  { source: "Chặng {0}", target: "Leg {0}" },
  { source: "chặng {0}", target: "leg {0}" },
  { source: "{0} chặng,", target: "{0} {p0:leg|legs}," },
  { source: "Tối ưu thứ tự ghé · {0}", target: "Visit-order optimization · {t0}", translateCaptures: [0] },

  // ATSP event narration.
  { source: "Đang thử đi từ {0} đến {1} để lưu chi phí tốt nhất cho tập điểm này.", target: "Evaluating the directed pair from {0} to {1} to store the best cost for this subset." },
  { source: "Từ {0}, phương pháp lân cận gần nhất chọn {1} trong {2} ứng viên.", target: "From {0}, Nearest Neighbor selects {1} from {2} {p2:candidate|candidates}." },
  { source: "Một phép đổi thứ tự được chấp nhận vì giảm chi phí từ {0} xuống {1}.", target: "An order change was accepted because it reduced cost from {t0} to {t1}." },
  { source: "Lượt seed {0} đang ở vòng {1}; giao diện giữ lại trạng thái hiện tại để đối chiếu với nghiệm tốt nhất.", target: "Seed run {0} is at iteration {1}; the UI retains the current state for comparison with the best-so-far solution." },
  { source: "Seed {0}, vòng {1}: {2}", target: "Seed {0}, iteration {1}: {t2}", translateCaptures: [2] },
  { source: "Đã chọn nghiệm tốt nhất của các seed với tổng chi phí {0}.", target: "Selected the best solution across seeds, with total cost {t0}." },
  { source: "Tối ưu thứ tự ghé hoàn tất với tổng chi phí {0}.", target: "Visit-order optimization completed with total cost {t0}." },

  // Validation, state, and action copy.
  { source: "Đoạn giữa {0} và {1} chỉ đi được một chiều, ngược với thứ tự bạn vừa bấm. Hãy bấm lại, đổi thứ tự hai điểm.", target: "The road between {0} and {1} only runs one way, opposite the order you just clicked. Click again, swapping the order of the two points." },
  { source: "{0} và {1} không có đoạn đường nối trực tiếp.", target: "{0} and {1} have no direct road segment connecting them." },
  { source: "Cần chọn ít nhất {0} mục để so sánh.", target: "Select at least {0} items for comparison." },
  { source: "Chỉ được chọn tối đa {0} mục để so sánh.", target: "Select no more than {0} items for comparison." },
  { source: "Held–Karp không nhận {0} điểm; giới hạn là 15.", target: "Held–Karp does not accept {0} locations; the limit is 15." },
  { source: "Result ID {0} không thuộc comparison session.", target: "Result ID {0} does not belong to this comparison session." },
  { source: "Run {0} không còn queued.", target: "Run {0} is no longer queued." },
  { source: "{0} result ID không thuộc immutable request snapshot.", target: "The {0} result ID does not belong to the immutable request snapshot." },
  { source: "Result ID {0} không thuộc session.", target: "Result ID {0} does not belong to this session." },
  { source: "Run {0} phải ở trạng thái running trước khi attach.", target: "Run {0} must be running before a response can be attached." },
  { source: "Run {0} phải ở trạng thái running trước khi fail.", target: "Run {0} must be running before it can be marked as failed." },
  { source: "Đồng hạng {0}", target: "Tied at rank {0}" },
  { source: "Hạng {0}", target: "Rank {0}" },
  { source: "Payload backend không hợp lệ tại {0}: {1}.", target: "Invalid backend payload at {0}: {t1}.", translateCaptures: [1] },
  { source: "phải là số nguyên >= {0}", target: "must be an integer greater than or equal to {0}" },
  { source: "giá trị enum không được hỗ trợ: {0}", target: "contains an unsupported enum value: {0}" },
  { source: "không khớp {0}", target: "does not match {0}" },
  { source: "không áp dụng cho {0}", target: "does not apply to {0}" },
  { source: "{0} cần selected {1}", target: "{0} requires selected {1}" },
  { source: "{0} cần runner-up {1}", target: "{0} requires runner-up {1}" },
  { source: "{0} cần selected_scores=null", target: "{0} requires selected_scores=null" },
  { source: "Đã tối ưu thứ tự ghé theo hành trình {0}.", target: "Optimized the visit order for journey {0}." },
  { source: "Hậu kiểm bằng UCS · tốt hơn {0}", target: "Post-run UCS check · better by {t0}" },
  { source: "Hậu kiểm bằng UCS · kém hơn {0}", target: "Post-run UCS check · worse by {t0}" },
  { source: "tốt hơn {0}", target: "better by {t0}" },
  { source: "kém hơn {0}", target: "worse by {t0}" },
  { source: "Tổng theo tiêu chí: {0}", target: "Objective total: {t0}" },
  { source: "Tổng quãng đường: {0}", target: "Total distance: {t0}" },
  { source: "Tổng thời gian: {0}", target: "Total time: {t0}" },
  { source: "Tổng chi phí: {0}", target: "Total cost: {t0}" },
  { source: "Cao hơn tuyến tối ưu: {0}", target: "Above the exact optimum: {t0}" },
  { source: "Tăng thêm: {0}", target: "Additional amount: {t0}" },
  { source: "Cộng thêm: {0}", target: "Added amount: {t0}" },
  { source: "Thay đổi: {0}", target: "Change: {t0}" },
  { source: "{0} nhận {1} điểm, vượt giới hạn {2} điểm.", target: "{0} received {1} locations, exceeding its {2}-location limit." },
  { source: "Tối ưu trong ε = {0} {1}", target: "Optimal within ε = {0} {t1}", translateCaptures: [1] },
  { source: "{0} có bảo đảm tối ưu theo tiêu chí hiện tại trong snapshot này.", target: "{0} guarantees optimality for the active objective in this snapshot." },
  { source: "{0}, nên kết quả không được xem là tối ưu trọng số.", target: "{t0}; therefore, this result must not be treated as weighted-cost optimal.", translateCaptures: [0] },
  { source: "{0} không có bảo đảm tối ưu trọng số cho kết quả này.", target: "{0} does not provide a weighted-cost optimality guarantee for this result." },
  { source: "Chặng về Đi {0}", target: "Return-to-Start leg {0}" },
  { source: "So sánh {0} phương pháp ATSP", target: "Compare {0} ATSP {p0:method|methods}" },
  { source: "So sánh {0} thuật toán", target: "Compare {0} {p0:algorithm|algorithms}" },
  { source: "Tối ưu bằng {0}", target: "Optimize with {0}" },
  { source: "Chạy {0}: Đi → Đến", target: "Run {0}: Start → Destination" },
  { source: "Chạy {0} theo thứ tự đã chọn", target: "Run {0} in the selected order" },
  { source: "Đã chuyển {0} {1} vị trí {2}/{3}.", target: "Moved {0} {t1} to position {2}/{3}.", translateCaptures: [1] },
  { source: "{0} không tìm thấy đường — xem tab Giải thích.", target: "{0} found no route—see the Explanation tab." },
  { source: "Đã hoàn tất {0} thuật toán theo cùng snapshot.", target: "Completed {0} {p0:algorithm|algorithms} on the same snapshot." },
  { source: "Đã chạy lại {0}.", target: "Ran {0} again." },
  { source: "Đã tối ưu thứ tự {0} điểm giao — tiết kiệm {1} %.", target: "Optimized the order of {0} delivery {p0:stop|stops}—saved {1}%." },
  { source: "Thứ tự mới tăng chi phí {0} % so với thứ tự nhập.", target: "The new order costs {0}% more than the entered order." },
  { source: "Đã hoàn tất {0} phương pháp ATSP theo cùng snapshot.", target: "Completed {0} ATSP {p0:method|methods} on the same snapshot." },
  { source: "Đồ thị minh hoạ {0}", target: "Teaching graph {0}" },

  // Vietnamese error envelopes returned by the backend.
  { source: "Tham số không hợp lệ: {0}", target: "Invalid parameters: {0}" },
  { source: "Không tìm thấy node: {0}", target: "Node not found: {0}" },
  { source: "Yêu cầu không hợp lệ: {0}", target: "Invalid request: {0}" },
  { source: "Lỗi HTTP {0} từ backend.", target: "Backend HTTP error {0}." },
  { source: "Chưa có kết quả cho thí nghiệm {0} trong results/ — hãy chạy backend/app/benchmark.py (Phase 6) trước.", target: "No results are available for experiment {0} in results/. Run backend/app/benchmark.py (Phase 6) first." },

  // Standalone dynamic fragments and units.
  { source: "{0} phút quy đổi", target: "{0} equivalent min" },
  { source: "{0} phút", target: "{0} min" },
  { source: "{0} bước,", target: "{0} recorded {p0:step|steps}," },
  { source: ", {0} nút", target: ", {0} nodes" },
  { source: "đầy đủ{0}", target: "full graph{t0}", translateCaptures: [0] },
  { source: "Vòng {0}; depth={1};", target: "Iteration {0}; depth={1};" },
  { source: "giới hạn={0}.", target: "limit={t0}.", translateCaptures: [0] },
  { source: "Frontier hiệu lực trước khi lấy có {0} node.", target: "The effective frontier contains {0} nodes before selection." },
  { source: "Dijkstra hai chiều đang mở rộng {0} vì phía này có chi phí chờ thấp hơn.", target: "Bidirectional Dijkstra is expanding the {t0} because it has the lower pending cost.", translateCaptures: [0] },
  { source: "Bước {0}/{1}", target: "Step {0}/{1}" },
  { source: "Bước này vừa mở rộng {0}.", target: "This step expanded {0}." },
  { source: "Frontier sau bước có {0} node.", target: "The frontier contains {0} nodes after this step." },
  { source: "Đang mở rộng {0}.", target: "Expanding {0}." },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileSource(source: string): RegExp {
  source = source.replace(/\s+/g, " ").trim();
  let pattern = "";
  let cursor = 0;
  for (const match of source.matchAll(/\{(\d+)\}/g)) {
    const index = match.index ?? 0;
    pattern += escapeRegex(source.slice(cursor, index));
    pattern += "(.*?)";
    cursor = index + match[0].length;
  }
  pattern += escapeRegex(source.slice(cursor));
  return new RegExp(`^${pattern}$`, "u");
}

function ruleSpecificity(source: string): readonly [number, number, number] {
  const firstCapture = source.search(/\{\d+\}/);
  const literalPrefixLength = firstCapture < 0 ? source.length : firstCapture;
  const literalLength = source.replace(/\{\d+\}/g, "").length;
  return [literalPrefixLength, literalLength, source.length];
}

const COMPILED_RULES = RULES
  .map((rule) => ({
    ...rule,
    pattern: compileSource(rule.source),
    specificity: ruleSpecificity(rule.source),
  }))
  .sort((left, right) => {
    for (let index = 0; index < left.specificity.length; index += 1) {
      const difference = right.specificity[index] - left.specificity[index];
      if (difference !== 0) return difference;
    }
    return 0;
  });

function isSingular(value: string): boolean {
  const normalized = value.replace(/[\s,.]/g, "");
  return normalized === "1";
}

export function translateDynamicEnglish(
  source: string,
  translatePart: (part: string) => string,
): string | undefined {
  for (const rule of COMPILED_RULES) {
    const match = rule.pattern.exec(source);
    if (!match) continue;
    const captures = match.slice(1);
    const translated = new Set(rule.translateCaptures ?? []);
    let target = rule.target.replace(
      /\{p(\d+):([^|{}]+)\|([^{}]+)\}/g,
      (_token, rawIndex: string, singular: string, plural: string) => (
        isSingular(captures[Number(rawIndex)] ?? "") ? singular : plural
      ),
    );
    target = target.replace(/\{t(\d+)\}/g, (_token, rawIndex: string) => (
      translatePart(captures[Number(rawIndex)] ?? "")
    ));
    return target.replace(/\{(\d+)\}/g, (_token, rawIndex: string) => {
      const index = Number(rawIndex);
      const value = captures[index] ?? "";
      return translated.has(index) ? translatePart(value) : value;
    });
  }
  return undefined;
}
