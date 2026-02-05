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
  ladder_id?: string | null;
  round_label?: string | null;
}

interface LadderRow {
  id: string;
  name: string | null;
  type: "singles" | "doubles";
  club_id?: string | null;
}

interface LadderMembershipRow {
  id: string;
  ladder_id: string;
  player_id: string;
  partner_id: string | null;
  rank: number | null;
}

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const formatLadderName = (name?: string | null, fallback?: string) => {
    if (!name) return fallback || "Ladder";
    return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
  };

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminClubs, setAdminClubs] = useState<string[]>([]);
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
  const [ladders, setLadders] = useState<LadderRow[]>([]);
  const [selectedLadderId, setSelectedLadderId] = useState<string>("");
  const [ladderMemberships, setLadderMemberships] = useState<LadderMembershipRow[]>([]);
  const [ladderLoading, setLadderLoading] = useState(false);
  const [selectedRoundLabel, setSelectedRoundLabel] = useState<string>("");

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
        const isAdmin = Boolean((me as any).is_admin || (me as any).is_super_admin);
        setIsSuperAdmin(Boolean((me as any).is_super_admin));
        const clubs = Array.isArray((me as any).clubs) ? (me as any).clubs : [];
        setAuthorized(isAdmin);
        setAdminClubs(clubs);
        if (!isAdmin) {
          setLoading(false);
          return;
        }
        const clubsData = await loadClubs();
        const fallbackClub = me.is_super_admin
          ? clubsData?.[0]?.id || ""
          : (Array.isArray(me.clubs) ? me.clubs[0] : "") || "";
        setSelectedClubId(fallbackClub);
        await Promise.all([loadPlayers(clubs), loadMatches()]);
      } catch (err: any) {
        console.error("Admin load error", err);
        toast({
          title: "Access denied",
          description: "Admin access required.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    const loadPlayers = async (clubs: string[]) => {
      const { data, error } = await (supabase as any)
        .from("players")
        .select("id,name,email,rank,wins,losses,clubs,avatar_url")
        .order("rank", { ascending: true });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const filtered =
        Array.isArray(clubs) && clubs.length
          ? rows.filter((p: any) => Array.isArray(p?.clubs) && p.clubs.some((c: string) => clubs.includes(c)))
          : rows;
      setPlayers(filtered as PlayerRow[]);
      if (filtered && filtered.length) {
        setSelectedPlayerId(filtered[0].id);
        setSelectedPlayerRank(filtered[0].rank);
      }
    };

    const loadMatches = async () => {
      const { data, error } = await (supabase as any)
        .from("matches")
        .select(
          "id,ladder_id,round_label,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = Array.isArray(data) ? (data as MatchRow[]) : [];
      setMatches(rows);
      if (rows.length) {
        setSelectedMatchId(rows[0].id);
        setMatchScores({
          p1: rows[0].player1_score?.toString() || "",
          p2: rows[0].player2_score?.toString() || "",
        });
      }
    };

    bootstrap();
  }, [navigate, toast]);

  useEffect(() => {
    const loadLadders = async () => {
      if (!authorized) return;
      setLadderLoading(true);
      try {
        let clubIds: string[] = [];
        if (isSuperAdmin) {
          clubIds = selectedClubId ? [selectedClubId] : clubs.map((c) => c.id);
        } else {
          clubIds = adminClubs;
        }

        if (!clubIds.length) {
          setLadders([]);
          setSelectedLadderId("");
          return;
        }

        const { data, error } = await (supabase as any)
          .from("ladders")
          .select("id,name,type,club_id")
          .in("club_id", clubIds);
        if (error) throw error;
        const safe = (data as LadderRow[]) || [];
        setLadders(safe);
        if (!selectedLadderId && safe.length) {
          const singles = safe.find((l) => l.type === "singles");
          setSelectedLadderId((singles || safe[0]).id);
        }
      } catch (error) {
        console.error("Ladders load error", error);
        setLadders([]);
        setSelectedLadderId("");
      } finally {
        setLadderLoading(false);
      }
    };

    loadLadders();
  }, [authorized, adminClubs, clubs, isSuperAdmin, selectedClubId, selectedLadderId]);

  useEffect(() => {
    const loadMemberships = async () => {
      if (!selectedLadderId) {
        setLadderMemberships([]);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("ladder_memberships")
        .select("id,ladder_id,player_id,partner_id,rank")
        .eq("ladder_id", selectedLadderId);
      if (error) {
        console.error("Ladder memberships load error", error);
        setLadderMemberships([]);
        return;
      }
      setLadderMemberships((data as LadderMembershipRow[]) || []);
      if (data && data.length) {
        const sorted = [...data].sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0));
        setSelectedPlayerId(sorted[0].id);
        setSelectedPlayerRank(Number(sorted[0].rank ?? 1));
      } else {
        setSelectedPlayerId("");
        setSelectedPlayerRank(1);
      }
    };

    loadMemberships();
  }, [selectedLadderId]);

  const loadClubs = async () => {
    const { data, error } = await (supabase as any).from("clubs").select("id,name,city").order("name");
    if (error) {
      console.error("Clubs load error", error);
      return [];
    }
    const safe = Array.isArray(data) ? data : [];
    setClubs(safe);
    return safe;
  };

  const visiblePlayers = useMemo(() => {
    const base = Array.isArray(players) ? players : [];
    const allowedClubIds = isSuperAdmin
      ? (selectedClubId ? [selectedClubId] : clubs.map((c) => c.id))
      : adminClubs;

    if (allowedClubIds.length === 0) return base.filter((p) => p?.id);

    return base.filter((p) => {
      const clubIds = Array.isArray(p?.clubs) ? p.clubs : [];
      if (selectedClubId) {
        return p?.id && clubIds.includes(selectedClubId);
      }
      return p?.id && clubIds.some((c: string) => allowedClubIds.includes(c));
    });
  }, [players, adminClubs, selectedClubId, isSuperAdmin, clubs]);

  const visibleMatches = useMemo(() => {
    const ids = new Set(visiblePlayers.map((p) => p.id));
    const inClub = matches.filter((m) => ids.has(m.challenger_id) || ids.has(m.challenged_id));
    if (!selectedLadderId) return inClub;
    return inClub.filter((m) => (m as any).ladder_id === selectedLadderId);
  }, [matches, visiblePlayers, selectedClubId, selectedLadderId]);

  const roundOptions = useMemo(() => {
    const labels = new Set<string>();
    visibleMatches.forEach((m: any) => {
      if (m.round_label) labels.add(m.round_label);
    });
    const parseLabel = (label: string) => {
      const match = label.match(/^(\d{4})-R(\d+)$/);
      if (!match) return { year: 0, round: 0 };
      return { year: parseInt(match[1], 10), round: parseInt(match[2], 10) };
    };
    return Array.from(labels).sort((a, b) => {
      const pa = parseLabel(a);
      const pb = parseLabel(b);
      if (pa.year !== pb.year) return pb.year - pa.year;
      return pb.round - pa.round;
    });
  }, [visibleMatches]);

  const filteredMatches = useMemo(() => {
    const parseLabel = (label?: string | null) => {
      if (!label) return { year: 0, round: 0 };
      const match = label.match(/^(\d{4})-R(\d+)$/);
      if (!match) return { year: 0, round: 0 };
      return { year: parseInt(match[1], 10), round: parseInt(match[2], 10) };
    };
    const base = selectedRoundLabel
      ? visibleMatches.filter((m: any) => m.round_label === selectedRoundLabel)
      : visibleMatches;
    return [...base].sort((a: any, b: any) => {
      const ra = parseLabel(a.round_label);
      const rb = parseLabel(b.round_label);
      if (ra.year !== rb.year) return rb.year - ra.year;
      if (ra.round !== rb.round) return rb.round - ra.round;
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [visibleMatches, selectedRoundLabel]);

  const playerLookup = useMemo(() => {
    return visiblePlayers.reduce<Record<string, PlayerRow>>((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }, [visiblePlayers]);

  const selectedLadder = useMemo(
    () => ladders.find((l) => l.id === selectedLadderId) || null,
    [ladders, selectedLadderId]
  );

  const ladderRanking = useMemo(() => {
    if (!selectedLadderId) return [];
    const rows = ladderMemberships.filter((m) => m.ladder_id === selectedLadderId);
    return rows
      .map((row) => {
        const player = playerLookup[row.player_id];
        const partner = row.partner_id ? playerLookup[row.partner_id] : null;
        const displayName =
          selectedLadder?.type === "doubles" && partner
            ? `${player?.name || "Player"} & ${partner?.name || "Player"}`
            : player?.name || "Player";
        const wins =
          selectedLadder?.type === "doubles"
            ? (player?.wins || 0) + (partner?.wins || 0)
            : player?.wins || 0;
        const losses =
          selectedLadder?.type === "doubles"
            ? (player?.losses || 0) + (partner?.losses || 0)
            : player?.losses || 0;
        return {
          membershipId: row.id,
          rank: row.rank ?? 0,
          displayName,
          email: player?.email || "",
          wins,
          losses,
        };
      })
      .sort((a, b) => a.rank - b.rank);
  }, [ladderMemberships, playerLookup, selectedLadderId, selectedLadder?.type]);

  const teamNameByPlayerId = useMemo(() => {
    const map: Record<string, string> = {};
    ladderMemberships.forEach((row) => {
      const player = playerLookup[row.player_id];
      const partner = row.partner_id ? playerLookup[row.partner_id] : null;
      if (row.partner_id && selectedLadder?.type === "doubles") {
        const name = `${player?.name || "Player"} & ${partner?.name || "Player"}`;
        map[row.player_id] = name;
        map[row.partner_id] = name;
      } else if (player) {
        map[row.player_id] = player.name;
      }
    });
    return map;
  }, [ladderMemberships, playerLookup, selectedLadder?.type]);

  const selectedClubName = useMemo(() => {
    if (isSuperAdmin) {
      if (!selectedClubId) return "";
      return clubs.find((c) => c.id === selectedClubId)?.name || "";
    }
    const clubFromList = clubs.find((c) => (adminClubs || []).includes(c.id));
    if (clubFromList) return clubFromList.name;
    if (adminClubs.length) {
      return clubs.find((c) => c.id === adminClubs[0])?.name || "";
    }
    return "";
  }, [isSuperAdmin, selectedClubId, clubs, adminClubs]);

  const clubLabel = useMemo(() => {
    if (isSuperAdmin) {
      if (selectedClubId) {
        const name = clubs.find((c) => c.id === selectedClubId)?.name;
        return name || "Selected club";
      }
      const names = clubs.map((c) => c.name).filter(Boolean);
      return names.length ? names.join(", ") : "All clubs";
    }
    const names = clubs
      .filter((c) => (adminClubs || []).includes(c.id))
      .map((c) => c.name)
      .filter(Boolean);
    if (names.length) return names.join(", ");
    if (adminClubs.length) return "Your club";
    return "All clubs";
  }, [isSuperAdmin, selectedClubId, clubs, adminClubs]);

  const selectPlayer = (id: string) => {
    const member = ladderRanking.find((r) => r.membershipId === id);
    setSelectedPlayerId(id);
    setSelectedPlayerRank(member?.rank ?? 1);
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

  const reorderAndSaveRanks = async (membershipId: string, newRank: number) => {
    if (!selectedLadderId) return;
    const current = ladderMemberships.filter((m) => m.ladder_id === selectedLadderId);
    const target = current.find((m) => m.id === membershipId);
    if (!target) return;

    const ordered = [...current].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    const without = ordered.filter((m) => m.id !== membershipId);
    const idx = Math.max(0, Math.min(newRank - 1, without.length));
    without.splice(idx, 0, target);
    const updates = without.map((m, i) => ({ id: m.id, rank: i + 1 }));

    await Promise.all(
      updates.map((u) =>
        (supabase as any).from("ladder_memberships").update({ rank: u.rank }).eq("id", u.id)
      )
    );

    setLadderMemberships((prev) =>
      prev.map((m) => {
        const upd = updates.find((u) => u.id === m.id);
        return upd ? { ...m, rank: upd.rank } : m;
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
            <p className="text-red-700">Only club admins can access this page.</p>
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
      {isSuperAdmin && (
        <div className="absolute top-4 right-4 z-10">
          <ProfileDropdown />
        </div>
      )}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Control
            </h1>
            <p className="text-green-600">Manage rankings and matches for your clubs.</p>
          </div>
          {!isSuperAdmin && (
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          )}
        </div>

        {isSuperAdmin && (
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
        )}

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
            <div className="mb-4">
              <Label className="text-xs">Select ladder</Label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={selectedLadderId}
                onChange={(e) => setSelectedLadderId(e.target.value)}
                disabled={ladderLoading || ladders.length === 0}
              >
                <option value="" disabled>
                  {ladderLoading ? "Loading ladders..." : "Select ladder"}
                </option>
                {[...ladders]
                  .sort((a, b) => {
                    if (a.type === b.type) return (a.name || "").localeCompare(b.name || "");
                    return a.type === "singles" ? -1 : 1;
                  })
                  .map((ladder) => (
                    <option key={ladder.id} value={ladder.id}>
                      {formatLadderName(ladder.name, ladder.type)} ({ladder.type})
                    </option>
                  ))}
              </select>
            </div>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players
                </CardTitle>
                <p className="text-sm text-gray-600">{clubLabel}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                  {ladderRanking.length === 0 && <p className="text-sm text-gray-600">No ladder members found.</p>}
                  {ladderRanking.map((p) => {
                      const isSelected = selectedPlayerId === p.membershipId;
                      return (
                        <div
                          key={p.membershipId}
                          onClick={() => selectPlayer(p.membershipId)}
                          className={`border rounded-md px-3 py-2 bg-white flex items-center justify-between cursor-pointer transition-all ${
                            isSelected ? "ring-2 ring-green-500 bg-green-50 shadow-green-200 shadow" : ""
                          }`}
                        >
                          <div>
                            <div className="font-semibold">
                              #{p.rank} {p.displayName}
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
                                selectPlayer(p.membershipId);
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
                      const p = ladderRanking.find((r) => r.membershipId === selectedPlayerId);
                      if (!p) return <p className="text-sm text-gray-600">Player not found.</p>;
                      return (
                        <>
                          <div>
                            <div className="font-semibold">{p.displayName}</div>
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
                            <Button
                              onClick={handleSaveRank}
                              disabled={saving}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
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
          <div className="grid grid-cols-1 gap-4">
            <div className="lg:col-span-2 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Select ladder</Label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={selectedLadderId}
                  onChange={(e) => {
                    setSelectedLadderId(e.target.value);
                    setSelectedRoundLabel("");
                  }}
                  disabled={ladderLoading || ladders.length === 0}
                >
                  <option value="" disabled>
                    {ladderLoading ? "Loading ladders..." : "Select ladder"}
                  </option>
                  {[...ladders]
                    .sort((a, b) => {
                      if (a.type === b.type) return (a.name || "").localeCompare(b.name || "");
                      return a.type === "singles" ? -1 : 1;
                    })
                    .map((ladder) => (
                      <option key={ladder.id} value={ladder.id}>
                        {formatLadderName(ladder.name, ladder.type)} ({ladder.type})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Select round</Label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={selectedRoundLabel}
                  onChange={(e) => setSelectedRoundLabel(e.target.value)}
                  disabled={!roundOptions.length}
                >
                  <option value="">All rounds</option>
                  {roundOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Matches
                </CardTitle>
                <p className="text-sm text-gray-600">{clubLabel}</p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
                {filteredMatches.length === 0 && <p className="text-sm text-gray-600">No matches found.</p>}
                {filteredMatches.map((m) => {
                  const challenger = playerLookup[m.challenger_id];
                  const challenged = playerLookup[m.challenged_id];
                  const challengerName =
                    teamNameByPlayerId[m.challenger_id] || challenger?.name || "Player";
                  const challengedName =
                    teamNameByPlayerId[m.challenged_id] || challenged?.name || "Player";
                  return (
                    <div
                      key={m.id}
                      className={`border rounded-md px-3 py-2 bg-white cursor-pointer flex items-center justify-between ${selectedMatchId === m.id ? "ring-2 ring-green-500 bg-green-50 shadow-green-200 shadow" : ""}`}
                      onClick={() => selectMatch(m.id)}
                    >
                      <div>
                        <div className="font-semibold">
                          {challengerName} vs {challengedName}
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

export default Admin;
