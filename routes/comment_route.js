const express = require('express');
const router = express.Router();

const commentModel = require('../models/comment_model');
const ideaModel = require('../models/idea_model');
const userModel = require('../models/user_model');
const authMiddleware = require('../middlewares/auth_middleware')

// Rotta per creare i commenti (POST)
router.post('/comments', async (req, res) => {
  try {
    const { idea, user, content } = req.body;

    if (!idea || !user || !content) {
      return res.status(400).json({ message: 'Dati mancanti' });
    }

    const ideaFound = await ideaModel.findById(idea);
    if (!ideaFound) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    const userFound = await userModel.findById(user);
    if (!userFound) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const comment = new commentModel({ idea, user, content });
    const savedComment = await comment.save();

    res.status(201).json(savedComment);

  } catch (error) {
    console.error('Errore creazione commento:', error);
    res.status(500).json({ message: 'Errore interno server' });
  }
});

// Rotta per ottenere tutte i commenti (GET)
router.get('/comments/:ideaid', async (req, res) => {
  try {
    const { ideaid } = req.params;

    const idea = await ideaModel.findById(ideaid);
    if (!idea) {
      return res.status(404).json({ message: 'Idea non trovata' });
    }

    const comments = await commentModel.find({ idea:ideaid }).populate('user', 'name email');

    res.status(200).json(comments);

  } catch (error) {
    console.error('Errore recupero commenti:', error);
    res.status(500).json({ message: 'Errore interno server' });
  }
});

// Aggiungere upvote a un commento
router.post('/comments/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const comment = await commentModel.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Commento non trovato' });

    const userId = req.user.userId;

    if (comment.upvotes.includes(userId)) {
      return res.status(400).json({ message: 'Hai già votato questo commento' });
    }

    comment.upvotes.push(userId);
    await comment.save();

    res.status(200).json({ message: 'Upvote aggiunto', upvotesCount: comment.upvotes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

// Rimuovere upvote da un commento (toggle)
router.post('/comments/:id/remove-upvote', authMiddleware, async (req, res) => {
  try {
    const comment = await commentModel.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Commento non trovato' });

    const userId = req.user.userId;

    if (!comment.upvotes.includes(userId)) {
      return res.status(400).json({ message: 'Non hai votato questo commento' });
    }

    comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId);
    await comment.save();

    res.status(200).json({ message: 'Upvote rimosso', upvotesCount: comment.upvotes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

module.exports = router;
