# BASKETBALL TACTICAL LAB

> **Hệ thống sa bàn chiến thuật & mô phỏng phòng thủ 5v5 tương tác**  
> Cho phép người dùng điều khiển các bài chạy tấn công và quan sát sự tương tác, biến đổi vị trí và tái lập khối phòng thủ (Team Defensive Shape) tự động theo thời gian thực.

---

## 1. Giới thiệu tổng quan

**BASKETBALL TACTICAL LAB** được thiết kế như một phần mềm huấn luyện chiến thuật chuyên nghiệp dành cho HLV bóng rổ, chuyên gia phân tích và người học chiến thuật. 

Dự án tuân thủ triệt để các nguyên tắc cốt lõi:
- **Không sử dụng tên thật hoặc tên giả tưởng:** 10 cầu thủ chỉ định danh bằng 5 vị trí bóng rổ chuẩn mực: `PG`, `SG`, `SF`, `PF`, `C`.
- **Không có chỉ số cá nhân:** Không có Speed, Stamina, Shooting Rating, OVR,... Tất cả cầu thủ là quân cờ chiến thuật bình đẳng về thể chất.
- **Tính tất định (Deterministic Engine):** Phản ứng phòng thủ hoàn toàn dựa trên tọa độ bóng, vị trí tấn công, bài chạy, hệ thống phòng thủ và các tham số chiến thuật.
- **Xem trước trực tiếp (Live Preview):** Kéo thả bất kỳ thanh trượt phòng thủ nào sẽ cập nhật hình thái đội hình ngay lập tức.

---

## 2. Kiến trúc dự án (Architecture)

```
src/
├── config/
│   └── constants.ts              # Cấu hình dự án, kích thước sân chuẩn hóa (0-100), tham số mặc định
├── types/
│   └── basketball.ts             # Toàn bộ định nghĩa TypeScript (Position, Strategy, Event, Snapshot)
├── engine/
│   ├── geometry/
│   │   ├── courtGeometry.ts      # Toán học vector, khoảng cách, passing lanes, spacing check, screenToCourt
│   │   └── zones.ts              # Phân vùng sân (Paint, Wings, Corners, High Post,...)
│   ├── defense/
│   │   ├── DefenseStrategy.ts    # Interface Strategy Pattern cho phòng thủ
│   │   ├── manToMan.ts           # Chiến thuật Man-to-Man (Screen Stay/Switch/Auto, Help, Denial)
│   │   ├── zone23.ts             # Chiến thuật 2-3 Zone (Ball-side shift, Corner rotation, Cutter handoff)
│   │   ├── zone32.ts             # Chiến thuật 3-2 Zone (Phong tỏa perimeter, Bottom corner closeout)
│   │   ├── zone131.ts            # Chiến thuật 1-3-1 Zone (Mô hình kim cương, Baseline runner)
│   │   ├── rebalance.ts          # Bộ chuyển đổi tham số (Height, Width, Compactness, Pressure, Help, Shell)
│   │   └── index.ts              # Registry chiến thuật phòng thủ
│   └── simulation/
│       └── tacticalEngine.ts     # Bộ máy thực thi bài chạy tấn công & tính toán phản ứng phòng thủ
├── state/
│   └── useGameStore.ts           # Centralized Zustand Store với Undo/Redo/Reset snapshots
├── tactics/
│   ├── offense/
│   │   └── formations.ts         # 5-Out, 4-Out 1-In, 3-Out 2-In, Horns, Box, Stack & Custom
│   └── defense/
│       └── defaults.ts           # Mô tả và metadata hệ thống phòng thủ
├── components/
│   ├── court/
│   │   ├── BasketballCourt.tsx   # Sân bóng SVG tương tác chính, drag-and-drop & click-to-move
│   │   ├── CourtLines.tsx        # Vạch sân chuẩn NBA/FIBA (Vành rổ, Sơn, 3P, Vòng tròn giao bóng)
│   │   ├── PlayerMarker.tsx      # Điểm đánh dấu cầu thủ (PG, SG, SF, PF, C)
│   │   ├── TacticalPath.tsx      # Vẽ đường di chuyển, chuyền, dribble, screen, roll
│   │   ├── PassingLanesOverlay.tsx # Overlay tính toán đường chuyền (Open / Contested / Blocked)
│   │   └── ZoneOverlay.tsx       # Overlay vùng sân ngữ nghĩa
│   ├── offense/
│   │   └── OffensePanel.tsx      # Bảng điều khiển tấn công, chọn đội hình & hành động
│   ├── defense/
│   │   └── DefensePanel.tsx      # Bảng điều khiển phòng thủ, 6 thanh trượt Live Preview & giải thích
│   ├── timeline/
│   │   └── TacticalTimeline.tsx  # Dòng thời gian, Play/Pause, Undo/Redo, Speed control
│   └── header/
│       └── Header.tsx            # Thanh tiêu đề, Tactical Status Bar, Modal hướng dẫn
├── tests/
│   ├── tactics.test.ts           # Unit tests kiểm tra đội hình, thanh trượt, switch, zones, boundaries
│   └── history.test.ts           # Unit tests kiểm tra Undo, Redo, Reset
├── App.tsx                       # Bố cục 3 cột Desktop & Tab Responsive Mobile
└── main.tsx
```

---

## 3. Cơ chế hoạt động của mô phỏng phòng thủ (Defensive Simulation)

Mô hình turn-based tương tác:

$$\text{User Action} \longrightarrow \text{Offense Movement} \longrightarrow \text{Event Detection} \longrightarrow \text{Defense Reaction} \longrightarrow \text{Rebalance Shape}$$

### 6 Tham số chiến thuật cốt lõi:
1. **Chiều cao đội hình (Defensive Height):** Điều chỉnh độ cao của hàng rào phòng ngự rời xa rổ (về hướng vạch 3 điểm và giữa sân).
2. **Độ rộng đội hình (Defensive Width):** Tỷ lệ co giãn vị trí theo trục X so với trung tâm $X = 50$.
3. **Compactness:** Mức độ kéo các hậu vệ không kèm bóng (Off-ball) về tâm khối phòng ngự và khu vực sơn để thu hẹp cự ly hỗ trợ.
4. **Pressure:** Khoảng cách tiếp cận người cầm bóng (On-Ball Gap: từ 12 đơn vị khi sag-off đến 3.5 đơn vị khi kèm rát).
5. **Help Defense:** Mức độ hậu vệ yếu cánh rời vị trí để bước vào nách sơn chặn đường drive.
6. **Ball-side Shift:** Độ lệch toàn khối phòng ngự (Shell Shift) về phía có bóng.

### 4 Hệ thống phòng thủ:
- **Man-to-Man:** Kèm 1-1, hỗ trợ tam giác Ball-You-Man, xử lý Screen thông minh:
  - `Stay`: Giữ nguyên người kèm.
  - `Switch`: Hoán đổi phân công kèm người ngay khi chạm cản.
  - `Auto`: Tự động switch nếu khoảng cách giữa cản và bóng $\le 14$ đơn vị.
- **2-3 Zone:** 2 trên, 3 dưới. Xử lý triệt để góc sân (Corner Closeout), Sink cánh, neo giữ cọc rổ và bàn giao cắt người (Zone Cutter Handoff).
- **3-2 Zone:** 3 trên, 2 dưới. Ưu tiên vòng ngoài perimeter, kéo Bigman ra góc khi bóng xuống Corner và trượt Bigman còn lại qua bảo vệ rổ.
- **1-3-1 Zone:** 1 Point, 3 Middle, 1 Baseline runner. Hình thái kim cương đặc trưng, bẫy trap cánh và quét đường đáy.

---

## 4. Hướng dẫn chạy dự án

### Yêu cầu:
- Node.js $\ge 20$
- npm $\ge 10$

### Cài đặt và khởi chạy:
```bash
# 1. Chuyển vào thư mục dự án
cd C:\Users\tranm\.gemini\antigravity\scratch\basketball-tactical-lab

# 2. Cài đặt dependencies (nếu chưa cài)
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev

# Mở trình duyệt tại: http://127.0.0.1:5173/
```

### Chạy kiểm thử tự động (Automated Tests):
```bash
# Chạy Unit Tests bằng Vitest
npm test

# Chạy kiểm thử trình duyệt End-to-End bằng Playwright
node test-e2e.mjs
```

---

## 5. Kết quả kiểm thử & QA

- **17 Unit Tests** kiểm thử toàn diện các module hình học, đội hình, thanh trượt, screen switch, zones, ranh giới sân và Undo/Redo.
- **11 Kịch bản Browser E2E Tests** trên Microsoft Edge không phát sinh bất kỳ lỗi console nào:
  1. Tải ứng dụng thành công, đủ 10 cầu thủ và bóng.
  2. Đổi sang đội hình Horns mượt mà.
  3. Đổi sang 2-3 Zone với hình thái chuẩn.
  4. Kéo thanh trượt Width mở rộng cánh.
  5. Kéo thanh trượt Height dâng cao hàng thủ.
  6. Chuyền bóng PG $\to$ SG, chuyển giao quyền kiểm soát và Zone shift.
  7. SG Drive Right kích hoạt Help defense và xoay người bảo vệ rổ.
  8. Man-to-Man Screen Switch hoán đổi kèm người giữa C và PG.
  9. Undo và Redo khôi phục chính xác trạng thái sa bàn.
  10. Reset vị trí khôi phục đội hình ban đầu mà không mất timeline.
  11. Chế độ xem Mobile (390px) phân chia tab Tấn công / Sa bàn / Phòng thủ mượt mà.
