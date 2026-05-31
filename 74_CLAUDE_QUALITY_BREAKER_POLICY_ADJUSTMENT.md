# 74 Claude Quality Breaker Policy Adjustment

## User Direction

User thinks the blacklist / sensitive-word system may be too heavy.

Important positioning:

> TDT is a 24H AI chat livestream, not a cautious formal news broadcast.

The show discusses public news topics and social phenomena. It should keep a sharp, lively, sometimes sarcastic commentary style.

User specifically does not want the system to become so restricted that every interesting line gets replaced by safe filler.

## GPT Judgment

GPT agrees with reducing the Quality Breaker strictness.

The current direction should not be:

> block many political / social keywords just because they are sensitive

The better direction is:

> prevent fabricated direct accusations while allowing sharp phenomenon-level commentary

## Recommended Adjustment

Do not keep expanding the blacklist.

Instead, downgrade Quality Breaker to a very light safety net.

### Keep Blocking Only The Hard Cases

Recommended hard-block categories:

1. Unverified accusation packaging
   - examples: `聽說`, `網友爆料`, `網路盛傳`, `據傳`, `有人說`
   - especially when followed by claims about a named person, party, company, crime, corruption, or betrayal.

2. Direct fabricated accusation patterns
   - examples:
     - `一定收了錢`
     - `肯定收賄`
     - `就是貪污`
     - `一定作票`
     - `背後有人操控`

3. Extremely heavy non-show topics
   - sexual assault / child abuse / graphic violence terms can remain blocked unless the project explicitly decides to handle them.

### Do Not Block Normal Political / Social Commentary Words

Avoid blocking single words such as:

```txt
貪污
收賄
黑金
內線
作票
賣台
舔共
舔美
親共
```

Reason:

These may appear in actual news headlines or public discourse. Blocking them as single keywords may over-trigger and make the show too bland.

If such words appear inside a news headline, the hosts can still discuss the broader phenomenon carefully.

## Suggested Behavior Change

Change Quality Breaker from:

> keyword appears -> replace line

to:

> risky accusation pattern appears -> replace line

That means checking phrase structure, not isolated words.

Example allowed:

```txt
這類爭議每次一出來，大家第一反應都會往黑金、內線那邊猜，這就是台灣政治新聞的老毛病。
```

Example blocked:

```txt
我看某某一定就是收了錢啦。
```

## Optional Safer First Step

If Claude wants minimal-risk implementation:

1. Remove most single-keyword blocks.
2. Keep only accusation-pattern blocks.
3. Add console log for suspicious lines, but do not replace unless it is clearly direct accusation.

This creates a middle ground:

- sharp style remains
- normal public-news vocabulary remains usable
- fabricated direct accusation still gets caught

## Tone Principle

The hosts may be sharp like political commentary personalities, but they should not invent facts.

Allowed:

- mock public phenomena
- criticize policy effects
- joke about repeated social patterns
- discuss what the public reaction is
- point out contradictions in headlines

Avoid:

- inventing hidden motives
- declaring a named person guilty
- saying a named party/company secretly did something without source
- using rumor phrasing to launder accusations

## Recommended Next Action

Please revise the Quality Breaker into a lighter version:

- stop adding broad keyword blacklist
- remove or disable most single-word political blocks
- keep only direct accusation-pattern blocks
- keep safe fallback for only clear direct-risk cases

After implementation, please output:

```txt
74_QUALITY_BREAKER_LIGHTENING_IMPL_BRIEF.md
```

Brief should include:

- removed blacklist items
- remaining hard-block patterns
- examples of allowed sharp commentary
- examples of blocked direct accusation

