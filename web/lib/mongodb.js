import { MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB || "medirecord";

// Connect lazily and cache the connection on globalThis (survives hot reloads).
// If the connection fails (e.g. MongoDB service not started yet) the failure is
// NOT cached, so the next request simply tries again; no app restart needed.
function connect() {
  if (!globalThis._medirecordMongoClientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    globalThis._medirecordMongoClientPromise = client.connect().catch((err) => {
      globalThis._medirecordMongoClientPromise = undefined;
      throw err;
    });
  }
  return globalThis._medirecordMongoClientPromise;
}

export async function getDb() {
  const client = await connect();
  return client.db(dbName);
}

export async function getClinicalNotesCollection() {
  const db = await getDb();
  return db.collection("clinical_notes");
}
