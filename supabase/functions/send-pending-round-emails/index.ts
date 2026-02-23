import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFrom =
  Deno.env.get("RESEND_FROM") || "SportsLadder <no-reply@sportsladder.nl>";
const resendReplyTo = Deno.env.get("RESEND_REPLY_TO") || "no-reply@sportsladder.nl";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const cronSecret = Deno.env.get("CRON_SECRET");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const isSecondFriday = (roundStart: string, today: string) => {
  const startDate = parseDate(roundStart);
  const startDow = startDate.getUTCDay(); // 0=Sun
  const friday = 5;
  const daysUntilFriday = (friday - startDow + 7) % 7;
  const firstFriday = addDays(startDate, daysUntilFriday);
  const secondFriday = addDays(firstFriday, 7);
  return formatDate(secondFriday) === today;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const postResendEmail = async (
  apiKey: string,
  payload: Record<string, unknown>,
  maxRetries = 4
) => {
  let attempt = 0;
  let lastStatus = 0;
  let lastBody = "";

  while (attempt <= maxRetries) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    lastStatus = response.status;
    lastBody = await response.text();

    if (response.ok) {
      return { ok: true, status: lastStatus, body: lastBody };
    }

    if (response.status !== 429 || attempt === maxRetries) {
      return { ok: false, status: lastStatus, body: lastBody };
    }

    const retryAfterSeconds = Number(response.headers.get("retry-after") || "");
    const backoffMs =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 500 * Math.pow(2, attempt);

    await sleep(backoffMs);
    attempt += 1;
  }

  return { ok: false, status: lastStatus, body: lastBody };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const requestedMode = typeof payload?.mode === "string" ? payload.mode : "start";
  const mode =
    requestedMode === "second_friday" || requestedMode === "scheduled_match" || requestedMode === "start"
      ? requestedMode
      : "start";

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (mode === "scheduled_match") {
    const matchId = typeof payload?.matchId === "string" ? payload.matchId : null;
    if (!matchId) {
      return new Response(JSON.stringify({ error: "Missing matchId for scheduled_match mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.slice(7).trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requesterPlayer, error: requesterPlayerError } = await supabase
      .from("players")
      .select("id,name,email")
      .ilike("email", userData.user.email)
      .maybeSingle();
    if (requesterPlayerError || !requesterPlayer?.id) {
      return new Response(JSON.stringify({ error: "Current player not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select("id,ladder_id,round_label,challenger_id,challenged_id,status,scheduled_date")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !matchRow) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (matchRow.status !== "scheduled" || !matchRow.scheduled_date) {
      return new Response(JSON.stringify({ error: "Match is not scheduled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!matchRow.ladder_id || !matchRow.challenger_id || !matchRow.challenged_id) {
      return new Response(JSON.stringify({ error: "Match is missing ladder or participants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ladderInfo } = await supabase
      .from("ladders")
      .select("id,name,type")
      .eq("id", matchRow.ladder_id)
      .maybeSingle();

    const ladderType = ladderInfo?.type || "singles";
    const ladderName = ladderInfo?.name || "Ladder";

    const challengerId = matchRow.challenger_id as string;
    const challengedId = matchRow.challenged_id as string;
    const membershipPlayerIds = [challengerId, challengedId];

    const { data: membershipRows } = await supabase
      .from("ladder_memberships")
      .select("player_id,partner_id")
      .eq("ladder_id", matchRow.ladder_id)
      .in("player_id", membershipPlayerIds);

    const partnerByPrimary: Record<string, string | null> = {};
    (membershipRows || []).forEach((row) => {
      partnerByPrimary[row.player_id] = row.partner_id ?? null;
    });

    const teamAPlayers = [challengerId, partnerByPrimary[challengerId]].filter(Boolean) as string[];
    const teamBPlayers = [challengedId, partnerByPrimary[challengedId]].filter(Boolean) as string[];
    const allInvolvedPlayerIds = Array.from(new Set([...teamAPlayers, ...teamBPlayers]));

    if (!allInvolvedPlayerIds.includes(requesterPlayer.id)) {
      return new Response(JSON.stringify({ error: "Only participants can notify this match" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: playerRows } = await supabase
      .from("players")
      .select("id,name,email")
      .in("id", allInvolvedPlayerIds);

    const playerById = (playerRows || []).reduce<Record<string, { name?: string; email?: string }>>(
      (acc, row) => {
        acc[row.id] = { name: row.name ?? undefined, email: row.email ?? undefined };
        return acc;
      },
      {}
    );

    const getTeamName = (primaryId: string) => {
      const primaryName = playerById[primaryId]?.name || "Player";
      if (ladderType === "doubles") {
        const partnerId = partnerByPrimary[primaryId];
        if (partnerId && playerById[partnerId]?.name) {
          return `${primaryName} & ${playerById[partnerId]?.name}`;
        }
      }
      return primaryName;
    };

    const teamAName = getTeamName(challengerId);
    const teamBName = getTeamName(challengedId);
    const scheduledAt = new Date(matchRow.scheduled_date);
    const scheduledLabel = Number.isNaN(scheduledAt.getTime())
      ? matchRow.scheduled_date
      : `${scheduledAt.toISOString().replace("T", " ").slice(0, 16)} UTC`;

    const subject = `Match scheduled: ${teamAName} vs ${teamBName}`;
    let sent = 0;
    const failures: string[] = [];

    for (const recipientId of allInvolvedPlayerIds) {
      const recipient = playerById[recipientId];
      if (!recipient?.email) continue;

      const opponent = teamAPlayers.includes(recipientId) ? teamBName : teamAName;
      const roundPart = matchRow.round_label ? ` | ${matchRow.round_label}` : "";
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Hi ${recipient.name || "there"},</p>
          <p>Your match has been scheduled.</p>
          <p><strong>${teamAName}</strong> vs <strong>${teamBName}</strong></p>
          <p>Ladder: ${ladderName}${roundPart}</p>
          <p>Opponent: <strong>${opponent}</strong></p>
          <p>When: <strong>${scheduledLabel}</strong></p>
          <p>You can reschedule or update the score in SportsLadder.</p>
        </div>
      `;
      const text = `Hi ${recipient.name || "there"},\n\nYour match has been scheduled.\n${teamAName} vs ${teamBName}\nLadder: ${ladderName}${roundPart}\nOpponent: ${opponent}\nWhen: ${scheduledLabel}\n\nYou can reschedule or update the score in SportsLadder.`;

      const sendResult = await postResendEmail(resendApiKey, {
        from: resendFrom,
        to: [recipient.email],
        subject,
        html,
        text,
        reply_to: resendReplyTo,
      });

      if (!sendResult.ok) {
        failures.push(`${recipient.email} (${sendResult.status}): ${sendResult.body}`);
      } else {
        sent += 1;
      }

      await sleep(550);
    }

    return new Response(
      JSON.stringify({
        ok: failures.length === 0,
        sent,
        failed: failures.length,
        failedRecipients: failures,
        mode,
        matchId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret");
    if (!provided || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const today = formatDate(new Date());

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(
      "id,ladder_id,round_label,round_start_date,round_end_date,challenger_id,challenged_id,status,scheduled_date"
    )
    .in("status", ["pending", "accepted", "scheduled"])
    .lte("round_start_date", today)
    .gte("round_end_date", today);

  if (matchesError) {
    return new Response(JSON.stringify({ error: matchesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const safeMatches = (matches || []).filter((match) => {
    if (match.status === "scheduled") {
      if (!match.scheduled_date) return false;
      const scheduledDay = formatDate(new Date(match.scheduled_date));
      return scheduledDay < today;
    }
    return true;
  });

  if (!safeMatches.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no matches" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ladderIds = Array.from(new Set(safeMatches.map((m) => m.ladder_id).filter(Boolean))) as string[];

  const { data: ladderRows } = await supabase
    .from("ladders")
    .select("id,name,type")
    .in("id", ladderIds);

  const ladderById = (ladderRows || []).reduce<
    Record<string, { name?: string | null; type?: string | null }>
  >((acc, row) => {
    acc[row.id] = { name: row.name, type: row.type };
    return acc;
  }, {});

  const matchesByLadder = safeMatches.reduce<Record<string, typeof safeMatches>>((acc, match) => {
    if (!match.ladder_id) return acc;
    acc[match.ladder_id] = acc[match.ladder_id] || [];
    acc[match.ladder_id].push(match);
    return acc;
  }, {});

  const playerIds = Array.from(
    new Set(safeMatches.flatMap((m) => [m.challenger_id, m.challenged_id]).filter(Boolean))
  ) as string[];

  const { data: membershipRows } = await supabase
    .from("ladder_memberships")
    .select("ladder_id,player_id,partner_id")
    .in("ladder_id", ladderIds)
    .in("player_id", playerIds);

  const partnerByPrimary: Record<string, string | null> = {};
  (membershipRows || []).forEach((row) => {
    partnerByPrimary[row.player_id] = row.partner_id ?? null;
  });

  const allRecipientIds = Array.from(
    new Set([
      ...playerIds,
      ...(membershipRows || []).map((row) => row.partner_id).filter((id): id is string => !!id),
    ])
  );

  const { data: players } = await supabase
    .from("players")
    .select("id,name,email")
    .in("id", allRecipientIds);

  const playerById = (players || []).reduce<Record<string, { name?: string; email?: string }>>(
    (acc, row) => {
      acc[row.id] = { name: row.name ?? undefined, email: row.email ?? undefined };
      return acc;
    },
    {}
  );

  const recipientMatches = new Map<
    string,
    Array<{
      opponent: string;
      ladderName: string;
      roundLabel?: string | null;
      status: string;
      scheduledDate?: string | null;
    }>
  >();

  const addMatchForRecipient = (
    recipientId: string,
    opponent: string,
    ladderName: string,
    roundLabel?: string | null,
    status?: string | null,
    scheduledDate?: string | null
  ) => {
    if (!recipientMatches.has(recipientId)) {
      recipientMatches.set(recipientId, []);
    }
    recipientMatches.get(recipientId)?.push({
      opponent,
      ladderName,
      roundLabel,
      status: status || "pending",
      scheduledDate,
    });
  };

  const getTeamName = (primaryId: string, ladderType?: string | null) => {
    const primaryName = playerById[primaryId]?.name || "Player";
    if (ladderType === "doubles") {
      const partnerId = partnerByPrimary[primaryId];
      if (partnerId && playerById[partnerId]?.name) {
        return `${primaryName} & ${playerById[partnerId]?.name}`;
      }
    }
    return primaryName;
  };

  for (const ladderId of Object.keys(matchesByLadder)) {
    const ladderMatches = matchesByLadder[ladderId] || [];
    if (!ladderMatches.length) continue;

    const roundStart = ladderMatches.find((m) => m.round_start_date)?.round_start_date as
      | string
      | undefined;
    const roundLabel = ladderMatches.find((m) => m.round_label)?.round_label ?? null;
    if (!roundStart) continue;

    const shouldSend = mode === "start" ? roundStart === today : isSecondFriday(roundStart, today);
    if (!shouldSend) continue;

    const ladderInfo = ladderById[ladderId];
    const ladderName = ladderInfo?.name || "Ladder";
    const ladderType = ladderInfo?.type || "singles";

    ladderMatches.forEach((match) => {
      const teamA = match.challenger_id as string;
      const teamB = match.challenged_id as string;
      const teamAPlayers = [teamA, partnerByPrimary[teamA]].filter(Boolean) as string[];
      const teamBPlayers = [teamB, partnerByPrimary[teamB]].filter(Boolean) as string[];
      const teamAName = getTeamName(teamA, ladderType);
      const teamBName = getTeamName(teamB, ladderType);

      teamAPlayers.forEach((id) =>
        addMatchForRecipient(id, teamBName, ladderName, roundLabel, match.status, match.scheduled_date)
      );
      teamBPlayers.forEach((id) =>
        addMatchForRecipient(id, teamAName, ladderName, roundLabel, match.status, match.scheduled_date)
      );
    });
  }

  const emailsToSend = Array.from(recipientMatches.entries()).filter(([id]) => !!playerById[id]?.email);

  const subjectPrefix =
    mode === "second_friday"
      ? "Reminder: pending matches this round"
      : "Pending matches for the new round";

  let sent = 0;
  const failures: string[] = [];

  for (const [recipientId, items] of emailsToSend) {
    const recipient = playerById[recipientId];
    if (!recipient?.email) continue;

    const name = recipient.name || "there";
    const listItems = items
      .map((item) => {
        const statusLabel = item.status === "scheduled" ? "scheduled (overdue)" : item.status;
        const when = item.scheduledDate ? ` | ${formatDate(new Date(item.scheduledDate))}` : "";
        return `<li>vs <strong>${item.opponent}</strong> (${item.ladderName}${
          item.roundLabel ? ` | ${item.roundLabel}` : ""
        } | ${statusLabel}${when})</li>`;
      })
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${name},</p>
        <p>Here are your pending matches:</p>
        <ul>${listItems}</ul>
        <p>Please schedule your matches in the SportsLadder app.</p>
      </div>
    `;

    const text = `Hi ${name},\n\nYou have matches to schedule or complete:\n${items
      .map((item) => {
        const statusLabel = item.status === "scheduled" ? "scheduled (overdue)" : item.status;
        const when = item.scheduledDate ? ` on ${formatDate(new Date(item.scheduledDate))}` : "";
        return `- vs ${item.opponent} (${item.ladderName}${
          item.roundLabel ? ` | ${item.roundLabel}` : ""
        } | ${statusLabel}${when})`;
      })
      .join("\n")}\n\nPlease schedule your matches in the SportsLadder app.`;

    const sendResult = await postResendEmail(resendApiKey, {
      from: resendFrom,
      to: [recipient.email],
      subject: subjectPrefix,
      html,
      text,
      reply_to: resendReplyTo,
    });

    if (!sendResult.ok) {
      failures.push(`${recipient.email} (${sendResult.status}): ${sendResult.body}`);
      continue;
    }

    sent += 1;
    // Resend account is currently capped at 2 req/s.
    await sleep(550);
  }

  return new Response(
    JSON.stringify({
      ok: failures.length === 0,
      sent,
      failed: failures.length,
      failedRecipients: failures,
      mode,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
