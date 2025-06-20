const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth_middleware');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user_model')

// Routes
router.get('/', (req, res) => {
    res.send("Hello World!!")
})

// Rotta per ottenere tutti gli utenti(GET)
router.get('/users', async (req, res) => {
    const users = await userModel.find();
    res.status(200).json(users);
})

// Rotta per ottenere un'utente specifica (GET by ID)
router.get('/users/:id', async (req, res, next) => {
    const id = req.params.id;
    try {
        const user = await userModel.findById(id);
        res.status(200).json(user);
    } catch (err) {
        next(err)
    }
})

// Rotta per creare un'utente (POST)
router.post('/users', async (req, res, next) => {
   try {
        const obj = req.body;

        // Assicurati che se il googleId è null, non venga salvato
        if (obj.googleId === null || obj.googleId === undefined) {
          delete obj.googleId;  // Rimuove googleId se è null o undefined
        }

        // Hash della password
        obj.password = await bcrypt.hash(obj.password, 10);
        console.log('Password hashata:', obj.password);

        // Creazione dell'utente nel database
        const user = new userModel(obj);
        const dbUser = await user.save();

        // Genera il token JWT
        const token = jwt.sign(
          {
            userId: dbUser._id,
            email: dbUser.email
          },
          process.env.JWT_SECRET, // Usa il segreto dal file .env
          { expiresIn: '2h' } // Imposta la durata del token
        );

        // Risposta con l'utente creato e il token JWT
        res.status(201).json({
          user: dbUser,  // L'oggetto dell'utente appena creato
          token: token   // Il token JWT generato
        });
    } catch (err) {
        next(err);
    }
});


// Rotta per aggiornare un'utente (PUT)
router.put('/users/:id', async (req, res, next) => {
    const id = req.params.id;
    const obj = req.body;
   try {
        const userUpdate = await userModel.findByIdAndUpdate(id, obj)
        res.status(200).json(userUpdate)
    } catch(err) {
        next(err)
    }
})

// Rotta per eliminare un'utente (DELETE)
router.delete('/users/:id', async (req, res, next) => {
    const id = req.params.id;
   try {
        await userModel.findByIdAndDelete(id);
        res.status(200).json({message: "Utente Eliminato!"})
    } catch(err) {
        next(err)
    }
})

// Rotta per il Login 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica che email e password siano forniti
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password obbligatorie' });
    }

    // Cerca l'utente nel database
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Se l'utente ha un googleId, non è necessario il controllo della password
    if (user.googleId) {
      return res.status(400).json({ message: 'Login tramite Google, password non richiesta' });
    }

    // Confronta la password inviata con quella salvata (hashata)
    const isMatch = bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password errata' });
    }

    // Genera un token JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET, // Usa il segreto dal file .env
      { expiresIn: '2h' } // Imposta la durata del token
    );

    // Risposta al client con il token JWT
    res.status(200).json({ token });

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore durante il login' });
  }
});

// Rotta protetta per ottenere i dati autenticati
router.get('/users/me', authMiddleware, async (req, res) => {
  try {
    // Cerca l'utente nel DB usando l'ID che abbiamo salvato nel token JWT
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Restituisce i dati dell'utente autenticato
    res.status(200).json(user);
  } catch (err) {
    console.error('Errore nel recupero del profilo:', err);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// Esportare tutti gli endpoints creati
module.exports = router;