-- Synchronisation du pseudo et des fournisseurs OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS pseudo VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(255);

UPDATE users
SET pseudo = first_name
WHERE pseudo IS NULL OR pseudo = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id
ON users(discord_id)
WHERE discord_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_pseudo ON users(pseudo);
