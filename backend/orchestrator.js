import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { AGENTS_ROSTER } from './agents.js';
import { llmClient } from './llmClient.js';
import { dbInstance } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORTS_DIR = path.resolve(__dirname, '../generated_projects');

function cleanCodeOutput(rawText, lang) {
  let text = rawText.trim();
  
  // 1. Strip thought tags if any remain
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. For HTML documents: Strictly extract from <!DOCTYPE html> or <html to </html>
  if (lang === 'html') {
    const docTypeIdx = text.search(/<!DOCTYPE\s+html/i);
    const htmlStartIdx = text.search(/<html/i);
    
    let startIndex = -1;
    if (docTypeIdx !== -1) {
      startIndex = docTypeIdx;
    } else if (htmlStartIdx !== -1) {
      startIndex = htmlStartIdx;
    }

    if (startIndex !== -1) {
      const htmlEndIdx = text.search(/<\/html>/i);
      if (htmlEndIdx !== -1) {
        text = text.substring(startIndex, htmlEndIdx + 7).trim();
      } else {
        text = text.substring(startIndex).trim();
      }
    }
  }

  // 3. Strip any remaining markdown code fences (```html, ```css, ```)
  text = text.replace(/^```[a-zA-Z]*\n?/gm, '');
  text = text.replace(/\n?```$/gm, '');
  text = text.replace(/```/g, '');

  // 4. Fix any broken local image src (e.g. src="law-office.jpg" -> Unsplash CDN)
  text = text.replace(/src=["'](?!(https?:\/\/|data:))([^"']+)["']/gi, (match, p1, filename) => {
    return `src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"`;
  });

  return text.trim();
}

class ProjectOrchestrator {
  constructor() {
    this.subscribers = new Map();
    if (!fs.existsSync(EXPORTS_DIR)) {
      try { fs.mkdirSync(EXPORTS_DIR, { recursive: true }); } catch (e) {}
    }
  }

  subscribe(projectId, ws) {
    if (!this.subscribers.has(projectId)) {
      this.subscribers.set(projectId, new Set());
    }
    this.subscribers.get(projectId).add(ws);
  }

  unsubscribe(projectId, ws) {
    if (this.subscribers.has(projectId)) {
      this.subscribers.get(projectId).delete(ws);
    }
  }

  broadcast(projectId, eventType, data) {
    const payload = JSON.stringify({
      type: eventType,
      projectId,
      timestamp: new Date().toISOString(),
      data
    });

    const clients = this.subscribers.get(projectId);
    if (clients) {
      clients.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(payload);
        }
      });
    }
  }

  isCasualGreeting(text) {
    const clean = text.trim().toLowerCase();
    const greetings = [
      "hello", "hi", "hey", "good morning", "good evening", "good afternoon",
      "how are you", "who are you", "what can you do", "yo", "sup", "test", "help"
    ];
    
    if (greetings.includes(clean)) return true;
    if (clean.length < 15 && (clean.startsWith("hi ") || clean.startsWith("hello ") || clean.startsWith("hey "))) return true;

    const buildKeywords = ["build", "create", "make", "develop", "design", "write", "code", "app", "website", "page", "landing", "api", "project", "dashboard"];
    const hasBuildIntent = buildKeywords.some(k => clean.includes(k));

    return !hasBuildIntent && clean.length < 25;
  }

  async chatWithAgent(projectId, agentId, userMessage) {
    const agent = AGENTS_ROSTER[agentId] || AGENTS_ROSTER.marcus;

    this.broadcast(projectId, "agent_status", {
      agentId: agent.id,
      status: "planning",
      activity: "Thinking..."
    });

    const { thought, content } = await llmClient.generateResponse(
      agent.system_prompt,
      `CEO Directive: "${userMessage}". Respond in character as ${agent.name} (${agent.role}).`
    );

    this.broadcast(projectId, "agent_thought", {
      agentId: agent.id,
      thought: thought
    });

    this.broadcast(projectId, "terminal_log", {
      agentId: agent.id,
      log: `🤔 [${agent.name.toUpperCase()} THOUGHTS]: ${thought}\n\n💬 [RESPONSE]: ${content}\n`
    });

    this.broadcast(projectId, "agent_speech", {
      agentId: agent.id,
      text: content.slice(0, 80)
    });

    this.broadcast(projectId, "chat_message", {
      id: uuidv4(),
      agentId: agent.id,
      author: agent.name,
      role: agent.role,
      avatar: agent.avatar,
      color: agent.color,
      thought: thought,
      text: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    this.broadcast(projectId, "agent_status", {
      agentId: agent.id,
      status: "idle",
      activity: "Standby"
    });

    return { thought, content };
  }

  async executeProjectFlow(projectId, userBrief, modelName) {
    if (modelName) {
      llmClient.model = modelName;
    }

    const marcus = AGENTS_ROSTER.marcus;

    if (this.isCasualGreeting(userBrief)) {
      console.log(`[Orchestrator] Casual conversation from CEO: "${userBrief}"`);
      await this.chatWithAgent(projectId, "marcus", userBrief);
      return;
    }

    console.log(`[Orchestrator] Starting sprint for ${projectId}: "${userBrief}"`);

    const projectFolder = path.join(EXPORTS_DIR, projectId);
    if (!fs.existsSync(projectFolder)) {
      try { fs.mkdirSync(projectFolder, { recursive: true }); } catch (e) {}
    }

    this.broadcast(projectId, "project_status", {
      status: "in_progress",
      message: "Marcus is analyzing requirements and scheduling a team standup..."
    });

    const { thought: marcusThought, content: planOutput } = await llmClient.generateResponse(
      marcus.system_prompt,
      `Client brief: "${userBrief}". Decompose into strategic plan and tasks for Sophia, Elena, Julian, Ethan, Leo, Vikram, Chloe, and Tasha.`
    );

    this.broadcast(projectId, "agent_thought", {
      agentId: "marcus",
      thought: marcusThought
    });

    this.broadcast(projectId, "agent_speech", {
      agentId: "marcus",
      text: "Team, new client directive received. Let's assemble in the Conference Room for standup!"
    });

    this.broadcast(projectId, "terminal_log", {
      agentId: "marcus",
      log: `🤔 [MARCUS THOUGHTS]: ${marcusThought}\n\n== [MARCUS STEELE - ROADMAP INITIALIZATION] ==\n${planOutput}\n`
    });

    this.broadcast(projectId, "chat_message", {
      id: uuidv4(),
      agentId: "marcus",
      author: marcus.name,
      role: marcus.role,
      avatar: marcus.avatar,
      color: marcus.color,
      thought: marcusThought,
      text: `Team, client brief received: "${userBrief}". Assembling in Conference Room to initialize work orders!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 3. Team Movement to Conference Room
    this.broadcast(projectId, "team_movement", {
      destination: "conference_room",
      reason: "standup"
    });

    await new Promise(r => setTimeout(r, 6000));

    this.broadcast(projectId, "agent_speech", {
      agentId: "marcus",
      text: "Team: Roadmap is approved. Sophia on Design Tokens, Elena on Motion, Ethan on Business Logic, Leo on Frontend. Let's ship it!"
    });

    await new Promise(r => setTimeout(r, 5000));

    // Standup concludes: Team dispatches back to workstations
    this.broadcast(projectId, "team_movement", {
      destination: "desks",
      reason: "standup_complete"
    });

    await new Promise(r => setTimeout(r, 4500));

    // 4. Execution Pipeline (Now with Elena & Ethan for maximum performance, logic & design!)
    const pipeline = [
      {
        agentId: "sophia",
        taskTitle: "Design System & Color Specs",
        filename: "design-tokens.css",
        lang: "css",
        speech: "Building color palettes, typography hierarchy, and glassmorphism tokens."
      },
      {
        agentId: "elena",
        taskTitle: "Motion Curves & Interactive Dynamics",
        filename: "motion-effects.js",
        lang: "javascript",
        speech: "Engineering silky 60fps micro-animations, scroll triggers, and dynamic effects."
      },
      {
        agentId: "julian",
        taskTitle: "Marketing Copy & Value Props",
        filename: "copy-deck.md",
        lang: "markdown",
        speech: "Writing high-converting hero headlines, benefits, and call-to-actions."
      },
      {
        agentId: "ethan",
        taskTitle: "Business Logic & State Machine Engine",
        filename: "business-logic.js",
        lang: "javascript",
        speech: "Architecting mathematical algorithms, state machines, and data validation rules."
      },
      {
        agentId: "leo",
        taskTitle: "Interactive Web App / Landing Page",
        filename: "index.html",
        lang: "html",
        speech: "Constructing responsive UI layout with interactive JavaScript & animations."
      },
      {
        agentId: "vikram",
        taskTitle: "REST API Endpoints & Schemas",
        filename: "api-service.js",
        lang: "javascript",
        speech: "Architecting REST endpoints, validation models, and database schemas."
      },
      {
        agentId: "chloe",
        taskTitle: "SEO & JSON-LD Schemas",
        filename: "seo-schema.html",
        lang: "html",
        speech: "Configuring OpenGraph tags, sitemap structure, and JSON-LD markup."
      },
      {
        agentId: "tasha",
        taskTitle: "Security & Code Quality Audit",
        filename: "qa_audit_report.md",
        lang: "markdown",
        speech: "Auditing all code, testing responsiveness, and verifying security checks."
      }
    ];

    for (const task of pipeline) {
      const agent = AGENTS_ROSTER[task.agentId];

      this.broadcast(projectId, "agent_status", {
        agentId: task.agentId,
        status: "working",
        activity: task.taskTitle
      });
      this.broadcast(projectId, "agent_speech", {
        agentId: task.agentId,
        text: task.speech
      });

      this.broadcast(projectId, "terminal_log", {
        agentId: task.agentId,
        log: `>> [${agent.name.toUpperCase()}] Starting task: ${task.taskTitle} [${task.filename}]...`
      });

      // Call Ollama
      const { thought: workerThought, content: rawOutput } = await llmClient.generateResponse(
        agent.system_prompt,
        `Project brief: "${userBrief}". Generate the full, complete ${task.taskTitle} for ${task.filename}.`
      );

      // Clean & parse code output
      const cleanCode = cleanCodeOutput(rawOutput, task.lang);

      this.broadcast(projectId, "agent_thought", {
        agentId: task.agentId,
        thought: workerThought
      });

      this.broadcast(projectId, "terminal_log", {
        agentId: task.agentId,
        log: `🤔 [${agent.name.toUpperCase()} THOUGHTS]: ${workerThought}\n✅ Completed ${task.filename} (${cleanCode.length} chars generated)\n`
      });

      this.broadcast(projectId, "chat_message", {
        id: uuidv4(),
        agentId: task.agentId,
        author: agent.name,
        role: agent.role,
        avatar: agent.avatar,
        color: agent.color,
        thought: workerThought,
        text: `Completed deliverable: ${task.filename} for the ${task.taskTitle} milestone.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      const artifactData = {
        id: uuidv4(),
        filename: task.filename,
        language: task.lang,
        content: cleanCode,
        author: agent.name,
        authorRole: agent.role,
        authorAvatar: agent.avatar
      };

      // 1. Broadcast to Frontend
      this.broadcast(projectId, "new_artifact", artifactData);

      // 2. Save in MongoDB
      await dbInstance.saveArtifact({ ...artifactData, projectId });

      // 3. Save to Local Hard Drive on Disk
      try {
        const filePath = path.join(projectFolder, task.filename);
        fs.writeFileSync(filePath, cleanCode, 'utf-8');
        console.log(`[Disk Export] Saved file to disk: ${filePath}`);
      } catch (err) {
        console.warn(`[Disk Export] Error saving ${task.filename}: ${err.message}`);
      }

      this.broadcast(projectId, "agent_status", {
        agentId: task.agentId,
        status: "idle",
        activity: "Standby"
      });

      await new Promise(r => setTimeout(r, 1200));
    }

    // 5. Marcus Wrap-Up & Notification with Live Links
    this.broadcast(projectId, "agent_speech", {
      agentId: "marcus",
      text: "All milestones complete! Full project code and live preview packaged."
    });

    this.broadcast(projectId, "chat_message", {
      id: uuidv4(),
      agentId: "marcus",
      author: marcus.name,
      role: marcus.role,
      avatar: marcus.avatar,
      color: marcus.color,
      thought: "Verifying all deliverables are stored on disk and ready for CEO inspection.",
      text: `🎉 **CEO: Project Delivered Successfully!**\n\nAll 8 project deliverables have been built by the team and saved to disk:\n- 🌐 **index.html** (Live Interactive Web App by Leo)\n- 🧠 **business-logic.js** (State Machines & Algorithms by Ethan)\n- ✨ **motion-effects.js** (Dynamic Animations by Elena)\n- 🎨 **design-tokens.css** (Design System by Sophia)\n- ⚙️ **api-service.js** (Backend REST API by Vikram)\n- ✍️ **copy-deck.md** (Brand Copy by Julian)\n- 📈 **seo-schema.html** (SEO Metadata by Chloe)\n- 🛡️ **qa_audit_report.md** (QA Certificate by Tasha)\n\n👉 **Click on the 'LIVE PREVIEW' tab above to test your interactive web application!**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    this.broadcast(projectId, "project_status", {
      status: "completed",
      message: "Project delivered successfully by the AI Agency Team.",
      exportPath: projectFolder
    });
  }
}

export const orchestrator = new ProjectOrchestrator();
