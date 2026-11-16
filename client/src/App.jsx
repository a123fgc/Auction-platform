import Navbar from './components/common/Navbar';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <div className="min-h-full">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AppRoutes />
      </main>
    </div>
  );
}