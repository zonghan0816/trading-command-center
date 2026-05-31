// ╔══════════════════════════════════════════════════════════════╗
// ║          晚晚嘴台灣 WWT — 自訂設定檔                         ║
// ║  修改這個檔案即可調整外觀，不需要碰其他程式碼                ║
// ╚══════════════════════════════════════════════════════════════╝

export const CONFIG = {

  // ── 佈局 ─────────────────────────────────────────────────────
  layout: {
    wallHeightRatio: 0.44,

    // WWT 主持人座位（OfficeScene.js 更新後使用）
    hosts: {
      aming:   { xRatio: 0.35, yOffsetFromWall: 440, seat: 'left'  },
      xiaomei: { xRatio: 0.68, yOffsetFromWall: 440, seat: 'right' },
    },

    // 舊版排列數值（OfficeScene.js 更新前保留，避免 undefined 報錯）
    backRowOffsetY:  190,
    frontRowOffsetY: 360,
    agentOffsetY:    420,
    backXRatios:     [0.36, 0.57, 0.77],
    frontXRatios:    [0.25, 0.46, 0.68],
    agentXRatio:     0.82,
    whiteboardXRatio:  0.86,
    whiteboardOffsetY: 260,

    // 裝飾位置
    lightsXRatios: [0.16, 0.42, 0.68, 0.88],
    signXRatio:    0.50,

    // 走路設定
    walkOffset: 96,
    walkYOffsets: {
      aming:   -28,
      xiaomei: -28,
    },

    // 角色 sprite 微調
    charOffsets: {
      aming:   { x: 0, y: 10 },
      xiaomei: { x: 0, y: 10 },
    },

    // 工作站微調
    stationOffsets: {
      aming:   { x: 0, y: 20 },
      xiaomei: { x: 0, y: 20 },
    },

    // 裝飾物微調
    decorOffsets: {
      wallScreen: { x: 0, y: 0 },
      whiteboard: { x: 0, y: 0 },
      serverRack: { x: 0, y: 0 },
    },

    // 資料流（誰走去找誰）
    dataFlows: {
      aming:   ['xiaomei'],
      xiaomei: ['aming'],
    },

    // 未來場景背景設定（Phase 2）
    scenes: {
      studio:   { bg: 'studio_bg'   },
      newsdesk: { bg: 'newsdesk_bg' },
      coffee:   { bg: 'coffee_bg'   },
      meeting:  { bg: 'meeting_bg'  },
    },
  },

  // ── 縮放比例 ──────────────────────────────────────────────────
  scale: {
    character:    4.0,
    characterV2:  0.28,   // Phase 3: 1024×1536 單張 PNG 用
    characterEmotion: 1.7, // Phase 4 Step 5.12: 小美 emotion sheet 256×256 用、目標 ≈ 430 px 高、可微調
    characterBoss: 0.33,  // 保留避免 OfficeScene 舊路徑 undefined
    desk:         0.5,
    deskBoss:     1.3,    // 保留避免 OfficeScene 舊路徑 undefined
    deskMarket:   0.8,    // 保留避免 OfficeScene 舊路徑 undefined
    deskMarketMonH: 36,
    monitor:      1.1,
    chairBack:    1.8,
    plant:        1.0,
    whiteboard:   1.1,
    serverRack:   1.0,
  },

  // ── 招牌文字 ──────────────────────────────────────────────────
  sign: {
    line1:    '天天嘴台灣 TDT',
    line2:    'AI 鄉民談話台 · Taiwan Daily Talk',
    color:    '#FF6B35',
    glowBlur: 14,
  },

  // ── 角色外觀（顏色為 0xRRGGBB 格式）─────────────────────────
  //
  //  shirt  = 上衣顏色
  //  hair   = 頭髮顏色
  //  skin   = 膚色
  //  pants  = 褲子顏色
  //  shoes  = 鞋子顏色
  //  acc    = 配件：'none' / 'glasses' / 'headphones'
  //
  characters: {
    aming: {
      shirt: 0x2255AA, hair: 0x1a0f08, skin: 0xf5c8a0,
      pants: 0x1a2a4a, shoes: 0x1a0a00, acc: 'none',
    },
    xiaomei: {
      shirt: 0xCC3377, hair: 0x2a1018, skin: 0xf5d0b0,
      pants: 0x2a0a1a, shoes: 0x2a1010, acc: 'none',
    },
  },

  // ── 背景顏色 ──────────────────────────────────────────────────
  background: {
    ceilingColor: 0x1e1008,
    brickColors:  [0x7a2d18, 0x8a3820, 0x6e2812, 0x7d3215, 0x852e18, 0x713015],
    floorColors:  [0x8a5520, 0x9a6030, 0x7a4a18, 0x8e5825, 0x966232],
  },

  // ── 自訂圖片 ─────────────────────────────────────────────────
  //
  //  false = 程序生成（MVP 預設）
  //  true  = 載入 assets/ 資料夾中對應的 .png 檔
  //
  customAssets: {
    // Phase 4 Step 3.1: 暫時還原舊版視覺、只保留 badge + 跑馬燈
    // 24H MVP 素材都關掉、回退邏輯會自動用舊棚景 + 舊角色
    // 之後要恢復、把這 18 個 false 改回 true 即可
    char_aming_v3_actions:   false,
    char_xiaomei_v3_actions: false,
    char_aming_v3_sitting:   false,
    char_xiaomei_v3_sitting: false,
    char_A_man_standing:     false,
    char_A_man_sitting:      false,
    char_A_woman_standing:   false,
    char_A_woman_sitting:    false,

    // 新棚景（暫關、改用舊三套 wwt_studio_background_* 自動 crossfade）
    studio_base_window_separate: false,

    // 天氣 overlay（暫關）
    weather_sunny:   false,
    weather_cloudy:  false,
    weather_rainy:   false,
    weather_thunder: false,
    weather_typhoon: false,

    // 道具 overlay（暫關）
    prop_morning:    false,
    prop_afternoon:  false,
    prop_evening:    false,
    prop_late_night: false,

    // ✅ 保留：UI 元素（24H AI LIVE badge + 跑馬燈）
    ui_brand_24h:  true,
    ui_marquee_bg: true,

    // Phase 3 Step 4: 小美動作 spritesheet（6 frames、保留向下相容）
    char_xiaomei_actions: false,

    // Phase 4 Step 5.12: Codex 73 號 emotion sheet（256x256 × 4 col × 7 row = 7 表情 × 4 frame）
    // 預設 off、需手動驗證比例 / 站位 / 與 bubble 不衝突再開啟
    char_xiaomei_v2_emotion_sheet: false,

    // Phase 4 Step 5.14: Codex 79 號 V3 emotion sheet（V2 重畫版、修怪手 + 嘴位）
    // 預設 off、驗收後翻 ON 取代 V2
    char_xiaomei_v3_emotion_sheet: false,

    // 角色 v2 draft（Phase 3 Step 1.2 測試用、保留）
    char_aming_v2:   true,
    char_xiaomei_v2: true,

    // 角色 v1（保留）
    char_aming:   true,
    char_xiaomei: false,

    // 家具
    desk:          true,   // assets/desk.png 已存在
    desk_boss:     false,
    desk_market:   false,
    monitor:       false,
    monitor_dual:  false,
    chair_back:    false,
    plant_sm:      false,
    plant_lg:      false,
    ceiling_light: false,
    whiteboard:    false,
    server_rack:   false,
    bubble_bg:     false,

    // 場景背景（Phase 2 製作後改為 true）
    studio_bg:   false,
    newsdesk_bg: false,
    coffee_bg:   false,
    meeting_bg:  false,
  },
};
