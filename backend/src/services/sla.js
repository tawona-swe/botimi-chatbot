// Simple, computed-at-read SLA tracking — there's no cron/scheduler in this
// codebase, so breaches are derived from timestamps whenever tickets are
// listed rather than pushed proactively. Real, visible signal; not a
// background-alerting system (that would need a scheduler, which is a
// separate, bigger addition).

const DEFAULT_POLICY = {
  urgent: { firstResponseMins: 60, resolutionMins: 240 },
  high: { firstResponseMins: 240, resolutionMins: 1440 },
  medium: { firstResponseMins: 1440, resolutionMins: 4320 },
  low: { firstResponseMins: 2880, resolutionMins: 10080 },
};

export function getSlaPolicy(vendor) {
  if (!vendor?.sla_policy) return DEFAULT_POLICY;
  try {
    const parsed = JSON.parse(vendor.sla_policy);
    return { ...DEFAULT_POLICY, ...parsed };
  } catch {
    return DEFAULT_POLICY;
  }
}

// SQLite's datetime('now') yields a naive UTC string with no timezone marker
// ("YYYY-MM-DD HH:MM:SS") — without forcing UTC, JS parses it as local time.
function parseUtc(ts) {
  if (!ts) return null;
  const withZ = /[Zz]|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts.replace(" ", "T")}Z`;
  return new Date(withZ).getTime();
}

/**
 * @returns {{ status: 'ok'|'at_risk'|'breached', resolutionDueAt: string|null }}
 */
export function computeSlaStatus(ticket, policy) {
  const p = policy[ticket.priority] || policy.medium;
  const createdMs = parseUtc(ticket.created_at);
  if (createdMs === null) return { status: "ok", resolutionDueAt: null };

  const resolutionDueMs = createdMs + p.resolutionMins * 60000;
  const firstResponseDueMs = createdMs + p.firstResponseMins * 60000;
  const resolutionDueAt = new Date(resolutionDueMs).toISOString();

  if (ticket.status === "resolved" || ticket.status === "closed") {
    const resolvedMs = parseUtc(ticket.resolved_at);
    const status = resolvedMs && resolvedMs > resolutionDueMs ? "breached" : "ok";
    return { status, resolutionDueAt };
  }

  const now = Date.now();
  const firstResponseMs = parseUtc(ticket.first_response_at);

  if (!firstResponseMs && now > firstResponseDueMs) return { status: "breached", resolutionDueAt };
  if (now > resolutionDueMs) return { status: "breached", resolutionDueAt };
  if (now > resolutionDueMs - p.resolutionMins * 60000 * 0.2) return { status: "at_risk", resolutionDueAt };
  return { status: "ok", resolutionDueAt };
}

export { DEFAULT_POLICY };
