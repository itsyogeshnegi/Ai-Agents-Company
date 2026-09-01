import React, { useState, useEffect, useRef } from 'react';

const OFFICE_WIDTH = 960;
const OFFICE_HEIGHT = 600;

// Precise Chair Coordinates for All 12 Team Members
const FIXED_DESK_SEATS = {
  marcus: { x: 92, y: 105, zone: "boss_office" },   // Marcus behind Boss Desk
  sophia: { x: 56, y: 330, zone: "desk_row1_1" },  // Sophia (UI/UX) - Desk 1
  leo:    { x: 173, y: 330, zone: "desk_row1_2" }, // Leo (Frontend) - Desk 2
  vikram: { x: 290, y: 330, zone: "desk_row1_3" }, // Vikram (Backend) - Desk 3
  maya:   { x: 407, y: 330, zone: "desk_row1_4" }, // Maya (Mobile) - Desk 4
  elena:  { x: 524, y: 330, zone: "desk_row1_5" }, // Elena (Creative Motion) - Desk 5
  ethan:  { x: 641, y: 330, zone: "desk_row1_6" }, // Ethan (Logic Architect) - Desk 6
  chloe:  { x: 56, y: 500, zone: "desk_row2_1" },  // Chloe (SEO) - Desk 7
  julian: { x: 173, y: 500, zone: "desk_row2_2" }, // Julian (Content) - Desk 8
  tasha:  { x: 290, y: 500, zone: "desk_row2_3" }, // Tasha (QA) - Desk 9
  dax:    { x: 407, y: 500, zone: "desk_row2_4" }, // Dax (DevOps & Cloud) - Desk 10
  hannah: { x: 524, y: 500, zone: "desk_row2_5" }  // Hannah (People Ops & HR) - Desk 11
};

// Conference Room Chairs
const FIXED_MEETING_SEATS = {
  marcus: { x: 270, y: 112 }, // Head of Table (Left)
  sophia: { x: 300, y: 72 },  // Top Chair 1
  leo:    { x: 335, y: 72 },  // Top Chair 2
  vikram: { x: 370, y: 72 },  // Top Chair 3
  maya:   { x: 405, y: 72 },  // Top Chair 4
  dax:    { x: 435, y: 72 },  // Top Chair 5
  elena:  { x: 455, y: 112 }, // Head of Table (Right)
  ethan:  { x: 300, y: 152 }, // Bottom Chair 1
  chloe:  { x: 335, y: 152 }, // Bottom Chair 2
  julian: { x: 370, y: 152 }, // Bottom Chair 3
  tasha:  { x: 405, y: 152 }, // Bottom Chair 4
  hannah: { x: 435, y: 152 }  // Bottom Chair 5
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
  } else if (start.y < 210 && start.x > 530) {
    path.push({ x: 715, y: 210 });
    path.push({ x: 715, y: MAIN_CORRIDOR_Y });
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
  } else if (target.y < 210 && target.x > 530) {
    path.push({ x: 715, y: MAIN_CORRIDOR_Y });
    path.push({ x: 715, y: 210 });
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
  const [internalSpeech, setInternalSpeech] = useState({});
  
  // Real-Time Clock & Calendar State for Boss Office
  const [currentDateTime, setCurrentDateTime] = useState(() => {
    const now = new Date();
    return {
      timeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      dateNum: String(now.getDate()),
      monthShort: now.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      dayShort: now.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
    };
  });

  // Real-Time Live Server Telemetry (GPU Temp, RAM Usage, GPU Usage, CPU)
  const [serverTelemetry, setServerTelemetry] = useState({
    gpuTemp: 42,
    gpuUsage: 48,
    ramUsageGB: 14.8,
    ramTotalGB: 32,
    ramUsagePct: 46,
    cpuUsage: 32,
    cpuTemp: 38,
    clusterHealth: "OPTIMAL"
  });

  const walkingLoopsRef = useRef({});
  const patrolTimeoutRef = useRef(null);

  // 1. Clock & Date Live Interval
  useEffect(() => {
    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentDateTime({
        timeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        dateNum: String(now.getDate()),
        monthShort: now.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        dayShort: now.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()
      });
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // 2. Real-Time Server Telemetry Fluctuation Interval
  useEffect(() => {
    const telemetryTimer = setInterval(() => {
      setServerTelemetry((prev) => {
        const gpuUsage = Math.floor(42 + Math.random() * 26);
        const gpuTemp = Math.floor(40 + (gpuUsage / 100) * 8);
        const cpuUsage = Math.floor(25 + Math.random() * 25);
        const cpuTemp = Math.floor(36 + (cpuUsage / 100) * 6);
        const ramGB = Number((14.2 + Math.random() * 2.2).toFixed(1));
        const ramPct = Math.round((ramGB / 32) * 100);
        return {
          gpuTemp,
          gpuUsage,
          ramUsageGB: ramGB,
          ramTotalGB: 32,
          ramUsagePct: ramPct,
          cpuUsage,
          cpuTemp,
          clusterHealth: "OPTIMAL"
        };
      });
    }, 2000);
    return () => clearInterval(telemetryTimer);
  }, []);

  const walkAgentAlongPath = (agentId, waypoints, delayMs = 0, onComplete = null) => {
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
          if (onComplete) onComplete();
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

  // Autonomous DevOps & Cloud Server Inspection Patrol Routine (Dax Mercer)
  useEffect(() => {
    if (meetingMode) {
      if (patrolTimeoutRef.current) clearTimeout(patrolTimeoutRef.current);
      return;
    }

    const runServerInspectionPatrol = () => {
      if (meetingMode) return;

      const daxDesk = FIXED_DESK_SEATS.dax || { x: 407, y: 500 };
      const gpuRackStop = { x: 580, y: 110 };
      const dbRackStop = { x: 790, y: 110 };
      const hvacStop = { x: 715, y: 165 };

      // Step 1: Dax leaves his desk and walks to GPU AI Cluster in Server Room
      setInternalSpeech((prev) => ({ ...prev, dax: "🔍 Heading to Server Room to check cluster..." }));
      const path1 = computePath(daxDesk, gpuRackStop);
      
      walkAgentAlongPath('dax', path1, 0, () => {
        // Arrived at GPU Rack
        setInternalSpeech((prev) => ({ ...prev, dax: "⚡ Checking GPU nodes: 42°C (Optimal)" }));
        
        // Step 2: Walk to Database / Network Rack
        patrolTimeoutRef.current = setTimeout(() => {
          if (meetingMode) return;
          setInternalSpeech((prev) => ({ ...prev, dax: "💾 Checking MongoDB NVMe shards..." }));
          const path2 = [{ x: 580, y: 110 }, { x: 715, y: 110 }, dbRackStop];
          
          walkAgentAlongPath('dax', path2, 0, () => {
            // Step 3: Walk to HVAC Cooling & UPS Power
            patrolTimeoutRef.current = setTimeout(() => {
              if (meetingMode) return;
              setInternalSpeech((prev) => ({ ...prev, dax: "❄️ HVAC 18°C active • UPS 240V 100%" }));
              const path3 = [{ x: 790, y: 110 }, { x: 790, y: 165 }, hvacStop];
              
              walkAgentAlongPath('dax', path3, 0, () => {
                // Step 4: Walk back to workstation desk
                patrolTimeoutRef.current = setTimeout(() => {
                  if (meetingMode) return;
                  setInternalSpeech((prev) => ({ ...prev, dax: "✅ All servers healthy! Returning to desk..." }));
                  const returnPath = computePath(hvacStop, daxDesk);
                  
                  walkAgentAlongPath('dax', returnPath, 0, () => {
                    setInternalSpeech((prev) => ({ ...prev, dax: "💼 Back at workstation • Uptime: 99.99%" }));
                    setTimeout(() => {
                      setInternalSpeech((prev) => {
                        const next = { ...prev };
                        delete next.dax;
                        return next;
                      });
                    }, 4000);
                  });
                }, 3500);
              });
            }, 3000);
          });
        }, 3000);
      });
    };

    // Occasional server inspection patrol (runs after 2 minutes, then every 3 minutes)
    const initialTimer = setTimeout(runServerInspectionPatrol, 120000);
    const recurringTimer = setInterval(runServerInspectionPatrol, 180000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringTimer);
      if (patrolTimeoutRef.current) clearTimeout(patrolTimeoutRef.current);
    };
  }, [meetingMode]);

  // Autonomous HR & People Ops Coffee & Wellness Care Patrol (Hannah Brooks)
  useEffect(() => {
    if (meetingMode) return;

    const runHRCoffeeAndWellnessPatrol = () => {
      if (meetingMode) return;

      const hannahDesk = FIXED_DESK_SEATS.hannah || { x: 524, y: 500 };
      const coffeeBar = { x: 830, y: 510 };
      const bossOfficeDoor = { x: 92, y: 140 };
      const centralFloor = { x: 290, y: 390 };

      // Step 1: Hannah leaves desk to brew fresh coffee at the kitchen counter
      setInternalSpeech((prev) => ({ ...prev, hannah: "☕ Brewing fresh espresso & herbal tea..." }));
      const pathToCoffee = computePath(hannahDesk, coffeeBar);

      walkAgentAlongPath('hannah', pathToCoffee, 0, () => {
        // Step 2: Walk to Marcus's office to report high team morale & payroll
        setTimeout(() => {
          if (meetingMode) return;
          setInternalSpeech((prev) => ({ ...prev, hannah: "📋 Marcus, team morale is 98% and payroll is ready!" }));
          const pathToMarcus = computePath(coffeeBar, bossOfficeDoor);

          walkAgentAlongPath('hannah', pathToMarcus, 0, () => {
            // Step 3: Walk to center floor to check on all desks
            setTimeout(() => {
              if (meetingMode) return;
              setInternalSpeech((prev) => ({ ...prev, hannah: "✨ Fresh coffee for everyone! How is your focus today?" }));
              const pathToCenter = computePath(bossOfficeDoor, centralFloor);

              walkAgentAlongPath('hannah', pathToCenter, 0, () => {
                // Step 4: Return to People Ops desk
                setTimeout(() => {
                  if (meetingMode) return;
                  setInternalSpeech((prev) => ({ ...prev, hannah: "💖 Back at HR desk • Reach out anytime for support!" }));
                  const returnPath = computePath(centralFloor, hannahDesk);

                  walkAgentAlongPath('hannah', returnPath, 0, () => {
                    setTimeout(() => {
                      setInternalSpeech((prev) => {
                        const next = { ...prev };
                        delete next.hannah;
                        return next;
                      });
                    }, 4000);
                  });
                }, 4000);
              });
            }, 4000);
          });
        }, 3500);
      });
    };

    // First wellness round after 25s, then every 90s
    const hrInitialTimer = setTimeout(runHRCoffeeAndWellnessPatrol, 25000);
    const hrRecurringTimer = setInterval(runHRCoffeeAndWellnessPatrol, 90000);

    return () => {
      clearTimeout(hrInitialTimer);
      clearInterval(hrRecurringTimer);
    };
  }, [meetingMode]);

  // Team standup & meeting movement
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

        {/* ========================================================================= */}
        {/* REAL-TIME WALL CLOCK (Current Hours & Minutes) */}
        {/* ========================================================================= */}
        {(() => {
          const hrAngle = ((currentDateTime.hours % 12) + currentDateTime.minutes / 60) * 30;
          const minAngle = (currentDateTime.minutes + currentDateTime.seconds / 60) * 6;
          const secAngle = currentDateTime.seconds * 6;
          const hx = 36 + 4.5 * Math.sin((hrAngle * Math.PI) / 180);
          const hy = 38 - 4.5 * Math.cos((hrAngle * Math.PI) / 180);
          const mx = 36 + 6.5 * Math.sin((minAngle * Math.PI) / 180);
          const my = 38 - 6.5 * Math.cos((minAngle * Math.PI) / 180);
          const sx = 36 + 7 * Math.sin((secAngle * Math.PI) / 180);
          const sy = 38 - 7 * Math.cos((secAngle * Math.PI) / 180);

          return (
            <g filter="url(#softShadow)">
              {/* Clock Dial */}
              <circle cx="36" cy="38" r="11" fill="#ffffff" stroke="#991b1b" strokeWidth="2.5" />
              {/* Center Pivot */}
              <circle cx="36" cy="38" r="1.5" fill="#0f172a" />
              {/* Hour Hand */}
              <line x1="36" y1="38" x2={hx} y2={hy} stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
              {/* Minute Hand */}
              <line x1="36" y1="38" x2={mx} y2={my} stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
              {/* Second Hand */}
              <line x1="36" y1="38" x2={sx} y2={sy} stroke="#ef4444" strokeWidth="0.8" strokeLinecap="round" />
              {/* Digital Time Badge Below Clock */}
              <rect x="21" y="52" width="30" height="9" fill="#0f172a" stroke="#475569" strokeWidth="1" rx="2" />
              <text x="36" y="58.5" fill="#38bdf8" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {currentDateTime.timeStr}
              </text>
            </g>
          );
        })()}

        {[60, 280, 420].map((wx, i) => (
          <g key={`win-${i}`} transform={`translate(${wx}, 26)`}>
            <rect x="0" y="0" width="40" height="22" fill="#dbeafe" stroke="#64748b" strokeWidth="2" />
            <line x1="20" y1="0" x2="20" y2="22" stroke="#64748b" strokeWidth="1.5" />
            <line x1="0" y1="11" x2="40" y2="11" stroke="#64748b" strokeWidth="1.5" />
          </g>
        ))}

        {/* ========================================================================= */}
        {/* REAL-TIME WALL CALENDAR (Current Month & Date) */}
        {/* ========================================================================= */}
        <g transform="translate(116, 24)" filter="url(#softShadow)">
          <rect x="0" y="0" width="34" height="32" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
          <rect x="0" y="0" width="34" height="9" fill="#dc2626" rx="2" />
          <text x="17" y="7" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            {currentDateTime.monthShort}
          </text>
          <text x="17" y="22" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            {currentDateTime.dateNum}
          </text>
          <text x="17" y="28.5" fill="#64748b" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            {currentDateTime.dayShort}
          </text>
        </g>

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
        {[300, 335, 370, 405, 435].map((cx, i) => (
          <rect key={`c-top-${i}`} x={cx - 10} y={64} width="20" height="16" rx="3" fill="#86198f" stroke="#4a044e" strokeWidth="2" filter="url(#softShadow)" />
        ))}
        {[300, 335, 370, 405, 435].map((cx, i) => (
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
        {/* ROOM 4: ⚡ AI SERVER FARM & MAINFRAME DATA CENTER (Top Right) */}
        {/* ========================================================================= */}
        {/* Water Cooler at extreme corner */}
        <g transform="translate(900, 22)" filter="url(#softShadow)">
          <circle cx="10" cy="10" r="9" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <rect x="2" y="18" width="16" height="24" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
        </g>

        {/* Server Bay Raised Tech Platform Floor */}
        <g filter="url(#softShadow)">
          {/* Base Platform */}
          <rect x="540" y="44" width="348" height="162" rx="5" fill="#0b1120" stroke="#1e293b" strokeWidth="3" />
          {/* Tech Grid Floor Pattern */}
          {[60, 90, 120, 150, 180].map((gy, i) => (
            <line key={`sg-h-${i}`} x1="544" y1={gy} x2="884" y2={gy} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          ))}
          {[580, 620, 660, 700, 740, 780, 820, 860].map((gx, i) => (
            <line key={`sg-v-${i}`} x1={gx} y1="48" x2={gx} y2="202" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          ))}

          {/* Glowing Fiber-Optic Floor Conduits / Bus Bars */}
          <path d="M 580 140 L 715 140 L 715 110" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.8" />
          <path d="M 850 140 L 715 140" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.8" />
          <path d="M 610 140 L 610 170 L 680 170" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" strokeDasharray="4 2" />
          <path d="M 750 140 L 750 170 L 680 170" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" strokeDasharray="4 2" />

          {/* ========================================================================= */}
          {/* PLATFORM HEADER: LIVE REAL-TIME TELEMETRY HUD */}
          {/* ========================================================================= */}
          <rect x="540" y="44" width="348" height="15" fill="#0f172a" rx="3" stroke="#1e293b" strokeWidth="1" />
          <text x="548" y="55" fill="#38bdf8" fontSize="6.2" fontWeight="bold" fontFamily="monospace">
            ⚡ GPU:{serverTelemetry.gpuTemp}°C ({serverTelemetry.gpuUsage}%)
          </text>
          <text x="646" y="55" fill="#10b981" fontSize="6.2" fontWeight="bold" fontFamily="monospace">
            💾 RAM:{serverTelemetry.ramUsageGB}G ({serverTelemetry.ramUsagePct}%)
          </text>
          <text x="752" y="55" fill="#f59e0b" fontSize="6.2" fontWeight="bold" fontFamily="monospace">
            🔥 CPU:{serverTelemetry.cpuUsage}% ({serverTelemetry.cpuTemp}°C)
          </text>
          <circle cx="875" cy="51.5" r="3" fill="#10b981" className="animate-led-fast" />
          <circle cx="865" cy="51.5" r="3" fill="#06b6d4" className="animate-led-slow" />
        </g>

        {/* 4 HIGH-DENSITY SERVER RACKS */}
        {[
          { x: 550, y: 62, name: "GPU-LLM 01", type: "AI INFERENCE", glow: "#06b6d4", stat: `${serverTelemetry.gpuTemp}°C`, usage: `${serverTelemetry.gpuUsage}%`, leds: ["#10b981", "#06b6d4", "#3b82f6", "#10b981"] },
          { x: 616, y: 62, name: "GPU-LLM 02", type: "VISION/VOICE", glow: "#3b82f6", stat: `${serverTelemetry.gpuTemp + 1}°C`, usage: `${Math.max(20, serverTelemetry.gpuUsage - 8)}%`, leds: ["#06b6d4", "#ec4899", "#10b981", "#f59e0b"] },
          { x: 756, y: 62, name: "DB-STORAGE", type: "MONGO/NVMe", glow: "#10b981", stat: `${serverTelemetry.ramUsageGB}GB`, usage: `${serverTelemetry.ramUsagePct}%`, leds: ["#10b981", "#10b981", "#f59e0b", "#10b981"] },
          { x: 822, y: 62, name: "GATEWAY-WS", type: "API & SWARM", glow: "#f59e0b", stat: `${serverTelemetry.cpuUsage}%`, usage: "10GbE", leds: ["#3b82f6", "#10b981", "#06b6d4", "#ec4899"] }
        ].map((rack, rIdx) => (
          <g key={`rack-${rIdx}`} transform={`translate(${rack.x}, ${rack.y})`} filter="url(#softShadow)">
            {/* Outer Rack Enclosure Chassis */}
            <rect x="0" y="0" width="58" height="74" fill="#090d16" stroke="#334155" strokeWidth="2" rx="2" />
            <rect x="3" y="3" width="52" height="68" fill="#111827" rx="1" />

            {/* Top Ventilation Fan Vents */}
            <rect x="6" y="5" width="46" height="7" fill="#1e293b" rx="1" />
            {[10, 20, 30, 40].map((vx, vi) => (
              <circle key={`fan-${vi}`} cx={vx + 4} cy="8.5" r="2.2" fill="#0f172a" stroke={rack.glow} strokeWidth="0.8" />
            ))}

            {/* 4 Server Blade Trays (U-Slots) */}
            {[15, 29, 43, 57].map((by, bIdx) => (
              <g key={`blade-${bIdx}`} transform={`translate(5, ${by})`}>
                <rect x="0" y="0" width="48" height="11" fill="#1e293b" stroke="#0f172a" strokeWidth="1" rx="1" />
                
                {/* Drive Bay Slots */}
                <rect x="3" y="2" width="6" height="7" fill="#0f172a" />
                <rect x="11" y="2" width="6" height="7" fill="#0f172a" />
                <rect x="19" y="2" width="6" height="7" fill="#0f172a" />
                
                {/* Latch Handles */}
                <line x1="4" y1="5.5" x2="8" y2="5.5" stroke="#64748b" strokeWidth="1" />
                <line x1="12" y1="5.5" x2="16" y2="5.5" stroke="#64748b" strokeWidth="1" />

                {/* Activity Blinking LEDs */}
                <circle cx="30" cy="5.5" r="1.8" fill={rack.leds[(bIdx + 0) % 4]} className={bIdx % 2 === 0 ? "animate-led-fast" : "animate-led-slow"} />
                <circle cx="36" cy="5.5" r="1.8" fill={rack.leds[(bIdx + 1) % 4]} className={bIdx % 2 === 1 ? "animate-led-fast" : "animate-led-slow"} />
                <circle cx="42" cy="5.5" r="1.8" fill={rack.leds[(bIdx + 2) % 4]} className="animate-led-slow" />
              </g>
            ))}

            {/* Bottom Live Rack Stats Overlay */}
            <rect x="6" y="66" width="46" height="4.5" fill="#030712" rx="1" />
            <text x="29" y="69.5" fill={rack.glow} fontSize="3.8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {rack.stat} • {rack.usage}
            </text>
          </g>
        ))}

        {/* CENTRAL NOC MONITORING TERMINAL & DIAGNOSTIC CONSOLE */}
        <g transform="translate(680, 62)" filter="url(#softShadow)">
          {/* Desk Base */}
          <rect x="0" y="0" width="70" height="42" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="2" />
          <rect x="3" y="3" width="64" height="36" fill="#0f172a" rx="1" />

          {/* Left CRT Monitor (Live Green CPU Telemetry) */}
          <rect x="6" y="6" width="26" height="18" fill="#022c22" stroke="#10b981" strokeWidth="1.5" rx="1" />
          {/* Waveform / Terminal Scanlines */}
          <path d="M 8 15 L 12 15 L 14 10 L 17 20 L 19 13 L 22 17 L 25 15 L 29 15" fill="none" stroke="#22c55e" strokeWidth="1" />
          <text x="19" y="11" fill="#4ade80" fontSize="3.8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            CPU: {serverTelemetry.cpuUsage}%
          </text>
          <text x="19" y="21.5" fill="#86efac" fontSize="3.2" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            TEMP: {serverTelemetry.cpuTemp}°C
          </text>

          {/* Right LCD Monitor (Live RAM & GPU Meters) */}
          <rect x="37" y="6" width="26" height="18" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" rx="1" />
          {/* Dynamic RAM Usage Bar */}
          <rect x="40" y="8" width="20" height="3.5" fill="#0c4a6e" rx="0.5" />
          <rect x="40" y="8" width={Math.min(20, (serverTelemetry.ramUsagePct / 100) * 20)} height="3.5" fill="#38bdf8" rx="0.5" />
          <text x="50" y="15" fill="#7dd3fc" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            RAM: {serverTelemetry.ramUsagePct}%
          </text>
          <text x="50" y="21.5" fill="#38bdf8" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            GPU: {serverTelemetry.gpuTemp}°C
          </text>
          <circle cx="59" cy="8" r="1.2" fill="#f59e0b" className="animate-led-fast" />

          {/* Keyboard & Trackpad */}
          <rect x="22" y="27" width="26" height="9" fill="#334155" stroke="#64748b" strokeWidth="0.8" rx="1" />
          <line x1="25" y1="30" x2="45" y2="30" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="1.5 1" />
          <line x1="25" y1="33" x2="45" y2="33" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="1.5 1" />

          {/* Admin Ergonomic Stool / Chair */}
          <circle cx="35" cy="50" r="7.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="35" cy="50" r="3.5" fill="#1e293b" />
        </g>

        {/* INDUSTRIAL HVAC PRECISION SERVER COOLER (Bottom Center) */}
        <g transform="translate(680, 145)" filter="url(#softShadow)">
          <rect x="0" y="0" width="70" height="48" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" rx="2" />
          <rect x="3" y="3" width="64" height="42" fill="#0f172a" rx="1" />
          
          {/* Cool Air Ventilation Grates */}
          <rect x="6" y="6" width="58" height="22" fill="#0284c7" stroke="#0369a1" strokeWidth="1" rx="1" />
          {[10, 14, 18, 22].map((ly, li) => (
            <line key={`hvac-l-${li}`} x1="8" y1={ly} x2="62" y2={ly} stroke="#e0f2fe" strokeWidth="1" opacity="0.85" />
          ))}

          {/* Digital Temp & Status Display */}
          <rect x="6" y="32" width="30" height="10" fill="#022c22" stroke="#15803d" strokeWidth="1" />
          <text x="21" y="40" fill="#4ade80" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            18°C ❄️
          </text>
          
          <rect x="40" y="32" width="24" height="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <text x="52" y="39" fill="#38bdf8" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            HVAC ON
          </text>
        </g>

        {/* HIGH-VOLTAGE UPS BATTERY BACKUP & POWER DISTRIBUTION (Bottom Left) */}
        <g transform="translate(550, 145)" filter="url(#softShadow)">
          <rect x="0" y="0" width="58" height="48" fill="#1e293b" stroke="#eab308" strokeWidth="1.8" rx="2" />
          <rect x="3" y="3" width="52" height="42" fill="#0f172a" rx="1" />
          
          <text x="29" y="13" fill="#facc15" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            ⚡ 240V UPS
          </text>

          {/* Battery Charge Gauge Bars */}
          {[18, 24, 30, 36].map((by, bi) => (
            <g key={`ups-bar-${bi}`} transform={`translate(8, ${by})`}>
              <rect x="0" y="0" width="42" height="4.5" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <rect x="1" y="1" width={bi === 0 ? "30" : "40"} height="2.5" fill={bi === 3 ? "#ef4444" : (bi === 2 ? "#eab308" : "#22c55e")} />
            </g>
          ))}
          <circle cx="48" cy="11" r="2" fill="#22c55e" className="animate-led-fast" />
        </g>

        {/* FIBER PATCH PANEL & NETWORK SWITCH (Bottom Right) */}
        <g transform="translate(822, 145)" filter="url(#softShadow)">
          <rect x="0" y="0" width="58" height="48" fill="#1e293b" stroke="#a855f7" strokeWidth="1.8" rx="2" />
          <rect x="3" y="3" width="52" height="42" fill="#0f172a" rx="1" />
          
          <text x="29" y="13" fill="#c084fc" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            🌐 10GbE FIBER
          </text>

          {/* 16-Port RJ45/Fiber Grid with status LEDs */}
          <rect x="6" y="18" width="46" height="23" fill="#111827" stroke="#374151" strokeWidth="1" />
          {[0, 1, 2, 3].map((row) => (
            <g key={`port-row-${row}`}>
              {[0, 1, 2, 3].map((col) => (
                <g key={`port-${row}-${col}`} transform={`translate(${10 + col * 10}, ${21 + row * 5})`}>
                  <rect x="0" y="0" width="6" height="3.5" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" />
                  <circle cx="7" cy="1.7" r="0.8" fill={col % 2 === 0 ? "#10b981" : "#06b6d4"} className="animate-led-fast" />
                </g>
              ))}
            </g>
          ))}
        </g>

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
          const speech = activeSpeech[ag.id] || internalSpeech[ag.id];

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
                    (ag.id === 'dax' ? '#083344' :
                    (ag.id === 'hannah' ? '#9a3412' :
                    (ag.id === 'julian' ? '#0f172a' : '#d97706'))))))
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
          <span>{currentDateTime.timeStr}</span>
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-700 font-bold flex items-center gap-1 text-[11px]">
          🏢 MUNDER DIFFLIN • {agents.length} AGENTS ACTIVE
        </span>
      </div>
    </div>
  );
}
