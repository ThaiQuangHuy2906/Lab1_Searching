# HDCRAWL — Nhật ký TomTom closeout và checklist artifact cuối

> **Trạng thái kiểm lại 2026-08-08:** raw TomTom đã đủ 4/4 slot. Hai slot 07:30, 12:00
> lấy ngày 2026-07-27; hai slot 17:30, 22:00 lấy ngày 2026-08-03. Đây là hai
> ngày thứ Hai cách nhau bảy ngày, dùng làm bốn snapshot đại diện, **không phải**
> time series cùng ngày. Chuỗi `03b real → 04 → 03b demo → validate_data` đã
> hoàn tất và cho `ALL DATA VALID` với G_demo 51/298/60, G_real
> 2.118/4.699/1.433, profile `tomtom+synthetic`.
> `graph_raw.graphml`, bốn TomTom JSON và OSMnx cache hiện đều được Git track
> dưới `data/raw/`; Data ZIP cuối vẫn phải chứa chúng để giữ provenance.
>
> **Không chạy lại §0–§2.** Các lệnh ở đó chỉ được giữ như nhật ký tái lập.
> Benchmark, gamma calibration và teaching generator trong §3–§5 vẫn được hoãn
> có chủ đích; chỉ chạy sau khi code ổn định và có ủy quyền riêng.
> Tám manual-risk URL đã được review/tích hợp ngày 2026-08-08; lượt đó chỉ sửa
> metadata/provenance và không chạy lại bất kỳ bước crawl/build/benchmark nào.

---

## 0. Chuẩn bị — đã hoàn tất, chỉ lưu lịch sử

- [x] Cấu hình key ngoài tracked source khi crawl; không ghi key vào tài liệu/repo.
      Biến môi trường dùng là `TOMTOM_API_KEY`.
      (lấy free tại https://developer.tomtom.com — Traffic Flow API).
      Dependencies `requests` + `python-dotenv` đã pin sẵn trong requirements.
- [x] Chốt provenance thực tế là hai ngày thứ Hai cách nhau bảy ngày; tài liệu
      phải mô tả là bốn snapshot đại diện, không gọi là chuỗi cùng ngày.

## 1. Crawl 4 mốc — đã hoàn tất, không chạy lại

Script **không tự kiểm giờ hệ thống**: tham số slot chỉ là nhãn thư mục, dữ liệu
là traffic tại đúng THỜI ĐIỂM bấm lệnh → phải canh giờ (±10–15 phút quanh mốc).

```powershell
# 07:30 sáng — ĐÃ THU 2026-07-27
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 07:30
# 12:00 trưa — ĐÃ THU 2026-07-27
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 12:00
# 17:30 chiều — ĐÃ THU 2026-08-03
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 17:30
# 22:00 tối — ĐÃ THU 2026-08-03
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 22:00
```

- [x] 07:30 — `flow_20260727T074003.json`
- [x] 12:00 — `flow_20260727T124957.json`
- [x] 17:30 — `flow_20260803T173001.json`
- [x] 22:00 — `flow_20260803T222752.json`

- Mỗi slot có 40 record hợp lệ tại
  `data/raw/tomtom/<slot>/flow_<stamp>.json`. Các file này hiện được Git track
  và phải được đóng trong Data ZIP cuối.
- Được phép chạy **2 lần cách nhau ~10 phút trong cùng mốc** — 03b gộp mọi
  snapshot trong thư mục, tăng độ bền nếu một điểm đo trả null.

## 2. Profiles + G_demo — đã hoàn tất, không chạy lại

Chuỗi dưới đây là bằng chứng quy trình đã dùng, không phải lệnh cần chạy ở trạng
thái hiện hành:

```powershell
.venv\Scripts\python.exe scripts\03b_build_profiles.py real
.venv\Scripts\python.exe scripts\04_build_gdemo.py
.venv\Scripts\python.exe scripts\03b_build_profiles.py demo
.venv\Scripts\python.exe scripts\validate_data.py
```

`04` đã được chạy đúng vị trí vì bất biến balanced của G_demo được repair dựa
trên profiles real. Kết quả hiện hành:

- Profile có `source=tomtom+synthetic`; mỗi slot G_real có 635/4.699 cạnh nhận
  mức TomTom, phần còn lại dùng deterministic synthetic fallback.
- G_demo hiện có **298 cạnh có hướng / 60 one-way**; mức ùn tắc được kế thừa
  bằng corridor weighted mean và phủ đủ bốn slot.
- Nếu risk-flag demo lệch >20% so hằng số, `validate_data` sẽ **fail có chủ
  đích** kèm thông điệp bảo cập nhật `EXPECTED_RISK_EDGES` (trong
  `scripts/validate_data.py`) + DATA.md §7 — đó là tripwire, không phải bug.

## 3. Benchmark cuối — DEFERRED, cần ủy quyền riêng

Tắt dev server + uvicorn trước (runtime_ms cần máy rảnh — TIENDO Phase 6f):

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.benchmark
cd ..
```

Ghi đè trọn `results/exp1–7 + figs/` (`results/README.md` không bị đụng).
Hình exp5 giờ tự mang tiêu đề trung tính đã sửa (KIEMTOAN C9).

## 4. Hiệu chuẩn γ — DEFERRED sau benchmark cuối

```powershell
.venv\Scripts\python.exe scripts\05_calibrate_gamma.py
```

In bảng inflation theo mức + **γ̂** và độ lệch so 1,5; ghi
`results/gamma_calibration.csv`. Dán γ̂ vào chỗ chờ sẵn ở **BaoCao mục c**
(dòng "γ̂ ước lượng từ raw TomTom local… = [SỐ LIỆU →
results/gamma_calibration.csv]").

## 5. Regen tài liệu giảng — DEFERRED sau benchmark/gamma

```powershell
.venv\Scripts\python.exe scripts\gen_teaching_doc.py
```

Tự làm mới: mọi bảng chạy tay (theo profiles demo mới) **và** số exp3/exp7
(đọc từ CSV mới — đã hết hardcode). Đọc lướt §1/§10/§11 của
`docs/GIAI-THICH-THUAT-TOAN.md` để lấy bộ số ví dụ mới (chi phí BFS vs A*,
+%, beam k=5, ma trận mini, HK%).

## 6. Thay số theo Phụ lục A (`docs/KIEMTOAN.md`)

Cách dùng sổ: đi từng dòng bảng **A.1–A.4**, chỉ những dòng cột cuối ghi
**"ĐỔI"**, mở nguồn (CSV / GIAI-THICH mới) chép giá trị mới vào đúng file:dòng.
Nặng nhất và dễ sót:

- [ ] BaoCao **bảng g** (40 số exp3) + 9 số exp7 + 83,5% exp4 + h/h* 0,565
      + beam 1,5% + "tiết kiệm ~37%".
- [ ] Câu độ nhạy γ: con số **~2,6%** (chênh cả dải γ∈[0;3]) phải TÍNH LẠI từ
      exp5 mới — xuất hiện ở BaoCao c, Slide 3, Video 22:00.
- [ ] Số chạy tay từ GIAI-THICH mới → Slide 5/9, Video 3:00/7:15/10:30,
      BaoCao mục h (hiện là 446/341/+31%/+104 s/304/120/415).
- [x] Đồng bộ số hiện hành G_demo 298/60 và mô tả risk vào tài liệu current-state.

## 7. Chốt

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -q     # mốc 2026-08-04: 111 passed
.venv\Scripts\python.exe scripts\validate_data.py         # ALL DATA VALID
# Chỉ sau khi được phép chạy generator cuối:
.venv\Scripts\python.exe scripts\gen_teaching_doc.py      # chạy lần 2 -> output ổn định
```

- [ ] **Đổi banner "SỐ TẠM"** ở đủ 5 vị trí: `results/README.md`, BaoCao,
      Slide, Video và header trong template `scripts/gen_teaching_doc.py` rồi
      regen; thay bằng ghi chú chính thức
      kiểu *"Số liệu lượt TomTom ngày …, seed 42"* — nộp bài mà còn chữ TẠM là
      mất điểm oan.
- [ ] Chỉ commit/push khi người dùng yêu cầu và sau khi toàn bộ artifact cuối đã
      được kiểm chứng.
- [ ] Việc tay còn lại sau lượt số: xem checklist mục 7 của `docs/KIEMTOAN.md`
      (điền [ĐIỀN], mở lại link ở tab ẩn danh, screenshot, video, đóng gói zip,
      repo GitHub phải mở được khi chấm).
