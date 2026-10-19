import { 
  UserProfile, 
  Team 
} from '../types';

export const DEFAULT_MANAGER_SECURITY_PASSCODE = 'MGR-LEAD-2026';

// All seed and dummy arrays emptied - Supabase is the sole data source
export const SEED_TEAMS: Team[] = [];
export const SEED_TRAINERS: UserProfile[] = [];
export const DUMMY_SEED_UIDS: string[] = [];
export const DUMMY_SEED_CRED_KEYS: string[] = [];

/**
 * No-op utility functions to satisfy interface without any database inserts or seed operations.
 */
export async function purgeLegacyDummyDataFromFirestore(): Promise<void> {
  // No-op
}

export async function ensureSystemSecurityConfig(): Promise<void> {
  // No-op
}

export async function seedEnterpriseDatabaseIfEmpty(): Promise<boolean> {
  return true;
}

export async function seedEnterpriseData(): Promise<boolean> {
  return true;
}
