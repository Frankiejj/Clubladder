import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

import { ProfileDropdown } from "@/components/ProfileDropdown";
import { PlayerCard } from "@/components/PlayerCard";
import { RemovePlayerModal } from "@/components/RemovePlayerModal";
import { PendingMatches } from "@/components/PendingMatches";
import { Header } from "@/components/Header";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";
import { scheduleMatch } from "@/services/matchScheduling";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users } from "lucide-react";

type LadderOption = {
  id: string;
  name: string | null;
  type: string;
  club_id: string | null;
};

type LadderMembershipViewRow = {
  id?: string | null;
  player_id?: string | null;
  partner_id?: string | null;
  rank?: number | null;
  team_avatar_url?: string | null;
};

type LadderMemberIdRow = {
  member_id?: string | null;
  player_id?: string | null;
  partner_id?: string | null;
};

type LadderRankHistoryRow = {
  membership_id?: string | null;
  player_id?: string | null;
  partner_id?: string | null;
  rank?: number | null;
};

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const formatLadderName = (name?: string | null, fallback?: string) => {
    if (!name) return fallback || "Ladder";
    return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
  };
  const formatScheduledDate = (value: string) => {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatRoundDate = (value?: string | null) => {
    if (!value) return null;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  // --------------------------
  // AUTHENTICATION
  // --------------------------
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Supabase session user (email etc.)
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Fetch session user on startup
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data?.user ?? null);
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      else setIsAuthenticated(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
        if (!session) navigate("/login");
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // --------------------------
  // DATA
  // --------------------------
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [ladders, setLadders] = useState<LadderOption[]>([]);
  const [laddersLoading, setLaddersLoading] = useState(false);
  const [selectedLadderId, setSelectedLadderId] = useState<string>("");
  const [ladderPlayerIds, setLadderPlayerIds] = useState<Set<string>>(new Set());
  const [ladderRankMap, setLadderRankMap] = useState<Record<string, number>>({});
  const [ladderPartnerMap, setLadderPartnerMap] = useState<Record<string, string | null>>({});
  const [ladderPrimaryMap, setLadderPrimaryMap] = useState<Record<string, string>>({});
  const [ladderMembershipIdMap, setLadderMembershipIdMap] = useState<Record<string, string>>({});
  const [ladderTeamAvatarMap, setLadderTeamAvatarMap] = useState<Record<string, string | null>>({});
  const [ladderPlayersLoading, setLadderPlayersLoading] = useState(false);

  // --------------------------
  // UI STATE
  // --------------------------
  const [activeView, setActiveView] = useState<"rankings" | "matches">("rankings");
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showMyMatchesOnly, setShowMyMatchesOnly] = useState(false);

  // --------------------------
  // HANDLERS
  // --------------------------
  const handleChallenge = (playerId: string) => {
    console.log("Challenge clicked for player:", playerId);
  };

  const handleViewMatch = (challengeId: string) => {
    console.log("View match clicked:", challengeId);
  };

  // --------------------------
  // LOAD DATA WHEN AUTH READY
  // --------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    loadPlayers();
    loadChallenges();
    loadClubs();
  }, [isAuthenticated]);

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select(
        "id,name,email,is_admin,is_super_admin,clubs,created_at,phone,avatar_url"
      )
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error loading players:", error);
      return;
    }

    setPlayers(
      (data as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        rank: 0,
        isAdmin: row.is_admin ?? false,
        isSuperAdmin: (row as any).is_super_admin ?? false,
        clubs: row.clubs ?? null,
        createdAt: row.created_at,
        phone: row.phone ?? null,
        avatarUrl: row.avatar_url ?? null,
        avatar_url: row.avatar_url ?? null,
      }))
    );
  }

  async function loadChallenges() {
    const { data, error } = await supabase
      .from("matches")
      .select(
        "id,ladder_id,round_label,round_start_date,round_end_date,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error loading challenges:", error);
      return;
    }

    setChallenges(
      (data as any[]).map((row) => ({
        id: row.id,
        challengerId: row.challenger_id,
        challengedId: row.challenged_id,
        status: row.status as Challenge["status"],
        scheduledDate: row.scheduled_date,
        winnerId: row.winner_id,
        score: row.score,
        player1Score: row.player1_score,
        player2Score: row.player2_score,
        notes: row.notes,
        ladderId: row.ladder_id ?? null,
        roundLabel: row.round_label ?? null,
        roundStartDate: row.round_start_date ?? null,
        roundEndDate: row.round_end_date ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );
  }

  async function loadClubs() {
    const { data, error } = await supabase.from("clubs").select("*");

    if (error) {
      console.error("Error loading clubs:", error);
      return;
    }

    setClubs(data);
  }

  async function removePlayer(playerId: string) {
    const { error } = await (supabase as any)
      .from("players")
      .delete()
      .eq("id", playerId);
    if (error) console.error(error);

    await loadPlayers();
  }

  async function handleMatchResult(
    challengeId: string,
    winnerId: string | null,
    score1?: number,
    score2?: number
  ) {
    const scoreString =
      typeof score1 === "number" && typeof score2 === "number"
        ? `${score1}-${score2}`
        : null;
    const completionDate = new Date();
    completionDate.setSeconds(0, 0);

    const { error } = await (supabase as any)
      .from("matches")
      .update({
        winner_id: winnerId,
        player1_score: score1 ?? null,
        player2_score: score2 ?? null,
        score: scoreString,
        status: "completed",
        scheduled_date: completionDate.toISOString(),
      })
      .eq("id", challengeId);

    if (error) console.error(error);

    await loadChallenges();
    await loadPlayers();
  }

  const handleSchedule = async (matchId: string, datetimeIso: string) => {
    const existingMatch = challenges.find((m) => m.id === matchId);
    const isReschedule = Boolean(existingMatch?.scheduledDate);
    const successTitle = isReschedule ? "Match rescheduled" : "Match scheduled";

    try {
      const result = await scheduleMatch(matchId, datetimeIso);
      const nextDate = result.scheduledDate || datetimeIso;

      setChallenges((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                scheduledDate: nextDate,
                status: "scheduled",
              }
            : m
        )
      );

      if (result.ok === false) {
        toast({
          title: successTitle,
          description: "Date saved, but some email notifications failed.",
        });
        console.error("Scheduled match email partial failure", result);
        return;
      }

      toast({
        title: successTitle,
        description: formatScheduledDate(nextDate),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not schedule match";
      toast({
        title: isReschedule ? "Reschedule failed" : "Schedule failed",
        description: message,
        variant: "destructive",
      });
      console.error("Schedule failed", error);
      return;
    }
  };

  // --------------------------
  // FIXED USER LOGIC (THE IMPORTANT PART!)
  // --------------------------
  const currentUser = players.find(
    (p) => p.email?.toLowerCase() === sessionUser?.email?.toLowerCase()
  );

  const userClubIds = useMemo(
    () =>
      Array.isArray(currentUser?.clubs)
        ? currentUser.clubs.filter((clubId): clubId is string => Boolean(clubId))
        : [],
    [currentUser?.clubs]
  );
  const allowedLadderIds = useMemo(() => new Set(ladders.map((ladder) => ladder.id)), [ladders]);
  const visiblePlayers =
    userClubIds.length > 0
      ? players.filter((p) =>
          (p.clubs ?? []).some((clubId) => userClubIds.includes(clubId))
        )
      : [];
  const visibleChallenges = useMemo(
    () =>
      challenges.filter(
        (challenge) => !!challenge.ladderId && allowedLadderIds.has(challenge.ladderId)
      ),
    [challenges, allowedLadderIds]
  );
  const clubLabel = (() => {
    if (!userClubIds.length) return "No club assigned";
    const names = clubs
      .filter((c) => userClubIds.includes(c.id))
      .map((c) => c.name)
      .filter(Boolean);
    if (!names.length) return "Your clubs";
    return `${names.join(", ")}`;
  })();

  const selectedLadder = ladders.find((ladder) => ladder.id === selectedLadderId);
  const isDoublesLadder = selectedLadder?.type === "doubles";
  const visibleRankingIds = useMemo(() => {
    if (!selectedLadderId) return new Set<string>();
    if (!isDoublesLadder) return new Set(ladderPlayerIds);

    const ids = new Set<string>();
    ladderPlayerIds.forEach((playerId) => {
      if ((ladderPrimaryMap[playerId] || playerId) === playerId) {
        ids.add(playerId);
      }
    });
    return ids;
  }, [isDoublesLadder, ladderPlayerIds, ladderPrimaryMap, selectedLadderId]);
  const playerCount = selectedLadderId ? visibleRankingIds.size : 0;

  // --------------------------
  // UI
  // --------------------------
  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    const aRank = ladderRankMap[a.id];
    const bRank = ladderRankMap[b.id];
    if (typeof aRank === "number" && typeof bRank === "number" && aRank !== bRank) {
      return aRank - bRank;
    }
    return a.name.localeCompare(b.name);
  });

  const rankingPlayers = selectedLadderId
    ? sortedPlayers
        .filter((p) => visibleRankingIds.has(p.id))
        .map((player) => ({
          ...player,
          rank: ladderRankMap[player.id] ?? null,
          membershipId: ladderMembershipIdMap[player.id],
        }))
        .sort(
          (a, b) =>
            (ladderRankMap[a.id] ?? Number.MAX_SAFE_INTEGER) -
            (ladderRankMap[b.id] ?? Number.MAX_SAFE_INTEGER)
        )
    : [];

  const playerNameById = players.reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const partnerNameByPlayerId = isDoublesLadder
    ? Object.entries(ladderPartnerMap).reduce<Record<string, string>>((acc, [playerId, partnerId]) => {
        if (partnerId && playerNameById[partnerId]) {
          acc[playerId] = playerNameById[partnerId];
        }
        return acc;
      }, {})
    : {};

  const currentRoundLabel = useMemo(() => {
    if (!selectedLadderId) return null;
    const ladderMatches = visibleChallenges.filter(
      (c) => c.ladderId === selectedLadderId && c.roundLabel
    );
    if (!ladderMatches.length) return null;
    const parseLabel = (label: string) => {
      const match = label.match(/^(\d{4})-R(\d+)$/);
      if (!match) return { year: 0, round: 0 };
      return { year: parseInt(match[1], 10), round: parseInt(match[2], 10) };
    };
    return ladderMatches.reduce((best, current) => {
      if (!best.roundLabel) return current;
      const a = parseLabel(best.roundLabel);
      const b = parseLabel(current.roundLabel as string);
      if (b.year > a.year) return current;
      if (b.year === a.year && b.round > a.round) return current;
      return best;
    }).roundLabel as string;
  }, [visibleChallenges, selectedLadderId]);

  const currentRoundDates = useMemo(() => {
    if (!selectedLadderId || !currentRoundLabel) return null;
    const roundMatches = visibleChallenges.filter(
      (c) => c.ladderId === selectedLadderId && c.roundLabel === currentRoundLabel
    );
    if (!roundMatches.length) return null;
    const start = roundMatches.map((c) => c.roundStartDate).find((d) => !!d) || null;
    const end = roundMatches.map((c) => c.roundEndDate).find((d) => !!d) || null;
    if (!start && !end) return null;
    return { start, end };
  }, [visibleChallenges, selectedLadderId, currentRoundLabel]);

  const headerCurrentUser = currentUser || null;

  // Redirect super admins to the Super Admin page
  useEffect(() => {
    if (headerCurrentUser?.isSuperAdmin) {
      navigate("/super-admin");
    }
  }, [headerCurrentUser?.isSuperAdmin, navigate]);

  useEffect(() => {
    const loadUserLadders = async () => {
      if (!currentUser?.id || !userClubIds.length) {
        setLadders([]);
        setSelectedLadderId("");
        return;
      }
      setLaddersLoading(true);
      const { data: ladderRows, error: ladderError } = await (supabase as any)
        .from("ladders")
        .select("id,name,type,club_id")
        .in("club_id", userClubIds);

      if (ladderError) {
        console.error("Error loading ladders:", ladderError);
        setLadders([]);
        setSelectedLadderId("");
      } else {
        const safe = (ladderRows as LadderOption[] | null) || [];
        setLadders(safe);
        if (!safe.length) {
          setSelectedLadderId("");
        } else if (!selectedLadderId || !safe.some((ladder) => ladder.id === selectedLadderId)) {
          const singles = safe.find((l) => l.type === "singles");
          setSelectedLadderId((singles || safe[0]).id);
        }
      }
      setLaddersLoading(false);
    };

    loadUserLadders();
  }, [currentUser?.id, selectedLadderId, userClubIds]);

  useEffect(() => {
    if (!ladders.length) return;
    const params = new URLSearchParams(location.search);
    const ladderIdParam = params.get("ladderId");
    if (ladderIdParam) {
      const target = ladders.find((l) => l.id === ladderIdParam);
      if (target && target.id !== selectedLadderId) {
        setSelectedLadderId(target.id);
      }
      return;
    }
    const preferred = params.get("ladder");
    if (preferred !== "singles") return;
    const singles = ladders.find((l) => l.type === "singles");
    if (singles && singles.id !== selectedLadderId) {
      setSelectedLadderId(singles.id);
    }
  }, [ladders, location.search, selectedLadderId]);

  useEffect(() => {
    const resetLadderPlayers = () => {
      setLadderPlayerIds(new Set());
      setLadderRankMap({});
      setLadderPartnerMap({});
      setLadderMembershipIdMap({});
      setLadderPrimaryMap({});
      setLadderTeamAvatarMap({});
    };

    const applyLadderPlayers = (
      rows: LadderMembershipViewRow[],
      options?: { preserveMembershipLinks?: boolean; extraIds?: Iterable<string> }
    ) => {
      const ids = new Set<string>(options?.extraIds || []);
      const ranks: Record<string, number> = {};
      const partners: Record<string, string | null> = {};
      const membershipIds: Record<string, string> = {};
      const primaries: Record<string, string> = {};
      const teamAvatars: Record<string, string | null> = {};

      rows.forEach((row) => {
        const playerId = row?.player_id ?? null;
        const partnerId = row?.partner_id ?? null;
        const membershipId = row?.id ?? null;
        const rank =
          typeof row?.rank === "number" && Number.isFinite(row.rank)
            ? Number(row.rank)
            : null;

        if (playerId) {
          ids.add(playerId);
          primaries[playerId] = playerId;
          partners[playerId] = partnerId;
          teamAvatars[playerId] = row?.team_avatar_url ?? null;
          if (rank !== null) {
            ranks[playerId] = rank;
          }
          if (options?.preserveMembershipLinks !== false && membershipId) {
            membershipIds[playerId] = membershipId;
          }
        }

        if (partnerId) {
          ids.add(partnerId);
          primaries[partnerId] = playerId ?? partnerId;
          partners[partnerId] = playerId;
          teamAvatars[partnerId] = row?.team_avatar_url ?? null;
          if (rank !== null) {
            ranks[partnerId] = rank;
          }
          if (options?.preserveMembershipLinks !== false && membershipId) {
            membershipIds[partnerId] = membershipId;
          }
        }
      });

      setLadderPlayerIds(ids);
      setLadderRankMap(ranks);
      setLadderPartnerMap(partners);
      setLadderMembershipIdMap(membershipIds);
      setLadderPrimaryMap(primaries);
      setLadderTeamAvatarMap(teamAvatars);
    };

    const loadLadderPlayers = async () => {
      if (!selectedLadderId) {
        resetLadderPlayers();
        return;
      }

      setLadderPlayersLoading(true);
      const { data, error } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,player_id,rank,partner_id,team_avatar_url")
        .eq("ladder_id", selectedLadderId);

      const directRows = ((data as LadderMembershipViewRow[] | null) || []).filter(
        (row) => row?.player_id || row?.partner_id
      );

      if (!error && directRows.length > 0) {
        applyLadderPlayers(directRows);
        setLadderPlayersLoading(false);
        return;
      }

      if (error) {
        console.warn(
          "Direct ladder membership lookup failed, falling back to club-visible ladder data.",
          error
        );
      }

      const fallbackIds = new Set<string>();
      const fallbackRowsByKey = new Map<string, LadderMembershipViewRow>();

      const { data: rpcRows, error: rpcError } = await (supabase as any).rpc(
        "get_ladder_member_ids_for_ladders",
        { ladder_ids: [selectedLadderId] }
      );

      if (rpcError) {
        console.warn("get_ladder_member_ids_for_ladders RPC failed", rpcError);
      } else {
        ((rpcRows as LadderMemberIdRow[] | null) || []).forEach((row) => {
          const playerId = row?.player_id ?? null;
          const partnerId = row?.partner_id ?? null;
          const memberId = row?.member_id ?? null;
          const key = memberId || `${playerId || ""}:${partnerId || ""}`;

          if (playerId) fallbackIds.add(playerId);
          if (partnerId) fallbackIds.add(partnerId);
          if (!playerId && !partnerId) return;

          if (!fallbackRowsByKey.has(key)) {
            fallbackRowsByKey.set(key, {
              id: memberId,
              player_id: playerId,
              partner_id: partnerId,
              rank: null,
              team_avatar_url: null,
            });
          }
        });
      }

      visibleChallenges
        .filter((challenge) => challenge.ladderId === selectedLadderId)
        .forEach((challenge) => {
          fallbackIds.add(challenge.challengerId);
          fallbackIds.add(challenge.challengedId);
        });

      const { data: historyRows, error: historyError } = await (supabase as any)
        .from("ladder_rank_history")
        .select("membership_id,player_id,partner_id,rank")
        .eq("ladder_id", selectedLadderId)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.warn("Fallback ladder rank history lookup failed", historyError);
      } else {
        ((historyRows as LadderRankHistoryRow[] | null) || []).forEach((row) => {
          const playerId = row?.player_id ?? null;
          const partnerId = row?.partner_id ?? null;
          const membershipId = row?.membership_id ?? null;
          const key = membershipId || `${playerId || ""}:${partnerId || ""}`;

          if (playerId) fallbackIds.add(playerId);
          if (partnerId) fallbackIds.add(partnerId);
          if (!playerId && !partnerId) return;

          if (fallbackRowsByKey.has(key)) {
            const existing = fallbackRowsByKey.get(key)!;
            if (typeof existing.rank !== "number" && typeof row?.rank === "number") {
              existing.rank = row.rank;
            }
            return;
          }

          fallbackRowsByKey.set(key, {
            id: membershipId,
            player_id: playerId,
            partner_id: partnerId,
            rank:
              typeof row?.rank === "number" && Number.isFinite(row.rank)
                ? Number(row.rank)
                : null,
            team_avatar_url: null,
          });
        });
      }

      const fallbackRows = Array.from(fallbackRowsByKey.values());
      if (fallbackRows.length > 0 || fallbackIds.size > 0) {
        applyLadderPlayers(fallbackRows, {
          preserveMembershipLinks: false,
          extraIds: fallbackIds,
        });
      } else {
        resetLadderPlayers();
      }

      setLadderPlayersLoading(false);
    };

    loadLadderPlayers();
  }, [selectedLadderId, visibleChallenges]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );

  if (!isAuthenticated) return null;

  const handleLadderSelect = (value: string) => {
    const nextId = value === "none" ? "" : value;
    setSelectedLadderId(nextId);
    if (!nextId) {
      navigate("/app", { replace: true });
      return;
    }
    navigate(`/app?ladderId=${nextId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        
        {/* Profile in top-right */}
        <div className="absolute top-4 right-4 z-10">
          <ProfileDropdown />
        </div>

        {headerCurrentUser && (
          <Header
            playersCount={playerCount}
            onShowRemovePlayer={() => setShowRemovePlayerModal(true)}
            isAdmin={!!headerCurrentUser.isAdmin}
            currentUser={headerCurrentUser}
            onUpdateProfile={() => {}}
            challenges={challenges}
            players={players}
            onRemovePlayer={removePlayer}
            ladderSelector={
              <Select
                value={selectedLadderId || "none"}
                onValueChange={handleLadderSelect}
                disabled={laddersLoading || ladders.length === 0}
              >
                <SelectTrigger className="w-full sm:w-96 border-2 border-green-400 bg-white shadow-md text-green-900 text-base font-semibold focus:ring-2 focus:ring-green-500">
                  <SelectValue placeholder="Select ladder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    {laddersLoading ? "Loading ladders..." : "Select ladder"}
                  </SelectItem>
                  {[...ladders]
                    .sort((a, b) => {
                      if (a.type === b.type) return (a.name || "").localeCompare(b.name || "");
                      return a.type === "singles" ? -1 : 1;
                    })
                    .map((ladder) => (
                    <SelectItem key={ladder.id} value={ladder.id}>
                      {formatLadderName(ladder.name, ladder.type)}{" "}
                      <span className="text-xs text-gray-500 capitalize">
                        ({ladder.type})
                      </span>
                    </SelectItem>
                  ))}
                  {!laddersLoading && ladders.length === 0 && (
                    <SelectItem value="empty" disabled>
                      No ladders available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            }
          />
        )}

        <Card className="max-w-4xl mx-auto mt-6 text-center">
          <CardHeader>
            <CardTitle className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                {activeView === "rankings" ? (
                  <>
                    <Users className="w-5 h-5" />
                    Rankings
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    Matches
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-green-100">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-base sm:text-lg font-semibold text-green-800">
                  {playerCount} {isDoublesLadder ? "Teams" : "Players"}
                </span>
              </div>
            </CardTitle>

            <div className="flex justify-center gap-2 mt-4">
              <Button
                onClick={() => setActiveView("rankings")}
                variant={activeView === "rankings" ? "default" : "outline"}
                className={activeView === "rankings" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                Rankings
              </Button>
              <Button
                onClick={() => setActiveView("matches")}
                variant={activeView === "matches" ? "default" : "outline"}
                className={activeView === "matches" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                Matches
              </Button>
            </div>
            {currentRoundDates && (
              <div className="mt-2 text-xs sm:text-sm text-gray-700 font-semibold">
                Round {currentRoundLabel}
                {currentRoundDates.start || currentRoundDates.end ? ": " : ""}
                {currentRoundDates.start ? formatRoundDate(currentRoundDates.start) : "TBD"}
                {" – "}
                {currentRoundDates.end ? formatRoundDate(currentRoundDates.end) : "TBD"}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {activeView === "rankings" ? (
              <div className="space-y-3">
                <div />
                {ladderPlayersLoading ? (
                  <p className="text-gray-600">Loading ladder rankings...</p>
                ) : !selectedLadderId ? (
                  <p className="text-gray-600">Select a ladder to view rankings.</p>
                ) : rankingPlayers.length === 0 ? (
                  <p className="text-gray-600">No players found for this ladder.</p>
                ) : (
                  rankingPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      players={rankingPlayers}
                      challenges={visibleChallenges}
                      onPlayerClick={(clicked) => {
                        const membershipId =
                          (clicked as any)?.membershipId as string | undefined ||
                          ladderMembershipIdMap[clicked.id];
                        if (membershipId) {
                          navigate(`/team/${membershipId}`);
                          return;
                        }
                        setSelectedPlayer(clicked);
                      }}
                      currentUserId={currentUser?.id}
                      onChallenge={handleChallenge}
                      onViewMatch={handleViewMatch}
                      partnerName={partnerNameByPlayerId[player.id]}
                      teamAvatarUrl={isDoublesLadder ? ladderTeamAvatarMap[player.id] : null}
                      selectedLadderId={selectedLadderId}
                      currentRoundLabel={currentRoundLabel}
                      membershipIdByPlayerId={ladderMembershipIdMap}
                    />
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <Button
                    variant={showMyMatchesOnly ? "default" : "outline"}
                    onClick={() => setShowMyMatchesOnly((prev) => !prev)}
                    aria-pressed={showMyMatchesOnly}
                    className={showMyMatchesOnly ? "bg-green-600 text-white hover:bg-green-700" : ""}
                  >
                    {showMyMatchesOnly ? "Show all matches" : "Show my matches"}
                  </Button>
                </div>
                  <PendingMatches
                    challenges={
                    showMyMatchesOnly && currentUser
                      ? (() => {
                          const ids = new Set<string>();
                          ids.add(currentUser.id);
                          if (isDoublesLadder) {
                            const teamId = ladderPartnerMap[currentUser.id];
                            if (teamId) ids.add(teamId);
                          }
                          return visibleChallenges.filter(
                            (c) =>
                              (c.ladderId === selectedLadderId || !selectedLadderId) &&
                              (ids.has(c.challengerId) || ids.has(c.challengedId))
                          );
                        })()
                      : visibleChallenges.filter(
                          (c) => c.ladderId === selectedLadderId || !selectedLadderId
                        )
                  }
                  players={players}
                    onMatchResult={handleMatchResult}
                    currentUser={currentUser}
                    isDoublesLadder={isDoublesLadder}
                    partnerNameByPlayerId={partnerNameByPlayerId}
                    primaryByPlayerId={ladderPrimaryMap}
                    partnerIdByPlayerId={ladderPartnerMap}
                    rankByPlayerId={ladderRankMap}
                    membershipIdByPlayerId={ladderMembershipIdMap}
                    onScheduleMatch={handleSchedule}
                  />
              </>
            )}
          </CardContent>
        </Card>

        <RemovePlayerModal
          isOpen={showRemovePlayerModal}
          onClose={() => setShowRemovePlayerModal(false)}
          players={players}
          onRemovePlayer={removePlayer}
          rankByPlayerId={ladderRankMap}
        />

        <PlayerDetailsModal
          player={selectedPlayer}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          challenges={visibleChallenges}
          players={players}
          clubs={clubs}
          selectedLadderId={selectedLadderId}
          selectedLadderType={selectedLadder?.type as "singles" | "doubles" | undefined}
          ladderPlayerIds={Array.from(ladderPlayerIds)}
          partnerIdByPlayerId={ladderPartnerMap}
          rankByPlayerId={ladderRankMap}
        />
      </div>
    </div>
  );
}

