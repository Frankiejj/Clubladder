import { supabase } from "@/integrations/supabase/client";

type AuthUserLike = {
  id: string;
  email?: string | null;
};

export const getCurrentPlayerRecord = async (user: AuthUserLike) => {
  let { data, error } = await (supabase as any)
    .from("players")
    .select("id,name,email,is_admin,is_super_admin,clubs,avatar_url,last_name,phone")
    .eq("id", user.id)
    .maybeSingle();

  if (!data && user.email) {
    const fallback = await (supabase as any)
      .from("players")
      .select("id,name,email,is_admin,is_super_admin,clubs,avatar_url,last_name,phone")
      .ilike("email", user.email)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  return data ?? null;
};

export const getClubAdminIdsForPlayer = async (playerId: string) => {
  const { data, error } = await (supabase as any)
    .from("club_admins")
    .select("club_id")
    .eq("player_id", playerId);

  if (error) {
    throw error;
  }

  return Array.from(
    new Set(
      ((data as Array<{ club_id: string | null }> | null) ?? [])
        .map((row) => row.club_id)
        .filter((clubId): clubId is string => Boolean(clubId))
    )
  );
};

export const getEffectiveAdminClubIdsForPlayer = async (player: {
  id: string;
  is_admin?: boolean | null;
  clubs?: string[] | null;
}) => {
  const clubAdminIds = await getClubAdminIdsForPlayer(player.id).catch(() => []);
  if (clubAdminIds.length > 0) {
    return clubAdminIds;
  }

  if (player.is_admin) {
    return Array.isArray(player.clubs) ? player.clubs.filter(Boolean) : [];
  }

  return [];
};
