import React from 'react';
import { Users, Loader2, Plus, Sparkles } from 'lucide-react';

export default function AgentSidebar({
  agents,
  selectedAgentId,
  onSelectAgent,
  onAddAgent
}) {
  return (
    <aside className="w-[300px] xl:w-[340px] h-full bg-[#181d24] border-2 border-[#2b3540] rounded-xl flex flex-col overflow-hidden shadow-2xl flex-shrink-0 font-mono select-none">
      {/* Header */}
      <div className="p-3 bg-[#12161c] border-b border-[#2b3540] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-amber-500/20 text-amber-400 rounded border border-amber-500/40">
            <Users size={15} />
          </span>
          <div>
            <h3 className="font-bold text-xs text-amber-400 tracking-wide uppercase">AI Squad Directory</h3>
            <p className="text-[10px] text-slate-400 font-sans">{agents.length} Active Specialists</p>
          </div>
        </div>

        <button
          onClick={onAddAgent}
          className="flex items-center gap-1 text-[10px] bg-[#222c38] hover:bg-amber-600 hover:text-white text-slate-300 px-2 py-1 rounded border border-slate-700 transition"
          title="Add Custom Agent"
        >
          <Plus size={12} />
          <span>Add</span>
        </button>
      </div>

      {/* Vertical Agents List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {agents.map((ag) => {
          const isSelected = selectedAgentId === ag.id;
          const isWorking = ag.status === 'working' || ag.status === 'planning';

          return (
            <div
              key={ag.id}
              onClick={() => onSelectAgent(ag.id)}
              className={`cursor-pointer rounded-lg p-2 transition-all flex items-center gap-2.5 border ${
                isSelected
                  ? 'bg-[#2a3441] border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-[#1e2530] border-[#2e3947] hover:bg-[#252f3d] hover:border-slate-500'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base shadow flex-shrink-0 border border-white/20"
                style={{ backgroundColor: ag.color || '#3b82f6' }}
              >
                {ag.avatar}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-100 truncate">
                    {ag.name}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                    isWorking
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isWorking ? (
                      <>
                        <Loader2 size={8} className="animate-spin text-emerald-400" />
                        <span>BUSY</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>IDLE</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 truncate font-sans">
                  {ag.role}
                </p>

                {/* Activity Status */}
                <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 font-mono">
                  <span className="text-amber-400 text-[8px]">▶</span>
                  <span className="truncate text-slate-300">{ag.activity || 'Standby'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
