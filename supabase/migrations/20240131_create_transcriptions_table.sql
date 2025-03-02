-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on created_at for efficient ordering
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for public access
DROP POLICY IF EXISTS "Allow all operations" ON transcriptions;
CREATE POLICY "Allow public access" ON transcriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);