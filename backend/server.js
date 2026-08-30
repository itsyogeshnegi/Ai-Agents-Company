import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { dbInstance } from './db.js';
import { AGENTS_ROSTER } from './agents.js';
import { llmClient } from './llmClient.js';
import { orchestrator } from './orchestrator.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Initialize MongoDB
dbInstance.connect();

// REST Routes
app.get('/api/health', async (req, res) => {
  const ollamaHealth = await llmClient.checkHealth();
  res.json({
    status: "healthy",
    app: config.PROJECT_NAME,
    database: { connected: dbInstance.connected, uri: config.MONGO_URI },
    ollama: ollamaHealth
  });
});

app.get('/api/agents', (req, res) => {
  res.json({ agents: Object.values(AGENTS_ROSTER) });
});

app.post('/api/projects/create', async (req, res) => {
  const { title, brief, model } = req.body;
  const projectId = uuidv4();
  
  orchestrator.executeProjectFlow(projectId, brief, model);

  res.json({
    success: true,
    projectId,
    project: { id: projectId, title, brief, status: "in_progress", model }
  });
});

// Direct 1-on-1 Chat with any Agent via Ollama
app.post('/api/agents/chat', async (req, res) => {
  const { agent_id, project_id = 'project-alpha', message } = req.body;
  const result = await orchestrator.chatWithAgent(project_id, agent_id, message);
  res.json({ success: true, ...result });
});

app.post('/api/agents/steer', async (req, res) => {
  const { agent_id, project_id, instruction } = req.body;
  const agent = AGENTS_ROSTER[agent_id];

  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  orchestrator.broadcast(project_id, "agent_speech", {
    agentId: agent_id,
    text: `Direct instruction acknowledged: "${instruction.slice(0, 45)}..."`
  });

  const { thought, content } = await llmClient.generateResponse(
    agent.system_prompt,
    `Direct CEO instruction: ${instruction}`
  );

  orchestrator.broadcast(project_id, "terminal_log", {
    agentId: agent_id,
    log: `🤔 [${agent.name.toUpperCase()} THOUGHTS]: ${thought}\n\n== [DIRECT STEER RESPONSE from ${agent.name.toUpperCase()}] ==\n${content}\n`
  });

  res.json({ success: true, thought, response: content });
});

// WebSocket Server Handler
wss.on('connection', (ws, req) => {
  const urlParts = req.url.split('/');
  const projectId = urlParts[urlParts.length - 1] || 'project-alpha';

  console.log(`[WebSocket] Client connected for project: ${projectId}`);
  orchestrator.subscribe(projectId, ws);

  // Send initial roster
  ws.send(JSON.stringify({
    type: "init_roster",
    projectId,
    data: Object.values(AGENTS_ROSTER)
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'chat_command') {
        orchestrator.executeProjectFlow(projectId, data.text, data.model || config.DEFAULT_MODEL);
      } else if (data.type === 'agent_chat') {
        orchestrator.chatWithAgent(projectId, data.agentId, data.text);
      }
    } catch (err) {
      console.error("WS message parse error:", err);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${projectId}`);
    orchestrator.unsubscribe(projectId, ws);
  });
});

server.listen(config.PORT, () => {
  console.log(`\n=================================================`);
  console.log(` 🏢 AI AGENT COMPANY BACKEND RUNNING (Node.js)`);
  console.log(` 🌐 Server:    http://localhost:${config.PORT}`);
  console.log(` 📡 WebSocket: ws://localhost:${config.PORT}/ws/:projectId`);
  console.log(`=================================================\n`);
});
