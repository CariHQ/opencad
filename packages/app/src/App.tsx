import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { useAuthStore } from './stores/authStore';
import { isFirebaseConfigured } from './lib/firebase';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, trialStatus } = useAuthStore();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Firebase not configured → skip auth gate (local dev / OSS self-hosted)
  if (!isFirebaseConfigured) return <>{children}</>;

  if (status === 'loading') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <span className="auth-spinner" style={{ width:24, height:24, borderWidth:3 }} aria-label="Loading" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <AuthModal required />;
  }

  if (trialStatus === 'expired') {
    return (
      <>
        <div className="trial-gate-overlay">
          <div className="trial-gate-card">
            <div className="trial-gate-icon">⏳</div>
            <div className="trial-gate-title">Your trial has ended</div>
            <div className="trial-gate-body">
              Your 14-day free trial is over. Upgrade to keep designing with OpenCAD.
            </div>
            <button className="btn-upgrade" onClick={() => setShowUpgrade(true)}>
              Upgrade — from $29/mo
            </button>
          </div>
        </div>
        {showUpgrade && <SubscriptionModal onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthGate>
        <Routes>
          <Route path="/" element={<ProjectDashboard />} />
          <Route path="/project/:id" element={<AppLayout />} />
        </Routes>
      </AuthGate>
    </ErrorBoundary>
  );
}

export default App;
