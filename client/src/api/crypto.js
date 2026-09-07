import axios from 'axios';
import api from './axios';

const cg = axios.create({ baseURL: 'https://api.coingecko.com/api/v3' });

export const TOP_COINS = [
  'bitcoin','ethereum','tether','binancecoin','solana',
  'ripple','usd-coin','staked-ether','dogecoin','cardano',
  'tron','avalanche-2','shiba-inu','polkadot','chainlink',
];

export const COIN_META = {
  bitcoin:      { symbol: 'BTC', name: 'Bitcoin' },
  ethereum:     { symbol: 'ETH', name: 'Ethereum' },
  tether:       { symbol: 'USDT', name: 'Tether' },
  binancecoin:  { symbol: 'BNB', name: 'BNB' },
  solana:       { symbol: 'SOL', name: 'Solana' },
  ripple:       { symbol: 'XRP', name: 'XRP' },
  'usd-coin':   { symbol: 'USDC', name: 'USD Coin' },
  'staked-ether':{ symbol: 'stETH', name: 'Lido Staked ETH' },
  dogecoin:     { symbol: 'DOGE', name: 'Dogecoin' },
  cardano:      { symbol: 'ADA', name: 'Cardano' },
  tron:         { symbol: 'TRX', name: 'TRON' },
  'avalanche-2':{ symbol: 'AVAX', name: 'Avalanche' },
  'shiba-inu':  { symbol: 'SHIB', name: 'Shiba Inu' },
  polkadot:     { symbol: 'DOT', name: 'Polkadot' },
  chainlink:    { symbol: 'LINK', name: 'Chainlink' },
};

export async function getMarkets(ids = TOP_COINS) {
  try {
    // Usar caché del servidor — evita que cada usuario llame a CoinGecko
    const { data: res } = await api.get('/markets');
    if (res.data?.length) return res.data;
  } catch {}
  // Fallback directo a CoinGecko si el servidor falla
  const { data } = await cg.get('/coins/markets', {
    params: {
      vs_currency: 'usd',
      ids: ids.join(','),
      order: 'market_cap_desc',
      per_page: ids.length,
      page: 1,
      sparkline: true,
      price_change_percentage: '1h,24h,7d',
    }
  });
  return data;
}

export async function getCoinDetail(id) {
  const { data } = await cg.get(`/coins/${id}`, {
    params: { localization: false, tickers: false, community_data: false, developer_data: false }
  });
  return data;
}

export async function getChartData(id, days = 1) {
  const { data } = await cg.get(`/coins/${id}/market_chart`, {
    params: { vs_currency: 'usd', days }
  });
  return data.prices.map(([ts, price]) => ({ time: ts, price }));
}

function pricesToCandles(prices, intervalMs) {
  const buckets = {};
  for (const [ts, price] of prices) {
    const bucket = Math.floor(ts / intervalMs) * Math.floor(intervalMs / 1000);
    if (!buckets[bucket]) {
      buckets[bucket] = { time: bucket, open: price, high: price, low: price, close: price };
    } else {
      buckets[bucket].high  = Math.max(buckets[bucket].high, price);
      buckets[bucket].low   = Math.min(buckets[bucket].low, price);
      buckets[bucket].close = price;
    }
  }
  return Object.values(buckets).sort((a, b) => a.time - b.time);
}

export async function getOHLCData(id, days = 1) {
  // Intentar OHLC nativo de CoinGecko
  try {
    const { data } = await cg.get(`/coins/${id}/ohlc`, {
      params: { vs_currency: 'usd', days }
    });
    if (data?.length > 2) {
      return data.map(([ts, open, high, low, close]) => ({
        time: Math.floor(ts / 1000),
        open, high, low, close,
      }));
    }
  } catch {}

  // Fallback: convertir precios lineales en velas agrupadas
  const { data } = await cg.get(`/coins/${id}/market_chart`, {
    params: { vs_currency: 'usd', days }
  });
  const intervalMs = days <= 1 ? 30 * 60 * 1000 : days <= 7 ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return pricesToCandles(data.prices, intervalMs);
}

export function fmtUSD(n) {
  if (n === undefined || n === null) return '$0.00';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1) return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${Number(n).toFixed(6)}`;
}

export function fmtPct(n) {
  if (!n) return '0.00%';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}
