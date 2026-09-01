import React, { useState, useEffect, useRef } from 'react';
import OfficeMap from './components/OfficeMap';
import AgentInspector from './components/AgentInspector';
import AgentDock from './components/AgentDock';
import AgentSidebar from './components/AgentSidebar';
import SettingsModal from './components/SettingsModal';
import { 
  Building2, 
  Terminal, 
  Settings, 
  Cpu, 
  Wifi, 
  Database, 
  Maximize2, 
  Columns,
  Sparkles,
  Layout
} from 'lucide-react';

const INITIAL_AGENTS = [
  {
    id: "marcus",
    name: "Marcus Steele",
    role: "Senior Project Manager",
    title: "Director of Engineering & Delivery",
    avatar: "👔",
    color: "#eab308",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "sophia",
    name: "Sophia Chen",
    role: "Lead UI/UX Designer",
    title: "Design Systems & Visual Architect",
    avatar: "🎨",
    color: "#ec4899",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "elena",
    name: "Elena Rostova",
    role: "Creative Motion & Interaction Designer",
    title: "Creative Visual & Micro-Interaction Specialist",
    avatar: "✨",
    color: "#d946ef",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "leo",
    name: "Leo Tanaka",
    role: "Senior Frontend Developer",
    title: "Web & Interactive Engineer",
    avatar: "💻",
    color: "#3b82f6",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "ethan",
    name: "Ethan Vance",
    role: "Principal Logic & Systems Architect",
    title: "Algorithm, State Machine & Business Logic Engineer",
    avatar: "🧠",
    color: "#0ea5e9",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "vikram",
    name: "Vikram Rao",
    role: "Lead Backend Developer",
    title: "Distributed Systems & API Architect",
    avatar: "⚙️",
    color: "#10b981",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "maya",
    name: "Maya Patel",
    role: "Mobile App Developer",
    title: "Cross-Platform Mobile Engineer",
    avatar: "📱",
    color: "#8b5cf6",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "chloe",
    name: "Chloe Bennett",
    role: "SEO & Growth Specialist",
    title: "Technical SEO & Search Strategist",
    avatar: "📈",
    color: "#f97316",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "julian",
    name: "Julian Thorne",
    role: "Lead Content Writer",
    title: "Copywriter & Brand Storyteller",
    avatar: "✍️",
    color: "#06b6d4",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "tasha",
    name: "Tasha Ward",
    role: "QA & Security Reviewer",
    title: "Quality Assurance & Security Auditor",
    avatar: "🛡️",
    color: "#ef4444",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "dax",
    name: "Dax Mercer",
    role: "Lead DevOps & Cloud Engineer",
    title: "Site Reliability & Cloud Infrastructure Architect",
    avatar: "☁️",
    color: "#06b6d4",
    status: "idle",
    activity: "Standby"
  },
  {
    id: "hannah",
    name: "Hannah Brooks",
    role: "Head of People Operations & HR",
    title: "Chief People Officer & Employee Experience Lead",
    avatar: "☕",
    color: "#f43f5e",
    status: "idle",
    activity: "Standby"
  }
];

export default function App() {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState('marcus');
  const [projectId, setProjectId] = useState('project-alpha');
  const [activeModel, setActiveModel] = useState('gemma4:31b-cloud');
  const [logs, setLogs] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeSpeech, setActiveSpeech] = useState({});
  const [meetingMode, setMeetingMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [viewLayout, setViewLayout] = useState('split'); // 'split' | 'map_only' | 'inspector_only'
  
  const wsRef = useRef(null);

  // Initialize WebSocket & Health check
  useEffect(() => {
    const connectWs = () => {
      const socketUrl = `ws://${window.location.hostname}:8000/ws/${projectId}`;
      const ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        setBackendConnected(true);
        console.log("WebSocket connected to AI Agency Server");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleIncomingEvent(payload);
        } catch (e) {
          console.error("Failed to parse websocket message:", e);
        }
      };

      ws.onclose = () => {
        setBackendConnected(false);
        setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        setBackendConnected(false);
      };

      wsRef.current = ws;
    };

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [projectId]);

  // Handle live multi-agent events from orchestrator
  const handleIncomingEvent = (payload) => {
    const { type, data } = payload;

    if (type === 'terminal_log') {
      setLogs((prev) => [...prev, data]);
      if (data.agentId) {
        setSelectedAgentId(data.agentId);
      }
    } else if (type === 'chat_message') {
      setChatMessages((prev) => [...prev, data]);
      if (data.agentId) {
        setSelectedAgentId(data.agentId);
      }
    } else if (type === 'agent_speech') {
      setActiveSpeech((prev) => ({ ...prev, [data.agentId]: data.text }));
      setTimeout(() => {
        setActiveSpeech((prev) => {
          const next = { ...prev };
          delete next[data.agentId];
          return next;
        });
      }, 5000);
    } else if (type === 'agent_status') {
      setAgents((prev) =>
        prev.map((ag) => (ag.id === data.agentId ? { ...ag, status: data.status, activity: data.activity } : ag))
      );
    } else if (type === 'team_movement') {
      if (data.destination === 'conference_room') {
        setMeetingMode(true);
      } else if (data.destination === 'desks') {
        setMeetingMode(false);
      }
    } else if (type === 'new_artifact') {
      setArtifacts((prev) => [data, ...prev]);
    } else if (type === 'project_status') {
      if (data.status === 'completed') {
        setMeetingMode(false);
      }
    }
  };

  // Send Command / Talk to Marcus or Specific Agent
  const handleSendMessage = (text, targetAgentId = 'marcus') => {
    setViewLayout('split');

    const targetAgent = agents.find(a => a.id === targetAgentId) || agents[0];

    // Log to terminal & messages
    setLogs((prev) => [
      ...prev,
      { agentId: 'CEO (YOU)', log: `Directive to ${targetAgent.name.toUpperCase()}: "${text}"` }
    ]);

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        agentId: 'ceo',
        author: 'CEO (YOU)',
        role: 'Director',
        avatar: '👑',
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (targetAgentId === 'marcus') {
        wsRef.current.send(JSON.stringify({
          type: 'chat_command',
          text: text,
          model: activeModel
        }));
      } else {
        wsRef.current.send(JSON.stringify({
          type: 'agent_chat',
          agentId: targetAgentId,
          text: text,
          model: activeModel
        }));
      }
    } else {
      if (targetAgentId === 'marcus') {
        fetch('/api/projects/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Autonomous Project', brief: text, model: activeModel })
        }).catch((e) => console.error(e));
      } else {
        fetch('/api/agents/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: targetAgentId, project_id: projectId, message: text })
        }).catch((e) => console.error(e));
      }
    }
  };

  // Steer Individual Agent
  const handleSteerAgent = (agentId, instruction) => {
    setLogs((prev) => [
      ...prev,
      { agentId: 'CEO (YOU)', log: `Steering ${agentId.toUpperCase()}: "${instruction}"` }
    ]);

    fetch('/api/agents/steer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, project_id: projectId, instruction })
    }).catch((e) => console.error(e));
  };

  const selectedAgent = agents.find((ag) => ag.id === selectedAgentId) || agents[0];

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0b0e14] text-[#f8fafc] select-none overflow-hidden font-mono">
      {/* 1. TOP RETRO APP HEADER */}
      <header className="h-11 bg-[#12161c] text-[#fbf7ee] px-4 flex items-center justify-between border-b border-[#2b3540] shadow-md z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wider">
            <span className="p-1 bg-amber-500 rounded text-stone-900">
              <Building2 size={16} />
            </span>
            <span className="text-amber-400">AI AGENTS COMPANY</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">v1.2-ollama</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-2 text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Multi-Agent Swarm: ACTIVE</span>
          </div>
        </div>

        {/* System & Model Indicators & Layout Toggles */}
        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="flex items-center bg-[#181f28] p-0.5 rounded border border-slate-700 text-xs">
            <button
              onClick={() => setViewLayout('split')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${viewLayout === 'split' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Split View (Office + Terminal)"
            >
              Split
            </button>
            <button
              onClick={() => setViewLayout('map_only')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${viewLayout === 'map_only' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Map Only"
            >
              Map
            </button>
            <button
              onClick={() => setViewLayout('inspector_only')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${viewLayout === 'inspector_only' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Terminal / IDE Only"
            >
              Terminal
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-[#181f28] px-2.5 py-1 rounded border border-slate-700 text-xs">
            <Cpu size={13} className="text-amber-400" />
            <span className="text-slate-300 font-bold">{activeModel}</span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${backendConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
            <span className="text-[11px] text-slate-300 hidden sm:inline">{backendConnected ? 'Ollama Online' : 'Standby'}</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="System Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE */}
      <main className="flex-1 flex gap-2 p-1.5 overflow-hidden min-h-0">
        {/* Left/Center: 2D Pixel Art Office Map */}
        {(viewLayout === 'split' || viewLayout === 'map_only') && (
          <div className="flex-1 h-full min-w-0 flex flex-col">
            <OfficeMap
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              activeSpeech={activeSpeech}
              meetingMode={meetingMode}
            />
          </div>
        )}

        {/* Right (In Map Only Mode): Vertical Agent Directory Sidebar */}
        {viewLayout === 'map_only' && (
          <AgentSidebar
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAddAgent={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Right (In Split or Terminal Mode): Agent Inspector & Live Control Panel */}
        {(viewLayout === 'split' || viewLayout === 'inspector_only') && (
          <div className={`${viewLayout === 'split' ? 'w-[440px] lg:w-[490px] xl:w-[540px]' : 'w-full'} h-full flex-shrink-0 flex flex-col`}>
            <AgentInspector
              agent={selectedAgent}
              logs={logs}
              artifacts={artifacts}
              chatMessages={chatMessages}
              onSendMessage={handleSendMessage}
              onSteerAgent={handleSteerAgent}
              activeModel={activeModel}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}
      </main>

      {/* 3. BOTTOM AGENT DOCK (Visible in Split Mode) */}
      {viewLayout === 'split' && (
        <footer className="flex-shrink-0">
          <AgentDock
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAddAgent={() => setIsSettingsOpen(true)}
          />
        </footer>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentModel={activeModel}
        onSaveModel={setActiveModel}
        ollamaStatus={{ status: 'online' }}
        mongoStatus={true}
      />
    </div>
  );
}
