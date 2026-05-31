# 73 Claude Xiaomei Emotion Sheet Usage

## New Asset

Codex created a 24H chat-focused Xiaomei emotion sprite sheet:

```txt
assets/char_xiaomei_v2_emotion_sheet_256.png
```

## Purpose

This sheet is for the 24H AI chat livestream.

It is not a walking/RPG sheet. It focuses on host-style emotional reactions:

- idle
- talk
- smile
- thinking
- surprised
- skeptical
- wave

The character must remain non-SD/chibi. Please preserve her tall original proportion in-scene.

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

## Suggested Phaser Load

```js
this.load.spritesheet('xiaomei_emotion_sheet', 'assets/char_xiaomei_v2_emotion_sheet_256.png', {
  frameWidth: 256,
  frameHeight: 256,
});
```

## Suggested Animation Keys

```js
const xiaomeiAnims = [
  ['xiaomei_idle', 0, 3, 4],
  ['xiaomei_talk', 4, 7, 5],
  ['xiaomei_smile', 8, 11, 4],
  ['xiaomei_thinking', 12, 15, 4],
  ['xiaomei_surprised', 16, 19, 5],
  ['xiaomei_skeptical', 20, 23, 4],
  ['xiaomei_wave', 24, 27, 5],
];

for (const [key, start, end, frameRate] of xiaomeiAnims) {
  this.anims.create({
    key,
    frames: this.anims.generateFrameNumbers('xiaomei_emotion_sheet', { start, end }),
    frameRate,
    repeat: -1,
  });
}
```

## Dialogue Data Recommendation

When Claude generates dialogue, add an optional `emotion` field per line:

```json
{
  "speaker": "xiaomei",
  "text": "這個說法我覺得要再看細節，不能只看標題啦。",
  "emotion": "thinking"
}
```

Allowed emotion values:

```txt
idle
talk
smile
thinking
surprised
skeptical
wave
```

Fallback rule:

- if `emotion` is missing: use `talk` while speaking
- if not speaking: use `idle`
- if unknown emotion value: use `talk`

## Suggested Mapping

```txt
neutral/general line -> talk
agreement/light joke -> smile
analysis/explanation -> thinking
unexpected claim -> surprised
doubt/critique/tucao -> skeptical
greeting/CTA -> wave
silent state -> idle
```

## Integration Recommendation

Please add this behind a feature flag first:

```txt
USE_XIAOMEI_EMOTION_SHEET = false
```

Do not globally replace the stable Xiaomei render until:

- scale matches Amin
- feet are grounded on the floor
- dialogue bubbles do not cover her face/body
- no SD/chibi feeling appears in 1920x1080 scene

## Implementation Brief

After testing, please output:

```txt
73_XIAOMEI_EMOTION_SHEET_IMPL_BRIEF.md
```

Include:

- files changed
- whether the feature flag defaults on or off
- selected scale and position
- how `emotion` is parsed or defaulted
- visual test notes

