import { useAuth } from '../../hooks/useAuth';
import { useCreditStore } from '../../store/creditStore';

export function CreditBadge() {
  const { isAuthenticated, credits: serverCredits } = useAuth();
  const localCredits = useCreditStore((s) => s.credits);

  // Authenticated users: show server-managed credits
  // Anonymous users: show local credit store
  const display = isAuthenticated
    ? (serverCredits === null ? '…' : serverCredits.toLocaleString())
    : localCredits.toLocaleString();

  return (
    <div className="flex items-center gap-2 px-4 py-2 card-quantum">
      <span className="text-quantum-amber text-lg">⚛</span>
      <span className="font-mono font-bold text-quantum-amber">{display}</span>
      <span className="text-gray-400 text-sm">credits</span>
    </div>
  );
}
