import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Player } from "@/types/Player";

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onChallenge: (challengerId: string, challengedId: string) => void;
}

export const ChallengeModal = ({ isOpen, onClose, players, onChallenge }: ChallengeModalProps) => {
  const [challengerId, setChallengerId] = useState("");
  const [challengedId, setChallengedId] = useState("");

  const handleSubmit = () => {
    if (challengerId && challengedId) {
      onChallenge(challengerId, challengedId);
      setChallengerId("");
      setChallengedId("");
      onClose();
    }
  };

  const availableChallengers = players;
  const availableChallenged = challengerId
    ? players.filter((p) => p.id !== challengerId)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-800">Create Challenge</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Challenger
            </Label>
            <Select value={challengerId} onValueChange={setChallengerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select challenger" />
              </SelectTrigger>
              <SelectContent>
                {availableChallengers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Player to Challenge
            </Label>
            <Select value={challengedId} onValueChange={setChallengedId} disabled={!challengerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select player to challenge" />
              </SelectTrigger>
              <SelectContent>
                {availableChallenged.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!challengerId || !challengedId}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Send Challenge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
