# App Thesis and Goals

**Product:** Project Partner  
**Purpose of this document:** North-star thesis, problem framing, and product goals. Use it to judge features, copy, and content: does this help someone achieve schedule, budget, quality, and safety goals on a real home project?

*Note: There is no Project Partner “App Value” document in this repo. Positioning below is grounded in existing product marketing (structured process, risk visibility, execution system) plus the problem thesis in this guide. Toolio’s `App Value.md` is a separate rental-commerce product and is not the source of truth here.*

---

## One-line thesis

**Project Partner exists so DIYers achieve their goals** - on schedule, on budget, at the quality they meant to build, without preventable injury - by turning the internet’s scattered DIY content into a standard process and helping them plan and execute the critical few.

---

## The problem

Millions of homeowners start DIY projects every year. Many miss the goals that actually matter:

- **Schedule** - the job runs past every weekend they thought they had
- **Budget** - materials, tools, and surprises erase the “savings” vs. hiring out
- **Quality** - rework, uneven finish, or a result they do not trust
- **Safety** - injuries and near-misses that never show up in a YouTube comment thread

The content exists. Tutorials, forums, product pages, and “how I did it” posts are everywhere. What is missing is a **formal process** that absorbs **massive variation** (skill, house age, site conditions, tools on hand, living constraints) so people stop failing for predictable reasons.

YouTube and search give instructions. They do not run the project. Project Partner’s job is planning, execution, and management: a plan that fits the person and the house, checkpoints that catch failure early, and a path when something goes wrong.

---

## The solution thesis

1. **Formalize DIY into a standard process**  
   Manufacturing-inspired structure (phases, operations, steps, prerequisites, closeout) turns one-off advice into a repeatable system.

2. **Manage variation so goals survive contact with reality**  
   Skill level, tools owned, timeline, space constraints, and micro-decisions change what “the right plan” is. The product must absorb that variation instead of pretending every kitchen, floor, or wall is the same.

3. **Build a better plan, then execute the critical few**  
   Not every tip matters equally. The win is surfacing the few decisions, risks, and steps that protect schedule, budget, quality, and safety - and making those executable under fatigue, dust, and disrupted living.

4. **Worth it, so help is valued**  
   Hard projects still end with “it was worth it.” Anything that reduces regret, crashouts, overruns, or injury along the way is valuable - even when the job remains hard.

---

## Perfect example: a live-in remodel (and why goals slip)

A kitchen (or similar live-in) remodel is a clean stress test. The work is visible, the home stays occupied, and small misses compound into missed goals. Typical realities:

| # | What happens | Goal it threatens | What “better” looks like in product terms |
|---|--------------|-------------------|------------------------------------------|
| 1 | **Dust everywhere** | Quality, health, schedule (cleanup and redo) | Containment, prep, and cleanup as first-class process - not an afterthought tip |
| 2 | **Decision fatigue is the hardest part** | Schedule, budget, quality (paralysis and late reversals) | Collapse open-ended research into sequenced decisions with clear choices and consequences |
| 3 | **Everything takes longer than expected** | Schedule (and budget via rental/labor drift) | Realistic sequencing, dependencies, buffers, and honest duration signals - not optimistic single-video timelines |
| 4–5 | **Living out of suitcases / no kitchen** | Schedule pressure, morale, quality shortcuts | Plan for living constraints: temp kitchen, staging, work packages that restore function earlier |
| 6 | *(same as living disruption)* | Same as above | Same as above - treat household continuity as a project constraint, not noise |
| 7 | **Costs add up quickly** | Budget | Line-of-sight materials/tools, alternatives, and “what this phase really costs” before commit |
| 8 | **Unexpected costs (especially older houses)** | Budget, schedule | Risk and discovery built into plan: open walls, bad substrate, outdated wiring/plumbing as expected unknowns with contingency |
| 9 | **Crashouts and regrets** | All goals, plus willingness to finish | Recovery paths, checkpoints, and “something wrong” triage so a bad day does not become a abandoned project |
| 10 | **But it will be worth it** | The reason people start | Honor the outcome: every reduction in pain, risk, or waste is valued because the finished space still matters |

**Design implication from #10:** Users will tolerate difficulty if progress and the end state feel real. Optimize for fewer regrets and fewer preventable misses - not for pretending remodel life is comfortable.

---

## Product goals

### Primary outcome goals (user)

1. **Hit the critical goals more often** - schedule, budget, quality, safety - relative to DIY without a structured system.
2. **Replace research chaos with a runnable plan** - fewer open tabs, fewer late reversals, clearer next action.
3. **Execute the critical few under stress** - when dust, fatigue, and living disruption are high, the app still points at what protects the outcome.
4. **Recover without shame** - when something goes wrong, triage and replan beat abandonment.
5. **Leave a home that is easier to maintain** - finished work plus records and maintenance continuity after closeout.

### Product capability goals (how we deliver)

| Pillar | Intent |
|--------|--------|
| **Standard process** | Catalog and foundation phases turn internet DIY into structured workflows (kickoff → plan → execute → order/close patterns as appropriate). |
| **Variation management** | Skill, tools, timeline, site, and micro-decisions personalize the plan without rewriting the whole internet for each user. |
| **Critical-few focus** | Risks, checkpoints, and decisions emphasize what changes outcomes - not encyclopedic tips. |
| **Risk visibility** | Show what can go wrong and how to prevent or recover - not only what to do when everything goes right. |
| **Execution system** | Progress, photos, scheduling, and recovery so the plan survives the week, not just the weekend. |
| **Home continuity** | Maintenance, tools, and task tracking keep the household running beyond a single project. |

### Non-goals (for clarity)

- Replacing every YouTube tutorial with longer prose of the same advice
- Optimizing for professional contractors’ full business stack as the primary user (contractors may use the system; homeowners finishing one great project are the center)
- Promising that hard projects become easy - we promise they become **more controllable**

---

## Positioning anchors (existing product language)

Use these as alignment checks; this thesis expands them rather than replacing them:

- Transform scattered DIY content and tools into a **predictable execution system**
- **Manufacturing-inspired** processes drive out uncertainty and make DIY more repeatable
- Risk management means showing **what could go wrong**, not only what to do
- Designed to **run one great project** - not a career of building
- Instructions alone are not enough; skills, tools, checkpoints, timing, and progress tracking are part of a real process

---

## Technical backbone: the risk engine

The risk engine is how the product turns “what could go wrong” into a **personalized critical few** for each run. Full detail lives in [`docs/RISK_ENGINE.md`](RISK_ENGINE.md). Short version:

Risk is authored once per project template in two places: a **PFMEA** for quality, and a **risk register** for safety, schedule, and budget. Both use the same 1-10 severity, occurrence, and detection scales and resolve to an Action Priority (High / Medium / Low) via a shared database lookup - not raw RPN banding.

Every item maps to exactly one of four components: **quality** (result), **safety**, **schedule** (time), and **budget** (cost). They stay separate so a step can look fine on quality and still be high schedule risk.

When a user starts a run, three layers apply in order:

| Layer | Role |
|-------|------|
| **Template risk** | Author analysis for everyone (`pfmea_*`, `project_risks`) |
| **Logic layer** | Rules that adjust occurrence/detection from facts about this user (`project_risk_rules`, `projectRiskLogic.ts`) |
| **Applied profile** | Scored, plain-language list on the run, plus Key Characteristics derived from it (`project_run_risks`, `project_run_risk_profile`, `project_run_key_characteristics`) |

That applied list is what surfaces in Risk Radar, planning walkthroughs, and inline on the active step. Key Characteristics are the shorter register: the specific items where **this user’s attention** decides the outcome. That is the technical expression of “execute the critical few.”

---

## How to use this document

Before shipping a feature, content pack, or major UX change, ask:

1. Which user goal does this protect (schedule, budget, quality, safety, finish/worth-it)?
2. Does it reduce variation-driven failure, or only add more content?
3. Does it help plan better **and** execute the critical few when the house is a mess and decisions are exhausting?
4. Would someone mid-remodel say this would have been worth having?

If the answer is weak on all four, it is probably not thesis-aligned.

---

*Created: September 2026. Updated with risk-engine summary. Revise when positioning, tiers, or primary project domains change.*
