-- Migration Google / Discord OAuth
-- Le pseudo est un nom d'affichage, pas un identifiant unique.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pseudo_key;

-- Garantir les champs nécessaires aux profils OAuth.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pseudo VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN last_name DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id_unique ON users(discord_id) WHERE discord_id IS NOT NULL;

-- Remplir les pseudos manquants sans écraser ceux déjà choisis.
UPDATE users
SET pseudo = COALESCE(NULLIF(BTRIM(pseudo), ''), NULLIF(BTRIM(first_name), ''), split_part(email, '@', 1))
WHERE pseudo IS NULL OR BTRIM(pseudo) = '';
