import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Code, 
  MessageSquare, 
  Activity, 
  Globe, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  FileCode,
  Sparkles,
  Smartphone,
  Monitor,
  RefreshCw,
  Cpu,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Send
} from 'lucide-react';

export default function AgentInspector({
  agent,
  logs = [],
  artifacts = [],
  chatMessages = [],
  onSendMessage,
  onSteerAgent,
  activeModel,
  onOpenSettings
}) {
  const [activeTab, setActiveTab] = useState('LIVE_PREVIEW');
  const [inputMessage, setInputMessage] = useState('');
  const [steerText, setSteerText] = useState('');
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [expandedThoughts, setExpandedThoughts] = useState({});
  
  const terminalEndRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Find index.html specifically for Live Preview
  const htmlArtifact = artifacts.find(a => a.filename === 'index.html') || 
                       artifacts.find(a => a.language === 'html' && a.content.includes('<body')) || 
                       artifacts.find(a => a.language === 'html') || 
                       artifacts[0];

  const currentArtifact = artifacts && artifacts.length > 0 ? artifacts[selectedArtifactIndex] || artifacts[0] : null;

  // Clean HTML for Live Preview (removes ```html and fixes relative images)
  const sanitizeHtmlForPreview = (content) => {
    if (!content) return '';
    let text = content.trim();
    
    // Strip markdown code fences (```html, ```)
    text = text.replace(/^```[a-zA-Z]*\n?/gm, '');
    text = text.replace(/\n?```$/gm, '');
    text = text.replace(/```/g, '');

    // Extract starting from <!DOCTYPE html> or <html to </html>
    const docTypeIdx = text.search(/<!DOCTYPE\s+html/i);
    const htmlStartIdx = text.search(/<html/i);
    let startIndex = docTypeIdx !== -1 ? docTypeIdx : htmlStartIdx;

    if (startIndex !== -1) {
      const htmlEndIdx = text.search(/<\/html>/i);
      if (htmlEndIdx !== -1) {
        text = text.substring(startIndex, htmlEndIdx + 7).trim();
      } else {
        text = text.substring(startIndex).trim();
      }
    }

    // Fix broken relative images with Unsplash CDN
    text = text.replace(/src=["'](?!(https?:\/\/|data:))([^"']+)["']/gi, 'src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"');

    return text;
  };

  useEffect(() => {
    if (activeTab === 'TERMINAL') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'MESSAGES') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, chatMessages, activeTab]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage, agent?.id);
    setInputMessage('');
  };

  const handleSteerSubmit = (e) => {
    e?.preventDefault();
    if (!steerText.trim() || !agent) return;
    onSteerAgent(agent.id, steerText);
    setSteerText('');
  };

  const toggleThought = (msgId) => {
    setExpandedThoughts(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const copyCode = () => {
    if (currentArtifact) {
      navigator.clipboard.writeText(currentArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadCurrentFile = () => {
    if (!currentArtifact) return;
    const blob = new Blob([currentArtifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentArtifact.filename || 'deliverable.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllApp = () => {
    if (!htmlArtifact) return;
    const cleanContent = sanitizeHtmlForPreview(htmlArtifact.content);
    const blob = new Blob([cleanContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#12161c] border-2 border-[#2b3540] rounded-xl shadow-2xl overflow-hidden font-mono text-slate-200">
      {/* 1. TOP AGENT PROFILE HEADER */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#171d24] border-b border-[#2b3540]">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-inner border border-white/10"
            style={{ backgroundColor: agent?.color || '#3b82f6' }}
          >
            {agent?.avatar || '👔'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide uppercase">
                {agent?.name || 'Marcus Steele'}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                agent?.status === 'working' || agent?.status === 'planning' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                ■ {agent?.status || 'idle'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">{agent?.role}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setActiveTab('LIVE_PREVIEW')} 
            className="px-3 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded font-bold text-white flex items-center gap-1.5 shadow-sm transition"
          >
            <Globe size={13} /> Live Preview
          </button>
          <button 
            onClick={onOpenSettings}
            className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 font-bold text-slate-300 flex items-center gap-1 transition"
          >
            <Cpu size={12} className="text-amber-400" /> Config
          </button>
        </div>
      </div>

      {/* 2. DIRECTOR STEER CONTROL BAR */}
      <div className="px-3 py-1.5 bg-[#151a21] border-b border-[#2b3540] flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 tracking-wider hidden sm:inline">DIRECTOR:</span>
        <form onSubmit={handleSteerSubmit} className="flex-1 flex gap-1.5">
          <input
            type="text"
            placeholder={`Steer ${agent?.name?.split(' ')[0] || 'agent'} (inject context/guidance)...`}
            value={steerText}
            onChange={(e) => setSteerText(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs bg-[#0b0e13] border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          />
          <button
            type="submit"
            className="px-3 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded transition"
          >
            Steer
          </button>
        </form>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center border-b border-[#2b3540] bg-[#141920] text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('LIVE_PREVIEW')}
          className={`flex items-center gap-1.5 px-3.5 py-2 border-r border-[#2b3540] transition ${
            activeTab === 'LIVE_PREVIEW' ? 'bg-[#0b0e14] text-emerald-400 border-b-2 border-b-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe size={14} /> LIVE PREVIEW {artifacts.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
        </button>

        <button
          onClick={() => setActiveTab('CODE')}
          className={`flex items-center gap-1.5 px-3.5 py-2 border-r border-[#2b3540] transition ${
            activeTab === 'CODE' ? 'bg-[#0b0e14] text-blue-400 border-b-2 border-b-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code size={14} /> CODE & FILES ({artifacts.length})
        </button>

        <button
          onClick={() => setActiveTab('MESSAGES')}
          className={`flex items-center gap-1.5 px-3.5 py-2 border-r border-[#2b3540] transition ${
            activeTab === 'MESSAGES' ? 'bg-[#0b0e14] text-amber-300 border-b-2 border-b-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare size={14} /> CHAT & THOUGHTS ({chatMessages.length})
        </button>

        <button
          onClick={() => setActiveTab('TERMINAL')}
          className={`flex items-center gap-1.5 px-3.5 py-2 transition ${
            activeTab === 'TERMINAL' ? 'bg-[#0b0e14] text-emerald-400 border-b-2 border-b-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal size={14} /> TERMINAL
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      <div className="flex-1 overflow-hidden relative">
        {/* TAB 1: 🌐 LIVE INTERACTIVE PREVIEW */}
        {activeTab === 'LIVE_PREVIEW' && (
          <div className="w-full h-full bg-[#090d14] flex flex-col overflow-hidden">
            {/* Browser Window Controls Header */}
            <div className="flex items-center justify-between bg-[#141922] px-3 py-1.5 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <div className="flex items-center gap-1 bg-[#0b0e14] px-2.5 py-0.5 rounded text-[11px] text-slate-300 font-mono border border-slate-800">
                  <span className="text-emerald-400">https://</span>
                  <span>app.ai-agency.local/index.html</span>
                </div>
              </div>

              {/* Viewport Toggles & Reload */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Mobile View (375px)"
                >
                  <Smartphone size={14} />
                </button>
                <button
                  onClick={() => setIframeKey(prev => prev + 1)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Reload Preview"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={downloadAllApp}
                  className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold flex items-center gap-1"
                  title="Download clean index.html"
                >
                  <Download size={12} /> Download HTML
                </button>
              </div>
            </div>

            {/* Live Interactive Iframe Stage */}
            <div className="flex-1 flex items-center justify-center p-2 overflow-auto bg-[#070a0e]">
              {!htmlArtifact ? (
                <div className="text-center text-slate-500 py-12">
                  <Globe size={40} className="mx-auto mb-2 text-slate-600" />
                  <p className="font-bold text-slate-400">No Web App Built Yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Send a brief to Marcus (e.g. "Build a SaaS landing page") to see your live interactive website here!
                  </p>
                </div>
              ) : (
                <div 
                  className={`h-full bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
                    previewDevice === 'mobile' ? 'w-[375px] max-w-full border-4 border-slate-700' : 'w-full'
                  }`}
                >
                  <iframe
                    key={iframeKey}
                    title="Live App Preview"
                    srcDoc={sanitizeHtmlForPreview(htmlArtifact.content)}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-modals allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 💻 CODE & FILE BROWSER */}
        {activeTab === 'CODE' && (
          <div className="w-full h-full bg-[#0d1117] text-slate-200 flex flex-col overflow-hidden">
            {/* File List Header */}
            <div className="flex items-center justify-between bg-[#141922] px-3 py-1.5 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-1 overflow-x-auto max-w-[70%]">
                {artifacts.length === 0 ? (
                  <span className="text-slate-500 italic">No files generated yet</span>
                ) : (
                  artifacts.map((art, i) => (
                    <button
                      key={art.id || i}
                      onClick={() => setSelectedArtifactIndex(i)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition ${
                        selectedArtifactIndex === i ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCode size={12} /> {art.filename}
                    </button>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              {currentArtifact && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCode}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded flex items-center gap-1"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                  <button
                    onClick={downloadCurrentFile}
                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1"
                  >
                    <Download size={12} /> Download File
                  </button>
                </div>
              )}
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-y-auto p-3 text-xs font-mono select-text bg-[#090d12]">
              {!currentArtifact ? (
                <div className="text-center text-slate-500 py-12">
                  <FileCode size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Assign a project to Marcus to start generating code artifacts.</p>
                </div>
              ) : (
                <pre className="text-blue-300 whitespace-pre-wrap leading-relaxed">
                  <code>{currentArtifact.content}</code>
                </pre>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 💬 CHAT & THOUGHTS */}
        {activeTab === 'MESSAGES' && (
          <div className="w-full h-full bg-[#0d1117] p-3 overflow-y-auto text-xs font-sans select-text flex flex-col gap-3">
            <div className="text-slate-500 text-center pb-2 text-[11px] font-mono border-b border-slate-800">
              Direct Real-Time Ollama Channel with <span className="text-amber-400 font-bold">{agent?.name}</span> & Squad
            </div>

            {chatMessages.length === 0 ? (
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">👔</span>
                  <span className="font-bold text-amber-400">Marcus Steele (Project Director):</span>
                </div>
                <p className="text-slate-400">
                  Greetings CEO! I am online with Ollama (<span className="text-amber-300 font-mono">{activeModel}</span>). Give me a project directive (e.g. "Build a SaaS landing page with dark mode"), and the team will build the full code and show you the Live Preview!
                </p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isExpanded = expandedThoughts[msg.id || idx];
                return (
                  <div key={msg.id || idx} className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#141a22] border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{msg.avatar || '💬'}</span>
                        <span className="font-bold text-white text-xs">{msg.author || msg.agentId}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{msg.role}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp || 'just now'}</span>
                    </div>

                    {/* Agent Inner Thought */}
                    {msg.thought && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleThought(msg.id || idx)}
                          className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-mono bg-purple-950/40 px-2 py-1 rounded border border-purple-800/40"
                        >
                          <BrainCircuit size={12} />
                          <span>Agent Inner Thought Trace</span>
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        {isExpanded && (
                          <div className="mt-1 p-2 bg-[#090c10] border border-purple-900/40 rounded text-purple-200 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                            {msg.thought}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-slate-200 text-xs mt-1 whitespace-pre-wrap leading-relaxed font-sans">
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* TAB 4: 📟 TERMINAL */}
        {activeTab === 'TERMINAL' && (
          <div className="w-full h-full bg-[#0b0e14] text-emerald-400 p-3 overflow-y-auto text-xs font-mono leading-relaxed select-text">
            <div className="text-slate-500 pb-2 border-b border-slate-800 mb-2 flex justify-between">
              <span>■ live - pty {agent?.id || 'agent'}-session</span>
              <span className="text-amber-400">LLM: {activeModel}</span>
            </div>
            
            {logs.length === 0 ? (
              <div className="text-slate-500 italic py-6 text-center">
                Type in the command bar below to talk to Marcus or any agent...
              </div>
            ) : (
              logs.map((item, idx) => (
                <div key={idx} className="mb-2 whitespace-pre-wrap">
                  {item.agentId && (
                    <span className="text-amber-400 font-bold">[{item.agentId.toUpperCase()}]: </span>
                  )}
                  <span className="text-slate-200">{item.log}</span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>

      {/* 5. BOTTOM COMMAND & MESSAGE BAR */}
      <div className="bg-[#151a21] border-t border-[#2b3540] p-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
          <span className="font-bold flex items-center gap-1.5">
            <span>TALK TO {agent?.name?.toUpperCase() || 'MARCUS'}:</span>
          </span>
          <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded font-mono border border-amber-800/40">
            ⚡ {activeModel}
          </span>
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder={`Ask ${agent?.name?.split(' ')[0] || 'Marcus'} a question or assign a build task...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[#0b0e14] border border-slate-700 rounded text-white font-sans focus:outline-none focus:border-amber-500 shadow-inner"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded flex items-center gap-1.5 shadow-md transition"
          >
            Send <Send size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}
