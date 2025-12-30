
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
}

export const PendingMatches = ({ 
  challenges, 
  players, 
  onMatchResult,
  onScheduleMatch,
  currentUser
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

  const pendingChallenges = filteredChallenges.filter(c => c.status === 'pending' || c.status === 'scheduled' || c.status === 'accepted');
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

  const handleScoreSubmit = (challenge: Challenge) => {
    const isParticipant =
      currentUser &&
      (currentUser.id === challenge.challengerId ||
        currentUser.id === challenge.challengedId);

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

  const getExpectedPosition = (challenge: Challenge, winnerId: string) => {
    const challenger = players.find(p => p.id === challenge.challengerId);
    const challenged = players.find(p => p.id === challenge.challengedId);
    
    if (!challenger || !challenged) return "";

    if (winnerId === challenge.challengerId && challenger.rank > challenged.rank) {
      return `${challenger.name} moves to rank #${challenged.rank}`;
    } else if (winnerId === challenge.challengedId) {
      return `${challenged.name} defends rank #${challenged.rank}`;
    }
    return "No rank change";
  };

  const renderMatch = (challenge: Challenge) => {
    const challenger = players.find(p => p.id === challenge.challengerId);
    const challenged = players.find(p => p.id === challenge.challengedId);
    
    if (!challenger || !challenged) return null;

    const opponent = currentUser
      ? currentUser.id === challenge.challengerId
        ? challenged
        : challenger
      : null;

    const isCompleted = challenge.status === 'completed';
    const winner = challenge.winnerId ? players.find(p => p.id === challenge.winnerId) : null;
    const lastUpdated = challenge.updatedAt || challenge.scheduledDate || challenge.createdAt || null;
    const isScoreEditableThisMonth = isCompleted && isSameMonth(lastUpdated);
    const isParticipant =
      currentUser &&
      (currentUser.id === challenge.challengerId || currentUser.id === challenge.challengedId);
    const canEnterScore = isParticipant && (!isCompleted || isScoreEditableThisMonth);
    const isEditing = !!editingScores[challenge.id];

    return (
      <div
        key={challenge.id}
        className={`p-4 ${
          isCompleted ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
        } rounded-lg border space-y-4`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 w-full justify-center">
            <div className="text-center flex-1">
              <div className="font-semibold text-green-800 flex items-center justify-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={challenger.avatarUrl || (challenger as any).avatar_url || undefined} alt={challenger.name} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {challenger.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span>{challenger.name}</span>
                {opponent && opponent.id === challenger.id && (
                  <button
                    className="text-green-700 hover:text-green-800"
                    onClick={() => {
                      const msg = `Hi ${opponent.name}, let's schedule our ladder match: ${challenger.name} vs ${challenged.name}.`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    aria-label="Chat on WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">Rank #{challenger.rank}</div>
            </div>
            
            <div className="flex flex-col items-center justify-center px-4 self-stretch w-20 flex-shrink-0">
              <Swords className="h-5 w-5 text-green-600 mb-1" />
              <span className="text-xs font-medium text-green-700">VS</span>
              {isCompleted && challenge.score && (
                <span className="text-xs font-bold text-blue-600 mt-1">{challenge.score}</span>
              )}
            </div>
            
            <div className="text-center flex-1">
              <div className="font-semibold text-green-800 flex items-center justify-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={challenged.avatarUrl || (challenged as any).avatar_url || undefined} alt={challenged.name} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {challenged.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span>{challenged.name}</span>
                {opponent && opponent.id === challenged.id && (
                  <button
                    className="text-green-700 hover:text-green-800"
                    onClick={() => {
                      const msg = `Hi ${opponent.name}, let's schedule our ladder match: ${challenger.name} vs ${challenged.name}.`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    aria-label="Chat on WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">Rank #{challenged.rank}</div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 text-right">
            {isCompleted ? (
              <div className="flex flex-col items-end gap-2">
                <Badge className="bg-blue-50 text-blue-700 border-blue-300 self-end">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
                {winner ? (
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold">Winner: {winner.name}</p>
                    <p className="text-blue-600">{getExpectedPosition(challenge, winner.id)}</p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold text-blue-600">Result: Draw</p>
                  </div>
                )}
                {isScoreEditableThisMonth && canEnterScore && (
                  <div className="self-end w-full sm:w-auto">
                    <Button
                      className="w-full sm:w-32 justify-center bg-green-600 text-white hover:bg-green-700 border border-green-700"
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
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1 text-xs text-gray-600">
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">
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
          </div>
        </div>

        {!isCompleted && onScheduleMatch && (
          <div className="border-t pt-4 bg-white p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CalendarIcon className="h-4 w-4" />
              <span>Schedule this match</span>
            </div>
            {!openScheduler[challenge.id] ? (
              <Button
                variant="outline"
                onClick={() => setOpenScheduler((prev) => ({ ...prev, [challenge.id]: true }))}
                className="w-full sm:w-auto"
              >
                Choose date/time
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
                  className="w-full sm:w-64"
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
                >
                  Set date
                </Button>
                {challenge.scheduledDate && (
                  <span className="text-sm text-gray-600">
                    Current: {formatLocalDateTime(challenge.scheduledDate)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {canEnterScore && (!isCompleted || isEditing) && (
          <div className="border-t pt-4 bg-white p-4 rounded-lg">
            <h4 className="font-medium mb-3">{isCompleted ? "Edit Match Result" : "Enter Match Result"}</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor={`score1-${challenge.id}`}>{challenger.name} Score</Label>
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
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`score2-${challenge.id}`}>{challenged.name} Score</Label>
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
                  className="mt-1"
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
          <TabsTrigger value="pending">
            Pending Matches ({pendingChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
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
