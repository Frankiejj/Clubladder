import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Mail, Phone, Globe, MapPin, Shield, ArrowLeft, Trophy } from "lucide-react";

type ClubRow = {
  id: string;
  name: string | null;
  city?: string | null;
  sport?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
};

type AdminRow = {
  id: string;
  name: string | null;
  last_name?: string | null;
  email: string | null;
  phone: string | null;
  clubs: string[] | null;
};

const MyClub = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [userClubIds, setUserClubIds] = useState<string[]>([]);

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
        console.error("MyClub player lookup error", playerError);
        setLoading(false);
        return;
      }

      const clubIds = Array.isArray(playerRow?.clubs) ? playerRow.clubs : [];
      setUserClubIds(clubIds);

      if (!clubIds.length) {
        setClubs([]);
        setAdmins([]);
        setLoading(false);
        return;
      }

      const { data: clubRows, error: clubError } = await (supabase as any)
        .from("clubs")
        .select("id,name,city,sport,description,email,phone,website,address")
        .in("id", clubIds)
        .order("name");

      if (clubError) {
        console.error("MyClub clubs load error", clubError);
        setLoading(false);
        return;
      }

      const { data: adminRows, error: adminError } = await (supabase as any)
        .from("players")
        .select("id,name,last_name,email,phone,clubs")
        .eq("is_admin", true);

      if (adminError) {
        console.error("MyClub admins load error", adminError);
        setAdmins([]);
      } else {
        const rows = (adminRows as AdminRow[]) || [];
        setAdmins(rows.filter((row) => Array.isArray(row.clubs) && row.clubs.some((id) => clubIds.includes(id))));
      }

      setClubs((clubRows as ClubRow[]) || []);
      setLoading(false);
    };

    load();
  }, [navigate]);

  const adminsByClub = useMemo(() => {
    const map: Record<string, AdminRow[]> = {};
    admins.forEach((admin) => {
      (admin.clubs || []).forEach((clubId) => {
        if (!map[clubId]) map[clubId] = [];
        map[clubId].push(admin);
      });
    });
    return map;
  }, [admins]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p>Loading club info...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link to="/app">
            <Button className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ladder
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 flex items-center gap-2">
              <Building className="h-6 w-6" />
              My Club
            </h1>
            <p className="text-green-600">Club details and admins</p>
          </div>
        </div>

        {clubs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-600">
              No clubs found for your account.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clubs.map((club) => {
              const clubAdmins = adminsByClub[club.id] || [];
              return (
                <Card key={club.id} className="border-green-200 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg py-3.5">
                    <CardTitle className="flex items-center gap-2 text-green-800 text-lg sm:text-xl">
                      <Building className="h-5 w-5" />
                      {club.name || "Club"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {club.address && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-gray-800">Address</div>
                            <a
                              className="text-green-700 hover:underline"
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                club.address
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {club.address}
                            </a>
                          </div>
                        </div>
                      )}
                      {club.city && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-gray-800">City</div>
                            <div>{club.city}</div>
                          </div>
                        </div>
                      )}
                      {club.email && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <Mail className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-gray-800">Email</div>
                            <a className="text-green-700 hover:underline" href={`mailto:${club.email}`}>
                              {club.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {club.phone && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-gray-800">Phone</div>
                            <a className="text-green-700 hover:underline" href={`tel:${club.phone}`}>
                              {club.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {club.website && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <Globe className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-gray-800">Website</div>
                            <a
                              className="text-green-700 hover:underline"
                              href={club.website}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {club.website}
                            </a>
                          </div>
                        </div>
                      )}
                      {club.sport && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <Trophy className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-gray-800">Sport</div>
                            <div>{club.sport}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {club.description && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                        {club.description}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                        <Shield className="h-4 w-4 text-green-600" />
                        Club Admin
                      </div>
                      {clubAdmins.length === 0 ? (
                        <p className="text-sm text-gray-600">No club admin assigned.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {clubAdmins.map((admin) => (
                            <div key={admin.id} className="border border-green-100 rounded-md p-3 bg-white space-y-2">
                              <div className="font-semibold text-gray-800">
                                {[admin.name, admin.last_name].filter(Boolean).join(" ") || "Club Admin"}
                              </div>
                              <div className="flex items-start gap-2 text-gray-700">
                                <Mail className="h-4 w-4 text-green-600 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-gray-800">Email</div>
                                  {admin.email ? (
                                    <a className="text-green-700 hover:underline" href={`mailto:${admin.email}`}>
                                      {admin.email}
                                    </a>
                                  ) : (
                                    <div>-</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-gray-700">
                                <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-gray-800">Phone</div>
                                  {admin.phone ? (
                                    <a className="text-green-700 hover:underline" href={`tel:${admin.phone}`}>
                                      {admin.phone}
                                    </a>
                                  ) : (
                                    <div>-</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClub;
