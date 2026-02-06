
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Swords, Trophy, CheckCircle, Calendar as CalendarIcon, MessageCircle } from "lucide-react";
import { Challenge } from "@/types/Challenge";
import { Player } from "@/types/Player";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PendingMatchesProps {
  challenges: Challenge[];
  players: Player[];
  onMatchResult?: (challengeId: string, winnerId: string | null, score1?: number, score2?: number) => void;
  onScheduleMatch?: (challengeId: string, datetimeIso: string) => void;
  currentUser?: Player;
  isDoublesLadder?: boolean;
  partnerNameByPlayerId?: Record<string, string>;
  primaryByPlayerId?: Record<string, string>;
  partnerIdByPlayerId?: Record<string, string | null>;
  rankByPlayerId?: Record<string, number>;
}

export const PendingMatches = ({ 
  challenges, 
  players, 
  onMatchResult,
  onScheduleMatch,
  currentUser,
  isDoublesLadder,
  partnerNameByPlayerId,
  primaryByPlayerId,
  partnerIdByPlayerId,
  rankByPlayerId
}: PendingMatchesProps) => {
  const { toast } = useToast();
  const [scores, setScores] = useState<{ [key: string]: { player1: string, player2: string } }>({});
  const [scheduleValues, setScheduleValues] = useState<{ [key: string]: string }>({});
  const [openScheduler, setOpenScheduler] = useState<{ [key: string]: boolean }>({});
  const [editingScores, setEditingScores] = useState<{ [key: string]: boolean }>({});

  const isSameMonth = (dateString?: string | null) => {
    if (!dateString) return false;
    const dt = new Date(dateString);
    const now = new Date();
    return dt.getUTCFullYear() === now.getUTCFullYear() && dt.getUTCMonth() === now.getUTCMonth();
  };
  
  const filteredChallenges = challenges;

  const pendingChallenges = filteredChallenges
    .filter(c => c.status === 'pending' || c.status === 'scheduled' || c.status === 'accepted')
    .sort((a, b) => {
      const weight = (status: Challenge["status"]) =>
        status === "scheduled" ? 0 : status === "accepted" ? 1 : 2;
      const diff = weight(a.status) - weight(b.status);
      if (diff !== 0) return diff;
      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
  const completedChallenges = filteredChallenges.filter(c => c.status === 'completed');

  const formatLocalDateTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const dt = new Date(dateString);
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isMatchParticipant = (challenge: Challenge) => {
    if (!currentUser) return false;
    if (currentUser.id === challenge.challengerId || currentUser.id === challenge.challengedId) {
      return true;
    }
    const challengerPartner = partnerIdByPlayerId?.[challenge.challengerId];
    const challengedPartner = partnerIdByPlayerId?.[challenge.challengedId];
    return currentUser.id === challengerPartner || currentUser.id === challengedPartner;
  };

  const handleScoreSubmit = (challenge: Challenge) => {
    const isParticipant = isMatchParticipant(challenge);

    if (!isParticipant) {
      toast({
        title: "Not allowed",
        description: "Only players involved in the match can update the score.",
        variant: "destructive",
      });
      return;
    }

    const score = scores[challenge.id];
    const score1 = Number(score?.player1);
    const score2 = Number(score?.player2);

    // Only show an error when the provided values aren't valid integers
    if (
      !Number.isInteger(score1) ||
      !Number.isInteger(score2) ||
      score1 < 0 ||
      score2 < 0
    ) {
      toast({
        title: "Invalid score",
        description: "Scores must be whole, non-negative numbers",
        variant: "destructive"
      });
      return;
    }

    const winnerId =
      score1 === score2
        ? null
        : score1 > score2
        ? challenge.challengerId
        : challenge.challengedId;
    
    // Automatically call onMatchResult which will move the match to completed
    onMatchResult?.(challenge.id, winnerId, score1, score2);
    
    setScores(prev => ({ ...prev, [challenge.id]: { player1: "", player2: "" } }));
    
    toast({
      title: "Match Completed!",
      description: "The match has been moved to completed matches with updated rankings",
    });
  };

  const getDisplayName = (player?: Player | null) => {
    if (!player) return "Player";
    const partnerName = isDoublesLadder ? partnerNameByPlayerId?.[player.id] : undefined;
    if (!partnerName) return player.name;
    const primaryId = primaryByPlayerId?.[player.id] || player.id;
    if (primaryId === player.id) {
      return `${player.name} & ${partnerName}`;
    }
    return `${partnerName} & ${player.name}`;
  };

  const getExpectedPosition = (challenge: Challenge, winnerId: string) => {
    const challenger = players.find(p => p.id === challenge.challengerId);
    const challenged = players.find(p => p.id === challenge.challengedId);
    
    if (!challenger || !challenged) return "";

    const challengerName = getDisplayName(challenger);
    const challengedName = getDisplayName(challenged);
    const challengerRank = rankByPlayerId?.[challenger.id] ?? challenger.rank ?? 0;
    const challengedRank = rankByPlayerId?.[challenged.id] ?? challenged.rank ?? 0;

    if (winnerId === challenge.challengerId && challengerRank > challengedRank) {
      return `${challengerName} moves to rank #${challengedRank}`;
    } else if (winnerId === challenge.challengedId) {
      return `${challengedName} defends rank #${challengedRank}`;
    }
    return "No rank change";
  };

  const renderMatch = (challenge: Challenge) => {
    const challenger = players.find(p => p.id === challenge.challengerId);
    const challenged = players.find(p => p.id === challenge.challengedId);
    
    if (!challenger || !challenged) return null;

    const challengerPhone = challenger.phone ? challenger.phone.replace(/\D/g, "") : "";
    const challengedPhone = challenged.phone ? challenged.phone.replace(/\D/g, "") : "";
    const challengerRank = rankByPlayerId?.[challenger.id] ?? challenger.rank ?? 0;
    const challengedRank = rankByPlayerId?.[challenged.id] ?? challenged.rank ?? 0;

    const opponent = currentUser
      ? currentUser.id === challenge.challengerId
        ? challenged
        : challenger
      : null;

    const isCompleted = challenge.status === 'completed';
    const winner = challenge.winnerId ? players.find(p => p.id === challenge.winnerId) : null;
    const lastUpdated = challenge.updatedAt || challenge.scheduledDate || challenge.createdAt || null;
    const isScoreEditableThisMonth = isCompleted && isSameMonth(lastUpdated);
    const isParticipant = isMatchParticipant(challenge);
    const canEnterScore = isParticipant && (!isCompleted || isScoreEditableThisMonth);
    const isEditing = !!editingScores[challenge.id];

    return (
      <div
        key={challenge.id}
        className={`p-4 ${
          isCompleted ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
        } rounded-lg border space-y-4`}
      >
        <div className="grid grid-cols-3 items-start gap-4">
          <div className="text-center">
            <div className="font-semibold text-green-800 flex items-center justify-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={challenger.avatarUrl || (challenger as any).avatar_url || undefined} alt={getDisplayName(challenger)} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {challenger.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span>{getDisplayName(challenger)}</span>
                {challengerPhone && (
                  <button
                    className="text-green-700 hover:text-green-800"
                    onClick={() => {
                      const msg = `Hi ${challenger.name}, let's schedule our ladder match: ${getDisplayName(challenger)} vs ${getDisplayName(challenged)}.`;
                      window.open(`https://wa.me/${challengerPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    aria-label={`Chat ${challenger.name} on WhatsApp`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Rank #{challengerRank}</div>
          </div>

          <div className="flex flex-col items-center justify-start text-center gap-2">
            <Swords className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-xs font-medium text-green-700 leading-none">VS</span>
            {isCompleted && challenge.score && (
              <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                {challenge.score}
              </span>
            )}
            {!isCompleted && (
              <div className="flex flex-col items-center gap-1 text-xs text-gray-600">
                <Badge
                  className={
                    challenge.status === "scheduled"
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-yellow-50 text-yellow-700 border-yellow-300"
                  }
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {challenge.status === 'scheduled'
                    ? 'Scheduled'
                    : challenge.status === 'accepted'
                    ? 'Accepted'
                    : 'Pending'}
                </Badge>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-gray-500" />
                  <span>
                    {challenge.scheduledDate
                      ? formatLocalDateTime(challenge.scheduledDate)
                      : "Not scheduled"}
                  </span>
                </div>
              </div>
            )}
            {isCompleted && (
              <div className="text-xs text-gray-600">
                {winner ? (
                  <>
                    <p className="font-semibold">Winner: {getDisplayName(winner)}</p>
                    <p className="text-blue-600">{getExpectedPosition(challenge, winner.id)}</p>
                  </>
                ) : (
                  <p className="font-semibold text-blue-600">Result: Draw</p>
                )}
              </div>
            )}
            {isCompleted && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {isCompleted && isScoreEditableThisMonth && canEnterScore && (
              <Button
                className="w-32 justify-center bg-green-600 text-white hover:bg-green-700 border border-green-700"
                size="sm"
                onClick={() =>
                  setEditingScores((prev) => ({
                    ...prev,
                    [challenge.id]: !prev[challenge.id],
                  }))
                }
              >
                {isEditing ? "Cancel edit" : "Edit score"}
              </Button>
            )}
          </div>

          <div className="text-center">
            <div className="font-semibold text-green-800 flex items-center justify-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={challenged.avatarUrl || (challenged as any).avatar_url || undefined} alt={getDisplayName(challenged)} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {challenged.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span>{getDisplayName(challenged)}</span>
                {challengedPhone && (
                  <button
                    className="text-green-700 hover:text-green-800"
                    onClick={() => {
                      const msg = `Hi ${challenged.name}, let's schedule our ladder match: ${getDisplayName(challenger)} vs ${getDisplayName(challenged)}.`;
                      window.open(`https://wa.me/${challengedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    aria-label={`Chat ${challenged.name} on WhatsApp`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Rank #{challengedRank}</div>
          </div>
          
          <div className="flex flex-col items-end gap-2 text-right">
            {isCompleted ? null : null}
          </div>
        </div>

        {!isCompleted && onScheduleMatch && isMatchParticipant(challenge) && (
          <div className="border-t pt-4 bg-white p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
              <CalendarIcon className="h-4 w-4" />
              <span>{challenge.status === "scheduled" ? "Reschedule this match" : "Schedule this match"}</span>
            </div>
            {!openScheduler[challenge.id] ? (
              <Button
                variant="outline"
                onClick={() => setOpenScheduler((prev) => ({ ...prev, [challenge.id]: true }))}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {challenge.status === "scheduled" ? "Reschedule" : "Schedule match"}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Input
                  type="datetime-local"
                  value={scheduleValues[challenge.id] || ""}
                  onChange={(e) =>
                    setScheduleValues((prev) => ({
                      ...prev,
                      [challenge.id]: e.target.value,
                    }))
                  }
                  className="w-full sm:w-64 text-xs sm:text-sm"
                />
                <Button
                  variant="outline"
                  disabled={!scheduleValues[challenge.id]}
                  onClick={() => {
                    const dt = scheduleValues[challenge.id];
                    if (!dt) return;
                    const rounded = new Date(dt);
                    rounded.setSeconds(0, 0); // round to minute
                    // Keep local time (avoid UTC shift) by removing timezone offset
                    const adjusted = new Date(
                      rounded.getTime() - rounded.getTimezoneOffset() * 60000
                    );
                    const localIsoMinute = adjusted.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
                    onScheduleMatch(challenge.id, localIsoMinute);
                  }}
                  className="text-xs sm:text-sm"
                >
                  Set date
                </Button>
                {challenge.scheduledDate && (
                  <span className="text-xs sm:text-sm text-gray-600">
                    Current: {formatLocalDateTime(challenge.scheduledDate)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {canEnterScore && (!isCompleted || isEditing) && (
          <div className="border-t pt-4 bg-white p-4 rounded-lg">
            <h4 className="font-medium text-sm sm:text-base mb-3">
              {isCompleted ? "Edit Match Result" : "Enter Match Result"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div>
                <Label
                  htmlFor={`score1-${challenge.id}`}
                  className="text-xs sm:text-sm leading-tight break-words"
                >
                  {getDisplayName(challenger)} Score
                </Label>
                <Input
                  id={`score1-${challenge.id}`}
                  type="number"
                  min="0"
                  value={scores[challenge.id]?.player1 || ""}
                  onChange={(e) => {
                    setScores(prev => ({ 
                      ...prev, 
                      [challenge.id]: { 
                        ...prev[challenge.id],
                        player1: e.target.value 
                      }
                    }));
                    
                  }}
                  placeholder="0"
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label
                  htmlFor={`score2-${challenge.id}`}
                  className="text-xs sm:text-sm leading-tight break-words"
                >
                  {getDisplayName(challenged)} Score
                </Label>
                <Input
                  id={`score2-${challenge.id}`}
                  type="number"
                  min="0"
                  value={scores[challenge.id]?.player2 || ""}
                  onChange={(e) => {
                    setScores(prev => ({ 
                      ...prev, 
                      [challenge.id]: { 
                        ...prev[challenge.id],
                        player2: e.target.value 
                      }
                    }));
                    
                  }}
                  placeholder="0"
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
              <Button
                onClick={() => handleScoreSubmit(challenge)}
                className="w-full sm:w-auto flex-1 bg-green-600 hover:bg-green-700"
                disabled={!scores[challenge.id]?.player1 || !scores[challenge.id]?.player2}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Submit Result
              </Button>
              {isCompleted && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex-1"
                  onClick={() =>
                    setEditingScores((prev) => ({
                      ...prev,
                      [challenge.id]: false,
                    }))
                  }
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending Matches ({pendingChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">
            Completed Matches ({completedChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingChallenges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No pending matches at the moment</p>
              <p className="text-sm">Challenge someone to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingChallenges.map(renderMatch)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedChallenges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No completed matches yet</p>
              <p className="text-sm">Start playing to see match history!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedChallenges.map(renderMatch)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
