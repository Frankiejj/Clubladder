
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Target, User, ArrowUp, ArrowDown } from "lucide-react";
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
}

export const PlayerCard = ({
  player,
  players,
  challenges,
  onChallenge,
  onViewMatch,
  onPlayerClick,
  currentUserId
}: PlayerCardProps) => {
  const hasActiveMatch = challenges.some(c => 
    (c.challengerId === player.id || c.challengedId === player.id) && c.status === 'pending'
  );

  // Predict rank movement based on current pending matches
  const calculatePredictedMovement = () => {
    const pending = challenges.filter(c =>
      (c.challengerId === player.id || c.challengedId === player.id) && c.status === 'pending'
    );
    if (pending.length === 0) return null;

    let potentialUp: number | null = null;
    let potentialDown: number | null = null;

    pending.forEach(match => {
      const opponentId = match.challengerId === player.id ? match.challengedId : match.challengerId;
      const opponent = players.find(p => p.id === opponentId);
      if (!opponent) return;

      // If opponent is ranked higher (lower number), winning could move up to their rank
      if (opponent.rank < player.rank) {
        potentialUp = potentialUp === null ? opponent.rank : Math.min(potentialUp, opponent.rank);
      }
      // If opponent is ranked lower (higher number), a loss could drop to their rank
      if (opponent.rank > player.rank) {
        potentialDown = potentialDown === null ? opponent.rank : Math.max(potentialDown, opponent.rank);
      }
    });

    if (potentialUp === null && potentialDown === null) return null;
    return { potentialUp, potentialDown };
  };

  const predictedMovement = calculatePredictedMovement();
  const potentialUp = predictedMovement?.potentialUp ?? null;
  const potentialDown = predictedMovement?.potentialDown ?? null;

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-500";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-400";
    if (rank === 3) return "bg-gradient-to-r from-amber-600 to-amber-700";
    return "bg-gradient-to-r from-green-500 to-green-600";
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
          <div className={`${getRankColor(player.rank)} rounded-full w-12 h-12 flex items-center justify-center shadow-lg`}>
            <div className="text-center">
              {getRankIcon(player.rank)}
              <div className="text-white font-semibold text-xs">#{player.rank}</div>
            </div>
          </div>
          {/* Optional quick up-move indicator for current user */}
          {potentialUp !== null && player.id === currentUserId && (
            <div className="absolute -right-2 -top-2 bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold shadow-md animate-bounce">
              ^{potentialUp}
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={player.avatarUrl || (player as any).avatar_url || undefined} alt={player.name} />
                <AvatarFallback className="bg-green-100 text-green-700">
                  {player.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">{player.name}</h3>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-3 gap-y-2 text-[11px] sm:text-xs text-gray-600">
            {(potentialUp !== null || potentialDown !== null) && (
              <div className="flex items-center gap-2">
                {potentialUp !== null && (
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span className="font-semibold">Win → #{potentialUp}</span>
                  </div>
                )}
                {potentialDown !== null && (
                  <div className="flex items-center gap-1 text-red-600">
                    <ArrowDown className="h-3.5 w-3.5" />
                    <span className="font-semibold">Loss → #{potentialDown}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};




