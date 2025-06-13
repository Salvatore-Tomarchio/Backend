const mongoose = require('mongoose');


// Schema per le idee
const ideaSchema = new mongoose.Schema({
  genre: { type: String, enum: ['film', 'libri', 'musica'], required: true },
  type: { type: String, enum: ['idea', 'supporto'], required: true },
  content: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  comment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comments', default: [] }], // Corretto ref
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],    // NUOVO CAMPO
  dataCreazione: { type: Date, default: Date.now },
});

//Model permette di creare un oggetto che definisce la struttura(schema) del DB e lo collega ad una collection
const ideaModel = mongoose.model('Ideas', ideaSchema)

// Esportiamo il modello Idea
module.exports = ideaModel;