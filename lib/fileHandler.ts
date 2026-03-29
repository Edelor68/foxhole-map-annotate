import fs from "node:fs";
import { MongoClient } from "mongodb";

const timers: Record<string, string> = {};

/**
 * Synthetic delay to debounce file writes
 */
export function delayedSave(file: string, data: unknown, delay: number = 5000, formatted: boolean = true): void {
  
  const formattedData: string = formatted ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  

  if (file in timers) {
    timers[file] = formattedData;
    return;
  }
  timers[file] = formattedData;
  setTimeout(() => {
    try {
      fs.writeFileSync(file, timers[file], "utf-8");
    } catch (err) {
      console.error("Error writing file:", err);
    } finally {
      delete timers[file];
    }
  }, delay);
}

const client = new MongoClient("mongodb://localhost:27017");

export async function connectDB() {
  await client.connect();
  return client.db("WarEx");
}

const db = await connectDB();

export async function addDocumentToDB(collection: string, data: unknown) {
  try {
    const col = db.collection(collection);
    await col.insertOne(data);
  } catch (err) {
    console.error("Error saving to DB:", err);
  }
}

export async function updateDocumentInDB(collection: string, query: Record<string, unknown>, update: Record<string, unknown>) {
  try {
    const col = db.collection(collection);

    await col.updateOne(query, update);
  } catch (err) {
    console.error("Error updating DB:", err);
  }
}

export async function deleteDocumentFromDB(collection: string, query: Record<string, unknown>) {
  try {
    const col = db.collection(collection);
    await col.deleteOne(query);
  } catch (err) {
    console.error("Error deleting from DB:", err);
  }
}

export async function getDocumentFromDB(collection: string, query: Record<string, unknown>) {
  try {
    const col = db.collection(collection);
    return await col.find(query).toArray();
  } catch (err) {
    console.error("Error getting from DB:", err);
    return null;
  }
}

export async function getCollectionFromDB(collection: string) {
  try {
    const col = db.collection(collection);
    return await col;
  } catch (err) {
    console.error("Error getting collection from DB:", err);
    return null;
  }
}