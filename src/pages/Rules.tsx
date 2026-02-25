import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, ListOrdered, CalendarDays } from "lucide-react";

type ClubRow = {
  id: string;
  name: string | null;
  city?: string | null;
};

type LadderRow = {
  id: string;
  club_id: string;
  name: string | null;
  type: "singles" | "doubles";
  warm_up_time?: number | null;
  play_time?: number | null;
};

const formatLadderName = (name?: string | null, fallback?: string) => {
  if (!name) return fallback || "Ladder";
  return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
};

const Rules = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [ladders, setLadders] = useState<LadderRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: playerRow, error: playerError } = await (supabase as any)
        .from("players")
        .select("clubs,email")
        .ilike("email", user.email || "")
        .maybeSingle();

      if (playerError) {
        console.error("Rules player lookup error", playerError);
        setLoading(false);
        return;
      }

      const clubIds = Array.isArray(playerRow?.clubs) ? playerRow.clubs.filter(Boolean) : [];
      if (!clubIds.length) {
        setClubs([]);
        setLadders([]);
        setLoading(false);
        return;
      }

      const { data: clubRows, error: clubError } = await (supabase as any)
        .from("clubs")
        .select("id,name,city")
        .in("id", clubIds)
        .order("name");

      if (clubError) {
        console.error("Rules clubs load error", clubError);
      } else {
        setClubs((clubRows as ClubRow[]) || []);
      }

      let ladderRows: any[] = [];
      let laddersError: any = null;

      const full = await (supabase as any)
        .from("ladders")
        .select("id,club_id,name,type,warm_up_time,play_time")
        .in("club_id", clubIds)
        .order("name");

      ladderRows = full.data || [];
      laddersError = full.error;

      // Backwards-compatible fallback in case timing columns are not migrated yet.
      if (laddersError?.code === "42703") {
        const fallback = await (supabase as any)
          .from("ladders")
          .select("id,club_id,name,type")
          .in("club_id", clubIds)
          .order("name");
        ladderRows = fallback.data || [];
        laddersError = fallback.error;
      }

      if (laddersError) {
        console.error("Rules ladders load error", laddersError);
        setLadders([]);
      } else {
        setLadders((ladderRows as LadderRow[]) || []);
      }

      setLoading(false);
    };

    load();
  }, [navigate]);

  const laddersByClub = useMemo(() => {
    return clubs.map((club) => {
      const clubLadders = ladders
        .filter((ladder) => ladder.club_id === club.id)
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "singles" ? -1 : 1;
          return formatLadderName(a.name).localeCompare(formatLadderName(b.name));
        });
      return { club, ladders: clubLadders };
    });
  }, [clubs, ladders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <Link to="/">
            <Button className="mb-3">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-green-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Rules
          </h1>
          <p className="text-sm text-green-600">How rounds, scheduling and ranking work</p>
        </div>

        <Card className="shadow-sm border-green-200 mb-4">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Round rules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3 text-sm text-gray-700">
            <p>
              <strong>Rounds last 2 weeks.</strong> A new round starts every second Monday at 08:00 and ends Sunday
              at 23:59 at the end of week 2.
            </p>
            <p>
              If a match is not played/scheduled in time, it is set to <strong>Not played</strong> and neither
              player/team moves.
            </p>
            <p>
              The amount of matches per round is based on your <strong>match frequency</strong>.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-200 mb-4">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Warm-up and play time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-sm text-gray-700">
            {laddersByClub.length === 0 ? (
              <p>No club ladders found.</p>
            ) : (
              laddersByClub.map(({ club, ladders: clubLadders }) => (
                <div key={club.id} className="border border-green-100 rounded-md p-3 bg-white">
                  <div className="font-semibold text-green-800 mb-2">
                    {club.name || "Club"} {club.city ? `(${club.city})` : ""}
                  </div>
                  {clubLadders.length === 0 ? (
                    <p className="text-gray-600">No ladders configured for this club.</p>
                  ) : (
                    <ul className="space-y-1">
                      {clubLadders.map((ladder) => (
                        <li key={ladder.id}>
                          <span className="font-medium">{formatLadderName(ladder.name, "Ladder")}</span>{" "}
                          ({ladder.type}) - Warm-up:{" "}
                          <strong>
                            {Number.isFinite(ladder.warm_up_time) ? Number(ladder.warm_up_time) : 10} min
                          </strong>
                          , Play time:{" "}
                          <strong>
                            {Number.isFinite(ladder.play_time) ? Number(ladder.play_time) : 60} min
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
            <p>Games should be counted during the play time.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              Ranking movement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3 text-sm text-gray-700">
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Win:</strong> If you beat a higher-ranked opponent, you move up.
              </li>
              <li>
                <strong>Draw:</strong> You stay in the same position.
              </li>
              <li>
                <strong>Lose:</strong> If you lose to a lower-ranked opponent, you move down.
              </li>
              <li>
                <strong>Not played:</strong> No ranking movement for that match.
              </li>
            </ul>
            <p>
              Questions? Contact your club admin. Details are available in{" "}
              <Link to="/my-club" className="text-green-700 hover:underline font-medium">
                My Club
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rules;
