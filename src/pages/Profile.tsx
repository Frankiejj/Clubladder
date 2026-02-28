import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Save, ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    countryCode: "1",
    club_ids: [] as string[],
    email: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { clubs } = useClubs();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const session = sessionData.session;

        if (!session?.user?.email) {
          navigate("/auth");
          return;
        }

        const { data: player, error } = await (supabase as any)
          .from("players")
          .select("id,name,last_name,email,is_admin,clubs,created_at,phone,avatar_url")
          .eq("email", session.user.email)
          .maybeSingle();

        if (error || !player) {
          throw error || new Error("Player not found");
        }

        setPlayerId(player.id);
        const rawPhone = player.phone || "";
        const digits = rawPhone.replace(/\D/g, "");
        const derivedCountryCode =
          rawPhone.trim().startsWith("+") && digits.length >= 2
            ? digits.slice(0, 2)
            : "1";
        const derivedPhone =
          rawPhone.trim().startsWith("+") && digits.length > derivedCountryCode.length
            ? digits.slice(derivedCountryCode.length)
            : rawPhone;

        setFormData({
          first_name: player.name || "",
          last_name: player.last_name || "",
          phone: derivedPhone || "",
          countryCode: derivedCountryCode || "1",
          club_ids: (player.clubs || []).filter(Boolean),
          email: player.email || "",
          avatarUrl: player.avatar_url || "",
        });
        setAvatarPreview(player.avatar_url || null);
      } catch (err: any) {
        console.error("Profile load error", err);
        const message = err?.message || "Could not load your profile.";
        setLoadError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) return;

    let uploadedAvatarUrl = formData.avatarUrl;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const filePath = `${playerId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await (supabase.storage.from("avatars") as any).upload(
        filePath,
        avatarFile,
        { upsert: true }
      );
      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }
      const { data: publicUrlData } = (supabase.storage.from("avatars") as any).getPublicUrl(filePath);
      uploadedAvatarUrl = publicUrlData?.publicUrl || uploadedAvatarUrl;
    }

    const { error } = await (supabase as any)
      .from("players")
      .update({
        name: formData.first_name || null,
        last_name: formData.last_name || null,
        phone: formData.phone
          ? `+${(formData.countryCode || "").replace(/[^\d]/g, "")}${formData.phone.replace(/[^\d]/g, "")}`
          : null,
        clubs: formData.club_ids.length ? formData.club_ids : null,
        avatar_url: uploadedAvatarUrl || null,
      })
      .eq("id", playerId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({ ...prev, avatarUrl: uploadedAvatarUrl || "" }));
    setAvatarPreview(uploadedAvatarUrl || null);
    setAvatarFile(null);

    toast({
      title: "Profile Updated!",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleDeleteProfile = async () => {
    if (!playerId) return;
    const ok = window.confirm("Are you sure you want to remove your profile? This will delete your account data.");
    if (!ok) return;
    setDeleting(true);

    const avatarPath = (() => {
      if (!formData.avatarUrl) return null;
      const parts = formData.avatarUrl.split("/avatars/");
      if (parts.length < 2) return null;
      return decodeURIComponent(parts[1]);
    })();

    // Remove matches where the user participates
    const { error: matchError } = await (supabase as any)
      .from("matches")
      .delete()
      .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`);
    if (matchError) {
      toast({
        title: "Delete failed",
        description: `Could not remove matches: ${matchError.message}`,
        variant: "destructive",
      });
      setDeleting(false);
      return;
    }

    // Remove ladder memberships if table exists
    const ladderMembershipsResp = await (supabase as any)
      .from("ladder_memberships")
      .delete()
      .eq("player_id", playerId);
    if (ladderMembershipsResp.error && ladderMembershipsResp.error.code !== "42P01") {
      toast({
        title: "Delete failed",
        description: `Could not remove ladder memberships: ${ladderMembershipsResp.error.message}`,
        variant: "destructive",
      });
      setDeleting(false);
      return;
    }

    // Delete player
    const { error } = await (supabase as any).from("players").delete().eq("id", playerId);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setDeleting(false);
      return;
    }

    // Remove avatar from storage (best-effort)
    if (avatarPath) {
      await (supabase.storage.from("avatars") as any).remove([avatarPath]);
    }

    await supabase.auth.signOut();
    toast({
      title: "Profile removed",
      description: "Your account has been deleted.",
    });
    setDeleting(false);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Kon profiel niet laden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              {loadError || "Er ging iets mis bij het laden van je profiel."}
            </p>
            <div className="flex justify-center">
              <Link to="/login">
                <Button>Terug naar login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="mb-6 max-w-3xl mx-auto">
          <Link to="/app?ladder=singles">
            <Button className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
            <User className="h-7 w-7 sm:h-8 sm:w-8" />
            My Profile
          </h1>
          <p className="text-md sm:text-lg text-green-600">
            Manage your profile
          </p>
        </div>

        <Card className="max-w-3xl mx-auto shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <User className="h-6 w-6" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-700 border-b pb-2">
                  Personal Information
                </h3>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center overflow-hidden border border-green-200">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="avatar" className="text-sm font-medium text-gray-700">
                      Avatar
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="mt-2"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setAvatarFile(file);
                        setAvatarPreview(file ? URL.createObjectURL(file) : formData.avatarUrl || null);
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">JPG or PNG, square works best.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="first-name"
                      className="text-sm font-medium text-gray-700"
                    >
                      First Name
                    </Label>
                    <Input
                      id="first-name"
                      value={formData.first_name}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="last-name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="last-name"
                      value={formData.last_name}
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">My Club</Label>
                  <div className="mt-2">
                    <Input
                      value={
                        formData.club_ids.length
                          ? formData.club_ids
                              .map((clubId) => {
                                const club = clubs.find((c) => c.id === clubId);
                                return club
                                  ? `${club.name}${club.city ? ` (${club.city})` : ""}`
                                  : clubId;
                              })
                              .join(", ")
                          : "No club selected"
                      }
                      disabled
                      className=""
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-input bg-background px-2 h-10">
                      <span className="text-sm text-muted-foreground">+</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.countryCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            countryCode: e.target.value.replace(/[^\d]/g, "").slice(0, 2),
                          })
                        }
                        maxLength={2}
                        className="w-12 border-0 px-1 py-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label="Country code"
                      />
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="flex-1"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Profile
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex items-center gap-2"
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Removing..." : "Remove Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
