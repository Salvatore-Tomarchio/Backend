const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
require('./config/passport');
require('dotenv').config()


const app = express();
const port = 3002;
const dbName = "Capston_Project"

// Middlewares
app.use(cors()) // middleware per la gestione dei CORS
app.use(express.json()) // middleware per la gestione del formato JSON

app.use(session({
  secret: process.env.SESSION_SECRET,  // Usa il SESSION_SECRET dal .env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }  // Solo in produzione usa HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// const routes = require('./routes/user_route');
// const routes = require('./routes/idea_route')
// app.use(routes)
// Importa le rotte dai file specifici
const userRoutes = require('./routes/user_route');
const ideaRoutes = require('./routes/idea_route');
const commentRoutes = require('./routes/comment_route');
const googleRoutes = require('./routes/google_route');

// Usa le rotte
app.use(userRoutes);  // Registrazione delle rotte per gli utenti
app.use(ideaRoutes);   // Registrazione delle rotte per le idee
app.use(commentRoutes); //Registrazione delle rotte per i commenti
app.use(googleRoutes);  // Usa le rotte Google

mongoose.connect(process.env.MongoDB_URL + dbName)
  .then(() => app.listen(port, () =>
    console.log(`Server attivo sulla porta: ${port}`)))
  .catch(err => console.error("Errore connessione MongoDB:", err));

  app.use((err, req, res, next) => {
  console.error(err.stack); // Log dell’errore sulla console per debugging
  res.status(500).json({ message: 'Errore interno del server' }); // Risposta pulita all’utente
  });