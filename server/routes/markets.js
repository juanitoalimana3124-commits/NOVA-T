const express = require('express');
const router = express.Router();
const { getCache } = require('../utils/priceCache');

// GET /api/markets — devuelve precios desde caché del servidor
router.get('/', (req, res) => {
  const { data, updatedAt } = getCache();
  res.json({ success: true, data, updatedAt });
});

module.exports = router;
