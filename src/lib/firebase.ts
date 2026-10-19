/**
 * Firebase / Firestore has been disconnected.
 * The application runs 100% on Supabase PostgreSQL.
 * Lightweight safe stubs are provided below to prevent any runtime issues.
 */

export const auth: any = {
  currentUser: null,
  onAuthStateChanged: (_: any, callback: (u: any) => void) => {
    if (typeof callback === 'function') callback(null);
    return () => {};
  },
  signOut: async () => {},
};

export const db: any = new Proxy({}, {
  get: () => () => Promise.resolve({ exists: () => false, data: () => ({}), docs: [] }),
});

export default {};
