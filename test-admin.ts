import { Firestore } from '@google-cloud/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const db = new Firestore({
  projectId: config.projectId,
  databaseId: config.firestoreDatabaseId,
});

async function test() {
  await db.collection('test').add({ hello: 'world' });
  console.log('Success!');
}

test().catch(console.error);
