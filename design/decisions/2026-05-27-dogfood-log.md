---
id: LOG-2026-05-27-dogfood
date: 2026-05-27
status: in_progress
review_item: S2 (REVIEW.html)
plan_task: D1.S2 (plan.html)
related: [[2026-05-27-dogfood-target]]
---

# Dogfood Log — Cozy Hide-and-Seek

Friction log captured while authoring the cozy hide-and-seek dogfood end-to-end
through every spec layer. Each entry is tagged `cli`, `wizard`, `schema`,
`validator`, `gate`, `traceability`, or `docs` — these feed plan.html week-2
tasks D2.EN1 / D2.EN1b / D2.EN1c / D2.Q1 and any schema follow-ups.

## Entries

- `traceability` — `npx mda new concept` appended a third `GAME-001` row to
  `specs/traceability.md`, alongside two stale `GAME-001 Test Game` and
  `GAME-001 Don't get virus` rows from previous deleted concepts. The scaffolder
  appends without checking for duplicate IDs or pruning stale rows; the matrix
  becomes incoherent across dogfood / fixture / test cycles.
- `traceability` — Each concept gets its own one-row block instead of being
  appended to the single matrix table. The result is several disjoint tables
  rather than one matrix. The "## Matrix" table header at the top has no rows
  while the actual rows live below it as stand-alone tables.
- `schema` — `_schema.md` for concept lists rich sections (Aesthetic Profile
  table with 5 rows, full Core Loop + Secondary Loops, Reference Games table)
  but the scaffold template emitted by `mda new` is a much shorter subset
  (4-row aesthetic table, single core loop, one-line reference-games table).
  An author following the scaffold would never write the depth the gate expects
  unless they cross-read `_schema.md` first.
- `cli` — `mda new` is fully non-interactive on a fresh concept (no trace
  fields are required), so feeding stdin is unnecessary. Good for D2.EN1's
  `--no-prompt` story; the current behavior already satisfies it for `concept`.
- `cli` — Every `npx mda` invocation emits an `ExperimentalWarning` from Node
  about CommonJS/ESM. This will swamp `--json` output and the `mda-runner`'s
  last-line JSON parsing in week 3 unless suppressed. Worth resolving in the
  same PR that adds `--json` everywhere (plan task D2.EN1c).
- `validator` — `npx mda validate` against a workspace with the new concept
  reports `totalSpecs: 1` and only inspects the MEC layer. The concept spec
  does not appear in the validator's spec count. The validator either doesn't
  index `specs/concept/*.concept.md`, or only counts specs that participate in
  trace links — either way the operator can't tell from the JSON how many
  specs were inspected.

- `gate` — `npx mda gate aesthetic` PASSED on the scaffolded placeholder content
  for AES-002 and AES-003 before I had written anything real. The scaffold
  template happens to contain a `-` bullet under "Observable Proxies" and
  "Anti-Patterns" and the literal string `Target:`, which is the entire test
  the gate runs. A spec with zero real content scores 4/4. The gate is
  validating *structural presence*, not authorial intent.
- `schema` / `gate` — Scaffold frontmatter writes
  `primary_aesthetic: {one of the 8 categories}`. YAML parses the braced text
  as a flow-style object literal; `primary-classified` check reports
  `Primary aesthetic: [object Object]` and passes (the value is non-null).
  Either the scaffold should leave a string placeholder (`""`) and the gate
  should treat empty/placeholder strings as failures, or the gate should
  validate `primary_aesthetic` against the 8-category enum from the glossary.
- `cli` — `mda new <layer> <name>` does not warn when an ID is being reused
  across deleted concepts. Stale traceability rows accumulate silently.
- `cli` — The schema templates in `specs/<layer>/_schema.md` are richer than
  the scaffold templates `mda new` writes. An author who follows the scaffold
  ends up writing the bare minimum the gate accepts (which is much less than
  the schema asks for). The two should be derived from the same source.

- `schema` / `gate` / `validator` — **Big one.** The dynamic-layer
  `_schema.md` template puts each feedback loop under `### Loop: {Name}`
  inside `## Feedback System`. But `parseSections` in
  `tools/src/parser.ts` splits at *any* heading level (`#{1,6}`), so
  `### Loop:` *closes* the `## Feedback System` section. The
  `dynamic-gate.ts` check `feedback-loops-exist` then reads an empty
  section and fails. The schema instructs authors to write a structure
  the gate cannot see. Workaround: flatten the loop summary as a
  bulleted list under `## Feedback System` *before* any H3 subheading,
  duplicating the loop info. Real fix: either teach `parseSections` to
  track nesting (so `### Loop:` lives "inside" `## Feedback System`),
  or rewrite the schema templates to be flat.
- `cli` / `scaffold` — When `mda new dynamic <name>` writes
  `traces_to_aesthetics: [{AES-NNN}]`, YAML parses `[{AES-NNN}]` as
  `[null]` (the braced text becomes a flow-style mapping with key
  `AES-NNN` and no value, then the array contains it). The
  `traces-to-aesthetics` gate check (`tracesTo.some(id => id.startsWith("AES-"))`)
  fails because no AES-prefixed string ever lands in the parsed list.
  Same kind of issue as the AES `primary_aesthetic: {one of the 8 categories}`
  placeholder — the scaffold writes YAML-invalid placeholders that pass
  shallow shape checks but fail content checks.

- `validator` / `schema` — Aesthetic specs at the top of the M → D → A
  chain do not carry outgoing `traces_to_*` frontmatter (they are the
  thing other layers trace **to**), but the `frontmatter-schema` rule
  flags every AES file with `has no trace references — specs should
  trace to related specs`. The rule treats aesthetics like dynamics or
  mechanics. Either suppress the warning for AES specs, or invert the
  check (warn when an AES spec is never *referenced* instead of when it
  never *traces*).
- `validator` — After adding a level that references MEC-004/005/006 the
  three mechanic orphan warnings cleared, but TUN-001 is now flagged as
  an orphan even though it traces *out* to every mechanic / dynamic /
  aesthetic in the cascade. The `no-orphans` rule should treat tuning
  specs the same way it treats levels: they're "consumers" at the tail
  of the chain and don't need inbound references.
- `asset-plan` — `mda asset-plan generate <id>` refuses to run until a
  real image file (`.png/.jpg/...`) lands in `refs/`. This is correct
  behaviour but it blocks dogfooding the plan path when the asset is
  still pure concept. Documenting alternatives: ship a `--no-refs`
  escape hatch, or accept a `PLACEHOLDER.md` marker as a stand-in for
  the image when `status: concept`.
- `asset-plan` — Generated plans embed an absolute timestamp
  (`created: 2026-05-28`) sourced from `new Date()`; the rest of the
  framework runs on the user's `currentDate` (2026-05-27 in this
  session). Either the CLI should accept `--date` or honour an
  `MDA_TODAY` env var so dogfood walkthroughs date consistently with
  the surrounding ADRs.

## Layer completion status (2026-05-27)

| Layer       | Files                                                                | Validates? |
|-------------|----------------------------------------------------------------------|------------|
| concept     | `cozy-hide-and-seek.concept.md`                                      | yes        |
| aesthetic   | 3 specs (AES-001/002/003)                                            | yes        |
| dynamic     | 3 specs (DYN-001/002/003)                                            | yes        |
| mechanic    | 3 game specs (MEC-004/005/006) + framework MEC-003                   | yes        |
| asset       | 2 specs (AST-001/002) + updated catalog                              | yes        |
| tuning      | 1 spec (TUN-001) traces to all 9 game-layer specs                    | yes        |
| level       | 1 spec (LVL-001 Sunlit Den, status: blockout)                        | yes        |
| asset-plan  | AST-001.v1.plan.md generated with placeholder refs                   | yes        |

`npx mda validate` exits 0; remaining 9 warnings are all rule-rather-than-
content issues recorded above. None of them require new dogfood content to
clear.

