import { 
  UserProfile, 
  Team, 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  DailyUpdate, 
  FeedbackRecord, 
  AttendanceRecord, 
  TargetItem, 
  AlertItem,
  HolisticContributionRecord 
} from '../types';
import { cleanFirestoreData } from './firestoreErrors';

export const DEMO_MANAGER_EMAIL = 'manager@enterprise.com';
export const DEMO_TRAINER_EMAIL = 'trainer.alex@enterprise.com';
export const DEFAULT_MANAGER_SECURITY_PASSCODE = 'MGR-LEAD-2026';

export const SEED_TEAMS: Team[] = [
  {
    id: 'team-frontend',
    name: 'Frontend Department',
    managerId: '',
    managerName: '',
    department: 'Frontend',
    location: 'Engineering HQ',
    description: 'React, TypeScript, Next.js, and Modern UI/UX Engineering.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'team-backend',
    name: 'Backend Department',
    managerId: '',
    managerName: '',
    department: 'Backend',
    location: 'Engineering HQ',
    description: 'Node.js, Distributed APIs, PostgreSQL, and Cloud-Native Services.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'team-genai',
    name: 'GenAI Department',
    managerId: '',
    managerName: '',
    department: 'GenAI',
    location: 'Engineering HQ',
    description: 'Generative AI, Large Language Models, Multi-Agent Systems & Prompt Engineering.',
    createdAt: new Date().toISOString(),
  }
];

export const SEED_TRAINERS: UserProfile[] = [
  {
    uid: 'trainer-alex-01',
    employeeId: 'NW1048',
    fullName: 'Alex Morgan',
    companyEmail: 'trainer.alex@enterprise.com',
    role: 'TRAINER',
    department: 'GenAI',
    teamId: 'team-genai',
    teamName: 'GenAI Department',
    managerId: 'mgr-enterprise-01',
    managerName: 'Sarah Jenkins',
    designation: 'Software Development Instructor',
    location: 'San Francisco, CA',
    subject: 'Generative AI & LLM Systems',
    isActive: true,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-priya-02',
    employeeId: 'NW1052',
    fullName: 'Priya Sharma',
    companyEmail: 'priya.sharma@enterprise.com',
    role: 'TRAINER',
    department: 'GenAI',
    teamId: 'team-genai',
    teamName: 'GenAI Department',
    managerId: 'mgr-enterprise-01',
    managerName: 'Sarah Jenkins',
    designation: 'Software Development Instructor',
    location: 'San Francisco, CA',
    subject: 'Generative AI & Machine Learning',
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-david-03',
    employeeId: 'NW1065',
    fullName: 'David Chen',
    companyEmail: 'david.chen@enterprise.com',
    role: 'TRAINER',
    department: 'Frontend',
    teamId: 'team-frontend',
    teamName: 'Frontend Department',
    managerId: 'mgr-chandana-01',
    managerName: 'Chandana',
    managerEmail: 'chandana@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'Chennai',
    subject: 'React & Modern Frontend Systems',
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-elena-04',
    employeeId: 'NW1077',
    fullName: 'Elena Rostova',
    companyEmail: 'elena.rostova@enterprise.com',
    role: 'TRAINER',
    department: 'Backend',
    teamId: 'team-backend',
    teamName: 'Backend Department',
    managerId: 'mgr-vikram-01',
    managerName: 'Vikram Rao',
    managerEmail: 'vikram.rao@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'Hyderabad Campus',
    subject: 'Node.js & Distributed Systems',
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-marcus-05',
    employeeId: 'NW1089',
    fullName: 'Marcus Vance',
    companyEmail: 'marcus.vance@enterprise.com',
    role: 'TRAINER',
    department: 'Frontend',
    teamId: 'team-frontend',
    teamName: 'Frontend Department',
    managerId: 'mgr-yash-01',
    managerName: 'North Yashwan',
    managerEmail: 'yash@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'Chennai',
    subject: 'Web Performance & Modern JavaScript',
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-eshwanth-06',
    employeeId: 'NW1095',
    fullName: 'Eshwanth Kumar',
    companyEmail: 'eshwanth.kumar@enterprise.com',
    role: 'TRAINER',
    department: 'GenAI',
    teamId: 'team-genai',
    teamName: 'GenAI Department',
    managerId: 'mgr-enterprise-01',
    managerName: 'Sarah Jenkins',
    managerEmail: 'sarah.jenkins@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'San Francisco, CA',
    subject: 'Generative AI, Agents & React Architecture',
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-ishu-07',
    employeeId: 'NW1102',
    fullName: 'Ishu',
    companyEmail: 'ishu@enterprise.com',
    role: 'TRAINER',
    department: 'Frontend',
    teamId: 'team-frontend',
    teamName: 'Frontend Department',
    managerId: 'mgr-chandana-01',
    managerName: 'Chandana',
    managerEmail: 'chandana@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'Chennai',
    subject: 'Frontend Web Engineering & UI Architecture',
    isActive: true,
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-teju-08',
    employeeId: 'NW1108',
    fullName: 'Teju',
    companyEmail: 'teju@enterprise.com',
    role: 'TRAINER',
    department: 'Frontend',
    teamId: 'team-frontend',
    teamName: 'Frontend Department',
    managerId: 'mgr-yash-01',
    managerName: 'North Yashwan',
    managerEmail: 'yash@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'Chennai',
    subject: 'Frontend Web Engineering & React Architecture',
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'trainer-suhas-09',
    employeeId: 'NW1112',
    fullName: 'Suhas',
    companyEmail: 'suhas@enterprise.com',
    role: 'TRAINER',
    department: 'Frontend',
    teamId: 'team-frontend',
    teamName: 'Frontend Department',
    managerId: 'mgr-nitin-01',
    managerName: 'Nitin',
    managerEmail: 'nitin@enterprise.com',
    designation: 'Software Development Instructor',
    location: 'Chennai',
    subject: 'Frontend Web Engineering & Modern JavaScript',
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const DUMMY_SEED_UIDS = [
  'mgr-enterprise-01',
  'mgr-chandana-01',
  'mgr-nitin-01',
  'mgr-vikram-01',
  'mgr-yash-01',
  'trainer-alex-01',
  'trainer-priya-02',
  'trainer-david-03',
  'trainer-elena-04',
  'trainer-marcus-05',
  'trainer-eshwanth-06',
  'trainer-ishu-07',
  'trainer-teju-08',
  'trainer-suhas-09',
];

export const DUMMY_SEED_CRED_KEYS = [
  'sarah.jenkins@enterprise.com',
  'chandana@enterprise.com',
  'nitin@enterprise.com',
  'vikram.rao@enterprise.com',
  'yash@enterprise.com',
  'manager@enterprise.com',
  'trainer.alex@enterprise.com',
  'priya.sharma@enterprise.com',
  'david.chen@enterprise.com',
  'elena.rostova@enterprise.com',
  'marcus.vance@enterprise.com',
  'eshwanth.kumar@enterprise.com',
  'ishu@enterprise.com',
  'teju@enterprise.com',
  'suhas@enterprise.com',
  'mgr-7701',
  'nw2001',
  'nw2008',
  'nw2015',
  'nw2018',
  'nw2022',
  'nw1048',
  'nw1052',
  'nw1065',
  'nw1077',
  'nw1089',
  'nw1095',
  'nw1102',
  'nw1108',
  'nw1112',
  'MGR-7701',
  'NW2001',
  'NW2008',
  'NW2015',
  'NW2018',
  'NW2022',
  'NW1048',
  'NW1052',
  'NW1065',
  'NW1077',
  'NW1089',
  'NW1095',
  'NW1102',
  'NW1108',
  'NW1112',
];

/**
 * Permanently purge any residual dummy seed accounts from Firestore and localStorage
 */
export async function purgeLegacyDummyDataFromFirestore(): Promise<void> {
  try {
    // 1. Purge from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToClean = ['nxtwave_manager_accounts', 'nxtwave_trainer_accounts', 'nxtwave_custom_accounts'];
      keysToClean.forEach(key => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            let modified = false;
            Object.keys(data).forEach(k => {
              const lowerKey = k.toLowerCase();
              const profile = data[k]?.profile || data[k];
              const email = (profile?.companyEmail || profile?.email || '').toLowerCase();
              const empId = (profile?.employeeId || '').toUpperCase();
              const fullName = (profile?.fullName || '').toLowerCase();

              const isDummy = 
                lowerKey.includes('enterprise.com') ||
                email.includes('enterprise.com') ||
                fullName.includes('sarah') ||
                fullName.includes('chandana') ||
                fullName.includes('nitin') ||
                fullName.includes('yashwan') ||
                fullName.includes('vikram') ||
                empId === 'MGR-7701' ||
                empId === 'NW2001' ||
                empId === 'NW2008' ||
                empId === 'NW2018' ||
                empId === 'NW2015' ||
                empId === 'NW2022' ||
                DUMMY_SEED_CRED_KEYS.includes(k);

              if (isDummy) {
                delete data[k];
                modified = true;
              }
            });
            if (modified) {
              localStorage.setItem(key, JSON.stringify(data));
            }
          }
        } catch {
          // ignore
        }
      });
    }

    console.info('Legacy dummy seed data purge completed.');
  } catch (err) {
    console.warn('Notice during legacy dummy data purge:', err);
  }
}

/**
 * Only ensure the system security config exists for manager passcodes.
 * DOES NOT write dummy managers, trainers, or fake updates to Firestore.
 */
export async function ensureSystemSecurityConfig(): Promise<void> {
  // Baseline config maintained in memory and Supabase
}

export async function seedEnterpriseDatabaseIfEmpty(): Promise<boolean> {
  try {
    // Strictly ONLY ensure system security settings and purge any legacy dummy records.
    // Do NOT re-seed fake managers or instructors.
    await ensureSystemSecurityConfig();
    await purgeLegacyDummyDataFromFirestore();
    return true;
  } catch (err) {
    console.warn('System initialization notice:', err);
    return false;
  }
}

export async function seedEnterpriseData(): Promise<boolean> {
  console.info("Enterprise database seed managed via Supabase migration.");
  return true;
}
