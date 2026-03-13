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
const emailLogoUrl = Deno.env.get("EMAIL_LOGO_URL") || "https://sportsladder.nl/favicon.svg";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const cronSecret = Deno.env.get("CRON_SECRET");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const formatDate = (date: Date | null | undefined) => {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

type MatchForReminder = {
  id: string;
  ladder_id: string | null;
  round_label?: string | null;
  challenger_id: string | null;
  challenged_id: string | null;
  status: string;
  scheduled_date: string | null;
  created_at: string | null;
  round_start_date?: string | null;
  round_end_date?: string | null;
};

const isRoundDateColumnError = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("column") ||
    lower.includes("round_start_date") ||
    lower.includes("round_end_date") ||
    lower.includes("round_label") ||
    lower.includes("could not find") && (lower.includes("start") || lower.includes("round"))
  );
};

const parseDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
};

const isFirstMonday = (roundStart: string | null | undefined, today: string) => {
  const startDate = parseDate(roundStart);
  if (!startDate || !today) {
    return false;
  }
  return startDate.getUTCDay() === 1 && formatDate(startDate) === today;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const isSecondFriday = (roundStart: string, today: string) => {
  const startDate = parseDate(roundStart);
  if (!startDate || !today) {
    return false;
  }
  const startDow = startDate.getUTCDay(); // 0=Sun
  const friday = 5;
  const daysUntilFriday = (friday - startDow + 7) % 7;
  const firstFriday = addDays(startDate, daysUntilFriday);
  const secondFriday = addDays(firstFriday, 7);
  return formatDate(secondFriday) === today;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
  }

  const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const requestedMode = typeof payload?.mode === "string" ? payload.mode : "start";
  const onlyEmail =
    typeof payload?.only_email === "string" && payload.only_email.trim().length > 0
      ? payload.only_email.trim().toLowerCase()
      : null;
  const mode =
    requestedMode === "second_friday" ||
    requestedMode === "second_friday_force" ||
    requestedMode === "scheduled_match" ||
    requestedMode === "schedule_match" ||
    requestedMode === "result_registered" ||
    requestedMode === "first_monday" ||
    requestedMode === "first_monday_force" ||
    requestedMode === "start"
      ? requestedMode
      : "start";

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (mode === "scheduled_match" || mode === "schedule_match") {
    const matchId = typeof payload?.matchId === "string" ? payload.matchId : null;
    if (!matchId) {
      return jsonResponse({ error: `Missing matchId for ${mode} mode` }, 400);
    }

    const scheduledDate =
      mode === "schedule_match" && typeof payload?.scheduledDate === "string"
        ? payload.scheduledDate
        : null;
    if (mode === "schedule_match") {
      if (!scheduledDate) {
        return jsonResponse({ error: "Missing scheduledDate for schedule_match mode" }, 400);
      }
      if (Number.isNaN(new Date(scheduledDate).getTime())) {
        return jsonResponse({ error: "Invalid scheduledDate" }, 400);
      }
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return jsonResponse({ error: "Missing bearer token" }, 401);
    }

    const accessToken = authHeader.slice(7).trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user?.email) {
      return jsonResponse({ error: "Invalid user session" }, 401);
    }

    let { data: requesterPlayer, error: requesterPlayerError } = await supabase
      .from("players")
      .select("id,name,email,is_admin,is_super_admin,clubs")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!requesterPlayer?.id && userData.user.email) {
      const fallbackPlayerResult = await supabase
        .from("players")
        .select("id,name,email,is_admin,is_super_admin,clubs")
        .ilike("email", userData.user.email)
        .maybeSingle();
      requesterPlayer = fallbackPlayerResult.data;
      requesterPlayerError = fallbackPlayerResult.error;
    }
    if (requesterPlayerError || !requesterPlayer?.id) {
      return jsonResponse({ error: "Current player not found" }, 403);
    }

    const { data: existingMatchRow, error: matchError } = await supabase
      .from("matches")
      .select("id,ladder_id,round_label,challenger_id,challenged_id,status,scheduled_date")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !existingMatchRow) {
      return jsonResponse({ error: "Match not found" }, 404);
    }

    if (!existingMatchRow.ladder_id || !existingMatchRow.challenger_id || !existingMatchRow.challenged_id) {
      return jsonResponse({ error: "Match is missing ladder or participants" }, 400);
    }

    const { data: ladderInfo } = await supabase
      .from("ladders")
      .select("id,name,type,club_id")
      .eq("id", existingMatchRow.ladder_id)
      .maybeSingle();

    const ladderType = ladderInfo?.type || "singles";
    const ladderName = ladderInfo?.name || "Ladder";

    const challengerId = existingMatchRow.challenger_id as string;
    const challengedId = existingMatchRow.challenged_id as string;
    const membershipPlayerIds = [challengerId, challengedId];

    const { data: membershipRows } = await supabase
      .from("ladder_memberships")
      .select("player_id,partner_id")
      .eq("ladder_id", existingMatchRow.ladder_id)
      .in("player_id", membershipPlayerIds);

    const partnerByPrimary: Record<string, string | null> = {};
    (membershipRows || []).forEach((row) => {
      partnerByPrimary[row.player_id] = row.partner_id ?? null;
    });

    const teamAPlayers = [challengerId, partnerByPrimary[challengerId]].filter(Boolean) as string[];
    const teamBPlayers = [challengedId, partnerByPrimary[challengedId]].filter(Boolean) as string[];
    const allInvolvedPlayerIds = Array.from(new Set([...teamAPlayers, ...teamBPlayers]));

    if (!allInvolvedPlayerIds.includes(requesterPlayer.id)) {
      return jsonResponse(
        {
          error:
            mode === "schedule_match"
              ? "Only match participants can schedule this match"
              : "Only participants can notify this match",
        },
        403
      );
    }

    let matchRow = existingMatchRow;
    if (mode === "schedule_match") {
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          scheduled_date: scheduledDate,
          status: "scheduled",
          winner_id: null,
          score: null,
          player1_score: null,
          player2_score: null,
        })
        .eq("id", matchId);

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }

      matchRow = {
        ...existingMatchRow,
        scheduled_date: scheduledDate,
        status: "scheduled",
      };
    }

    if (matchRow.status !== "scheduled" || !matchRow.scheduled_date) {
      return jsonResponse({ error: "Match is not scheduled" }, 400);
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
    const scheduledLabel = (() => {
      if (Number.isNaN(scheduledAt.getTime())) return matchRow.scheduled_date;
      const plusOneHour = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
      const year = plusOneHour.getUTCFullYear();
      const month = String(plusOneHour.getUTCMonth() + 1).padStart(2, "0");
      const day = String(plusOneHour.getUTCDate()).padStart(2, "0");
      const hours = String(plusOneHour.getUTCHours()).padStart(2, "0");
      const minutes = String(plusOneHour.getUTCMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    })();

    const subject = `Match scheduled: ${teamAName} vs ${teamBName}`;
    let sent = 0;
    const failures: string[] = [];

    for (const recipientId of allInvolvedPlayerIds) {
      const recipient = playerById[recipientId];
      if (!recipient?.email) continue;

      const roundPart = matchRow.round_label ? ` | ${matchRow.round_label}` : "";
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Hi ${recipient.name || "there"},</p>
          <p>Your match has been scheduled.</p>
          <p><strong>${teamAName}</strong> vs <strong>${teamBName}</strong></p>
          <p>Ladder: ${ladderName}${roundPart}</p>
          <p>When: <strong>${scheduledLabel}</strong></p>
          <p>You can reschedule or register the result in the SportsLadder app.</p>
          <p>Good luck and enjoy the match!</p>
          <p style="color: #111111;">Team SportsLadder</p>
          <img src="${emailLogoUrl}" alt="SportsLadder logo" width="48" height="48" style="display:block;" />
        </div>
      `;
      const text = `Hi ${recipient.name || "there"},\n\nYour match has been scheduled.\n${teamAName} vs ${teamBName}\nLadder: ${ladderName}${roundPart}\nWhen: ${scheduledLabel}\n\nYou can reschedule or register the result in the SportsLadder app.\nGood luck and enjoy the match!\nTeam SportsLadder`;

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

    return jsonResponse({
      ok: failures.length === 0,
      sent,
      failed: failures.length,
      failedRecipients: failures,
      mode,
      matchId,
      scheduledDate: matchRow.scheduled_date,
      status: matchRow.status,
    });
  }

  if (mode === "result_registered") {
    const matchId = typeof payload?.matchId === "string" ? payload.matchId : null;
    if (!matchId) {
      return jsonResponse({ error: "Missing matchId for result_registered mode" }, 400);
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return jsonResponse({ error: "Missing bearer token" }, 401);
    }

    const accessToken = authHeader.slice(7).trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user?.email) {
      return jsonResponse({ error: "Invalid user session" }, 401);
    }

    let { data: requesterPlayer, error: requesterPlayerError } = await supabase
      .from("players")
      .select("id,name,email")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!requesterPlayer?.id && userData.user.email) {
      const fallbackPlayerResult = await supabase
        .from("players")
        .select("id,name,email")
        .ilike("email", userData.user.email)
        .maybeSingle();
      requesterPlayer = fallbackPlayerResult.data;
      requesterPlayerError = fallbackPlayerResult.error;
    }
    if (requesterPlayerError || !requesterPlayer?.id) {
      return jsonResponse({ error: "Current player not found" }, 403);
    }

    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select("id,ladder_id,round_label,challenger_id,challenged_id,status,scheduled_date,winner_id,score")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !matchRow) {
      return jsonResponse({ error: "Match not found" }, 404);
    }

    if (!matchRow.ladder_id || !matchRow.challenger_id || !matchRow.challenged_id) {
      return jsonResponse({ error: "Match is missing ladder or participants" }, 400);
    }

    if (matchRow.status !== "completed") {
      return jsonResponse({ error: "Match result is not completed" }, 400);
    }

    const challengerId = matchRow.challenger_id as string;
    const challengedId = matchRow.challenged_id as string;

    const { data: ladderInfo } = await supabase
      .from("ladders")
      .select("id,name,type")
      .eq("id", matchRow.ladder_id)
      .maybeSingle();

    const ladderType = ladderInfo?.type || "singles";
    const ladderName = ladderInfo?.name || "Ladder";

    const { data: membershipRows } = await supabase
      .from("ladder_memberships")
      .select("player_id,partner_id")
      .eq("ladder_id", matchRow.ladder_id)
      .in("player_id", [challengerId, challengedId]);

    const partnerByPrimary: Record<string, string | null> = {};
    (membershipRows || []).forEach((row) => {
      partnerByPrimary[row.player_id] = row.partner_id ?? null;
    });

    const teamAPlayers = [challengerId, partnerByPrimary[challengerId]].filter(Boolean) as string[];
    const teamBPlayers = [challengedId, partnerByPrimary[challengedId]].filter(Boolean) as string[];
    const allInvolvedPlayerIds = Array.from(new Set([...teamAPlayers, ...teamBPlayers]));

    if (!allInvolvedPlayerIds.includes(requesterPlayer.id)) {
      return jsonResponse({ error: "Only participants can notify this match result" }, 403);
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
    const subject = `Result registered: ${teamAName} vs ${teamBName}`;
    let sent = 0;
    const failures: string[] = [];

    for (const recipientId of allInvolvedPlayerIds) {
      const recipient = playerById[recipientId];
      if (!recipient?.email) continue;
      if (onlyEmail && recipient.email.toLowerCase() !== onlyEmail) continue;

      const roundPart = matchRow.round_label ? ` | ${matchRow.round_label}` : "";
      const [teamAScore, teamBScore] = (matchRow.score || "").split("-").map((part) => part.trim());
      const formattedResultLine =
        teamAScore && teamBScore
          ? `<strong>${teamAName}</strong> <strong>${teamAScore}</strong> vs <strong>${teamBName}</strong> <strong>${teamBScore}</strong>`
          : `<strong>${teamAName}</strong> vs <strong>${teamBName}</strong>`;
      const formattedResultText =
        teamAScore && teamBScore
          ? `${teamAName} ${teamAScore} vs ${teamBName} ${teamBScore}`
          : `${teamAName} vs ${teamBName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111111;">
          <p>Hi ${recipient.name || "there"},</p>
          <p>The result for your match has been registered.</p>
          <p>${formattedResultLine}</p>
          <p>Ladder: ${ladderName}${roundPart}</p>
          <p>You can view the result in the SportsLadder app.</p>
          <p style="color: #111111;">Team SportsLadder</p>
          <img src="${emailLogoUrl}" alt="SportsLadder logo" width="48" height="48" style="display:block;" />
        </div>
      `;
      const text = `Hi ${recipient.name || "there"},\n\nThe result for your match has been registered.\n${formattedResultText}\nLadder: ${ladderName}${roundPart}\n\nYou can view the result in the SportsLadder app.\nTeam SportsLadder`;

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

    return jsonResponse({
      ok: failures.length === 0,
      sent,
      failed: failures.length,
      failedRecipients: failures,
      mode,
      matchId,
      score: matchRow.score,
      onlyEmail,
    });
  }

  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret");
    if (!provided || provided !== cronSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  const today = formatDate(new Date()) || "";
  const matchStatusFilter = ["pending", "accepted", "scheduled"];
  let safeMatches: MatchForReminder[] = [];

  const baseSelection =
    "id,ladder_id,challenger_id,challenged_id,status,scheduled_date,created_at";
  const extendedSelection =
    "id,ladder_id,round_label,round_start_date,round_end_date,challenger_id,challenged_id,status,scheduled_date,created_at";

  const { data: matchesWithRoundWindow, error: matchesWindowError } = await supabase
    .from("matches")
    .select(extendedSelection)
    .in("status", matchStatusFilter)
    .lte("round_start_date", today)
    .gte("round_end_date", today);

  if (matchesWindowError) {
    const errMsg = String(matchesWindowError.message || "");
    if (!isRoundDateColumnError(errMsg)) {
      return jsonResponse({ error: matchesWindowError.message }, 500);
    }

    const { data: matchesFallback, error: matchesFallbackError } = await supabase
      .from("matches")
      .select(baseSelection)
      .in("status", matchStatusFilter);

    if (matchesFallbackError) {
      return jsonResponse({ error: matchesFallbackError.message }, 500);
    }

    safeMatches = (matchesFallback || []) as MatchForReminder[];
  } else {
    safeMatches = (matchesWithRoundWindow || []) as MatchForReminder[];
  }

  safeMatches = safeMatches.filter((match) => {
    if (match.status === "scheduled") {
      if (!match.scheduled_date) return false;
      const scheduledDay = formatDate(new Date(match.scheduled_date));
      if (!scheduledDay) return false;
      return scheduledDay < today;
    }
    return true;
  });

  if (!safeMatches.length) {
    return jsonResponse({ ok: true, sent: 0, reason: "no matches" });
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

  const getEarliestDate = (
    matches: typeof safeMatches,
    getter: (match: MatchForReminder) => string | null | undefined
  ) => {
    const parsedDates = matches
      .map((match) => parseDate(getter(match)))
      .filter((d): d is Date => Boolean(d))
      .map((d) => d.getTime());

    if (!parsedDates.length) {
      return null;
    }

    return formatDate(new Date(Math.min(...parsedDates)));
  };

  const getRoundAnchorDate = (matches: typeof safeMatches) => {
    const roundStartDate = getEarliestDate(matches, (match) => match.round_start_date);
    if (roundStartDate) {
      return roundStartDate;
    }

    const scheduledDate = getEarliestDate(matches, (match) => match.scheduled_date);
    if (scheduledDate) {
      return scheduledDate;
    }

    return getEarliestDate(matches, (match) => match.created_at);
  };

  for (const ladderId of Object.keys(matchesByLadder)) {
    const ladderMatches = matchesByLadder[ladderId] || [];
    if (!ladderMatches.length) continue;
    const roundLabel = ladderMatches.find((m) => m.round_label)?.round_label ?? null;

    const normalizedRoundStart = getRoundAnchorDate(ladderMatches);
    if (!normalizedRoundStart) {
      continue;
    }

    const shouldSend =
      mode === "first_monday_force"
        ? true
        : mode === "second_friday_force"
        ? true
        : mode === "start" || mode === "first_monday"
        ? isFirstMonday(normalizedRoundStart, today)
        : isSecondFriday(normalizedRoundStart, today);
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

  let emailsToSend = Array.from(recipientMatches.entries()).filter(([id]) => !!playerById[id]?.email);
  if (onlyEmail) {
    emailsToSend = emailsToSend.filter(([id]) => {
      const recipientEmail = playerById[id]?.email?.toLowerCase();
      return recipientEmail === onlyEmail;
    });
  }

  const subjectPrefix =
    mode === "second_friday" || mode === "second_friday_force"
      ? "Reminder: pending matches this round"
      : mode === "first_monday" || mode === "first_monday_force"
      ? "New round started - Your upcoming matches"
      : "Pending matches for the new round";

  let sent = 0;
  const failures: string[] = [];

  for (const [recipientId, items] of emailsToSend) {
    const recipient = playerById[recipientId];
    if (!recipient?.email) continue;

    const name = recipient.name || "there";
    const isFirstMondayMode = mode === "first_monday" || mode === "first_monday_force";
    const isSecondFridayMode = mode === "second_friday" || mode === "second_friday_force";
    const isStyledReminderMode = isFirstMondayMode || isSecondFridayMode;
    const signatureHtml = `<p style="margin-top: 18px; color: #111111;">Team SportsLadder</p><img src="${emailLogoUrl}" alt="SportsLadder logo" width="48" height="48" style="display:block;" />`;
    const listItems = items
      .map((item) => {
        if (isStyledReminderMode) {
          return `<li><strong>${name}</strong> vs <strong>${item.opponent}</strong></li>`;
        }
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
        <p>${
          isFirstMondayMode
            ? "A new ladder round has started and the following matches have been scheduled for you:"
            : isSecondFridayMode
            ? "This is a reminder that the following matches are still pending for you:"
            : "Here are your matches for this round:"
        }</p>
        <ul>${listItems}</ul>
        <p>${
          isFirstMondayMode
            ? "Please contact your opponent(s) to arrange when the matches will be played and update the results in the SportsLadder app."
            : isSecondFridayMode
            ? "Please contact your opponent(s) to schedule these matches and update the results in the SportsLadder app."
            : "Please schedule your matches in the SportsLadder app."
        }</p>
        ${
          isSecondFridayMode
            ? "<p>Matches that are not scheduled before Monday will be marked as not played.</p>"
            : ""
        }
        <p>${
          isFirstMondayMode
            ? "Good luck and enjoy the games!"
            : isSecondFridayMode
            ? "Good luck and enjoy the games!"
            : "Please (re)schedule or fill in the score before Monday 8:00."
        }</p>
        ${signatureHtml}
      </div>
    `;

    const text = `Hi ${name},\n\n${
      isFirstMondayMode
        ? "A new ladder round has started and the following matches have been scheduled for you:"
        : isSecondFridayMode
        ? "This is a reminder that the following matches are still pending for you:"
        : "You have matches to schedule or complete:"
    }\n${items
      .map((item) => {
        if (isStyledReminderMode) {
          return `- ${name} vs ${item.opponent}`;
        }
        const statusLabel = item.status === "scheduled" ? "scheduled (overdue)" : item.status;
        const when = item.scheduledDate ? ` on ${formatDate(new Date(item.scheduledDate))}` : "";
        return `- vs ${item.opponent} (${item.ladderName}${
          item.roundLabel ? ` | ${item.roundLabel}` : ""
        } | ${statusLabel}${when})`;
      })
      .join("\n")}\n\n${
      isFirstMondayMode
        ? "Please contact your opponent(s) to arrange when the matches will be played and update the results in the SportsLadder app.\nGood luck and enjoy the games!"
        : isSecondFridayMode
        ? "Please contact your opponent(s) to schedule these matches and update the results in the SportsLadder app.\nMatches that are not scheduled before Monday will be marked as not played.\nGood luck and enjoy the games!"
        : "Please schedule your matches in the SportsLadder app.\nPlease (re)schedule or fill in the score before upcoming Monday"
    }\n\nTeam SportsLadder`;

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

  return jsonResponse({
    ok: failures.length === 0,
    sent,
    failed: failures.length,
    failedRecipients: failures,
    mode,
    onlyEmail,
  });
});
