import { supabase } from "@/integrations/supabase/client";

type ResultRegisteredResponse = {
  ok?: boolean;
  sent?: number;
  failed?: number;
  failedRecipients?: string[];
  score?: string | null;
};

export const sendResultRegisteredEmail = async (matchId: string) => {
  const { data, error } = await supabase.functions.invoke("send-pending-round-emails", {
    body: {
      mode: "result_registered",
      matchId,
    },
  });

  if (error) {
    throw error;
  }

  return ((data as ResultRegisteredResponse | null) ?? {
    score: null,
  }) as ResultRegisteredResponse;
};
