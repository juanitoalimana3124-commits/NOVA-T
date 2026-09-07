import { ResponsiveContainer, LineChart, Line } from 'recharts';

export function SparklineChart({ data, isUp }) {
  const points = (data || []).slice(-30).map((price, i) => ({ i, price }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={isUp ? '#05B169' : '#E3291C'}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
