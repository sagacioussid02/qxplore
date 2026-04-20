interface Props {
  seconds: number;
  running: boolean;
  limit?: number;
}

export function TimerBadge({ seconds, running, limit }: Props) {
  const over = limit != null && seconds > limit * 0.8;
  const color = over ? '#f97316' : running ? '#00ffff' : '#6b7280';

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <span
      className="font-mono text-sm px-3 py-1 rounded-full border"
      style={{ color, borderColor: `${color}60`, background: `${color}12` }}
    >
      {running ? '⏱' : '⏸'} {mm}:{ss}
    </span>
  );
}
