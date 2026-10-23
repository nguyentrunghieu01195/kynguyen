# Kỷ Nguyên Huyền Thoại — Mã nguồn

Game nhập vai cày cuốc (kiểu MU) chạy trên trình duyệt PC và điện thoại. Viết bằng JavaScript thuần (ES Modules) + Canvas 2D, đóng gói bằng Vite.

## Chạy & build

```bash
npm install
cd server && npm install && cd ..   # cài thư viện cho máy chủ
npm start              # build game + chạy máy chủ tại http://localhost:8787 (chơi trực tuyến)
npm run dev            # chạy thử tại http://localhost:5173 (tự tải lại khi sửa code)
npm run build          # ra dist/index.html — game gói gọn 1 file
npm run build:design   # ra dist-design/design.html — trang Design Sheet
```

## Kiến trúc: 5 tầng, phụ thuộc một chiều

```
config/  →  core/  →  systems/  →  render/  →  ui/  →  main.js
(dữ liệu)  (nền tảng)  (luật chơi)   (vẽ)      (giao diện)  (khởi động)
```

Tầng dưới **không bao giờ** gọi tầng trên. Riêng `systems/` không chạm vào DOM hay canvas, nên sau này có thể chuyển nguyên khối lên server Node.js để làm bản nhiều người chơi.

| Thư mục | Vai trò | Ai thường sửa |
|---|---|---|
| `src/config/` | Dữ liệu tĩnh: class, bản đồ, quái, vật phẩm, **mọi con số cân bằng** (`balance.js`) | Game designer |
| `src/core/` | Trạng thái toàn cục `G`, event bus, lưu/tải game, hàm tiện ích | Lập trình viên lõi |
| `src/systems/` | Luật chơi: chỉ số, chiến đấu, rơi đồ, AI quái, ép đồ, reset, cửa hàng | Lập trình viên gameplay |
| `src/render/` | Toạ độ isometric, camera, ghép cảnh; `render/art/<bộ>/` là các bộ đồ hoạ | Lập trình viên đồ hoạ / họa sĩ kỹ thuật |
| `src/ui/` | HUD, các bảng (mỗi bảng 1 file), điều khiển, màn hình bắt đầu | Lập trình viên UI |
| `src/design/` | Trang Design Sheet để duyệt đồ hoạ | Họa sĩ |
| `src/net/` | Kết nối máy chủ: hiện diện, chat, xếp hạng | Lập trình viên mạng |
| `server/` | Máy chủ Node.js (HTTP + WebSocket) | Lập trình viên backend |

### Trạng thái (`core/state.js`)

- `G.S`: dữ liệu nhân vật được lưu (cấp, chỉ số, đồ, ngọc…).
- `G.P`: chỉ số tính ra từ `S` bằng `calcStats()`, không lưu.
- `G.R`: thế giới đang chạy (quái, vật rơi, hiệu ứng). Được tạo lại khi vào bản đồ.

### Giao tiếp giữa các tầng

`systems/` phát sự kiện qua `core/events.js` (`log`, `announce`, `levelUp`, `kill`…), còn `ui/hud.js` lắng nghe và hiển thị. Nhờ vậy logic không biết gì về giao diện.

## Việc thường gặp

| Muốn… | Sửa ở đâu |
|---|---|
| Đổi tỉ lệ rơi đồ, EXP, giá, tỉ lệ ép | `config/balance.js` |
| Thêm bản đồ / quái | Thêm object vào `config/maps.js` |
| Thêm class nhân vật | `config/classes.js` (kèm `STAT_FORMULA`), thêm bộ kỹ năng trong `config/skills.js` (`SKILL_LIST`, `CLASS_TIERS`) + hàm trong `systems/skills.js` (`SKILL_FN`), cách vẽ trong `render/art/*/hero.js` |
| Thêm bảng giao diện | Tạo file trong `ui/panels/` (gồm `render()` và `actions`), đăng ký trong `ui/panels/index.js` |
| Thêm bộ đồ hoạ mới | Tạo thư mục `render/art/<tên>/` export đúng interface (xem `render/art/index.js`), rồi đăng ký vào `ART_PACKS` |
| Sửa nhiệm vụ, điểm danh, thưởng offline | `config/quests.js` (dữ liệu) và `systems/quests.js`, `systems/offline.js` (logic) |
| Sửa sự kiện (lịch, độ khó, thưởng, vé) | `config/events.js` (dữ liệu) và `systems/events.js` (luật chơi) |
| Sửa Tháp Vô Tận (cấp quái, thưởng, lượt/ngày, hiệu ứng tầng) | `config/tower.js` (dữ liệu) và `systems/tower.js` (luật chơi) |
| Thêm loại vũ khí / bộ giáp / hiệu ứng bộ | `config/gear.js` (dữ liệu), cách vẽ trong `render/art/v2/gear.js` |
| Thêm món thời trang | `config/fashion.js` (dữ liệu & điều kiện mở khóa), cách vẽ trong `render/art/v2/gear.js` |
| Sửa kỹ năng (sát thương, hồi chiêu, điều kiện học, chi phí nâng cấp) | `config/skills.js` |
| Đổi bộ đồ hoạ mặc định | `CFG.ART_STYLE` trong `config/constants.js` |

## Bộ đồ hoạ

- `classic`: phong cách bản thử nghiệm đầu tiên.
- `v2` (mặc định): phong cách "Chibi Dark Fantasy", đã duyệt. Gồm `kit.js` (bút vẽ, tông màu), `hero.js`, `monsters.js`, `environment.js`, `items.js` (icon và đồ rơi), `fx.js`.

Có thể chuyển qua lại giữa hai bộ ngay trong game: **Cài đặt → Đồ hoạ**.

## Hệ thống giữ chân người chơi

- **Nhiệm vụ chính tuyến**: 22 nhiệm vụ dẫn từ cấp 1 tới lần Reset đầu tiên.
- **Nhiệm vụ hằng ngày**: chọn 5 trong 8 nhiệm vụ, đổi mới lúc 0 giờ. Mỗi nhiệm vụ cho điểm năng động, đủ điểm mở được 3 rương.
- **Điểm danh**: chu kỳ 7 ngày, bỏ lỡ không mất chuỗi, Zen tăng dần qua mỗi chu kỳ.
- **Cày offline**: tối đa 8 giờ, hiệu suất 50%. Tính theo sát thương thật của nhân vật; EXP giảm nếu quái quá yếu so với cấp.

Tiến độ nhiệm vụ được cập nhật bằng cách lắng nghe sự kiện (`EV.KILL`, `EV.UPGRADE`…), nên thêm loại mục tiêu mới chỉ cần phát thêm sự kiện từ hệ thống tương ứng.

## Sự kiện theo giờ

| Sự kiện | Lịch mở cổng | Luật chơi |
|---|---|---|
| 🏰 Huyết Lâu | Phút :00 và :30 mỗi giờ, mở 5 phút | Hạ 30 quái để phá phép bảo hộ, phá Cổng Thành, rồi hạ Huyết Ma Vương trong 8 phút. Còn dư nhiều thời gian thì thưởng thêm. |
| 😈 Quảng Trường Quỷ | Phút :15 và :45 mỗi giờ, mở 5 phút | Sống sót qua 4 đợt quỷ trong 6 phút, đợt cuối có boss. Điểm càng cao thì thưởng càng lớn. |

- Mỗi lần vào tốn 1 vé. Vé có từ: rơi từ quái (0,4%), Cửa hàng, điểm danh ngày 3 và ngày 5, rương năng động 100 điểm.
- Quái trong sự kiện luôn có cấp bằng cấp người chơi cộng 2–3 nên lúc nào cũng vừa sức.
- Sự kiện diễn ra trong một đấu trường riêng (`makeRuntime` trong `systems/world.js`) có giới hạn vùng đi lại (`R.bounds`).
- **Cài đặt → Chế độ thử** cho phép vào sự kiện bất cứ lúc nào, không cần chờ giờ.

## Tháp Vô Tận (cho người chơi cấp cao)

- **Mở khóa:** cấp 100 hoặc đã Reset ít nhất 1 lần. Mỗi ngày có 3 lượt leo.
- **Một lượt leo:** leo liên tiếp nhiều tầng; mỗi tầng phải hạ hết quái trong 90 giây (tầng boss được 120 giây). Vượt tầng được hồi 30% HP/MP, nghỉ 3 giây rồi lên tầng tiếp. Gục ngã hoặc hết giờ thì lượt leo kết thúc, nhưng phần thưởng các tầng đã vượt vẫn được giữ.
- **Cấp quái cố định theo tầng:** cấp 95 + 5 × số tầng (tầng 1 là cấp 100, tầng 20 là cấp 195), máu tăng thêm 2% mỗi tầng. Vì không phụ thuộc cấp người chơi nên tháp đo đúng sức mạnh thật.
- **Boss và hiệu ứng:** cứ 5 tầng có boss. Tầng chia hết cho 3 có hiệu ứng: Cuồng Phong, Giáp Đá, Cuồng Nộ, Bầy Đàn.
- **Điểm xuất phát:** mốc 5 tầng gần nhất đã vượt được lưu lại; lần sau bắt đầu từ mốc đó.
- **Thưởng:** vượt tầng lần đầu được thưởng đầy đủ; mỗi 5 tầng có thêm ngọc, mỗi 10 tầng có đồ Hoàn Hảo và Bùa Bảo Hộ. Vượt lại tầng cũ chỉ được 20% Zen và 30% EXP.
- **Kỹ thuật:** tháp dùng chung hạ tầng khu vực riêng với sự kiện (`R.event` có `handler` gồm `update`, `onKill`, `onDeath`, `leave`, `hud`). Có thể thêm loại khu vực mới theo cùng cách này.

## Chơi trực tuyến (máy chủ)

Máy chủ (`server/`) là Node.js + WebSocket. Nó phục vụ luôn file game nên chỉ cần **1 cổng**: mở `http://địa-chỉ:8787` là vào game và tự kết nối.

| Tính năng | Cách hoạt động |
|---|---|
| Tài khoản | **Đăng ký / đăng nhập** (tên đăng nhập + mật khẩu) ở màn hình bắt đầu. Không đăng nhập vẫn chơi được như khách (máy chủ cấp mã `token` lưu trong trình duyệt). Tên nhân vật trùng thì tự thêm số. |
| Thấy nhau trên bản đồ | Mỗi bản đồ là một phòng (`m0`…`m9`). Vị trí gửi 5 lần/giây, máy chủ gom và phát lại 10 lần/giây. Client nội suy để chuyển động mượt. Trong sự kiện hoặc Tháp thì không ai thấy ai. |
| Chat thế giới | Tối đa 120 ký tự, mỗi người cách nhau 1,5 giây. Lưu 50 tin gần nhất. |
| Thông báo hệ thống | Ép +9 trở lên, chế cánh cấp 2–3, hạ Boss, Reset, xong sự kiện, mỗi 5 tầng tháp. Client chỉ gửi loại thành tích, câu chữ do máy chủ soạn nên không chèn nội dung bậy được. |
| Bảng xếp hạng | Cấp & Reset, Tháp, Lực chiến; top 20, cập nhật mỗi 10 giây. Xem tại `/api/rank`. |
| Lưu dữ liệu | Hồ sơ lưu trong `server/data/players.json` (ghi nguyên tử, 2 giây/lần). Khi đông người thì thay `server/src/store.js` bằng PostgreSQL. |

**Chống gian lận:** người chơi có tài khoản chơi ở **chế độ máy chủ quyết định** (xem mục bên dưới) — chiến đấu, rơi đồ, ép đồ, Zen… đều do máy chủ tính. Người chơi khách vẫn chơi trên máy mình nên **không được xếp hạng** và không dùng được chợ.

### Đưa lên mạng (để chơi trên điện thoại)

Trên iPhone, file `.html` mở trong app Claude hoặc app Tệp **không chạy được code**, nên phải mở game qua một đường link web.

| Cách | Đăng nhập / lưu máy chủ | Chơi trực tuyến | Ghi chú |
|---|---|---|---|
| **VPS + Docker** (khuyên dùng) | ✔ | ✔ | Cần 1 VPS (~100–150k/tháng) và 1 tên miền. HTTPS tự động. |
| **GitHub Pages** | chỉ khi có máy chủ riêng | chỉ khi có máy chủ riêng | Miễn phí, chỉ chứa file game. Chơi khách, lưu trên máy. |

**VPS + Docker (có HTTPS):**

1. Trỏ tên miền (vd. `game.tenmien.com`) về IP của VPS.
2. Chép mã nguồn lên VPS, sửa `DOMAIN` và `ADMIN_PASSWORD` trong `docker-compose.yml`.
3. Chạy `docker compose up -d --build`. Mở `https://game.tenmien.com` là vào game; dữ liệu tài khoản nằm trong volume `kng-data` (giữ nguyên khi cập nhật).
4. Cập nhật bản mới: chép mã mới lên rồi chạy lại `docker compose up -d --build`.

Không có tên miền: `docker build -t kynguyen . && docker run -d -p 80:8787 -v kng-data:/data --restart unless-stopped kynguyen` rồi mở `http://IP-máy-chủ`
(chơi và đăng nhập được, nhưng **không cài lên màn hình chính** được vì thiếu HTTPS).

**GitHub Pages:** tạo repo Public → tải lên các file trong thư mục `dist/` (`index.html`, `manifest.webmanifest`, `sw.js`, `favicon.png`, thư mục `icons/`) → **Settings → Pages** → Branch `main` → Save.
Muốn đăng nhập thì ở form đăng nhập nhập địa chỉ máy chủ (phải là `https://`, vì trang GitHub Pages là HTTPS).

- **VPS không dùng Docker:** `npm ci && npm run build && cd server && npm ci && cd .. && PORT=8787 node server/src/index.js`. Nên dùng `pm2` để giữ tiến trình chạy, và Nginx/Caddy để có HTTPS. Có HTTPS thì client tự dùng `wss://`.
- **Biến môi trường:** `PORT` (mặc định 8787), `DATA_DIR` (thư mục lưu dữ liệu), `DIST_DIR` (thư mục chứa file game), `ADMIN_PASSWORD` (bật trang `/admin`), `BACKUP_HOURS`, `BACKUP_KEEP`.
- **Mở file game trực tiếp (không qua máy chủ):** vẫn chơi được ngoại tuyến. Muốn chơi trực tuyến thì vào **Cài đặt → Trực tuyến** nhập `ws://địa-chỉ:8787/ws`.

## Trang bị mở rộng & Thời trang

- **10 loại vũ khí** (`config/gear.js → WEAPON_TYPES`):
  - Kiếm Sĩ: Kiếm, Rìu, Chùy, Thương
  - Pháp Sư: Trượng, Quả Cầu, Sách Phép
  - Xạ Thủ: Cung, Nỏ, Song Cung

  Mỗi loại có chỉ số riêng (sát thương, tốc đánh, tầm, sát thương kỹ năng, số mũi tên…). Món đồ lưu loại vũ khí ở trường `wt`.
- **12 bộ giáp** (`ARMOR_SETS`): mỗi bậc có 2 dòng, món đồ lưu dòng ở trường `line`. Mặc 3 món cùng bộ kích hoạt hiệu ứng 1; đủ 5 món kích hoạt hiệu ứng 2 và hào quang màu bộ. Mỗi bộ có kiểu vai giáp, mào mũ và huy hiệu riêng.
- **Rèn lại** (bảng Ép đồ): đổi loại vũ khí hoặc dòng bộ giáp, giữ nguyên bậc, cấp ép và dòng Hoàn Hảo. Phí tính theo bậc và cấp ép.
- **Thời trang** (`config/fashion.js`): 6 trang phục, 4 mũ, 4 hào quang. Chỉ đổi ngoại hình, không cộng chỉ số. Mở khóa bằng điểm danh, Tháp, sự kiện, Reset, hoặc mua bằng Zen.
  - Lưu trong `S.fashion = { owned, eq, show }`.
  - Gửi qua mạng trong `look.fa` để người chơi khác nhìn thấy.
- **Nhân vật V2 vẽ lại:** mặt có lông mày, mắt có tròng và điểm sáng; tóc riêng theo class (Pháp Sư tóc dài, Xạ Thủ buộc đuôi ngựa). Tay và chân có khớp khuỷu, khớp gối; khi đánh có vệt chém; Kiếm Sĩ xoay người khi dùng Xoáy Kiếm.
  - Khung xem trước nhân vật nằm trong bảng **Nhân vật** và **Thời trang**; chạm vào khung để đổi tư thế.

## Bộ kỹ năng & Bậc nhân vật

- **Bậc nhân vật** (`config/skills.js` → `CLASS_TIERS`, `TIER_RESETS`, `S.tier`): Bậc 1 khi mới tạo. Reset 1 / Reset 3 mở **nhiệm vụ chuyển chức**
  (`TIER_QUESTS`, 5 bước: cấp độ, săn quái mạnh, boss, sự kiện/tháp, nộp lễ vật). Xong bước cuối mới lên bậc, nhận chỉ số vĩnh viễn `TIER_BONUS`.
  Logic ở `systems/quests.js` (`currentTierStep`, `claimTierStep`), giao diện ở tab Chuyển chức của bảng Nhiệm vụ.
  Kiếm Sĩ → Kiếm Vương → Kiếm Thánh · Pháp Sư → Đại Pháp Sư → Pháp Thần · Xạ Thủ → Thần Tiễn Thủ → Tiễn Thánh.
- **6 kỹ năng mỗi class** (`SKILL_LIST`): 4 chủ động, 1 tăng cường (buff), 1 nội tại. Mỗi kỹ năng cần **cấp nhân vật** + **bậc** để học, trả bằng Zen.
- **Cấp kỹ năng 1→10**: +9% sát thương, −3% hồi chiêu mỗi cấp. Mỗi cấp cần thêm cấp nhân vật (`rankLevelReq`), Zen + ngọc (`rankCost`).
  Cấp tối đa theo bậc: 5 / 8 / 10 (`RANK_CAP`), nên muốn max kỹ năng phải Reset.
- **Thanh kỹ năng 4 ô** (`S.skills.bar`): phím 1–4 (Space = ô 1), bình thuốc chuyển sang Q/W, K mở bảng Kỹ năng.
  AUTO tự dùng các kỹ năng trên thanh: buff trước, chiêu hồi lâu trước; có thể tắt tự dùng từng kỹ năng.
- Hiệu ứng lên quái: choáng (`m.stun`), làm chậm (`m.slowT`), hút (hố đen). Buff lưu ở `G.R.p.buffs` và được cộng trong `calcStats`.
- Thêm kỹ năng mới: thêm 1 entry trong `SKILL_LIST` → nếu là chủ động thì thêm hàm cùng tên vào `SKILL_FN` (`systems/skills.js`),
  icon `sk_<id>` trong `render/art/v2/items.js`, hiệu ứng (nếu cần) trong `render/art/v2/fx.js`.
- Save cũ được chuyển tự động (`migrateSkills`): giữ kỹ năng đầu tiên ở ô 1.

## Thế giới rộng & bản đồ con

- **10 bản đồ rộng** (`config/maps.js`, 72×72 → 96×96 ô): Đồng Cỏ Xanh, Rừng Bóng Tối, Đầm Lầy Độc, Hầm Mộ, Hẻm Núi Đá Đỏ, Băng Nguyên,
  Bờ Biển San Hô, Sa Mạc, Núi Lửa Hỏa Ngục, Thiên Giới Đọa Lạc. Mỗi bản đồ có 4 loại quái + 1 boss.
- **Sinh địa hình** (`systems/world.js` → `generateMap`): nhiễu giá trị tạo hồ/dung nham/vách đá, thị trấn ở giữa, đường mòn nối các bãi quái,
  4 vùng cấp độ xa dần thị trấn (càng xa càng mạnh), hang boss ở rìa. Mặt đất vẽ theo khối 12×12 ô có cache nên bản đồ lớn vẫn mượt.
- **Va chạm & tìm đường** (`systems/nav.js`): lưới ô chặn, A* 8 hướng có làm mượt, đi trượt dọc vật cản. Người chơi, quái và AUTO đều dùng chung.
- **Bản đồ con** (`ui/minimap.js`): góc phải trên, hiện thị trấn, quái, tinh anh, boss, người chơi khác. Bấm ⤢ hoặc phím **N** mở bản đồ lớn:
  **chạm vào bất kỳ đâu để tự đi tới** (AUTO tạm dừng tới khi đến nơi), có danh sách khu vực theo cấp.
- **Quái đa dạng:** quái đánh xa (phun độc, cầu phép, cầu lửa, tên, băng) giữ khoảng cách và lùi khi bị áp sát; hình dạng mới rắn/cua/hồn ma/sứa;
  **Tinh Anh** (5%): máu ×3.2, sát thương ×1.4, EXP ×3, rơi nhiều Zen/ngọc hơn, tên vàng trên bản đồ.
- **Lưu v2:** bản lưu cũ (6 bản đồ) được tự chuyển sang chỉ số bản đồ mới.

## Tài khoản, lưu trên máy chủ & cài ứng dụng

- **Đăng ký / đăng nhập** (`ui/startScreen.js`, `net/account.js`, `server/src/accounts.js`): tên đăng nhập 3–20 ký tự (chữ không dấu, số, `_`, `.`), mật khẩu ≥ 6 ký tự,
  băm bằng **scrypt + muối riêng**. Phiên đăng nhập là token ngẫu nhiên (máy chủ chỉ lưu bản băm SHA-256), hết hạn sau 90 ngày không dùng, tối đa 8 thiết bị.
  Giới hạn thử: 20 lần/10 phút mỗi IP, 8 lần sai/10 phút mỗi tài khoản. Có đổi mật khẩu (đăng xuất mọi thiết bị khác).
- **API:** `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`, `GET/PUT/DELETE /api/save`, `POST /api/password` (header `Authorization: Bearer <token>`, có CORS để chạy trang game ở tên miền khác).
- **Nhân vật của tài khoản nằm và chạy trên máy chủ** (xem *Chế độ máy chủ quyết định*): không có bản lưu trên máy người chơi, không cần đồng bộ, đổi máy là chơi tiếp.
  Mỗi tài khoản chỉ chơi trên 1 thiết bị cùng lúc — vào ở máy mới thì máy cũ hiện thông báo, bấm *Chơi tiếp trên máy này* để giành lại.
- **Nhân vật khách không đưa vào tài khoản được** (bản lưu khách có thể bị sửa trên máy) — tài khoản bắt đầu nhân vật mới.
- **Liên kết trực tuyến:** khi đã đăng nhập, hồ sơ trực tuyến (tên, xếp hạng) gắn với tài khoản nên đổi máy vẫn giữ.
- **PWA** (`public/manifest.webmanifest`, `public/sw.js`, `src/pwa.js`): cài lên màn hình chính (Android/PC có nút *Cài game vào máy*; iPhone: Safari → Chia sẻ → Thêm vào MH chính),
  mở toàn màn hình, mở được khi mất mạng. Trang game lấy bản mới từ mạng trước nên cập nhật là có ngay; API tài khoản không bao giờ bị lưu đệm.
- **Hướng dẫn tân thủ** (`ui/tutorial.js`): 7 bước có vòng sáng chỉ đúng nút (đi lại, đánh quái, bật AUTO, cộng điểm, bản đồ khu vực, kỹ năng),
  thưởng 30.000 Zen + 20 bình máu/mana. Bỏ qua được; xem lại trong **Cài đặt → Hướng dẫn**.
- **Chạm trên điện thoại** (`ui/input.js`): nút phản hồi ngay khi nhấc tay (không chờ sự kiện click), chạy được cả trong trình xem nhúng.

## Chế độ máy chủ quyết định (chống gian lận)

Áp dụng cho mọi người chơi **có tài khoản**. Máy người chơi chỉ gửi **lệnh** và **vẽ** lại thế giới; máy chủ chạy luật chơi thật.

```
Máy người chơi                         Máy chủ (server/src/host.js)
 chạm đất / chạm quái / bấm nút  ──act──▶  kiểm tra tham số (src/net/actions.js) → chạy đúng hàm luật chơi
 vẽ, nội suy, âm thanh, rung      ◀─snap──  thế giới quanh nhân vật 10 lần/giây (chỉ phần thay đổi)
 bảng nhân vật, túi đồ…           ◀──st───  phần bản lưu (G.S) bị đổi, 4 lần/giây
 chữ sát thương, log, hiệu ứng    ◀──ev───  sự kiện game (giết quái, lên cấp, ép đồ…)
```

- **Dùng chung code:** máy chủ import thẳng `src/systems/*` (luật chơi không đụng DOM). Mỗi người chơi là 1 thế giới riêng; vì code dùng biến `G` toàn cục nên máy chủ
  "đổi ngữ cảnh" (gán `G.S/G.R/G.P` của người đó → chạy → cất lại) trong vòng lặp 20 lần/giây.
- **Mọi thao tác thay đổi nhân vật đi qua `act(tên, ...tham số)`** (`src/net/actions.js`): ~35 hành động (đi, đánh, kỹ năng, bình thuốc, cộng điểm, trang bị, bán, ép đồ, rèn, chế cánh,
  mua, nhận nhiệm vụ/điểm danh/thưởng vắng mặt, thời trang, dịch chuyển, sự kiện, tháp, Reset, tuỳ chọn, hướng dẫn). Mỗi hành động có bộ kiểm tra kiểu & giới hạn tham số
  (vd. mua số âm, cộng điểm vào chỉ số không tồn tại → bị chặn). Chơi khách thì `act()` chạy ngay trên máy, chơi tài khoản thì gửi lên máy chủ.
- **Không nhận bản lưu từ máy người chơi:** `PUT /api/save` bị từ chối; máy chủ tự ghi bản lưu mỗi 30 giây và khi thoát. Sửa Zen/cấp trên máy chỉ đổi số hiển thị, máy chủ không nhận.
- **Luật trực tuyến:** EXP tối đa x3, không có chế độ thử sự kiện, thưởng vắng mặt do máy chủ tính theo thời điểm rời game, thưởng hướng dẫn tân thủ chỉ nhận 1 lần.
- **Thông báo toàn server** (ép +9, hạ boss, Reset…) do máy chủ tự phát; **bảng xếp hạng** chỉ gồm tài khoản, chỉ số máy chủ tính.
- **Mất mạng:** màn hình chờ *Mất kết nối máy chủ — đang kết nối lại…*, kết nối lại là vào tiếp (máy chủ gửi lại toàn bộ). Cần có mạng khi chơi bằng tài khoản.
- **Sức chứa (đo thử):** 60 người cùng cày AUTO tốn ~13–16 ms trên 50 ms mỗi vòng của 1 nhân CPU → ước ~150–200 người/nhân. Mạng ~10–15 KB/giây mỗi người trước nén
  (WebSocket có bật nén). Trang quản trị hiển thị *Tải máy chủ* theo thời gian thực.
- **Quà / đền bù:** trang quản trị → tài khoản → *Tặng quà* (Zen, ngọc) gửi vào hộp thư người chơi.
- **Lưu ý triển khai:** máy chủ cần thư mục `src/` (Dockerfile đã chép sẵn). Khi sửa luật chơi trong `src/`, phải khởi động lại máy chủ.

## Bang hội

Cần **tài khoản** và đang trong game. Mở bằng nút 🏰 bên phải màn hình.

- **Lập bang:** cấp 50 + 3.000.000 Zen, tên 2–12 ký tự không trùng. Người khác **xin vào** từ danh sách bang (xếp theo điểm), bang chủ / phó bang duyệt đơn.
- **Chức vụ:** 👑 Bang chủ (phong / hạ phó bang, nhượng bang, đuổi, giải tán) · ⭐ Phó bang (tối đa 3: duyệt đơn, đuổi thành viên, sửa thông báo) · Thành viên.
- **Quyên góp:** Zen (1.000 Zen = 1 điểm) và ngọc (Ước 200 / Hồn 500 / Hỗn 1.500 điểm). Điểm đủ mốc thì bang lên cấp (tối đa 10) → mở rộng sức chứa (20 + 5 × cấp) và cộng **buff cho mọi thành viên**: sát thương +1%, HP +1.5%, phòng thủ +1.5% mỗi cấp.
- **Nhiệm vụ bang hằng ngày:** mỗi người 3 nhiệm vụ riêng/ngày (tab Nhiệm vụ; kho nhiệm vụ & thưởng ở `GUILD_QUESTS` trong `config/guild.js`, tiến độ theo dõi trong `systems/quests.js`). Mỗi nhiệm vụ +30 điểm cống hiến cho bang và Zen cho người làm, nhận đủ bộ thêm +40 điểm. Nhận thưởng qua máy chủ (`POST /api/guild/quest`).
- **Chat bang** riêng (tab Chat) và tên bang hiện trên đầu nhân vật.
- Mọi con số ở `src/config/guild.js`; luật & dữ liệu ở `server/src/guilds.js` (`guilds.json`, có trong sao lưu / khôi phục). Máy chủ gắn `S.guild` vào nhân vật khi vào game và mỗi lần bang thay đổi — không nhận từ máy người chơi. Buff tính trong `systems/stats.js`.
- Chưa có: kho đồ bang, công thành chiến (cần bản đồ dùng chung nhiều người — xem lộ trình).

## Boss Bang Hội & Đấu giá

Hằng ngày lúc **12:00 và 20:00 (giờ Việt Nam)**, cổng mở 15 phút. Vào bằng 🏰 Bang hội → tab 🐲 Boss (cần cấp 30 và đã vào bang).

- **Mỗi bang có một đấu trường riêng**, mọi thành viên bang vào chung và thấy nhau, cùng đánh **một Boss duy nhất** do máy chủ điều khiển (`server/src/arena.js`): Boss đuổi người gần nhất, đánh thường, và định kỳ **báo trước rồi đập đất** trúng nhiều người cùng lúc. Sát thương Boss tính theo % máu người bị đánh nên người cấp thấp vẫn tham gia được; chết thì hồi sinh tại điểm xuất phát.
- Boss không thể hạ gục; **hết giờ mới tính điểm**. Điểm bang = tổng sát thương của mọi thành viên (máy chủ tính trên nhân vật thật). **Bảng xếp hạng các bang hiện ngay trong trận** (top 3 + hạng của bang mình) và trong tab Boss.
- Thấy chiêu thức của đồng đội: máy chủ sao chép phần **hình ảnh** (hiệu ứng kỹ năng, đạn, vết chém) của mỗi người sang màn hình các thành viên khác trong đấu trường (`relayEffects` trong `server/src/host.js`). Hiệu ứng sao chép đánh dấu `foreign` nên **không gây sát thương lần nữa**. Hiệu ứng bám theo người (buff) và hiệu ứng của Boss không sao chép.
- Nhờ tách đấu trường theo bang, mỗi phòng chỉ có vài chục người → nhẹ cho máy chủ; các bang không đánh trực tiếp nhau.
- **Quà xếp hạng** (hạng 1: 4 phần, hạng 2: 3, hạng 3: 2, hạng 4–10: 1; ở `GBOSS_REWARDS`) thành các **phiên đấu giá**: 15 phút đầu chỉ người **đã đánh Boss của bang đó** được đặt giá (tiền thắng được chia đều cho những người đã đánh); không ai đặt → ra **Đấu giá thế giới** 30 phút, ai cũng đặt được (tiền không chia); vẫn không ai đặt → quà tặng người gây sát thương cao nhất bang. Mỗi lần trả giá phải cao hơn ≥ 5%; Zen bị giữ ngay khi đặt, bị vượt thì hoàn qua hộp thư và **báo ngay** cho người bị vượt. **Chống đặt giá phút chót:** đặt khi còn dưới 30 giây thì phiên được cộng thêm 30 giây (tối đa 10 phút; số ở `AUCTION` trong `src/config/gboss.js`). Mở bằng nút 🔨.
- **Giá khởi điểm tính theo chi phí tự kiếm / tự ép** (`DIY` trong `src/config/gboss.js`): thời gian cày đủ đồ Hoàn Hảo + ngọc (số đo từ bot mô phỏng và bảng ép đồ có tính rớt cấp / vỡ đồ) × thu nhập cày 2M Zen/giờ, khởi điểm = 35% giá tự cày; đồ bậc cao × thêm. Mỗi phiên hiện dòng "Tự kiếm / tự ép ≈ …" để người chơi so sánh. Đổi `zenPerHour` / `startFrac` là cả bảng giá đổi theo.
- **Chống treo máy hưởng ké:** phải **chiến đấu thực sự ≥ 3 phút** (`GBOSS.minActiveSec`; mỗi giây có gây sát thương mới được tính, nên đứng yên không cộng giờ) mới được tính là tham gia — nhận thưởng tham gia, được chia tiền đấu giá và đặt giá trong bang. Tính theo thời gian chứ không theo % sát thương nên người yếu vẫn đạt được. Tiến độ hiện trong tab Boss (⚠ = chưa đủ) và trên HUD trong trận. Biến môi trường `GBOSS_MIN_ACTIVE_SEC` chỉ dùng để thử nghiệm.
- Mọi người đã đánh còn nhận thưởng tham gia qua hộp thư. Dữ liệu ở `gboss.json` (có trong sao lưu / khôi phục). Số liệu ở `src/config/gboss.js`; luật trong trận ở `src/systems/gboss.js`.
- Lưu ý kỹ thuật: mỗi người chơi vẫn chạy mô phỏng riêng trên máy chủ; Boss "thật" nằm ở bộ não chung của bang và được đặt vào thế giới từng người mỗi 50 ms.

## Công Thành Chiến

Hằng tuần **Chủ nhật 20:00 (giờ VN)**, trận kéo dài **30 phút**. Mở bằng 🏰 Bang hội → tab 🏯 Công thành (cấp 50 trở lên).

- **Phe & đăng ký:** bang đang giữ thành là **phe thủ** (tự động tham gia, spawn trong thành); tối đa **3 bang công** do bang chủ / phó bang đăng ký (phí 2M Zen, cấp bang ≥ 2, ai đăng ký trước được trước). Đóng đăng ký lúc 19:30. Mỗi bang tối đa **25 người** vào trận; ai đủ cấp và thuộc bang tham gia bấm *Vào trận*.
- **Cách thắng:** phe công phải **phá Cổng Thành** (máu tính theo "số đòn" nên không phụ thuộc cấp; phe thủ không đánh được cổng nhà), rồi các bang tranh **Ngai Vàng**: đứng một mình trên ngai (người còn sống) **10 giây** thì chiếm; hai bang cùng đứng thì giành giật, không ai chiếm. Sau khi cổng vỡ, bang đang giữ ngai **tích lũy giờ giữ**; hết giờ bang có **tổng giờ giữ cao nhất** thắng và chiếm thành. Cổng chưa vỡ → bang thủ thắng.
- **PvP:** chọn người bang khác như chọn quái (chạm, hoặc AUTO tự đánh). Dùng chỉ số thật, nhân hệ số **×0.25** (`SIEGE.pvpCoef`). Chết hồi sinh sau 6 giây tại điểm xuất phát của bang, bất tử 3 giây, không mất EXP. PvP chỉ có trong trận này.
- **Cơ chế kỹ thuật:** mỗi người vẫn mô phỏng riêng trên máy chủ; "bộ não" trận (`server/src/siegebrain.js`) giữ máu cổng, ngai, giờ giữ. Người địch trong tầm (tối đa 30 gần nhất) được đặt vào thế giới của mỗi người dưới dạng mob đại diện (`m.pvp`) nên toàn bộ code đánh quái (kỹ năng, đạn, AUTO) dùng được để đánh người; sát thương được ghi lại và máy chủ trừ máu thật của người bị đánh (`hitMob` → `siegeHit` trong `systems/combat.js`). Hiệu ứng chiêu của đồng đội và địch hiện qua `relayEffects`.
- **Quyền lợi bang giữ thành:**
  - **Vũ khí đặc biệt** (Vương Giả Kiếm / Trượng / Cung, +30% sát thương, +8% chí mạng; chỉ có từ công thành, không rơi ngẫu nhiên, không rèn lại): bang thắng nhận 3 món (Hoàn Hảo +9) vào **đấu giá bang** (15 phút, chỉ người chiến đấu ≥ 5 phút; không ai đặt → đấu giá thế giới), giá khởi điểm tính theo giá tự kiếm × 1.8.
  - **Thuế chợ:** 30% phí chợ (≈ 1.5% giá bán) chuyển vào **quỹ bang** chủ thành; số tiền người bán nhận **không đổi**. Bang chủ bấm *Phát quỹ* để chia đều cho thành viên qua hộp thư.
  - **Buff cả bang** (sát thương / HP / phòng thủ +5%, Zen rơi +15%) cho tới khi đổi chủ thành (tối đa 1 tuần).
  - Mọi người chiến đấu ≥ 5 phút nhận thưởng tham gia (Zen theo cấp + ngọc), bang thắng ×2.
- Dữ liệu: `siege.json` (chủ thành, đăng ký, lịch sử; có trong sao lưu / khôi phục). Số liệu ở `src/config/siege.js`; luật trong trận ở `src/systems/siege.js`.
- **Thử tải** (`node tools/load/siege-load.mjs 100 45`, 100 bot AUTO cùng 1 trận, máy dev): tick máy chủ trung bình **~21 ms / 50 ms** (đỉnh ~27 ms), mạng ~6 KB/giây mỗi người sau nén (~4.4 Mbit/s tổng). Máy chủ yếu hơn thì hạ `SIEGE.maxPerGuild` (hoặc `maxProxies`).
- Kiểm thử trên máy: đặt `SIEGE_TEST=1` để dùng `POST /api/siege/_debug` (bắt đầu trận ngay, bỏ qua lịch), `SIEGE_MIN_ACTIVE_SEC` để hạ thời gian chiến đấu tối thiểu.
- Chưa có: liên minh nhiều bang, bang chủ tự đặt mức thuế, danh hiệu trên đầu, ưu tiên mục tiêu cổng / ngai cho AUTO.

## Chợ & giao dịch giữa người chơi

Cần **đăng nhập tài khoản** và có máy chủ. Mở bằng nút ⚖️ bên phải màn hình, hoặc **Túi đồ → Bán ở chợ**.

- **Chợ** (người bán offline vẫn bán được): đăng bán trang bị trong túi đồ hoặc ngọc (Ước / Hồn / Hỗn) theo lô, giá 100 Zen – 2 tỷ, tối đa 10 món, treo 48 giờ.
  Lọc theo loại, vũ khí hợp lớp; sắp xếp mới / rẻ / đắt / ép cao; xem giá ngọc trung bình gần đây. **Phí chợ 5%** trừ vào tiền bán được.
- **Hộp thư**: tiền bán hàng, đồ đã mua, đồ giao dịch, đồ hết hạn hoặc huỷ bán đều về đây và **tự nhận** khi đang online (túi đầy thì giữ lại trong thư).
- **Giao dịch trực tiếp** (Chợ → Giao dịch): mời người chơi cùng bản đồ → mỗi bên chọn tối đa 8 món + ngọc + Zen (bên kia thấy ngay) →
  **🔒 Khoá** (máy chủ giữ đồ, không đổi được nữa) → khi cả hai đã khoá mới bấm **✔ Xác nhận** → đồ sang hộp thư bên kia. **Phí 2%** trên Zen chuyển.
  Huỷ, thoát game, đổi bản đồ, quá 5 phút → đồ đã khoá trả về chủ.
- **An toàn dữ liệu** (`server/src/market.js`): mọi thao tác gửi kèm bản lưu + `rev`, máy chủ kiểm tra đồ có thật rồi mới trừ, lưu lại và trả "delta" cho máy người chơi áp dụng.
  Đồ đang bán / đang khoá nằm ở máy chủ (`market.json`, có trong bản sao lưu); máy chủ khởi động lại giữa lúc giao dịch thì đồ tự trả về hộp thư. Vật phẩm chuyển sang người khác được cấp id mới.
- Vũ khí của lớp khác mua được nhưng không trang bị được (dùng để bán lại / giao dịch).
- Trang quản trị hiển thị số món đang bán, lượt bán và phí chợ 24 giờ.

Chợ và giao dịch thao tác thẳng trên nhân vật đang chạy ở máy chủ — không nhận dữ liệu nhân vật từ máy người chơi, nên không tạo được đồ/Zen giả để bán.

## Dữ liệu người chơi, sao lưu & trang quản trị

**Dữ liệu nằm ở đâu** (thư mục `DATA_DIR`, khi chạy Docker là volume `kng-data`):

| File | Nội dung |
|---|---|
| `accounts.json` | Tài khoản: tên đăng nhập, mật khẩu đã băm, phiên đăng nhập, trạng thái khoá |
| `saves/<id>.json` | Toàn bộ nhân vật của từng tài khoản |
| `players.json` | Hồ sơ trực tuyến (tên hiển thị, cấp, tháp, lực chiến) cho bảng xếp hạng |
| `market.json` | Hàng đang bán ở chợ, lịch sử bán, đồ đang khoá trong giao dịch |
| (trong `accounts.json`) | Hộp thư của từng tài khoản |
| `backups/kng-YYYYMMDD-HHMMSS.json.gz` | Bản sao lưu (gộp cả 3 thứ trên) |

Người chơi khách (không đăng nhập) chỉ được lưu trong trình duyệt của họ.

**Sao lưu tự động** (`server/src/backup.js`): mỗi `BACKUP_HOURS` giờ (mặc định 24), giữ `BACKUP_KEEP` bản (mặc định 14). Máy chủ vừa bật mà bản gần nhất đã cũ thì sao lưu ngay.
Bản sao lưu vẫn nằm trên cùng VPS → nên **tải về máy định kỳ** từ trang quản trị (hoặc dùng `rclone`/`scp` chép thư mục `backups/` sang nơi khác).

**Khôi phục:** dừng máy chủ → `node server/src/restore.js <file .json.gz>` → bật lại. Dữ liệu đang có được chuyển sang `before-restore-<thời gian>/` để quay lại được.
Với Docker: `docker compose stop game` → `docker compose run --rm game node server/src/restore.js /data/backups/<file>` → `docker compose start game`.

**Trang quản trị** `https://tên-miền/admin` — bật bằng biến môi trường `ADMIN_PASSWORD` (ít nhất 10 ký tự, không dùng mật khẩu mẫu; nếu yếu thì trang tự tắt):

- Tổng quan: số tài khoản, có nhân vật, hoạt động 24h / 7 ngày, đang online, bị khoá.
- Sao lưu: xem danh sách, **sao lưu ngay**, **tải về**.
- Tài khoản: tìm theo tên đăng nhập / tên nhân vật, sắp xếp; xem chi tiết nhân vật (cấp, Zen, ngọc, trang bị, tháp…);
  **đặt lại mật khẩu** (người chơi quên mật khẩu), **đăng xuất mọi thiết bị**, **khoá / mở khoá** kèm lý do, **tải bản lưu** (.json).
- Đang online: danh sách người chơi, **ngắt kết nối** hoặc **khoá** (kể cả người chơi khách).
- **Thông báo toàn server** (vd. báo bảo trì).

Người bị khoá: không đăng nhập được, bị ngắt kết nối ngay, biến mất khỏi bảng xếp hạng. Đăng nhập quản trị giới hạn 10 lần thử/10 phút mỗi IP, phiên quản trị hết hạn sau 12 giờ.

## Cân bằng & mô phỏng

`node tools/sim/balance.mjs <knight|wizard|archer> [giờ tối đa] [số Reset]` — bot tự chơi bằng đúng logic game (không vẽ, ~1 giây cho 1 giờ chơi),
in ra mốc cấp, Zen, ngọc, số lần chết, cấp kỹ năng, kỷ lục tháp sau mỗi Reset. Chạy lại sau mỗi lần sửa `config/*.js` để kiểm tra.

Kết quả hiện tại (EXP x3, bot chơi "chăm, không nạp", có chơi thử Huyết Lâu + Quảng Trường Quỷ ở cấp 50/150/250 và sau mỗi Reset):

| | Kiếm Sĩ | Pháp Sư | Xạ Thủ |
|---|---|---|---|
| Reset 1 | ~13.4h | ~12h | ~11h |
| Lên Bậc 2 | 15.6h | 13.8h | 13.9h |
| Lên Bậc 3 | 24.8h | 20.4h | 21.5h |
| Kỷ lục tháp sau Reset 3 | 59 | 79 | 47 |
| Sự kiện | Thắng hết | Thua Quảng Trường Quỷ ở cấp 50, còn lại thắng | Thua Quảng Trường Quỷ ở cấp 50, còn lại thắng |

Lưu ý: bot chơi tối ưu, không nghỉ; người chơi thật thường chậm hơn 1.5–2 lần. Kết quả dao động ~±1h mỗi lần chạy (ngẫu nhiên).

Các lượt chỉnh gần nhất: ngọc rơi giảm ~65%, quái bản đồ sau mạnh hơn tới +30%, EXP tháp tính theo cấp người chơi, máu quái tháp +3%/tầng,
chi phí kỹ năng theo cấp yêu cầu, lễ vật chuyển chức 15M / 30M Zen, Bậc 3 cần tháp tầng 40; Xạ Thủ: tốc đánh 1.1, sát thương /11,
Mưa Tên 4 mục tiêu hồi 2.6s; Pháp Sư: sát thương /3.6, HP cao hơn, Mưa Thiên Thạch hồi 2.6s; quái sự kiện −40% sát thương, cùng cấp người chơi,
bản đồ rộng: AUTO bỏ qua quái không với tới sau 4 giây, giới hạn cấp quái của AUTO không áp dụng trong Tháp/sự kiện; Quảng Trường Quỷ sinh 4 quái/lượt (tối đa 10 cùng lúc); AUTO ưu tiên nhặt đồ trong 4.5 ô khi không bị đánh.
Khi kết nối máy chủ: EXP tối đa x3 (`onlineMaxExpRate`) và tắt chế độ thử sự kiện.

## Cảm giác chơi, thời tiết & âm thanh

- `render/juice.js`: rung màn hình (`EV.SHAKE`, chí mạng, chiêu lớn, bị boss đập), chữ sát thương 4 kiểu (thường / kỹ năng / chí mạng nảy to / mất máu),
  viền đỏ khi bị đánh mạnh hoặc HP < 30%, hào quang bậc nhân vật (Bậc 2 xanh bạc, Bậc 3 vàng + vầng sáng trên đầu — người chơi khác cũng thấy),
  thời tiết theo bản đồ (hoa bay, mưa + sấm, đom đóm ma, tuyết, tàn lửa, lông vũ). Tắt được rung/thời tiết trong Cài đặt.
- Quái bị đẩy lùi khi trúng đòn, vết cào khi quái đánh trúng. Boss có chiêu **đập đất**: vùng đỏ cảnh báo 1.3s rồi gây ×2.4 sát thương — chạy ra để né
  (AUTO tự né). Số liệu ở `MONSTER.bossSlam` (`config/balance.js`).
- `audio/audio.js`: âm thanh tổng hợp bằng Web Audio (không cần file): ~35 hiệu ứng gắn vào event bus + nhạc nền thủ tục theo từng bản đồ,
  nhạc dồn dập trong sự kiện/tháp. Âm lượng hiệu ứng & nhạc chỉnh riêng trong Cài đặt (lưu trên trình duyệt).

## Design System V1 (Claude Design)

- File gốc: `design/Ky Nguyen Design System.html` (xuất từ Claude Design).
- Áp dụng vào game: `src/styles/theme.css` (nạp sau `main.css`, chỉ ghi đè hình thức) + `src/styles/fonts.css`
  (Philosopher 700 cho tiêu đề, Be Vietnam Pro 400/600/700/800 cho nội dung & số — nhúng sẵn, chạy offline).
- Thành phần: khung bảng 4 góc kim cương, nút viên vàng/xanh/đỏ + nút nhỏ 44px, ô vật phẩm viền theo độ hiếm (Hoàn Hảo phát sáng),
  thanh HP/MP 16px, EXP 4px (phần trăm hiện ở dòng cấp), tab, công tắc, ô tick, hồi chiêu dạng quạt, nhãn "THIẾU MP".
- Cài đặt có thêm "Sáng hơn (ngoài trời)" = tham số `outdoor` của design system (độ sáng +15%).

## Nhân vật theo Character Style Guide (Claude Design N0)

- File gốc: `design/Character Style Guide.html`. Bản vẽ trong game: `src/render/art/v2/hero3.js`.
- Hình học lấy trực tiếp từ style guide (hệ phác 4×, cao 320 = 80px, gốc giữa 2 chân, mặt hướng phải), 12 lớp đúng thứ tự,
  đổ bóng 3 tông + dải sáng trên-trái + viền = màu gốc làm tối (hàm `part`). Bộ Da khớp đúng bảng màu của guide.
- Trang bị đổi chất liệu theo bộ giáp; vũ khí, cánh, thời trang, vai/huy hiệu/mào các bậc cao tái dùng đồ hoạ V2 (`gear.js`)
  qua phép ánh xạ toạ độ đầu/thân (`toHead`, `toTorso`).
- Hiệu năng: thân nhân vật được cache theo (ngoại hình, khung hoạt ảnh 8 bước, đòn đánh 12 bước, độ phóng) → ~1ms/nhân vật.
- Trang thiết kế có mục **S** để so với style guide: 3 class ở 4× / 80 / 120px, tư thế, 6 bậc trang bị.
- Bản vẽ cũ vẫn còn ở `hero.js` (đổi import trong `render/art/v2/index.js` nếu cần so sánh).
