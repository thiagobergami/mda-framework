# Tuning Spec Schema

Tuning specs define the **iterative refinement parameters** for a feature. They answer: "What
values can we adjust, within what ranges, to improve the experience?"

The paper states: *"By iteratively refining the value of penalties, rate of taxation or thresholds
for rewards and punishments, we can refine the gameplay until it is balanced."*

Tuning is a first-class activity, not an afterthought. The paper's Monopoly example shows that
even well-designed mechanics can fail if their parameters create degenerate feedback loops.

## Template

```markdown
---
id: TUN-{NNN}
name: {Descriptive name}
traces_to_mechanics: [{MEC-NNN IDs whose parameters this tunes}]
traces_to_dynamics: [{DYN-NNN IDs whose behavior this affects}]
traces_to_aesthetics: [{AES-NNN IDs whose experience this targets}]
---

# {Name}

## Tuning Goal

{What experience outcome is this tuning trying to achieve? Reference the aesthetic
spec and explain what "balanced" means for this feature.}

## Parameters

{Every tunable value in the related mechanic specs. Each parameter has a current
value, valid range, and description of what it affects at the dynamic/aesthetic level.}

### {Parameter Name}
- **Mechanic**: {MEC-NNN, Rule N}
- **Current value**: {number}
- **Range**: [{min}, {max}]
- **Step**: {smallest meaningful adjustment}
- **Affects dynamic**: {Which behavior changes when this is adjusted}
- **Affects aesthetic**: {Which experience quality changes}
- **Sensitivity**: Low | Medium | High — {How much a small change impacts experience}

## Target Metrics

{Measurable outcomes that indicate the feature is "balanced". These correspond to
the observable proxies in the aesthetic spec but are expressed as concrete numbers.}

| Metric | Target | Tolerance | Source |
|--------|--------|-----------|--------|
| {name} | {value} | {± range} | {AES/DYN spec} |

## Tuning Constraints

{Rules that limit how parameters can be adjusted relative to each other. Prevents
tuning one parameter in a way that breaks invariants elsewhere.}

- {Constraint}: {Why — what breaks if violated}

## Known Trade-offs

{Adjustments that improve one aesthetic at the expense of another. Making these
explicit helps AI make informed tuning decisions.}

- **{Parameter A} vs {Parameter B}**: {Increasing A improves X but degrades Y}

## Iteration Log

{Record of tuning changes and their observed effects. This builds institutional
knowledge about what works.}

### Iteration {N} — {Date}
- **Changed**: {Parameter} from {old} to {new}
- **Reason**: {Why this change was made}
- **Observed**: {What happened — did it improve the target metric?}
- **Decision**: Keep | Revert | Adjust further
```

## Rules

1. **Every tunable parameter is documented** — If a value might need adjustment, it belongs in a tuning spec. Hidden magic numbers are the enemy of iteration
2. **Ranges prevent extremes** — Every parameter has a valid range. AI must never set values outside the range
3. **Sensitivity guides priority** — High-sensitivity parameters need careful, small adjustments. Low-sensitivity parameters can be changed more aggressively
4. **Trade-offs are explicit** — The Monopoly example shows that "fixing" one aesthetic can break another. Name the trade-offs
5. **Log iterations** — Tuning is empirical. Past attempts (including failures) inform future adjustments
6. **Trace in all directions** — Tuning specs are the only layer that traces to ALL other layers, because tuning affects the entire M → D → A chain
