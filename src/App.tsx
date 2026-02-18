import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicWorld } from './routes/PublicWorld';
import { AdminPanel } from './routes/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicWorld />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
