
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users, AlertTriangle } from "lucide-react";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ProfileDropdown } from "@/components/ProfileDropdown";

const ClubAdmin = () => {
  const { toast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  // Get current user and players from localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null") as Player | null;
  const players = JSON.parse(localStorage.getItem("players") || "[]") as Player[];

  // Redirect if not a club admin
  if (!currentUser || !currentUser.isAdmin ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">Only club administrators can access this page.</p>
              <Link to="/">
                <Button>Return to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get players from the same club as the current admin (excluding the admin themselves)
  const clubPlayers = players.filter(player => 
    player.clubs && 
    currentUser.clubs && 
    player.clubs.some(club => currentUser.clubs?.includes(club)) &&
    player.id !== currentUser.id &&
    !player.isAdmin // Club admins cannot remove other admins
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
      // Remove player from localStorage
      const updatedPlayers = players.filter(p => p.id !== selectedPlayerId);
      localStorage.setItem("players", JSON.stringify(updatedPlayers));
      
      setSelectedPlayerId("");
      toast({
        title: "Player Removed",
        description: `${playerToRemove.name} has been removed from the club`,
      });
      
      // Refresh the page to show updated list
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 relative">
      <div className="absolute top-4 right-4 z-10">
        <ProfileDropdown />
      </div>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Club Administration</h1>
          <p className="text-green-600">Manage players in your club</p>
        </div>

        {/* Club Admin Controls */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
              <Users className="h-6 w-6" />
              Remove Club Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-100 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">Club Administrator Permissions</p>
                  <p className="text-sm text-blue-600">
                    You can only remove regular players from your club. You cannot remove other administrators.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Player to Remove
                  </label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a player to remove from your club" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubPlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          #{player.rank} - {player.name} ({player.wins}W - {player.losses}L)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleRemovePlayer}
                  disabled={!selectedPlayerId}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected Player
                </Button>
              </div>

              {clubPlayers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No players available to remove from your club</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Only regular club members can be removed by club administrators
                  </p>
                </div>
              )}

              {/* Club Players List */}
              {clubPlayers.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Current Club Members ({clubPlayers.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {clubPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      >
                        <div>
                          <span className="font-medium">#{player.rank} - {player.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({player.wins}W - {player.losses}L)
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{player.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClubAdmin;
