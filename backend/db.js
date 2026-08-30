import { MongoClient } from 'mongodb';
import { config } from './config.js';

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.connected = false;
    this.memoryStore = {
      projects: {},
      tasks: {},
      agents: {},
      messages: [],
      artifacts: []
    };
  }

  async connect() {
    try {
      console.log(`Connecting to MongoDB at ${config.MONGO_URI}...`);
      this.client = new MongoClient(config.MONGO_URI, { serverSelectionTimeoutMS: 2500 });
      await this.client.connect();
      this.db = this.client.db(config.DB_NAME);
      this.connected = true;
      console.log(`✅ Successfully connected to MongoDB database: ${config.DB_NAME}`);
    } catch (err) {
      console.warn(`⚠️ MongoDB warning: ${err.message}. Operating in local memory mode.`);
      this.connected = false;
    }
  }

  async saveArtifact(artifact) {
    this.memoryStore.artifacts.push(artifact);
    if (this.connected && this.db) {
      try {
        await this.db.collection('artifacts').insertOne({ ...artifact, createdAt: new Date() });
      } catch (e) {
        console.error("DB insert artifact failed:", e.message);
      }
    }
  }
}

export const dbInstance = new Database();
