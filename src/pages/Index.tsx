import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";

import { ProfileDropdown } from "@/components/ProfileDropdown";
import { PlayerCard } from "@/components/PlayerCard";
import { RemovePlayerModal } from "@/components/RemovePlayerModal";
import { PendingMatches } from "@/components/PendingMatches";
import { Header } from "@/components/Header";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  // --------------------------
  // AUTHENTICATION
  // --------------------------
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Supabase session user (email etc.)
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Fetch session user on startup
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data?.user ?? null);
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      else setIsAuthenticated(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
        if (!session) navigate("/login");
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // --------------------------
  // DATA
  // --------------------------
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);

  // --------------------------
  // UI STATE
  // --------------------------
  const [activeView, setActiveView] = useState<"rankings" | "matches">("rankings");
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // --------------------------
  // HANDLERS
  // --------------------------
  const handleChallenge = (playerId: string) => {
    console.log("Challenge clicked for player:", playerId);
  };

  const handleViewMatch = (challengeId: string) => {
    console.log("View match clicked:", challengeId);
  };

  // --------------------------
  // LOAD DATA WHEN AUTH READY
  // --------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    loadPlayers();
    loadChallenges();
    loadClubs();
  }, [isAuthenticated]);

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select(
        "id,name,email,gender,rank,wins,losses,singles_rating,doubles_rating,singles_match_frequency,is_admin,clubs,created_at,phone,avatar_url"
      )
      .order("rank", { ascending: true });

    if (error || !data) {
      console.error("Error loading players:", error);
      return;
    }

    setPlayers(
      (data as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        gender: row.gender,
        rank: row.rank,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        singlesRating: row.singles_rating,
        doublesRating: row.doubles_rating,
        matchFrequency: row.singles_match_frequency ?? null,
        singlesMatchFrequency: row.singles_match_frequency ?? null,
        doublesMatchFrequency: null,
        isAdmin: row.is_admin ?? false,
        clubs: row.clubs ?? null,
        createdAt: row.created_at,
        phone: row.phone ?? null,
        avatarUrl: row.avatar_url ?? null,
        avatar_url: row.avatar_url ?? null,
      }))
    );
  }

  async function loadChallenges() {
    const { data, error } = await supabase
      .from("matches")
      .select(
        "id,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error loading challenges:", error);
      return;
    }

    setChallenges(
      (data as any[]).map((row) => ({
        id: row.id,
        challengerId: row.challenger_id,
        challengedId: row.challenged_id,
        status: row.status as Challenge["status"],
        scheduledDate: row.scheduled_date,
        winnerId: row.winner_id,
        score: row.score,
        player1Score: row.player1_score,
        player2Score: row.player2_score,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );
  }

  async function loadClubs() {
    const { data, error } = await supabase.from("clubs").select("*");

    if (error) {
      console.error("Error loading clubs:", error);
      return;
    }

    setClubs(data);
  }

  async function removePlayer(playerId: string) {
    const { error } = await (supabase as any)
      .from("players")
      .delete()
      .eq("id", playerId);
    if (error) console.error(error);

    await loadPlayers();
  }

  async function handleMatchResult(
    challengeId: string,
    winnerId: string | null,
    score1?: number,
    score2?: number
  ) {
    const scoreString =
      typeof score1 === "number" && typeof score2 === "number"
        ? `${score1}-${score2}`
        : null;
    const completionDate = new Date();
    completionDate.setSeconds(0, 0);

    const { error } = await (supabase as any)
      .from("matches")
      .update({
        winner_id: winnerId,
        player1_score: score1 ?? null,
        player2_score: score2 ?? null,
        score: scoreString,
        status: "completed",
        scheduled_date: completionDate.toISOString(),
      })
      .eq("id", challengeId);

    if (error) console.error(error);

    await loadChallenges();
    await loadPlayers();
  }

  // --------------------------
  // FIXED USER LOGIC (THE IMPORTANT PART!)
  // --------------------------
  const currentUser = players.find(
    (p) => p.email?.toLowerCase() === sessionUser?.email?.toLowerCase()
  );

  const userClubIds = currentUser?.clubs ?? [];
  const visiblePlayers =
    userClubIds.length > 0
      ? players.filter((p) =>
          (p.clubs ?? []).some((clubId) => userClubIds.includes(clubId))
        )
      : players;
  const clubLabel = (() => {
    if (!userClubIds.length) return "All clubs";
    const names = clubs
      .filter((c) => userClubIds.includes(c.id))
      .map((c) => c.name)
      .filter(Boolean);
    if (!names.length) return "Your clubs";
    return `${names.join(", ")}`;
  })();

  // --------------------------
  // UI
  // --------------------------
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );

  if (!isAuthenticated) return null;

  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    // Primary: lower rank first
    if (a.rank !== b.rank) return a.rank - b.rank;

    const aMatches = (a.wins ?? 0) + (a.losses ?? 0);
    const bMatches = (b.wins ?? 0) + (b.losses ?? 0);
    const aWinRate = aMatches > 0 ? a.wins / aMatches : 0;
    const bWinRate = bMatches > 0 ? b.wins / bMatches : 0;

    // Secondary: higher win rate
    if (aWinRate !== bWinRate) return bWinRate - aWinRate;

    // Tertiary: more matches played
    if (aMatches !== bMatches) return bMatches - aMatches;

    // Next: higher singles rating
    const aSingles = a.singlesRating ?? 0;
    const bSingles = b.singlesRating ?? 0;
    if (aSingles !== bSingles) return bSingles - aSingles;

    // Finally: alphabetical name
    return a.name.localeCompare(b.name);
  });

  const headerCurrentUser = currentUser || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        
        {/* Top-right profile */}
        <div className="absolute top-4 right-4">
          <ProfileDropdown />
        </div>

        {headerCurrentUser && (
          <Header
            playersCount={visiblePlayers.length}
            onShowRemovePlayer={() => setShowRemovePlayerModal(true)}
            isAdmin={!!headerCurrentUser.isAdmin}
            currentUser={headerCurrentUser}
            onUpdateProfile={() => {}}
            challenges={challenges}
            players={players}
            onRemovePlayer={removePlayer}
          />
        )}

        <Card className="max-w-4xl mx-auto mt-6">
          <CardHeader>
            <CardTitle className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                {activeView === "rankings" ? (
                  <>
                    <Users className="w-5 h-5" />
                    Rankings
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    Matches
                  </>
                )}
              </div>
              <p className="text-base sm:text-lg font-semibold text-gray-700">{clubLabel}</p>
            </CardTitle>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => setActiveView("rankings")}
                variant={activeView === "rankings" ? "default" : "outline"}
                className={activeView === "rankings" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                Rankings
              </Button>
              <Button
                onClick={() => setActiveView("matches")}
                variant={activeView === "matches" ? "default" : "outline"}
                className={activeView === "matches" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                Matches
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {activeView === "rankings" ? (
              <div className="space-y-4">
                {sortedPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    players={players}
                    challenges={challenges}
                    onPlayerClick={setSelectedPlayer}
                    currentUserId={currentUser?.id}
                    onChallenge={handleChallenge}
                    onViewMatch={handleViewMatch}
                  />
                ))}
              </div>
            ) : (
              <PendingMatches
                challenges={challenges}
                players={players}
                onMatchResult={handleMatchResult}
                currentUser={currentUser}
              />
            )}
          </CardContent>
        </Card>

        <RemovePlayerModal
          isOpen={showRemovePlayerModal}
          onClose={() => setShowRemovePlayerModal(false)}
          players={players}
          onRemovePlayer={removePlayer}
        />

        <PlayerDetailsModal
          player={selectedPlayer}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          challenges={challenges}
          players={players}
          clubs={clubs}
        />
      </div>
    </div>
  );
}

