# General Project Rules

## New Project Detection (MANDATORY)
Before starting ANY work, check if the project has been initialized:
1. Read `docs/PD.md` - the project is initialized if it contains a **Vision** (no `_…_` placeholder in the Vision section). Success Metrics / Constraints / Non-Goals are **optional** (placeholders allowed).
2. Read `docs/features/INDEX.md` - if the features table is empty, no features have been defined

## Feature Tracking
- All features are tracked in `docs/features/INDEX.md` - read it before starting any work
- Feature specs live in `docs/features/specs/<domain>/<domain>-<feature-name>-spec.md`
- Feature IDs are sequential: check INDEX.md for the next available number
- One feature per spec file (Single Responsibility)
- Never combine multiple independent functionalities in one spec

## Git Conventions
- Commit format: `type(domain): description`
- Types: feat, fix, refactor, test, docs, deploy, chore
- Check existing features before creating new ones: `git ls-files docs/features/specs/<domain>/`
- Check existing components before building: `git ls-files apps/*/src/components/`
- Check existing APIs before building: `git ls-files backend/src/dweb/dj_*/api/`

## Human-in-the-Loop
- Always ask for user approval before finalizing deliverables
- Present options using clear choices rather than open-ended questions
- Never proceed to the next workflow phase without user confirmation

## Status Updates (MANDATORY - Write-Then-Verify)
After completing work on any feature, you MUST update tracking files. Follow this exact sequence:

1. **Read** the feature spec (`docs/features/specs/<domain>/<feature-name>-spec.md`) and `docs/features/INDEX.md` BEFORE editing
2. **Write** your changes using the Edit tool — do NOT just describe what you would write
3. **Re-read** the file AFTER editing to verify the changes are actually present
4. **If changes are missing**, repeat step 2 — never claim updates were made without verifying

**What to update in the feature spec:**
- Status field in the header (Planned → In Progress → In Review → Tested → Deployed)
- Implementation notes: what was built, what changed, any deviations from the original spec


**What to update in `docs/features/INDEX.md`:**
- Feature status column must match the feature spec header
- Valid statuses: Roadmap → Planned → Designed → In Progress → In Review → Approved → Deployed
  - **Roadmap**: after `/init` — feature identified, no spec file yet
  - **Planned**: after `/write-spec` (Designer)
  - **Designed**: after `/design` (Architect)
  - **In Progress**: after `/coder` starts
  - **In Review**: after `/qa` starts
  - **Approved**: after `/qa` passes (no critical/high bugs)
  - **Deployed**: after `/deploy`

**NEVER do this:**
- Do NOT say "I've updated the feature spec" without actually calling the Edit tool
- Do NOT summarize changes in chat as a substitute for writing them to the file
- Do NOT skip updates because "it's obvious" or "minor"

## File Handling
- ALWAYS read a file before modifying it - never assume contents from memory
- After context compaction, re-read files before continuing work
- When unsure about current project state, read `docs/features/INDEX.md` first
- Run `git diff` to verify what has already been changed in this session
- Never guess at import paths, component names, or API routes - verify by reading

## Handoffs Between Skills
- After completing a skill, suggest the next skill to the user
- Format: "Next step: Run `/skillname` to [action]"
- Handoffs are always user-initiated, never automatic
