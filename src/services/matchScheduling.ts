import { supabase } from "@/integrations/supabase/client";

type ScheduleMatchResponse = {
  ok?: boolean;
  sent?: number;
  failed?: number;
  failedRecipients?: string[];
  scheduledDate?: string;
  status?: string;
};

export const scheduleMatch = async (matchId: string, scheduledDate: string) => {
  const { data, error } = await supabase.functions.invoke("send-pending-round-emails", {
    body: {
      mode: "schedule_match",
      matchId,
      scheduledDate,
    },
  });

  if (error) {
    throw error;
  }

  return ((data as ScheduleMatchResponse | null) ?? {
    scheduledDate,
    status: "scheduled",
  }) as ScheduleMatchResponse;
};
