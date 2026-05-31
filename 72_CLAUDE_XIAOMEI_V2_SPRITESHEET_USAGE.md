# 72 Claude Xiaomei V2 Sprite Sheet Usage

## Important Update

Do not use the first `128x128` sheet as the main asset.

Reason:

- `128x128` full-body frames make the character feel too SD/chibi.
- User explicitly wants Xiaomei to keep the original tall body proportion.

Please use the new preferred non-SD version:

```txt
assets/char_xiaomei_v2_sprite_sheet_256.png
```

## Sprite Sheet Spec

- PNG
- transparent background
- total size: `2048x1024`
- frame size: `256x256`
- layout: `8 columns x 4 rows`
- same Xiaomei character design as `char_xiaomei_v2_draft.png`
- preserves the original non-SD body proportion

## Animation Rows / Frame Indexes

Phaser frame indexes are row-major:

```txt
Row 1 idle:  frames 0-5
Row 2 walk:  frames 8-15
Row 3 talk:  frames 16-19
Row 4 wave:  frames 24-29
```

Frames `6-7`, `20-23`, and `30-31` are hold/duplicate frames and do not need to be used for the first pass.

## Suggested Phaser Load

```js
this.load.spritesheet('xiaomei_v2_sheet', 'assets/char_xiaomei_v2_sprite_sheet_128.png', {
  frameWidth: 128,
  frameHeight: 128,
});
```

Preferred updated load:

```js
this.load.spritesheet('xiaomei_v2_sheet', 'assets/char_xiaomei_v2_sprite_sheet_256.png', {
  frameWidth: 256,
  frameHeight: 256,
});
```

## Suggested Animation Keys

```js
this.anims.create({
  key: 'xiaomei_idle',
  frames: this.anims.generateFrameNumbers('xiaomei_v2_sheet', { start: 0, end: 5 }),
  frameRate: 4,
  repeat: -1,
});

this.anims.create({
  key: 'xiaomei_walk',
  frames: this.anims.generateFrameNumbers('xiaomei_v2_sheet', { start: 8, end: 15 }),
  frameRate: 8,
  repeat: -1,
});

this.anims.create({
  key: 'xiaomei_talk',
  frames: this.anims.generateFrameNumbers('xiaomei_v2_sheet', { start: 16, end: 19 }),
  frameRate: 5,
  repeat: -1,
});

this.anims.create({
  key: 'xiaomei_wave',
  frames: this.anims.generateFrameNumbers('xiaomei_v2_sheet', { start: 24, end: 29 }),
  frameRate: 6,
  repeat: -1,
});
```

## Integration Recommendation

Use this only as an optional test asset first.

Please do not replace the stable current Xiaomei render globally until visual scale and grounding are checked in the real scene.

Suggested first wiring:

- Add config flag such as `USE_XIAOMEI_V2_SPRITESHEET = false`
- If enabled, use `xiaomei_v2_sheet`
- Default animation: `xiaomei_idle`
- During dialogue: `xiaomei_talk`
- For greeting/CTA moment: `xiaomei_wave`

## Visual Check Required

After wiring, verify:

- Xiaomei's feet stand on the floor, not on the desk/platform edge
- full body is not cropped
- sprite scale matches Amin
- character must not look SD/chibi
- dialogue bubbles do not cover her face/body
- animation does not jitter too much

## Implementation Brief

After testing, please output:

```txt
72_XIAOMEI_V2_SPRITESHEET_IMPL_BRIEF.md
```

Include:

- files changed
- whether the config flag defaults to on or off
- chosen scale and position
- screenshot/visual check notes
