import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Target, ArrowUp, ArrowDown } from "lucide-react";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

interface PlayerCardProps {
  player: Player;
  players: Player[];
  challenges: Challenge[];
  onChallenge: (challengerId: string, challengedId: string) => void;
  onViewMatch: (challengeId: string) => void;
  onPlayerClick?: (player: Player) => void;
  currentUserId?: string;
  partnerName?: string;
  teamAvatarUrl?: string | null;
  selectedLadderId?: string;
  currentRoundLabel?: string | null;
}

export const PlayerCard = ({
  player,
  players,
  challenges,
  onChallenge,
  onViewMatch,
  onPlayerClick,
  currentUserId,
  partnerName,
  teamAvatarUrl,
  selectedLadderId,
  currentRoundLabel,
}: PlayerCardProps) => {
  const displayName = partnerName ? `${player.name} & ${partnerName}` : player.name;
  const avatarSrc = partnerName ? teamAvatarUrl || undefined : player.avatarUrl || (player as any).avatar_url || undefined;

  const calculatePredictedRank = () => {
    if (!selectedLadderId || !currentRoundLabel) return null;
    const roundMatches = challenges.filter((c) =>
      c.ladderId === selectedLadderId &&
      c.roundLabel === currentRoundLabel &&
      c.status === "completed" &&
      (c.challengerId === player.id || c.challengedId === player.id)
    );
    if (roundMatches.length === 0) return null;

    let wins = 0;
    let losses = 0;
    const higherBeaten: number[] = [];
    const lowerLost: number[] = [];

    roundMatches.forEach((match) => {
      if (!match.winnerId) return;
      const opponentId = match.challengerId === player.id ? match.challengedId : match.challengerId;
      const opponent = players.find((p) => p.id === opponentId);
      if (!opponent) return;

      if (match.winnerId === player.id) {
        wins += 1;
        if (opponent.rank < player.rank) {
          higherBeaten.push(opponent.rank);
        }
      } else {
        losses += 1;
        if (opponent.rank > player.rank) {
          lowerLost.push(opponent.rank);
        }
      }
    });

    const played = wins + losses;
    if (played === 0) return null;

    if (wins === played) {
      if (higherBeaten.length > 0) return Math.min(...higherBeaten);
      return player.rank;
    }

    if (losses === played) {
      if (lowerLost.length > 0) return Math.max(...lowerLost);
      return player.rank;
    }

    if (higherBeaten.length > 0 && lowerLost.length > 0) {
      const avgHigher = higherBeaten.reduce((a, b) => a + b, 0) / higherBeaten.length;
      const avgLower = lowerLost.reduce((a, b) => a + b, 0) / lowerLost.length;
      return Math.round((avgHigher + avgLower) / 2);
    }

    return player.rank;
  };

  const predictedRank = calculatePredictedRank();

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500";
    if (rank === 2) return "bg-gray-500";
    if (rank === 3) return "bg-amber-600";
    return "bg-green-600";
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) return <Trophy className="h-6 w-6 text-white" />;
    return <Target className="h-6 w-6 text-white" />;
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
      onClick={() => onPlayerClick?.(player)}
    >
      <div className="flex flex-col sm:flex-row items-center p-3 sm:p-4">
        {/* Rank Badge */}
        <div className="relative mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
          <div className={`${getRankColor(player.rank)} rounded-full w-12 h-12 flex items-center justify-center shadow-md`}>
            <div className="text-center">
              {getRankIcon(player.rank)}
              <div className="text-white font-bold text-sm">#{player.rank}</div>
            </div>
          </div>
          {/* Optional quick next-rank indicator for current user */}
          {predictedRank && predictedRank !== player.rank && player.id === currentUserId && (
            <div className="absolute -right-2 -top-2 bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold shadow-md animate-bounce">
              #{predictedRank}
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="bg-green-100 text-green-700">
                  {player.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">{displayName}</h3>
            </div>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-2 text-[11px] sm:text-xs text-gray-600">
            {predictedRank && predictedRank !== player.rank && (
              <div className="flex items-center gap-1">
                {predictedRank < player.rank ? (
                  <ArrowUp className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-red-600" />
                )}
                <span className="font-semibold">#{predictedRank}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
