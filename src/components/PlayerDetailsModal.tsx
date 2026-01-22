
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, Calendar, Target, MessageCircle } from "lucide-react";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

interface PlayerDetailsModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  challenges: Challenge[];
  players: Player[];
  clubs: { id: string; name: string; city?: string }[];
}

export const PlayerDetailsModal = ({
  player,
  isOpen,
  onClose,
  challenges,
  players,
  clubs,
}: PlayerDetailsModalProps) => {
  if (!player) return null;

  const winRate = player.wins + player.losses > 0 
    ? Math.round((player.wins / (player.wins + player.losses)) * 100) 
    : 0;

  // Get all completed matches for this player (no limit)
  const completedMatches = challenges
    .filter(c => 
      (c.challengerId === player.id || c.challengedId === player.id) && c.status === 'completed'
    )
    .sort((a, b) => {
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return bDate - aDate; // most recent first
    });

  // Upcoming (pending/accepted) matches for this player
  const upcomingMatches = challenges
    .filter(c =>
      (c.challengerId === player.id || c.challengedId === player.id) &&
      (c.status === 'pending' || c.status === 'accepted')
    )
    .sort((a, b) => {
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate; // soonest first
    });

  // Mock position history data - in a real app this would come from a database
  const positionHistory = [
    { date: "2024-01-15", rank: 8, change: "+" },
    { date: "2024-01-22", rank: 6, change: "+" },
    { date: "2024-02-05", rank: 5, change: "+" },
    { date: "2024-02-18", rank: 4, change: "+" },
    { date: "2024-03-02", rank: player.rank, change: player.rank < 4 ? "+" : "-" },
  ].slice(-5); // Show last 5 position changes

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

  const matchesPerMonth =
    typeof player.matchFrequency === "number" ? player.matchFrequency : 0;

  const whatsappNumber = player.phone
    ? player.phone.replace(/\D/g, "")
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            {player.name} - Player Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details and recent matches for {player.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Player Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${getRankColor(player.rank)}`}>#{player.rank}</div>
                <div className="text-sm text-gray-600">Current Rank</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{winRate}%</div>
                <div className="text-sm text-gray-600">Win Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{player.wins + player.losses}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
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
                  <span className="font-semibold">Email:</span> {player.email}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Phone:</span>
                  <span>{player.phone || "-"}</span>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Match Frequency:</span>{" "}
                  {matchesPerMonth} per month
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
                          <span>vs {opponent?.name || `Opponent #${opponentId}`}</span>
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
                Position History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {positionHistory.map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${getRankColor(position.rank)}`}>
                        #{position.rank}
                      </div>
                      <div className="flex items-center gap-1">
                        {position.change === "+" ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-600">
                          {position.change === "+" ? "Moved up" : "Moved down"}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{position.date}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
