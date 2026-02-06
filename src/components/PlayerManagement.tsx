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
      email: "",
      clubs: [],
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

  const handleSelfRegistration = (playerData: Omit<Player, 'id'>) => {
    // Place new players at the bottom of the ladder
    const insertPosition = players.length ? Math.max(...players.map((p) => p.rank)) + 1 : 1;

    const newPlayer: Player = {
      ...playerData,
      id: Date.now().toString(),
      rank: insertPosition,
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
      toast({
        title: "Ladder Updated!",
        description: `${challenger.name} has moved up to rank ${challenger.rank}!`,
      });
    } else {
      // Challenged player wins - no rank change
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
