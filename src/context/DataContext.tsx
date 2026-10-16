import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  DailyUpdate, 
  FeedbackRecord, 
  AttendanceRecord, 
  TargetItem, 
  AlertItem, 
  NotificationItem, 
  PerformanceBreakdown, 
  PerformanceWeights,
  MetricCalculationConfig,
  UserProfile,
  Team,
  HolisticContributionRecord,
  ManagerChangeRequest
} from '../types';
import { 
  calculateTrainerMetrics, 
  computeOverallScore, 
  DEFAULT_WEIGHTS,
  DEFAULT_METRIC_CONFIG
} from '../lib/performanceEngine';
import { evaluateAlerts } from '../lib/alertEngine';
import { 
  createDailyUpdate as createDailyUpdateSupa,
  updateDailyUpdate as updateDailyUpdateSupa,
  deleteDailyUpdate as deleteDailyUpdateSupa,
  fetchDailyUpdates as fetchDailyUpdatesSupa,
  createClass as createClassSupa,
  updateClass as updateClassSupa,
  deleteClass as deleteClassSupa,
  fetchClasses as fetchClassesSupa,
  createTask as createTaskSupa,
  updateTask as updateTaskSupa,
  deleteTask as deleteTaskSupa,
  fetchTasks as fetchTasksSupa,
  createProject as createProjectSupa,
  updateProject as updateProjectSupa,
  deleteProject as deleteProjectSupa,
  fetchProjects as fetchProjectsSupa,
  fetchAllProfiles as fetchAllProfilesSupa,
  fetchPerformanceWeights as fetchPerformanceWeightsSupa,
  savePerformanceWeights as savePerformanceWeightsSupa,
  fetchTeams as fetchTeamsSupa,
  fetchFeedbacks as fetchFeedbacksSupa,
  createFeedback as createFeedbackSupa,
  deleteFeedback as deleteFeedbackSupa,
  deleteProfile as deleteProfileSupa,
  upsertProfile as upsertProfileSupa
} from '../lib/supabaseDb';
import { supabase } from '../lib/supabase';

import { 
  validateTrainerManagerOwnership,
  isManagerAuthorizedForTrainer,
  filterTrainersByManagerOwnership,
  filterClassesByManagerOwnership,
  filterTasksByManagerOwnership,
  filterProjectsByManagerOwnership,
  filterDailyUpdatesByManagerOwnership,
  filterFeedbackByManagerOwnership,
  filterAttendanceByManagerOwnership,
  filterTargetsByManagerOwnership,
  filterAlertsByManagerOwnership,
  filterHolisticContributionsByManagerOwnership,
  filterTeamsByManagerOwnership,
  OwnershipValidationResult
} from '../lib/permissionChecker';

export const isTraineeMappedToManager = (trainee: UserProfile, manager: UserProfile | null): boolean => {
  return isManagerAuthorizedForTrainer(trainee, manager);
};

export { validateTrainerManagerOwnership };

interface DataContextType {
  // Collections
  classes: ClassItem[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  dailyUpdates: DailyUpdate[];
  feedbacks: FeedbackRecord[];
  attendanceList: AttendanceRecord[];
  targets: TargetItem[];
  alerts: AlertItem[];
  notifications: NotificationItem[];
  allTrainers: UserProfile[];
  allRegisteredTrainers: UserProfile[];
  allManagers: UserProfile[];
  teams: Team[];
  holisticContributions: HolisticContributionRecord[];
  userHolisticContributions: HolisticContributionRecord[];
  managerChangeRequests: ManagerChangeRequest[];

  // Persistent Selected Trainee State for Manager Workspace
  selectedTraineeId: string;
  setSelectedTraineeId: (id: string) => void;
  
  // Performance Engine
  currentMetrics: PerformanceBreakdown;
  currentOverallScore: number;
  performanceWeights: PerformanceWeights;
  setPerformanceWeights: (weights: PerformanceWeights) => void;
  metricConfig: MetricCalculationConfig;
  updateMetricConfig: (config: MetricCalculationConfig) => Promise<void>;
  
  // Trainer Actions
  addDailyUpdate: (update: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDailyUpdate: (id: string, data: Partial<DailyUpdate>) => Promise<void>;
  deleteDailyUpdate: (id: string) => Promise<void>;

  addHolisticContribution: (item: Omit<HolisticContributionRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateHolisticContribution: (id: string, data: Partial<HolisticContributionRecord>) => Promise<void>;
  deleteHolisticContribution: (id: string) => Promise<void>;
  
  addClass: (classItem: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateClass: (id: string, data: Partial<ClassItem>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  updateTaskProgress: (id: string, completionPercentage: number, status?: TaskItem['status'], remarks?: string) => Promise<void>;
  createTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteTask: (id: string) => Promise<void>;
  
  createProject: (project: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProjectMilestone: (projectId: string, milestoneId: string, progress: number, status: 'Not Started' | 'In Progress' | 'Completed') => Promise<void>;
  updateProject: (id: string, data: Partial<ProjectItem>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  addTarget: (target: Omit<TargetItem, 'id' | 'createdAt'>) => Promise<string>;
  updateTargetProgress: (id: string, currentValue: number) => Promise<void>;
  deleteTarget: (id: string) => Promise<void>;

  // Manager Change Request Actions
  submitManagerChangeRequest: (req: Omit<ManagerChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requestDate'>) => Promise<string>;
  approveManagerChangeRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectManagerChangeRequest: (requestId: string, notes?: string) => Promise<void>;
  
  // Manager Actions
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  addFeedback: (fb: Omit<FeedbackRecord, 'id' | 'createdAt'>) => Promise<string>;
  deleteFeedback: (id: string) => Promise<void>;
  deleteTrainer: (userId: string) => Promise<void>;
  
  // Notification Actions
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Data Seeding
  reseedData: () => Promise<void>;
  isSeeding: boolean;

  loadingData: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isManager } = useAuth();
  
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [targets, setTargets] = useState<TargetItem[]>(() => {
    try {
      const s = localStorage.getItem('nxtwave_targets');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    try {
      const s = localStorage.getItem('nxtwave_alerts');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [holisticContributions, setHolisticContributions] = useState<HolisticContributionRecord[]>(() => {
    try {
      const s = localStorage.getItem('nxtwave_holistic');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const s = localStorage.getItem('nxtwave_notifications');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [rawTrainers, setRawTrainers] = useState<UserProfile[]>([]);
  const [allManagers, setAllManagers] = useState<UserProfile[]>([]);
  const [managerChangeRequests, setManagerChangeRequests] = useState<ManagerChangeRequest[]>(() => {
    try {
      const s = localStorage.getItem('nxtwave_change_requests');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [performanceWeights, setPerformanceWeights] = useState<PerformanceWeights>(DEFAULT_WEIGHTS);
  const [metricConfig, setMetricConfig] = useState<MetricCalculationConfig>(() => {
    try {
      const saved = localStorage.getItem('ENTERPRISE_METRIC_CALCULATION_CONFIG');
      if (saved) {
        return { ...DEFAULT_METRIC_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_METRIC_CONFIG;
  });
  const [loadingData, setLoadingData] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Load data from Supabase
  const loadSupabaseData = async () => {
    try {
      const [
        supaProfiles,
        supaUpdates,
        supaClasses,
        supaTasks,
        supaProjects,
        supaWeights,
        supaTeams,
        supaFeedbacks
      ] = await Promise.all([
        fetchAllProfilesSupa(),
        fetchDailyUpdatesSupa(),
        fetchClassesSupa(),
        fetchTasksSupa(),
        fetchProjectsSupa(),
        fetchPerformanceWeightsSupa(),
        fetchTeamsSupa(),
        fetchFeedbacksSupa(),
      ]);

      if (supaProfiles && supaProfiles.length > 0) {
        setRawTrainers(supaProfiles.filter(u => u.role === 'TRAINER'));
        setAllManagers(supaProfiles.filter(u => u.role === 'MANAGER'));
      }
      if (supaUpdates && supaUpdates.length > 0) {
        const sorted = [...supaUpdates].sort((a, b) => b.date.localeCompare(a.date));
        setDailyUpdates(sorted);
      }
      if (supaClasses && supaClasses.length > 0) {
        const sorted = [...supaClasses].sort((a, b) => b.date.localeCompare(a.date));
        setClasses(sorted);
      }
      if (supaTasks && supaTasks.length > 0) {
        setTasks(supaTasks);
      }
      if (supaProjects && supaProjects.length > 0) {
        setProjects(supaProjects);
      }
      if (supaWeights) {
        setPerformanceWeights(supaWeights);
      }
      if (supaTeams && supaTeams.length > 0) {
        setTeams(supaTeams);
      }
      if (supaFeedbacks && supaFeedbacks.length > 0) {
        setFeedbacks(supaFeedbacks);
      }
    } catch (err) {
      console.info('[Supabase] Initial fetch notice:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!userProfile) {
      setLoadingData(false);
      return;
    }

    loadSupabaseData();

    // Supabase Realtime channel for live synchronization
    const realtimeChannel = supabase
      .channel('supabase-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_updates' }, () => {
        fetchDailyUpdatesSupa().then(data => { if (data.length > 0) setDailyUpdates(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchClassesSupa().then(data => { if (data.length > 0) setClasses(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasksSupa().then(data => { if (data.length > 0) setTasks(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjectsSupa().then(data => { if (data.length > 0) setProjects(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAllProfilesSupa().then(data => {
          if (data.length > 0) {
            setRawTrainers(data.filter(u => u.role === 'TRAINER'));
            setAllManagers(data.filter(u => u.role === 'MANAGER'));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
        fetchFeedbacksSupa().then(data => { if (data.length > 0) setFeedbacks(data); });
      })
      .subscribe();

    const fallbackTimeout = setTimeout(() => {
      setLoadingData(false);
    }, 1500);

    return () => {
      clearTimeout(fallbackTimeout);
      realtimeChannel.unsubscribe();
    };
  }, [userProfile?.uid]);

  // Derived Trainer List scoped to Active Manager
  const allTrainers = useMemo(() => {
    return filterTrainersByManagerOwnership(rawTrainers, userProfile);
  }, [rawTrainers, userProfile]);

  // Persistent Selected Trainee State across all Manager Views
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>('');

  useEffect(() => {
    if (allTrainers && allTrainers.length > 0) {
      if (!selectedTraineeId || !allTrainers.some(t => t.uid === selectedTraineeId)) {
        setSelectedTraineeId(allTrainers[0].uid);
      }
    } else {
      setSelectedTraineeId('');
    }
  }, [allTrainers, selectedTraineeId]);

  const mappedTrainerUidSet = useMemo(() => {
    return new Set((allTrainers || []).map(t => t.uid));
  }, [allTrainers]);

  // Scoped datasets strictly validated against active manager ownership
  const contextualClasses = useMemo(() => {
    return filterClassesByManagerOwnership(classes, userProfile, mappedTrainerUidSet);
  }, [classes, userProfile, mappedTrainerUidSet]);

  const contextualTasks = useMemo(() => {
    return filterTasksByManagerOwnership(tasks, userProfile, mappedTrainerUidSet);
  }, [tasks, userProfile, mappedTrainerUidSet]);

  const contextualProjects = useMemo(() => {
    return filterProjectsByManagerOwnership(projects, userProfile, mappedTrainerUidSet, allTrainers);
  }, [projects, userProfile, mappedTrainerUidSet, allTrainers]);

  const contextualDailyUpdates = useMemo(() => {
    return filterDailyUpdatesByManagerOwnership(dailyUpdates, userProfile, mappedTrainerUidSet);
  }, [dailyUpdates, userProfile, mappedTrainerUidSet]);

  const contextualFeedbacks = useMemo(() => {
    return filterFeedbackByManagerOwnership(feedbacks, userProfile, mappedTrainerUidSet);
  }, [feedbacks, userProfile, mappedTrainerUidSet]);

  const contextualAttendanceList = useMemo(() => {
    return filterAttendanceByManagerOwnership(attendanceList, userProfile, mappedTrainerUidSet);
  }, [attendanceList, userProfile, mappedTrainerUidSet]);

  const contextualTargets = useMemo(() => {
    return filterTargetsByManagerOwnership(targets, userProfile, mappedTrainerUidSet);
  }, [targets, userProfile, mappedTrainerUidSet]);

  const contextualAlerts = useMemo(() => {
    return filterAlertsByManagerOwnership(alerts, userProfile, mappedTrainerUidSet);
  }, [alerts, userProfile, mappedTrainerUidSet]);

  const contextualHolisticContributions = useMemo(() => {
    return filterHolisticContributionsByManagerOwnership(holisticContributions, userProfile, mappedTrainerUidSet, allTrainers);
  }, [holisticContributions, userProfile, mappedTrainerUidSet, allTrainers]);

  const contextualTeams = useMemo(() => {
    return filterTeamsByManagerOwnership(teams, userProfile);
  }, [teams, userProfile]);

  const userClasses = userProfile ? (classes || []).filter(c => c.userId === userProfile.uid) : [];
  const userTasks = userProfile ? (tasks || []).filter(t => t.assignedTo === userProfile.uid) : [];
  const userProjects = userProfile ? (projects || []).filter(p => p.assignedTo === userProfile.uid) : [];
  const userFeedbacks = userProfile ? (feedbacks || []).filter(f => f.userId === userProfile.uid) : [];
  const userAttendance = userProfile ? (attendanceList || []).filter(a => a.userId === userProfile.uid) : [];
  const userDailyUpdates = userProfile ? (dailyUpdates || []).filter(u => {
    if (u.userId && u.userId === userProfile.uid) return true;
    if (userProfile.employeeId && u.employeeId && u.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
    if (userProfile.companyEmail && ((u as any).userEmail || (u as any).email || (u as any).companyEmail) && ((u as any).userEmail || (u as any).email || (u as any).companyEmail).toLowerCase() === userProfile.companyEmail.toLowerCase()) return true;
    if (userProfile.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
    return false;
  }) : [];

  const userHolisticContributions = userProfile ? (holisticContributions || []).filter(h => {
    if (h.userId && h.userId === userProfile.uid) return true;
    if (userProfile.employeeId && h.employeeId && h.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
    if (userProfile.fullName && h.employeeName && h.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
    return false;
  }) : [];

  const currentMetrics = calculateTrainerMetrics(
    userClasses,
    userTasks,
    userProjects,
    userFeedbacks,
    userAttendance,
    90,
    userDailyUpdates
  );

  const currentOverallScore = computeOverallScore(currentMetrics, performanceWeights);

  // Auto evaluate dynamic alerts
  useEffect(() => {
    if (!userProfile || isManager) return;
    const dynamicAlerts = evaluateAlerts(
      userProfile,
      userTasks,
      userProjects,
      (dailyUpdates || []).filter(u => u.userId === userProfile.uid),
      currentMetrics,
      currentOverallScore
    );

    dynamicAlerts.forEach((newAlert) => {
      const exists = alerts.some(a => a.id === newAlert.id || (a.entityId === newAlert.entityId && a.type === newAlert.type));
      if (!exists) {
        setAlerts(prev => {
          const updated = [newAlert, ...prev];
          localStorage.setItem('nxtwave_alerts', JSON.stringify(updated));
          return updated;
        });
      }
    });
  }, [userProfile?.uid, userTasks.length, userProjects.length, currentOverallScore]);

  // Actions
  const addDailyUpdate = async (update: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `upd-${Date.now()}`;
    const now = new Date().toISOString();
    const newDoc: DailyUpdate = {
      ...update,
      id,
      userId: update.userId || userProfile?.uid || '',
      employeeId: update.employeeId || userProfile?.employeeId || '',
      employeeName: update.employeeName || userProfile?.fullName || '',
      userEmail: (update as any).userEmail || userProfile?.companyEmail || '',
      createdAt: now,
      updatedAt: now,
    };

    setDailyUpdates(prev => {
      const filtered = prev.filter(u => u.id !== id);
      const next = [newDoc, ...filtered];
      next.sort((a, b) => b.date.localeCompare(a.date));
      return next;
    });

    try {
      const supaId = await createDailyUpdateSupa(update);
      if (supaId) {
        setDailyUpdates(prev => prev.map(u => u.id === id ? { ...u, id: supaId } : u));
        return supaId;
      }
    } catch (err) {
      console.info('[Supabase] addDailyUpdate notice:', err);
    }

    return id;
  };

  const updateDailyUpdate = async (id: string, data: Partial<DailyUpdate>) => {
    const updatedAt = new Date().toISOString();
    setDailyUpdates(prev => {
      const next = prev.map(item => item.id === id ? ({ ...item, ...data, id, updatedAt } as DailyUpdate) : item);
      next.sort((a, b) => b.date.localeCompare(a.date));
      return next;
    });

    try {
      await updateDailyUpdateSupa(id, data);
    } catch (err) {
      console.info('[Supabase] updateDailyUpdate notice:', err);
    }
  };

  const deleteDailyUpdate = async (id: string) => {
    setDailyUpdates(prev => prev.filter(u => u.id !== id));
    try {
      await deleteDailyUpdateSupa(id);
    } catch (err) {
      console.info('[Supabase] deleteDailyUpdate notice:', err);
    }
  };

  const addHolisticContribution = async (item: Omit<HolisticContributionRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `hc-${Date.now()}`;
    const now = new Date().toISOString();
    const newDoc: HolisticContributionRecord = {
      ...item,
      id,
      userId: item.userId || userProfile?.uid || '',
      employeeId: item.employeeId || userProfile?.employeeId || '',
      employeeName: item.employeeName || userProfile?.fullName || '',
      managerId: item.managerId || userProfile?.managerId || '',
      managerName: item.managerName || userProfile?.managerName || '',
      createdAt: now,
      updatedAt: now,
    };

    setHolisticContributions(prev => {
      const next = [newDoc, ...prev.filter(h => h.id !== id)];
      next.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      localStorage.setItem('nxtwave_holistic', JSON.stringify(next));
      return next;
    });

    return id;
  };

  const updateHolisticContribution = async (id: string, data: Partial<HolisticContributionRecord>) => {
    const updatedAt = new Date().toISOString();
    setHolisticContributions(prev => {
      const next = prev.map(h => h.id === id ? ({ ...h, ...data, id, updatedAt } as HolisticContributionRecord) : h);
      next.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      localStorage.setItem('nxtwave_holistic', JSON.stringify(next));
      return next;
    });
  };

  const deleteHolisticContribution = async (id: string) => {
    setHolisticContributions(prev => {
      const next = prev.filter(h => h.id !== id);
      localStorage.setItem('nxtwave_holistic', JSON.stringify(next));
      return next;
    });
  };

  const addClass = async (classItem: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `cls-${Date.now()}`;
    const now = new Date().toISOString();
    const newDoc: ClassItem = {
      ...classItem,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setClasses(prev => [newDoc, ...prev]);

    try {
      const supaId = await createClassSupa(classItem);
      if (supaId) {
        setClasses(prev => prev.map(c => c.id === id ? { ...c, id: supaId } : c));
        return supaId;
      }
    } catch (err) {
      console.info('[Supabase] addClass notice:', err);
    }

    return id;
  };

  const updateClass = async (id: string, data: Partial<ClassItem>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
    try {
      await updateClassSupa(id, data);
    } catch (err) {
      console.info('[Supabase] updateClass notice:', err);
    }
  };

  const deleteClass = async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    try {
      await deleteClassSupa(id);
    } catch (err) {
      console.info('[Supabase] deleteClass notice:', err);
    }
  };

  const updateTaskProgress = async (
    id: string, 
    completionPercentage: number, 
    status?: TaskItem['status'], 
    remarks?: string
  ) => {
    let resolvedStatus = status;
    if (!resolvedStatus) {
      if (completionPercentage >= 100) resolvedStatus = 'Completed';
      else if (completionPercentage > 0) resolvedStatus = 'In Progress';
      else resolvedStatus = 'Not Started';
    }

    setTasks(prev => prev.map(t => t.id === id ? {
      ...t,
      completionPercentage,
      status: resolvedStatus,
      remarks: remarks !== undefined ? remarks : t.remarks,
      updatedAt: new Date().toISOString(),
    } : t));

    try {
      await updateTaskSupa(id, { completionPercentage, status: resolvedStatus, remarks });
    } catch (err) {
      console.info('[Supabase] updateTask notice:', err);
    }
  };

  const createTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `tsk-${Date.now()}`;
    const now = new Date().toISOString();
    const newDoc: TaskItem = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setTasks(prev => [newDoc, ...prev]);

    try {
      const supaId = await createTaskSupa(task);
      if (supaId) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, id: supaId } : t));
        return supaId;
      }
    } catch (err) {
      console.info('[Supabase] createTask notice:', err);
    }

    return id;
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTaskSupa(id);
    } catch (err) {
      console.info('[Supabase] deleteTask notice:', err);
    }
  };

  const createProject = async (project: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `prj-${Date.now()}`;
    const now = new Date().toISOString();
    const newDoc: ProjectItem = {
      ...project,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setProjects(prev => [newDoc, ...prev]);

    try {
      const supaId = await createProjectSupa(project);
      if (supaId) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, id: supaId } : p));
        return supaId;
      }
    } catch (err) {
      console.info('[Supabase] createProject notice:', err);
    }

    return id;
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try {
      await deleteProjectSupa(id);
    } catch (err) {
      console.info('[Supabase] deleteProject notice:', err);
    }
  };

  const updateProjectMilestone = async (
    projectId: string, 
    milestoneId: string, 
    progress: number, 
    status: 'Not Started' | 'In Progress' | 'Completed'
  ) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const defaultStages = [
      'Planning',
      'Research',
      'Requirement Analysis',
      'Design',
      'Architecture & Prototyping',
      'Development',
      'Testing',
      'Deployment',
      'Completed',
    ] as const;

    let milestones = proj.milestones && proj.milestones.length > 0 
      ? [...proj.milestones] 
      : defaultStages.map((st, i) => ({
          id: `ms_${projectId}_${i}`,
          projectId,
          title: `${st} Deliverable`,
          stage: st,
          status: (proj.currentStage === st ? 'In Progress' : 'Not Started') as any,
          progress: proj.currentStage === st ? 50 : 0,
          order: i + 1,
        }));

    let idx = milestones.findIndex(m => m.id === milestoneId);
    if (idx === -1) {
      idx = milestones.findIndex(m => 
        milestoneId.toLowerCase().includes(m.stage.toLowerCase()) || 
        milestoneId.endsWith(`_${m.order - 1}`) ||
        milestoneId.endsWith(`_${m.order}`)
      );
    }

    if (idx !== -1) {
      milestones[idx] = {
        ...milestones[idx],
        progress,
        status,
        completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
      };

      const totalProgress = milestones.reduce((sum, m) => sum + (m.progress || 0), 0);
      const overall = Math.round(totalProgress / Math.max(1, milestones.length));

      let currentStatus: ProjectItem['currentStatus'] = proj.currentStatus;
      if (overall >= 100) currentStatus = 'Completed';
      else if (currentStatus === 'Completed' && overall < 100) currentStatus = 'On Track';

      let activeStage = proj.currentStage;
      if (status === 'In Progress') {
        activeStage = milestones[idx].stage;
      } else if (status === 'Completed' && idx < milestones.length - 1 && overall < 100) {
        if (milestones[idx + 1].status === 'Not Started') {
          milestones[idx + 1].status = 'In Progress';
          activeStage = milestones[idx + 1].stage;
        }
      }

      const updates: Partial<ProjectItem> = {
        milestones,
        overallCompletionPercentage: overall,
        currentStatus,
        currentStage: activeStage,
        updatedAt: new Date().toISOString(),
      };

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));

      try {
        await updateProjectSupa(projectId, updates);
      } catch (err) {
        console.info('[Supabase] updateProjectMilestone notice:', err);
      }
    }
  };

  const updateProject = async (id: string, data: Partial<ProjectItem>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
    try {
      await updateProjectSupa(id, data);
    } catch (err) {
      console.info('[Supabase] updateProject notice:', err);
    }
  };

  const addTarget = async (target: Omit<TargetItem, 'id' | 'createdAt'>) => {
    const id = `tgt-${Date.now()}`;
    const newDoc: TargetItem = {
      ...target,
      id,
      createdAt: new Date().toISOString(),
    };
    setTargets(prev => {
      const next = [newDoc, ...prev];
      localStorage.setItem('nxtwave_targets', JSON.stringify(next));
      return next;
    });
    return id;
  };

  const updateTargetProgress = async (id: string, currentValue: number) => {
    const target = targets.find(t => t.id === id);
    if (!target) return;
    const isAchieved = currentValue >= target.targetValue;
    setTargets(prev => {
      const next = prev.map(t => t.id === id ? {
        ...t,
        currentValue,
        status: isAchieved ? 'Achieved' : 'In Progress',
      } as TargetItem : t);
      localStorage.setItem('nxtwave_targets', JSON.stringify(next));
      return next;
    });
  };

  const deleteTarget = async (id: string) => {
    setTargets(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem('nxtwave_targets', JSON.stringify(next));
      return next;
    });
  };

  const acknowledgeAlert = async (alertId: string) => {
    setAlerts(prev => {
      const next = prev.map(a => a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } as AlertItem : a);
      localStorage.setItem('nxtwave_alerts', JSON.stringify(next));
      return next;
    });
  };

  const resolveAlert = async (alertId: string) => {
    setAlerts(prev => {
      const next = prev.map(a => a.id === alertId ? { ...a, status: 'RESOLVED', resolvedAt: new Date().toISOString() } as AlertItem : a);
      localStorage.setItem('nxtwave_alerts', JSON.stringify(next));
      return next;
    });
  };

  const addFeedback = async (fb: Omit<FeedbackRecord, 'id' | 'createdAt'>) => {
    const id = `fb-${Date.now()}`;
    const newDoc: FeedbackRecord = {
      ...fb,
      id,
      createdAt: new Date().toISOString(),
    };
    setFeedbacks(prev => [newDoc, ...prev]);

    try {
      const supaId = await createFeedbackSupa(fb);
      if (supaId) {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, id: supaId } : f));
        return supaId;
      }
    } catch (err) {
      console.info('[Supabase] addFeedback notice:', err);
    }

    return id;
  };

  const deleteFeedback = async (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
    try {
      await deleteFeedbackSupa(id);
    } catch (err) {
      console.info('[Supabase] deleteFeedback notice:', err);
    }
  };

  const deleteTrainer = async (userId: string) => {
    setRawTrainers(prev => prev.filter(t => t.uid !== userId));
    try {
      await deleteProfileSupa(userId);
    } catch (err) {
      console.info('[Supabase] deleteTrainer notice:', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('nxtwave_notifications', JSON.stringify(next));
      return next;
    });
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('nxtwave_notifications', JSON.stringify(next));
      return next;
    });
  };

  const updateMetricConfig = async (newConfig: MetricCalculationConfig) => {
    setMetricConfig(newConfig);
    try {
      localStorage.setItem('ENTERPRISE_METRIC_CALCULATION_CONFIG', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to persist metric config:', e);
    }
  };

  const reseedData = async () => {
    setIsSeeding(true);
    try {
      await loadSupabaseData();
    } catch (e) {
      console.error('Reseed error:', e);
    } finally {
      setIsSeeding(false);
    }
  };

  const submitManagerChangeRequest = async (
    req: Omit<ManagerChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requestDate'>
  ): Promise<string> => {
    const existingPending = managerChangeRequests.find(
      r => r.instructorId === req.instructorId && r.status === 'PENDING'
    );
    if (existingPending) {
      throw new Error('A manager change request is already pending review. Please wait for your current manager to process it before submitting another.');
    }

    const id = `mcr-${Date.now()}`;
    const now = new Date().toISOString();
    const newDoc: ManagerChangeRequest = {
      ...req,
      id,
      status: 'PENDING',
      requestDate: now,
      createdAt: now,
      updatedAt: now,
    };

    setManagerChangeRequests(prev => {
      const next = [newDoc, ...prev.filter(r => r.id !== id)];
      localStorage.setItem('nxtwave_change_requests', JSON.stringify(next));
      return next;
    });

    // Notify manager
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: req.currentManagerId,
      title: 'New Manager Change Request',
      message: `${req.instructorName} (${req.instructorEmployeeId}) has requested a manager change to ${req.requestedManagerName}.`,
      type: 'PERFORMANCE',
      read: false,
      createdAt: now,
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      localStorage.setItem('nxtwave_notifications', JSON.stringify(next));
      return next;
    });

    return id;
  };

  const approveManagerChangeRequest = async (requestId: string, notes?: string): Promise<void> => {
    const targetReq = managerChangeRequests.find(r => r.id === requestId);
    if (!targetReq) throw new Error('Manager change request not found');

    const now = new Date().toISOString();
    const updatedReq: Partial<ManagerChangeRequest> = {
      status: 'APPROVED',
      reviewedDate: now,
      reviewNotes: notes?.trim() || 'Approved by manager',
      updatedAt: now,
    };

    setManagerChangeRequests(prev => {
      const next = prev.map(r => r.id === requestId ? { ...r, ...updatedReq } : r);
      localStorage.setItem('nxtwave_change_requests', JSON.stringify(next));
      return next;
    });

    // Update in Supabase profiles
    try {
      await upsertProfileSupa({
        employeeId: targetReq.instructorEmployeeId,
        companyEmail: targetReq.instructorEmail,
        managerId: targetReq.requestedManagerId,
        managerName: targetReq.requestedManagerName,
      });
    } catch (se) {
      console.warn('Supabase upsert notice on manager change:', se);
    }

    // Update raw trainers state
    setRawTrainers(prev => prev.map(t => t.uid === targetReq.instructorId ? {
      ...t,
      managerId: targetReq.requestedManagerId,
      managerName: targetReq.requestedManagerName,
      managerEmail: targetReq.requestedManagerEmail,
      updatedAt: now,
    } : t));

    // Notify instructor
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetReq.instructorId,
      title: 'Manager Change Request Approved',
      message: `Your request to transfer to manager ${targetReq.requestedManagerName} has been approved. Your profile mapping is now updated.`,
      type: 'PERFORMANCE',
      read: false,
      createdAt: now,
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      localStorage.setItem('nxtwave_notifications', JSON.stringify(next));
      return next;
    });
  };

  const rejectManagerChangeRequest = async (requestId: string, notes?: string): Promise<void> => {
    const targetReq = managerChangeRequests.find(r => r.id === requestId);
    if (!targetReq) throw new Error('Manager change request not found');

    const now = new Date().toISOString();
    const updatedReq: Partial<ManagerChangeRequest> = {
      status: 'REJECTED',
      reviewedDate: now,
      reviewNotes: notes?.trim() || 'Request rejected by manager',
      updatedAt: now,
    };

    setManagerChangeRequests(prev => {
      const next = prev.map(r => r.id === requestId ? { ...r, ...updatedReq } : r);
      localStorage.setItem('nxtwave_change_requests', JSON.stringify(next));
      return next;
    });

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetReq.instructorId,
      title: 'Manager Change Request Rejected',
      message: `Your request to transfer to manager ${targetReq.requestedManagerName} was rejected by ${targetReq.currentManagerName}.${notes ? ` Notes: "${notes}"` : ''}`,
      type: 'ALERT',
      read: false,
      createdAt: now,
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      localStorage.setItem('nxtwave_notifications', JSON.stringify(next));
      return next;
    });
  };

  return (
    <DataContext.Provider
      value={{
        classes: contextualClasses,
        tasks: contextualTasks,
        projects: contextualProjects,
        dailyUpdates: contextualDailyUpdates,
        feedbacks: contextualFeedbacks,
        attendanceList: contextualAttendanceList,
        targets: contextualTargets,
        alerts: contextualAlerts,
        notifications,
        allTrainers,
        allRegisteredTrainers: rawTrainers,
        allManagers,
        teams: contextualTeams,
        holisticContributions: contextualHolisticContributions,
        userHolisticContributions,
        managerChangeRequests,
        selectedTraineeId,
        setSelectedTraineeId,
        currentMetrics,
        currentOverallScore,
        performanceWeights,
        setPerformanceWeights,
        metricConfig,
        updateMetricConfig,
        addDailyUpdate,
        updateDailyUpdate,
        deleteDailyUpdate,
        addHolisticContribution,
        updateHolisticContribution,
        deleteHolisticContribution,
        addClass,
        updateClass,
        deleteClass,
        updateTaskProgress,
        createTask,
        deleteTask,
        createProject,
        updateProjectMilestone,
        updateProject,
        deleteProject,
        addTarget,
        updateTargetProgress,
        deleteTarget,
        submitManagerChangeRequest,
        approveManagerChangeRequest,
        rejectManagerChangeRequest,
        acknowledgeAlert,
        resolveAlert,
        addFeedback,
        deleteFeedback,
        deleteTrainer,
        markNotificationRead,
        markAllNotificationsRead,
        reseedData,
        isSeeding,
        loadingData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
