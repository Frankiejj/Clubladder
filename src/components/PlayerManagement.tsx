import { useState } from "react";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";

export const usePlayerManagement = (initialPlayers: Player[]) => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  const addNewPlayer = (name: string) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      rank: players.length + 1,
      wins: 0,
      losses: 0,
      email: "",
      clubs: [],
      singlesRating: 1,
      doublesRating: 1,
      matchFrequency: 1,
      gender: "male"
    };
    setPlayers([...players, newPlayer]);
    toast({
      title: "Player Added!",
      description: `${name} has joined the ladder at rank ${newPlayer.rank}`,
    });
  };

  const removePlayer = (playerId: string) => {
    const playerToRemove = players.find(p => p.id === playerId);
    if (!playerToRemove) return;

    // Don't allow removing admin players
    if (playerToRemove.isAdmin) {
      toast({
        title: "Cannot Remove Admin",
        description: "Admin players cannot be removed from the ladder",
        variant: "destructive"
      });
      return;
    }

    const updatedPlayers = players
      .filter(p => p.id !== playerId)
      .map(player => {
        // Adjust ranks for players below the removed player
        if (player.rank > playerToRemove.rank) {
          return { ...player, rank: player.rank - 1 };
        }
        return player;
      })
      .sort((a, b) => a.rank - b.rank);

    setPlayers(updatedPlayers);
    toast({
      title: "Player Removed",
      description: `${playerToRemove.name} has been removed from the ladder`,
    });
  };

  const handleSelfRegistration = (playerData: Omit<Player, 'id' | 'wins' | 'losses'>) => {
    // Calculate position based on rating and gender
    const adjustedRating = playerData.gender === "female" ? playerData.singlesRating + 1 : playerData.singlesRating;
    
    // Find position among players with similar adjusted rating
    const sortedPlayers = [...players].sort((a, b) => {
      const aAdjusted = a.gender === "female" ? a.singlesRating + 1 : a.singlesRating;
      const bAdjusted = b.gender === "female" ? b.singlesRating + 1 : b.singlesRating;
      return bAdjusted - aAdjusted; // Higher rating = lower rank number
    });
    
    let insertPosition = 1;
    for (let i = 0; i < sortedPlayers.length; i++) {
      const playerAdjusted = sortedPlayers[i].gender === "female" ? sortedPlayers[i].singlesRating + 1 : sortedPlayers[i].singlesRating;
      if (adjustedRating >= playerAdjusted) {
        insertPosition = sortedPlayers[i].rank;
        break;
      }
      insertPosition = sortedPlayers[i].rank + 1;
    }

    const newPlayer: Player = {
      ...playerData,
      id: Date.now().toString(),
      rank: insertPosition,
      wins: 0,
      losses: 0
    };

    // Update ranks for players at or below the new position
    const updatedPlayers = players.map(player => {
      if (player.rank >= insertPosition) {
        return { ...player, rank: player.rank + 1 };
      }
      return player;
    });

    setPlayers([...updatedPlayers, newPlayer].sort((a, b) => a.rank - b.rank));
    toast({
      title: "Welcome to the Ladder!",
      description: `${newPlayer.name} has successfully joined at rank ${newPlayer.rank}. Good luck!`,
    });
  };

  const updatePlayersAfterMatch = (challengerId: string, challengedId: string, winnerId: string) => {
    const newPlayers = [...players];
    const challenger = newPlayers.find(p => p.id === challengerId);
    const challenged = newPlayers.find(p => p.id === challengedId);
    
    if (!challenger || !challenged) return newPlayers;

    if (winnerId === challengerId) {
      // Challenger wins - swap positions
      const tempRank = challenger.rank;
      challenger.rank = challenged.rank;
      challenged.rank = tempRank;
      challenger.wins++;
      challenged.losses++;
      
      toast({
        title: "Ladder Updated!",
        description: `${challenger.name} has moved up to rank ${challenger.rank}!`,
      });
    } else {
      // Challenged player wins - no rank change
      challenger.losses++;
      challenged.wins++;
      
      toast({
        title: "Match Completed",
        description: `${challenged.name} successfully defended their position!`,
      });
    }

    // Sort players by rank
    newPlayers.sort((a, b) => a.rank - b.rank);
    setPlayers(newPlayers);
    return newPlayers;
  };

  return {
    players,
    setPlayers,
    addNewPlayer,
    removePlayer,
    handleSelfRegistration,
    updatePlayersAfterMatch
  };
};
