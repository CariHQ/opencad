import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="/project/:id" element={<AppLayout />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
