import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/common/Toast';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import { useSessionInactivity } from './hooks/useSessionInactivity';
import { ActiveSessionTimeoutModal } from './components/common/ActiveSessionTimeoutModal';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { AuthPage } from './components/auth/AuthPage';

// Trainer Views
import { TrainerDashboard } from './components/trainer/TrainerDashboard';
import { DailyWorkView } from './components/trainer/DailyWorkView';
import { HolisticContributionsView } from './components/trainer/HolisticContributionsView';
import { ClassTrackingView } from './components/trainer/ClassTrackingView';
import { TaskManagementView } from './components/trainer/TaskManagementView';
import { ProjectTrackingView } from './components/trainer/ProjectTrackingView';
import { TrainerTargetsView } from './components/trainer/TrainerTargetsView';
import { TrainerProfileView } from './components/trainer/TrainerProfileView';

// Manager Views
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { TeamComparisonView } from './components/manager/TeamComparisonView';
import { ClassMonitoringView } from './components/manager/ClassMonitoringView';
import { TaskManagerView } from './components/manager/TaskManagerView';
import { ProjectManagerView } from './components/manager/ProjectManagerView';
import { AnalyticsView } from './components/manager/AnalyticsView';
import { AttentionRequiredView } from './components/manager/AttentionRequiredView';
import { ReportsView } from './components/manager/ReportsView';
import { CalculationMetricsView } from './components/manager/CalculationMetricsView';
import { ManagerProfileView } from './components/manager/ManagerProfileView';
import { ManagerChangeRequestsView } from './components/manager/ManagerChangeRequestsView';

const MainAppContent: React.FC = () => {
  const { isManager, isTrainer, userProfile, loading } = useAuth();
  const { allTrainers, selectedTraineeId, setSelectedTraineeId } = useData();
  const { addToast } = useToast();

  // Restore current view from URL hash or localStorage to keep page on reload
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) return hash;
      const saved = localStorage.getItem('sb-current-view');
      if (saved) return saved;
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Automatic 30-Minute Session Inactivity Security Guard
  const { showWarningModal, remainingSeconds, extendSession, logoutNow } = useSessionInactivity();

  const handleExtendSession = useCallback(() => {
    extendSession();
    addToast({
      id: `session-extended-${Date.now()}`,
      title: 'Active Session Renewed',
      message: 'Your active session has been renewed for another 30 minutes.',
      type: 'info',
      category: 'system',
      duration: 3500,
    });
  }, [extendSession, addToast]);

  const handleNavigate = useCallback((view: string) => {
    // If navigating to removed sections, gracefully route to dashboard
    const target = (view === 'team-performance' || view === 'individual-performance')
      ? 'dashboard'
      : view;
    setCurrentView(target);
    try {
      localStorage.setItem('sb-current-view', target);
      if (typeof window !== 'undefined' && window.location.hash !== `#${target}`) {
        window.location.hash = target;
      }
    } catch {
      // ignore
    }
    setIsSidebarOpen(false);
  }, []);

  const handleSelectEmployee = (empId: string) => {
    setSelectedTraineeId(empId);
  };

  // Sync hash changes (e.g. browser back / forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== currentView) {
        setCurrentView(hash);
        try {
          localStorage.setItem('sb-current-view', hash);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  // Only reset view when user role actually transitions to a different role
  const previousRoleRef = useRef<string | null>(null);
  useEffect(() => {
    if (userProfile?.role) {
      if (previousRoleRef.current && previousRoleRef.current !== userProfile.role) {
        setCurrentView('dashboard');
        try {
          localStorage.setItem('sb-current-view', 'dashboard');
          window.location.hash = 'dashboard';
        } catch {
          // ignore
        }
      }
      previousRoleRef.current = userProfile.role;
    }
  }, [userProfile?.role]);

  // Real-time toast alerts for new tasks & approaching project deadlines (called unconditionally)
  useRealtimeNotifications(handleNavigate);

  // While active session is being verified / restored from Supabase on reload, show branded loader
  // This prevents the sign-in page from flashing before loading the user's workspace
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-sky-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-sky-600 border-t-transparent shadow-xs" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-sky-600 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-bold text-slate-800 tracking-tight">DailySync</span>
            <span className="text-[11px] font-semibold text-slate-500">Restoring active session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in after verification completes, show AuthPage
  if (!userProfile) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-sky-50 text-slate-800 antialiased">
      {/* Toast Notification Layer */}
      <ToastContainer />

      {/* Active Session Inactivity Warning Modal (Auto-locks dashboard at 30 min) */}
      <ActiveSessionTimeoutModal
        isOpen={showWarningModal}
        remainingSeconds={remainingSeconds}
        onExtendSession={handleExtendSession}
        onLogoutNow={logoutNow}
      />

      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-sky-50/50">
        {/* Top Navigation Bar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={handleNavigate}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* TRAINER VIEWS (Strictly only accessible to Trainers/Trainees) */}
            {isTrainer && (
              <>
                {currentView === 'dashboard' && <TrainerDashboard onNavigate={handleNavigate} />}
                {currentView === 'daily-work' && <DailyWorkView />}
                {(currentView === 'holistic-guidance' || currentView === 'holistic-contributions') && <HolisticContributionsView />}
                {currentView === 'task-management' && <TaskManagementView />}
                {(currentView === 'project-tracking' || currentView === 'projects') && <ProjectTrackingView />}
                {currentView === 'class-tracking' && <ClassTrackingView />}
                {(currentView === 'targets' || currentView === 'trainer-targets') && <TrainerTargetsView />}
                {(currentView === 'profile' || currentView === 'settings') && <TrainerProfileView />}
              </>
            )}

            {/* MANAGER VIEWS (Strictly only accessible to Managers) */}
            {isManager && (
              <>
                {(currentView === 'dashboard' || currentView === 'team-performance' || currentView === 'individual-performance') && (
                  <ManagerDashboard
                    onNavigate={handleNavigate}
                    onSelectEmployee={handleSelectEmployee}
                  />
                )}
                {currentView === 'team-comparison' && (
                  <TeamComparisonView />
                )}
                {currentView === 'class-monitoring' && <ClassMonitoringView />}
                {currentView === 'task-management' && <TaskManagerView />}
                {(currentView === 'project-tracking' || currentView === 'project-management' || currentView === 'projects') && <ProjectManagerView />}
                {currentView === 'analytics' && <AnalyticsView />}
                {currentView === 'attention-required' && <AttentionRequiredView />}
                {currentView === 'reports' && <ReportsView />}
                {(currentView === 'calculation-metrics' || currentView === 'metric-calculations' || currentView === 'calculations') && <CalculationMetricsView />}
                {(currentView === 'manager-change-requests' || currentView === 'change-requests') && (
                  <ManagerChangeRequestsView onNavigate={handleNavigate} />
                )}
                {(currentView === 'profile' || currentView === 'settings') && <ManagerProfileView />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
