import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PROJECT_NAME: "AI Agent Company - Pixel War Room",
  PORT: process.env.PORT || 8000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017",
  DB_NAME: process.env.DB_NAME || "ai_agency_db",
  OLLAMA_HOST: process.env.OLLAMA_HOST || "http://localhost:11434",
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || "gemma4:31b-cloud"
};
