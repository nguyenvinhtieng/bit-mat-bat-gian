# HẺM 42 — CUỐC CUỐI

> Tài liệu cốt truyện và thiết kế nhiệm vụ (MVP) — dùng để tích hợp vào source game **đã có sẵn**. Không yêu cầu xây lại multiplayer, mic, lobby, join room hay hệ thống di chuyển.

## 1. Cốt truyện mở màn

**23:42. Sài Gòn. Mưa vừa tạnh.**

Ở cuối một con hẻm nhỏ, quán nước dì Bảy vẫn sáng đèn. Vài chiếc xe máy dựng sát nhau, áo khoác xanh lá vắt trên ghế nhựa, tiếng đá va vào ly cà phê nghe rõ giữa đêm khuya.

Đó là chỗ tụ họp của **CRAB** — một hội tài xế giao hàng có tiếng trong giới chạy cuốc đêm. Không phải vì nhanh nhất, cũng chẳng phải vì chuyên nghiệp nhất. Hội này chỉ có một nguyên tắc:

> **“Khách cần giao gì cũng nhận. Miễn tiền công đủ cao.”**

Đêm nay, một vị khách giấu tên tìm đến họ với lời đề nghị không ai nỡ bỏ qua: **50 triệu đồng cho một chuyến hàng duy nhất**.

Chỉ có ba điều kiện: **không mở thùng, không hỏi người gửi, giao trước khi trời sáng**.

Năm mươi triệu cho một cuốc xe. Nghe đã thấy có chuyện. Nhưng sau vài phút nhìn nhau, cả hội vẫn gật đầu. Tiền thưởng đủ để ai cũng tự nhủ: *“Chắc không sao đâu.”*

Rồi, đúng **23:42**, điện thoại của mọi người đồng loạt rung lên.

Một số lạ gửi đúng một dòng:

> **“Trong hội có công an chìm. Ổng đang giả làm tài xế CRAB.”**

Quán nước im bặt.

Người vừa hỏi đường đến kho hàng bỗng trở nên đáng nghi. Người đứng nhìn điện thoại quá lâu cũng đáng nghi. Đến ông tài xế mới ngồi im từ đầu buổi cũng bị soi, chỉ vì ổng là người duy nhất... **cài quai nón bảo hiểm đúng cách**.

Không ai biết ai đã gửi tin nhắn. Càng không ai biết chiếc áo xanh nào đang che giấu một người của lực lượng điều tra.

Trong khi cả hội tìm cách hoàn tất chuyến hàng để nhận tiền rồi giải tán, **một cảnh sát chìm đang âm thầm tìm cơ hội bắt giữ từng người**, trước khi kiện hàng biến mất khỏi Hẻm 42.

**Một chuyến hàng. Một con hẻm. Ai cũng mặc áo xanh.**

Và đêm nay, người giao hàng chưa chắc là người đến để giao hàng.

---

## 2. Tiền đề gameplay: vì sao phải làm nhiệm vụ?

Kiện hàng 50 triệu **không thể được giao ngay**. Khách giấu tên yêu cầu cả hội tự hoàn tất việc chuẩn bị: kiểm tra mã niêm phong, xác nhận địa chỉ, sắp xếp đường đi, chuẩn bị xe và nhận mật mã bàn giao. Mỗi nhiệm vụ hoàn thành giúp **tiến độ Cuốc Cuối** tăng lên. Khi đạt 100%, chuyến hàng được bàn giao và hội CRAB thắng.

Trong lúc đó, cảnh sát chìm phải **bắt giữ toàn bộ tài xế** trước khi họ hoàn tất bàn giao. Cảnh sát có thể giả vờ làm nhiệm vụ để trà trộn, nhưng việc giả vờ không làm tăng tiến độ chung.

**Lưu ý về tính hợp lý:** Nhóm tài xế biết chuyến hàng có dấu hiệu mờ ám và chủ động nhận vì tiền công lớn. Câu chuyện không khẳng định mọi người đã phạm tội; cơ chế “bắt giữ” là cách kể hài, hư cấu của trò chơi. Khi bỏ phiếu đúng cảnh sát, cả hội **lật mặt người trà trộn, hủy chuyến và giải tán trước khi bị bắt**, thay vì có quyền đuổi một công an đang thi hành công vụ.

## 3. Ba role — tất cả đều mặc đồng phục CRAB

| Role ID | Tên | Phe | Số lượng | Mục tiêu |
|---|---|---|---:|---|
| `driver` | **Tài xế CRAB** | Hội CRAB | Còn lại | Hoàn thành Cuốc Cuối hoặc lật mặt cảnh sát |
| `undercover` | **Cảnh sát chìm — Tất Xanh** | Cảnh sát | 1 | Bắt giữ toàn bộ tài xế trước khi chuyến hàng được giao |
| `veteran_driver` | **Tài xế Lão Làng** | Hội CRAB | 1 | Giúp hội tìm cảnh sát bằng lịch sử chạy nhiệm vụ |

### Tài xế CRAB

- Làm các nhiệm vụ chuẩn bị Cuốc Cuối, quan sát người khác, tham gia thảo luận và bỏ phiếu.
- Không biết danh tính cảnh sát.
- **Thoại:** “Năm mươi triệu chia đều, ai làm biếng thì đừng có nhận phần!”

### Cảnh sát chìm — Tất Xanh

- Ngoại hình như tài xế thường; có thể thực hiện **task giả** để tạo vỏ bọc nhưng không cộng tiến độ chung.
- Có hành động **bắt giữ** ở cự ly gần, cần giữ tương tác **1,5 giây**, thời gian hồi đề xuất **35 giây** sau một lần bắt thành công.
- Khi bắt thành công, mục tiêu bị đưa vào **khu tạm giữ** (chuyển sang spectator, không làm task/vote; không được tiết lộ role cho người đang chơi). Không có cơ chế giết người.
- Khi bắt, có hoạt ảnh và tiếng động để người ở gần có thể phát hiện. Không được bắt trong lúc họp.
- **Thoại:** “Cho anh kiểm tra... à, cho em xin mã đơn với!”

### Tài xế Lão Làng

- Vẫn là tài xế CRAB thật, làm nhiệm vụ và thắng/thua cùng hội.
- **Một lần mỗi trận**, chọn một người đang hoạt động khác để xem **tối đa 3 hoạt động nhiệm vụ gần nhất**: tên task, khu vực, thời điểm tương đối, trạng thái.
- **Không** thấy role, phe, danh sách bắt giữ hay nhãn “task giả”. Cảnh sát hoàn thành task giả vẫn có log như người thường.
- **Thoại:** “Chạy cuốc bao năm, nhìn cách cầm điện thoại là tao biết có mùi rồi!”

## 4. Chuỗi nhiệm vụ chính: chuẩn bị chuyến hàng 50 triệu

Mỗi nhiệm vụ dưới đây **đóng góp trực tiếp** vào việc giao kiện hàng, không còn các task ngẫu nhiên không liên quan. Đề xuất 8 lượt nhiệm vụ/ca (6 loại, có một số lượt lặp), server cấu hình được theo số người. Mỗi lượt có `taskInstanceId` riêng, chỉ cộng tiến độ một lần. Minigame thất bại được thử lại.

| # | Task ID | Nhiệm vụ | Vị trí | Minigame | Vai trò trong cốt truyện |
|---|---|---|---|---|---|
| 1 | `receive_package` | **Nhận kiện hàng bí ẩn** | Kho CRAB | Đối chiếu 3 mã trên phiếu nhận và thùng, chọn mã khớp | Xác nhận đúng kiện hàng 50 triệu |
| 2 | `check_seal` | **Kiểm tra niêm phong** | Kho CRAB | Xoay các mảnh tem để ghép mã/biểu tượng nguyên vẹn; không mở thùng | Đảm bảo kiện hàng chưa bị tráo |
| 3 | `decode_address` | **Giải mã địa chỉ giao** | Quán dì Bảy | Ghép các mẩu tin nhắn “đầu hẻm, qua tiệm sửa xe, nhà có cửa xanh” thành địa chỉ | Khách chỉ gửi chỉ dẫn mập mờ |
| 4 | `plan_route` | **Chọn đường tránh kẹt xe/ngập** | Bảng bản đồ / bãi xe | Vẽ tuyến đi qua các nút bắt buộc, tránh đường ngập và hẻm cụt | Chuẩn bị lộ trình giao trước bình minh |
| 5 | `prepare_bike` | **Chuẩn bị xe chở hàng** | Tiệm chú Tám | Bơm lốp đến vùng xanh, siết dây chằng theo thứ tự | Xe đủ an toàn để chở thùng lớn |
| 6 | `pack_disguise` | **Ngụy trang kiện hàng** | Kho CRAB | Chọn thùng ngoài, dán nhãn và xếp lớp chống sốc đúng mẫu khách yêu cầu | Kiện hàng không bị hỏng và bớt gây chú ý |
| 7 | `confirm_recipient` | **Xác minh người nhận** | Quán dì Bảy / điện thoại | Đối chiếu 4 số cuối mã nhận và câu mật khẩu với tin nhắn | Tránh giao nhầm cho người lạ |
| 8 | `handoff_package` | **Bàn giao Cuốc Cuối** | Điểm giao ở cuối hẻm | Hai bước: mang thùng tới điểm giao, nhập mã nhận đã giải được | Nhiệm vụ cuối, hoàn thành chuyến hàng |

### Quy tắc tiến độ đề xuất

- **7 nhiệm vụ chuẩn bị** đóng góp vào thanh `deliveryPreparation` (0–100%).
- `handoff_package` chỉ mở khi các điều kiện chuẩn bị bắt buộc hoàn tất; **hoàn thành bàn giao mới tính hội CRAB thắng**, tránh chuyện thanh tiến độ đầy là thắng dù kiện hàng vẫn ở kho.
- Để tạo teamwork, một số nhiệm vụ có thể lặp theo lượt (ví dụ xác minh 2 mã, chuẩn bị 2 xe), nhưng tránh buộc mọi người chờ một người duy nhất.
- Nếu người mang thùng bị bắt, thùng rơi tại vị trí bắt và người khác có thể nhặt tiếp. **Không mất toàn bộ tiến độ**.
- Cảnh sát có thể diễn minigame, nhưng không được tự kích hoạt bàn giao thắng cho phe CRAB.

### Chi tiết hài gắn với task

- Nhận kiện hàng: “50 triệu mà thùng nhẹ như hộp bánh trung thu?”
- Niêm phong: “Đã dặn không mở mà ông còn hỏi bên trong có gì!”
- Giải mã địa chỉ: “Nhà có cửa xanh. Trong hẻm này mười hai nhà cửa xanh!”
- Lên lộ trình: “App kêu quẹo phải, bên phải là cái mương.”
- Chuẩn bị xe: “Chở 50 triệu mà xe còn nợ tiền thay nhớt.”
- Ngụy trang: “Dán chữ HÀNG DỄ VỠ to vậy càng đáng nghi!”
- Xác minh người nhận: “Mật khẩu là ‘không biết gì hết’. Ủa sao nghe quen?”
- Bàn giao: “Giao xong nhớ đánh giá tài xế năm sao nha anh!”

## 5. Vòng chơi và điều kiện thắng

1. **Nhận role bí mật.** Tất cả xuất hiện như tài xế CRAB.
2. **Chuẩn bị Cuốc Cuối.** Hội làm task, cảnh sát trà trộn và bắt giữ từng người, Lão Làng có thể soi lịch sử task.
3. **Họp và bỏ phiếu.** Tái sử dụng cơ chế có sẵn. Bỏ phiếu đúng cảnh sát => hội thắng do lật mặt và giải tán; bỏ phiếu sai => người bị loại không tham gia tiếp.
4. **Cao trào.** Hội hoàn thành chuẩn bị và tìm cách bàn giao thùng; cảnh sát tìm cách bắt những người còn lại.

**Hội CRAB thắng khi:** (a) hoàn tất bàn giao kiện hàng; hoặc (b) bỏ phiếu đúng cảnh sát chìm.

**Cảnh sát thắng khi:** toàn bộ tài xế phe CRAB đã bị bắt/loại và không còn ai có thể bàn giao.

**Timeout:** Nếu source có giới hạn thời gian, đề xuất khi hết giờ mà chưa bàn giao, chuyến hàng bị hủy và cảnh sát thắng; nên playtest để tránh quá lợi cho cảnh sát.

**Quan trọng về cân bằng:** 1 cảnh sát bắt cả hội là nhiệm vụ khó. Nên cho phép bắt giữ theo nhịp nhanh vừa phải (ví dụ 35s cooldown) và thiết kế các góc khuất trong hẻm; đồng thời task không được hoàn tất quá nhanh. Không tạo cơ chế “bắt toàn bộ” chỉ bằng một nút diện rộng.

## 6. Các địa điểm trên map

- **Quán dì Bảy:** điểm tụ tập, nhận tin nhắn khách, giải mã địa chỉ, xác minh người nhận, họp.
- **Kho CRAB:** nhận kiện, kiểm tra tem, ngụy trang, lấy thùng.
- **Tiệm chú Tám:** chuẩn bị xe.
- **Bãi giữ xe / bảng đường:** lên lộ trình.
- **Hẻm cuối:** điểm bàn giao và khu vực rượt đuổi cao trào.
- **Phòng tạm giữ:** nơi hiển thị người đã bị bắt (spectator); không cho người bị bắt tiết lộ vị trí cảnh sát cho người còn sống qua voice chat nếu source hỗ trợ tách voice channel.

Nếu map hiện tại khác các địa điểm trên, **ưu tiên tận dụng map đang có**, đặt lại điểm tương tác thay vì dựng map mới.

## 7. Một trận mẫu

**6 người:** Tư, Sáu, Bảy, Tám, Chín, Út. Sáu là cảnh sát; Tư là Tài xế Lão Làng.

1. Cả nhóm nhận tin về kiện hàng 50 triệu. Tư và Bảy chạy vào kho đối chiếu mã; Chín đi chuẩn bị xe.
2. Sáu giả vờ kiểm tra niêm phong, nhưng không đóng góp tiến độ. Sau đó Sáu lén bắt Út ở hành lang khuất.
3. Mọi người nhận ra Út biến mất khỏi cuộc chạy đơn. Tám kể vừa thấy Sáu đi ra từ hành lang.
4. Tư dùng kỹ năng soi Sáu: lịch sử có “Kiểm tra niêm phong — hoàn thành”. Điều đó **không chứng minh Sáu vô tội**, vì cảnh sát có thể giả làm task.
5. Trong cuộc họp, Sáu nói “Tui đi kiểm tra thùng mà!”, Tám phản bác “Vậy sao lúc nãy ông không cầm phiếu?”
6. Nếu cả hội bỏ phiếu đúng Sáu, họ giải tán và thắng. Nếu sai, Sáu tiếp tục bắt người trong lúc nhóm cố hoàn tất mật khẩu bàn giao.

## 8. Yêu cầu cho AI coding agent

> Source game **đã có** multiplayer, join room, microphone/voice chat và các hệ thống nền. Đọc source trước. **Không tạo project mới, không viết lại các hệ thống có sẵn.** Chỉ tích hợp cốt truyện “HẺM 42 — CUỐC CUỐI”, đúng 3 role, 8 nhiệm vụ liên quan trực tiếp đến chuyến hàng, kỹ năng Tài xế Lão Làng, bắt giữ của cảnh sát, tiến độ chuẩn bị/bàn giao và điều kiện thắng. Tái sử dụng UI, interaction, meeting/vote và game state hiện có. Nếu thiếu hook thì bổ sung tối thiểu. Không tự thêm role, phe, kill hoặc hệ thống thu thập chứng cứ độc lập.

### Checklist triển khai

- [ ] Role bí mật: `driver`, `undercover`, `veteran_driver`.
- [ ] Cảnh sát có thể bắt giữ từng người; người bị bắt không vote, chỉ "gọi đàn em" làm nốt task của mình (không cầm/bàn giao hàng); có hiệu ứng bắt và cooldown.
- [ ] Cảnh sát có thể làm task giả nhưng không cộng tiến độ.
- [ ] Lão Làng soi tối đa 3 task gần nhất của 1 người, chỉ một lần/trận, không đọc role.
- [ ] Task chuẩn bị đều liên quan tới kiện hàng 50 triệu và có minigame cụ thể.
- [ ] Chỉ bàn giao thành công mới kích hoạt thắng theo nhiệm vụ.
- [ ] Bỏ phiếu đúng cảnh sát => hội thắng; loại hết hội => cảnh sát thắng.
- [ ] Không làm hỏng mic, join room, multiplayer và movement hiện có.
- [ ] Dữ liệu role/kỹ năng bí mật không được broadcast công khai.

---

*Thông số minigame, số nhiệm vụ, cooldown và thời lượng là đề xuất để playtest, không phải giới hạn cố định.*
