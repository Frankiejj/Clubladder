import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Club {
  id: string;
  name: string;
}

interface ClubManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClubManagement = ({ isOpen, onClose }: ClubManagementProps) => {
  const { toast } = useToast();
  const [newClubName, setNewClubName] = useState("");
  
  // Mock clubs data - in a real app this would come from a database
  const [clubs, setClubs] = useState<Club[]>([
    { id: "1", name: "Riverside Tennis Club" },
    { id: "2", name: "Downtown Sports Center" },
    { id: "3", name: "Elite Tennis Academy" },
    { id: "4", name: "Community Recreation Center" },
    { id: "5", name: "Royal Tennis Club" },
  ]);

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
      name: newClubName.trim()
    };

    setClubs([...clubs, newClub]);
    setNewClubName("");
    
    toast({
      title: "Club Added!",
      description: `${newClub.name} has been added to the club list`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-800 flex items-center gap-2">
            <Building className="h-6 w-6" />
            Club Management (Admin)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add New Club Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Club</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClub} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="clubName" className="sr-only">
                    Club Name
                  </Label>
                  <Input
                    id="clubName"
                    type="text"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="Enter club name"
                    className="w-full"
                  />
                </div>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Club
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Clubs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing Clubs ({clubs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clubs.map((club) => (
                  <div
                    key={club.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{club.name}</span>
                    <Button
                      onClick={() => handleDeleteClub(club.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} className="border border-gray-200 hover:bg-gray-50">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
