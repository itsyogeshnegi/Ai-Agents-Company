import React, { useState } from 'react';
import { X, Database, Cpu, Server, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  currentModel,
  onSaveModel,
  ollamaStatus,
  mongoStatus
}) {
  const [modelInput, setModelInput] = useState(currentModel || 'gemma4:31b-cloud');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [mongoUri, setMongoUri] = useState('mongodb://localhost:27017');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveModel(modelInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-[#fcf8f2] border-4 border-[#3e322a] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#e8ded0] border-b-2 border-[#3e322a]">
          <div className="flex items-center gap-2 font-bold text-sm text-[#3e322a]">
            <Cpu size={16} /> SYSTEM & MODEL CONFIGURATION
          </div>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-900">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4 text-xs">
          {/* 1. AI Model Selection */}
          <div>
            <label className="block font-bold text-stone-800 mb-1">
              Active LLM Model (Ollama / Cloud):
            </label>
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-400 rounded focus:outline-none focus:border-amber-700 font-mono text-stone-900"
              placeholder="e.g. gemma4:31b-cloud, qwen2.5-coder:7b, llama3.1"
            />
            <p className="text-[11px] text-stone-500 mt-1 font-sans">
              Currently configured to power Marcus Steele and all 7 specialized agents.
            </p>
          </div>

          {/* 2. Ollama Host URL */}
          <div>
            <label className="block font-bold text-stone-800 mb-1 flex items-center justify-between">
              <span>Ollama Host Endpoint:</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                <CheckCircle size={12} /> {ollamaStatus?.status || 'Online / Standby'}
              </span>
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-400 rounded font-mono text-stone-900"
            />
          </div>

          {/* 3. MongoDB Local URI */}
          <div>
            <label className="block font-bold text-stone-800 mb-1 flex items-center justify-between">
              <span>Local MongoDB Database URI:</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                <Database size={12} /> {mongoStatus ? 'Connected (localhost:27017)' : 'Local Memory Active'}
              </span>
            </label>
            <input
              type="text"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-400 rounded font-mono text-stone-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 border border-stone-400 rounded text-stone-800 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#4a3b32] hover:bg-[#382b23] text-amber-100 border-2 border-[#2b2019] rounded font-bold shadow-md"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
