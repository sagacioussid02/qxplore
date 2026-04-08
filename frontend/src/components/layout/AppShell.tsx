import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditBadge } from './CreditBadge';
import { ConceptChat } from '../agents/ConceptChat';
import { AuthModal } from '../auth/AuthModal';
import { UserMenu } from '../auth/UserMenu';
import { useAuth } from '../../hooks/useAuth';

const NAV_LINKS = [
  { to: '/', label: 'Arcade', icon: '🕹', inDev: false },
  { to: '/coin', label: 'Quantum Coin', icon: '🪙', inDev: false },
  { to: '/roulette', label: 'Roulette', icon: '🎡', inDev: true },
  { to: '/ttt', label: 'Quantum TTT', icon: '⊗', inDev: false },
  { to: '/circuit', label: 'Circuit Lab', icon: '⊕', inDev: false },
  { to: '/rsa', label: 'RSA vs Shor', icon: '🔐', inDev: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const { user, credits, isAuthenticated, signOut, startStripeCheckout } = useAuth();

  return (
    <div className="min-h-screen bg-quantum-navy flex flex-col">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Top nav */}
      <header className="border-b border-quantum-border bg-quantum-dark sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <img src="/favicon.svg" alt="Binosus logo" className="w-9 h-9" />
              <div className="flex flex-col leading-none">
                <span className="text-lg font-mono font-bold text-quantum-cyan glow-cyan tracking-wide">
                  Qxplore
                </span>
                <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
                  by Binosus
                </span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                link.inDev ? (
                  <span
                    key={link.to}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 cursor-not-allowed relative group"
                    title="In Development"
                  >
                    {link.icon} {link.label}
                    <span className="absolute -top-1 -right-1 text-[9px] px-1 rounded bg-gray-700 text-gray-400 font-mono leading-tight">dev</span>
                  </span>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all no-underline ${
                      location.pathname === link.to
                        ? 'bg-quantum-surface text-quantum-cyan border border-quantum-border'
                        : 'text-gray-400 hover:text-white hover:bg-quantum-surface'
                    }`}
                  >
                    {link.icon} {link.label}
                  </Link>
                )
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <CreditBadge />
            {isAuthenticated && user ? (
              <UserMenu
                user={user}
                credits={credits}
                onSignOut={signOut}
                onBuyCredits={startStripeCheckout}
              />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content + sidebar */}
      <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 gap-6">
        <main className="flex-1 min-w-0">{children}</main>
        <aside className="hidden xl:block w-80 shrink-0">
          <div className="sticky top-24">
            <ConceptChat />
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-quantum-border bg-quantum-dark mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 h-10 flex items-center justify-center">
          <span className="text-xs text-gray-500 font-mono">
            © {new Date().getFullYear()} Binosus. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
