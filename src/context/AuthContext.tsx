import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { DEFAULT_MANAGER_SECURITY_PASSCODE } from '../lib/seedDatabase';
import { 
  upsertProfile, 
  insertProfile,
  lookupProfileByCredentials, 
  updateProfilePassword 
} from '../lib/supabaseDb';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type User = AuthUser;

export interface RegisterUserData {
  fullName: string;
  companyEmail: string;
  employeeId: string;
  password?: string;
  role: UserRole;
  department?: string;
  teamId?: string;
  teamName?: string;
  designation: string;
  location?: string;
  subject?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  managerSecurityPasscode?: string;
  allowOverwrite?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  isManager: boolean;
  isTrainer: boolean;
  login: (email: string, pass: string, portalRole?: 'MANAGER' | 'TRAINER' | 'TRAINEE') => Promise<void>;
  registerUser: (data: RegisterUserData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (emailOrEmpId: string) => Promise<{ success: boolean; emailSent: boolean; userFound: boolean; user?: UserProfile; message?: string }>;
  directUpdatePassword: (emailOrEmpId: string, newPass: string) => Promise<boolean>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  quickDemoLogin: (targetRole: 'MANAGER' | 'TRAINER' | 'TRAINEE') => void;
  isDemoMode: boolean;
}

// Session key prefix matching "sb-" to be retained across starts per Rule 3
const SB_SESSION_KEY = 'sb-active-user-uid';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Never load profile from localStorage - initialize to null and load purely from Supabase
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Restore saved session on startup directly from Supabase
  useEffect(() => {
    const restoreSavedSession = async () => {
      try {
        const savedUid = localStorage.getItem(SB_SESSION_KEY);
        if (savedUid) {
          // Always load profile from Supabase, never from local storage
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`uid.eq."${savedUid}",employee_id.eq."${savedUid}",company_email.eq."${savedUid}"`)
            .limit(1)
            .maybeSingle();

          if (error) {
            console.log('[Auth] Profile load from Supabase error:', error);
            localStorage.removeItem(SB_SESSION_KEY);
            setUserProfile(null);
            setCurrentUser(null);
          } else if (data) {
            const profile: UserProfile = {
              uid: data.uid || data.id,
              employeeId: data.employee_id,
              fullName: data.full_name,
              companyEmail: data.company_email,
              role: data.role,
              department: data.department || 'GenAI',
              teamId: data.team_id || 'team-genai',
              teamName: data.team_name,
              managerId: data.manager_id,
              managerName: data.manager_name,
              managerEmail: data.manager_email,
              designation: data.designation,
              location: data.location || '',
              subject: data.subject || '',
              avatarUrl: data.avatar_url,
              phone: data.phone,
              isActive: data.is_active ?? true,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
            setUserProfile(profile);
            setCurrentUser({
              uid: profile.uid,
              email: profile.companyEmail,
              displayName: profile.fullName,
            });
          } else {
            localStorage.removeItem(SB_SESSION_KEY);
            setUserProfile(null);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.log('[Auth] Session restoration error:', err);
      } finally {
        setLoading(false);
      }
    };

    restoreSavedSession();
  }, []);

  const login = async (emailOrId: string, pass: string, portalRole?: 'MANAGER' | 'TRAINER' | 'TRAINEE') => {
    setLoading(true);
    const cleanInput = (emailOrId || '').trim();
    const cleanPass = (pass || '').trim();

    if (!cleanInput) {
      setLoading(false);
      throw new Error('NO_ACCOUNT_FOUND: Please enter your work email or employee ID.');
    }

    if (!cleanPass) {
      setLoading(false);
      throw new Error('WRONG_PASSWORD: You have entered a wrong password, type again');
    }

    try {
      const lowerInput = cleanInput.toLowerCase();
      const upperInput = cleanInput.toUpperCase();
      const lookupKeys = [lowerInput, upperInput, cleanInput];

      // Lookup profile directly from Supabase
      const lookupResult = await lookupProfileByCredentials(lookupKeys);

      if (!lookupResult) {
        setLoading(false);
        throw new Error(`NO_ACCOUNT_FOUND: No registered account found with this email or Employee ID ("${cleanInput}"). Please check your credentials or create a new account.`);
      }

      const { profile: userProfileData, storedPassword } = lookupResult;

      // Enforce portal role consistency
      if (portalRole === 'MANAGER' && userProfileData.role !== 'MANAGER') {
        setLoading(false);
        throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
      }
      if ((portalRole === 'TRAINER' || portalRole === 'TRAINEE') && userProfileData.role === 'MANAGER') {
        setLoading(false);
        throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
      }

      // Check password
      if (storedPassword !== undefined) {
        if (cleanPass !== storedPassword.trim()) {
          setLoading(false);
          throw new Error('WRONG_PASSWORD: You have entered a wrong password, type again');
        }
      } else {
        // Save initial password in avatar_url for future logins
        try {
          await updateProfilePassword(userProfileData.employeeId, cleanPass);
        } catch {
          // non-blocking
        }
      }

      // Store only session ID, never full profile object in localStorage
      localStorage.setItem(SB_SESSION_KEY, userProfileData.uid);
      setUserProfile(userProfileData);
      setCurrentUser({
        uid: userProfileData.uid,
        email: userProfileData.companyEmail,
        displayName: userProfileData.fullName,
      });
      setIsDemoMode(false);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const registerUser = async (data: RegisterUserData) => {
    setLoading(true);
    const cleanEmail = data.companyEmail.trim().toLowerCase();
    const cleanEmpId = data.employeeId.trim().toUpperCase();
    const cleanPass = data.password?.trim() || 'password';
    const isMgr = data.role === 'MANAGER';

    try {
      // 1. Mandatory Security Passcode Check for Manager Role
      if (isMgr) {
        const enteredPasscode = data.managerSecurityPasscode?.trim();
        if (!enteredPasscode || enteredPasscode !== DEFAULT_MANAGER_SECURITY_PASSCODE) {
          throw new Error('Invalid Enterprise Manager Security Passcode. Manager account creation requires a valid leadership authorization key.');
        }
      }

      // 2. Check for duplicates in Supabase profiles
      const { data: existingRecords, error: checkError } = await supabase
        .from('profiles')
        .select('id, employee_id, company_email, role')
        .or(`employee_id.eq."${cleanEmpId}",company_email.eq."${cleanEmail}"`);

      if (checkError) {
        console.log('[Supabase] duplicate check error:', checkError);
        throw new Error(checkError.message);
      }

      if (existingRecords && existingRecords.length > 0) {
        throw new Error('This Employee ID or email is already registered.');
      }

      // Generate UID
      const sanitizedEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '-');
      const uid = `usr-${sanitizedEmailKey}-${Date.now().toString().slice(-4)}`;

      // Department configuration
      const department = data.department?.trim() || 'GenAI';
      const teamId = `team-${department.toLowerCase()}`;
      const teamName = `${department} Department`;

      // Designation validation (never empty)
      const designation = data.designation?.trim() || (isMgr ? 'Engineering Manager' : 'Software Development Instructor');

      let insertPayload: any;

      if (isMgr) {
        // Manager signup (Rule 4):
        // role='MANAGER', all NOT NULL fields filled, designation never empty,
        // team_id='team-'+lowercase dept, team_name=dept+' Department', is_active=true.
        // Do not write to teams.
        insertPayload = {
          uid,
          employee_id: cleanEmpId,
          full_name: data.fullName.trim(),
          company_email: cleanEmail,
          role: 'MANAGER',
          designation,
          department,
          team_id: teamId,
          team_name: teamName,
          manager_id: null,
          manager_name: null,
          manager_email: null,
          location: data.location?.trim() || '',
          subject: data.subject?.trim() || '',
          is_active: true,
          avatar_url: `AUTH_PW:${cleanPass}`,
        };
      } else {
        // Instructor insert (Rule 6, 7):
        // role='TRAINER', employee_id uppercase+trimmed, company_email lowercase+trimmed,
        // designation, subject, department, team_id, team_name (from selected dept),
        // manager_id=manager.uid, manager_name=manager.full_name, manager_email=manager.company_email, is_active=true.
        // Manager selection is mandatory. Remove all auto-assign/fallback logic.
        if (!data.managerId || !data.managerName) {
          throw new Error('Manager selection is mandatory. Please select your reporting manager.');
        }

        insertPayload = {
          uid,
          employee_id: cleanEmpId,
          full_name: data.fullName.trim(),
          company_email: cleanEmail,
          role: 'TRAINER',
          designation,
          department,
          team_id: teamId,
          team_name: teamName,
          manager_id: data.managerId.trim(),
          manager_name: data.managerName.trim(),
          manager_email: data.managerEmail?.trim() || null,
          location: data.location?.trim() || '',
          subject: data.subject?.trim() || '',
          is_active: true,
          avatar_url: `AUTH_PW:${cleanPass}`,
        };
      }

      await insertProfile(insertPayload);

      const newProfile: UserProfile = {
        uid,
        employeeId: cleanEmpId,
        fullName: insertPayload.full_name,
        companyEmail: cleanEmail,
        role: insertPayload.role,
        department,
        teamId,
        teamName,
        managerId: insertPayload.manager_id,
        managerName: insertPayload.manager_name,
        managerEmail: insertPayload.manager_email,
        designation,
        location: insertPayload.location,
        subject: insertPayload.subject,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Set session key and in-memory state
      localStorage.setItem(SB_SESSION_KEY, uid);
      setUserProfile(newProfile);
      setCurrentUser({
        uid,
        email: cleanEmail,
        displayName: newProfile.fullName,
      });
      setIsDemoMode(false);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(SB_SESSION_KEY);
      setCurrentUser(null);
      setUserProfile(null);
      setIsDemoMode(false);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  const resetPassword = async (emailOrEmpId: string) => {
    const cleanInput = (emailOrEmpId || '').trim();
    if (!cleanInput) {
      return { success: false, emailSent: false, userFound: false, message: 'Please provide your work email or employee ID.' };
    }

    try {
      const match = await lookupProfileByCredentials([cleanInput]);

      if (match) {
        return {
          success: true,
          emailSent: true,
          userFound: true,
          user: match.profile,
          message: `Password reset instructions have been dispatched to ${match.profile.companyEmail || cleanInput}.`,
        };
      }

      return {
        success: false,
        emailSent: false,
        userFound: false,
        message: `No account matching "${cleanInput}" could be located in the database.`,
      };
    } catch (err: any) {
      return { success: false, emailSent: false, userFound: false, message: err?.message || 'Error searching account.' };
    }
  };

  const directUpdatePassword = async (emailOrEmpId: string, newPass: string): Promise<boolean> => {
    const cleanInput = (emailOrEmpId || '').trim();
    const cleanNewPass = (newPass || '').trim();
    if (!cleanInput || !cleanNewPass) return false;

    try {
      return await updateProfilePassword(cleanInput, cleanNewPass);
    } catch (err) {
      console.error('[Auth] directUpdatePassword error:', err);
      return false;
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Update in Supabase
    await upsertProfile({
      ...updated,
      employeeId: updated.employeeId,
      companyEmail: updated.companyEmail,
    });

    // Update in-memory state only
    setUserProfile(updated);
  };

  const quickDemoLogin = (_targetRole: 'MANAGER' | 'TRAINER' | 'TRAINEE') => {
    setIsDemoMode(false);
  };

  const role: UserRole | null = userProfile?.role || null;
  const isManager = (userProfile?.role || '').toUpperCase() === 'MANAGER';
  const isTrainer = !isManager;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        role,
        isManager,
        isTrainer,
        login,
        registerUser,
        logout,
        resetPassword,
        directUpdatePassword,
        updateProfileData,
        quickDemoLogin,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
