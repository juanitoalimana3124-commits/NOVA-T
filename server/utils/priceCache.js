/**
 * Caché de precios de CoinGecko
 * El servidor consulta CoinGecko UNA sola vez cada 30s.
 * Todos los usuarios reciben ese mismo dato — evita bloqueos por rate limit.
 */
const axios = require('axios');
const logger = require('./logger');

const INTERVAL_MS = 30_000;
const TOP_COINS = [
  'bitcoin','ethereum','tether','binancecoin','solana',
  'ripple','usd-coin','staked-ether','dogecoin','cardano',
  'tron','avalanche-2','shiba-inu','polkadot','chainlink',
];

let cache = { data: [], updatedAt: null };

async function fetchPrices() {
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: TOP_COINS.join(','),
        order: 'market_cap_desc',
        per_page: TOP_COINS.length,
        page: 1,
        sparkline: true,
        price_change_percentage: '1h,24h,7d',
      },
      timeout: 10000,
    });
    cache = { data, updatedAt: Date.now() };
    logger.info(`[PriceCache] Precios actualizados (${data.length} monedas)`);
  } catch (err) {
    logger.error(`[PriceCache] Error al obtener precios: ${err.message}`);
  }
}

// Primer fetch al arrancar, luego cada 30s
fetchPrices();
setInterval(fetchPrices, INTERVAL_MS);

function getCache() {
  return cache;
}

module.exports = { getCache };
