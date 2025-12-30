import { useState, useEffect } from "react";
import { User, LogOut, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PlayerProfile {
  name: string | null;
  avatar_url?: string | null;
  email: string;
}

export const ProfileDropdown = () => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    const metaAvatar = (user.user_metadata as any)?.avatar_url || null;
    const name =
      (user.user_metadata as any)?.full_name ||
      (user.email ? user.email.split("@")[0] : null);

    let dbAvatar: string | null = null;
    const { data: playerRow, error: playerErr } = await (supabase as any)
      .from("players")
      .select("avatar_url")
      .ilike("email", user.email || "")
      .maybeSingle();
    if (!playerErr) {
      dbAvatar = playerRow?.avatar_url ?? null;
    } else {
      console.warn("Profile dropdown avatar lookup error", playerErr);
    }

    const resolvedAvatar = dbAvatar || metaAvatar || profile?.avatar_url || null;

    setProfile({
      name: name || null,
      avatar_url: resolvedAvatar,
      email: user.email || "",
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You've been successfully logged out",
      });
      navigate("/auth");
    }
  };

  const getInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.email?.[0]?.toUpperCase() || "U";
  };

  if (!profile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full bg-slate-900 text-white px-2 py-1 pr-3 text-sm font-semibold">
          <Avatar className="h-8 w-8 bg-transparent border-0 ring-0">
            <AvatarImage
              key={profile.avatar_url || profile.email}
              src={profile.avatar_url || undefined}
              alt={profile.name || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-slate-900 text-white border-0 flex items-center justify-center">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="whitespace-nowrap">
            {profile.name || profile.email || getInitials()}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{profile.name || "User"}</span>
            <span className="text-xs text-muted-foreground">{profile.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            navigate("/profile");
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            navigate("/my-matches");
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Trophy className="mr-2 h-4 w-4" />
          My Matches
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
