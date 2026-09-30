import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from './services/api';
import { User, TRexStatus } from './types';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardTab } from './components/DashboardTab';
import { ProfileEditorTab } from './components/ProfileEditorTab';
import { ConsoleTab } from './components/ConsoleTab';
import { ReportsTab } from './components/ReportsTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  const [user, setUser] = useState<User | null>(() => ApiClient.getUser());
  const [status, setStatus] = useState<TRexStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profiles' | 'console' | 'reports' | 'settings'>('dashboard');
  const [editorTarget, setEditorTarget] = useState<{ dir: string; profile: string }>({
    dir: 'stl',
    profile: 'imix.yaml',
  });

  // Fetch status from backend
  const fetchStatus = useCallback(async () => {
    if (!ApiClient.getToken()) return;
    try {
      const data = await ApiClient.getStatus();
      setStatus(data);
    } catch (err: any) {
      if (err.message?.includes('Sessão expirada') || err.message?.includes('401')) {
        setUser(null);
      }
    }
  }, []);

  // Poll status every 1.5 seconds when user is logged in
  useEffect(() => {
    if (!user) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, [user, fetchStatus]);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    fetchStatus();
  };

  const handleLogout = () => {
    ApiClient.logout();
    setUser(null);
    setStatus(null);
  };

  const handleEmergencyStop = async () => {
    try {
      await ApiClient.executeAction({ action: 'stop' });
      fetchStatus();
    } catch (err) {
      console.error('Failed to trigger emergency stop', err);
    }
  };

  const handleNavigateToEditor = (dir: string, profile: string) => {
    setEditorTarget({ dir, profile });
    setActiveTab('profiles');
  };

  return (
    <div className="min-h-screen bg-[#1e1f29] text-[#f8f8f2] flex flex-col font-sans selection:bg-[#bd93f9]/30 selection:text-[#50fa7b]">
      {/* If not logged in, show Login Modal */}
      {!user ? (
        <LoginModal onSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar
            user={user}
            status={status}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onEmergencyStop={handleEmergencyStop}
            onLogout={handleLogout}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {activeTab === 'dashboard' && (
              <DashboardTab
                status={status}
                onRefreshStatus={fetchStatus}
                onNavigateToEditor={handleNavigateToEditor}
              />
            )}

            {activeTab === 'profiles' && (
              <ProfileEditorTab
                initialDir={editorTarget.dir}
                initialProfile={editorTarget.profile}
              />
            )}

            {activeTab === 'console' && <ConsoleTab />}

            {activeTab === 'reports' && <ReportsTab />}

            {activeTab === 'settings' && (
              <SettingsTab
                user={user}
                status={status}
                onRefresh={fetchStatus}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-[#44475a]/60 bg-[#191a21] py-3 px-4 text-center text-xs text-[#6272a4] font-mono">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#50fa7b]" />
                <span>Cisco TRex v3.08 Control Plane • Servidor: {status?.serverIp || '10.69.70.20'}</span>
              </div>
              <div className="text-[11px] text-[#6272a4]">
                Arquitetura Desacoplada: Frontend React + Backend Node.js Express (JWT & spawn seguro)
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
