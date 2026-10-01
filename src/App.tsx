import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from './services/api';
import { User, TRexStatus } from './types';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardTab } from './components/DashboardTab';
import { ProfileEditorTab } from './components/ProfileEditorTab';
import { ConsoleTab } from './components/ConsoleTab';
import { ReportsTab } from './components/ReportsTab';
import { TrafficAnalysisTab } from './components/TrafficAnalysisTab';
import { SettingsTab } from './components/SettingsTab';
import { NctLogo } from './components/NctLogo';

export default function App() {
  const [user, setUser] = useState<User | null>(() => ApiClient.getUser());
  const [status, setStatus] = useState<TRexStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profiles' | 'console' | 'traffic-analysis' | 'reports' | 'settings'>('dashboard');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
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

            {activeTab === 'traffic-analysis' && (
              <TrafficAnalysisTab status={status} />
            )}

            {activeTab === 'profiles' && (
              <ProfileEditorTab
                initialDir={editorTarget.dir}
                initialProfile={editorTarget.profile}
              />
            )}

            {activeTab === 'console' && (
              <ConsoleTab status={status} user={user} />
            )}

            {activeTab === 'reports' && <ReportsTab />}

            {activeTab === 'settings' && (
              <SettingsTab
                user={user}
                status={status}
                onRefresh={fetchStatus}
              />
            )}
          </main>

          {/* Corporate Footer with NCT Informática */}
          <footer className="border-t border-slate-800/80 bg-slate-900/90 py-3 px-4 text-xs text-slate-400 font-mono">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <NctLogo className="h-4 text-slate-300" />
                <span className="text-slate-300 font-semibold">NCT Informática</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 text-[11px]">Plataforma de Alta Performance DPDK</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Cisco TRex v3.08 • Host: {status?.serverIp || '10.69.70.20'}</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
