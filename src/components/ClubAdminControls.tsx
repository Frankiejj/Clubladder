
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users, AlertTriangle } from "lucide-react";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";

interface ClubAdminControlsProps {
  currentUser: Player;
  players: Player[];
  onRemovePlayer: (playerId: string) => void;
}

export const ClubAdminControls = ({ currentUser, players, onRemovePlayer }: ClubAdminControlsProps) => {
  const { toast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  // Get players from the same club as the current admin (excluding the admin themselves)
  const clubPlayers = players.filter(player => 
    player.clubs && 
    currentUser.clubs && 
    player.clubs.some(club => currentUser.clubs?.includes(club)) &&
    player.id !== currentUser.id &&
    !player.isAdmin && // Club admins cannot remove other admins
    !player.isSuperAdmin // Club admins cannot remove super admins
  );

  const handleRemovePlayer = () => {
    if (!selectedPlayerId) {
      toast({
        title: "No Player Selected",
        description: "Please select a player to remove",
        variant: "destructive"
      });
      return;
    }

    const playerToRemove = players.find(p => p.id === selectedPlayerId);
    if (playerToRemove) {
      onRemovePlayer(selectedPlayerId);
      setSelectedPlayerId("");
      toast({
        title: "Player Removed",
        description: `${playerToRemove.name} has been removed from the club`,
      });
    }
  };

  if (!currentUser.isAdmin || currentUser.isSuperAdmin) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Club Admin Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-100 p-3 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-700 font-medium">Club Administrator</p>
              <p className="text-xs text-blue-600">
                You can only remove players from your club. You cannot remove other admins.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player to remove from club" />
                </SelectTrigger>
                <SelectContent>
                  {clubPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      #{player.rank} - {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleRemovePlayer}
              disabled={!selectedPlayerId}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>

          {clubPlayers.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No players available to remove from your club
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
