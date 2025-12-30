import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Club {
  id: string;
  name: string;
  sport: 'tennis' | 'golf' | 'padel' | 'squash';
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export const useClubs = (sport?: string) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        let query = supabase.from('clubs').select('*').order('name');
        
        if (sport) {
          query = query.eq('sport', sport);
        }

        const { data, error } = await query;

        if (error) throw error;

        const mappedClubs: Club[] = (data || []).map((club) => ({
          id: club.id,
          name: club.name,
          sport: club.sport as 'tennis' | 'golf' | 'padel' | 'squash',
          city: club.city,
          address: club.address || undefined,
          phone: club.phone || undefined,
          email: club.email || undefined,
          website: club.website || undefined,
          description: club.description || undefined,
        }));

        setClubs(mappedClubs);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, [sport]);

  return { clubs, loading };
};
