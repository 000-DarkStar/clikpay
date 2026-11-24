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
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Vérifier si l'utilisateur existe déjà
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', profile.id)
          .single();

        if (existingUser) {
          // Utilisateur existe, mettre à jour la dernière connexion
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              last_login: new Date().toISOString(),
              avatar_url: profile.photos[0]?.value || null
            })
            .eq('id', existingUser.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return done(null, updatedUser);
        }

        // Créer un nouvel utilisateur
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            google_id: profile.id,
            email: profile.emails[0].value,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            avatar_url: profile.photos[0]?.value || null,
            email_verified: true,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
