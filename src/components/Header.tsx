
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { UserProfile } from "./UserProfile";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { ProfileDropdown } from "@/components/ProfileDropdown";

interface HeaderProps {
  playersCount: number;
  onShowRemovePlayer: () => void;
  isAdmin: boolean;
  currentUser?: Player;
  onUpdateProfile?: (updatedUser: Player) => void;
  challenges?: Challenge[];
  players?: Player[];
  onRemovePlayer?: (playerId: string) => void;
  ladderSelector?: React.ReactNode;
}

export const Header = ({ 
  playersCount, 
  currentUser,
  onUpdateProfile,
  challenges,
  players,
  onRemovePlayer,
  ladderSelector
}: HeaderProps) => {
  const location = useLocation();
  
  return (
    <div className="text-center mb-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="w-11 sm:w-12 shrink-0" />
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <img src="/favicon.svg" alt="Ladder logo" className="h-10 w-10 sm:h-12 sm:w-12" />
          <h1 className="text-4xl sm:text-5xl font-bold text-green-800">Ladder</h1>
        </div>
        <div className="w-11 sm:w-12 shrink-0 flex items-center justify-end">
          <ProfileDropdown />
        </div>
      </div>
      <p className="text-lg sm:text-xl text-green-700 mb-6">View upcoming matches and results!</p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        {ladderSelector ? (
          ladderSelector
        ) : (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Users className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">{playersCount} Players</span>
          </div>
        )}
      </div>
    </div>
  );
};
