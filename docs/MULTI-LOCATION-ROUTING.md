# Tối ưu lộ trình qua nhiều điểm đến

Tài liệu này mô tả phần triển khai **Sequential Multi-Destination Route
Planning** trên kiến trúc FastAPI + Next.js hiện có.

## 1. Phân tích yêu cầu và giả định

- Một request có đúng một điểm xuất phát và 1-15 điểm đến phân biệt.
- Mặc định tối ưu thời gian, không bắt buộc quay về điểm đầu.
- Tọa độ được snap vào node gần nhất của graph đã chọn; có tolerance khoảng
  275 m quanh bbox cho POI sát biên. Điểm xa hơn hoặc nhiều địa điểm snap cùng
  node bị từ chối bằng lỗi có mã ổn định.
- Snapshot hiện hành được xây bằng OSM `network_type="drive"`, nên `driving`
  được hỗ trợ; `walking` và `cycling` hiện trả thông báo chưa hỗ trợ.
- Geocoding/autocomplete hiện dùng tên POI đã commit trong graph, không gọi API
  ngoài và không cần API key. Đây là local provider, không phải geocoder địa chỉ
  toàn thành phố.
- Geometry cuối là đường trên graph thật; haversine chỉ dùng để snap/heuristic,
  không được dùng làm kết quả quãng đường cuối.

## 2. Kiến trúc

```text
Autocomplete / click bản đồ / tọa độ API
                    │
                    ▼
        LocalGraphLocationService
          tìm kiếm + snap tọa độ
                    │
                    ▼
 SequentialRouteOptimizationService
        metric mapping + ATSP engine
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
  Distance matrix       Directions adapter
  Dijkstra có hướng     path node + polyline
          └─────────┬─────────┘
                    ▼
       /api/routes/optimize
                    │
                    ▼
  Zustand → deck.gl markers/path → drawer totals/legs
```

Các interface `LocationService`, `OptimizationService` và `DirectionsService`
nằm trong `backend/app/route_planning.py`. Provider local hiện tại có thể được
thay bằng Google Maps, Mapbox, HERE hoặc OSRM mà không đổi request/response công
khai. `GraphStore` cache graph/profile/weights theo vòng đời process; ma trận và
path của mỗi cặp chỉ được dựng một lần trong một request.

## 3. Thuật toán

- `auto`: Held-Karp khi tổng số điểm ≤ 11; lớn hơn dùng Nearest Neighbor +
  2-opt/Or-opt an toàn cho ma trận bất đối xứng.
- `held_karp`: exact dynamic programming bitmask, đảm bảo tối ưu, tối đa 15 điểm
  tổng cộng.
- `nn_2opt`: heuristic nhanh, không đảm bảo tối ưu.
- `sa`: Simulated Annealing với seed 0-4, không đảm bảo tối ưu.

Điểm xuất phát luôn cố định ở vị trí 0. Tie-break dùng id ổn định nên thứ tự tối
ưu không phụ thuộc thứ tự người dùng nhập. `returnToStart=true` thêm đúng một
chặng cuối quay về start nhưng không lặp start trong `optimizedOrder`.

Mapping tiêu chí:

| API | Cost mode hiện có | Đơn vị |
|---|---|---|
| `duration` | `time` | giây |
| `distance` | `distance` | mét |
| `custom` | `balanced` | giây (thời gian + phạt risk) |

Trong response tọa độ, `durationSeconds` luôn là thời gian di chuyển thuần theo
mode `time` (`t_free × congestion`), không chứa risk penalty. Phần penalty chỉ
nằm trong `optimizationCost` khi chọn `custom`. Contract legacy
`/api/multiroute` vẫn giữ `total_time_s=balanced` để không phá consumer cũ.

## 4. Data model và API

Contract đầy đủ nằm trong [`SCHEMA.md`](SCHEMA.md) §C.8. Endpoint chính:

```text
GET  /api/locations/search
POST /api/locations/reverse
POST /api/routes/optimize
```

Response trả thứ tự tối ưu, node đã snap, khoảng cách snap, từng chặng, tổng
quãng đường/thời gian/cost, phần trăm tiết kiệm, bảo đảm tối ưu và Google
Encoded Polyline precision 5. `directions` hiện là mảng rỗng vì provider local
không có turn-by-turn.

## 5. Giao diện

- Tìm địa danh bằng autocomplete hoặc bấm trực tiếp node trên bản đồ.
- Thêm/sửa/xóa tối đa 15 điểm giao; kết quả cũ bị vô hiệu ngay khi hành trình
  đổi, response cũ đang bay về sẽ bị stale guard loại bỏ.
- Marker hiển thị `Đi`, số thứ tự điểm giao, điểm kết thúc màu riêng; tuyến khép
  kín hiển thị `Đi/Về`.
- Drawer hiển thị thứ tự tối ưu, tổng trước/sau, tỷ lệ tiết kiệm và khoảng
  cách/thời gian từng chặng.
- Loading và lỗi được hiển thị qua nút trạng thái/toast tiếng Việt.

## 6. Chạy và kiểm thử

Không có biến môi trường mới. Chạy backend/frontend như README. Các test liên
quan:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_route_planning.py -q
.\.venv\Scripts\python.exe -m pytest backend\tests\test_api.py -q -k "location or optimize_route"
Set-Location frontend
npx tsc --noEmit
```

## 7. Giới hạn và hướng mở rộng

- Autocomplete chỉ bao phủ POI/node trong snapshot, chưa phải geocoding địa chỉ
  tự do. Adapter ngoài cần API key qua environment, timeout, retry có backoff,
  quota guard và cache TTL.
- Chưa có walking/cycling graph, turn-by-turn, traffic realtime hay turn
  restrictions.
- Một shipper, tối đa 15 destination; chưa có tải trọng, time window hoặc VRP
  nhiều xe.
- Polyline nối tọa độ node của graph; graph hiện không lưu shape point chi tiết
  giữa hai node, nên đường cong có độ chi tiết theo snapshot.
- Held-Karp tăng theo `O(n²2ⁿ)`; ngưỡng `auto` ưu tiên độ trễ tương tác thay vì
  cố chạy exact đến giới hạn kỹ thuật.
