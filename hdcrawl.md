# HDCRAWL — Run-book lượt TomTom cuối trước khi nộp

> Crawl 4 mốc → 03b real + 04 + 03b demo → benchmark MỘT lượt → 05_calibrate_gamma
> → regen tài liệu → thay số theo Phụ lục A của `docs/KIEMTOAN.md`.
> Mọi lệnh chạy từ **repo root** bằng `.venv\Scripts\python.exe` (PowerShell),
> trừ benchmark (cwd `backend/`). Tổng thời gian tay: 4 lần canh giờ × 1 phút
> + ~25 phút buổi tối (build 3′ + benchmark 7′ + thay số ~15′).

---

## 0. Chuẩn bị (trước 07:30)

- [ ] Điền key vào `.env` ở repo root: `TOMTOM_API_KEY=...`
      (lấy free tại https://developer.tomtom.com — Traffic Flow API).
      Dependencies `requests` + `python-dotenv` đã pin sẵn trong requirements.
- [ ] Chọn **một ngày thường trong tuần** — 4 mốc cùng ngày mới kể một câu chuyện
      traffic nhất quán (thứ 7/CN kẹt khác hẳn ngày thường).

## 1. Crawl 4 mốc — chạy ĐÚNG giờ thật (~1 phút/lần)

Script **không tự kiểm giờ hệ thống**: tham số slot chỉ là nhãn thư mục, dữ liệu
là traffic tại đúng THỜI ĐIỂM bấm lệnh → phải canh giờ (±10–15 phút quanh mốc).

```powershell
# 07:30 sáng
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 07:30
# 12:00 trưa
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 12:00
# 17:30 chiều
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 17:30
# 22:00 tối
.venv\Scripts\python.exe scripts\03a_crawl_tomtom.py 22:00
```

- Mỗi lần crawl 40 điểm trục chính → `data/raw/tomtom/<slot>/flow_<stamp>.json`.
- Được phép chạy **2 lần cách nhau ~10 phút trong cùng mốc** — 03b gộp mọi
  snapshot trong thư mục, tăng độ bền nếu một điểm đo trả null.

## 2. Rebuild profiles + G_demo (sau mốc 22:00, ~3 phút)

```powershell
.venv\Scripts\python.exe scripts\03b_build_profiles.py real
.venv\Scripts\python.exe scripts\04_build_gdemo.py
.venv\Scripts\python.exe scripts\03b_build_profiles.py demo
.venv\Scripts\python.exe scripts\validate_data.py
```

**Vì sao PHẢI chạy lại 04:** bất biến balanced của G_demo được repair dựa trên
profiles real — mức TomTom mới làm đường balanced-tối-ưu trên G_real đổi chỗ,
04 phải repair lại thì validator mới qua. Cần biết trước:

- Kiểm log 03b real có `source=tomtom+synthetic, tomtom-assigned=...`
  (số cạnh nhận mức thật từ điểm đo).
- **Số cạnh G_demo có thể đổi** (hiện 292 cạnh / 56 oneway) → mọi chỗ quote nó
  đã nằm sẵn trong Phụ lục A.
- Nếu risk-flag demo lệch >20% so hằng số, `validate_data` sẽ **fail có chủ
  đích** kèm thông điệp bảo cập nhật `EXPECTED_RISK_EDGES` (trong
  `scripts/validate_data.py`) + DATA.md §7 — đó là tripwire, không phải bug.

## 3. Benchmark MỘT lượt (~7 phút, chạy MỘT MÌNH)

Tắt dev server + uvicorn trước (runtime_ms cần máy rảnh — TIENDO Phase 6f):

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.benchmark
cd ..
```

Ghi đè trọn `results/exp1–7 + figs/` (`results/README.md` không bị đụng).
Hình exp5 giờ tự mang tiêu đề trung tính đã sửa (KIEMTOAN C9).

## 4. Hiệu chuẩn γ (~5 giây)

```powershell
.venv\Scripts\python.exe scripts\05_calibrate_gamma.py
```

In bảng inflation theo mức + **γ̂** và độ lệch so 1,5; ghi
`results/gamma_calibration.csv`. Dán γ̂ vào chỗ chờ sẵn ở **BaoCao mục c**
(dòng "γ̂ ước lượng ĐỘC LẬP từ dữ liệu thật… = [SỐ LIỆU →
results/gamma_calibration.csv]").

## 5. Regen tài liệu giảng (~30 giây)

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
- [ ] Nếu G_demo đổi cạnh: 292/56 + risk demo ở Slide 4, BaoCao d, DATA.md §7
      (+ `EXPECTED_RISK_EDGES` nếu validator kêu).

## 7. Chốt

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -q     # kỳ vọng: 82 passed
.venv\Scripts\python.exe scripts\validate_data.py         # ALL DATA VALID
.venv\Scripts\python.exe scripts\gen_teaching_doc.py      # chạy lần 2 -> git diff phải RỖNG
```

- [ ] **Đổi banner "SỐ TẠM"** ở 4 file (BaoCao / Slide / Video + header trong
      template `scripts/gen_teaching_doc.py` rồi regen) thành ghi chú chính thức
      kiểu *"Số liệu lượt TomTom ngày …, seed 42"* — nộp bài mà còn chữ TẠM là
      mất điểm oan.
- [ ] Commit: `chore: TomTom crawl + final benchmark refresh`.
- [ ] Việc tay còn lại sau lượt số: xem checklist mục 7 của `docs/KIEMTOAN.md`
      (điền [ĐIỀN], source_url manual_risks, screenshot, video, đóng gói zip,
      repo GitHub phải mở được khi chấm).
