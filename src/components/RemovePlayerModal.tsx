import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserMinus, AlertTriangle } from "lucide-react";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";

interface RemovePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onRemovePlayer: (playerId: string) => void;
}

export const RemovePlayerModal = ({ isOpen, onClose, players, onRemovePlayer }: RemovePlayerModalProps) => {
  const { toast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  // Filter out admin players from removal options
  const removablePlayers = players.filter(player => !player.isAdmin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-800 flex items-center gap-2">
            <UserMinus className="h-6 w-6" />
            Remove Player (Admin Only)
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Warning</p>
              <p className="text-sm text-red-600">
                This action will permanently remove the player from the ladder and cannot be undone.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="player" className="text-sm font-medium text-gray-700">
              Select Player to Remove *
            </Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a player to remove" />
              </SelectTrigger>
              <SelectContent>
                {removablePlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    #{player.rank} - {player.name} ({player.wins}W - {player.losses}L)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {removablePlayers.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No players available for removal (admin players cannot be removed)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedPlayerId}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Player
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
