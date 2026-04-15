import { AppLayout } from './components';
import { ProjectDashboard } from './components/ProjectDashboard';
import { useProjectStore } from './stores/projectStore';

function App() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  return activeProjectId ? <AppLayout /> : <ProjectDashboard />;
}

export default App;
