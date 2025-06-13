const mongoose = require('mongoose');

// Schema Commento
const commentSchema = new mongoose.Schema({
  idea: { type: mongoose.Schema.Types.ObjectId, ref: 'Ideas', required: true },  // Riferimento all'idea
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },  // Riferimento all'utente
  content: { type: String, required: true },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],  
  createdAt: { type: Date, default: Date.now }
});

// Modello commento
const commentModel = mongoose.model('Comments', commentSchema);

module.exports = commentModel;
