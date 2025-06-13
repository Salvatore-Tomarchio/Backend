const jwt = require('jsonwebtoken');

// Middleware per verificare il token JWT
const authMiddleware = (req, res, next) => {
  // Estrai il token dall'header della richiesta
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log('Token estratto:', token);  // Aggiungi un log per verificare che il token venga estratto correttamente

  // Se non c'è il token, restituisci errore
  if (!token) {
    return res.status(401).json({ message: 'Token mancante, accesso negato' });
  }

  try {
    // Verifica il token usando il segreto dal file .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Aggiungi i dati decodificati (come userId, email) alla richiesta
    req.user = decoded;

    // Continua con la richiesta
    next();
  } catch (err) {
    // Se il token non è valido, restituisci errore
    return res.status(401).json({ message: 'Token non valido' });
  }
};

module.exports = authMiddleware;