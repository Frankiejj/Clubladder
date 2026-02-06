import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { Link } from "react-router-dom";

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
  membershipIdByPlayerId?: Record<string, string>;
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
  membershipIdByPlayerId,
}: PlayerCardProps) => {
  const displayName = partnerName ? `${player.name} & ${partnerName}` : player.name;
  const avatarSrc = partnerName ? teamAvatarUrl || undefined : player.avatarUrl || (player as any).avatar_url || undefined;
  const playerRank = typeof player.rank === "number" ? player.rank : null;
  const membershipId =
    membershipIdByPlayerId?.[player.id] ??
    ((player as any)?.membershipId as string | undefined);
  const playerLink = membershipId ? `/team/${membershipId}` : null;

  const calculatePredictedRank = () => {
    if (playerRank === null) return null;
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
      if (typeof opponent.rank !== "number") return;

      if (match.winnerId === player.id) {
        wins += 1;
        if (opponent.rank < playerRank) {
          higherBeaten.push(opponent.rank);
        }
      } else {
        losses += 1;
        if (opponent.rank > playerRank) {
          lowerLost.push(opponent.rank);
        }
      }
    });

    const played = wins + losses;
    if (played === 0) return null;

    if (wins === played) {
      if (higherBeaten.length > 0) return Math.min(...higherBeaten);
      return playerRank;
    }

    if (losses === played) {
      if (lowerLost.length > 0) return Math.max(...lowerLost);
      return playerRank;
    }

    if (higherBeaten.length > 0 && lowerLost.length > 0) {
      const avgHigher = higherBeaten.reduce((a, b) => a + b, 0) / higherBeaten.length;
      const avgLower = lowerLost.reduce((a, b) => a + b, 0) / lowerLost.length;
      return Math.round((avgHigher + avgLower) / 2);
    }

    return playerRank;
  };

  const predictedRank = calculatePredictedRank();
  const predictedRankBadge =
    predictedRank && predictedRank !== playerRank ? (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-gray-600">
        {predictedRank < (playerRank ?? 0) ? (
          <ArrowUp className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-red-600" />
        )}
        #{predictedRank}
      </span>
    ) : null;

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-600";
    if (rank === 2) return "text-gray-500";
    if (rank === 3) return "text-amber-600";
    return "text-black";
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
      onClick={() => onPlayerClick?.(player)}
    >
      <div className="flex flex-row items-center p-2 sm:p-3">
        {/* Rank Badge */}
        <div className="relative mr-3 sm:mr-4 flex-shrink-0">
          <div className={`font-bold text-base ${getRankColor(playerRank ?? 0)}`}>
            #{playerRank ?? "-"}
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            {playerLink ? (
              <Link
                to={playerLink}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 sm:gap-3 hover:text-green-900"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {player.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">
                    {displayName}
                  </h3>
                  {predictedRankBadge}
                </div>
              </Link>
            ) : (
              <>
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {player.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">{displayName}</h3>
                  {predictedRankBadge}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
