-- Create clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL CHECK (sport IN ('tennis', 'golf', 'padel', 'squash')),
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view clubs
CREATE POLICY "Anyone can view clubs"
ON public.clubs
FOR SELECT
TO authenticated
USING (true);

-- Only admins can create clubs (we'll handle this via app logic)
CREATE POLICY "Authenticated users can create clubs"
ON public.clubs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update clubs (we'll handle this via app logic)
CREATE POLICY "Authenticated users can update clubs"
ON public.clubs
FOR UPDATE
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial clubs
INSERT INTO public.clubs (name, sport, city, address, description) VALUES
('Riverside Tennis Club', 'tennis', 'Amsterdam', 'Riverside Lane 123', 'Premier tennis club with 8 outdoor courts'),
('Amsterdam Golf Club', 'golf', 'Amsterdam', 'Golf Course Road 45', '18-hole championship golf course'),
('Rotterdam Tennis Academy', 'tennis', 'Rotterdam', 'Court Street 78', 'Modern tennis facility with indoor courts'),
('The Hague Padel Center', 'padel', 'The Hague', 'Padel Avenue 12', 'State-of-the-art padel courts'),
('Utrecht Golf & Country Club', 'golf', 'Utrecht', 'Green Valley 89', 'Exclusive golf club with spa facilities');