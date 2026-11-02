# Project Partner and Toolio integration contract

This is the canonical contract. Toolio's `docs/PROJECT_PARTNER_INTEGRATION.md` covers only the Toolio side and points here.

## Ownership

- **Project Partner** owns the general vocabulary: projects (one entry per revision family), tools, and materials.
- **Toolio** owns SKUs, pricing, guided sections, customer copy, orders, and accounts.
- The databases are never shared. Toolio keeps a local mirror of the vocabulary, fed by the change feed below; Toolio's shop and checkout never call Project Partner.
- Where both apps had an entry before the merge, Toolio's wording is canonical and Project Partner's wording is kept as aliases.

## Keys

- Every term has a `public_key`: kebab-case, immutable, unique across projects, tools, and materials (one `vocab_keys` table).
- Terms that came from Toolio use Toolio's key: the core `sku` for tools and materials, `projects.slug` for projects.
- Terms that exist only in Project Partner get a key derived from their name. A clash with any existing key is a crosswalk conflict, resolved by a person.
- Toolio stores the key, not its SKU, on a link, so renaming a Toolio SKU never breaks a link.
- Retired terms keep their key and point to a replacement through `replaced_by_public_key` when there is one. Terms are never hard-deleted.

## Project Partner schema (added in phase 3)

| Object | Purpose |
| --- | --- |
| `vocab_keys (public_key PK, entity project/tool/material)` | Global key registry |
| `public_key` on `tools`, `materials`, and family roots (`projects.parent_project_id IS NULL`) | FK to `vocab_keys`; immutable by trigger |
| `name_key` on `tools`, `materials` | Unique normalized name (Toolio's `inventory_item_name_comparison_key` rule) |
| `retired_at`, `replaced_by_public_key` | Retirement instead of deletion |
| `vocab_aliases (public_key, alias, alias_key, source)` | Sources: `pp_name`, `pp_revision_name`, `toolio_name`, `alternates` |
| `project_family_tools (family_key, term_key, role, source)` | `role`: `required` or `substitute`; `source`: `steps` or `toolio_seed` |
| `vocab_change_events (seq bigserial, entity, public_key, change_kind, payload, created_at)` | Change feed; `change_kind`: `upsert`, `retire`, `unretire`; `payload` is the full current row |
| Delete guard trigger | Blocks hard deletes of tools, materials, and family roots |

- The events table has no client access. Aliases and family tool lists are readable as the app needs them and writable by admins only.
- **Publishing.** Publishing a revision is a client-side `UPDATE projects SET publish_status = 'published'` in `confirmStatusChangeDirect` (`src/components/UnifiedProjectManagement.tsx`); there is no publish function in the database. `project_family_tools` is therefore rebuilt by a database trigger on that status change, so the list stays correct whichever screen publishes.
- **Family deletes** become retirements and no longer delete users' `project_runs`.

## Where tool and material references live today

Library rows are `tools` (with `tool_variations.core_item_id`) and `materials` (with `materials_variants.material_id`). Everything else refers to them in one of these places:

| Location | Shape | Links to the library by |
| --- | --- | --- |
| `operation_steps.tools`, `operation_steps.materials` | JSON array of `{ id, name, description, category, alternates, quantity, parentId?, linkedContentSectionIds? }` | **Name only.** `id` is a per-entry value (`tool-<time>-<random>`), not a library id. `parentId` points to the primary entry in the same step that this row substitutes for. |
| `projects.phases` | JSON copy of phases, operations, and steps with the same entries | Name only |
| `project_runs.phases` | Run snapshot with the same entries | Name only |
| `project_runs.shopping_checklist_data.orderedItems` | `{ itemId, itemName, itemType }` | Name only (`itemId` is the step entry id) |
| `user_tools` | Row with `tool_id` FK and `name` | `tool_id` |
| `user_materials` | Row with `material_id` FK and `name` | `material_id` |
| `user_profiles.owned_tools` | JSON array of `{ id, tool_id?, name, item }` | `tool_id` when present, else name |

**Ownership matching** (`src/utils/ownedToolsMatching.ts`) compares normalized names, and ids only where both sides carry the same id. Because step entries carry no library id, a merge that changes a canonical name would stop matching unless the step entries gain a library id. The phase 3 load therefore:

- adds `library_id` (the library row's UUID) to every step entry, plus `legacy_name` holding the pre-merge name; the per-entry `id` and `parentId` are unchanged;
- repoints `user_tools.tool_id` and `user_materials.material_id` from merged-away duplicates to the canonical row;
- keeps Project Partner's existing UUIDs for canonical rows, so only merged-away duplicates change.

`task_shopping_list.material_name` is free text for home tasks and is not part of the vocabulary.

## Vocab API: `project-partner-vocab` edge function

- **Auth:** header `x-toolio-sync-token`, compared with the function secret. Server to server only.
- **Body:** `{ "action": "<name>", ... }`. Unknown or missing actions return 400.

| Action | Input | Result |
| --- | --- | --- |
| `snapshot` | none | Every term, project, family tool list, and alias, plus `as_of_seq` |
| `changes_since` | `after_seq`, `limit` | Events with `seq > after_seq` that are older than a 5-minute settle window, in `seq` order |
| `create_term` | `entity`, `key`, `name`, `description`, `category`, `requested_by_email` | 201 with the term. 403 unless the email belongs to a Project Partner admin. 409 with the existing key when the key or normalized name already exists. |

- `seq` is not gapless (rolled-back transactions skip values), so consumers apply events in order and never treat a gap as an error. The settle window keeps an event from appearing after a later `seq` has already been read.
- Every event carries the full current row, so applying an event twice is harmless.

## Toolio side (summary)

- Mirror tables `pp_vocab_terms`, `pp_vocab_projects`, `pp_vocab_project_terms`, `pp_vocab_aliases`, `pp_vocab_sync_state`.
- Link columns `pp_link_status` (`linked`, `toolio_only`, `retired_needs_review`) and `pp_vocab_key` on `projects` and on `inventory_items` cores.
- Edge function `project-partner-link` with actions `sync`, `snapshot_reload`, `create_term`.
- Details: Toolio `docs/PROJECT_PARTNER_INTEGRATION.md`.

## How changes reach the databases

Both apps work the same way: nothing in this integration connects to a database with keys or a database URL.

- **Schema and data changes** are migration files in each repo's `supabase/migrations/`, one per repo per phase, applied by hand: Toolio's in Lovable's SQL editor, Project Partner's in Supabase's SQL editor.
- **Reads** are read-only queries in `scripts/vocab-merge/sql/`, also run by hand in the same editors. Each returns one `payload` cell of JSON that carries its own row counts, so a truncated copy fails validation.
- **Generated queries** (such as Toolio name keys) are written by the scripts into the export folder and run the same way.
- **Restore points** come from each platform's own backups. Toolio's link work only adds tables and columns, so it never needs a restore. Project Partner's phase 3 load needs a restorable backup taken just before it (Supabase dashboard backup or `pg_dump`).

## Merge scripts: `scripts/vocab-merge/`

| File | Step | Run where |
| --- | --- | --- |
| `sql/toolio-1-catalog.sql` | 0: Toolio catalog, projects, guided wiring | Toolio SQL editor (Lovable) |
| `sql/toolio-2-checks.sql` | 0: Toolio content fingerprints, row counts, unresolved past-order references | Toolio SQL editor (Lovable) |
| `sql/pp-1-library.sql` | 0: tools, materials, variations | Project Partner SQL editor (Supabase) |
| `sql/pp-2-projects.sql` | 0: projects and each family's current revision | Project Partner SQL editor (Supabase) |
| `sql/pp-3-references.sql` | 0: every tool and material reference, grouped with counts | Project Partner SQL editor (Supabase) |
| `validate-export.mjs` | 0: checks the saved results, writes `manifest.json` | Terminal |
| `extract.mjs` | 1: matching views in `extract/*.json`; generates `toolio-3-name-keys.sql` | Terminal |
| `match.mjs` | 2: `vocab-crosswalk.csv` and `match_summary.json` | Terminal |
| `verify.mjs` | 6: PASS/FAIL per check; exit code 1 on any failure | Terminal |

### Running

1. Create an export folder under `VOCAB_MERGE_ARCHIVE_DIR` (an absolute path outside every git work tree; the export holds production user data). Never commit it.
2. Run the five queries in `sql/` and save each `payload` cell as `<query name>.json` in the folder. The editor's CSV download saved as `<query name>.csv` also works. Run them close together; validation prints the time spread.
3. In the terminal:

```
$env:VOCAB_MERGE_ARCHIVE_DIR = "C:\vocab-merge-archive"
node scripts/vocab-merge/validate-export.mjs --archive <folder>
node scripts/vocab-merge/extract.mjs --archive <folder>      # first run writes toolio-3-name-keys.sql and stops
#   run <folder>\toolio-3-name-keys.sql in Toolio's SQL editor, save it as toolio-3-name-keys.json
node scripts/vocab-merge/extract.mjs --archive <folder>
node scripts/vocab-merge/match.mjs --archive <folder> [--carry <reviewed crosswalk.csv>]
node scripts/vocab-merge/verify.mjs --archive <baseline folder> [--against <later folder>]
```

- The scripts need only Node; no packages, keys, or tokens.
- Name keys come from Toolio's `inventory_item_name_comparison_key` for both apps' names, so there is one normalization rule.
- A family's current revision comes from Project Partner's `latest_published_in_family`, else its newest draft. A family with neither is flagged `NO CURRENT REVISION` for review.
- `pp-3-references` groups references by source, kind, name, and stored library id. Entries with neither a name nor a stored id are counted as `unnamed` and reported in the match summary.
- A Toolio project's line list follows the guided wiring: sections on the content foundation, standard section link stubs, composite members, and visibility overrides. Lines whose inventory item no longer exists are written to `extract/toolio_dangling_lines.json` and must be repaired in Toolio before the load.
- `verify.mjs` checks that saved results are unchanged since validation, and, given a later export with `--against`, that no archived Toolio content row was removed or changed and no past-order reference stopped resolving. The fate accounting, reference, mirror, and link-status checks are added in phases 3 and 4 with the tables they read; their queries go in `sql/` like the others.

## Crosswalk format

Columns: `entity` (`project`, `tool`, `material`, `reference`), `toolio_id`, `toolio_key`, `toolio_name`, `pp_id`, `pp_name`, `match_tier` (`exact`, `alias`, `fuzzy_suggestion`, `none`), `proposed_action`, `canonical_key`, `canonical_name`, `notes`, `decision`.

| Action | Meaning |
| --- | --- |
| `merge` | One Toolio entry and one Project Partner entry: Toolio key and wording, Project Partner name becomes an alias, Project Partner UUID kept |
| `create_in_pp` | Toolio only: becomes a new Project Partner term |
| `keep_pp` | Project Partner only: stays, unlinked in Toolio, still mirrored |
| `merge_many` | Several Project Partner synonyms for one Toolio entry: one canonical, the rest retired with `replaced_by` |
| `one_to_many` | One Project Partner entry matches several Toolio entries: link them all to one key, or split the term |
| `toolio_only` | Not general vocabulary (delivery, packaging, kits, bundles): never sent to Project Partner |
| `create_library_term` | A reference that resolves to no library row becomes a new library term |
| `map_to` | A reference maps to an existing term; `canonical_key` holds the target key |

- **Matching tiers:** exact normalized name; then aliases (Project Partner alternates and variation names, revision names, Toolio `discovery_tags`); fuzzy token overlap is only ever a suggestion in `notes`.
- **Decision:** the final action name. `match.mjs` pre-fills it only for exact one-to-one merges with a Toolio key and matching entity, and for Project Partner-only library terms with no fuzzy suggestion. A key clash clears any pre-fill.
- **Flags in `notes` that need a person:** `KEY CLASH`, `NO KEY`, `ENTITY DIFFERS`, `STRUCTURE DIFFERS`, `NO CURRENT REVISION`, `many-to-many component`.
- Loads fail on any row without a decision or with an unknown `canonical_key`.
- The reviewed crosswalk is committed to this repo at `docs/integration/vocab-crosswalk.csv` in phase 2.
