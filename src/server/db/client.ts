import { MongoClient, type Db } from "mongodb";
import { getEnv } from "@/lib/env";

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

export async function getMongoClient() {
  const env = getEnv();
  if (globalForMongo._mongoClient) return globalForMongo._mongoClient;
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 10,
      minPoolSize: 0,
    });
    globalForMongo._mongoClientPromise = client.connect()
      .then((connected) => {
        globalForMongo._mongoClient = connected;
        return connected;
      })
      .catch((error: unknown) => {
        globalForMongo._mongoClientPromise = undefined;
        void client.close().catch(() => undefined);
        throw error;
      });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const env = getEnv();
  const client = await getMongoClient();
  return client.db(env.mongodbDb);
}
