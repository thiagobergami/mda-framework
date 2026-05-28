---
id: DYN-001
name: Round Tension Loop
traces_to_aesthetics: [AES-001, AES-002]
---

# Round Tension Loop

## Behavior Description

Across the 60 seconds of a round, the seeker's confidence rises as they
cover ground and the hiders' calm dips as the timer drains. The dynamic
should produce a very small pressure spike near 0:10 remaining — a
single beat of "will they find me?" — and then immediately resolve at
the round-end horn. The cap on the loop (the 60-second timer) is what
keeps the dynamic cozy rather than tense.

## Feedback System

Two loops drive this dynamic:

- **Loop: Seeker Confidence Build** — *Positive*. Cycle: seeker covers a corner → marks it cleared → covers next corner → mental "I'm narrowing it down" → covers faster → repeat. Effect: builds the small pressure spike that serves AES-001 (Fellowship — the group shares the spike) and is bounded by the timer so it never crosses into the tense register that would break AES-002.
- **Loop: Timer-Cap Damper** — *Negative*. Cycle: time remaining decreases → seeker confidence approaches "win" or "lose" → at t=0 horn fires → state resets regardless of outcome → next round begins fresh. Effect: the dampening loop that prevents tension from accumulating across rounds; the rule that protects the Cozy Register.

### Diagram

```
   ┌───── 60s timer drains ─────┐
   │                            ▼
seeker covers ground ──(+)──▶ confidence rises
   ▲                            │
   │                            ▼
   │                       hider hides better
   │                            │
   └─────────(amplifying)───────┘

   round-end horn ──(−)──▶ confidence resets to 0
                              │
                              ▼
                         next round begins
```

## Interaction Patterns

### Pattern: Near-Miss Hover
- **Trigger**: Seeker passes within 5 studs of a hiding spot containing a hider without spotting.
- **Sequence**: Hider holds breath cue → seeker pauses → seeker moves on → hider exhales.
- **Duration**: 1–3 seconds.
- **Outcome**: A "shared giggle moment" that the chat-message proxy on AES-001 picks up.

### Pattern: Final-10s Sweep
- **Trigger**: Timer reaches 10 seconds remaining.
- **Sequence**: Seeker accelerates → covers the last uncleared corners → either finds or doesn't → horn.
- **Duration**: ≤ 10 seconds, hard-capped.
- **Outcome**: Either a find right at the buzzer (peak Fellowship beat) or a clean escape (no-elimination resets cleanly).

## Invariants

- **INV-1**: Round duration must be ≤ 60 seconds wall-time, even if the seeker is mid-action when the timer expires. The horn fires unconditionally.
- **INV-2**: Seeker confidence (system-tracked progress through cleared spots) is reset to zero at the start of every round. There is no cross-round accumulation.
- **INV-3**: The Final-10s Sweep pattern can fire at most once per round. If the seeker hits "10s remaining" twice in a round (e.g., due to a pause), the second event is suppressed.

## Degenerate Dynamics

- **Dread Accumulation**: If the timer cap fails or the round runs long, seeker confidence keeps building past the cozy register's tolerance and the find feels like a defeat. Breaks: AES-002 (Cozy Register), AES-001 (Fellowship). Detection: round duration measured at > 65 s in any session. Prevention: hard timer cap with no extension, enforced by INV-1.
- **Pre-Round Doom Loop**: If the lobby pause between rounds is too long, the tension from one round bleeds into the next as anticipation. Breaks: AES-002. Detection: `find_to_lobby_pause_duration > 12 s`. Prevention: cap lobby pause at 10 s and auto-start.

## Audience Context

Same audience as AES-001 and AES-002 — friend groups of 2–4, ages 8–14,
cozy register. The "tension" here is small; if you read the description
and pictured anything close to horror-game tension, you have the wrong
register in mind.
