import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Users, Trophy, Trash2, Save, Pencil } from "lucide-react";
import { ProfileDropdown } from "@/components/ProfileDropdown";

interface PlayerRow {
  id: string;
  name: string;
  email: string;
  rank: number;
  wins: number;
  losses: number;
  clubs: string[] | null;
  avatar_url?: string | null;
}

interface MatchRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: string;
  scheduled_date: string | null;
  winner_id: string | null;
  score: string | null;
  player1_score: number | null;
  player2_score: number | null;
}

const SuperAdmin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [clubs, setClubs] = useState<{ id: string; name: string; city?: string }[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [view, setView] = useState<"rankings" | "matches">("rankings");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedPlayerRank, setSelectedPlayerRank] = useState<number>(1);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [matchScores, setMatchScores] = useState<{ p1: string; p2: string }>({ p1: "", p2: "" });
  const [saving, setSaving] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          navigate("/login");
          return;
        }
        const { data: me, error } = await (supabase as any)
          .from("players")
          .select("id,is_admin,is_super_admin,clubs,email")
          .ilike("email", user.email || "")
          .maybeSingle();
        if (error || !me) {
          throw error || new Error("Not authorized");
        }
        const isSuper = Boolean(me.is_super_admin);
        setIsSuperAdmin(isSuper);
        setAuthorized(isSuper);
        if (!isSuper) {
          setLoading(false);
          return;
        }
        const clubsData = await loadClubs();
        const fallbackClub = clubsData?.[0]?.id || "";
        setSelectedClubId(fallbackClub);
        await Promise.all([loadPlayers(), loadMatches()]);
      } catch (err: any) {
        console.error("Super admin load error", err);
        toast({
          title: "Access denied",
          description: "Super admin access required.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    const loadPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id,name,email,rank,wins,losses,clubs,avatar_url")
        .order("rank", { ascending: true });
      if (error) throw error;
      const list = data || [];
      setPlayers(list as PlayerRow[]);
      if (list && list.length) {
        setSelectedPlayerId(list[0].id);
        setSelectedPlayerRank(list[0].rank);
      }
    };

    const loadMatches = async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMatches((data as MatchRow[]) || []);
      if (data && data.length) {
        setSelectedMatchId(data[0].id);
        setMatchScores({
          p1: data[0].player1_score?.toString() || "",
          p2: data[0].player2_score?.toString() || "",
        });
      }
    };

    bootstrap();
  }, [navigate, toast]);

  const loadClubs = async () => {
    const { data, error } = await supabase.from("clubs").select("id,name,city").order("name");
    if (error) {
      console.error("Clubs load error", error);
      return [];
    }
    const safe = data || [];
    setClubs(safe);
    return safe;
  };

  const visiblePlayers = useMemo(() => {
    const base = Array.isArray(players) ? players : [];
    const allowedClubIds = selectedClubId ? [selectedClubId] : clubs.map((c) => c.id);

    if (allowedClubIds.length === 0) return base.filter((p) => p?.id);

    return base.filter((p) => {
      const clubIds = Array.isArray(p?.clubs) ? p.clubs : [];
      if (selectedClubId) {
        return p?.id && clubIds.includes(selectedClubId);
      }
      return p?.id && clubIds.some((c: string) => allowedClubIds.includes(c));
    });
  }, [players, selectedClubId, clubs]);

  const visibleMatches = useMemo(() => {
    const ids = new Set(visiblePlayers.map((p) => p.id));
    return matches.filter((m) => ids.has(m.challenger_id) || ids.has(m.challenged_id));
  }, [matches, visiblePlayers, selectedClubId]);

  const playerLookup = useMemo(() => {
    return visiblePlayers.reduce<Record<string, PlayerRow>>((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }, [visiblePlayers]);

  const selectedClubName = useMemo(() => {
    if (!selectedClubId) return "";
    return clubs.find((c) => c.id === selectedClubId)?.name || "";
  }, [selectedClubId, clubs]);

  const clubLabel = useMemo(() => {
    if (selectedClubName) return selectedClubName;
    const names = clubs.map((c) => c.name).filter(Boolean);
    return names.length ? names.join(", ") : "All clubs";
  }, [selectedClubName, clubs]);

  const selectPlayer = (id: string) => {
    const p = playerLookup[id];
    setSelectedPlayerId(id);
    setSelectedPlayerRank(p?.rank ?? 1);
    setShowPlayerModal(true);
  };

  const selectMatch = (id: string) => {
    const m = visibleMatches.find((mm) => mm.id === id);
    setSelectedMatchId(id);
    setMatchScores({
      p1: m?.player1_score?.toString() || "",
      p2: m?.player2_score?.toString() || "",
    });
    setShowMatchModal(true);
  };

  const reorderAndSaveRanks = async (playerId: string, newRank: number) => {
    const player = playerLookup[playerId];
    if (!player) return;
    const clubId = Array.isArray(player.clubs) && player.clubs.length ? player.clubs[0] : "none";
    const group = visiblePlayers.filter((p) => {
      const clubs = Array.isArray(p.clubs) ? p.clubs : [];
      return clubs.includes(clubId);
    });

    const without = group.filter((p) => p.id !== playerId);
    const idx = Math.max(0, Math.min(newRank - 1, without.length));
    without.splice(idx, 0, player);
    const updates = without.map((p, i) => ({ id: p.id, rank: i + 1 }));

    await Promise.all(
      updates.map((u) => (supabase as any).from("players").update({ rank: u.rank }).eq("id", u.id))
    );
    setPlayers((prev) =>
      prev.map((p) => {
        const upd = updates.find((u) => u.id === p.id);
        return upd ? { ...p, rank: upd.rank } : p;
      })
    );
    toast({ title: "Rank updated" });
  };

  const handleSaveRank = async () => {
    if (!selectedPlayerId) return;
    setSaving(true);
    try {
      await reorderAndSaveRanks(selectedPlayerId, Math.max(1, selectedPlayerRank));
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update rank",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    const player = playerLookup[playerId];
    const ok = window.confirm(`Remove player ${player?.name || ""}?`);
    if (!ok) return;
    setRemovingPlayerId(playerId);
    try {
      await (supabase as any)
        .from("matches")
        .delete()
        .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`);
      await (supabase as any).from("players").delete().eq("id", playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      toast({ title: "Player removed" });
      setSelectedPlayerId("");
    } catch (error: any) {
      toast({
        title: "Remove failed",
        description: error?.message || "Could not remove player",
        variant: "destructive",
      });
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const handleSaveMatch = async () => {
    if (!selectedMatchId) return;
    const match = visibleMatches.find((m) => m.id === selectedMatchId);
    if (!match) return;
    setSaving(true);
    try {
      const s1 = matchScores.p1 ? parseInt(matchScores.p1, 10) : null;
      const s2 = matchScores.p2 ? parseInt(matchScores.p2, 10) : null;
      let winnerId: string | null = null;
      let score: string | null = null;
      if (s1 !== null && s2 !== null) {
        if (s1 > s2) winnerId = match.challenger_id;
        if (s2 > s1) winnerId = match.challenged_id;
        score = `${s1}-${s2}`;
      }
      const { error } = await (supabase as any)
        .from("matches")
        .update({
          player1_score: s1,
          player2_score: s2,
          score,
          winner_id: winnerId,
          status: s1 !== null && s2 !== null ? "completed" : match.status,
        })
        .eq("id", match.id);
      if (error) throw error;
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, player1_score: s1, player2_score: s2, score, winner_id: winnerId, status: s1 !== null && s2 !== null ? "completed" : m.status }
            : m
        )
      );
      toast({ title: "Match updated" });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update match",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMatch = async () => {
    if (!selectedMatchId) return;
    const ok = window.confirm("Remove this match?");
    if (!ok) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("matches").delete().eq("id", selectedMatchId);
      if (error) throw error;
      setMatches((prev) => prev.filter((m) => m.id !== selectedMatchId));
      toast({ title: "Match removed" });
      setSelectedMatchId("");
    } catch (error: any) {
      toast({
        title: "Remove failed",
        description: error?.message || "Could not remove match",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p>Loading admin tools...</p>
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
            <p className="text-red-700">Only super admins can access this page.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="absolute top-4 right-4 z-10">
        <ProfileDropdown />
      </div>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Super Admin Control
            </h1>
            <p className="text-green-600">Manage rankings and matches across all clubs.</p>
          </div>
        </div>

        <div className="mb-4">
          <Label className="text-xs">Select club to edit</Label>
          <select
            className="mt-1 w-full border rounded-md px-3 py-2"
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
          >
            <option value="">All clubs</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.city ? `(${c.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={view === "rankings" ? "default" : "outline"}
            className={view === "rankings" ? "bg-green-600 text-white" : ""}
            onClick={() => setView("rankings")}
          >
            Rankings
          </Button>
          <Button
            variant={view === "matches" ? "default" : "outline"}
            className={view === "matches" ? "bg-green-600 text-white" : ""}
            onClick={() => setView("matches")}
          >
            Matches
          </Button>
        </div>

        {view === "rankings" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players
                </CardTitle>
                <p className="text-sm text-gray-600">{clubLabel}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                  {visiblePlayers.length === 0 && <p className="text-sm text-gray-600">No players found.</p>}
                  {visiblePlayers
                    .sort((a, b) => a.rank - b.rank)
                    .map((p) => {
                      const isSelected = selectedPlayerId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => selectPlayer(p.id)}
                          className={`border rounded-md px-3 py-2 bg-white flex items-center justify-between cursor-pointer transition-all ${
                            isSelected ? "ring-2 ring-green-500 bg-green-50 shadow-green-200 shadow" : ""
                          }`}
                        >
                          <div>
                            <div className="font-semibold">
                              #{p.rank} {p.name}
                            </div>
                            <div className="text-xs text-gray-500">{p.email}</div>
                            <div className="text-xs text-gray-500">W/L: {p.wins} / {p.losses}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-xs text-green-600 font-semibold">Selected</span>
                            )}
                            <Button
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectPlayer(p.id);
                              }}
                              className={isSelected ? "bg-green-600 text-white hover:bg-green-700" : ""}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {showPlayerModal && selectedPlayerId && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Edit player</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const p = playerLookup[selectedPlayerId];
                      if (!p) return <p className="text-sm text-gray-600">Player not found.</p>;
                      return (
                        <>
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.email}</div>
                            <div className="text-xs text-gray-500">Current rank: #{p.rank}</div>
                            <div className="text-xs text-gray-500">W/L: {p.wins} / {p.losses}</div>
                          </div>
                          <div>
                            <Label className="text-xs">New rank</Label>
                            <Input
                              type="number"
                              value={selectedPlayerRank}
                              onChange={(e) => setSelectedPlayerRank(parseInt(e.target.value || "1", 10))}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveRank} disabled={saving}>
                              <Save className="h-4 w-4 mr-2" />
                              {saving ? "Saving..." : "Save Rank"}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleRemovePlayer(selectedPlayerId)}
                              disabled={removingPlayerId === selectedPlayerId}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Player
                            </Button>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setShowPlayerModal(false)}>
                              Close
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Matches
                </CardTitle>
                <p className="text-sm text-gray-600">{clubLabel}</p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
                {visibleMatches.length === 0 && <p className="text-sm text-gray-600">No matches found.</p>}
                {visibleMatches.map((m) => {
                  const challenger = playerLookup[m.challenger_id];
                  const challenged = playerLookup[m.challenged_id];
                  return (
                    <div
                      key={m.id}
                      className={`border rounded-md px-3 py-2 bg-white cursor-pointer flex items-center justify-between ${selectedMatchId === m.id ? "ring-2 ring-green-500 bg-green-50 shadow-green-200 shadow" : ""}`}
                      onClick={() => selectMatch(m.id)}
                    >
                      <div>
                        <div className="font-semibold">
                          {challenger?.name || "Player"} vs {challenged?.name || "Player"}
                        </div>
                        <div className="text-xs text-gray-500">Status: {m.status}</div>
                        {m.score && <div className="text-xs text-gray-500">Score: {m.score}</div>}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectMatch(m.id);
                        }}
                        className={selectedMatchId === m.id ? "bg-green-600 text-white hover:bg-green-700" : ""}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {showMatchModal && selectedMatchId && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Edit match</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Challenger score</Label>
                        <Input
                          type="number"
                          value={matchScores.p1}
                          onChange={(e) => setMatchScores((prev) => ({ ...prev, p1: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Challenged score</Label>
                        <Input
                          type="number"
                          value={matchScores.p2}
                          onChange={(e) => setMatchScores((prev) => ({ ...prev, p2: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveMatch} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Match"}
                      </Button>
                      <Button variant="destructive" onClick={handleRemoveMatch} disabled={saving}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Match
                      </Button>
                      <Button variant="outline" onClick={() => setShowMatchModal(false)}>
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdmin;
