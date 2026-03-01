
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { PendingMatches } from "@/components/PendingMatches";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scheduleMatch } from "@/services/matchScheduling";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LadderOption = {
  id: string;
  name: string | null;
  type: string;
  club_id: string | null;
};

const MyMatches = () => {
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ladders, setLadders] = useState<LadderOption[]>([]);
  const [laddersLoading, setLaddersLoading] = useState(false);
  const [selectedLadderId, setSelectedLadderId] = useState<string>("");
  const [ladderMemberIds, setLadderMemberIds] = useState<Set<string>>(new Set());
  const [ladderPartnerMap, setLadderPartnerMap] = useState<Record<string, string | null>>({});
  const [ladderPrimaryMap, setLadderPrimaryMap] = useState<Record<string, string>>({});
  const [ladderRankMap, setLadderRankMap] = useState<Record<string, number>>({});
  const [ladderMembershipIdMap, setLadderMembershipIdMap] = useState<Record<string, string>>({});
  const currentUserClubIds = useMemo(
    () =>
      Array.isArray(currentUser?.clubs)
        ? currentUser.clubs.filter((clubId): clubId is string => Boolean(clubId))
        : [],
    [currentUser?.clubs]
  );

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

  // Fetch data from Supabase to ensure we only show public.matches
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        const sessionUser = sessionData.user;
        if (!sessionUser) throw new Error("No session");

        const { data: playersData, error: playersError } = await (supabase as any)
          .from("players")
          .select(
            "id,name,email,is_admin,is_super_admin,clubs,created_at,phone,avatar_url"
          );
        if (playersError) throw playersError;
        const mappedPlayers: Player[] = (playersData || []).map((row) => ({
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

    fetchData();
  }, [toast]);

  useEffect(() => {
    const loadUserLadders = async () => {
      if (!currentUser?.id || !currentUserClubIds.length) {
        setLadders([]);
        setSelectedLadderId("");
        return;
      }
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
        .select("id,name,type,club_id")
        .in("id", ladderIds)
        .in("club_id", currentUserClubIds);

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
  }, [currentUser?.id, currentUserClubIds, selectedLadderId]);

  useEffect(() => {
    const loadLadderMembers = async () => {
      if (!selectedLadderId) {
        setLadderMemberIds(new Set());
        setLadderPartnerMap({});
        setLadderPrimaryMap({});
        setLadderRankMap({});
        setLadderMembershipIdMap({});
        return;
      }
      const { data, error } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,player_id,partner_id,rank")
        .eq("ladder_id", selectedLadderId);
      if (error) {
        console.error("Error loading ladder players:", error);
        setLadderMemberIds(new Set());
        setLadderPartnerMap({});
        setLadderPrimaryMap({});
        setLadderRankMap({});
        setLadderMembershipIdMap({});
        return;
      }
      const rows = (data as any[] | null) || [];
      const ids = new Set<string>();
      const partners: Record<string, string | null> = {};
      const primaries: Record<string, string> = {};
      const ranks: Record<string, number> = {};
      const membershipIds: Record<string, string> = {};
      rows.forEach((row) => {
        const playerId = row?.player_id;
        const partnerId = row?.partner_id;
        const membershipId = row?.id;
        if (playerId) {
          ids.add(playerId);
          if (Number.isFinite(row?.rank)) {
            ranks[playerId] = Number(row.rank);
          }
          if (membershipId) {
            membershipIds[playerId] = membershipId;
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
          if (membershipId) {
            membershipIds[partnerId] = membershipId;
          }
        }
      });
      setLadderMemberIds(ids);
      setLadderPartnerMap(partners);
      setLadderPrimaryMap(primaries);
      setLadderRankMap(ranks);
      setLadderMembershipIdMap(membershipIds);
    };

    loadLadderMembers();
  }, [selectedLadderId]);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not schedule match";
      toast({
        title: isReschedule ? "Reschedule failed" : "Schedule failed",
        description: message,
        variant: "destructive",
      });
      return;
    }
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

  const allowedLadderIds = useMemo(() => new Set(ladders.map((ladder) => ladder.id)), [ladders]);

  const filteredMatches = useMemo(() => {
    if (!currentUser) return [];
    return challenges.filter((c) => {
      if (!c.ladderId || !allowedLadderIds.has(c.ladderId)) {
        return false;
      }
      if (!matchIds.has(c.challengerId) && !matchIds.has(c.challengedId)) {
        return false;
      }
      if (selectedLadderId) {
        if (c.ladderId !== selectedLadderId) return false;
        return ladderMemberIds.has(c.challengerId) && ladderMemberIds.has(c.challengedId);
      }
      return true;
    });
  }, [challenges, currentUser, matchIds, selectedLadderId, ladderMemberIds, allowedLadderIds]);

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
          <Link to="/app">
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
              membershipIdByPlayerId={ladderMembershipIdMap}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyMatches;
