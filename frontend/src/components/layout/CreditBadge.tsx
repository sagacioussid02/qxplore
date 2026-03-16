import { useCreditStore } from '../../store/creditStore';

export function CreditBadge() {
  const credits = useCreditStore((s) => s.credits);
  return (
    <div className="flex items-center gap-2 px-4 py-2 card-quantum">
      <span className="text-quantum-amber text-lg">⚛</span>
      <span className="font-mono font-bold text-quantum-amber">{credits.toLocaleString()}</span>
      <span className="text-gray-400 text-sm">credits</span>
    </div>
  );
}
