import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRequiredSecret } from "../_shared/auth.ts";

/**
 * Shared vocabulary API for Toolio (server to server). Contract: docs/PROJECT_PARTNER_INTEGRATION.md.
 * Auth: x-toolio-sync-token must equal the TOOLIO_SYNC_TOKEN secret. Body: { action, ...input }.
 */

const SETTLE_WINDOW_MS = 5 * 60 * 1000;
const MAX_PAGE = 1000;

const jsonHeaders = { "Content-Type": "application/json" };

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function tokensMatch(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Postgres error codes raised by the vocab_* functions, mapped to HTTP. */
function statusForDbError(code: string | undefined): number {
  if (code === "23505") return 409;
  if (code === "42501") return 403;
  return 400;
}

function requireString(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function optionalString(input: Record<string, unknown>, field: string): string | null {
  const value = input[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  return value.trim() || null;
}

serve(async (req) => {
  if (req.method !== "POST") return respond(405, { error: "POST only" });

  const expectedToken = getRequiredSecret("TOOLIO_SYNC_TOKEN");
  const receivedToken = req.headers.get("x-toolio-sync-token");
  if (!receivedToken || !tokensMatch(receivedToken, expectedToken)) return respond(401, { error: "Invalid sync token" });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return respond(400, { error: "Body must be JSON" });
  }

  const db = createClient(getRequiredSecret("SUPABASE_URL"), getRequiredSecret("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  try {
    switch (input.action) {
      case "snapshot": {
        const { data, error } = await db.rpc("vocab_snapshot");
        if (error) return respond(statusForDbError(error.code), { error: error.message });
        return respond(200, data);
      }

      case "changes_since": {
        const afterSeq = input.after_seq;
        const limit = input.limit;
        if (typeof afterSeq !== "number" || !Number.isInteger(afterSeq) || afterSeq < 0) {
          return respond(400, { error: "after_seq must be a non-negative integer" });
        }
        if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE) {
          return respond(400, { error: `limit must be an integer from 1 to ${MAX_PAGE}` });
        }
        const settledBefore = new Date(Date.now() - SETTLE_WINDOW_MS).toISOString();
        const { data, error } = await db
          .from("vocab_change_events")
          .select("seq, entity, public_key, change_kind, payload, created_at")
          .gt("seq", afterSeq)
          .lt("created_at", settledBefore)
          .order("seq", { ascending: true })
          .limit(limit);
        if (error) return respond(400, { error: error.message });
        return respond(200, { events: data });
      }

      case "create_term": {
        const entity = requireString(input, "entity");
        if (!["category", "project", "tool", "material"].includes(entity)) return respond(400, { error: "Unknown entity" });
        const specialty = input.specialty_scale;
        if (entity === "tool" && (typeof specialty !== "number" || ![1, 2, 3].includes(specialty))) {
          return respond(400, { error: "Tools need specialty_scale 1, 2, or 3" });
        }
        const { data, error } = await db.rpc("vocab_create_term", {
          p_entity: entity,
          p_key: requireString(input, "key"),
          p_name: requireString(input, "name"),
          p_description: optionalString(input, "description"),
          p_category: optionalString(input, "category"),
          p_specialty_scale: entity === "tool" ? specialty : null,
          p_email: requireString(input, "requested_by_email"),
        });
        if (error) return respond(statusForDbError(error.code), { error: error.message });
        return respond(201, data);
      }

      case "request_removal": {
        const { data, error } = await db.rpc("vocab_request_removal", {
          p_key: requireString(input, "key"),
          p_reason: optionalString(input, "reason"),
          p_replacement_key: optionalString(input, "replacement_key"),
          p_app: "toolio",
          p_email: requireString(input, "requested_by_email"),
        });
        if (error) return respond(statusForDbError(error.code), { error: error.message });
        return respond(201, data);
      }

      case "decide_removal": {
        const decision = requireString(input, "decision");
        if (decision !== "approve" && decision !== "reject") return respond(400, { error: "decision must be approve or reject" });
        const { data, error } = await db.rpc("vocab_decide_removal", {
          p_request_id: requireString(input, "request_id"),
          p_app: "toolio",
          p_decision: decision,
          p_email: requireString(input, "decided_by_email"),
        });
        if (error) return respond(error.code === "P0001" && decision === "approve" ? 409 : statusForDbError(error.code), { error: error.message });
        return respond(200, data);
      }

      case "cancel_removal": {
        const { data, error } = await db.rpc("vocab_cancel_removal", {
          p_request_id: requireString(input, "request_id"),
          p_app: "toolio",
          p_email: requireString(input, "requested_by_email"),
        });
        if (error) return respond(statusForDbError(error.code), { error: error.message });
        return respond(200, data);
      }

      default:
        return respond(400, { error: "Unknown or missing action" });
    }
  } catch (error) {
    return respond(400, { error: error instanceof Error ? error.message : String(error) });
  }
});
