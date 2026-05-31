# 68 Claude Step 2.1 Visual Tuning Report

## Context

User has confirmed the Phase 4 asset wiring is now visible on `localhost:8765`.

The current screen already shows:

- `24H AI LIVE` badge
- weather/window overlay
- studio prop/table overlay
- bottom marquee
- two hosts with dialogue boxes

This means the Step 2 wiring direction is broadly correct. The next pass should be a small visual tuning pass, not a large architecture rewrite.

## Main Goal

Keep the project positioned as:

> 24H AI chat livestream

News is only the topic source for conversation. Please avoid pushing the UI further toward a traditional TV news broadcast or breaking-news layout.

## Observed Issues From Screenshot

1. The `24H AI LIVE` badge is visible and works, but it is too large.
   - It occupies too much stage space in the upper-left area.
   - Suggested adjustment: scale it down and move it slightly inward or to a less intrusive corner.

2. The center prop/table overlay is visually strong.
   - It partially competes with the main topic text and host area.
   - Suggested adjustment: reduce height/scale, lower opacity if needed, or place it more clearly behind the characters and behind the main title area.

3. The main topic text should remain the visual priority.
   - Avoid props covering or visually fighting the current topic.
   - Keep the central board readable at 1920x1080 OBS/browser capture size.

4. The bottom marquee is acceptable, but should stay as channel/chat identity.
   - Current style is okay.
   - Avoid turning it into a news ticker or breaking-news crawl.
   - Preferred wording direction: 24H AI chat, topic discussion, audience companionship.

5. Character assets are now acceptable.
   - Xiaomei no longer has the previous obvious white edge/halo issue.
   - Current standing style can be kept for now.

## Suggested Step 2.1 Scope

Please do only a focused visual polish pass:

- Reduce `ui_brand_24h_ai_live` display size.
- Adjust prop overlay scale/depth/position so it supports the scene instead of dominating it.
- Ensure topic text, hosts, and dialogue bubbles remain readable and not crowded.
- Keep the livestream identity: "24H AI chat livestream", not "news channel broadcast".
- Keep changes mostly in the scene rendering layer unless a small helper is clearly needed.

## Please Output After Implementation

After finishing, please create:

```txt
68_PHASE4_STEP2_1_VISUAL_TUNING_IMPL_BRIEF.md
```

Brief should include:

- files changed
- exact visual adjustments made
- what remains for the next step
- whether browser/OBS-like 1920x1080 visual check passed

