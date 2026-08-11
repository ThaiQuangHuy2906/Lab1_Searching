# results/ — kết quả 7 thí nghiệm benchmark

> ✅ **KẾT QUẢ THÍ NGHIỆM CHÍNH THỨC — 2026-08-11:** toàn bộ artifact exp1–exp7
> trong thư mục này được tạo trong một lượt cô lập từ graph/profile hiện hành.
> Pre-gate backend/data đạt trước lượt chạy; sau fix generator, closeout suite đạt
> `235 passed` và `scripts/validate_data.py` tiếp tục trả `ALL DATA VALID`.
> Lượt benchmark dùng seed 42, 200 cặp OD cách thẳng tối thiểu 1 km trên `G_real`,
> hai slot 07:30/22:00 và hoàn tất trong 540,5 giây. Sau đó chuỗi tiếp tục với
> hiệu chuẩn γ từ 160 mẫu TomTom đủ bốn slot và tái sinh tài liệu giảng.

## Kết quả chính

| Thí nghiệm | Kết quả đã kiểm |
|---|---|
| exp1 | UCS/A* khớp NetworkX **800/800**, sai số tối đa ≤ 1e-6 |
| exp2 | **0** vi phạm trên **21.170** điểm; `max(h/h*) = 0,8886` |
| exp3 | đúng **9 thuật toán × 200 cặp × 2 slot = 3.600 dòng**; A*/UCS/Bidijkstra đều found 100% và gap 0 |
| exp4 | **149/200 (74,5%)** cặp đổi tuyến giữa 07:30 và 22:00; đúng ba GeoJSON mới |
| exp5 | thời gian TB của tuyến được chọn: 607,4 s ở γ=0; 580,1 s ở γ=1,5; 574,4 s ở γ=3 |
| exp6 | đúng 5 cặp, 5 GeoJSON và 5 PNG để đối chứng Google Maps định tính |
| exp7 | thứ tự nhập 4.320,1 s; Held–Karp 2.494,9 s (**42,2%**); NN+local 2.534,2 s; SA best 2.494,9 s; SA mean 2.584,6 ± 66,0 s |
| γ calibration | γ̂ = **1,238** từ 160 điểm đo/4 slot; lệch 17,5% so với hằng số thiết kế 1,5 |

NN+2-opt/Or-opt và SA vẫn là heuristic: việc SA best chạm Held–Karp trong
instance exp7 không tạo guarantee tổng quát. `runtime_ms` là wall-clock trên máy
chạy và không byte-reproducible; sample, thứ tự duyệt, path, cost và random seed
thì deterministic với cùng input/code.

## Provenance

- Branch/HEAD nền: `main` / `821e77d38b41bb98e473be620b17c76e09a000d8`.
- Lượt chạy dùng current dirty worktree của final audit; không commit/push theo
  yêu cầu. Vì vậy checksum source bên dưới, không chỉ HEAD, mới định danh đúng code.
- Máy: Windows 11 build 26200; Python 3.14.0; AMD Ryzen 7 6800H, 8 core/16 thread.
- `G_real`: created 2026-07-27, 2.118 node/4.699 cạnh có hướng/1.433 cạnh một chiều.
- `G_demo`: created 2026-08-03, 51 node/298 cạnh có hướng/60 cạnh một chiều.
- Hai profile: created 2026-08-03, source `tomtom+synthetic`.
- Bốn raw TomTom là snapshot đại diện trên hai ngày thứ Hai, không phải time
  series cùng ngày hoặc feed real-time; cạnh không được TomTom phủ dùng fallback
  synthetic deterministic.
- Benchmark chạy từ `backend/` bằng
  `..\.venv\Scripts\python.exe -m app.benchmark`; không có dev server, benchmark
  hay gate nặng nào chạy song song.
- Lượt canonical cuối chạy 19:34:17–19:43:17 (UTC+7). Producer ghi mọi text
  artifact bằng LF; raw-file content và content sau Git filter `eol=lf` là đồng
  nhất, nên SHA-256 bên dưới không đổi khi staging/checkout.

### SHA-256 input/source cốt lõi

| Path | SHA-256 |
|---|---|
| `data/graph_real.json` | `4920FCCCAC83C7646A6DA6FA90EF19A9810ECA12B6B9E1E4794FF3DAF8C5EA83` |
| `data/graph_demo.json` | `79066A8105BD7A6B42B918BC9FDFE2B56AEFD4DE34FF5A68A37E4122F80EF892` |
| `data/traffic_profiles_real.json` | `C231F1FB64C560ADF84BB3658ECD79D37FF9FAA187D678AE3F9E353668F93910` |
| `data/traffic_profiles_demo.json` | `093567C5AE17B0E7309FCC74C56CD5D40F4AF20770D355BF753688497C045373` |
| `backend/app/benchmark.py` | `1AF4696D212B8F4334DA9FF8D932F38A0DA3567DB10A7500C06A2CEBD2F9304A` |
| `backend/app/search.py` | `37C1BA9AB68B5970987336EDD76DA37AC7343058A29CD6D52D742B8C738A1C1F` |
| `backend/app/search_advanced.py` | `798EA5DEFDD574B2163F59B348B01B77DE9558CF1A57BD467C2A399E237CF506` |
| `backend/app/tsp.py` | `D0CD0ECC14B9BC1AFE832AB0F520A2CBAE2400E0DC23D97166FE7D59CCB47A79` |
| `scripts/05_calibrate_gamma.py` | `E2294965750FDFC957D33CABA3AD7A9DFB9022683048D4EE5C32B05F66086016` |
| `scripts/gen_teaching_doc.py` | `194E2402B2D94ABB884CE2ADC1FBAF0C8B2F97E405B92054EE395D0CF59DD962` |

### SHA-256 output số liệu/generated cốt lõi

| Path | SHA-256 |
|---|---|
| `results/exp1_correctness.csv` | `101172BB6DE1B6128796517FECD12658F1B8D21A1F0EF643D40777F57CC0B3CC` |
| `results/exp2_admissibility.csv` | `EA165E24490B6353232A7AEA75CE33D0575226C7481D52E345C5B76E60E5D121` |
| `results/exp3_benchmark.csv` | `F5E096A4E396D31B3049A8CF7C8950C4968CA228510862864233D1894F80B624` |
| `results/exp4_congestion.csv` | `2094F8DE60789C0DDE30B6A0331B9D215DFD00115E4AD6504F3A8DACF09D95E4` |
| `results/exp5_gamma.csv` | `435071B04F391697AB621B943EB378CFCDD95E0CDD264F3DD70C7E0F0E9075E6` |
| `results/exp6_pairs.json` | `D2DAA36132E692D6338BD20EA7EFF9F153F16941C5B4BB877944AF8E4D92C380` |
| `results/exp7_tsp.csv` | `7CE49A08EE45FC918D3C03EF24FB6979F113A5FDED25BDABEA77E0EB50F9573B` |
| `results/gamma_calibration.csv` | `1223B2A9E0EFC3B54C6D98D77F2C81F54310EAE7A9A580C5C3C35CF66B25B449` |
| `docs/GIAI-THICH-THUAT-TOAN.md` | `C69B45AD13E7CDF5E5489257820EB6D05AACF6CFE0FDDFE529D8BE5E82632A74` |

## Catalog artifact

| File | Thí nghiệm |
|---|---|
| `exp1_correctness.csv` | Đối chứng UCS/A* vs NetworkX, 800 ca |
| `exp2_admissibility.csv` | Kiểm thực nghiệm `h ≤ h*` trên mọi node reachable của 10 goal |
| `exp3_benchmark.csv` | 9 thuật toán × 200 cặp × 2 khung giờ trên G_real |
| `exp4_congestion.csv` + `exp4_examples/` | Tỷ lệ đổi tuyến 07:30/22:00 + ba ví dụ |
| `exp5_gamma.csv` | Độ nhạy γ ∈ [0; 3] |
| `exp6_pairs.json` + `exp6_routes/` | 5 cặp đối chứng Google Maps định tính |
| `exp7_tsp.csv` | Held–Karp vs NN+2-opt/Or-opt vs SA, kịch bản 10 điểm |
| `figs/` | 6 PNG benchmark, light theme/nền trắng |
| `gamma_calibration.csv` | γ̂ least-squares độc lập từ raw TomTom |

## Verification đã chạy

- backend full suite sau fix generator/newline producer: `235 passed`, 1 dependency warning;
- `scripts/validate_data.py`: `ALL DATA VALID`;
- validator artifact độc lập: row/key/method/count/formula, exp4 recompute 200 cặp,
  11 PNG verify, JSON/GeoJSON và timestamp đều đạt;
- gamma được tính lại độc lập từ raw: 160 điểm, 4 slot, γ̂ `1.238001…`, khớp CSV;
- generator được chạy lại và cho SHA-256 byte-identical; regression xác nhận
  CSV/JSON/Markdown producer không còn phát CRLF trên Windows.
- Chrome 151 hệ thống, maximized trên panel 2560×1440 (viewport 1707×825,
  DPR 1,5) đã hard-refresh trang `/benchmark`: API 200 đủ exp1–exp7, đúng 9
  algorithm exp3, ba chart/bảng tương đương dùng được, không overflow ngang,
  keyboard/reduced-motion đạt và console 0 error/warning.

Nếu graph, profile, source algorithm hoặc producer thay đổi, bộ này phải bị
downgrade khỏi “chính thức” cho tới khi chạy lại **trọn chuỗi** test → validator →
benchmark → gamma calibration → generator → documentation sync. Không chạy lẻ
từng experiment rồi trộn artifact giữa các lượt.
