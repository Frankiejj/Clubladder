import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'completed';
  scheduledDate?: string;
  winnerId?: string;
  score?: string;
  player1Score?: number;
  player2Score?: number;
  notes?: string;
}

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedChallenges: Challenge[] = (data || []).map((c) => ({
        id: c.id,
        challengerId: c.challenger_id,
        challengedId: c.challenged_id,
        status: c.status as 'pending' | 'accepted' | 'completed',
        scheduledDate: c.scheduled_date || undefined,
        winnerId: c.winner_id || undefined,
        score: c.score || undefined,
        player1Score: c.player1_score || undefined,
        player2Score: c.player2_score || undefined,
        notes: c.notes || undefined,
        createdAt: c.created_at || undefined,
        updatedAt: c.updated_at || undefined,
      }));

      setChallenges(mappedChallenges);
    } catch (error: any) {
      console.error('Error fetching challenges:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matches',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateChallenge = async (
    challengeId: string,
    winnerId: string,
    score1?: number,
    score2?: number
  ) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: winnerId,
          player1_score: score1,
          player2_score: score2,
          score: score1 && score2 ? `${score1}-${score2}` : null,
        })
        .eq('id', challengeId);

      if (error) throw error;

      // Refresh challenges
      await fetchChallenges();

      toast({
        title: 'Match Completed!',
        description: 'The match has been moved to completed matches',
      });
    } catch (error: any) {
      console.error('Error updating challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to update match',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchChallenges();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => {
          fetchChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    challenges,
    loading,
    updateChallenge,
    refetch: fetchChallenges,
  };
};
