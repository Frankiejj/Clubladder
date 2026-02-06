
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, Calendar, Target, MessageCircle } from "lucide-react";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlayerDetailsModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  challenges: Challenge[];
  players: Player[];
  clubs: { id: string; name: string; city?: string }[];
  selectedLadderId?: string;
  selectedLadderType?: "singles" | "doubles";
}

export const PlayerDetailsModal = ({
  player,
  isOpen,
  onClose,
  challenges,
  players,
  clubs,
  selectedLadderId,
  selectedLadderType,
}: PlayerDetailsModalProps) => {
  if (!player) return null;

  type LadderMembershipRow = {
    id: string;
    player_id: string;
    partner_id: string | null;
    rank: number | null;
    updated_at?: string | null;
    created_at?: string | null;
  };

  const [ladderMembers, setLadderMembers] = useState<LadderMembershipRow[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [ladderRank, setLadderRank] = useState<number | null>(null);
  const [membershipId, setMembershipId] = useState<string | null>(null);

  useEffect(() => {
    const loadLadderMemberships = async () => {
      if (!selectedLadderId || !player?.id) {
        setLadderMembers([]);
        setPartnerId(null);
        setLadderRank(null);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,player_id,partner_id,rank,updated_at,created_at")
        .eq("ladder_id", selectedLadderId);

      if (error) {
        console.error("Error loading ladder memberships:", error);
        setLadderMembers([]);
        setPartnerId(null);
        setLadderRank(null);
        setMembershipId(null);
        return;
      }

      const rows = (data as LadderMembershipRow[] | null) || [];
      setLadderMembers(rows);

      const membership = rows.find(
        (row) => row.player_id === player.id || row.partner_id === player.id
      );
      if (membership) {
        const nextPartnerId =
          membership.player_id === player.id
            ? membership.partner_id ?? null
            : membership.player_id;
        setPartnerId(nextPartnerId);
        setLadderRank(
          Number.isFinite(membership.rank) ? Number(membership.rank) : null
        );
        setMembershipId(membership.id || null);
      } else {
        setPartnerId(null);
        setLadderRank(null);
        setMembershipId(null);
      }
    };

    loadLadderMemberships();
  }, [player?.id, selectedLadderId]);

  const teamDisplayName = useMemo(() => {
    if (!partnerId) return player.name;
    const partner = players.find((p) => p.id === partnerId);
    return partner ? `${player.name} & ${partner.name}` : player.name;
  }, [partnerId, player.name, players]);

  const ladderMemberIds = useMemo(() => {
    if (!selectedLadderId) return new Set<string>();
    const ids = new Set<string>();
    ladderMembers.forEach((row) => {
      if (row.player_id) ids.add(row.player_id);
      if (row.partner_id) ids.add(row.partner_id);
    });
    return ids;
  }, [ladderMembers, selectedLadderId]);

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

  const teamIds = useMemo(() => {
    const ids = new Set<string>([player.id]);
    if (partnerId) ids.add(partnerId);
    return ids;
  }, [player.id, partnerId]);

  // Get all completed matches for this player (no limit)
  const completedMatches = challenges
    .filter((c) => {
      const isTeamMatch =
        teamIds.has(c.challengerId) || teamIds.has(c.challengedId);
      return isTeamMatch && c.status === "completed";
    })
    .sort((a, b) => {
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return bDate - aDate; // most recent first
    });

  // Upcoming (pending/accepted) matches for this player
  const upcomingMatches = challenges
    .filter((c) => {
      const isSinglesView = selectedLadderType === "singles";
      const isTeamMatch =
        teamIds.has(c.challengerId) || teamIds.has(c.challengedId);
      const isPlayerMatch =
        c.challengerId === player.id || c.challengedId === player.id;

      const matchesScope = isSinglesView ? isPlayerMatch : isTeamMatch;
      if (!matchesScope) return false;

      if (selectedLadderId) {
        const inLadder =
          ladderMemberIds.has(c.challengerId) &&
          ladderMemberIds.has(c.challengedId);
        if (!inLadder) return false;
        if (isSinglesView) {
          if (ladderHasPartnerByPlayerId[c.challengerId]) return false;
          if (ladderHasPartnerByPlayerId[c.challengedId]) return false;
        } else {
          if (!ladderHasPartnerByPlayerId[c.challengerId]) return false;
          if (!ladderHasPartnerByPlayerId[c.challengedId]) return false;
        }
        return c.status === "pending" || c.status === "accepted";
      }
      return c.status === "pending" || c.status === "accepted";
    })
    .sort((a, b) => {
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate; // soonest first
    });

  type PositionEntry = { date: string; rank: number; change: "up" | "down" | "same" };
  const [positionHistory, setPositionHistory] = useState<PositionEntry[]>([]);

  useEffect(() => {
    const loadPositionHistory = async () => {
      if (!player?.id) {
        setPositionHistory([]);
        return;
      }

      let effectiveLadderId = selectedLadderId;
      if (!effectiveLadderId) {
        const { data: ladderRows } = await (supabase as any)
          .from("ladder_memberships")
          .select("ladder_id")
          .or(`player_id.eq.${player.id},partner_id.eq.${player.id}`)
          .limit(1);
        effectiveLadderId = (ladderRows as any[] | null)?.[0]?.ladder_id || null;
      }

      if (!effectiveLadderId) {
        setPositionHistory([]);
        return;
      }

      const historyFilters = [
        `player_id.eq.${player.id}`,
        `partner_id.eq.${player.id}`,
      ];
      if (partnerId) {
        historyFilters.push(`player_id.eq.${partnerId}`);
        historyFilters.push(`partner_id.eq.${partnerId}`);
      }

      const { data, error } = await (supabase as any)
        .from("ladder_rank_history")
        .select("round_label,rank,created_at")
        .eq("ladder_id", effectiveLadderId)
        .or(historyFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Position history load error", {
          error,
          selectedLadderId: effectiveLadderId,
          playerId: player.id,
          partnerId,
          membershipId,
        });
        const { data: fallback } = await (supabase as any)
          .from("ladder_memberships")
          .select("rank")
          .eq("player_id", player.id)
          .eq("ladder_id", effectiveLadderId)
          .limit(1);

        const rank = (fallback as any[] | null)?.[0]?.rank;
        if (Number.isFinite(rank)) {
          setPositionHistory([{ date: "Current", rank: Number(rank), change: "same" }]);
        } else {
          setPositionHistory([{ date: "Current", rank: player.rank, change: "same" }]);
        }
        return;
      }

      const rows = (data as any[] | null) || [];
      if (!rows.length) {
        console.log("No ladder_rank_history rows", {
          selectedLadderId: effectiveLadderId,
          playerId: player.id,
          partnerId,
          membershipId,
        });
      }
      if (!rows.length) {
        setPositionHistory([{ date: "Current", rank: player.rank, change: "same" }]);
        return;
      }

      const formatLabel = (label?: string | null) => {
        if (!label) return "Current";
        return label;
      };

      const mapped = rows.map((row, idx) => {
        const currentRank = Number(row.rank);
        const previousRank = idx + 1 < rows.length ? Number(rows[idx + 1]?.rank) : currentRank;
        let change: PositionEntry["change"] = "same";
        if (currentRank < previousRank) change = "up";
        if (currentRank > previousRank) change = "down";
        return {
          date: formatLabel(row.round_label),
          rank: currentRank,
          change,
        };
      });

      setPositionHistory(mapped);
    };

    loadPositionHistory();
  }, [player?.id, player?.rank, selectedLadderId, membershipId]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-600";
    if (rank === 2) return "text-gray-600";
    if (rank === 3) return "text-amber-600";
    return "text-green-600";
  };

  const clubNames = (player.clubs || []).map((clubId) => {
    const club = clubs.find((c) => c.id === clubId);
    if (!club) return clubId;
    return club.city ? `${club.name} (${club.city})` : club.name;
  });

  const positionHistoryLabel = useMemo(() => {
    if (!selectedLadderId) return "Position History";
    return "Position History (Current Ladder)";
  }, [selectedLadderId]);

  const whatsappNumber = player.phone
    ? player.phone.replace(/\D/g, "")
    : "";
  const partner = partnerId ? players.find((p) => p.id === partnerId) || null : null;
  const partnerWhatsappNumber = partner?.phone
    ? partner.phone.replace(/\D/g, "")
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            {teamDisplayName} - Player Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details and recent matches for {player.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Player Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${getRankColor(ladderRank ?? player.rank)}`}>
                  #{ladderRank ?? player.rank}
                </div>
                <div className="text-sm text-gray-600">Current Rank</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{completedMatches.length}</div>
                <div className="text-sm text-gray-600">Completed Matches</div>
              </CardContent>
            </Card>
          </div>

          {/* Player Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Player Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  {partner ? `${player.email}, ${partner.email}` : player.email}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Phone:</span>
                  <span>
                    {partner
                      ? `${player.phone || "-"} / ${partner.phone || "-"}`
                      : player.phone || "-"}
                  </span>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                      title={`Chat ${player.name} on WhatsApp`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                  {partnerWhatsappNumber && (
                    <a
                      href={`https://wa.me/${partnerWhatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                      title={`Chat ${partner?.name} on WhatsApp`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Clubs:</span>{" "}
                  {clubNames.length ? clubNames.join(", ") : "-"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Match History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedMatches.length > 0 ? (
                <div className="space-y-3">
                  {completedMatches.map((match) => {
                    const isDraw = !match.winnerId;
                    const isPlayerWinner = match.winnerId === player.id;
                    const opponentId = match.challengerId === player.id ? match.challengedId : match.challengerId;
                    const opponent = players.find((p) => p.id === opponentId);
                    const matchDate = match.scheduledDate
                      ? new Date(match.scheduledDate).toISOString().split("T")[0]
                      : "Recent";
                    const roundLabel = match.roundLabel ? match.roundLabel : "";
                    
                    return (
                      <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {isDraw ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Draw</Badge>
                          ) : isPlayerWinner ? (
                            <Badge className="bg-green-100 text-green-800">Win</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Loss</Badge>
                          )}
                          <span>
                            vs {opponent?.name || `Opponent #${opponentId}`} {roundLabel}
                          </span>
                          {match.score && (
                            <span className="text-sm text-gray-600">({match.score})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{matchDate}</div>
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

          {/* Upcoming Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMatches.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMatches.map((match) => {
                    const opponentId = match.challengerId === player.id ? match.challengedId : match.challengerId;
                    const opponent = players.find((p) => p.id === opponentId);
                    const matchDate = match.scheduledDate
                      ? new Date(match.scheduledDate).toISOString().split("T")[0]
                      : "TBD";

                    return (
                      <div key={match.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {match.status === 'pending' ? 'Pending' : 'Accepted'}
                          </Badge>
                          <span>vs {opponent?.name || `Opponent #${opponentId}`}</span>
                        </div>
                        <div className="text-sm text-gray-500">{matchDate}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No upcoming matches</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Position History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                {positionHistoryLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {positionHistory.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No position history available.</p>
                  </div>
                ) : (
                  positionHistory.map((position, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`text-lg font-bold ${getRankColor(position.rank)}`}>
                          #{position.rank}
                        </div>
                        <div className="flex items-center gap-1">
                          {position.change === "up" ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : position.change === "down" ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                          <span className="text-sm text-gray-600">
                            {position.change === "up"
                              ? "Moved up"
                              : position.change === "down"
                              ? "Moved down"
                              : "No change"}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">{position.date}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
