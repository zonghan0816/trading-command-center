# 71 GPT Review Reply After Step 4

## Overall Judgment

GPT agrees with Claude's main direction:

> Next priority should be Cost Guard, not more asset polishing.

The project direction is still:

> 24H AI chat livestream

News is only conversation fuel. Please avoid drifting back into a traditional news broadcast product.

## Step 4 Prompt Rules

GPT thinks the Step 4 "fact-based + lively style" prompt direction is correct.

It already covers the main legal and platform risks:

- political-person accusations
- party-position accusations
- conspiracy-style claims
- cross-strait / independence-unification hot zones
- company or individual wrongdoing claims without evidence

One suggested addition:

> Do not use phrases like "heard that", "someone leaked", "online rumors say", or "people are saying" to disguise an unverified accusation.

This is a common way risky claims slip through while sounding casual.

## Tone Strictness

GPT does not recommend adding many more restrictions to the 8 tone styles.

The current rules are already strict enough. If more prohibitions are added, Claude may become too mild and lose the lively chat feeling.

Recommended core rule:

> It is okay to criticize or joke about social phenomena, public policy effects, and observable patterns. Do not accuse specific people, parties, companies, or groups of hidden motives, crimes, corruption, or betrayal without verified evidence.

## Recommended Next Order

### 1. Step 5 Cost Guard

Highest priority.

Please implement budget protection before any 24H-style long run:

- monthly budget limit
- daily budget limit if practical
- usage accumulation
- `/api/chat` entry guard
- graceful pause/fallback response when over budget
- frontend state that stops repeated fetch loops when paused

This is the most important operational protection for a 24H livestream.

### 2. Lightweight Quality Breaker

GPT suggests moving this immediately after Cost Guard, before major architecture work.

Reason:

24H livestream risk is not only cost. The other major risk is AI saying something unsafe, legally risky, or too politically charged while unattended.

The first version can be lightweight:

- scan generated dialogue before returning it
- if risky patterns appear, replace with a safe fallback line
- log the blocked text internally for debugging
- avoid overengineering a full moderation pipeline at this stage

### 3. Mode Naming + Central LED Brand Cleanup

This is a small visual/product alignment pass.

Suggested direction:

- rename modes from generic `discussion/idle` toward `live_chat / chat_replay / idle`
- central LED should feel like `24H AI LIVE` / AI chat identity
- topic remains visible, but should not make the show feel like a formal news broadcast

### 4. Pool / Batch Architecture

This is still important, but it is a larger architecture change.

Do it after Cost Guard and lightweight Quality Breaker are in place.

Reason:

Cost Guard protects the project even before Pool/Batch is complete. Pool/Batch is the long-term cost solution, but it is not the first safety guard.

### 5. Asset Rewiring Later

GPT agrees with temporarily backing off the new assets.

The assets are not wasted, but they need a more complete plan before being reintroduced:

- night/evening window version is needed
- weather overlays need time-of-day logic
- props need scale/depth validation
- character feet/grounding need visual adjustment
- A group role sheets need actual in-scene testing

For now, keeping only the accepted `24H AI LIVE` badge and bottom marquee is reasonable.

## Final Recommendation

Claude's proposed order is mostly correct.

GPT's only important adjustment:

> Put lightweight Quality Breaker right after Cost Guard, before Pool / Batch and before another large visual pass.

Recommended next implementation brief after work:

```txt
71_PHASE4_STEP5_COST_GUARD_IMPL_BRIEF.md
```

If Quality Breaker is included in the same pass, mention clearly whether it is only a first lightweight version.

