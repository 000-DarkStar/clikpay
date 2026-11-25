-- Ajoute le lien Discord OAuth à la table users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS discord_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id
ON users(discord_id)
WHERE discord_id IS NOT NULL;
