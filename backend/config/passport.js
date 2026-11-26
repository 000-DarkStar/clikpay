import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { supabase } from './supabase.js';
import dotenv from 'dotenv';

dotenv.config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://api.clikpay.fr/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.trim().toLowerCase();
        const googleName = (profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ').trim()).trim();
        const avatarUrl = profile.photos?.[0]?.value || null;
        if (!email) throw new Error('Email Google non disponible');

        const googleLookup = await supabase
          .from('users').select('*').eq('google_id', profile.id).maybeSingle();
        if (googleLookup.error) throw new Error(`Recherche Google: ${googleLookup.error.message}`);

        let user = googleLookup.data;
        if (!user) {
          const emailLookup = await supabase
            .from('users').select('*').eq('email', email).maybeSingle();
          if (emailLookup.error) throw new Error(`Recherche email: ${emailLookup.error.message}`);
          user = emailLookup.data;
        }

        if (user) {
          const pseudo = String(user.pseudo || googleName || email.split('@')[0]).trim();
          const { data: updatedUser, error } = await supabase
            .from('users').update({
              google_id: profile.id,
              pseudo,
              first_name: pseudo,
              last_name: user.last_name || profile.name?.familyName || '',
              avatar_url: avatarUrl || user.avatar_url,
              email_verified: true,
              last_login: new Date().toISOString()
            }).eq('id', user.id).select().single();
          if (error) throw new Error(`Mise à jour Google: ${error.message}`);
          return done(null, updatedUser);
        }

        const pseudo = googleName || email.split('@')[0];
        const { data: newUser, error } = await supabase
          .from('users').insert({
            google_id: profile.id,
            email,
            pseudo,
            first_name: pseudo,
            last_name: profile.name?.familyName || '',
            avatar_url: avatarUrl,
            email_verified: true,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          }).select().single();
        if (error) throw new Error(`Création Google: ${error.message}`);
        done(null, newUser);
      } catch (error) {
        console.error('Google OAuth strategy error:', error);
        done(error, null);
      }
    }
  )
);

export default passport;
