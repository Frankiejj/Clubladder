import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageCircle, Target, Trophy, ArrowLeft } from "lucide-react";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

type MembershipRow = {
  id: string;
  ladder_id: string;
  player_id: string;
  partner_id: string | null;
  rank: number | null;
};

type LadderRow = {
  id: string;
  name: string | null;
  type: "singles" | "doubles";
};

const TeamDetails = () => {
  const { membershipId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [ladder, setLadder] = useState<LadderRow | null>(null);
  const [ladderMembers, setLadderMembers] = useState<MembershipRow[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Challenge[]>([]);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [showMyMatchesOnly, setShowMyMatchesOnly] = useState(false);
  const [positionHistory, setPositionHistory] = useState<
    { label: string; rank: number; change: "up" | "down" | "same" }[]
  >([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email || null;
      setSessionEmail(email ? email.toLowerCase() : null);
    });
  }, []);

  useEffect(() => {
    const loadTeam = async () => {
      if (!membershipId) {
        setLoading(false);
        return;
      }

      const { data: membershipRow, error: membershipError } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,ladder_id,player_id,partner_id,rank")
        .eq("id", membershipId)
        .maybeSingle();

      if (membershipError || !membershipRow) {
        console.error("Team load error", membershipError);
        setLoading(false);
        return;
      }

      const { data: ladderRow, error: ladderError } = await (supabase as any)
        .from("ladders")
        .select("id,name,type")
        .eq("id", membershipRow.ladder_id)
        .maybeSingle();

      if (ladderError || !ladderRow) {
        console.error("Ladder load error", ladderError);
        setLoading(false);
        return;
      }

      const { data: ladderMemberships, error: ladderMembersError } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,ladder_id,player_id,partner_id,rank")
        .eq("ladder_id", membershipRow.ladder_id);

      if (ladderMembersError) {
        console.error("Ladder members load error", ladderMembersError);
        setLoading(false);
        return;
      }

      const memberRows = (ladderMemberships as MembershipRow[] | null) || [];
      const ids = new Set<string>();
      memberRows.forEach((row) => {
        if (row.player_id) ids.add(row.player_id);
        if (row.partner_id) ids.add(row.partner_id);
      });
      if (membershipRow.player_id) ids.add(membershipRow.player_id);
      if (membershipRow.partner_id) ids.add(membershipRow.partner_id);

      const { data: playerRows, error: playerError } = await (supabase as any)
        .from("players")
        .select(
          "id,name,email,is_admin,is_super_admin,clubs,created_at,phone,avatar_url"
        )
        .in("id", Array.from(ids));

      if (playerError) {
        console.error("Player load error", playerError);
        setLoading(false);
        return;
      }

      const teamIds = [membershipRow.player_id, membershipRow.partner_id].filter(Boolean) as string[];
      const orParts = teamIds.map((id) => `challenger_id.eq.${id}`).concat(
        teamIds.map((id) => `challenged_id.eq.${id}`)
      );

      const matchQuery = (supabase as any)
        .from("matches")
        .select(
          "id,ladder_id,round_label,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
        );

      const { data: matchRows, error: matchError } = teamIds.length
        ? await matchQuery.or(orParts.join(",")).order("created_at", { ascending: false })
        : { data: [], error: null };

      if (matchError) {
        console.error("Match load error", matchError);
        setLoading(false);
        return;
      }

      setMembership(membershipRow);
      setLadder(ladderRow);
      setLadderMembers(memberRows);
      setPlayers(
        (playerRows as any[]).map((row) => ({
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
      setMatches(
        (matchRows as any[]).map((row) => ({
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
        }))
      );
      const historyFilters = [
        `membership_id.eq.${membershipRow.id}`,
        `player_id.eq.${membershipRow.player_id}`,
      ];
      if (membershipRow.partner_id) {
        historyFilters.push(`partner_id.eq.${membershipRow.partner_id}`);
        historyFilters.push(`player_id.eq.${membershipRow.partner_id}`);
      }

      const { data: historyRows } = await (supabase as any)
        .from("ladder_rank_history")
        .select("round_label,rank,created_at")
        .eq("ladder_id", membershipRow.ladder_id)
        .or(historyFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(8);

      const history = (historyRows as any[] | null) || [];
      if (history.length) {
        const mapped = history.map((row, idx) => {
          const currentRank = Number(row.rank);
          const previousRank =
            idx + 1 < history.length ? Number(history[idx + 1]?.rank) : currentRank;
          let change: "up" | "down" | "same" = "same";
          if (currentRank < previousRank) change = "up";
          if (currentRank > previousRank) change = "down";
          return {
            label: row.round_label || "Current",
            rank: currentRank,
            change,
          };
        });
        setPositionHistory(mapped);
      } else {
        setPositionHistory([
          { label: "Current", rank: membershipRow.rank ?? 0, change: "same" },
        ]);
      }

      setLoading(false);
    };

    loadTeam();
  }, [membershipId]);

  const teamPlayers = useMemo(() => {
    if (!membership) return [];
    return players.filter(
      (p) => p.id === membership.player_id || p.id === membership.partner_id
    );
  }, [membership, players]);

  const teamIds = useMemo(() => {
    const ids = new Set<string>();
    teamPlayers.forEach((p) => ids.add(p.id));
    return ids;
  }, [teamPlayers]);

  const currentUserId = useMemo(() => {
    if (!sessionEmail) return null;
    return players.find((p) => p.email?.toLowerCase() === sessionEmail)?.id || null;
  }, [players, sessionEmail]);

  const ladderMemberIds = useMemo(() => {
    const ids = new Set<string>();
    ladderMembers.forEach((row) => {
      if (row.player_id) ids.add(row.player_id);
      if (row.partner_id) ids.add(row.partner_id);
    });
    return ids;
  }, [ladderMembers]);

  const ladderHasPartnerByPlayerId = useMemo(() => {
    const map: Record<string, boolean> = {};
    ladderMembers.forEach((row) => {
      if (row.player_id) {
        map[row.player_id] = Boolean(row.partner_id);
      }
      if (row.partner_id) {
        map[row.partner_id] = true;
      }
    });
    return map;
  }, [ladderMembers]);

  const teamName = useMemo(() => {
    if (teamPlayers.length === 2) {
      return `${teamPlayers[0].name} & ${teamPlayers[1].name}`;
    }
    if (teamPlayers.length === 1) return teamPlayers[0].name;
    return "Team";
  }, [teamPlayers]);

  const completedMatches = useMemo(() => {
    return matches
      .filter((m) => {
        const isTeamMatch =
          teamIds.has(m.challengerId) || teamIds.has(m.challengedId);
        if (!isTeamMatch) return false;
        if (showMyMatchesOnly && currentUserId) {
          if (m.challengerId !== currentUserId && m.challengedId !== currentUserId) {
            return false;
          }
        }
        const inLadder =
          ladderMemberIds.has(m.challengerId) &&
          ladderMemberIds.has(m.challengedId);
        if (!inLadder) return false;
        const challengerHasPartner = ladderHasPartnerByPlayerId[m.challengerId];
        const challengedHasPartner = ladderHasPartnerByPlayerId[m.challengedId];
        if (ladder?.type === "doubles") {
          if (!challengerHasPartner || !challengedHasPartner) return false;
        } else {
          if (challengerHasPartner || challengedHasPartner) return false;
        }
        return m.status === "completed";
      })
      .sort((a, b) => {
        const aDate = a.scheduledDate || a.updatedAt || a.createdAt;
        const bDate = b.scheduledDate || b.updatedAt || b.createdAt;
        const aTime = aDate ? new Date(aDate).getTime() : 0;
        const bTime = bDate ? new Date(bDate).getTime() : 0;
        return bTime - aTime;
      });
  }, [matches, teamIds, ladderMemberIds, ladderHasPartnerByPlayerId, ladder?.type, showMyMatchesOnly, currentUserId]);

  const upcomingMatches = useMemo(() => {
    return matches
      .filter((m) => {
        const isTeamMatch =
          teamIds.has(m.challengerId) || teamIds.has(m.challengedId);
        if (!isTeamMatch) return false;
        if (showMyMatchesOnly && currentUserId) {
          if (m.challengerId !== currentUserId && m.challengedId !== currentUserId) {
            return false;
          }
        }
        const inLadder =
          ladderMemberIds.has(m.challengerId) &&
          ladderMemberIds.has(m.challengedId);
        if (!inLadder) return false;
        const challengerHasPartner = ladderHasPartnerByPlayerId[m.challengerId];
        const challengedHasPartner = ladderHasPartnerByPlayerId[m.challengedId];
        if (ladder?.type === "doubles") {
          if (!challengerHasPartner || !challengedHasPartner) return false;
        } else {
          if (challengerHasPartner || challengedHasPartner) return false;
        }
        return m.status === "pending" || m.status === "accepted";
      })
      .sort((a, b) => {
        const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
  }, [matches, teamIds, ladderMemberIds, ladderHasPartnerByPlayerId, ladder?.type, showMyMatchesOnly, currentUserId]);

  const getOpponentName = (match: Challenge) => {
    const opponentId = teamIds.has(match.challengerId)
      ? match.challengedId
      : match.challengerId;
    const opponent = players.find((p) => p.id === opponentId);
    if (!opponent) return `Opponent #${opponentId}`;
    if (ladder?.type !== "doubles") return opponent.name;
    const membership = ladderMembers.find(
      (row) => row.player_id === opponentId || row.partner_id === opponentId
    );
    if (!membership || !membership.partner_id) return opponent.name;
    const partnerId =
      membership.player_id === opponentId ? membership.partner_id : membership.player_id;
    const partner = players.find((p) => p.id === partnerId);
    if (!partner) return opponent.name;
    if (membership.player_id === opponentId) {
      return `${opponent.name} & ${partner.name}`;
    }
    return `${partner.name} & ${opponent.name}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "TBD";
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return "TBD";
    return dt.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Loading team...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!membership || !ladder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Team not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">This team is unavailable.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate("/")}>Back to ladder</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [playerA, playerB] = teamPlayers;
  const whatsappA = playerA?.phone ? playerA.phone.replace(/\D/g, "") : "";
  const whatsappB = playerB?.phone ? playerB.phone.replace(/\D/g, "") : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button onClick={() => navigate(`/?ladderId=${membership.ladder_id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ladder
        </Button>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {teamName}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                #{membership.rank ?? "-"}
              </div>
              <div className="text-sm text-gray-600">Current Rank</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {completedMatches.length}
              </div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {(() => {
                  const wins = completedMatches.filter((match) =>
                    teamIds.has(match.winnerId || "")
                  ).length;
                  const total = completedMatches.length;
                  return total > 0 ? `${Math.round((wins / total) * 100)}%` : "0%";
                })()}
              </div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamPlayers.map((p) => {
                const whatsapp = p.phone ? p.phone.replace(/\D/g, "") : "";
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="font-semibold text-green-800">{p.name}</div>
                    <div>
                      <span className="font-semibold">Email:</span> {p.email || "-"}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">Phone:</span>
                      <span>{p.phone || "-"}</span>
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                          title={`Chat ${p.name} on WhatsApp`}
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Match History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedMatches.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {completedMatches.slice(0, 10).map((match) => {
                  const isDraw = !match.winnerId;
                  const isTeamWinner = teamIds.has(match.winnerId || "");
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isDraw ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Draw</Badge>
                        ) : isTeamWinner ? (
                          <Badge className="bg-green-100 text-green-800">Win</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Loss</Badge>
                        )}
                        <span>vs {getOpponentName(match)}</span>
                        {match.score && (
                          <span className="text-sm text-gray-600">({match.score})</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 text-right">
                        {match.roundLabel && (
                          <div className="text-xs text-gray-400">{match.roundLabel}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No completed matches yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {match.status === "pending" ? "Pending" : "Accepted"}
                      </Badge>
                      <span>vs {getOpponentName(match)}</span>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(match.scheduledDate)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No upcoming matches</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Position History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {positionHistory.length ? (
                positionHistory.slice(0, 10).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-green-600">
                        #{entry.rank}
                      </div>
                      <span className="text-sm text-gray-600">{entry.label}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.change === "up"
                        ? "Moved up"
                        : entry.change === "down"
                        ? "Moved down"
                        : "No change"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-green-600">
                      #{membership.rank ?? "-"}
                    </div>
                    <span className="text-sm text-gray-600">Current</span>
                  </div>
                  <div className="text-sm text-gray-500">Now</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDetails;
