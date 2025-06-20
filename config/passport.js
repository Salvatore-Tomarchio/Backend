const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/user_model');
require('dotenv').config();

// Configurazione della strategia Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3002/auth/google/callback',
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Log completo del profilo per vedere i dettagli ricevuti
    console.log('Google Profile:', JSON.stringify(profile, null, 2));

    // Controlla se profile.id esiste
    if (!profile.id) {
      console.error('Errore: Google ID mancante nel profilo');
      return done(new Error('Google ID is missing'), null);
    }

    // Cerca un utente esistente con lo stesso googleId
    let user = await userModel.findOne({ googleId: profile.id });

    // Se l'utente esiste, restituiscilo
    if (user) {
      console.log('Utente esistente trovato:', user);
      return done(null, user);
    }

    // Se non esiste, crea un nuovo utente
    user = new userModel({
      googleId: profile.id,
      name: profile.displayName,
      email: (profile.emails && profile.emails[0]) ? profile.emails[0].value : '', // Fallback per email
      age: 18,
      password: '', 
    });

    // Aggiungi una verifica per `googleId` prima di salvarlo
    if (!user.googleId) {
      console.error('Errore: Google ID non valido o mancante durante la creazione dell\'utente');
      return done(new Error('Invalid Google ID'), null);
    }

    // Salva l'utente nel database
    await user.save();

    console.log('Nuovo utente creato:', user);
    return done(null, user);

  } catch (err) {
    console.error('Errore durante l\'autenticazione con Google:', err);
    return done(err, null);
  }
}));

// Serializzazione e deserializzazione dell'utente
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
