-- Create challenges table for storing matches
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenged_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed')),
  scheduled_date DATE,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  score TEXT,
  player1_score INTEGER,
  player2_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all challenges
CREATE POLICY "Authenticated users can view all challenges"
ON public.challenges
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert challenges
CREATE POLICY "Authenticated users can create challenges"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users involved in a challenge to update it
CREATE POLICY "Users can update their own challenges"
ON public.challenges
FOR UPDATE
TO authenticated
USING (
  auth.uid() = challenger_id OR 
  auth.uid() = challenged_id
);

-- Allow users involved in a challenge to delete it
CREATE POLICY "Users can delete their own challenges"
ON public.challenges
FOR DELETE
TO authenticated
USING (
  auth.uid() = challenger_id OR 
  auth.uid() = challenged_id
);

-- Add trigger for updated_at
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();