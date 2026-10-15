# Bịt Mắt Bắt Gian: Truy Tìm Kẻ Gian Giữa Di Sản Việt

> **Thể loại:** trốn chạy · nhiệm vụ văn hoá · tìm kẻ sát nhân (kiểu Among Us, đơn giản).
> Cốt truyện / nhiệm vụ theo địa điểm nằm trong `map/*.md`. Không còn cơ chế điều tra bằng manh mối.

## 1. Ý tưởng cốt lõi

Mỗi map là một địa điểm văn hoá Việt Nam. Người chơi là đoàn người đang chuẩn bị một sự kiện ở đó. Một (hoặc hai) người trong đoàn thực ra là **kẻ sát nhân** và sẽ hạ gục từng người. Những người còn lại vừa **làm nhiệm vụ** (mini-game về chủ đề của map), vừa **né tránh** và **tìm ra kẻ sát nhân** qua các cuộc họp bỏ phiếu.

Sau mỗi nhiệm vụ, người chơi được học một điều thật về địa điểm (hiện ở màn hình nhiệm vụ và màn hình kết thúc).

## 2. Vòng chơi

1. Mỗi người nhận một vai bí mật. Mỗi người có 3–4 nhiệm vụ ngẫu nhiên (kẻ sát nhân có danh sách giả).
2. **Khám phá:** chạy giữa các phòng, làm mini-game ở các trạm. Thanh tiến độ là tổng nhiệm vụ thật của phe Người Dân. Hồn ma vẫn làm được nhiệm vụ.
3. **Hạ gục:** kẻ sát nhân lại gần một người rồi bấm Hạ gục (tầm ~84px, hồi 25s, lần đầu 15s). Nạn nhân thành hồn ma và để lại thi thể.
4. **Báo cáo / họp khẩn:** thấy thi thể thì báo cáo; hoặc rung chuông ở bàn họp (mỗi người 1 lần).
5. **Họp:** chat + bỏ phiếu loại một người (hoặc bỏ qua). Nhiều phiếu nhất bị loại; hoà phiếu → không ai bị loại. Kết quả cho biết người bị loại có phải kẻ sát nhân không.
6. Lặp lại tới khi có người thắng.

## 3. Điều kiện thắng

- **Người Dân:** loại hết Âm Binh, **hoặc** hoàn thành toàn bộ nhiệm vụ.
- **Âm Binh:** số Âm Binh còn sống ≥ số Người Dân còn sống.

## 4. Role (đơn giản, 3 vai)

| Role | Phe | Năng lực |
|------|-----|----------|
| **Nghệ Nhân Cố Đô** | Người Dân | Không có; làm nhiệm vụ, quan sát, bỏ phiếu |
| **Lính Ngự Lâm** | Người Dân | Một lá chắn: chặn đòn hạ gục đầu tiên (cả hai cùng biết) |
| **Âm Binh** | Sát nhân | Hạ gục (có hồi chiêu). Có danh sách nhiệm vụ giả. Biết đồng bọn |

Số Âm Binh: 1 (2–7 người), 2 (8–10 người). Lính Ngự Lâm xuất hiện khi có ≥3 Người Dân.

Role dùng chung cho mọi map; map chỉ đổi tên khu vực, nhiệm vụ và kiến thức.

## 5. Nguyên tắc nội dung

- Kiến thức văn hoá phổ biến, tích cực, có thể kiểm chứng (UNESCO, ẩm thực, nghề thủ công…).
- Truyền thuyết phải gắn nhãn truyền thuyết. Tránh tranh luận lịch sử nhạy cảm.
- Mỗi nhiệm vụ ≤ ~20 giây, dễ hiểu với người chơi quốc tế, có một "Bạn có biết?" ngắn.
- Giọng điệu: hơi căng thẳng nhưng vẫn ấm áp, tôn trọng văn hoá.

## 6. Danh sách map

| File | Địa điểm | Trạng thái |
|------|----------|------------|
| [`map/co-do-hue.md`](map/co-do-hue.md) | Cố đô Huế — *Năm Canh Trước Bình Minh* (Đêm Ban Sóc) | **Có** |
| `pho-co-hoi-an` | Phố cổ Hội An — Đêm rằm đèn lồng | Kế hoạch |
| `ha-noi-am-thuc` | Hà Nội — Phiên chợ ẩm thực | Kế hoạch |
| `dong-bang-song-cuu-long` | ĐBSCL — Chợ nổi | Kế hoạch |
| `vinh-ha-long` | Vịnh Hạ Long — Đêm trên vịnh | Kế hoạch |
