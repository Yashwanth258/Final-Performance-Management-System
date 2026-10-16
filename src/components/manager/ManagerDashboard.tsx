import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Award, 
  Calendar, 
  Plus, 
  TrendingUp, 
  Flame,
  UserCheck,
  MapPin,
  ChevronDown,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowRight,
  GitCompare,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { KpiCard } from '../common/KpiCard';
import { Tooltip as UiTooltip } from '../common/Tooltip';
import { TrainerBurnoutWeeklyView } from './TrainerBurnoutWeeklyView';
import { TrainerSearchAutocomplete } from './TrainerSearchAutocomplete';

interface ManagerDashboardProps {
  onNavigate: (view: string) => void;
  onSelectEmployee?: (empId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigate, onSelectEmployee }) => {
  const { userProfile } = useAuth();
  const { 
    allTrainers = [], 
    classes = [], 
    tasks = [], 
    projects = [], 
    dailyUpdates = [],
    feedbacks = [], 
    attendanceList = [],
    managerChangeRequests = [],
    performanceWeights,
    selectedTraineeId,
    setSelectedTraineeId,
  } = useData();

  const pendingChangeRequests = (managerChangeRequests || []).filter(r => r.status === 'PENDING');

  // Handler when manager selects a trainee from any component in dashboard
  const handleSelectTrainer = (id: string) => {
    setSelectedTraineeId(id);
    if (onSelectEmployee) {
      onSelectEmployee(id);
    }
  };

  // KPI Calculations
  const totalTeamMembers = (allTrainers || []).length;
  const activeEmployees = (allTrainers || []).filter(t => t.isActive).length;

  const totalTasksCompleted = (tasks || []).filter(t => t.status === 'Completed').length;
  const totalTasksAssigned = (tasks || []).length;
  const taskCompletionRate = totalTasksAssigned > 0 ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 0;

  // Selected trainer profile
  const currentTrainer = (allTrainers || []).find(t => t.uid === selectedTraineeId) || allTrainers[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Welcome Banner */}
      <div className="rounded-2xl border border-sky-200 bg-linear-to-r from-sky-600 via-sky-700 to-blue-800 p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-sky-100 backdrop-blur-xs mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Executive Manager Oversight Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Instructor Workload &amp; Operations Center
            </h1>
            <p className="mt-1 text-sm text-sky-100/90 max-w-2xl">
              {userProfile?.fullName || 'Manager'} • {userProfile?.designation || 'Capability Manager'}
            </p>
          </div>

          {/* Quick Manager Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <UiTooltip content="Add upcoming training batch and calendar session" placement="bottom">
              <button
                type="button"
                onClick={() => onNavigate('class-tracking')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/30 transition-colors"
                aria-label="Schedule Class"
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule Class</span>
              </button>
            </UiTooltip>
            <UiTooltip content="Export comprehensive Excel workbooks (.xlsx) for individual instructors and full team" placement="bottom">
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/30 transition-colors cursor-pointer"
                aria-label="Reports & Excel Export Hub"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Reports & Excel Hub</span>
              </button>
            </UiTooltip>
          </div>
        </div>
      </div>

      {/* Pending Manager Change Requests Alert Banner */}
      {pendingChangeRequests.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shrink-0 border border-amber-300">
              <GitCompare className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  Manager Change Requests Pending Review
                </h3>
                <span className="rounded-full bg-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-0.5 border border-amber-300">
                  {pendingChangeRequests.length} Pending
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                {pendingChangeRequests.length === 1
                  ? `${pendingChangeRequests[0].instructorName} (${pendingChangeRequests[0].instructorEmployeeId}) has requested a reporting manager transfer to ${pendingChangeRequests[0].requestedManagerName}.`
                  : `${pendingChangeRequests.length} instructors have requested manager transfers awaiting your review and approval.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('manager-change-requests')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Review Change Requests</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Mapped Trainees Status Notice if empty */}
      {allTrainers.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-slate-800 shadow-xs flex items-start gap-3.5">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              No Trainees Currently Mapped to Your Workspace
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              When trainees sign up or update their profile with you as their <strong>Reporting Manager</strong> ({userProfile?.fullName || 'Manager'} • Employee ID: {userProfile?.employeeId || userProfile?.uid}), their workload, scorecard, daily logs, and metrics will appear in your workspace.
            </p>
          </div>
        </div>
      )}

      {/* 4-Box Overview Grid: Team Name, Assigned Trainee Focus, Deployment Location, Task Completion Rate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Box 1: Team Organization / Team Name */}
        <KpiCard
          title="Team Name & Organization"
          value={userProfile?.teamName || 'Engineering Talent Org'}
          subtitle={`${activeEmployees} Active / ${totalTeamMembers} Total Registered`}
          icon={Users}
          variant="primary"
        />

        {/* Box 2: Assigned Trainee Focus (Searchable Autocomplete) */}
        <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-sky-600 block">
                Assigned Trainee Focus
              </span>
              <span className="text-sm font-extrabold text-slate-800 block mt-0.5 truncate max-w-[150px]">
                {currentTrainer?.fullName || 'No Trainees Mapped'}
              </span>
            </div>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600 border border-sky-100">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2">
            {allTrainers && allTrainers.length > 0 ? (
              <TrainerSearchAutocomplete
                trainers={allTrainers}
                selectedTrainerId={selectedTraineeId}
                onSelectTrainer={handleSelectTrainer}
                compact={true}
                placeholder="Type 2+ letters (e.g. 'es', 'pri')..."
              />
            ) : (
              <div className="py-2 text-xs text-slate-400 italic">
                No trainees mapped yet.
              </div>
            )}
          </div>
          <span className="text-2xs text-slate-400 mt-1 block">
            {allTrainers && allTrainers.length > 0 ? 'Select to view daily work & burnout' : 'Trainees will appear when mapped'}
          </span>
        </div>

        {/* Box 3: Deployment Location (Next to Assigned Trainee Focus, Same Size) */}
        <KpiCard
          title="Deployment Location"
          value={currentTrainer?.location || 'Hyderabad Campus'}
          subtitle={`Campus & location for ${currentTrainer?.fullName || 'selected trainee'}`}
          icon={MapPin}
          variant="primary"
        />

        {/* Box 4: Active Direct Reports */}
        <KpiCard
          title="Active Direct Reports"
          value={`${activeEmployees} / ${totalTeamMembers}`}
          subtitle={`${activeEmployees} active instructors on roster`}
          icon={Users}
          variant="primary"
          onClick={() => onNavigate('reports')}
        />
      </div>

      {/* Main Dedicated Trainer Work Hours & Weekly Burnout Analysis Section */}
      <TrainerBurnoutWeeklyView
        trainers={allTrainers}
        dailyUpdates={dailyUpdates}
        selectedTrainerId={selectedTraineeId}
        onSelectTrainer={handleSelectTrainer}
      />

      {/* Executive Reports & Excel Export Hub Section */}
      <div className="rounded-2xl border border-sky-200 bg-linear-to-br from-white via-sky-50/30 to-emerald-50/20 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Reports &amp; Excel Export Hub
              </h2>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-200">
                .xlsx Workbooks
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Export verified individual instructor reports or full team multi-sheet workbooks (.xlsx) with daily logs, sessions conducted, workload hours, leave records, and missing log tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto"
            aria-label="Open Reports & Excel Hub"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Open Reports &amp; Excel Hub</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </button>
        </div>

        {/* 2-Option Feature Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1 Card */}
          <div className="rounded-xl border border-sky-200 bg-white p-4.5 shadow-2xs hover:border-sky-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                  Export Option 1
                </span>
                <span className="text-2xs text-slate-400 font-medium">Single Instructor</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Individual Instructor Report (.xlsx)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select any instructor and download their complete Excel workbook including daily attendance, sessions conducted, workload, and leave audit trail with custom date filters.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500">Live preview + verified database records</span>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Select &amp; Export</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Option 2 Card */}
          <div className="rounded-xl border border-emerald-200 bg-white p-4.5 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Export Option 2
                </span>
                <span className="text-2xs text-slate-400 font-medium">{allTrainers.length} Instructors</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Full Individual Reports Workbook (.xlsx)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate a multi-sheet Excel file with an executive team summary plus dedicated, separate worksheets for every instructor managed by you.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500">Includes {allTrainers.length + 1} worksheets in one .xlsx file</span>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Export Full Team</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


