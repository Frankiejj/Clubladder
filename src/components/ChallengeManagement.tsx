
import { useState } from "react";
import { Challenge } from "@/pages/Index";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";

export const useChallengeManagement = (players: Player[]) => {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const handleChallenge = (challengerId: string, challengedId: string) => {
    const challenger = players.find(p => p.id === challengerId);
    const challenged = players.find(p => p.id === challengedId);
    
    if (!challenger || !challenged) return;
    
    if (challenger.rank > challenged.rank) {
      const newChallenge: Challenge = {
        id: Date.now().toString(),
        challengerId,
        challengedId,
        status: 'pending'
      };
      setChallenges([...challenges, newChallenge]);
      toast({
        title: "Challenge Sent!",
        description: `${challenger.name} has challenged ${challenged.name}`,
      });
    } else {
      toast({
        title: "Invalid Challenge",
        description: "You can only challenge players ranked above you!",
        variant: "destructive"
      });
    }
  };

  const removeChallenge = (challengeId: string) => {
    setChallenges(challenges.filter(c => c.id !== challengeId));
  };

  const addCompletedChallenge = (completedChallenge: Challenge) => {
    setChallenges(prev => [...prev, completedChallenge]);
  };

  return {
    challenges,
    setChallenges,
    handleChallenge,
    removeChallenge,
    addCompletedChallenge
  };
};
