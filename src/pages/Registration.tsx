import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";

export default function Registration() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sport, setSport] = useState<string>("");
  const { clubs } = useClubs(sport);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clubId, setClubId] = useState("");
  const [singlesMatchFrequency, setSinglesMatchFrequency] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !sport || !clubId) {
      toast({
        title: "Missing information",
        description: "Name, email, sport, and club are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Check if email already exists
    const { data: existing, error: existingError } = await (supabase as any)
      .from("players")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      toast({
        title: "Error",
        description: "Failed to validate email.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (existing) {
      toast({
        title: "Email already registered",
        description: "Use login instead.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Create AUTH user (Supabase magic link account)
    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (signUpError) {
      toast({
        title: "Registration failed",
        description: signUpError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Insert into players table (first without avatar_url; we'll upload after to use the row id)
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("players")
      .insert({
        name,
        email,
        phone,
        gender: null,
        rank: 999, // new players go to bottom
        wins: 0,
        losses: 0,
        singles_rating: 0,
        doubles_rating: 0,
        singles_match_frequency: singlesMatchFrequency,
        is_admin: false,
        clubs: clubId ? [clubId] : [],
        avatar_url: null,
      })
      .select("id")
      .single();

    if (insertError) {
      toast({
        title: "Database error",
        description: insertError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // If avatar provided, upload using the new player id
    if (avatarFile && inserted?.id) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const filePath = `avatars/${inserted.id}.${ext}`;
      const { error: uploadError } = await (supabase.storage.from("avatars") as any).upload(
        filePath,
        avatarFile,
        { upsert: true }
      );
      if (!uploadError) {
        const { data: publicUrlData } = (supabase.storage.from("avatars") as any).getPublicUrl(filePath);
        const avatarUrl = publicUrlData?.publicUrl ?? null;
        if (avatarUrl) {
          await (supabase as any)
            .from("players")
            .update({ avatar_url: avatarUrl })
            .eq("id", inserted.id);
        }
      }
    }

    toast({
      title: "Registration complete",
      description: "Check your email for the login link.",
    });

    setLoading(false);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6 text-green-700" />
              Create Account
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label>Avatar (optional)</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 border border-green-200 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                    setAvatarPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">JPG/PNG; square works best.</p>
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <Label>Sport *</Label>
              <Select
                value={sport || "none"}
                onValueChange={(value) => setSport(value === "none" ? "" : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose your sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select sport</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="padel">Padel</SelectItem>
                  <SelectItem value="squash">Squash</SelectItem>
                  <SelectItem value="golf">Golf</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Club *</Label>
              <Select
                value={clubId || "none"}
                onValueChange={(value) => setClubId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No club selected</SelectItem>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name} - {club.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Singles match frequency per month</Label>
              <Select
                value={singlesMatchFrequency.toString()}
                onValueChange={(value) => setSinglesMatchFrequency(parseInt(value, 10))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white"
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
