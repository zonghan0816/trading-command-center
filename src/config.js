// ╔══════════════════════════════════════════════════════════════╗
// ║          AI Trading Command Center — 自訂設定檔              ║
// ║  修改這個檔案即可調整外觀，不需要碰其他程式碼                ║
// ╚══════════════════════════════════════════════════════════════╝

export const CONFIG = {

  // ── 辦公室佈局 ────────────────────────────────────────────────
  layout: {
    wallHeightRatio: 0.44,          // 牆壁高度（佔畫面比例，0.3~0.6）
    backRowOffsetY:  190,            // 後排桌子：距牆底部多少 px
    frontRowOffsetY: 360,           // 前排桌子：距牆底部多少 px
    agentOffsetY:    420,           // AI 交易員站立位置：距牆底部多少 px

    // 後排 3 個工作站 X 位置（0=最左，1=最右）
    backXRatios:  [0.36, 0.57, 0.77],
    // 前排 3 個工作站 X 位置
    frontXRatios: [0.25, 0.46, 0.68],
    // AI 交易員（白板旁）X 位置
    agentXRatio:  0.82,
    // 白板 X 位置（要比 agentXRatio 大，才不會擋到對話泡泡）
    whiteboardXRatio: 0.86,
    // 白板距牆底部距離（px，正值往下移）
    whiteboardOffsetY: 260,

    // 裝飾品位置（X 比例）
    lightsXRatios: [0.16, 0.42, 0.68, 0.88],   // 吊燈
    signXRatio:    0.46,                          // 招牌

    // 走路時停在對方旁邊的距離（px）。數字越大站越遠
    walkOffset: 96,

    // 個別角色 sprite 微調（不影響桌子）正值 x=右/y=下，負值 x=左/y=上
    charOffsets: {
      market: { x:   0, y:  30 },
      boss:   { x:   0, y:  40 },
      ml:     { x:   0, y:  30 },
      news:   { x:   0, y:  10 },
      swing:  { x:   0, y:  10 },
      dca:    { x:   0, y:  10 },
      agent:  { x:   0, y:  0 },
    },

    // 個別工作站（桌子＋椅背＋螢幕）微調（不影響角色 sprite）
    stationOffsets: {
      market: { x:   0, y:  40 },
      boss:   { x:   0, y:  50 },
      ml:     { x:   0, y:  40 },
      news:   { x:   0, y:  20 },
      swing:  { x:   0, y:  20 },
      dca:    { x:   0, y:  20 },
    },

    // 裝飾物個別微調
    decorOffsets: {
      wallScreen:  { x:  0, y:  0 },   // 牆面股市螢幕
      whiteboard:  { x:  0, y:  0 },   // 白板
      serverRack:  { x:  0, y:  0 },   // 伺服器機架
    },

    // 資料流走位：key 走向 value 的角色（調整誰走去找誰）
    // 角色代號：market / news / swing / dca / ml / agent / boss
    dataFlows: {
      market: ['boss'],
      news:   ['boss'],
      ml:     ['agent'],
      agent:  ['boss'],
      boss:   ['market', 'news', 'swing', 'dca'],
    },
  },

  // ── 縮放比例 ──────────────────────────────────────────────────
  scale: {
    character: 4.0,    // 角色大小（Pixel Agents sprite 16×32，放大 2.5×）
    characterBoss: 0.33, // Boss 專用縮放（396×448 frame，角色可見約 47×141px）
    desk:      0.5,    // 桌子大小（desk.png 70×20）
    deskBoss:  1.3,    // 策略長專用桌（程序生成 132×48）
    monitor:   1.1,    // 螢幕大小
    chairBack: 1.8,    // 椅背大小
    plant:     1.0,    // 植物大小
    whiteboard:1.1,    // 白板大小
    serverRack:1.0,    // 機架大小
  },

  // ── 招牌文字 ──────────────────────────────────────────────────
  sign: {
    line1: 'AI TRADING COMMAND CENTER',
    line2: 'TAIWAN STOCK MARKET · REAL-TIME',
    color: '#00E5FF',    // 主色（十六進位 CSS 色碼）
    glowBlur: 14,
  },

  // ── 角色外觀（顏色為 0xRRGGBB 格式）─────────────────────────
  //
  //  shirt  = 上衣顏色
  //  hair   = 頭髮顏色
  //  skin   = 膚色
  //  pants  = 褲子顏色（可選，預設深藍 0x1a2a4a）
  //  shoes  = 鞋子顏色（可選，預設深棕 0x1a0a00）
  //  acc    = 配件：'none' / 'glasses' / 'headphones'
  //
  //  改顏色後，重新整理瀏覽器即可看到效果。
  //
  characters: {
    market: { shirt: 0x1a6fbb, hair: 0x1a0f08, skin: 0xf5c8a0, pants: 0x1a2a4a, shoes: 0x1a0a00, acc: 'none'       },
    news:   { shirt: 0xd4930f, hair: 0xdd4400, skin: 0xf5c8a0, pants: 0x2a1a00, shoes: 0x1a0a00, acc: 'none'       },
    swing:  { shirt: 0x20914d, hair: 0x100800, skin: 0xc8804a, pants: 0x1a3020, shoes: 0x0a1a00, acc: 'none'       },
    dca:    { shirt: 0x7d35a8, hair: 0x111122, skin: 0xf5c8a0, pants: 0x1a0a2a, shoes: 0x1a0a00, acc: 'glasses'    },
    ml:     { shirt: 0x0aabb8, hair: 0x1a1a1a, skin: 0xc8804a, pants: 0x0a1a2a, shoes: 0x1a0a00, acc: 'headphones' },
    agent:  { shirt: 0xc0392b, hair: 0x100800, skin: 0xf5c8a0, pants: 0x1a0000, shoes: 0x1a0a00, acc: 'none'       },
    boss:   { shirt: 0xd4850a, hair: 0x2a1800, skin: 0xf5c8a0, pants: 0x0a0a1a, shoes: 0x080808, acc: 'glasses'    },
  },

  // ── 背景顏色 ──────────────────────────────────────────────────
  background: {
    ceilingColor: 0x1e1008,    // 天花板顏色
    // 磚塊顏色（6 種隨機輪替）
    brickColors: [0x7a2d18, 0x8a3820, 0x6e2812, 0x7d3215, 0x852e18, 0x713015],
    // 地板顏色（5 種隨機輪替）
    floorColors: [0x8a5520, 0x9a6030, 0x7a4a18, 0x8e5825, 0x966232],
  },

  // ── 自訂圖片（上傳到 assets/ 資料夾後設為 true）──────────────
  //
  //  如果你有自己的像素圖，放到 assets/ 資料夾並把下方對應項目改成 true，
  //  程式就會載入你的圖片，而不是自動生成的。
  //
  //  支援的檔案名稱（放到 assets/ 資料夾）：
  //
  //  【角色】每個角色一張 PNG，寬度 = 4 幀×48px = 192px，高度 64px
  //    assets/char_market.png   📊 市場分析師
  //    assets/char_news.png     📰 新聞記者
  //    assets/char_swing.png    📈 波段交易員
  //    assets/char_dca.png      💰 定投經理
  //    assets/char_ml.png       🤖 ML 工程師
  //    assets/char_agent.png    🤖 AI 交易員
  //    assets/char_boss.png     🎯 策略長
  //
  //  【家具】單張 PNG
  //    assets/desk.png          桌子（96×44px）
  //    assets/desk_boss.png     策略長大桌（132×48px）
  //    assets/monitor.png       螢幕（44×40px）
  //    assets/monitor_dual.png  雙螢幕（96×38px）
  //    assets/chair_back.png    椅背（48×40px）
  //
  //  【裝飾】
  //    assets/plant_sm.png      小植物（36×52px）
  //    assets/plant_lg.png      大植物（44×64px）
  //    assets/ceiling_light.png 吊燈（30×42px）
  //    assets/whiteboard.png    白板（124×108px）
  //    assets/server_rack.png   伺服器機架（72×138px）
  //
  //  【UI】
  //    assets/bubble_bg.png     對話泡泡（185×54px）
  //
  customAssets: {
    char_market:    true,
    char_news:      true,
    char_swing:     true,
    char_dca:       true,
    char_ml:        true,
    char_agent:     true,
    char_boss:      true,
    desk:           true,
    desk_boss:      false,
    monitor:        false,
    monitor_dual:   false,
    chair_back:     false,
    plant_sm:       false,
    plant_lg:       false,
    ceiling_light:  false,
    whiteboard:     false,
    server_rack:    false,
    bubble_bg:      false,
  },
};
