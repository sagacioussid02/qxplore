import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Home from './pages/Home';
import CoinGamePage from './pages/CoinGamePage';
import RouletteGamePage from './pages/RouletteGamePage';
import TicTacToePage from './pages/TicTacToePage';
import AccountPage from './pages/AccountPage';
import CircuitComposerPage from './pages/CircuitComposerPage';
import RSAPage from './pages/RSAPage';
import CircuitTTTPage from './pages/CircuitTTTPage';
import PrepPage from './pages/PrepPage';
import ChallengePage from './pages/ChallengePage';
import BenchmarkPage from './pages/BenchmarkPage';
import BenchmarkRunPage from './pages/BenchmarkRunPage';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/coin" element={<CoinGamePage />} />
          <Route path="/roulette" element={<RouletteGamePage />} />
          <Route path="/ttt" element={<TicTacToePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/circuit" element={<CircuitComposerPage />} />
          <Route path="/rsa" element={<RSAPage />} />
          <Route path="/circuit-ttt" element={<CircuitTTTPage />} />
          <Route path="/prep" element={<PrepPage />} />
          <Route path="/prep/:slug" element={<ChallengePage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/benchmark/run/:id" element={<BenchmarkRunPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
