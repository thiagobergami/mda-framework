---
id: AST-006
name: Discovery Particle Effects
type: particle
traces_to_mechanics: [MEC-002]
traces_to_aesthetics: [AES-001]
status: concept
---

# Discovery Particle Effects

## Purpose

Particle effects deliver the immediate visual reward of a discovery moment. When the player
finds the baby, a burst of particles reinforces the Sensation aesthetic — it transforms a
game event (discovery trigger) into a sensory experience. Without particles, discoveries
feel muted and mechanical.

MEC-002 fires particles as part of Rule 1 (Discovery Reaction Selection).

## Emotional Intent

- **Primary emotion**: Joy, reward, celebration — a small visual "hooray!"
- **Energy level**: High burst, quick settle — burst of energy that resolves fast
- **Tone**: Magical, sparkly, warm — like catching a firefly, not like an explosion
- **Reference**: Nintendo discovery effects (Zelda: BotW Korok discovery, Mario star collect). Soft, twinkling, celebratory. NOT aggressive (no screen shake, no flash)

## Technical Requirements

| Particle Name | Rate (burst) | Lifetime | Max Particles | Size | Color |
|--------------|-------------|----------|---------------|------|-------|
| `Particle_Discovery_Stars` | 20 (one burst) | 1.0-1.5s | 20 | 0.3-0.8 studs | Warm yellow → white fade |
| `Particle_Discovery_Sparkle` | 12 (one burst) | 0.8-1.2s | 12 | 0.2-0.5 studs | Soft pink → transparent |

### Behavior
- Both emitters fire simultaneously on discovery
- Stars rise upward with slight spread (SpreadAngle: 30, 30)
- Sparkles drift outward from baby center (radial velocity)
- Both fade to transparent over their lifetime (Transparency: 0 → 1)
- Total visual duration: ~1.5 seconds (matches reaction duration from MEC-002)
- No looping — single burst per discovery event

### Performance
- Max 32 concurrent particles (both emitters combined)
- Texture: Single 64x64 sprite per particle type (star shape, circle shape)
- No lights attached (particles are self-illuminated via LightEmission: 0.8)

## Variants

| Variant | Trigger | Difference from base |
|---------|---------|---------------------|
| Awake Discovery | sleepiness 0-2 | Full particle count, bright warm colors |
| Drowsy Discovery | sleepiness 3-4 | 70% particle count, softer/dimmer colors |
| Sleepy Discovery | sleepiness 5+ | 50% particle count, very soft, almost like dust motes |

## Roblox Integration

- **Template location**: `ReplicatedStorage.Assets.Particles`
- **Instance type**: Two ParticleEmitter instances inside a Part (attachment point)
- **Runtime behavior**: On discovery, clone the particle Part to baby's position, fire `Emit(N)` on both emitters, then `Debris:AddItem()` to clean up after 2 seconds
- **CollectionService tags**: `DiscoveryParticle`
- **Attributes**:
  - `ParticleVariant` (StringValue): "Awake" | "Drowsy" | "Sleepy" — set before emit

## Placeholder Protocol

- **Placeholder description**: Single default Roblox ParticleEmitter with `Sparkles` texture, white color, 15 particles burst. Visible and functional but not visually polished
- **Placeholder location**: Create via script — `Instance.new("ParticleEmitter")` with basic settings
- **Behavioral equivalence**:
  - Must emit on DiscoveryEvent (code calls `:Emit(N)`)
  - Must have ~1.5s visible duration (matches reaction timing)
  - Must be attached to baby position (code clones to position)
  - Cleanup must work via Debris service
- **Swap protocol**: Replace ParticleEmitter templates in `ReplicatedStorage.Assets.Particles`. Code references by tag, not by path. Particle properties (Rate, Color, Size, Lifetime) are all on the template instance
