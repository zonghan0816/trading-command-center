# 79 Claude Xiaomei V3 Emotion Sheet Usage

## New Asset

Codex rebuilt Xiaomei's emotion sprite sheet.

Use this new v3 asset for testing:

```txt
assets/char_xiaomei_v3_emotion_sheet_256.png
```

Chroma-key source is also kept for reference:

```txt
assets/char_xiaomei_v3_emotion_sheet_256_source_chromakey.png
```

## Why V3 Exists

The previous sheet had visual problems:

- talk mouth movement was not clearly on the face
- wave looked like a pasted/floating hand
- some body details flickered in the wrong place

V3 was rebuilt with full-character frames:

- talk mouth is on the face
- wave arm connects from shoulder to elbow to hand
- thinking/surprised/skeptical are full-body poses
- character remains non-SD/chibi

## Sprite Sheet Spec

- PNG
- transparent background
- total size: `1024x1792`
- frame size: `256x256`
- layout: `4 columns x 7 rows`
- row-major Phaser frame indexes

## Animation Rows / Frame Indexes

```txt
Row 1 idle:       frames 0-3
Row 2 talk:       frames 4-7
Row 3 smile:      frames 8-11
Row 4 thinking:   frames 12-15
Row 5 surprised:  frames 16-19
Row 6 skeptical:  frames 20-23
Row 7 wave:       frames 24-27
```

## Phaser Load

```js
this.load.spritesheet('xiaomei_v3_emotion_sheet', 'assets/char_xiaomei_v3_emotion_sheet_256.png', {
  frameWidth: 256,
  frameHeight: 256,
});
```

## Suggested Animation Keys

```js
const xiaomeiV3Anims = [
  ['xiaomei_v3_idle', 0, 3, 4],
  ['xiaomei_v3_talk', 4, 7, 5],
  ['xiaomei_v3_smile', 8, 11, 4],
  ['xiaomei_v3_thinking', 12, 15, 4],
  ['xiaomei_v3_surprised', 16, 19, 5],
  ['xiaomei_v3_skeptical', 20, 23, 4],
  ['xiaomei_v3_wave', 24, 27, 5],
];

for (const [key, start, end, frameRate] of xiaomeiV3Anims) {
  this.anims.create({
    key,
    frames: this.anims.generateFrameNumbers('xiaomei_v3_emotion_sheet', { start, end }),
    frameRate,
    repeat: -1,
  });
}
```

## Integration Recommendation

Please do not directly replace the stable Xiaomei render.

Add or reuse a feature flag:

```txt
USE_XIAOMEI_V3_EMOTION_SHEET = false
```

Suggested mapping:

```txt
idle       -> xiaomei_v3_idle
talk       -> xiaomei_v3_talk
smile      -> xiaomei_v3_smile
thinking   -> xiaomei_v3_thinking
surprised  -> xiaomei_v3_surprised
skeptical  -> xiaomei_v3_skeptical
wave       -> xiaomei_v3_wave
```

Fallback:

- missing emotion while speaking -> `talk`
- not speaking -> `idle`
- unknown emotion -> `talk`

## Visual Check Required

Please test at `localhost:8765` before turning this on by default.

Check:

- Xiaomei's feet are grounded on the floor
- scale matches Amin and current scene composition
- no cropped head, feet, or raised hand
- talk animation reads as mouth movement on face
- wave does not look like a floating hand
- emotion changes do not distract from the 24H chat show

## Known Style Note

V3 is cleaner and more usable than the previous sheet, but it is slightly more polished anime-pixel than strict old-school 16-bit pixel art.

If this style looks too different from the current Amin asset, keep the flag off and report the mismatch.

## Implementation Brief

After wiring/testing, please output:

```txt
79_XIAOMEI_V3_EMOTION_SHEET_IMPL_BRIEF.md
```

Include:

- files changed
- feature flag default
- chosen scale and position
- whether v3 visually matches Amin
- screenshot/visual check notes

