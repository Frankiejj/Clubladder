import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Building, ArrowLeft, Save, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileDropdown } from "@/components/ProfileDropdown";

const AddClub = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"add" | "edit">("add");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [newLadders, setNewLadders] = useState<Array<{ id: string; type: "singles" | "doubles" }>>([
    { id: `${Date.now()}`, type: "singles" },
  ]);

  const [clubs, setClubs] = useState<any[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [clubLadders, setClubLadders] = useState<any[]>([]);
  const [laddersLoading, setLaddersLoading] = useState(false);
  const [selectedLadderId, setSelectedLadderId] = useState("");
  const [addExistingLadderType, setAddExistingLadderType] = useState<"singles" | "doubles">("singles");
  const [ladderEditType, setLadderEditType] = useState<"singles" | "doubles">("singles");
  const [ladderSaving, setLadderSaving] = useState(false);
  const [ladderDeleting, setLadderDeleting] = useState(false);

  const buildLadderName = (clubName: string, type: "singles" | "doubles") =>
    `${clubName} (${type === "singles" ? "Singles" : "Doubles"})`;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: playerRow, error } = await (supabase as any)
        .from("players")
        .select("is_admin,is_super_admin")
        .ilike("email", user.email || "")
        .maybeSingle();

      if (error) {
        console.error("Failed to check permissions", error);
        setAuthorized(false);
        setPageLoading(false);
        return;
      }

      const isSuperAdmin = Boolean(playerRow?.is_super_admin ?? playerRow?.is_admin);
      setAuthorized(isSuperAdmin);
      setPageLoading(false);
      if (isSuperAdmin) {
        fetchClubs();
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchClubs = async () => {
    setClubsLoading(true);
    const { data, error } = await supabase.from("clubs").select("*").order("name");
    if (error) {
      console.error("Error loading clubs", error);
      toast({
        title: "Could not load clubs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClubs(data || []);
    }
    setClubsLoading(false);
  };

  const fetchLadders = async (clubId: string) => {
    if (!clubId) {
      setClubLadders([]);
      setSelectedLadderId("");
      setLadderEditType("singles");
      return;
    }
    setLaddersLoading(true);
    const { data, error } = await (supabase as any)
      .from("ladders")
      .select("*")
      .eq("club_id", clubId)
      .order("name");
    if (error) {
      console.error("Error loading ladders", error);
      toast({
        title: "Could not load ladders",
        description: error.message,
        variant: "destructive",
      });
      setClubLadders([]);
    } else {
      setClubLadders(data || []);
    }
    setLaddersLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !sport.trim()) {
      toast({
        title: "Missing fields",
        description: "Name, city, and sport are required.",
        variant: "destructive",
      });
      return;
    }
    if (!newLadders.length) {
      toast({
        title: "Add at least one ladder",
        description: "Add a singles or doubles ladder.",
        variant: "destructive",
      });
      return;
    }

    const ladderSummary = newLadders.map((l) => (l.type === "singles" ? "Singles" : "Doubles")).join(", ");
    const ok = window.confirm(
      `Create club "${name.trim()}" with ${newLadders.length} ladder(s): ${ladderSummary}?`
    );
    if (!ok) return;

    setSaving(true);
    const { data: insertedClub, error: clubError } = await (supabase as any)
      .from("clubs")
      .insert({
        name: name.trim(),
        city: city.trim(),
        sport: sport.trim(),
        description: description.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
      } as any)
      .select("id")
      .single();

    if (clubError || !insertedClub?.id) {
      toast({
        title: "Add club failed",
        description: clubError?.message || "Could not create club.",
        variant: "destructive",
      });
    } else {
      const laddersPayload = newLadders.map((l) => ({
        club_id: insertedClub.id,
        name: buildLadderName(name.trim(), l.type),
        type: l.type,
        sport: sport.trim(),
        is_active: true,
      }));

      const { error: ladderError } = await (supabase as any).from("ladders").insert(laddersPayload);

      if (ladderError) {
        toast({
          title: "Club added, ladder failed",
          description: ladderError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Club and ladders added",
          description: `${name} with ${laddersPayload.length} ladder(s) created.`,
        });
        setName("");
        setCity("");
        setSport("");
        setDescription("");
        setEmail("");
        setPhone("");
        setWebsite("");
        setAddress("");
        setNewLadders([{ id: `${Date.now()}`, type: "singles" }]);
      }
    }

    setSaving(false);
    fetchClubs();
  };

  const handleSelectClub = (clubId: string) => {
    setSelectedClubId(clubId);
    const club = clubs.find((c) => c.id === clubId);
    if (club) {
      setName(club.name || "");
      setCity(club.city || "");
      setSport(club.sport || "");
      setDescription(club.description || "");
      setEmail(club.email || "");
      setPhone(club.phone || "");
      setWebsite(club.website || "");
      setAddress(club.address || "");
    }
    fetchLadders(clubId);
    setSelectedLadderId("");
    setLadderEditType("singles");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) {
      toast({
        title: "Select a club",
        description: "Choose a club to edit.",
        variant: "destructive",
      });
      return;
    }
    if (!name.trim() || !city.trim() || !sport.trim()) {
      toast({
        title: "Missing fields",
        description: "Name, city, and sport are required.",
        variant: "destructive",
      });
      return;
    }
      setSaving(true);
    const { error } = await (supabase as any)
      .from("clubs")
      .update({
        name: name.trim(),
        city: city.trim(),
        sport: sport.trim(),
        description: description.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
      } as any)
      .eq("id", selectedClubId as any);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Club updated",
        description: `${name} has been saved.`,
      });
      fetchClubs();
    }
    setSaving(false);
  };

  const handleSelectLadder = (ladderId: string) => {
    setSelectedLadderId(ladderId);
    const ladder = clubLadders.find((l) => l.id === ladderId);
    if (ladder) {
      setLadderEditType((ladder.type as "singles" | "doubles") || "singles");
    } else {
      setLadderEditType("singles");
    }
  };

  const handleAddLadderToClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) {
      toast({
        title: "Select a club",
        description: "Choose a club before adding a ladder.",
        variant: "destructive",
      });
      return;
    }
    setLadderSaving(true);
    const club = clubs.find((c) => c.id === selectedClubId);
    const ladderLabel = buildLadderName(club?.name || "Ladder", addExistingLadderType);
    const ok = window.confirm(`Add ladder "${ladderLabel}" to ${club?.name || "club"}?`);
    if (!ok) {
      setLadderSaving(false);
      return;
    }
    const { error } = await (supabase as any).from("ladders").insert({
      club_id: selectedClubId,
      name: ladderLabel,
      type: addExistingLadderType,
      sport: sport.trim() || null,
      is_active: true,
    });
    if (error) {
      toast({
        title: "Add ladder failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Ladder added",
        description: ladderLabel,
      });
      setAddExistingLadderType("singles");
      fetchLadders(selectedClubId);
    }
    setLadderSaving(false);
  };

  const handleDeleteLadder = async (ladder?: { id: string; name?: string }) => {
    if (!selectedClubId || !(ladder?.id || selectedLadderId)) {
      toast({
        title: "Select ladder",
        description: "Choose a ladder to remove.",
        variant: "destructive",
      });
      return;
    }
    const ladderId = ladder?.id || selectedLadderId;
    const ladderName = ladder?.name || "this ladder";
    const ok = window.confirm(`Remove ${ladderName}? This cannot be undone.`);
    if (!ok) return;

    setLadderDeleting(true);
    const { error } = await (supabase as any).from("ladders").delete().eq("id", ladderId as any);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Ladder removed",
        description: `${ladderName} has been deleted.`,
      });
      setSelectedLadderId("");
      setLadderEditType("singles");
      fetchLadders(selectedClubId);
    }
    setLadderDeleting(false);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p>Checking permissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-lg text-red-700 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700">
              Only super admins can add clubs.
            </p>
            <Link to="/">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to ladder
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 relative">
      <div className="absolute top-4 right-4 z-10">
        <ProfileDropdown />
      </div>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
              <Building className="h-7 w-7" />
              Manage Clubs (Super Admin)
            </h1>
            <p className="text-green-600">Create or edit clubs and ladder host locations.</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Clubs</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "add" | "edit")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add">Add Club</TabsTrigger>
                <TabsTrigger value="edit">Edit Club</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="sport">Sport *</Label>
                      <Input id="sport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g., tennis, padel" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {newLadders.map((ladder, idx) => (
                      <div key={ladder.id} className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label>Ladder {idx + 1} type *</Label>
                          <select
                            value={ladder.type}
                            onChange={(e) =>
                              setNewLadders((prev) =>
                                prev.map((l) =>
                                  l.id === ladder.id ? { ...l, type: e.target.value as "singles" | "doubles" } : l
                                )
                              )
                            }
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          >
                            <option value="singles">Singles</option>
                            <option value="doubles">Doubles</option>
                          </select>
                        </div>
                        {newLadders.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            className="text-red-600 border-red-200"
                            onClick={() =>
                              setNewLadders((prev) => prev.filter((l) => l.id !== ladder.id))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setNewLadders((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: "singles" }])
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add another ladder
                    </Button>
                  </div>

                  <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white w-full" disabled={saving}>
                    {saving ? "Saving..." : "Add Club"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="edit" className="mt-4">
                <div className="space-y-6">
                  <div>
                    <Label>Select club</Label>
                    <select
                      value={selectedClubId}
                      onChange={(e) => handleSelectClub(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                      disabled={clubsLoading}
                    >
                      <option value="">{clubsLoading ? "Loading..." : "Choose a club"}</option>
                      {clubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name} {club.city ? `(${club.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label>Ladder type</Label>
                      <select
                        value={addExistingLadderType}
                        onChange={(e) => setAddExistingLadderType(e.target.value as "singles" | "doubles")}
                        className="mt-1 w-full border rounded-md px-3 py-2"
                        disabled={!selectedClubId}
                      >
                        <option value="singles">Singles</option>
                        <option value="doubles">Doubles</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleAddLadderToClub}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!selectedClubId || ladderSaving}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {ladderSaving ? "Saving..." : "Add Ladder"}
                    </Button>
                  </div>

                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name-edit">Name *</Label>
                        <Input id="name-edit" value={name} onChange={(e) => setName(e.target.value)} disabled={!selectedClubId} />
                      </div>
                      <div>
                        <Label htmlFor="city-edit">City *</Label>
                        <Input id="city-edit" value={city} onChange={(e) => setCity(e.target.value)} disabled={!selectedClubId} />
                      </div>
                      <div>
                        <Label htmlFor="sport-edit">Sport *</Label>
                        <Input
                          id="sport-edit"
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          placeholder="e.g., tennis, padel"
                          disabled={!selectedClubId}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email-edit">Email</Label>
                        <Input id="email-edit" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!selectedClubId} />
                      </div>
                      <div>
                        <Label htmlFor="phone-edit">Phone</Label>
                        <Input id="phone-edit" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!selectedClubId} />
                      </div>
                      <div>
                        <Label htmlFor="website-edit">Website</Label>
                        <Input id="website-edit" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!selectedClubId} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="address-edit">Address</Label>
                        <Input id="address-edit" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!selectedClubId} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="description-edit">Description</Label>
                        <Textarea
                          id="description-edit"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          disabled={!selectedClubId}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!selectedClubId || saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>

                  <div className="mt-6 space-y-3">
                    <Label>Remove ladders</Label>
                    <div className="space-y-2">
                      {(clubLadders || []).length === 0 && (
                        <p className="text-sm text-gray-500">No ladders for this club.</p>
                      )}
                      {clubLadders.map((ladder) => (
                        <div
                          key={ladder.id}
                          className="flex items-center justify-between border rounded-md px-3 py-2 bg-white"
                        >
                          <div className="text-sm">
                            <div className="font-medium">{ladder.name}</div>
                            <div className="text-gray-500 capitalize">{ladder.type}</div>
                          </div>
                          <Button
                            variant="outline"
                            className="text-red-600 border-red-200"
                            disabled={ladderDeleting}
                            onClick={() => {
                              setSelectedLadderId(ladder.id);
                              setLadderEditType((ladder.type as "singles" | "doubles") || "singles");
                              handleDeleteLadder();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddClub;
