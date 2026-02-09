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

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const formatLadderName = (name?: string | null, fallback?: string) => {
    if (!name) return fallback || "Ladder";
    return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
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
  const [ladders, setLadders] = useState<Array<{ id: string; name: string | null; type: string }>>([]);
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
    const { error } = await (supabase as any)
      .from("matches")
      .update({ scheduled_date: datetimeIso, status: "scheduled" })
      .eq("id", matchId);

    if (error) {
      console.error("Schedule failed", error);
      return;
    }

    setChallenges((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, scheduledDate: datetimeIso, status: "scheduled" } : m))
    );
  };

  // --------------------------
  // FIXED USER LOGIC (THE IMPORTANT PART!)
  // --------------------------
  const currentUser = players.find(
    (p) => p.email?.toLowerCase() === sessionUser?.email?.toLowerCase()
  );

  const userClubIds = currentUser?.clubs ?? [];
  const visiblePlayers =
    userClubIds.length > 0
      ? players.filter((p) =>
          (p.clubs ?? []).some((clubId) => userClubIds.includes(clubId))
        )
      : players;
  const clubLabel = (() => {
    if (!userClubIds.length) return "All clubs";
    const names = clubs
      .filter((c) => userClubIds.includes(c.id))
      .map((c) => c.name)
      .filter(Boolean);
    if (!names.length) return "Your clubs";
    return `${names.join(", ")}`;
  })();

  const selectedLadder = ladders.find((ladder) => ladder.id === selectedLadderId);
  const playerCount = selectedLadderId ? ladderPlayerIds.size : 0;
  const isDoublesLadder = selectedLadder?.type === "doubles";

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
        .filter((p) => ladderPlayerIds.has(p.id))
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
    const ladderMatches = challenges.filter((c) => c.ladderId === selectedLadderId && c.roundLabel);
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
  }, [challenges, selectedLadderId]);

  const currentRoundDates = useMemo(() => {
    if (!selectedLadderId || !currentRoundLabel) return null;
    const roundMatches = challenges.filter(
      (c) => c.ladderId === selectedLadderId && c.roundLabel === currentRoundLabel
    );
    if (!roundMatches.length) return null;
    const start = roundMatches.map((c) => c.roundStartDate).find((d) => !!d) || null;
    const end = roundMatches.map((c) => c.roundEndDate).find((d) => !!d) || null;
    if (!start && !end) return null;
    return { start, end };
  }, [challenges, selectedLadderId, currentRoundLabel]);

  const headerCurrentUser = currentUser || null;

  // Redirect super admins to the Super Admin page
  useEffect(() => {
    if (headerCurrentUser?.isSuperAdmin) {
      navigate("/super-admin");
    }
  }, [headerCurrentUser?.isSuperAdmin, navigate]);

  useEffect(() => {
    const loadUserLadders = async () => {
      if (!currentUser?.id) return;
      setLaddersLoading(true);
      const { data: playerMemberships, error: playerMembershipError } = await (supabase as any)
        .from("ladder_memberships")
        .select("ladder_id")
        .eq("player_id", currentUser.id);
      if (playerMembershipError) {
        console.error("Error loading ladder memberships:", playerMembershipError);
        setLadders([]);
        setSelectedLadderId("");
        setLaddersLoading(false);
        return;
      }

      const { data: partnerMemberships, error: partnerMembershipError } = await (supabase as any)
        .from("ladder_memberships")
        .select("ladder_id")
        .eq("partner_id", currentUser.id);
      if (partnerMembershipError) {
        console.error("Error loading partner ladder memberships:", partnerMembershipError);
        setLadders([]);
        setSelectedLadderId("");
        setLaddersLoading(false);
        return;
      }

      const ladderIds = Array.from(
        new Set(
          [...(playerMemberships as any[] | null), ...(partnerMemberships as any[] | null)]
            .map((m) => m?.ladder_id)
            .filter(Boolean)
        )
      );
      if (!ladderIds.length) {
        setLadders([]);
        setSelectedLadderId("");
        setLaddersLoading(false);
        return;
      }

      const { data: ladderRows, error: ladderError } = await (supabase as any)
        .from("ladders")
        .select("id,name,type")
        .in("id", ladderIds);

      if (ladderError) {
        console.error("Error loading ladders:", ladderError);
        setLadders([]);
        setSelectedLadderId("");
      } else {
        const safe = (ladderRows as any[]) || [];
        setLadders(safe);
        if (!selectedLadderId && safe.length) {
          const singles = safe.find((l) => l.type === "singles");
          setSelectedLadderId((singles || safe[0]).id);
        }
      }
      setLaddersLoading(false);
    };

    loadUserLadders();
  }, [currentUser?.id, selectedLadderId]);

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
    const loadLadderPlayers = async () => {
      if (!selectedLadderId) {
        setLadderPlayerIds(new Set());
        setLadderRankMap({});
        setLadderPartnerMap({});
        setLadderMembershipIdMap({});
        setLadderPrimaryMap({});
        setLadderTeamAvatarMap({});
        return;
      }
      setLadderPlayersLoading(true);
      const { data, error } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,player_id,rank,partner_id,team_avatar_url")
        .eq("ladder_id", selectedLadderId);
      if (error) {
        console.error("Error loading ladder players:", error);
        setLadderPlayerIds(new Set());
        setLadderRankMap({});
        setLadderPartnerMap({});
        setLadderMembershipIdMap({});
        setLadderPrimaryMap({});
        setLadderTeamAvatarMap({});
        setLadderPlayersLoading(false);
        return;
      }
      const rows = (data as any[] | null) || [];
      const ids = new Set<string>();
      const ranks: Record<string, number> = {};
      const partners: Record<string, string | null> = {};
      const membershipIds: Record<string, string> = {};
      const primaries: Record<string, string> = {};
      const teamAvatars: Record<string, string | null> = {};
      rows.forEach((row) => {
        const playerId = row?.player_id;
        const partnerId = row?.partner_id;
        if (playerId) {
          ids.add(playerId);
          if (Number.isFinite(row?.rank)) {
            ranks[playerId] = Number(row.rank);
          }
          if (row?.id) {
            membershipIds[playerId] = row.id;
          }
          primaries[playerId] = playerId;
          teamAvatars[playerId] = row?.team_avatar_url ?? null;
        }
        if (playerId) {
          partners[playerId] = partnerId ?? null;
        }
        if (partnerId) {
          partners[partnerId] = playerId ?? null;
          primaries[partnerId] = playerId ?? partnerId;
          teamAvatars[partnerId] = row?.team_avatar_url ?? null;
          if (row?.id) {
            membershipIds[partnerId] = row.id;
          }
        }
      });
      setLadderPlayerIds(ids);
      setLadderRankMap(ranks);
      setLadderPartnerMap(partners);
      setLadderMembershipIdMap(membershipIds);
      setLadderPrimaryMap(primaries);
      setLadderTeamAvatarMap(teamAvatars);
      setLadderPlayersLoading(false);
    };

    loadLadderPlayers();
  }, [selectedLadderId]);

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
      navigate("/", { replace: true });
      return;
    }
    navigate(`/?ladderId=${nextId}`, { replace: true });
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
                      No ladder memberships
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
                  {playerCount} Players
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
                  <p className="text-gray-600">Join a ladder to view rankings.</p>
                ) : rankingPlayers.length === 0 ? (
                  <p className="text-gray-600">No players found for this ladder.</p>
                ) : (
                  rankingPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      players={rankingPlayers}
                      challenges={challenges}
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
                          return challenges.filter(
                            (c) =>
                              (c.ladderId === selectedLadderId || !selectedLadderId) &&
                              (ids.has(c.challengerId) || ids.has(c.challengedId))
                          );
                        })()
                      : challenges.filter(
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
          challenges={challenges}
          players={players}
          clubs={clubs}
          selectedLadderId={selectedLadderId}
          selectedLadderType={selectedLadder?.type as "singles" | "doubles" | undefined}
        />
      </div>
    </div>
  );
}

