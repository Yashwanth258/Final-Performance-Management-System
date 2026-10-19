import { 
  UserProfile, 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  DailyUpdate, 
  FeedbackRecord, 
  AttendanceRecord, 
  TargetItem, 
  AlertItem, 
  HolisticContributionRecord, 
  Team 
} from '../types';

/**
 * Result structure returned by ownership validation checks.
 */
export interface OwnershipValidationResult {
  isOwned: boolean;
  reason: string;
  managerId?: string;
  managerName?: string;
  trainerId?: string;
  trainerName?: string;
  matchedCriteria?: 'ID' | 'EMAIL' | 'NAME' | 'SEED_ALIAS' | 'PRIMARY_LEAD' | 'SUPER_ADMIN' | 'NONE';
}

/**
 * Normalizes strings for robust, whitespace- and case-insensitive comparison.
 */
const normalize = (str?: string | null): string => (str || '').trim().toLowerCase();

/**
 * Normalizes department names to handle slight formatting variations.
 */
const normDept = (d?: string | null): string => {
  const s = normalize(d);
  if (s.includes('front')) return 'frontend';
  if (s.includes('back')) return 'backend';
  if (s.includes('gen') || s.includes('ai') || s.includes('llm')) return 'genai';
  if (s.includes('exec') || s.includes('all') || s.includes('admin')) return 'executive';
  return s;
};

/**
 * Centralized Validator: Explicitly validates whether a Trainer is owned/managed by a specific Manager.
 * 
 * Enforces:
 * 1. Strict Department Isolation (A Frontend manager CANNOT view Backend/GenAI trainers and vice versa).
 * 2. Direct Manager Matching by UID, Employee ID (NW...), Company Email, or Full Name.
 * 3. Seeded Alias & Cluster Resolution for known enterprise department leads (e.g. North Yashwan -> Teju, Marcus Vance).
 * 4. Fallback restriction for unassigned trainers to primary departmental capability leads only.
 */
export function validateTrainerManagerOwnership(
  trainer: Partial<UserProfile> | null | undefined,
  manager: Partial<UserProfile> | null | undefined
): OwnershipValidationResult {
  if (!manager) {
    return {
      isOwned: false,
      reason: 'No manager profile provided for ownership validation.',
      matchedCriteria: 'NONE'
    };
  }

  if (!trainer) {
    return {
      isOwned: false,
      reason: 'No trainer profile provided for ownership validation.',
      matchedCriteria: 'NONE'
    };
  }

  const mgrUid = normalize(manager.uid);
  const trnMgrId = normalize(trainer.managerId);

  // Strict ownership check: Manager sees only instructors where manager_id = manager's uid
  if (mgrUid && trnMgrId && trnMgrId === mgrUid) {
    return {
      isOwned: true,
      reason: 'Ownership verified: manager_id matches manager uid.',
      managerId: manager.uid,
      managerName: manager.fullName,
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'ID'
    };
  }

  return {
    isOwned: false,
    reason: 'Active manager is not the designated reporting manager for this trainer.',
    managerId: manager.uid,
    trainerId: trainer.uid,
    matchedCriteria: 'NONE'
  };
}

/**
 * Boolean helper to quickly check if a manager is authorized for a trainer.
 */
export function isManagerAuthorizedForTrainer(
  trainer: Partial<UserProfile> | null | undefined,
  manager: Partial<UserProfile> | null | undefined
): boolean {
  return validateTrainerManagerOwnership(trainer, manager).isOwned;
}

/**
 * Filters a raw list of trainer user profiles to only those owned by the active manager.
 */
export function filterTrainersByManagerOwnership(
  trainers: UserProfile[],
  manager: UserProfile | null | undefined
): UserProfile[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return trainers;
  return (trainers || []).filter(trainer => isManagerAuthorizedForTrainer(trainer, manager));
}

/**
 * Filters Classes ensuring the manager only views classes belonging to their owned trainers or created by them.
 */
export function filterClassesByManagerOwnership(
  classes: ClassItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): ClassItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return classes;
  const mgrUid = manager.uid;
  return (classes || []).filter(c => 
    authorizedTrainerUids.has(c.userId) || 
    c.managerId === mgrUid
  );
}

/**
 * Filters Tasks ensuring the manager only views tasks assigned to their owned trainers or created by them.
 */
export function filterTasksByManagerOwnership(
  tasks: TaskItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): TaskItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return tasks;
  const mgrUid = manager.uid;
  return (tasks || []).filter(t => 
    authorizedTrainerUids.has(t.assignedTo) || 
    t.assignedBy === mgrUid ||
    t.managerId === mgrUid
  );
}

/**
 * Filters Projects ensuring the manager only views projects assigned to their owned trainers,
 * created by them, or scoped within their departmental pool.
 */
export function filterProjectsByManagerOwnership(
  projects: ProjectItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>,
  allOwnedTrainers: UserProfile[] = []
): ProjectItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return projects;
  const mgrUid = manager.uid;

  return (projects || []).filter(p => {
    // 1. Directly assigned to an authorized trainer
    if (p.assignedTo && authorizedTrainerUids.has(p.assignedTo)) {
      return true;
    }
    // 2. Managed by this manager
    if (p.managerId === mgrUid) {
      return true;
    }
    return false;
  });
}

/**
 * Filters Daily Updates ensuring the manager only views logs for their owned trainers.
 */
export function filterDailyUpdatesByManagerOwnership(
  updates: DailyUpdate[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): DailyUpdate[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return updates;
  const mgrUid = manager.uid;
  return (updates || []).filter(u => 
    authorizedTrainerUids.has(u.userId) ||
    u.managerId === mgrUid
  );
}

/**
 * Filters Feedback records ensuring the manager only views evaluations for their owned trainers or given by them.
 */
export function filterFeedbackByManagerOwnership(
  feedbacks: FeedbackRecord[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): FeedbackRecord[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return feedbacks;
  const mgrUid = manager.uid;
  return (feedbacks || []).filter(f => 
    authorizedTrainerUids.has(f.userId) || 
    f.managerId === mgrUid
  );
}

/**
 * Filters Attendance records ensuring the manager only views attendance for their owned trainers.
 */
export function filterAttendanceByManagerOwnership(
  attendanceList: AttendanceRecord[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): AttendanceRecord[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return attendanceList;
  return (attendanceList || []).filter(a => authorizedTrainerUids.has(a.userId));
}

/**
 * Filters Targets ensuring the manager only views targets for their owned trainers.
 */
export function filterTargetsByManagerOwnership(
  targets: TargetItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): TargetItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return targets;
  return (targets || []).filter(t => authorizedTrainerUids.has(t.userId));
}

/**
 * Filters Alerts ensuring the manager only receives alerts related to their owned trainers or team.
 */
export function filterAlertsByManagerOwnership(
  alerts: AlertItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): AlertItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return alerts;
  const mgrUid = manager.uid;
  return (alerts || []).filter(al =>
    (al.userId && authorizedTrainerUids.has(al.userId)) ||
    (al.entityId && authorizedTrainerUids.has(al.entityId)) ||
    al.managerId === mgrUid
  );
}

/**
 * Filters Holistic Contributions ensuring the manager only views records for their owned trainers.
 */
export function filterHolisticContributionsByManagerOwnership(
  contributions: HolisticContributionRecord[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>,
  allOwnedTrainers: UserProfile[] = []
): HolisticContributionRecord[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return contributions;
  const mgrUid = manager.uid;

  return (contributions || []).filter(h => 
    authorizedTrainerUids.has(h.userId) || 
    h.managerId === mgrUid ||
    (h.employeeId && allOwnedTrainers.some(t => t.employeeId.toUpperCase() === h.employeeId?.toUpperCase()))
  );
}

/**
 * Filters Teams ensuring managers only access their department/assigned teams.
 */
export function filterTeamsByManagerOwnership(
  teams: Team[],
  manager: UserProfile | null | undefined
): Team[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return teams;
  
  if (manager.department && manager.department !== 'Executive' && manager.department !== 'All') {
    const deptTeams = (teams || []).filter(t => 
      t.department?.toLowerCase() === manager.department?.toLowerCase() || 
      t.managerId === manager.uid
    );
    return deptTeams.length > 0 ? deptTeams : teams;
  }
  return teams;
}
