
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Player } from "@/types/Player";
import { Challenge } from "@/types/Challenge";
import { PendingMatches } from "@/components/PendingMatches";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MyMatches = () => {
  const location = useLocation();
  const state = location.state as { currentUser: Player; challenges: Challenge[]; players: Player[] } | null;
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<Player | null>(state?.currentUser ?? null);
  const [players, setPlayers] = useState<Player[]>(state?.players ?? []);
  const [challenges, setChallenges] = useState<Challenge[]>(state?.challenges ?? []);
  const [isLoading, setIsLoading] = useState(!state);
  const [userMatches, setUserMatches] = useState<Challenge[]>([]);

  // Fetch data if we didn't get it via navigation state
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        const sessionUser = sessionData.user;
        if (!sessionUser) throw new Error("No session");

        const { data: playersData, error: playersError } = await (supabase as any)
          .from("players")
          .select(
            "id,name,email,gender,rank,wins,losses,singles_match_frequency,is_admin,is_super_admin,clubs,created_at,phone,avatar_url"
          );
        if (playersError) throw playersError;
        const mappedPlayers: Player[] = (playersData || []).map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          gender: row.gender,
          rank: row.rank,
          wins: row.wins ?? 0,
          losses: row.losses ?? 0,
          matchFrequency: row.singles_match_frequency ?? null,
          singlesMatchFrequency: row.singles_match_frequency ?? null,
          doublesMatchFrequency: null,
          isAdmin: row.is_admin ?? false,
          isSuperAdmin: (row as any).is_super_admin ?? false,
          clubs: row.clubs ?? null,
          createdAt: row.created_at,
          phone: row.phone ?? null,
          avatarUrl: row.avatar_url ?? null,
          avatar_url: row.avatar_url ?? null,
        }));

        const me = mappedPlayers.find(
          (p) => p.email?.toLowerCase() === sessionUser.email?.toLowerCase()
        );
        if (!me) throw new Error("Player not found for current user");

        const { data: matchesData, error: matchesError } = await (supabase as any)
          .from("matches")
          .select(
            "id,challenger_id,challenged_id,status,scheduled_date,winner_id,score,player1_score,player2_score,notes,created_at,updated_at"
          )
          .order("created_at", { ascending: false });
        if (matchesError) throw matchesError;
        const mappedMatches: Challenge[] = (matchesData || []).map((row) => ({
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
        }));

        setPlayers(mappedPlayers);
        setCurrentUser(me);
        setChallenges(mappedMatches);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Could not load matches.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!state) {
      fetchData();
    }
  }, [state, toast]);

  useEffect(() => {
    if (!currentUser) return;
    setUserMatches(
      challenges.filter(
        (challenge) =>
          challenge.challengerId === currentUser.id || challenge.challengedId === currentUser.id
      )
    );
  }, [challenges, currentUser]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Loading your matches...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSchedule = async (matchId: string, datetimeIso: string) => {
    const { error } = await (supabase as any)
      .from("matches")
      .update({ scheduled_date: datetimeIso, status: "scheduled" })
      .eq("id", matchId);

    if (error) {
      toast({
        title: "Schedule failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setUserMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, scheduledDate: datetimeIso, status: "scheduled" } : m))
    );

    toast({
      title: "Match scheduled",
      description: `Date set to ${datetimeIso}`,
    });
  };

  const handleMatchResult = async (
    challengeId: string,
    winnerId: string | null,
    score1?: number,
    score2?: number
  ) => {
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

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setUserMatches((prev) =>
      prev.map((m) =>
        m.id === challengeId
          ? {
              ...m,
              winnerId,
              player1Score: score1 ?? null,
              player2Score: score2 ?? null,
              score: scoreString,
              status: "completed",
              scheduledDate: m.scheduledDate ?? completionDate.toISOString(),
            }
          : m
      )
    );

    toast({
      title: "Match completed",
      description: scoreString ? `Score: ${scoreString}` : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-2 sm:px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link to="/">
            <Button className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800">My Matches</h1>
          <p className="text-md sm:text-lg text-green-600">Manage your upcoming matches and schedule</p>
        </div>

        {/* Matches only; calendar appears inside schedule toggle in PendingMatches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingMatches 
              challenges={userMatches} 
              players={players} 
              onMatchResult={handleMatchResult}
              currentUser={currentUser}
              onScheduleMatch={handleSchedule}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyMatches;
