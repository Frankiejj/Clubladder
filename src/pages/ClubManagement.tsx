
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Building, ArrowLeft, Shield, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Club } from "@/types/Club";
import { SearchableSelect } from "@/components/SearchableSelect";

const ClubManagement = () => {
  const { toast } = useToast();
  const [newClubName, setNewClubName] = useState("");
  const [newClubLadders, setNewClubLadders] = useState({ singles: true, doubles: true });
  
  // Mock players data for admin assignment
  const [players] = useState([
    { id: "1", name: "Emma Wilson", email: "emma@riversidetennis.com" },
    { id: "2", name: "James Rodriguez", email: "james@riversidetennis.com" },
    { id: "3", name: "Sarah Chen", email: "sarah@riversidetennis.com" },
    { id: "4", name: "Michael Brown", email: "michael@riversidetennis.com" },
    { id: "5", name: "Lisa Thompson", email: "lisa@riversidetennis.com" },
  ]);
  
  const [clubs, setClubs] = useState<Club[]>([
    { 
      id: "1", 
      name: "Riverside Tennis Club",
      ladders: { singles: true, doubles: true },
      adminId: "1"
    },
    { 
      id: "2", 
      name: "Downtown Sports Center",
      ladders: { singles: true, doubles: false },
      adminId: "2"
    },
    { 
      id: "3", 
      name: "Elite Tennis Academy",
      ladders: { singles: true, doubles: true }
    },
    { 
      id: "4", 
      name: "Community Recreation Center",
      ladders: { singles: true, doubles: false }
    },
    { 
      id: "5", 
      name: "Royal Tennis Club",
      ladders: { singles: true, doubles: true }
    },
  ]);

  // Check if current user is super admin
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isSuperAdmin = currentUser.isSuperAdmin;

  const handleAddClub = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClubName.trim()) {
      toast({
        title: "Invalid Club Name",
        description: "Please enter a club name",
        variant: "destructive"
      });
      return;
    }

    if (clubs.some(club => club.name.toLowerCase() === newClubName.toLowerCase())) {
      toast({
        title: "Club Already Exists",
        description: "A club with this name already exists",
        variant: "destructive"
      });
      return;
    }

    const newClub: Club = {
      id: Date.now().toString(),
      name: newClubName.trim(),
      ladders: newClubLadders
    };

    setClubs([...clubs, newClub]);
    setNewClubName("");
    setNewClubLadders({ singles: true, doubles: true });
    
    toast({
      title: "Club Added!",
      description: `${newClub.name} has been added with configured ladders`,
    });
  };

  const handleDeleteClub = (clubId: string) => {
    const clubToDelete = clubs.find(club => club.id === clubId);
    if (clubToDelete) {
      setClubs(clubs.filter(club => club.id !== clubId));
      toast({
        title: "Club Removed",
        description: `${clubToDelete.name} has been removed from the club list`,
      });
    }
  };

  const updateClubLadders = (clubId: string, ladders: { singles: boolean; doubles: boolean }) => {
    setClubs(clubs.map(club => 
      club.id === clubId ? { ...club, ladders } : club
    ));
    
    toast({
      title: "Club Updated",
      description: "Ladder configuration has been updated",
    });
  };

  const assignClubAdmin = (clubId: string, adminId: string) => {
    setClubs(clubs.map(club => 
      club.id === clubId ? { ...club, adminId: adminId === "none" ? undefined : adminId } : club
    ));
    
    const selectedPlayer = players.find(p => p.id === adminId);
    toast({
      title: "Club Admin Updated",
      description: adminId === "none" ? "Club admin removed" : `${selectedPlayer?.name} assigned as club admin`,
    });
  };

  const getPlayerOptions = () => [
    { value: "none", label: "No admin assigned" },
    ...players.map(player => ({ value: player.id, label: `${player.name} (${player.email})` }))
  ];

  const getAdminName = (adminId?: string) => {
    if (!adminId) return "No admin assigned";
    const admin = players.find(p => p.id === adminId);
    return admin ? admin.name : "Unknown admin";
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl text-red-800 flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                Only Super Admins can access club management. Club Admins can manage players through the main ladder page.
              </p>
              <Link to="/app">
                <Button className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Ladder
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/app">
            <Button className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
            <Building className="h-8 w-8" />
            Club Management (Super Admin Only)
          </h1>
          <p className="text-lg text-green-600">Manage tennis clubs, ladders, and assign club administrators</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Club</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClub} className="space-y-4">
                <div>
                  <Label htmlFor="clubName">Club Name</Label>
                  <Input
                    id="clubName"
                    type="text"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="Enter club name"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label className="text-base font-medium">Available Ladders</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="singles"
                        checked={newClubLadders.singles}
                        onCheckedChange={(checked) => 
                          setNewClubLadders(prev => ({ ...prev, singles: !!checked }))
                        }
                      />
                      <Label htmlFor="singles">Singles Ladder</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="doubles"
                        checked={newClubLadders.doubles}
                        onCheckedChange={(checked) => 
                          setNewClubLadders(prev => ({ ...prev, doubles: !!checked }))
                        }
                      />
                      <Label htmlFor="doubles">Doubles Ladder</Label>
                    </div>
                  </div>
                </div>
                
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Club
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing Clubs ({clubs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {clubs.map((club) => (
                  <div
                    key={club.id}
                    className="p-4 bg-gray-50 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{club.name}</span>
                      <Button
                        onClick={() => handleDeleteClub(club.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={club.ladders.singles}
                          onCheckedChange={(checked) => 
                            updateClubLadders(club.id, { ...club.ladders, singles: !!checked })
                          }
                        />
                        <Label className="text-sm">Singles</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={club.ladders.doubles}
                          onCheckedChange={(checked) => 
                            updateClubLadders(club.id, { ...club.ladders, doubles: !!checked })
                          }
                        />
                        <Label className="text-sm">Doubles</Label>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center gap-3">
                        <UserCog className="h-4 w-4 text-blue-600" />
                        <Label className="text-sm font-medium">Club Administrator:</Label>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1">
                          <SearchableSelect
                            options={getPlayerOptions()}
                            value={club.adminId || "none"}
                            onValueChange={(value) => assignClubAdmin(club.id, value)}
                            placeholder="Select club admin"
                            className="w-full"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          Current: {getAdminName(club.adminId)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {clubs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No clubs added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClubManagement;
