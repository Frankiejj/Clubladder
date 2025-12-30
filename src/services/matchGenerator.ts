
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

export const generateMonthlyMatches = (players: Player[], ladderType: "singles" | "doubles"): Challenge[] => {
  const generatedMatches: Challenge[] = [];
  
  if (ladderType === "doubles") {
    // Only generate doubles matches for players with doubles partners
    const playersWithPartners = players.filter(player => 
      (player as any).doublesPartnerId && (player as any).doublesPartnerId !== "none"
    );
    
    if (playersWithPartners.length < 2) {
      return []; // Need at least 2 players with partners to create matches
    }

    // Sort by doubles rating
    const sortedPlayers = [...playersWithPartners].sort((a, b) => {
      return a.doublesRating - b.doublesRating;
    });

    // Generate doubles matches
    sortedPlayers.forEach((player) => {
      const matchesToGenerate = (player as any).doublesMatchFrequency || 1;
      let matchesGenerated = 0;

      // Find suitable opponents within 2 ratings
      const suitableOpponents = sortedPlayers.filter(opponent => {
        if (opponent.id === player.id) return false;
        
        return Math.abs(player.doublesRating - opponent.doublesRating) <= 2;
      });

      // Generate matches up to the player's doubles frequency preference
      while (matchesGenerated < matchesToGenerate && suitableOpponents.length > 0) {
        const randomOpponent = suitableOpponents[Math.floor(Math.random() * suitableOpponents.length)];
        
        // Check if this match pair already exists
        const matchExists = generatedMatches.some(match => 
          (match.challengerId === player.id && match.challengedId === randomOpponent.id) ||
          (match.challengerId === randomOpponent.id && match.challengedId === player.id)
        );

        if (!matchExists) {
          generatedMatches.push({
            id: `doubles-match-${Date.now()}-${Math.random()}`,
            challengerId: player.id,
            challengedId: randomOpponent.id,
            status: 'pending',
            scheduledDate: getRandomDateInCurrentMonth()
          });
          matchesGenerated++;
        }

        // Remove the opponent from suitable list to avoid duplicates
        const opponentIndex = suitableOpponents.indexOf(randomOpponent);
        suitableOpponents.splice(opponentIndex, 1);
      }
    });
  } else {
    // Singles matches - existing logic
    const sortedPlayers = [...players].sort((a, b) => {
      return a.singlesRating - b.singlesRating;
    });

    sortedPlayers.forEach((player) => {
      const matchesToGenerate = player.matchFrequency;
      let matchesGenerated = 0;

      // Find suitable opponents within 2 ratings
      const suitableOpponents = sortedPlayers.filter(opponent => {
        if (opponent.id === player.id) return false;
        
        return Math.abs(player.singlesRating - opponent.singlesRating) <= 2;
      });

      // Generate matches up to the player's frequency preference
      while (matchesGenerated < matchesToGenerate && suitableOpponents.length > 0) {
        const randomOpponent = suitableOpponents[Math.floor(Math.random() * suitableOpponents.length)];
        
        // Check if this match pair already exists
        const matchExists = generatedMatches.some(match => 
          (match.challengerId === player.id && match.challengedId === randomOpponent.id) ||
          (match.challengerId === randomOpponent.id && match.challengedId === player.id)
        );

        if (!matchExists) {
          generatedMatches.push({
            id: `singles-match-${Date.now()}-${Math.random()}`,
            challengerId: player.id,
            challengedId: randomOpponent.id,
            status: 'pending',
            scheduledDate: getRandomDateInCurrentMonth()
          });
          matchesGenerated++;
        }

        // Remove the opponent from suitable list to avoid duplicates
        const opponentIndex = suitableOpponents.indexOf(randomOpponent);
        suitableOpponents.splice(opponentIndex, 1);
      }
    });
  }

  return generatedMatches;
};

const getRandomDateInCurrentMonth = (): string => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Generate a random date between 5th and 25th of current month
  const randomDay = Math.floor(Math.random() * 20) + 5;
  const randomDate = new Date(currentYear, currentMonth, randomDay);
  
  return randomDate.toISOString().split('T')[0];
};
