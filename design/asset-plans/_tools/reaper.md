---
id: TOOL-reaper
name: Reaper
mcp-required: reaper-mcp
asset-types: [music, sound]
---

# Reaper — Tool Profile

Authoring profile for music tracks and sound effects. Outputs `.wav` for
high-fidelity intermediates and `.ogg` for engine import (Roblox prefers
small `.ogg`).

## Inputs: music

- text (optional) — Description of mood, genre, instrumentation, role in the game
- audio (optional) — Reference track or hummed melody

## Inputs: sound

- text (optional) — Description of the event the sound accompanies, intended duration
- audio (optional) — Reference recording or pre-recorded source

## Milestones: music

### M1 — Project setup

Create a Reaper session at the project's audio standard (48 kHz / 24-bit).
Set tempo, key signature, and time signature from the asset spec or
style-guide. Establish a tempo grid before any tracks are recorded.

**Validation.** Sample rate matches style-guide; tempo and key match asset spec's BPM/key fields if declared.
**Expected artifact.** M1-session.rpp

```mcp
tool: reaper
call: project.new
args: { sample_rate: 48000, bit_depth: 24, tempo: "{bpm}", key: "{key}", time_sig: "{time_sig}" }
```

### M2 — Instrumentation

Add tracks for every layer the asset spec calls out (per-layer mix is
required for dynamic music). One track per stem at minimum: drums, bass,
melody, harmony, FX.

**Validation.** Track count ≥ asset spec's Layers count; each track named per the spec; routing groups exist for stem export.
**Expected artifact.** M2-instrumentation.rpp

```mcp
tool: reaper
call: track.add_batch
args: { names: "{layer_names}" }
```

### M3 — Arrangement

Compose the actual material into intro / loop / outro per the spec's
transition rules. Loop point declared explicitly so the engine can
seamlessly cycle.

**Validation.** Loop point is on a beat boundary; intro is shorter than the longest expected anticipation window; outro silence ≤ 200ms.
**Expected artifact.** M3-arranged.rpp

### M4 — Mix

Balance the tracks against the asset spec's loudness target. Apply EQ,
compression, and any sweetening per stem.

**Validation.** Integrated loudness within ±0.5 LU of target (-14 LUFS by default); no clipping on master; per-stem solo plays cleanly.
**Expected artifact.** M4-mixed.rpp

```mcp
tool: reaper
call: master.measure_loudness
args: { window: "integrated" }

tool: reaper
call: master.add_limiter
args: { ceiling: -1.0, release: 50 }
```

### M5 — Master

Final glue: subtle bus compression, master limiter, dither for export.

**Validation.** True peak ≤ -1.0 dBTP; integrated LUFS hits target.
**Expected artifact.** M5-master.rpp

### M6 — Export

Render the master plus per-stem files per the spec's Layers configuration.

**Validation.** File size within budget; loop point preserved by the encoder; each stem file plays independently.
**Expected artifact.** {asset-id}.ogg (+ stems if dynamic)

```mcp
tool: reaper
call: export.render
args: {
  master: { format: "ogg", quality: 6, path: "output/{asset_id}.ogg" },
  stems: { format: "ogg", per_track: true, dir: "output/stems/" }
}
```

## Milestones: sound

### M1 — Source

Either record fresh or pick from a curated library entry that fits the
asset spec's emotional intent. For voiced lines, use a clean booth-style
take.

**Validation.** Source clip clean (no clipping, minimal background noise); duration within the spec's range.
**Expected artifact.** M1-source.wav

### M2 — Trim

Cut to length, fade in/out the leading and trailing silence.

**Validation.** Pre-onset silence ≤ 10ms; tail decay matches spec's RollOff if 3D.
**Expected artifact.** M2-trimmed.wav

### M3 — Process

EQ, compression, optional reverb/delay/distortion per the asset spec's
character. Spatial sounds get a slight high-shelf cut to leave room for
the engine's distance attenuation.

**Validation.** Tonal center matches spec; no resonant peaks above -3 dB.
**Expected artifact.** M3-processed.wav

### M4 — Mix

Set the file's peak so it sits naturally at the spec's volume range
relative to other game sounds. Mono for spatial; stereo only if the spec
explicitly says 2D ambient.

**Validation.** Peak amplitude within spec's volume range; channel count matches spec.
**Expected artifact.** M4-mixed.wav

### M5 — Export

Render to engine-friendly format. Roblox accepts `.ogg` (preferred, small)
and `.mp3` (avoid for short SFX — codec adds latency).

**Validation.** File size within budget; metadata stripped.
**Expected artifact.** {asset-id}.ogg

```mcp
tool: reaper
call: export.render
args: { format: "ogg", quality: 5, path: "output/{asset_id}.ogg", strip_metadata: true }
```
