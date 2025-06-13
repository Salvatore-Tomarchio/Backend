const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ideaModel = require('../models/idea_model');
const authMiddleware = require('../middlewares/auth_middleware');
const userModel = require('../models/user_model');
const commentModel = require('../models/comment_model')

// Routes
// Rotta per ottenere tutte le idee (GET)
router.get('/idee', async (req, res) => {
  try {
    const ideas = await ideaModel.find().populate('user'); // Trova tutte le idee
    res.status(200).json(ideas); // Restituisci tutte le idee
  } catch (error) {
    console.error('Errore durante il recupero delle idee:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle idee' });
  }
});

// Rotta per ottenere un'idea specifica (GET by ID)
router.get('/idee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idea = await ideaModel.findById(id).populate('user'); // Trova l'idea per ID

    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    res.status(200).json(idea); // Restituisci l'idea trovata
  } catch (error) {
    console.error('Errore durante il recupero dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante il recupero dell\'idea' });
  }
});

// Rotta per creare una nuova idea (POST)
router.post('/idee', async (req, res) => {
  try {
    const { genre, type, content, user } = req.body;

    if (!genre || !type || !content || !user) {
      return res.status(400).json({ message: 'Dati mancanti' });
    }

    // Verifica che l'utente esista nel database
    const foundUser = await userModel.findById(user);
    if (!foundUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Creiamo una nuova idea
    const newIdea = new ideaModel({
      genre,
      type,
      content,
      user,
    });

    // Salviamo l'idea nel database
    const savedIdea = await newIdea.save();

    // Restituiamo la risposta con l'idea appena creata
    res.status(201).json(savedIdea);
  } catch (error) {
    console.error('Errore durante la creazione dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante la creazione dell\'idea' });
  }
});

// Aggiungi un commento a un'idea
router.post('/idee/:ideaId/commenti', async (req, res) => {
  try {
    const { ideaId } = req.params;  // ID dell'idea nella URL
    const { content } = req.body;   // Contenuto del commento inviato nel body della richiesta
    const token = req.headers.authorization?.split(' ')[1];  // Token da Authorization header

    // Verifica la validità del token
    if (!token) {
      return res.status(401).json({ message: 'Token mancante o non valido' });
    }

    // Decodifica il token per ottenere l'ID dell'utente
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    const userId = decoded.userId;

    // Recupera l'idea dal database
    const idea = await ideaModel.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    // Verifica che il contenuto del commento non sia vuoto
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Il commento non può essere vuoto' });
    }

    // Crea un nuovo commento
    const newComment = new commentModel({
      idea: ideaId,
      user: userId,
      content,
    });

    // Salva il commento nel database
    await newComment.save();

    // Inizializza l'array comments se è undefined
    if (!idea.comments) {
      idea.comments = [];  // Inizializza come array vuoto se non esiste
    }

    // Aggiungi il commento all'array di commenti dell'idea
    idea.comments.push(newComment._id);
    await idea.save();

    // Restituisci il commento appena creato
    res.status(201).json(newComment);

  } catch (error) {
    console.error('Errore durante l\'aggiunta del commento:', error);
    res.status(500).json({ message: 'Errore durante l\'aggiunta del commento' });
  }
});

// Rotta per aggiornare un'idea (PUT)
router.put('/idee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { genre, type, content, user } = req.body;

    // Trova e aggiorna l'idea
    const updatedIdea = await ideaModel.findByIdAndUpdate(
      id,
      { genre, type, content, user },
      { new: true } // Restituisce l'idea aggiornata
    );

    if (!updatedIdea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    res.status(200).json(updatedIdea); // Restituisci l'idea aggiornata
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante l\'aggiornamento dell\'idea' });
  }
});

// Rotta per eliminare un'idea (DELETE)
router.delete('/idee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedIdea = await ideaModel.findByIdAndDelete(id); // Trova e elimina l'idea per ID

    if (!deletedIdea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    res.status(200).json({ message: 'Idea eliminata con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante l\'eliminazione dell\'idea' });
  }
});

// Aggiungere upvote a un'idea
router.post('/idee/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const idea = await ideaModel.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: 'Idea non trovata' });

    const userId = req.user.userId;

    if (idea.upvotes.includes(userId)) {
      return res.status(400).json({ message: 'Hai già votato questa idea' });
    }

    idea.upvotes.push(userId);
    await idea.save();

    res.status(200).json({ message: 'Upvote aggiunto', upvotesCount: idea.upvotes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

// Rimuovere upvote da un'idea (toggle)
router.post('/idee/:id/remove-upvote', authMiddleware, async (req, res) => {
  try {
    const idea = await ideaModel.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: 'Idea non trovata' });

    const userId = req.user.userId;

    if (!idea.upvotes.includes(userId)) {
      return res.status(400).json({ message: 'Non hai votato questa idea' });
    }

    idea.upvotes = idea.upvotes.filter(id => id.toString() !== userId);
    await idea.save();

    res.status(200).json({ message: 'Upvote rimosso', upvotesCount: idea.upvotes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

module.exports = router;