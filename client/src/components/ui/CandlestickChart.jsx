import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

export default function CandlestickChart({ data = [], height = 280, livePrice = null }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const candleRef    = useRef(null);
  const volumeRef    = useRef(null);
  const lineRef      = useRef(null);
  const [hoveredCandle, setHoveredCandle] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        attributionLogo: false,
        background: { color: 'transparent' },
        textColor: '#6B7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(139,92,246,0.6)', width: 1, style: 1, labelBackgroundColor: '#8B5CF6' },
        horzLine: { color: 'rgba(139,92,246,0.6)', width: 1, style: 1, labelBackgroundColor: '#8B5CF6' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor: '#6B7280',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor: '#6B7280',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Serie de velas
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:         '#10B981',
      downColor:       '#F43F5E',
      borderUpColor:   '#10B981',
      borderDownColor: '#F43F5E',
      wickUpColor:     '#10B981',
      wickDownColor:   '#F43F5E',
    });

    // Serie de volumen (simulado desde las velas)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Línea de precio actual
    const priceLine = chart.addSeries(CandlestickSeries, {
      upColor:         'transparent',
      downColor:       'transparent',
      borderUpColor:   'transparent',
      borderDownColor: 'transparent',
      wickUpColor:     'transparent',
      wickDownColor:   'transparent',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;
    lineRef.current   = priceLine;

    // Tooltip al hacer hover
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredCandle(null);
        return;
      }
      const candle = param.seriesData.get(candleSeries);
      if (candle) setHoveredCandle(candle);
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [height]);

  // Actualizar datos de velas y volumen
  useEffect(() => {
    if (!candleRef.current || !data.length) return;
    const sorted = [...data].sort((a, b) => a.time - b.time);
    candleRef.current.setData(sorted);

    // Volumen simulado: diferencia entre high y low como proxy
    const volData = sorted.map(c => ({
      time:  c.time,
      value: Math.abs(c.high - c.low) * 1000,
      color: c.close >= c.open ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.4)',
    }));
    volumeRef.current?.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Actualizar precio en tiempo real
  useEffect(() => {
    if (!candleRef.current || !livePrice || !data.length) return;
    const last = [...data].sort((a, b) => a.time - b.time).at(-1);
    if (!last) return;
    candleRef.current.update({
      ...last,
      close: livePrice,
      high:  Math.max(last.high, livePrice),
      low:   Math.min(last.low, livePrice),
    });
  }, [livePrice, data]);

  const fmtPrice = (n) => n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="relative">
      {/* OHLC info al hacer hover */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-3 text-[11px] font-mono pointer-events-none">
        {hoveredCandle ? (
          <>
            <span className="text-faint">A <span className="text-white">{fmtPrice(hoveredCandle.open)}</span></span>
            <span className="text-green">H {fmtPrice(hoveredCandle.high)}</span>
            <span className="text-rose">L {fmtPrice(hoveredCandle.low)}</span>
            <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-green' : 'text-rose'}>
              C {fmtPrice(hoveredCandle.close)}
            </span>
          </>
        ) : (
          <span className="text-faint/50 text-[10px]">Pasa el cursor sobre una vela</span>
        )}
      </div>

      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
}
