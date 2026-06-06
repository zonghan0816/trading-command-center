// ╔══════════════════════════════════════════════════════════════╗
// ║          晚晚嘴台灣 WWT — 自訂設定檔                         ║
// ║  修改這個檔案即可調整外觀，不需要碰其他程式碼                ║
// ╚══════════════════════════════════════════════════════════════╝

export const CONFIG = {

  // ── 背景音樂 BGM ─────────────────────────────────────────────
  //  bgmVolume：背景音樂音量。0 = 靜音、1 = 最大。預設 0.14（不蓋過主持人語音）。
  //  太小聲就調大（例如 0.2、0.3）、太吵就調小。改完存檔 F5 即可、不用重開伺服器。
  audio: {
    bgmVolume: 0.14,
  },

  // ── 窗外天氣（整張背景替換、不是窗戶圖層）─────────────────────
  //  做法：背景 = studio_bg_{時段}_{天氣}.png（完整圖、窗景+地板採光一致）。
  //  缺對應天氣圖 → 自動 fallback 回該時段晴天版（不會壞）。
  //  enabled：有天氣背景圖後設 true、BootScene 才會去載那些變體圖。
  //  variants：有哪些天氣變體（檔名後綴）。對應檔案放 assets/、命名見下。
  //    例：studio_bg_morning_rain.png / studio_bg_noon_rain.png / studio_bg_night_rain.png
  //  天氣由後端 state.weather 控制（手動 /api/weather 或之後接中央氣象署）。
  //  "clear" = 用現有三張（無後綴）= 晴天。
  weatherBg: {
    enabled: true,
    variants: ['cloudy', 'rain', 'thunder', 'typhoon'],   // 有做哪些（晴天不用列）
    slots: ['morning', 'noon', 'afternoon', 'night'],
    // 註：目前天氣圖只做了「中午」時段（studio_bg_noon_{天氣}）、其他時段缺圖會自動 fallback 回該時段晴天。
  },

  // ── 佈局 ─────────────────────────────────────────────────────
  layout: {
    wallHeightRatio: 0.44,

    // WWT 主持人座位（OfficeScene.js 更新後使用）
    //  xRatio：角色左右位置（0=最左、0.5=正中、1=最右）。角色與泡泡會一起移動。
    hosts: {
      aming:   { xRatio: 0.33, yOffsetFromWall: 460, seat: 'left'  },
      xiaomei: { xRatio: 0.68, yOffsetFromWall: 460, seat: 'right' },
    },

    // ── 對話泡泡上下微調（px）──────────────────────────────────────
    //  左右會自動跟著角色，這裡只調上下高低、每個角色獨立。
    //  負值 = 往上、正值 = 往下、0 = 維持預設（頭頂下方 70px）。
    bubbleYOffset: {
      aming:   -250,
      xiaomei: -250,
    },

    // ── 對話泡泡左右微調（px）──────────────────────────────────────
    //  正值 = 往右、負值 = 往左、0 = 維持預設（角色旁邊）。
    //  安安（右側）想靠近角色 → 設負值往左；阿明（左側）想靠近 → 設正值往右。
    bubbleXOffset: {
      aming:   0,
      xiaomei: -80,
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
    characterIndividual:      0.49, // 王于安 individual PNG 1254×1254 用
    characterIndividualAming: 0.51, // 3Q 陳柏惟 individual PNG 用、獨立調整
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
    char_aming_v3_actions:   false,
    char_aming_v3_sitting:   false,
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

    // Phase 4 Step 5.17: 王于安 individual PNG（12 emotion + 3 action）
    // 路徑 assets/char_xiaomei/{emo,act}_*.png、預設 ON
    // 改成 false 會 fallback 到 v2 draft 單張
    char_xiaomei_individual: true,
    char_xiaomei_v2: true,           // fallback、Phase 5.17 沒打開時用
    // BootScene._makeCharacters 用 char_xiaomei flag 判斷 isCustom、
    // 沒這個會走程序生成分支、新分支跑不到
    char_xiaomei: true,

    // 3Q 陳柏惟 individual PNG（9 emotion）
    // 路徑 assets/char_3q/emo_*.png
    // false → fallback 到 char_aming_v2（阿明哥備用）
    char_3q_individual: true,

    // 阿明哥 v2 draft（3Q 出問題時的備用）
    char_aming_v2: true,

    // 角色 v1（純 fallback、檔案存在才會 load）
    char_aming: true,

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
