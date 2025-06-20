 const mongoose = require('mongoose');
 const bcrypt = require('bcrypt');


// Schema utente
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: function() { return !this.googleId; } },  // La password è obbligatoria solo se non c'è googleId
    email: { type: String, required: true, unique: true },
    age: { type: Number, required: false },
    googleId: { type: String, unique: false, required:false, sparse: true },
});

// Aggiungi un metodo per cifrare la password
userSchema.pre('save', async function(next) {
    if (this.password) {
        const bcrypt = require('bcrypt');
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Metodo per confrontare la password
userSchema.methods.comparePassword = async function(password) {
    const bcrypt = require('bcrypt');
    if (!this.password) return false;  // Un controllo in caso di mancanza della password
    return await bcrypt.compare(password, this.password);
};

// Creazione del modello
const userModel = mongoose.model('Users', userSchema);

// Esportare i dati
 module.exports = userModel;