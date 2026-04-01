import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Home from './pages/Home';
import CoinGamePage from './pages/CoinGamePage';
import RouletteGamePage from './pages/RouletteGamePage';
import TicTacToePage from './pages/TicTacToePage';
import NCAABracketPage from './pages/NCAABracketPage';
import AccountPage from './pages/AccountPage';
import CircuitComposerPage from './pages/CircuitComposerPage';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/coin" element={<CoinGamePage />} />
          <Route path="/roulette" element={<RouletteGamePage />} />
          <Route path="/ttt" element={<TicTacToePage />} />
          <Route path="/ncaa" element={<NCAABracketPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/circuit" element={<CircuitComposerPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
