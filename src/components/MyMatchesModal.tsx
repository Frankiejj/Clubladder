
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, User } from "lucide-react";
import { useState } from "react";
import { Challenge } from "@/types/Challenge";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";

interface MyMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Player;
  challenges: Challenge[];
  players: Player[];
  onMatchResult: (challengeId: string, winnerId: string, score: string) => void;
}

export const MyMatchesModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  challenges, 
  players,
  onMatchResult 
}: MyMatchesModalProps) => {
  const { toast } = useToast();
  const [scores, setScores] = useState<{ [key: string]: string }>({});

  // Get matches where current user is involved
  const myMatches = challenges.filter(challenge => 
    challenge.challengerId === currentUser.id || challenge.challengedId === currentUser.id
  );

  const handleScoreSubmit = (challenge: Challenge, winnerId: string) => {
    const score = scores[challenge.id];
    if (!score || !score.trim()) {
      toast({
        title: "Score Required",
        description: "Please enter a valid score before submitting",
        variant: "destructive"
      });
      return;
    }

    onMatchResult(challenge.id, winnerId, score);
    setScores(prev => ({ ...prev, [challenge.id]: "" }));
    toast({
      title: "Match Result Submitted!",
      description: "The match result has been recorded successfully",
    });
  };

  const getOpponent = (challenge: Challenge) => {
    const opponentId = challenge.challengerId === currentUser.id ? challenge.challengedId : challenge.challengerId;
    return players.find(p => p.id === opponentId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-800 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            My Matches
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {myMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No matches scheduled</p>
              <p className="text-sm">Check back later for upcoming matches!</p>
            </div>
          ) : (
            myMatches.map((challenge) => {
              const opponent = getOpponent(challenge);
              if (!opponent) return null;

              const isCompleted = challenge.status === 'completed';

              return (
                <Card key={challenge.id} className="p-4">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="font-semibold">{currentUser.name}</div>
                        </div>
                        
                        <div className="flex flex-col items-center px-4">
                          <span className="text-lg font-bold text-green-600">VS</span>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-semibold">{opponent.name}</div>
                        </div>
                      </div>
                      
                      <Badge className={isCompleted ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"}>
                        {isCompleted ? "Completed" : "Pending"}
                      </Badge>
                    </div>

                    {!isCompleted && (
                      <div className="space-y-3 pt-4 border-t">
                        <div>
                          <Label htmlFor={`score-${challenge.id}`} className="text-sm font-medium">
                            Match Score (e.g., "6-4, 6-2" or "6-3, 4-6, 6-1")
                          </Label>
                          <Input
                            id={`score-${challenge.id}`}
                            value={scores[challenge.id] || ""}
                            onChange={(e) => setScores(prev => ({ ...prev, [challenge.id]: e.target.value }))}
                            placeholder="Enter match score"
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleScoreSubmit(challenge, currentUser.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={!scores[challenge.id]?.trim()}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            I Won
                          </Button>
                          <Button
                            onClick={() => handleScoreSubmit(challenge, opponent.id)}
                            className="flex-1 border border-gray-300 hover:bg-gray-50"
                            disabled={!scores[challenge.id]?.trim()}
                          >
                            <User className="h-4 w-4 mr-2" />
                            {opponent.name} Won
                          </Button>
                        </div>
                      </div>
                    )}

                    {isCompleted && challenge.winnerId && (
                      <div className="pt-4 border-t">
                        <div className="text-center">
                          <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">
                            Winner: {players.find(p => p.id === challenge.winnerId)?.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="pt-4">
          <Button onClick={onClose} className="w-full border border-gray-300 hover:bg-gray-50">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
