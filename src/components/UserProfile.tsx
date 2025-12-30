
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Building, Shield, Users, Trophy } from "lucide-react";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface UserProfileProps {
  currentUser: Player;
  onUpdateProfile: (updatedUser: Player) => void;
  players: Player[];
  onRemovePlayer?: (playerId: string) => void;
  challenges?: Challenge[];
}

export const UserProfile = ({ currentUser, onUpdateProfile, players, onRemovePlayer, challenges }: UserProfileProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all stored user data
    localStorage.removeItem("userRole");
    localStorage.removeItem("currentUser");
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out."
    });
    navigate("/login");
  };

  // Function to get admin badge styling
  const getAdminBadge = () => {
    if (currentUser.isSuperAdmin) {
      return (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
          SUPER ADMIN
        </div>
      );
    }
    if (currentUser.isAdmin) {
      return (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
          CLUB ADMIN
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Admin Badge - Always visible when user is admin */}
      {(currentUser.isSuperAdmin || currentUser.isAdmin) && getAdminBadge()}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback>
                {currentUser.isSuperAdmin ? (
                  <Shield className="h-4 w-4 text-yellow-600" />
                ) : currentUser.isAdmin ? (
                  <Building className="h-4 w-4 text-blue-600" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block font-medium">
              {currentUser.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg z-50">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              navigate("/profile");
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            My Profile
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              navigate("/my-matches", {
                state: {
                  currentUser,
                  challenges: challenges || [],
                  players,
                },
              });
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Trophy className="h-4 w-4" />
            My Matches
          </DropdownMenuItem>
          
          {/* Club Admin can manage their own club */}
          {currentUser.isAdmin && !currentUser.isSuperAdmin && (
            <DropdownMenuItem asChild>
              <Link 
                to="/club-admin" 
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Manage Club Players
              </Link>
            </DropdownMenuItem>
          )}
          
          {/* Super Admin can manage all clubs */}
          {currentUser.isSuperAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/club-management" className="flex items-center gap-2 cursor-pointer">
                <Building className="h-4 w-4" />
                Manage All Clubs
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
