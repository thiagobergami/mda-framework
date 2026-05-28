---
id: GAME-001
name: Cozy Hide and Seek
version: 1
---

# Cozy Hide and Seek

## Vision

A small, cozy Roblox party game built around a 60-second hide-and-seek round
played by 2–4 friends on a single tiny map. Rounds are short, the register is
pastel-warm rather than tense, and no one is ever out — when the seeker finds
a hider, the hider becomes the next round's seeker. The game exists to deliver
the gentle, low-stakes pleasure of *playing together* in a shared, safe space.

## Aesthetic Profile

| Priority   | Aesthetic  | Role in this game |
|------------|------------|-------------------|
| Primary    | Fellowship | Every rule — short rounds, role rotation, no elimination — exists to keep the group together and giggling. Cooperation is implicit (we're all in the same round) even though play is competitive on the surface. |
| Secondary  | Sensation  | Cosy pastel palette, soft ambient music, gentle "pop" feedback on finds. The felt texture of the game is its second pillar — players should describe it as "soft" or "warm". |
| Tertiary   | Discovery  | Each map has more hiding spots than rounds; players keep finding new nooks across a session. Light, not the spine of the design. |
| Tertiary   | Challenge  | A 60-second timer creates a tiny pressure spike; the seeker has to commit. Never lethal — the round ends, never the player. |
| Tertiary   | Fantasy    | The setting (a tiny cosy room) sets the mood but the game does not lean into make-believe role-play. |
| Absent     | Submission | No grinding, idle loops, or pastime hooks. Sessions are bounded by rounds, not by an open-ended drip. |
| Absent     | Narrative  | Round-based; there is no story, no progression, no characters with arcs. |
| Absent     | Expression | Players don't build, decorate, or customise. Avatars are present but not the point. |

**Conflicts and resolutions**: When **Fellowship** tensions with **Challenge** (a
fast seeker who steamrolls the round), Fellowship wins — the role rotates next
round so no one is stuck losing. When **Discovery** tensions with **Fellowship**
(a hider who finds a perfect spot nobody can solve), the 60-second timer
resolves it: the round ends, everyone rejoins the lobby, the find/no-find is
no big deal.

## Core Loop

### Primary Loop
```
Pick role (seek/hide) → Round begins → Hide or seek for 60s → Round ends
   → Found hiders become next round's seekers → Pick role → repeat
```
- **Frequency**: One cycle per round (~75s wall time including lobby pause).
  Sessions run 4–8 rounds.
- **Serves aesthetic**: Fellowship (the rotation keeps everyone in the social
  flow); Sensation (each round's end carries a small "warm" beat).

### Secondary Loops
```
Notice a new corner of the map → Hide there next round → Either get found
  or not → Add corner to "places I know" → look for new ones
```
- **Frequency**: Across the session, not per round.
- **Serves aesthetic**: Discovery.
- **Relationship to primary**: Folded into the primary loop — the hide step
  pulls from the player's mental map of nooks.

## Target Audience

- **Age range**: 8–14 (with grandparent / sibling co-play in scope; the cozy
  register is friendly to mixed-age sessions).
- **Player archetype**: Socializers (Bartle). Achievers and Killers will bounce
  off — there is no leaderboard worth optimising and no one to take out.
- **Experience level**: Casual Roblox. The game must be legible inside the
  first 30 seconds with no tutorial.
- **Session length**: 5–15 minutes (4–8 rounds, plus lobby).
- **Social context**: Live co-located or voice-chat friends; 2–4 players.

## Platform Constraints

- **Runtime**: Roblox.
- **Language**: Luau.
- **Target devices**: PC + mobile + Xbox controller. The map is small enough to
  navigate on touch without precision pain.
- **Performance budget**: 60 fps on mid-tier mobile. Single-map budget; no
  procedural geometry.
- **Input methods**: Keyboard/mouse, touch, gamepad. One action button ("hide"
  / "found you").
- **Network model**: Roblox client–server, one server per session.

## Feature Map

| Feature                       | Primary Aesthetic | Priority      | Status      |
|-------------------------------|-------------------|---------------|-------------|
| Hide-and-seek round           | Fellowship        | Must-have     | Specced     |
| Cosy aesthetic register       | Sensation         | Must-have     | Specced     |
| Role swap on find             | Fellowship        | Must-have     | Specced     |
| Hiding-spot affordances       | Discovery         | Must-have     | Specced     |
| Per-session round summary     | Fellowship        | Should-have   | Specced     |

## Boundaries

- **Not a competitive game**: No elimination, no per-session leaderboard with
  stakes, no ELO. Competition undermines Fellowship in mixed-skill groups.
- **Not a horror game**: The register is warm and gentle. Jump-scares, dread,
  or chase music violate Sensation.
- **Not an open-world or exploration game**: One small map per session. A
  bigger map dilutes Fellowship (players drift apart) and pulls Discovery into
  the primary slot.
- **Not asynchronous**: All rounds are live with everyone in the lobby; there
  is no "play your turn later". Asynchronous play kills Fellowship.
- **No avatar customisation or building**: Expression is explicitly Absent; we
  do not invite players to spend time on self-presentation.

## Reference Games

| Game                          | What to learn from                                                  | What to avoid                                                  |
|-------------------------------|---------------------------------------------------------------------|----------------------------------------------------------------|
| Among Us                      | The lobby-and-round rhythm; the way social friction creates the fun | The deception layer — Fellowship here is non-adversarial       |
| Animal Crossing (lobby/visit) | The pastel register, the "soft" feedback on small events            | The pastime/Submission loop — we don't want endless play       |
| Roblox "Hide and Seek Extreme"| The genre legibility on Roblox; rounds, roles, simple controls      | The competitive scoreboard / elimination — we keep everyone in |

## Success Criteria

- **Group retention per session**: ≥ 80% of players in a lobby play ≥ 4 rounds
  before leaving. (Proxy for Fellowship.)
- **Self-reported "cosy" descriptor**: ≥ 50% of post-session surveys use words
  in the {soft, cozy, warm, gentle, sweet} cluster. (Proxy for Sensation.)
- **Round completion rate**: ≥ 95% of started rounds finish (no early aborts
  from disconnects or rage-quits). (Proxy for the no-elimination rule
  delivering on Fellowship.)
- **Hiding-spot novelty**: average unique hiding spots used per player per
  session ≥ 2. (Proxy for Discovery — players keep exploring within the
  small map.)
