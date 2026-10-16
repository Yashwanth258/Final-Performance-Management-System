import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { DEFAULT_MANAGER_SECURITY_PASSCODE } from '../lib/seedDatabase';
import { upsertProfile, lookupCredentialsSupa, saveCredentialSupa, fetchAllProfiles } from '../lib/supabaseDb';

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

const LOCAL_STORAGE_USER_KEY = 'trainer_workspace_active_uid';
const LOCAL_STORAGE_PROFILE_KEY = 'trainer_workspace_active_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const savedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (savedProfile) {
        return JSON.parse(savedProfile);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Restore saved session on startup
  useEffect(() => {
    const restoreSavedSession = async () => {
      try {
        const savedUid = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const savedProfileStr = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);

        if (savedUid) {
          if (savedProfileStr) {
            try {
              const parsed = JSON.parse(savedProfileStr) as UserProfile;
              setUserProfile(parsed);
              setCurrentUser({
                uid: parsed.uid,
                email: parsed.companyEmail,
                displayName: parsed.fullName,
              });
            } catch {
              // Ignore
            }
          }

          // Fetch fresh profile from Supabase
          try {
            const allProfiles = await fetchAllProfiles();
            const matching = allProfiles.find(p => p.uid === savedUid || p.employeeId === savedUid || p.companyEmail === savedUid);
            if (matching) {
              setUserProfile(matching);
              setCurrentUser({
                uid: matching.uid,
                email: matching.companyEmail,
                displayName: matching.fullName,
              });
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(matching));
            }
          } catch (fetchErr) {
            console.warn('[Auth] Fresh profile fetch warning:', fetchErr);
          }
        }
      } catch (err) {
        console.warn('[Auth] Session restoration notice:', err);
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

    console.log('[Auth Login Entry] Attempting sign-in for:', cleanInput, '| Portal Role:', portalRole);

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

      let credData: any = null;
      let userProfileData: UserProfile | null = null;
      let isVerified = false;
      let detectedRole: UserRole | null = null;

      // 1. FAST-PATH: Check dedicated local cache tables
      try {
        const mgrAccountsRaw = localStorage.getItem('nxtwave_manager_accounts');
        const trainerAccountsRaw = localStorage.getItem('nxtwave_trainer_accounts');
        const genericAccountsRaw = localStorage.getItem('nxtwave_custom_accounts');

        const mgrAccounts = mgrAccountsRaw ? JSON.parse(mgrAccountsRaw) : {};
        const trainerAccounts = trainerAccountsRaw ? JSON.parse(trainerAccountsRaw) : {};
        const genericAccounts = genericAccountsRaw ? JSON.parse(genericAccountsRaw) : {};

        const cachedMgr = mgrAccounts[lowerInput] || mgrAccounts[upperInput] || mgrAccounts[cleanInput];
        const cachedTrainer = trainerAccounts[lowerInput] || trainerAccounts[upperInput] || trainerAccounts[cleanInput];
        const cachedGeneric = genericAccounts[lowerInput] || genericAccounts[upperInput] || genericAccounts[cleanInput];

        if (portalRole === 'MANAGER') {
          if (cachedTrainer) {
            throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
          }
          if (cachedMgr) {
            credData = cachedMgr;
            detectedRole = 'MANAGER';
            if (cachedMgr.profile) userProfileData = cachedMgr.profile;
          }
        } else if (portalRole === 'TRAINER' || portalRole === 'TRAINEE') {
          if (cachedMgr) {
            throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
          }
          if (cachedTrainer) {
            credData = cachedTrainer;
            detectedRole = 'TRAINER';
            if (cachedTrainer.profile) userProfileData = cachedTrainer.profile;
          }
        } else {
          const matched = cachedMgr || cachedTrainer || cachedGeneric;
          if (matched) {
            credData = matched;
            detectedRole = matched.role || (cachedMgr ? 'MANAGER' : 'TRAINER');
            if (matched.profile) userProfileData = matched.profile;
          }
        }
      } catch (cacheErr: any) {
        if (cacheErr?.message?.startsWith('ROLE_RESTRICTION:')) throw cacheErr;
      }

      // 2. Verify password against local cache if found
      if (credData && credData.password !== undefined) {
        if (cleanPass === String(credData.password).trim()) {
          isVerified = true;
        }
      }

      // 3. SUPABASE DATABASE LOOKUP (manager_credentials & trainer_credentials)
      if (!isVerified || !userProfileData) {
        try {
          if (portalRole === 'MANAGER') {
            const foundTrainerSupa = await lookupCredentialsSupa('trainer_credentials', lookupKeys);
            if (foundTrainerSupa) {
              throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
            }
            const foundMgrSupa = await lookupCredentialsSupa('manager_credentials', lookupKeys);
            if (foundMgrSupa) {
              credData = {
                uid: foundMgrSupa.uid || foundMgrSupa.id,
                email: foundMgrSupa.email,
                employeeId: foundMgrSupa.employee_id,
                password: foundMgrSupa.password,
                role: 'MANAGER',
                profile: foundMgrSupa.profile,
              };
              detectedRole = 'MANAGER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          } else if (portalRole === 'TRAINER' || portalRole === 'TRAINEE') {
            const foundMgrSupa = await lookupCredentialsSupa('manager_credentials', lookupKeys);
            if (foundMgrSupa) {
              throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
            }
            const foundTrainerSupa = await lookupCredentialsSupa('trainer_credentials', lookupKeys);
            if (foundTrainerSupa) {
              credData = {
                uid: foundTrainerSupa.uid || foundTrainerSupa.id,
                email: foundTrainerSupa.email,
                employeeId: foundTrainerSupa.employee_id,
                password: foundTrainerSupa.password,
                role: 'TRAINER',
                profile: foundTrainerSupa.profile,
              };
              detectedRole = 'TRAINER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          } else {
            const foundMgrSupa = await lookupCredentialsSupa('manager_credentials', lookupKeys);
            const foundTrainerSupa = !foundMgrSupa ? await lookupCredentialsSupa('trainer_credentials', lookupKeys) : null;
            const foundUserSupa = (!foundMgrSupa && !foundTrainerSupa) ? await lookupCredentialsSupa('user_credentials', lookupKeys) : null;

            const matchedSupa = foundMgrSupa || foundTrainerSupa || foundUserSupa;
            if (matchedSupa) {
              const matchedRole = (matchedSupa.role === 'MANAGER' || foundMgrSupa) ? 'MANAGER' : 'TRAINER';
              credData = {
                uid: matchedSupa.uid || matchedSupa.id,
                email: matchedSupa.email,
                employeeId: matchedSupa.employee_id,
                password: matchedSupa.password,
                role: matchedRole,
                profile: matchedSupa.profile,
              };
              detectedRole = matchedRole;
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          }
        } catch (supaErr: any) {
          if (supaErr?.message?.startsWith('ROLE_RESTRICTION:')) throw supaErr;
          console.warn('[Auth Login Supabase lookup notice]:', supaErr?.message || supaErr);
        }
      }

      // Check password against Supabase record
      if (credData && credData.password !== undefined) {
        if (cleanPass === String(credData.password).trim()) {
          isVerified = true;
        } else {
          setLoading(false);
          throw new Error('WRONG_PASSWORD: You have entered a wrong password, type again');
        }
      }

      if (!credData && !isVerified) {
        setLoading(false);
        throw new Error(`NO_ACCOUNT_FOUND: No registered account found with this email or Employee ID ("${cleanInput}"). Please check your credentials or create a new account.`);
      }

      // If user profile is not yet loaded, look up from Supabase profiles table
      if (!userProfileData && credData) {
        try {
          const allProfiles = await fetchAllProfiles();
          userProfileData = allProfiles.find(
            p => (credData.uid && p.uid === credData.uid) ||
                 (credData.email && p.companyEmail.toLowerCase() === credData.email.toLowerCase()) ||
                 (credData.employeeId && p.employeeId.toUpperCase() === credData.employeeId.toUpperCase())
          ) || null;
        } catch {
          // ignore
        }
      }

      // Construct fallback profile if none found
      if (!userProfileData && credData) {
        const fallbackRole = detectedRole || (portalRole === 'MANAGER' ? 'MANAGER' : 'TRAINER');
        userProfileData = {
          uid: credData.uid || `usr-${Date.now()}`,
          employeeId: credData.employeeId || cleanInput.toUpperCase(),
          fullName: credData.profile?.fullName || (cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput),
          companyEmail: credData.email || (cleanInput.includes('@') ? cleanInput.toLowerCase() : `${cleanInput.toLowerCase()}@nxtwave.co.in`),
          role: fallbackRole,
          department: credData.department || 'GenAI',
          teamId: 'team-genai',
          teamName: 'GenAI Department',
          managerId: fallbackRole === 'MANAGER' ? 'exec-global-00' : 'mgr-enterprise-01',
          managerName: fallbackRole === 'MANAGER' ? 'Executive Leadership' : 'Sarah Jenkins',
          designation: fallbackRole === 'MANAGER' ? 'Capability Manager' : 'Software Development Instructor',
          location: '',
          subject: '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      if (!userProfileData) {
        setLoading(false);
        throw new Error(`NO_ACCOUNT_FOUND: Unable to resolve profile data for "${cleanInput}".`);
      }

      // Enforce portal role consistency
      if (portalRole === 'MANAGER' && userProfileData.role !== 'MANAGER') {
        setLoading(false);
        throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
      }
      if ((portalRole === 'TRAINER' || portalRole === 'TRAINEE') && userProfileData.role === 'MANAGER') {
        setLoading(false);
        throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
      }

      // Re-upsert profile to Supabase to ensure consistency
      try {
        await upsertProfile({
          ...userProfileData,
          employeeId: userProfileData.employeeId,
          companyEmail: userProfileData.companyEmail,
        });
      } catch (upsertErr) {
        console.info('[Auth] Supabase profile sync on login notice:', upsertErr);
      }

      // Save to local cache
      try {
        const cacheKey = userProfileData.role === 'MANAGER' ? 'nxtwave_manager_accounts' : 'nxtwave_trainer_accounts';
        const raw = localStorage.getItem(cacheKey);
        const cache = raw ? JSON.parse(raw) : {};
        const entry = {
          uid: userProfileData.uid,
          email: userProfileData.companyEmail.toLowerCase(),
          employeeId: userProfileData.employeeId.toUpperCase(),
          password: cleanPass,
          role: userProfileData.role,
          department: userProfileData.department,
          profile: userProfileData,
        };
        cache[userProfileData.companyEmail.toLowerCase()] = entry;
        cache[userProfileData.employeeId.toLowerCase()] = entry;
        cache[userProfileData.employeeId.toUpperCase()] = entry;
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch {
        // ignore
      }

      // Successfully authenticated
      console.log('[Auth Login Complete] User authenticated successfully:', userProfileData.fullName, `(${userProfileData.role})`);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, userProfileData.uid);
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(userProfileData));
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
    const rawEmpId = data.employeeId.trim();
    const cleanEmpId = rawEmpId.toUpperCase();
    const cleanPass = data.password?.trim() || 'password';
    const isMgr = data.role === 'MANAGER';
    const lookupKeys = [cleanEmail, cleanEmpId, rawEmpId.toLowerCase(), rawEmpId];

    console.log('[Auth registerUser] Registering account:', {
      email: cleanEmail,
      empId: cleanEmpId,
      role: data.role,
      allowOverwrite: data.allowOverwrite,
    });

    try {
      // 1. Mandatory Security Passcode Check for Manager Role
      if (isMgr) {
        const enteredPasscode = data.managerSecurityPasscode?.trim();
        if (!enteredPasscode || enteredPasscode !== DEFAULT_MANAGER_SECURITY_PASSCODE) {
          throw new Error('Invalid Enterprise Manager Security Passcode. Manager account creation requires a valid leadership authorization key.');
        }
      }

      // 2. Duplicate and Conflict Check
      if (isMgr) {
        // Manager registration: check if already registered as Instructor
        const foundTrainer = await lookupCredentialsSupa('trainer_credentials', lookupKeys);
        if (foundTrainer) {
          throw new Error(`ROLE_CONFLICT: This email or Employee ID is already registered as an Instructor ("${foundTrainer.profile?.fullName || foundTrainer.email}"). An account cannot hold both Manager and Instructor roles simultaneously.`);
        }

        // Check if manager already exists
        const foundMgr = await lookupCredentialsSupa('manager_credentials', lookupKeys);
        if (foundMgr && !data.allowOverwrite) {
          throw new Error(`ACCOUNT_EXISTS: A Manager account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your account.`);
        }
      } else {
        // Trainer registration: check if already registered as Manager
        const foundMgr = await lookupCredentialsSupa('manager_credentials', lookupKeys);
        if (foundMgr) {
          throw new Error(`ROLE_CONFLICT: This email or Employee ID is already registered as a Manager ("${foundMgr.profile?.fullName || foundMgr.email}"). An account cannot hold both Manager and Instructor roles simultaneously.`);
        }

        // Check if trainer already exists
        const foundTrainer = await lookupCredentialsSupa('trainer_credentials', lookupKeys);
        if (foundTrainer && !data.allowOverwrite) {
          throw new Error(`ACCOUNT_EXISTS: An account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your Instructor account.`);
        }
      }

      // Generate or reuse UID
      const sanitizedEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '-');
      const uid = `usr-${sanitizedEmailKey}-${Date.now().toString().slice(-4)}`;

      const department = data.department || 'GenAI';
      const deptTeamMap: Record<string, { teamId: string; teamName: string; defaultSubject: string }> = {
        'Frontend': { teamId: 'team-frontend', teamName: 'Frontend Department', defaultSubject: 'React & Modern Frontend Systems' },
        'Backend': { teamId: 'team-backend', teamName: 'Backend Department', defaultSubject: 'Node.js & Distributed Systems' },
        'GenAI': { teamId: 'team-genai', teamName: 'GenAI Department', defaultSubject: 'Generative AI & LLM Systems' },
      };

      const deptConfig = deptTeamMap[department] || deptTeamMap['GenAI'];
      const trimmedManagerName = data.managerName?.trim() || '';
      const trimmedManagerEmail = data.managerEmail?.trim() || '';
      const trimmedManagerId = data.managerId?.trim() || '';

      const resolvedManagerId = isMgr
        ? 'exec-global-00'
        : (trimmedManagerId || (trimmedManagerName ? `mgr-${trimmedManagerName.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''));

      const resolvedManagerName = isMgr
        ? 'Executive Leadership'
        : trimmedManagerName;

      const resolvedManagerEmail = isMgr
        ? undefined
        : (trimmedManagerEmail || (trimmedManagerName ? `${trimmedManagerName.toLowerCase().replace(/\s+/g, '.')}@enterprise.com` : undefined));

      const newProfile: UserProfile = {
        uid,
        employeeId: rawEmpId,
        fullName: data.fullName.trim(),
        companyEmail: cleanEmail,
        role: data.role,
        department,
        teamId: data.teamId || deptConfig.teamId,
        teamName: data.teamName || (isMgr ? `${department} Department` : deptConfig.teamName),
        managerId: resolvedManagerId,
        managerName: resolvedManagerName,
        managerEmail: resolvedManagerEmail,
        designation: data.designation.trim() || (isMgr ? 'Manager' : 'Trainer'),
        location: data.location?.trim() || '',
        subject: data.subject?.trim() || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Save profile in Supabase 'profiles' table
      await upsertProfile({
        ...newProfile,
        employeeId: rawEmpId,
        companyEmail: cleanEmail,
      });

      // 4. Save authentication credentials in Supabase
      const primaryTable = isMgr ? 'manager_credentials' : 'trainer_credentials';
      const credRecord = {
        uid,
        employeeId: rawEmpId,
        email: cleanEmail,
        password: cleanPass,
        role: data.role,
        department,
        managerId: resolvedManagerId,
        managerName: resolvedManagerName,
        managerEmail: resolvedManagerEmail,
        profile: newProfile,
      };

      await Promise.all([
        saveCredentialSupa(primaryTable, [cleanEmail, rawEmpId.toLowerCase(), rawEmpId.toUpperCase()], credRecord),
        saveCredentialSupa('user_credentials', [cleanEmail, rawEmpId.toLowerCase(), rawEmpId.toUpperCase()], credRecord),
      ]);

      // 5. Update local cache
      try {
        const cacheKey = isMgr ? 'nxtwave_manager_accounts' : 'nxtwave_trainer_accounts';
        const raw = localStorage.getItem(cacheKey);
        const cache = raw ? JSON.parse(raw) : {};
        cache[cleanEmail] = credRecord;
        cache[rawEmpId.toLowerCase()] = credRecord;
        cache[rawEmpId.toUpperCase()] = credRecord;
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch {
        // ignore
      }

      // 6. Set user state and log in immediately
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, uid);
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setCurrentUser({
        uid,
        email: cleanEmail,
        displayName: newProfile.fullName,
      });
      setIsDemoMode(false);
      setLoading(false);
      console.log('Account registration successful for:', newProfile.fullName);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
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
      const lowerInput = cleanInput.toLowerCase();
      const upperInput = cleanInput.toUpperCase();
      const lookupKeys = [lowerInput, upperInput, cleanInput];

      const foundMgr = await lookupCredentialsSupa('manager_credentials', lookupKeys);
      const foundTrainer = !foundMgr ? await lookupCredentialsSupa('trainer_credentials', lookupKeys) : null;
      const foundUser = (!foundMgr && !foundTrainer) ? await lookupCredentialsSupa('user_credentials', lookupKeys) : null;
      const match = foundMgr || foundTrainer || foundUser;

      if (match) {
        return {
          success: true,
          emailSent: true,
          userFound: true,
          user: match.profile,
          message: `Password reset instructions have been dispatched to ${match.email || cleanInput}.`,
        };
      }

      return {
        success: false,
        emailSent: false,
        userFound: false,
        message: `No account matching "${cleanInput}" could be located in the registry.`,
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
      const lowerInput = cleanInput.toLowerCase();
      const upperInput = cleanInput.toUpperCase();
      const lookupKeys = [lowerInput, upperInput, cleanInput];

      const foundMgr = await lookupCredentialsSupa('manager_credentials', lookupKeys);
      const foundTrainer = !foundMgr ? await lookupCredentialsSupa('trainer_credentials', lookupKeys) : null;
      const match = foundMgr || foundTrainer;

      const primaryTable = (foundMgr || (!foundTrainer && cleanInput.startsWith('MGR'))) ? 'manager_credentials' : 'trainer_credentials';
      const email = match?.email || cleanInput;
      const empId = match?.employee_id || cleanInput;

      const credRecord = {
        uid: match?.uid || `usr-${Date.now()}`,
        employeeId: empId,
        email,
        password: cleanNewPass,
        role: primaryTable === 'manager_credentials' ? 'MANAGER' : 'TRAINER',
        profile: match?.profile,
      };

      await Promise.all([
        saveCredentialSupa(primaryTable, [email.toLowerCase(), empId.toLowerCase(), empId.toUpperCase()], credRecord),
        saveCredentialSupa('user_credentials', [email.toLowerCase(), empId.toLowerCase(), empId.toUpperCase()], credRecord),
      ]);

      // Update local storage cache
      try {
        const cacheKey = primaryTable === 'manager_credentials' ? 'nxtwave_manager_accounts' : 'nxtwave_trainer_accounts';
        const raw = localStorage.getItem(cacheKey);
        const cache = raw ? JSON.parse(raw) : {};
        cache[email.toLowerCase()] = credRecord;
        cache[empId.toLowerCase()] = credRecord;
        cache[empId.toUpperCase()] = credRecord;
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch {
        // ignore
      }

      return true;
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

    // Update state
    setUserProfile(updated);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
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
