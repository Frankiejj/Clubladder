import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ListOrdered, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClubs } from "@/hooks/useClubs";

type LadderRow = {
  id: string;
  name: string | null;
  type: "singles" | "doubles";
  club_id: string;
};

type MembershipRow = {
  id?: string;
  ladder_id: string;
  player_id: string;
  match_frequency: number | null;
  partner_id?: string | null;
  rank?: number | null;
  team_avatar_url?: string | null;
  is_partner?: boolean;
};

const MEMBERSHIP_TABLES = ["ladder_memberships"];

const formatLadderName = (name?: string | null, fallback?: string) => {
  if (!name) return fallback || "Ladder";
  return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
};

const MyLadder = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clubs } = useClubs();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [player, setPlayer] = useState<{
    id: string;
    email: string;
    clubs: string[];
    singlesMatchFrequency: number | null;
  } | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [ladders, setLadders] = useState<LadderRow[]>([]);
  const [laddersLoading, setLaddersLoading] = useState(false);
  const [membershipsByLadder, setMembershipsByLadder] = useState<Record<string, MembershipRow>>({});
  const [membershipTable, setMembershipTable] = useState<string | null>(null);
  const [frequencyByLadder, setFrequencyByLadder] = useState<Record<string, number>>({});
  const [partnerByLadder, setPartnerByLadder] = useState<Record<string, string>>({});
  const [teamAvatarFileByLadder, setTeamAvatarFileByLadder] = useState<Record<string, File | null>>({});
  const [teamAvatarPreviewByLadder, setTeamAvatarPreviewByLadder] = useState<Record<string, string>>({});
  const [clubPlayers, setClubPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [savingLadderId, setSavingLadderId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;
        if (!user?.email) {
          navigate("/auth");
          return;
        }

        const { data: playerRow, error } = await (supabase as any)
          .from("players")
          .select("id,email,clubs,singles_match_frequency")
          .eq("email", user.email)
          .maybeSingle();

        if (error || !playerRow) {
          throw error || new Error("Player not found");
        }

        const clubIds = (playerRow.clubs || []).filter(Boolean);
        setPlayer({
          id: playerRow.id,
          email: playerRow.email,
          clubs: clubIds,
          singlesMatchFrequency:
            typeof playerRow.singles_match_frequency === "number"
              ? playerRow.singles_match_frequency
              : null,
        });
        setSelectedClubId(clubIds[0] || "");

        const membershipResult = await fetchMemberships(playerRow.id);
        setMembershipTable(membershipResult.table);
        setMembershipsByLadder(membershipResult.byLadder);
      } catch (err: any) {
        console.error("My Ladder load error", err);
        const message = err?.message || "Could not load your ladder settings.";
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

    loadProfile();
  }, [navigate, toast]);

  useEffect(() => {
    const loadLadders = async () => {
      if (!selectedClubId) {
        setLadders([]);
        setClubPlayers([]);
        return;
      }
      setLaddersLoading(true);
      const { data, error } = await (supabase as any)
        .from("ladders")
        .select("id,name,type,club_id")
        .eq("club_id", selectedClubId);
      if (error) {
        toast({
          title: "Could not load ladders",
          description: error.message,
          variant: "destructive",
        });
        setLadders([]);
      } else {
        setLadders((data as LadderRow[]) || []);
      }
      setLaddersLoading(false);
    };

    const loadClubPlayers = async () => {
      if (!selectedClubId) {
        setClubPlayers([]);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("players")
        .select("id,name,clubs")
        .contains("clubs", [selectedClubId]);
      if (error) {
        console.error("Error loading club players", error);
        setClubPlayers([]);
        return;
      }
      setClubPlayers((data as any[]) || []);
    };

    loadLadders();
    loadClubPlayers();
  }, [selectedClubId, toast]);

  useEffect(() => {
    if (!player) return;
    setFrequencyByLadder((prev) => {
      const next = { ...prev };
      ladders.forEach((ladder) => {
        if (typeof next[ladder.id] === "number") return;
        const membership = membershipsByLadder[ladder.id];
        const fallback =
          membership?.match_frequency ??
          (ladder.type === "singles" ? player.singlesMatchFrequency : 1) ??
          1;
        next[ladder.id] = fallback;
      });
      return next;
    });

    setPartnerByLadder((prev) => {
      const next = { ...prev };
      ladders.forEach((ladder) => {
        if (next[ladder.id]) return;
        const membership = membershipsByLadder[ladder.id];
        if (membership?.partner_id && !membership.is_partner) {
          next[ladder.id] = membership.partner_id;
        } else if (membership?.is_partner && membership.player_id) {
          next[ladder.id] = membership.player_id;
        }
      });
      return next;
    });

    setTeamAvatarPreviewByLadder((prev) => {
      const next = { ...prev };
      ladders.forEach((ladder) => {
        if (next[ladder.id]) return;
        const membership = membershipsByLadder[ladder.id];
        if (membership?.team_avatar_url) {
          next[ladder.id] = membership.team_avatar_url;
        }
      });
      return next;
    });
  }, [ladders, membershipsByLadder, player]);

  const availableClubs = useMemo(() => {
    if (!player) return [];
    const clubIds = player.clubs || [];
    return clubIds.map((id) => clubs.find((c) => c.id === id) || { id, name: id, city: "" });
  }, [clubs, player]);

  const handleSave = async (ladder: LadderRow) => {
    if (!player) return;
    if (!membershipTable) {
      toast({
        title: "Ladder sign-up unavailable",
        description: "Membership table is missing. Please contact an admin.",
        variant: "destructive",
      });
      return;
    }

    const frequency = frequencyByLadder[ladder.id] ?? 1;
    const partnerId = ladder.type === "doubles" ? (partnerByLadder[ladder.id] || null) : null;
    const membership = membershipsByLadder[ladder.id];
    const hasMembership = Boolean(membership);
    const isPartnerMembership = Boolean(membership?.is_partner);
    const teamAvatarFile = teamAvatarFileByLadder[ladder.id] || null;

    setSavingLadderId(ladder.id);
    try {
      let uploadedTeamAvatarUrl: string | null = teamAvatarPreviewByLadder[ladder.id] || null;
      if (ladder.type === "doubles" && teamAvatarFile) {
        const ext = teamAvatarFile.name.split(".").pop() || "jpg";
        const filePath = `${ladder.id}/${player.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await (supabase.storage.from("team-avatars") as any).upload(
          filePath,
          teamAvatarFile,
          { upsert: true }
        );
        if (uploadError) {
          toast({
            title: "Team avatar upload failed",
            description: uploadError.message,
            variant: "destructive",
          });
          setSavingLadderId(null);
          return;
        }
        const { data: publicUrlData } = (supabase.storage.from("team-avatars") as any).getPublicUrl(filePath);
        uploadedTeamAvatarUrl = publicUrlData?.publicUrl ?? null;
      }
      if (hasMembership) {
        const { error } = await (supabase as any)
          .from(membershipTable)
          .update({
            match_frequency: frequency,
            partner_id: partnerId,
            team_avatar_url: ladder.type === "doubles" ? uploadedTeamAvatarUrl : null,
          })
          .eq("id", membership?.id);
        if (error) throw error;
      } else {
        // Assign lowest rank (append to bottom) within this ladder
        let nextRank = 1;
        const { data: rankRows, error: rankError } = await (supabase as any)
          .from("ladder_memberships")
          .select("rank")
          .eq("ladder_id", ladder.id)
          .order("rank", { ascending: false })
          .limit(1);
        if (rankError) {
          console.error("Error loading ladder ranks", rankError);
        } else {
          const top = (rankRows as any[] | null)?.[0]?.rank;
          if (Number.isFinite(top)) {
            nextRank = Number(top) + 1;
          }
        }

        const { error: joinError } = await (supabase as any)
          .rpc("join_ladder", {
            p_ladder_id: ladder.id,
            p_player_id: player.id,
            p_partner_id: partnerId,
            p_match_frequency: frequency,
            p_team_avatar_url: ladder.type === "doubles" ? uploadedTeamAvatarUrl : null,
          });
        if (joinError) throw joinError;
      }

      if (ladder.type === "singles") {
        const { error: playerError } = await (supabase as any)
          .from("players")
          .update({ singles_match_frequency: frequency })
          .eq("id", player.id);
        if (playerError) {
          toast({
            title: "Saved, but frequency update failed",
            description: playerError.message,
            variant: "destructive",
          });
        } else {
          setPlayer((prev) => (prev ? { ...prev, singlesMatchFrequency: frequency } : prev));
        }
      }

      const membershipResult = await fetchMemberships(player.id);
      setMembershipsByLadder(membershipResult.byLadder);
      if (ladder.type === "doubles" && teamAvatarFile) {
        setTeamAvatarPreviewByLadder((prev) => ({ ...prev, [ladder.id]: uploadedTeamAvatarUrl || "" }));
        setTeamAvatarFileByLadder((prev) => ({ ...prev, [ladder.id]: null }));
      }

      toast({
        title: hasMembership ? "Settings updated" : "Joined ladder",
        description: formatLadderName(ladder.name, ladder.type),
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update ladder settings.",
        variant: "destructive",
      });
    } finally {
      setSavingLadderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Loading ladder settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Could not load ladder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              {loadError || "Something went wrong while loading your ladder."}
            </p>
            <div className="flex justify-center">
              <Link to="/login">
                <Button>Back to login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-2 sm:px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link to="/">
            <Button className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
            <ListOrdered className="h-7 w-7 sm:h-8 sm:w-8" />
            My Ladders
          </h1>
          <p className="text-md sm:text-lg text-green-600">
            Join your club ladder and set your match frequency
          </p>
        </div>

        <Card className="shadow-xl w-full max-w-full overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <ListOrdered className="h-6 w-6" />
              Ladder Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700">Club</Label>
              {availableClubs.length ? (
                <Select
                  value={selectedClubId || "none"}
                  onValueChange={(value) => setSelectedClubId(value === "none" ? "" : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No club selected</SelectItem>
                    {availableClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                        {"city" in club && club.city ? ` (${club.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-2 p-3 border rounded-md bg-muted">
                  No club assigned to your profile.
                </div>
              )}
            </div>

            {!membershipTable && (
              <div className="p-3 rounded-md border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
                Ladder sign-up is not available because the membership table is missing.
              </div>
            )}

            {selectedClubId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-700 border-b pb-2">
                  Available Ladders
                </h3>

                {laddersLoading ? (
                  <p className="text-gray-600">Loading ladders...</p>
                ) : ladders.length === 0 ? (
                  <p className="text-gray-600">No ladders available for this club.</p>
                ) : (
                  <div className="grid gap-4 w-full">
                    {[...ladders].sort((a, b) => {
                      if (a.type === b.type) return (a.name || "").localeCompare(b.name || "");
                      return a.type === "singles" ? -1 : 1;
                    }).map((ladder) => {
                      const membership = membershipsByLadder[ladder.id];
                      const isPartnerMembership = Boolean(membership?.is_partner);
                      const frequencyValue = frequencyByLadder[ladder.id] ?? 1;
                      const partnerValue = partnerByLadder[ladder.id] || "none";
                      const requiresPartner = ladder.type === "doubles";
                      const canJoinDoubles =
                        !requiresPartner || (partnerValue !== "none" && partnerValue !== "");
                      return (
                        <Card key={ladder.id} className="border border-green-100 w-full max-w-full overflow-hidden">
                          <CardContent className="p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <div className="text-lg font-semibold text-green-800">
                                  {formatLadderName(ladder.name, "Club Ladder")}
                                </div>
                                <div className="text-sm text-gray-500 capitalize">{ladder.type}</div>
                              </div>
                              <div className="text-sm">
                                {membership ? (
                                  <span className="inline-flex items-center gap-2 text-emerald-700 font-medium">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                    You're a member
                                  </span>
                                ) : (
                                  <span className="text-gray-500">Not joined</span>
                                )}
                              </div>
                            </div>

                            {ladder.type === "doubles" && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  Doubles partner (same club)
                                </Label>
                                <Select
                                  value={partnerValue}
                                  onValueChange={(value) => {
                                    const nextValue = value === "none" ? "" : value;
                                    setPartnerByLadder((prev) => ({
                                      ...prev,
                                      [ladder.id]: nextValue,
                                    }));
                                  }}
                                  disabled={clubPlayers.length === 0 || Boolean(membership)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select partner" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No partner</SelectItem>
                                    {clubPlayers
                                      .filter((p) => p.id !== player.id)
                                      .map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                    {clubPlayers.length <= 1 && (
                                      <SelectItem value="no-partners" disabled>
                                        No club players available
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                {membership && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Leave the ladder to change partner.
                                  </p>
                                )}
                              </div>
                            )}

                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Match frequency per round (2 weeks)
                              </Label>
                              <Select
                                value={frequencyValue.toString()}
                                onValueChange={(value) =>
                                  setFrequencyByLadder((prev) => ({
                                    ...prev,
                                    [ladder.id]: parseInt(value, 10),
                                  }))
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0</SelectItem>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {ladder.type === "doubles" && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  Team avatar
                                </Label>
                                <div className="mt-2 flex items-center gap-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage
                                      src={teamAvatarPreviewByLadder[ladder.id] || undefined}
                                      alt="Team avatar"
                                    />
                                    <AvatarFallback className="bg-green-100 text-green-700">TM</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setTeamAvatarFileByLadder((prev) => ({ ...prev, [ladder.id]: file }));
                                        setTeamAvatarPreviewByLadder((prev) => ({
                                          ...prev,
                                          [ladder.id]: file ? URL.createObjectURL(file) : prev[ladder.id],
                                        }));
                                      }}
                                    />
                                    <p className="text-xs text-gray-500">
                                      Upload a team image for this doubles ladder.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-start items-start gap-2">
                              {membership && (
                                <Button
                                  variant="destructive"
                                  onClick={async () => {
                                    if (!membershipTable) return;
                                    const ok = window.confirm("Leave this ladder?");
                                      if (!ok) return;
                                      setSavingLadderId(ladder.id);
                                  let membershipId = membership?.id || null;
                                  if (!membershipId) {
                                    const latest = await fetchMemberships(player.id);
                                    setMembershipsByLadder(latest.byLadder);
                                    membershipId = latest.byLadder[ladder.id]?.id || null;
                                  }

                                  if (!membershipId) {
                                    setSavingLadderId(null);
                                    toast({
                                      title: "Leave failed",
                                      description: "No membership found for this ladder.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  const leaveResponse =
                                    ladder.type === "doubles"
                                      ? await (supabase as any)
                                          .from(membershipTable)
                                          .delete()
                                          .eq("ladder_id", ladder.id)
                                          .or(`player_id.eq.${player.id},partner_id.eq.${player.id}`)
                                      : await (supabase as any)
                                          .from(membershipTable)
                                          .delete()
                                          .eq("ladder_id", ladder.id)
                                          .eq("player_id", player.id);
                                  const error = leaveResponse?.error;
                                  setSavingLadderId(null);
                                  if (error) {
                                    toast({
                                      title: "Leave failed",
                                      description: error.message,
                                      variant: "destructive",
                                      });
                                      return;
                                    }
                                      const membershipResult = await fetchMemberships(player.id);
                                      setMembershipsByLadder(membershipResult.byLadder);
                                      setPartnerByLadder((prev) => {
                                        const next = { ...prev };
                                        delete next[ladder.id];
                                        return next;
                                      });
                                      setFrequencyByLadder((prev) => {
                                        const next = { ...prev };
                                        delete next[ladder.id];
                                        return next;
                                      });
                                      setTeamAvatarPreviewByLadder((prev) => {
                                        const next = { ...prev };
                                        delete next[ladder.id];
                                        return next;
                                      });
                                      setTeamAvatarFileByLadder((prev) => {
                                        const next = { ...prev };
                                        delete next[ladder.id];
                                        return next;
                                      });
                                      if (isPartnerMembership) {
                                        toast({
                                          title: "Left ladder",
                                          description: formatLadderName(ladder.name, ladder.type),
                                        });
                                        return;
                                      }
                                      if (membershipResult.byLadder[ladder.id]) {
                                        toast({
                                          title: "Leave failed",
                                          description: "Membership still exists after delete.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }
                                      toast({
                                        title: "Left ladder",
                                        description: formatLadderName(ladder.name, ladder.type),
                                      });
                                    }}
                                  disabled={!membershipTable || savingLadderId === ladder.id}
                                >
                                  Leave ladder
                                </Button>
                              )}
                              <Button
                                onClick={() => handleSave(ladder)}
                                disabled={
                                  !membershipTable ||
                                  savingLadderId === ladder.id ||
                                  (!membership && requiresPartner && !canJoinDoubles)
                                }
                                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                              >
                                <Save className="h-4 w-4" />
                                {savingLadderId === ladder.id
                                  ? "Saving..."
                                  : membership
                                  ? "Update"
                                  : "Join ladder"}
                              </Button>
                              {!membership && requiresPartner && !canJoinDoubles && (
                                <p className="text-xs text-red-600 mt-2">
                                  Select a doubles partner to join this ladder.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const fetchMemberships = async (playerId: string) => {
  for (const table of MEMBERSHIP_TABLES) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("id,ladder_id,player_id,match_frequency,partner_id,team_avatar_url")
      .or(`player_id.eq.${playerId},partner_id.eq.${playerId}`);

    if (error) {
      if (error.code === "42P01") {
        continue;
      }
      throw error;
    }

    const rows = (data as MembershipRow[]) || [];
    const byLadder = rows.reduce<Record<string, MembershipRow>>((acc, row) => {
      const isPartner = row.partner_id === playerId && row.player_id !== playerId;
      if (!acc[row.ladder_id] || !isPartner) {
        acc[row.ladder_id] = { ...row, is_partner: isPartner };
      }
      return acc;
    }, {});
    return { table, rows, byLadder };
  }

  return { table: null, rows: [], byLadder: {} };
};

export default MyLadder;
