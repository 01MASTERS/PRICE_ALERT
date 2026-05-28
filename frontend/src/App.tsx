import { Toaster } from 'react-hot-toast';
import { Home } from './pages/Home';

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      <Home />
    </>
  );
}

export default App;