/**
 * Sync / check shared planning standard into AI_PROJECT_DEVELOPMENT_REFERENCE.md
 *
 * Usage:
 *   npx tsx scripts/sync-planning-standard.ts          # write marker block
 *   npx tsx scripts/sync-planning-standard.ts --check  # fail on drift
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PLANNING_STANDARD_VERSION,
  PUBLISHING_CHECKLIST,
  renderPlanningStandardMarkdown,
} from "../src/utils/projectPlanningStandard";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const aiDocPath = path.join(root, "AI_PROJECT_DEVELOPMENT_REFERENCE.md");

const BEGIN = "<!-- PLANNING_STANDARD:BEGIN -->";
const END = "<!-- PLANNING_STANDARD:END -->";

function normalizeNewlines(text: string) {
  return text.replace(/\r\n/g, "\n");
}

function buildMarkerBlock() {
  const body = renderPlanningStandardMarkdown().trimEnd();
  return `${BEGIN}\n${body}\n${END}`;
}

function extractMarkerRegion(aiDoc: string) {
  const beginIdx = aiDoc.indexOf(BEGIN);
  const endIdx = aiDoc.indexOf(END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(
      `AI doc missing ${BEGIN} / ${END} markers. Insert them once under the intro, then re-run sync.`,
    );
  }
  return {
    beginIdx,
    endIdx: endIdx + END.length,
    region: aiDoc.slice(beginIdx, endIdx + END.length),
  };
}

function assertChecklistStepRefs(aiDoc: string) {
  const missing: string[] = [];
  for (const item of PUBLISHING_CHECKLIST) {
    for (const step of item.aiStepRefs) {
      const heading = new RegExp(`^### Step ${step}\\b`, "m");
      if (!heading.test(aiDoc)) {
        missing.push(`${item.id} -> Step ${step}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Publishing checklist aiStepRefs missing section B headings:\n  - ${missing.join("\n  - ")}`,
    );
  }
}

function applyBlock(aiDoc: string, block: string) {
  const { beginIdx, endIdx } = extractMarkerRegion(aiDoc);
  return `${aiDoc.slice(0, beginIdx)}${block}${aiDoc.slice(endIdx)}`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const raw = fs.readFileSync(aiDocPath, "utf8");
  const current = normalizeNewlines(raw);
  assertChecklistStepRefs(current);

  const block = buildMarkerBlock();
  const expectedRegion = block;
  const { region: actualRegion } = extractMarkerRegion(current);

  if (checkOnly) {
    if (actualRegion !== expectedRegion) {
      console.error(
        `Planning standard drift detected (expected v${PLANNING_STANDARD_VERSION}).`,
      );
      console.error("Run: npm run sync:planning-standard");
      process.exit(1);
    }
    console.log(
      `Planning standard OK (v${PLANNING_STANDARD_VERSION}); AI marker block aligned.`,
    );
    return;
  }

  if (actualRegion === expectedRegion) {
    console.log(
      `AI planning standard block already up to date (v${PLANNING_STANDARD_VERSION}).`,
    );
    return;
  }

  const next = applyBlock(current, block);
  // Preserve CRLF if the working copy used it.
  const out = raw.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next;
  fs.writeFileSync(aiDocPath, out, "utf8");
  console.log(
    `Synced planning standard v${PLANNING_STANDARD_VERSION} into AI_PROJECT_DEVELOPMENT_REFERENCE.md`,
  );
}

main();
