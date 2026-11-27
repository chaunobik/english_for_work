# English for Work — 182 ngày

Ứng dụng tự học tiếng Anh giao tiếp công việc, miễn phí, từ Excel Optimized Edition. Học liệu gồm 182 ngày, 156 ngày chính, 1.000 từ, 390 cụm, 78 tình huống và 26 đề. Mỗi ngày dự kiến 120 phút học chính và 20 phút từ vựng bổ sung.

## Cách dùng
- Trang chủ: chọn bài tiếp theo; lộ trình mở được mọi ngày.
- Bài học: làm theo từng kỹ năng, mở học liệu, ghi chú và đánh dấu.
- Từ vựng: sàng lọc theo ngày, lật thẻ, tự đánh giá, ôn đến hạn, tra cứu và quiz.
- Kiểm tra: tự nhập điểm theo rubric; không quy đổi thành chứng chỉ CEFR.
- Tiến độ: xuất JSON sao lưu, nhập để khôi phục. Không tự đồng bộ nhiều thiết bị.
- Ghi âm trên thiết bị, tải về nếu muốn giữ. Không nhập dữ liệu mật của công ty.

## Chạy cục bộ
```sh
python -m http.server 8000
```
Mở http://localhost:8000 (không mở index.html bằng file:// vì dữ liệu được fetch từ JSON).

## QA
```sh
npm test
pip install playwright==1.56.0
python -m playwright install --with-deps chromium
CHROMIUM_PATH="$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')" python tests/browser.py
```
Xem docs/SRS-QA.md và GitHub Actions. Không merge trước khi QA bắt buộc PASS. Học liệu audio/video bên ngoài, IPA và CEFR vẫn có giới hạn kiểm chứng từ Excel; kết quả học thực tế không được đảm bảo.

## Nguồn
NGSL/NGSL-Spoken/BSL: Charles Browne, Brent Culligan, Joseph Phillips; https://www.newgeneralservicelist.com/ — dữ liệu phái sinh từ các danh sách được ghi công và giữ CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). IPA tham chiếu CMUdict (https://github.com/cmusphinx/cmudict/blob/master/LICENSE); không phải IPA chính thức Cambridge. Website chỉ liên kết tới các nguồn bên ngoài. Xem trang Nguồn & QA.
