import React, { useState, useEffect, useRef } from 'react';

const OFFICE_WIDTH = 960;
const OFFICE_HEIGHT = 600;

// Precise Chair Coordinates for All 10 Team Members
export const FIXED_DESK_SEATS = {
  marcus: { x: 92, y: 105, zone: "boss_office" },   // Marcus behind Boss Desk
  sophia: { x: 56, y: 330, zone: "desk_row1_1" },  // Sophia (UI/UX) - Desk 1
  leo:    { x: 173, y: 330, zone: "desk_row1_2" }, // Leo (Frontend) - Desk 2
  vikram: { x: 290, y: 330, zone: "desk_row1_3" }, // Vikram (Backend) - Desk 3
  maya:   { x: 407, y: 330, zone: "desk_row1_4" }, // Maya (Mobile) - Desk 4
  elena:  { x: 524, y: 330, zone: "desk_row1_5" }, // Elena (Creative Motion) - Desk 5
  ethan:  { x: 641, y: 330, zone: "desk_row1_6" }, // Ethan (Logic Architect) - Desk 6
  chloe:  { x: 56, y: 500, zone: "desk_row2_1" },  // Chloe (SEO) - Desk 7
  julian: { x: 173, y: 500, zone: "desk_row2_2" }, // Julian (Content) - Desk 8
  tasha:  { x: 290, y: 500, zone: "desk_row2_3" }  // Tasha (QA) - Desk 9
};

// Conference Room Chairs
export const FIXED_MEETING_SEATS = {
  marcus: { x: 270, y: 112 }, // Head of Table (Left)
  sophia: { x: 310, y: 72 },  // Top Chair 1
  leo:    { x: 345, y: 72 },  // Top Chair 2
  vikram: { x: 380, y: 72 },  // Top Chair 3
  maya:   { x: 415, y: 72 },  // Top Chair 4
  elena:  { x: 450, y: 112 }, // Head of Table (Right)
  ethan:  { x: 310, y: 152 }, // Bottom Chair 1
  chloe:  { x: 345, y: 152 }, // Bottom Chair 2
  julian: { x: 380, y: 152 }, // Bottom Chair 3
  tasha:  { x: 415, y: 152 }  // Bottom Chair 4
};

// Corridor Waypoints for natural navigation
function computePath(start, target) {
  const path = [];
  const MAIN_CORRIDOR_Y = 390;
  const BOSS_DOOR_X = 170;
  const CONF_DOOR_X = 380;

  // 1. Exit current area
  if (start.y < 210 && start.x < 200) {
    path.push({ x: 92, y: 170 });
    path.push({ x: BOSS_DOOR_X, y: 170 });
    path.push({ x: BOSS_DOOR_X, y: MAIN_CORRIDOR_Y });
  } else if (start.y < 210 && start.x >= 240 && start.x <= 530) {
    path.push({ x: CONF_DOOR_X, y: 180 });
    path.push({ x: CONF_DOOR_X, y: MAIN_CORRIDOR_Y });
  } else {
    path.push({ x: start.x, y: MAIN_CORRIDOR_Y });
  }

  // 2. Enter target area
  if (target.y < 210 && target.x < 200) {
    path.push({ x: BOSS_DOOR_X, y: MAIN_CORRIDOR_Y });
    path.push({ x: BOSS_DOOR_X, y: 170 });
    path.push({ x: 92, y: 170 });
    path.push({ x: target.x, y: target.y });
  } else if (target.y < 210 && target.x >= 240 && target.x <= 530) {
    path.push({ x: CONF_DOOR_X, y: MAIN_CORRIDOR_Y });
    path.push({ x: CONF_DOOR_X, y: 180 });
    path.push({ x: target.x, y: target.y });
  } else {
    path.push({ x: target.x, y: MAIN_CORRIDOR_Y });
    path.push({ x: target.x, y: target.y });
  }

  return path;
}

export default function OfficeMap({
  agents,
  selectedAgentId,
  onSelectAgent,
  activeSpeech = {},
  meetingMode = false
}) {
  const [positions, setPositions] = useState(() => ({ ...FIXED_DESK_SEATS }));
  const [isWalking, setIsWalking] = useState({});
  const [clockTime, setClockTime] = useState("12:44");
  const walkingLoopsRef = useRef({});

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClockTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const walkAgentAlongPath = (agentId, waypoints, delayMs = 0) => {
    if (walkingLoopsRef.current[agentId]) {
      cancelAnimationFrame(walkingLoopsRef.current[agentId]);
    }

    if (!waypoints || waypoints.length === 0) return;

    setTimeout(() => {
      let currentWaypointIdx = 0;
      let startPoint = positions[agentId] || FIXED_DESK_SEATS[agentId] || { x: 100, y: 100 };
      let currentX = startPoint.x;
      let currentY = startPoint.y;
      const SPEED = 2.8;

      setIsWalking((prev) => ({ ...prev, [agentId]: true }));

      const step = () => {
        if (currentWaypointIdx >= waypoints.length) {
          setIsWalking((prev) => ({ ...prev, [agentId]: false }));
          const finalPoint = waypoints[waypoints.length - 1];
          setPositions((prev) => ({
            ...prev,
            [agentId]: { x: finalPoint.x, y: finalPoint.y }
          }));
          return;
        }

        const targetPoint = waypoints[currentWaypointIdx];
        const dx = targetPoint.x - currentX;
        const dy = targetPoint.y - currentY;
        const dist = Math.hypot(dx, dy);

        if (dist <= SPEED) {
          currentX = targetPoint.x;
          currentY = targetPoint.y;
          currentWaypointIdx++;
        } else {
          currentX += (dx / dist) * SPEED;
          currentY += (dy / dist) * SPEED;
        }

        setPositions((prev) => ({
          ...prev,
          [agentId]: { x: currentX, y: currentY }
        }));

        walkingLoopsRef.current[agentId] = requestAnimationFrame(step);
      };

      walkingLoopsRef.current[agentId] = requestAnimationFrame(step);
    }, delayMs);
  };

  useEffect(() => {
    agents.forEach((ag, idx) => {
      const currentPos = positions[ag.id] || FIXED_DESK_SEATS[ag.id];
      const targetPos = meetingMode ? FIXED_MEETING_SEATS[ag.id] : FIXED_DESK_SEATS[ag.id];

      if (targetPos && currentPos) {
        const waypoints = computePath(currentPos, targetPos);
        walkAgentAlongPath(ag.id, waypoints, idx * 100);
      }
    });

    return () => {
      Object.values(walkingLoopsRef.current).forEach(cancelAnimationFrame);
    };
  }, [meetingMode]);

  return (
    <div className="relative w-full h-full bg-[#3c4146] border-4 border-[#24272a] rounded-xl overflow-hidden select-none shadow-2xl flex items-center justify-center p-1 font-mono">
      <svg
        viewBox={`0 0 ${OFFICE_WIDTH} ${OFFICE_HEIGHT}`}
        className="w-full h-full object-contain bg-[#c1d3c9] rounded-lg shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      >
        <defs>
          <pattern id="munderTiles" width="28" height="28" patternUnits="userSpaceOnUse">
            <rect width="28" height="28" fill="#b9ccbf" />
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#aabfad" strokeWidth="1" />
            <rect x="13" y="13" width="2" height="2" fill="#98af9c" />
          </pattern>

          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* 1. MUNDER DIFFLIN MINT RETRO TILE FLOOR */}
        <rect x="0" y="0" width={OFFICE_WIDTH} height={OFFICE_HEIGHT} fill="url(#munderTiles)" />

        {/* Outer White Wall Border */}
        <rect x="8" y="8" width={OFFICE_WIDTH - 16} height={OFFICE_HEIGHT - 16} fill="none" stroke="#f1f3f0" strokeWidth="12" rx="4" />
        <rect x="14" y="14" width={OFFICE_WIDTH - 28} height={OFFICE_HEIGHT - 28} fill="none" stroke="#4a5550" strokeWidth="3" rx="2" />

        {/* TOP EXTERIOR WALL PROPS */}
        <circle cx="36" cy="38" r="10" fill="#ffffff" stroke="#991b1b" strokeWidth="2.5" />
        <line x1="36" y1="38" x2="36" y2="32" stroke="#111827" strokeWidth="1.5" />
        <line x1="36" y1="38" x2="41" y2="38" stroke="#111827" strokeWidth="1.5" />

        {[60, 280, 420].map((wx, i) => (
          <g key={`win-${i}`} transform={`translate(${wx}, 26)`}>
            <rect x="0" y="0" width="40" height="22" fill="#dbeafe" stroke="#64748b" strokeWidth="2" />
            <line x1="20" y1="0" x2="20" y2="22" stroke="#64748b" strokeWidth="1.5" />
            <line x1="0" y1="11" x2="40" y2="11" stroke="#64748b" strokeWidth="1.5" />
          </g>
        ))}

        <rect x="120" y="24" width="28" height="28" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="120" y="24" width="28" height="8" fill="#b91c1c" />
        <text x="134" y="44" fill="#1e293b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          30
        </text>

        {[{ x: 180, y: 55 }, { x: 490, y: 55 }, { x: 38, y: 565 }, { x: 660, y: 565 }, { x: 885, y: 565 }].map((p, i) => (
          <g key={`plant-${i}`} transform={`translate(${p.x}, ${p.y})`} filter="url(#softShadow)">
            <rect x="-7" y="0" width="14" height="12" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
            <circle cx="0" cy="-4" r="8" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
            <circle cx="0" cy="-4" r="4" fill="#22c55e" />
          </g>
        ))}

        {/* ========================================================================= */}
        {/* ROOM 1: 👔 MARCUS BOSS OFFICE (Top Left) */}
        {/* ========================================================================= */}
        <rect x="18" y="18" width="170" height="190" fill="none" stroke="#ffffff" strokeWidth="8" />
        <rect x="22" y="22" width="162" height="182" fill="none" stroke="#475569" strokeWidth="1.5" />
        <rect x="160" y="150" width="28" height="40" fill="#b9ccbf" />

        <g transform="translate(55, 115)" filter="url(#softShadow)">
          <rect x="0" y="0" width="75" height="42" fill="#d97706" stroke="#78350f" strokeWidth="2.5" rx="2" />
          <rect x="4" y="4" width="67" height="34" fill="#b45309" rx="1" />
          <rect x="26" y="8" width="22" height="14" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="8" y="14" width="9" height="10" fill="#ffffff" stroke="#78350f" strokeWidth="1" />
          <text x="12.5" y="21" fill="#b91c1c" fontSize="4" fontWeight="bold" textAnchor="middle">★</text>
          <rect x="54" y="12" width="14" height="18" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
        </g>
        <circle cx="92" cy="180" r="9" fill="#d97706" stroke="#78350f" strokeWidth="2" filter="url(#softShadow)" />

        {/* ========================================================================= */}
        {/* ROOM 2: 🤝 CONFERENCE ROOM (Top Center) */}
        {/* ========================================================================= */}
        <rect x="245" y="18" width="280" height="190" fill="none" stroke="#ffffff" strokeWidth="8" />
        <rect x="249" y="22" width="272" height="182" fill="none" stroke="#475569" strokeWidth="1.5" />
        <rect x="365" y="195" width="40" height="18" fill="#b9ccbf" />

        <g transform="translate(280, 80)" filter="url(#softShadow)">
          <rect x="0" y="0" width="170" height="65" fill="#f59e0b" stroke="#92400e" strokeWidth="2.5" rx="6" />
          <rect x="6" y="6" width="158" height="53" fill="#d97706" rx="4" />
          <rect x="135" y="12" width="18" height="12" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.2" />
          <circle cx="20" cy="22" r="5" fill="#15803d" stroke="#052e16" />
        </g>

        {/* Purple Chairs */}
        {[310, 345, 380, 415].map((cx, i) => (
          <rect key={`c-top-${i}`} x={cx - 10} y={64} width="20" height="16" rx="3" fill="#86198f" stroke="#4a044e" strokeWidth="2" filter="url(#softShadow)" />
        ))}
        {[310, 345, 380, 415].map((cx, i) => (
          <rect key={`c-bot-${i}`} x={cx - 10} y={145} width="20" height="16" rx="3" fill="#86198f" stroke="#4a044e" strokeWidth="2" filter="url(#softShadow)" />
        ))}
        <rect x="260" y="102" width="16" height="20" rx="3" fill="#86198f" stroke="#4a044e" strokeWidth="2" filter="url(#softShadow)" />
        <rect x="450" y="102" width="16" height="20" rx="3" fill="#86198f" stroke="#4a044e" strokeWidth="2" filter="url(#softShadow)" />

        {/* ========================================================================= */}
        {/* ROOM 3: 📑 RECEPTION / CUBICLE HALF WALL (Center Left) */}
        {/* ========================================================================= */}
        <rect x="18" y="218" width="505" height="14" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
        <rect x="160" y="232" width="365" height="42" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" filter="url(#softShadow)" />
        
        <rect x="188" y="240" width="50" height="26" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
        <circle cx="202" cy="253" r="3" fill="#ec4899" />
        <circle cx="224" cy="253" r="3" fill="#3b82f6" />

        <rect x="250" y="240" width="55" height="26" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
        {[0, 1, 2, 3].map((s) => (
          <rect key={`sticky-${s}`} x={255 + s * 12} y="246" width="9" height="12" fill="#fde047" stroke="#eab308" />
        ))}

        <rect x="430" y="240" width="50" height="26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="445" cy="253" r="3" fill="#a855f7" />
        <circle cx="465" cy="253" r="3" fill="#a855f7" />
        <rect x="315" y="242" width="22" height="24" fill="#86efac" stroke="#16a34a" strokeWidth="1.5" />

        {/* ========================================================================= */}
        {/* ROOM 4: 💻 ANNEX (Top Right) */}
        {/* ========================================================================= */}
        <g transform="translate(900, 22)" filter="url(#softShadow)">
          <circle cx="10" cy="10" r="9" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <rect x="2" y="18" width="16" height="24" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
        </g>

        {[{ x: 740, y: 80 }, { x: 825, y: 80 }].map((d, i) => (
          <g key={`annex-${i}`} transform={`translate(${d.x}, ${d.y})`} filter="url(#softShadow)">
            <rect x="0" y="0" width="68" height="38" fill="#d97706" stroke="#78350f" strokeWidth="2" rx="2" />
            <rect x="4" y="4" width="60" height="30" fill="#b45309" rx="1" />
            <rect x="22" y="6" width="24" height="14" fill="#0284c7" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="20" y="22" width="28" height="7" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="34" cy="48" r="9" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
          </g>
        ))}

        {[{ x: 540, y: 135 }, { x: 625, y: 135 }].map((d, i) => (
          <g key={`mid-${i}`} transform={`translate(${d.x}, ${d.y})`} filter="url(#softShadow)">
            <rect x="0" y="0" width="68" height="38" fill="#d97706" stroke="#78350f" strokeWidth="2" rx="2" />
            <rect x="4" y="4" width="60" height="30" fill="#b45309" rx="1" />
            <rect x="22" y="6" width="24" height="14" fill="#38bdf8" stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="34" cy="48" r="9" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
          </g>
        ))}

        {/* ========================================================================= */}
        {/* ROOM 5: ☕ KITCHEN, BREAKROOM & COPIER (Bottom Right) */}
        {/* ========================================================================= */}
        <rect x="675" y="275" width="270" height="12" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
        <rect x="675" y="275" width="12" height="190" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />

        <g transform="translate(850, 275)" filter="url(#softShadow)">
          <rect x="0" y="0" width="75" height="54" fill="#86efac" stroke="#15803d" strokeWidth="2.5" rx="3" />
          <rect x="8" y="8" width="58" height="26" fill="#14532d" rx="2" />
          <rect x="68" y="16" width="16" height="28" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
        </g>

        <g transform="translate(735, 420)" filter="url(#softShadow)">
          <rect x="0" y="0" width="85" height="34" fill="#f8fafc" stroke="#64748b" strokeWidth="2" rx="2" />
          <rect x="8" y="6" width="18" height="22" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="17" cy="17" r="3" fill="#ef4444" />
          <rect x="42" y="8" width="28" height="18" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" rx="2" />
        </g>

        <g transform="translate(825, 415)" filter="url(#softShadow)">
          <rect x="0" y="0" width="28" height="42" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
          <line x1="0" y1="18" x2="28" y2="18" stroke="#64748b" strokeWidth="1.5" />
          
          <rect x="34" y="0" width="48" height="42" fill="#065f46" stroke="#047857" strokeWidth="2" />
          <rect x="38" y="4" width="40" height="24" fill="#022c22" />
          <rect x="42" y="8" width="7" height="7" fill="#f59e0b" />
          <rect x="52" y="8" width="7" height="7" fill="#ef4444" />
          <rect x="62" y="8" width="7" height="7" fill="#3b82f6" />
          <rect x="42" y="18" width="7" height="7" fill="#10b981" />
          <rect x="52" y="18" width="7" height="7" fill="#ec4899" />
          <rect x="62" y="18" width="7" height="7" fill="#eab308" />
        </g>

        <circle cx="490" cy="460" r="6" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
        <circle cx="920" cy="370" r="6" fill="#64748b" stroke="#334155" strokeWidth="1.5" />

        {/* ========================================================================= */}
        {/* MAIN OPEN WORKSTATION DESKS (6 TOP ROW | 6 BOTTOM ROW) */}
        {/* ========================================================================= */}
        {/* Top Open Desk Row (6 Desks: Sophia, Leo, Vikram, Maya, Elena, Ethan) */}
        {[20, 137, 254, 371, 488, 605].map((dx, i) => (
          <g key={`desk-top-${i}`} transform={`translate(${dx}, 275)`} filter="url(#softShadow)">
            <rect x="0" y="0" width="72" height="42" fill="#d97706" stroke="#78350f" strokeWidth="2.2" rx="2" />
            <rect x="4" y="4" width="64" height="34" fill="#b45309" rx="1" />
            <rect x="24" y="6" width="24" height="15" fill="#38bdf8" stroke="#1e293b" strokeWidth="1.5" rx="1" />
            <rect x="22" y="24" width="28" height="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="36" cy="54" r="9" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          </g>
        ))}

        {/* Bottom Open Desk Row (6 Desks: Chloe, Julian, Tasha, Spare Desks) */}
        {[20, 137, 254, 371, 488, 605].map((dx, i) => (
          <g key={`desk-bot-${i}`} transform={`translate(${dx}, 445)`} filter="url(#softShadow)">
            <rect x="0" y="0" width="72" height="42" fill="#d97706" stroke="#78350f" strokeWidth="2.2" rx="2" />
            <rect x="4" y="4" width="64" height="34" fill="#b45309" rx="1" />
            <rect x="24" y="6" width="24" height="15" fill="#38bdf8" stroke="#1e293b" strokeWidth="1.5" rx="1" />
            <rect x="22" y="24" width="28" height="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="36" cy="54" r="9" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          </g>
        ))}

        {/* ========================================================================= */}
        {/* RETRO PIXEL CHARACTERS (ALL EMPLOYEES SITTING AT THEIR DESKS) */}
        {/* ========================================================================= */}
        {agents.map((ag) => {
          const currentCoord = positions[ag.id] || FIXED_DESK_SEATS[ag.id] || { x: 100, y: 100 };
          const isSelected = selectedAgentId === ag.id;
          const isWorking = ag.status === 'working' || ag.status === 'planning';
          const walking = isWalking[ag.id];
          const speech = activeSpeech[ag.id];

          return (
            <g
              key={`char-${ag.id}`}
              className="cursor-pointer"
              transform={`translate(${currentCoord.x}, ${currentCoord.y})`}
              onClick={() => onSelectAgent(ag.id)}
            >
              {/* Ground Shadow */}
              <ellipse cx="0" cy="14" rx="10" ry="4" fill="#000000" fillOpacity="0.4" />

              {/* Glowing Golden Selection Ring */}
              {isSelected && (
                <circle cx="0" cy="-6" r="22" fill="none" stroke="#f59e0b" strokeWidth="3" />
              )}

              {/* Character Sprite */}
              <g>
                {/* Hair */}
                <rect 
                  x="-8" 
                  y="-27" 
                  width="16" 
                  height="8" 
                  rx="2" 
                  fill={
                    ag.id === 'marcus' ? '#1c1917' : 
                    (ag.id === 'sophia' ? '#78350f' : 
                    (ag.id === 'elena' ? '#d97706' : 
                    (ag.id === 'ethan' ? '#0f172a' : 
                    (ag.id === 'julian' ? '#0f172a' : '#d97706'))))
                  } 
                />
                
                {/* Face & Skin */}
                <rect x="-7" y="-22" width="14" height="13" rx="2" fill="#fbcfe8" stroke="#451a03" strokeWidth="1.2" />
                <rect x="-4" y="-17" width="2" height="2.5" fill="#0f172a" />
                <rect x="2" y="-17" width="2" height="2.5" fill="#0f172a" />
                <rect x="-2" y="-12" width="4" height="1.2" fill="#881337" />

                {/* Torso & Suit / Cardigan */}
                <rect
                  x="-9"
                  y="-9"
                  width="18"
                  height="16"
                  rx="2"
                  fill={ag.color || '#3b82f6'}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
                {/* Collar & Tie */}
                <rect x="-2.5" y="-8" width="5" height="5" fill="#ffffff" />
                <rect x="-1" y="-6" width="2" height="8" fill="#dc2626" />

                {/* Coffee Mug in Hand */}
                <rect x="7" y="-5" width="6" height="7" fill="#ffffff" stroke="#78350f" strokeWidth="0.8" />
                <rect x="6" y="-3" width="2" height="3" fill="#ffffff" stroke="#78350f" strokeWidth="0.5" />

                {/* Status Dot */}
                <circle
                  cx="8"
                  cy="-24"
                  r="3.5"
                  fill={isWorking ? '#22c55e' : (walking ? '#f59e0b' : '#38bdf8')}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>

              {/* Speech Bubble */}
              {speech && (
                <g className="speech-bubble" transform="translate(-80, -68)" filter="url(#softShadow)">
                  <rect
                    x="0"
                    y="0"
                    width="160"
                    height="32"
                    rx="5"
                    fill="#ffffff"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                  <polygon points="75,32 85,32 80,39" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
                  <polygon points="76,32 84,32 80,38" fill="#ffffff" />
                  
                  <text
                    x="80"
                    y="15"
                    fill="#0f172a"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {speech.length > 26 ? speech.slice(0, 24) + '...' : speech}
                  </text>
                  <text
                    x="80"
                    y="25"
                    fill="#64748b"
                    fontSize="6"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    {isWorking ? '⚡ working on deliverable' : (walking ? '🚶 walking in hallway' : '💼 at workstation')}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Retro Status Pill Footer */}
      <div className="absolute bottom-2 left-3 flex items-center gap-3 bg-[#ffffff]/95 text-slate-800 px-3.5 py-1.5 rounded-md border border-[#94a3b8] text-xs font-mono shadow-md">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{clockTime}</span>
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-700 font-bold flex items-center gap-1 text-[11px]">
          🏢 MUNDER DIFFLIN • {agents.length} AGENTS ACTIVE
        </span>
      </div>
    </div>
  );
}
