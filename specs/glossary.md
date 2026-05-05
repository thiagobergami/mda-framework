# MDA Glossary

Shared vocabulary for all specs. Every spec author and AI implementer must use these terms
consistently. This avoids ambiguity and ensures specs are machine-readable.

## Aesthetic Vocabulary

These 8 categories replace vague words like "fun" or "gameplay". Every aesthetic spec MUST
classify its experience goals using one or more of these, ranked by priority.

| Category     | Definition                    | Frame                       | Example Games                    |
|--------------|-------------------------------|-----------------------------|----------------------------------|
| **Sensation**  | Sensory stimulation and pleasure | Game as sense-pleasure      | Rez, Tetris Effect, Flower       |
| **Fantasy**    | Inhabiting an imaginary role or world | Game as make-believe        | Skyrim, The Sims, Animal Crossing |
| **Narrative**  | Dramatic arc, unfolding story | Game as drama               | Last of Us, Final Fantasy, Celeste |
| **Challenge**  | Overcoming obstacles, mastery | Game as obstacle course     | Dark Souls, Quake, Super Meat Boy |
| **Fellowship** | Social connection, cooperation, community | Game as social framework    | Among Us, Charades, MMOs         |
| **Discovery**  | Exploring unknown territory, finding secrets | Game as uncharted territory | Outer Wilds, Zelda: BotW, Minecraft |
| **Expression** | Self-expression, creativity, leaving your mark | Game as self-discovery      | Minecraft (creative), LittleBigPlanet |
| **Submission** | Relaxed engagement, zone-out, routine comfort | Game as pastime             | Cookie Clicker, Stardew Valley, Farmville |

### Usage rules:
- Every aesthetic spec lists its **primary** aesthetic (the dominant experience goal)
- Additional aesthetics are listed as **secondary** (supporting, but not the focus)
- When aesthetics conflict (e.g., Challenge vs Submission), the primary wins
- A game can pursue multiple aesthetics — most games do

## Dynamic Vocabulary

### Feedback Systems
- **Positive feedback loop**: A dynamic where advantage amplifies itself (rich get richer). Creates decisive outcomes but can destroy tension if unchecked.
- **Negative feedback loop**: A dynamic where advantage is dampened (rubber-banding). Keeps players competitive but can feel unfair if too aggressive.
- **Feedback balance**: The ratio of positive to negative feedback. Determines how quickly a game state diverges or converges.

### Behavior Patterns
- **Emergent behavior**: A dynamic that arises from mechanic interactions but is not explicitly coded. Example: "camping" in shooters emerges from weapon + spawn point mechanics.
- **Intended dynamic**: A behavior the designer explicitly targets. Specified in dynamic specs.
- **Degenerate dynamic**: A behavior that undermines aesthetic goals. Example: Monopoly's runaway leader problem destroys Fellowship and Challenge.
- **Invariant**: A condition that must ALWAYS hold during a dynamic. Used as validation constraints.

### Temporal Patterns
- **Tension arc**: Rising intensity → climax → resolution. Serves Narrative and Challenge.
- **Discovery pacing**: Rate at which new information/areas/mechanics are revealed. Serves Discovery.
- **Engagement curve**: How invested the player is over time. Should match the target aesthetic profile.

## Mechanic Vocabulary

### Core Terms (from the MDA paper)
- **Mechanic**: An action, behavior, or control mechanism afforded to the player within a game context.
- **Game content**: Levels, assets, spawn points, items — the material that mechanics operate on.
- **Player affordance**: What the player can DO — the verbs of the game (run, jump, shoot, build, trade).

### System Terms
- **Rule**: A constraint or formula that governs how mechanics interact. Example: "damage = base * multiplier - defense, minimum 1".
- **Parameter**: A tunable numeric value within a rule. Example: the "minimum 1" in the damage rule.
- **State**: The current values of all game variables at a point in time.
- **Event**: A discrete occurrence that triggers mechanic responses. Example: "player enters combat zone".

## Level Design Vocabulary

Level specs (`design/levels/`) compose existing M/D/A primitives into spatial and temporal
arrangements. They use the following terms:

- **Blockout**: Whitebox / spatial layout — geometry only, no art. The "playable but ugly" state.
- **Beat chart**: Pacing curve over time — tension level, active mechanic, target aesthetic per beat.
- **Encounter**: A self-contained unit of mechanic interaction (combat, puzzle, traversal) with explicit success/fail states.
- **Affordance**: What the geometry teaches the player — a low ledge affords stepping; a tall ledge affords climbing.
- **Sightline**: What the player can see from key positions. Drives Discovery by controlling reveal pacing.
- **Critical path**: The minimum traversal required to complete a level — what a player can do with zero exploration.
- **Optional path**: Branches off the critical path that reward exploration with cosmetic, narrative, mechanical, or economic payoffs.

## Spec ID Conventions

Each spec gets a unique ID used in traceability:

| Layer      | Prefix | Example   | Lives in              |
|------------|--------|-----------|-----------------------|
| Aesthetics | AES-   | AES-001   | `specs/aesthetics/`   |
| Dynamics   | DYN-   | DYN-001   | `specs/dynamics/`     |
| Mechanics  | MEC-   | MEC-001   | `specs/mechanics/`    |
| Tuning     | TUN-   | TUN-001   | `specs/tuning/`       |
| Assets     | AST-   | AST-001   | `specs/assets/`       |
| Levels     | LVL-   | LVL-001   | `design/levels/`      |

IDs are sequential within their layer. Once assigned, an ID is never reused even if the spec is deleted.
