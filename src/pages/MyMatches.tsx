
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { PendingMatches } from "@/components/PendingMatches";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MyMatches = () => {
  const location = useLocation();
  const state = location.state as { currentUser: Player; challenges: Challenge[]; players: Player[] } | null;
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<Player | null>(state?.currentUser ?? null);
  const [players, setPlayers] = useState<Player[]>(state?.players ?? []);
  const [challenges, setChallenges] = useState<Challenge[]>(state?.challenges ?? []);
  const [isLoading, setIsLoading] = useState(!state);
  const [ladders, setLadders] = useState<Array<{ id: string; name: string | null; type: string }>>([]);
  const [laddersLoading, setLaddersLoading] = useState(false);
  const [selectedLadderId, setSelectedLadderId] = useState<string>("");
  const [ladderMemberIds, setLadderMemberIds] = useState<Set<string>>(new Set());
  const [ladderPartnerMap, setLadderPartnerMap] = useState<Record<string, string | null>>({});
  const [ladderPrimaryMap, setLadderPrimaryMap] = useState<Record<string, string>>({});
  const [ladderRankMap, setLadderRankMap] = useState<Record<string, number>>({});

  const formatLadderName = (name?: string | null, fallback?: string) => {
    if (!name) return fallback || "Ladder";
    return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
  };

  // Fetch data if we didn't get it via navigation state
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        const sessionUser = sessionData.user;
        if (!sessionUser) throw new Error("No session");

        const { data: playersData, error: playersError } = await (supabase as any)
          .from("players")
          .select(
            "id,name,email,gender,rank,wins,losses,singles_match_frequency,is_admin,is_super_admin,clubs,created_at,phone,avatar_url"
          );
        if (playersError) throw playersError;
        const mappedPlayers: Player[] = (playersData || []).map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          gender: row.gender,
          rank: row.rank,
          wins: row.wins ?? 0,
          losses: row.losses ?? 0,
          matchFrequency: row.singles_match_frequency ?? null,
          singlesMatchFrequency: row.singles_match_frequency ?? null,
          doublesMatchFrequency: null,
          isAdmin: row.is_admin ?? false,
          isSuperAdmin: (row as any).is_super_admin ?? false,
          clubs: row.clubs ?? null,
          createdAt: row.created_at,
          phone: row.phone ?? null,
          avatarUrl: row.avatar_url ?? null,
          avatar_url: row.avatar_url ?? null,
        }));

        const me = mappedPlayers.find(
          (p) => p.email?.toLowerCase() === sessionUser.email?.toLowerCase()
        );
        if (!me) throw new Error("Player not found for current user");

        const { data: matchesData, error: matchesError } = await (supabase as any)
          .from("matches")
          .select(
            "id,ladder_id,round_label,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
          )
          .order("created_at", { ascending: false });
        if (matchesError) throw matchesError;
        const mappedMatches: Challenge[] = (matchesData || []).map((row) => ({
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
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        setPlayers(mappedPlayers);
        setCurrentUser(me);
        setChallenges(mappedMatches);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Could not load matches.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!state) {
      fetchData();
    }
  }, [state, toast]);

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
    const loadLadderMembers = async () => {
      if (!selectedLadderId) {
        setLadderMemberIds(new Set());
        setLadderPartnerMap({});
        setLadderPrimaryMap({});
        setLadderRankMap({});
        return;
      }
      const { data, error } = await (supabase as any)
        .from("ladder_memberships")
        .select("player_id,partner_id,rank")
        .eq("ladder_id", selectedLadderId);
      if (error) {
        console.error("Error loading ladder players:", error);
        setLadderMemberIds(new Set());
        setLadderPartnerMap({});
        setLadderPrimaryMap({});
        setLadderRankMap({});
        return;
      }
      const rows = (data as any[] | null) || [];
      const ids = new Set<string>();
      const partners: Record<string, string | null> = {};
      const primaries: Record<string, string> = {};
      const ranks: Record<string, number> = {};
      rows.forEach((row) => {
        const playerId = row?.player_id;
        const partnerId = row?.partner_id;
        if (playerId) {
          ids.add(playerId);
          if (Number.isFinite(row?.rank)) {
            ranks[playerId] = Number(row.rank);
          }
        }
        if (partnerId) ids.add(partnerId);
        if (playerId) {
          partners[playerId] = partnerId ?? null;
          primaries[playerId] = playerId;
        }
        if (partnerId) {
          partners[partnerId] = playerId ?? null;
          primaries[partnerId] = playerId ?? partnerId;
          if (Number.isFinite(row?.rank) && ranks[partnerId] === undefined) {
            ranks[partnerId] = Number(row.rank);
          }
        }
      });
      setLadderMemberIds(ids);
      setLadderPartnerMap(partners);
      setLadderPrimaryMap(primaries);
      setLadderRankMap(ranks);
    };

    loadLadderMembers();
  }, [selectedLadderId]);

  const handleSchedule = async (matchId: string, datetimeIso: string) => {
    const { error } = await (supabase as any)
      .from("matches")
      .update({ scheduled_date: datetimeIso, status: "scheduled" })
      .eq("id", matchId);

    if (error) {
      toast({
        title: "Schedule failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setChallenges((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, scheduledDate: datetimeIso, status: "scheduled" } : m))
    );

    toast({
      title: "Match scheduled",
      description: `Date set to ${datetimeIso}`,
    });
  };

  const handleMatchResult = async (
    challengeId: string,
    winnerId: string | null,
    score1?: number,
    score2?: number
  ) => {
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

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setChallenges((prev) =>
      prev.map((m) =>
        m.id === challengeId
          ? {
              ...m,
              winnerId,
              player1Score: score1 ?? null,
              player2Score: score2 ?? null,
              score: scoreString,
              status: "completed",
              scheduledDate: m.scheduledDate ?? completionDate.toISOString(),
            }
          : m
      )
    );

    toast({
      title: "Match completed",
      description: scoreString ? `Score: ${scoreString}` : undefined,
    });
  };

  const selectedLadder = ladders.find((ladder) => ladder.id === selectedLadderId);
  const isDoublesLadder = selectedLadder?.type === "doubles";

  const partnerNameByPlayerId = useMemo(() => {
    if (!isDoublesLadder) return {};
    const playerNameById = players.reduce<Record<string, string>>((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
    return Object.entries(ladderPartnerMap).reduce<Record<string, string>>((acc, [playerId, partnerId]) => {
      if (partnerId && playerNameById[partnerId]) {
        acc[playerId] = playerNameById[partnerId];
      }
      return acc;
    }, {});
  }, [isDoublesLadder, ladderPartnerMap, players]);

  const matchIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const ids = new Set<string>([currentUser.id]);
    if (isDoublesLadder) {
      const teammateId = ladderPartnerMap[currentUser.id];
      if (teammateId) ids.add(teammateId);
    }
    return ids;
  }, [currentUser, isDoublesLadder, ladderPartnerMap]);

  const filteredMatches = useMemo(() => {
    if (!currentUser) return [];
    return challenges.filter((c) => {
      if (!matchIds.has(c.challengerId) && !matchIds.has(c.challengedId)) {
        return false;
      }
      if (selectedLadderId) {
        return ladderMemberIds.has(c.challengerId) && ladderMemberIds.has(c.challengedId);
      }
      return true;
    });
  }, [challenges, currentUser, matchIds, selectedLadderId, ladderMemberIds]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Loading your matches...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-2 sm:px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link to="/">
            <Button className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800">My Matches</h1>
          <p className="text-md sm:text-lg text-green-600">Manage your upcoming matches and schedule</p>
        </div>

        {/* Matches only; calendar appears inside schedule toggle in PendingMatches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Matches
            </CardTitle>
            <div className="mt-3 max-w-md">
              <Select
                value={selectedLadderId || "none"}
                onValueChange={(value) => setSelectedLadderId(value === "none" ? "" : value)}
                disabled={laddersLoading || ladders.length === 0}
              >
                <SelectTrigger className="w-full border-2 border-green-400 bg-white shadow-md text-green-900 text-base font-semibold focus:ring-2 focus:ring-green-500">
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
            </div>
          </CardHeader>
          <CardContent>
            <PendingMatches 
              challenges={filteredMatches} 
              players={players} 
              onMatchResult={handleMatchResult}
              currentUser={currentUser}
              onScheduleMatch={handleSchedule}
              isDoublesLadder={isDoublesLadder}
              partnerNameByPlayerId={partnerNameByPlayerId}
              primaryByPlayerId={ladderPrimaryMap}
              partnerIdByPlayerId={ladderPartnerMap}
              rankByPlayerId={ladderRankMap}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyMatches;
