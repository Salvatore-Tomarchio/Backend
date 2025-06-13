const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user_model');
const router = express.Router();

// Rotta per l'autenticazione con Google
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']  // Le informazioni che vogliamo ottenere da Google
}));

// Rotta di callback per Google
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }), 
  async (req, res) => {
    try {
      // L'utente è stato autenticato tramite Google
      let user = await userModel.findOne({ email: req.user.email });

      // Se l'utente non esiste, crealo
      if (!user) {
        user = new userModel({
          name: req.user.displayName,
          email: req.user.email,
          googleId: req.user.id,
          age: req.user.age,   
        });
        await user.save();
      }

      // Crea un token JWT per l'utente
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Rispondi al client con il token
      res.json({ message: 'Autenticazione riuscita!', token });

    } catch (err) {
      console.error('Errore durante l\'autenticazione con Google:', err);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  });

//
  const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// NUOVA Rotta per login Google con token da React
router.post('/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    // Verifica il token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    // Cerca utente nel DB
    let user = await userModel.findOne({ googleId: sub });

    // Se non esiste, crealo
    if (!user) {
      user = new userModel({
        googleId: sub,
        email,
        name,
        age: 18,
        password: '', // Non serve per utenti Google
      });

      await user.save();
    }

    // Genera JWT
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Invia token al frontend
    res.json({ token: jwtToken });

  } catch (err) {
    console.error('Errore autenticazione Google:', err);
    res.status(401).json({ message: 'Token Google non valido' });
  }
});
//


// Rotta di registrazione (POST)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, isGoogleSignIn } = req.body;

    // Verifica che tutti i dati necessari siano presenti
    if (!name || !email || !age) {
      return res.status(400).json({ message: 'Dati mancanti' });
    }

    // Se non è una registrazione tramite Google, la password è obbligatoria
    if (!isGoogleSignIn && (!password || password.trim() === "")) {
      return res.status(400).json({ message: 'La password è obbligatoria!' });
    }

    // Verifica se l'utente esiste già
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email già registrata' });
    }

    // Crea un nuovo utente
    const newUser = new userModel({
      name,
      email,
      age,
      password: isGoogleSignIn ? undefined : password, // Se Google, password non richiesta
    });

    // Se non è una registrazione tramite Google, aggiungi la password
    if (!isGoogleSignIn) {
  newUser.password = password;
}

    // Salva l'utente nel DB
    await newUser.save();

    // Rispondi con un messaggio di successo
    res.status(201).json({ message: 'Utente registrato con successo!' });

  } catch (err) {
    console.error('Errore durante la registrazione:', err);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// Rotta per il logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Errore durante il logout' });
    }
    res.redirect('/');
  });
});

module.exports = router;
