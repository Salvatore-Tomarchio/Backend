const express = require('express');
const router = express.Router();
const ideaModel = require('../models/idea_model');
const authMiddleware = require('../middlewares/auth_middleware');
const userModel = require('../models/user_model');
const commentModel = require('../models/comment_model');

// Rotta per ottenere le idee filtrate per genere e/o tipo, con commenti inclusi
router.get('/idee', async (req, res) => {
  try {
    const { genre, type } = req.query;

    const allowedGenres = ['film', 'libri', 'musica'];
    const allowedTypes = ['idea', 'supporto'];

    if (genre && !allowedGenres.includes(genre)) {
      return res.status(400).json({ message: 'Genere non valido' });
    }

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo non valido' });
    }

    const filter = {};
    if (genre) filter.genre = genre;
    if (type) filter.type = type;

    // Trova tutte le idee corrispondenti
    const ideas = await ideaModel
      .find(filter)
      .sort({ dataCreazione: -1 })
      .populate('user')
      .lean(); // lean() per permettere l'aggiunta manuale di proprietà

    // Per ogni idea, recupera i commenti associati
    const ideasWithComments = await Promise.all(
      ideas.map(async (idea) => {
        const comments = await commentModel
          .find({ idea: idea._id })
          .populate('user', 'name email') // Popola anche l'utente del commento
          .sort({ createdAt: 1 }); // Ordina i commenti dal più vecchio al più nuovo

        return {
          ...idea,
          comments, // aggiungiamo l'array dei commenti alla singola idea
        };
      })
    );

    res.status(200).json(ideasWithComments);
  } catch (error) {
    console.error('Errore durante il recupero delle idee:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle idee' });
  }
});

// Rotta per ottenere un'idea specifica (GET by ID)
router.get('/idee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idea = await ideaModel.findById(id).populate('user');

    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    res.status(200).json(idea);
  } catch (error) {
    console.error('Errore durante il recupero dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante il recupero dell\'idea' });
  }
});

// Rotta per creare una nuova idea (POST)
router.post('/idee', authMiddleware, async (req, res) => {
  try {
    const { genre, type, content } = req.body;
    const userId = req.user.userId;

    if (!genre || !type || !content) {
      return res.status(400).json({ message: 'Dati mancanti' });
    }

    const foundUser = await userModel.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const newIdea = new ideaModel({ genre, type, content, user: userId });
    const savedIdea = await newIdea.save();

    res.status(201).json(savedIdea);
  } catch (error) {
    console.error('Errore durante la creazione dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante la creazione dell\'idea' });
  }
});

// Aggiungi un commento a un'idea
router.post('/idee/:ideaId/commenti', authMiddleware, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Il commento non può essere vuoto' });
    }

    const idea = await ideaModel.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    const newComment = new commentModel({
      idea: ideaId,
      user: userId,
      content,
    });

    await newComment.save();

    idea.comments = idea.comments || [];
    idea.comments.push(newComment._id);
    await idea.save();

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Errore durante l\'aggiunta del commento:', error);
    res.status(500).json({ message: 'Errore durante l\'aggiunta del commento' });
  }
});

// Rotta per aggiornare un'idea (PUT)
router.put('/idee/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { genre, type, content } = req.body;
    const userId = req.user.userId;

    const idea = await ideaModel.findById(id);
    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    if (idea.user.toString() !== userId) {
      return res.status(403).json({ message: 'Non sei autorizzato ad aggiornare questa idea' });
    }

    idea.genre = genre ?? idea.genre;
    idea.type = type ?? idea.type;
    idea.content = content ?? idea.content;

    const updatedIdea = await idea.save();

    res.status(200).json(updatedIdea);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'idea:', error);
    res.status(500).json({ message: 'Errore durante l\'aggiornamento dell\'idea' });
  }
});

// Rotta per eliminare un'idea (DELETE)
router.delete('/idee/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const idea = await ideaModel.findById(id);
    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    if (idea.user.toString() !== userId) {
      return res.status(403).json({ message: 'Non sei autorizzato ad eliminare questa idea' });
    }

    await idea.deleteOne();
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