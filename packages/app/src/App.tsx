import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components';
import { ProjectDashboard } from './components/ProjectDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectDashboard />} />
      <Route path="/project/:id" element={<AppLayout />} />
    </Routes>
  );
}

export default App;
