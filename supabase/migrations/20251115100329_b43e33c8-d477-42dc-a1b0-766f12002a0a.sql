-- Add sport and club_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN sport TEXT CHECK (sport IN ('tennis', 'golf', 'padel', 'squash')),
ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;