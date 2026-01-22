import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, User } from "lucide-react";
import { Challenge } from "@/types/Challenge";
import { Player } from "@/types/Player";

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  players: Player[];
  onResult: (challengeId: string, winnerId: string) => void;
}

export const MatchResultModal = ({ isOpen, onClose, challenge, players, onResult }: MatchResultModalProps) => {
  if (!challenge) return null;

  const challenger = players.find(p => p.id === challenge.challengerId);
  const challenged = players.find(p => p.id === challenge.challengedId);

  if (!challenger || !challenged) return null;

  const handleResult = (winnerId: string) => {
    onResult(challenge.id, winnerId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-800 text-center">
            Match Result
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              Who won the match between:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-green-50 border-2 hover:border-green-300"
              onClick={() => handleResult(challenger.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{challenger.name}</h3>
                    <p className="text-sm text-gray-600">Challenger (Rank #{challenger.rank})</p>
                  </div>
                </div>
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            </Card>

            <div className="text-center text-gray-500 font-medium">VS</div>

            <Card 
              className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-green-50 border-2 hover:border-green-300"
              onClick={() => handleResult(challenged.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{challenged.name}</h3>
                    <p className="text-sm text-gray-600">Defender (Rank #{challenged.rank})</p>
                  </div>
                </div>
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
            </Card>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              Click on the winner's card. If the challenger wins, they will swap positions on the ladder!
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
