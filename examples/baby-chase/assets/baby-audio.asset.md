---
id: AST-003, AST-004
name: Baby Chase Audio Library
type: sound, music
traces_to_mechanics: [MEC-001, MEC-002]
traces_to_aesthetics: [AES-001]
status: concept
---

# Baby Chase Audio Library

## Purpose

Audio is the primary delivery mechanism for the Sensation aesthetic in this game. Sound effects
make discoveries feel rewarding (the giggle on reveal), hints feel natural (a muffled sound from
the baby's direction), and the world feel alive (ambient house sounds). Music sets the emotional
tone for the entire session and evolves with the Narrative arc.

MEC-001 uses sounds for the hint system (Rule 4). MEC-002 uses sounds for expression reactions
(Rule 1) and idle behavior (Rule 2). Both use the bedtime wind-down audio cues.

## Emotional Intent

### Sound Effects
- **Primary emotion**: Delight and surprise — each sound is a small reward
- **Energy level**: Medium, decreasing to Low as sleepiness increases
- **Tone**: Soft, organic, child-like — real baby sounds, not cartoon SFX
- **Reference**: The sound design of Untitled Goose Game (character sounds that ARE the comedy/charm) or Animal Crossing (satisfying UI/reaction sounds)

### Music
- **Primary emotion**: Safety, warmth, gentle wonder
- **Energy level**: Low — never driving or urgent
- **Tone**: Lullaby-adjacent — acoustic instruments, simple melodies, music-box textures
- **Reference**: Katamari Damacy (whimsical, warm) meets Stardew Valley (cozy, gentle). Spirited Away soundtrack for the wind-down

## Technical Requirements — Sound Effects

| Sound Name | Duration | Spatial | Volume | RollOff | Loop |
|-----------|----------|---------|--------|---------|------|
| `Sound_Baby_Giggle` | 0.8-1.2s | 3D | 0.6 | 30 studs | No |
| `Sound_Baby_GiggleMuffled` | 0.6-1.0s | 3D | 0.3 | 20 studs | No |
| `Sound_Baby_Laugh` | 1.5-2.0s | 3D | 0.7 | 35 studs | No |
| `Sound_Baby_Surprise` | 0.5-0.8s | 3D | 0.6 | 30 studs | No |
| `Sound_Baby_Shy` | 0.4-0.7s | 3D | 0.4 | 20 studs | No |
| `Sound_Baby_Yawn` | 1.5-2.5s | 3D | 0.5 | 25 studs | No |
| `Sound_Baby_Sleepy` | 1.0-1.5s | 3D | 0.4 | 20 studs | No |
| `Sound_Baby_Footsteps` | 0.3s | 3D | 0.3 | 15 studs | No |
| `Sound_Discovery_Chime` | 1.0s | 2D | 0.5 | — | No |
| `Sound_Hint_Prop_Wiggle` | 0.8s | 3D | 0.4 | 20 studs | No |
| `Sound_UI_Bedtime` | 2.0s | 2D | 0.6 | — | No |

**Variation requirement**: Each baby sound (Giggle, Laugh, Surprise, Shy) must have at least
3 variations to avoid repetition. MEC-002 randomly selects a variation each time.

Naming with variation index: `Sound_Baby_Giggle_01`, `Sound_Baby_Giggle_02`, `Sound_Baby_Giggle_03`

### Spatial Audio Notes
- All baby sounds are 3D positional (attached to baby's HumanoidRootPart)
- RollOff distances are tuned so hint sounds (muffled giggle) are audible from ~1 room away but not across the house
- Discovery chime is 2D (non-spatial) — it's a UI reward, not a world sound
- Volume values are relative to Roblox SoundService default (1.0)

## Technical Requirements — Music

| Track Name | Duration | BPM | Loop | Layer |
|-----------|----------|-----|------|-------|
| `Music_Ambient_Cozy` | 120s | ~80 | Yes, seamless | Base |
| `Music_Ambient_Evening` | 120s | ~70 | Yes, seamless | Wind-down |
| `Music_Bedtime_Lullaby` | 60s | ~60 | No (plays once, fades) | Resolution |

### Dynamic Music System
Music transitions are driven by the Sleepiness Progression feedback loop (DYN-001):

```
sleepiness 0-2:  Music_Ambient_Cozy at full volume
sleepiness 3-4:  Crossfade to Music_Ambient_Evening over 5 seconds
sleepiness 5+:   Crossfade to Music_Bedtime_Lullaby over 8 seconds
bedtime scene:   Lullaby fades out over 10 seconds
```

- Crossfades use linear interpolation on Volume property
- No abrupt cuts — every transition is smooth
- Music tracks should be composed in compatible keys for seamless crossfading

## Variants

| Variant | Trigger | Difference from base |
|---------|---------|---------------------|
| Awake SFX | sleepiness 0-2 | Full volume, full speed baby sounds |
| Drowsy SFX | sleepiness 3-4 | 85% volume, 90% playback speed on baby sounds |
| Sleepy SFX | sleepiness 5+ | 70% volume, 80% playback speed on baby sounds |

## Roblox Integration

- **SFX location**: `SoundService.SFX.BabyChase` (Folder)
- **Music location**: `SoundService.Music.BabyChase` (Folder)
- **Instance type**: Sound instances, parented to SoundService folders
- **3D sounds at runtime**: Cloned to baby's HumanoidRootPart when played (then destroyed)
- **CollectionService tags**: None (sounds are referenced by name from a config table)
- **Config table pattern**:
  ```luau
  local SoundConfig = {
      BabyGiggle = { "Sound_Baby_Giggle_01", "Sound_Baby_Giggle_02", "Sound_Baby_Giggle_03" },
      BabyLaugh = { "Sound_Baby_Laugh_01", "Sound_Baby_Laugh_02", "Sound_Baby_Laugh_03" },
      -- ...
  }
  ```

## Placeholder Protocol

- **Placeholder description**: Roblox default "ding" or "beep" sounds with correct spatial/volume settings. Music replaced with a single looping tone at low volume. Distinct pitch per emotion category so testers can tell reactions apart:
  - Giggle: High pitch
  - Surprise: Rising pitch
  - Shy: Low pitch
  - Sleepy: Descending pitch
- **Placeholder location**: Use Roblox built-in sound IDs (e.g., `rbxassetid://` stock sounds) or generate simple tones
- **Behavioral equivalence**:
  - Must match duration ranges (code may use duration for timing)
  - Must have correct Spatial/RollOff settings (hint system depends on 3D audio)
  - Must have same instance names (code references by name)
  - Variation count must match (3 per emotion minimum)
- **Swap protocol**: Replace Sound instances in SoundService folders. Update `rbxassetid://` on each Sound's `SoundId` property. Code references sounds by name through the config table, not by asset ID directly
