import { useState, useEffect } from "react";
import { User, LogOut, Trophy, Building, Shield, ListOrdered } from "lucide-react";
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
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
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
    const metaIsSuperAdmin = Boolean((user.user_metadata as any)?.is_super_admin);
    const metaName =
      (user.user_metadata as any)?.full_name ||
      (user.email ? user.email.split("@")[0] : null);

    let dbAvatar: string | null = null;
    let dbName: string | null = null;
    let dbIsSuperAdmin = false;
    let dbIsAdmin = false;
    const { data: playerRow, error: playerErr } = await (supabase as any)
      .from("players")
      .select("avatar_url,name,is_super_admin,is_admin")
      .ilike("email", user.email || "")
      .maybeSingle();
    if (!playerErr) {
      dbAvatar = playerRow?.avatar_url ?? null;
      dbName = playerRow?.name ?? null;
      dbIsSuperAdmin = Boolean((playerRow as any)?.is_super_admin ?? (playerRow as any)?.is_admin);
      dbIsAdmin = Boolean((playerRow as any)?.is_admin);
    } else {
      console.warn("Profile dropdown avatar lookup error", playerErr);
    }

    const resolvedName = dbName || metaName || (user.email ? user.email.split("@")[0] : null);
    const resolvedAvatar = dbAvatar || metaAvatar || profile?.avatar_url || null;
    const resolvedSuperAdmin = dbIsSuperAdmin || metaIsSuperAdmin;
    const resolvedAdmin = dbIsAdmin || dbIsSuperAdmin;

    setProfile({
      name: resolvedName || null,
      avatar_url: resolvedAvatar,
      email: user.email || "",
      isSuperAdmin: resolvedSuperAdmin,
      isAdmin: resolvedAdmin,
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
      navigate("/login");
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
        <button className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 text-white px-3 py-2 pr-4 text-sm font-semibold shadow-lg hover:shadow-xl transition">
          <Avatar className="h-9 w-9 bg-green-100 text-green-700 border-2 border-white/40 ring-0 shadow">
            <AvatarImage
              key={profile.avatar_url || profile.email}
              src={profile.avatar_url || undefined}
              alt={profile.name || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-green-100 text-green-700 border-0 flex items-center justify-center">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="flex flex-col items-start leading-tight">
            <span className="font-semibold text-sm">
              {profile.name || profile.email || getInitials()}
            </span>
            <span className="text-xs text-white/80">{profile.email}</span>
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
        {/* Menu options */}
        {profile.isSuperAdmin ? (
          <>
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
                navigate("/my-ladder");
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <ListOrdered className="mr-2 h-4 w-4" />
              My Ladder
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                navigate("/add-club");
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Building className="mr-2 h-4 w-4" />
              Add Club
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                navigate("/super-admin");
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              Super Admin
            </DropdownMenuItem>
          </>
        ) : (
          <>
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
                navigate("/my-ladder");
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <ListOrdered className="mr-2 h-4 w-4" />
              My Ladder
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
            {profile.isAdmin && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  navigate("/admin");
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
