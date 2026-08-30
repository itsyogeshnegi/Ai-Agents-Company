import React from 'react';
import { Plus, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function AgentDock({
  agents,
  selectedAgentId,
  onSelectAgent,
  onAddAgent
}) {
  return (
    <div className="w-full bg-[#3c3127] border-t-4 border-[#251d16] p-2 flex items-center gap-2 overflow-x-auto select-none shadow-2xl">
      {/* Agents Roster Cards */}
      {agents.map((ag) => {
        const isSelected = selectedAgentId === ag.id;
        const isWorking = ag.status === 'working' || ag.status === 'planning';

        return (
          <div
            key={ag.id}
            onClick={() => onSelectAgent(ag.id)}
            className={`flex-shrink-0 cursor-pointer min-w-[155px] max-w-[170px] bg-[#fbf7ee] border-2 rounded p-1.5 transition-all ${
              isSelected 
                ? 'border-amber-500 shadow-md ring-2 ring-amber-400 -translate-y-1 bg-amber-50' 
                : 'border-[#5a483a] hover:border-stone-400 hover:-translate-y-0.5'
            }`}
          >
            {/* Top row: Avatar + Name + Status */}
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-7 h-7 rounded border border-stone-600 flex items-center justify-center text-sm shadow-inner"
                style={{ backgroundColor: ag.color || '#3b82f6' }}
              >
                {ag.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[11px] text-[#2c221b] truncate font-mono uppercase">
                  {ag.name.split(' ')[0]}
                </div>
                <div className="text-[9px] text-stone-500 truncate font-sans">
                  {ag.role}
                </div>
              </div>
            </div>

            {/* Status Pill & Progress Bar */}
            <div className="flex items-center justify-between text-[9px] font-mono px-1 py-0.5 bg-[#ebe0d0] rounded border border-stone-300">
              <span className={`flex items-center gap-1 font-bold ${
                isWorking ? 'text-emerald-700' : 'text-stone-600'
              }`}>
                {isWorking ? (
                  <>
                    <Loader2 size={9} className="animate-spin text-emerald-600" />
                    <span>WORKING</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                    <span>IDLE</span>
                  </>
                )}
              </span>
              <span className="text-[8px] text-stone-500 truncate max-w-[55px]">
                {ag.activity || 'ready'}
              </span>
            </div>
          </div>
        );
      })}

      {/* Add Agent Button */}
      <button
        onClick={onAddAgent}
        className="flex-shrink-0 min-w-[120px] h-[58px] bg-[#4a3d31] hover:bg-[#5b4c3e] border-2 border-dashed border-stone-400 rounded flex flex-col items-center justify-center text-stone-300 hover:text-amber-200 transition text-xs font-mono font-bold gap-1"
      >
        <Plus size={14} />
        <span>+ Add Agent</span>
      </button>
    </div>
  );
}
