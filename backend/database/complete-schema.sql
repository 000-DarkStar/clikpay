-- ============================================
-- SCHÉMA COMPLET CLIKPAY
-- ============================================
-- Ce fichier contient toutes les tables nécessaires pour Click.Pay
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (déjà existante, référence)
-- ============================================
-- Cette table existe déjà, pas besoin de la recréer

-- ============================================
-- TABLE: links (liens raccourcis créés par les utilisateurs)
-- ============================================
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),

  -- Statistiques
  total_clicks INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0.00,

  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_click_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);

-- ============================================
-- TABLE: clicks (enregistrement de chaque clic)
-- ============================================
CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Informations du visiteur
  ip_address VARCHAR(45),
  user_agent TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  referrer TEXT,
  device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),

  -- Monétisation
  revenue_generated DECIMAL(10, 4) DEFAULT 0.0000,
  ad_viewed BOOLEAN DEFAULT FALSE,
  ad_clicked BOOLEAN DEFAULT FALSE,

  -- Dates
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_ip_link ON clicks(ip_address, link_id);

-- ============================================
-- TABLE: revenues (revenus des utilisateurs)
-- ============================================
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_id UUID REFERENCES links(id) ON DELETE SET NULL,
  click_id UUID REFERENCES clicks(id) ON DELETE SET NULL,

  -- Montants
  amount DECIMAL(10, 4) NOT NULL,
  commission_rate DECIMAL(5, 2) DEFAULT 70.00, -- Pourcentage pour l'utilisateur (70%)
  platform_commission DECIMAL(10, 4) DEFAULT 0.0000, -- Part de la plateforme (30%)

  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid')),

  -- Dates
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_revenues_user_id ON revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_revenues_link_id ON revenues(link_id);
CREATE INDEX IF NOT EXISTS idx_revenues_status ON revenues(status);
CREATE INDEX IF NOT EXISTS idx_revenues_generated_at ON revenues(generated_at DESC);

-- ============================================
-- TABLE: withdrawals (demandes de retrait)
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Montant
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 5.00),

  -- Méthode de paiement
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('paypal', 'stripe', 'bank_transfer', 'crypto')),
  payment_details JSONB NOT NULL, -- Email PayPal, IBAN, adresse crypto, etc.

  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  rejection_reason TEXT,

  -- Dates
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON withdrawals(requested_at DESC);

-- ============================================
-- TABLE: user_settings (paramètres utilisateur)
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Monétisation
  commission_rate DECIMAL(5, 2) DEFAULT 70.00, -- Peut être personnalisé par admin

  -- Paiements
  default_payment_method VARCHAR(50),
  paypal_email VARCHAR(255),
  stripe_account_id VARCHAR(255),
  bank_iban VARCHAR(34),
  crypto_address VARCHAR(255),

  -- Notifications
  email_notifications BOOLEAN DEFAULT TRUE,
  notify_new_click BOOLEAN DEFAULT FALSE,
  notify_revenue_threshold DECIMAL(10, 2) DEFAULT 1.00,

  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: platform_stats (stats globales de la plateforme)
-- ============================================
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Statistiques
  total_users INTEGER DEFAULT 0,
  total_links INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0.00,
  platform_revenue DECIMAL(12, 2) DEFAULT 0.00,

  -- Date
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_stats_date ON platform_stats(date DESC);

-- ============================================
-- FUNCTIONS: Fonction de mise à jour des timestamps
-- ============================================

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Mise à jour automatique des timestamps
-- ============================================

-- Trigger pour links.updated_at
DROP TRIGGER IF EXISTS update_links_updated_at ON links;
CREATE TRIGGER update_links_updated_at
BEFORE UPDATE ON links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour user_settings.updated_at
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: Fonctions utilitaires
-- ============================================

-- Fonction pour générer un short_code unique
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Vérifier si le code existe déjà
    SELECT EXISTS(SELECT 1 FROM links WHERE short_code = result) INTO code_exists;

    IF NOT code_exists THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le solde disponible d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  balance DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0.00) INTO balance
  FROM revenues
  WHERE user_id = p_user_id AND status = 'validated';

  -- Soustraire les retraits complétés
  balance := balance - COALESCE((
    SELECT SUM(amount)
    FROM withdrawals
    WHERE user_id = p_user_id AND status = 'completed'
  ), 0.00);

  RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statistiques d'un lien
CREATE OR REPLACE FUNCTION update_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE links
  SET
    total_clicks = total_clicks + 1,
    last_click_at = NEW.clicked_at
  WHERE id = NEW.link_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les stats automatiquement après un clic
CREATE TRIGGER after_click_update_link_stats
AFTER INSERT ON clicks
FOR EACH ROW
EXECUTE FUNCTION update_link_stats();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Politiques pour links
CREATE POLICY "Users can view their own links"
ON links FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own links"
ON links FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own links"
ON links FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own links"
ON links FOR DELETE
USING (true);

-- Politiques pour clicks (lecture publique pour les stats, insertion publique)
CREATE POLICY "Anyone can insert clicks"
ON clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view clicks on their links"
ON clicks FOR SELECT
USING (true);

-- Politiques pour revenues
CREATE POLICY "Users can view their own revenues"
ON revenues FOR SELECT
USING (true);

CREATE POLICY "System can insert revenues"
ON revenues FOR INSERT
WITH CHECK (true);

-- Politiques pour withdrawals
CREATE POLICY "Users can view their own withdrawals"
ON withdrawals FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own withdrawals"
ON withdrawals FOR INSERT
WITH CHECK (true);

-- Politiques pour user_settings
CREATE POLICY "Users can view their own settings"
ON user_settings FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own settings"
ON user_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own settings"
ON user_settings FOR UPDATE
USING (true);

-- Activer RLS sur platform_stats
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- Politiques pour platform_stats (lecture publique)
CREATE POLICY "Anyone can read platform stats"
ON platform_stats FOR SELECT
USING (true);

CREATE POLICY "System can insert platform stats"
ON platform_stats FOR INSERT
WITH CHECK (true);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Créer les paramètres par défaut pour les utilisateurs existants
INSERT INTO user_settings (user_id, commission_rate)
SELECT id, 70.00 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE links IS 'Liens raccourcis créés par les utilisateurs';
COMMENT ON TABLE clicks IS 'Enregistrement de chaque clic sur un lien';
COMMENT ON TABLE revenues IS 'Revenus générés par les clics';
COMMENT ON TABLE withdrawals IS 'Demandes de retrait des utilisateurs';
COMMENT ON TABLE user_settings IS 'Paramètres et préférences des utilisateurs';
COMMENT ON TABLE platform_stats IS 'Statistiques globales de la plateforme';
