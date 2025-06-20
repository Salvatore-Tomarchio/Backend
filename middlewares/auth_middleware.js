const jwt = require('jsonwebtoken');

// Middleware per verificare il token JWT
const authMiddleware = (req, res, next) => {
  // Estrai il token dall'header Authorization (formato: "Bearer <token>")
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Token mancante, accesso negato' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next(); // Procedi alla rotta successiva
  } catch (err) {
    console.error('Errore nella verifica del token:', err.message);
    return res.status(401).json({ message: 'Token non valido' });
  }
};

module.exports = authMiddleware;