const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
const firebaseConfig = require('../firebase-applet-config.json');

const fbApp = initializeApp(firebaseConfig);
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

const db = dbId 
  ? initializeFirestore(fbApp, { experimentalForceLongPolling: true }, dbId)
  : initializeFirestore(fbApp, { experimentalForceLongPolling: true });

const COLLECTIONS_TO_PURGE = [
  'users',
  'manager_credentials',
  'trainer_credentials',
  'user_credentials',
  'dailyUpdates',
  'classes',
  'tasks',
  'projects',
  'targets',
  'alerts',
  'notifications',
  'feedback',
  'attendance',
  'holisticContributions',
  'manager_change_requests',
  'teams'
];

async function purgeAll() {
  console.log(`--- Purging All Firestore Collections for DB: ${dbId || 'default'} ---`);

  for (const collName of COLLECTIONS_TO_PURGE) {
    try {
      const snap = await getDocs(collection(db, collName));
      console.log(`Collection "${collName}": found ${snap.size} documents.`);
      if (snap.size > 0) {
        await Promise.all(snap.docs.map(docSnap => deleteDoc(doc(db, collName, docSnap.id))));
        console.log(`  ✓ Successfully deleted ${snap.size} documents from "${collName}".`);
      }
    } catch (err) {
      console.error(`  ✗ Error purging collection "${collName}":`, err.message);
    }
  }

  console.log('--- Firestore Purge Completed Successfully ---');
}

purgeAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal purge error:', err);
    process.exit(1);
  });
