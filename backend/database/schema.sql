-- Script SQL pour créer la table users dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Activer l'extension UUID si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer la table users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  discord_id VARCHAR(255) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pseudo VARCHAR(255) NOT NULL
);

-- Créer un index sur l'email pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Créer un index sur google_id pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Créer un index sur discord_id pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Activer Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Permettre l'inscription (INSERT public)
CREATE POLICY "Anyone can insert users"
ON users FOR INSERT
WITH CHECK (true);

-- Politique RLS : Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read their own profile"
ON users FOR SELECT
USING (true);

-- Politique RLS : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (true);

-- Politique RLS : Les utilisateurs peuvent supprimer leur propre compte
CREATE POLICY "Users can delete their own account"
ON users FOR DELETE
USING (true);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE users IS 'Table principale des utilisateurs de ClikPay';
COMMENT ON COLUMN users.id IS 'Identifiant unique de l''utilisateur';
COMMENT ON COLUMN users.email IS 'Adresse email de l''utilisateur';
COMMENT ON COLUMN users.password_hash IS 'Hash du mot de passe (NULL pour les utilisateurs OAuth uniquement)';
COMMENT ON COLUMN users.google_id IS 'Identifiant Google pour l''authentification OAuth';
COMMENT ON COLUMN users.discord_id IS 'Identifiant Discord pour l''authentification OAuth';
COMMENT ON COLUMN users.first_name IS 'Prénom de l''utilisateur';
COMMENT ON COLUMN users.last_name IS 'Nom de famille de l''utilisateur';
COMMENT ON COLUMN users.avatar_url IS 'URL de l''avatar de l''utilisateur';
COMMENT ON COLUMN users.email_verified IS 'Indique si l''email a été vérifié';
COMMENT ON COLUMN users.created_at IS 'Date de création du compte';
COMMENT ON COLUMN users.last_login IS 'Date de dernière connexion';
COMMENT ON COLUMN users.updated_at IS 'Date de dernière mise à jour du profil';
COMMENT ON COLUMN users.pseudo IS 'Pseudo de l''utilisateur';
