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
  const recentEatersRef = useRef([]);

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
      const coffeeBar = { x: 765, y: 338 };
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

  // Autonomous Cafe Dining & Coffee Break Routine (1-2 Idle Agents visit the Cafe)
  useEffect(() => {
    if (meetingMode) return;

    const diningSpots = [
      { name: "Round Bistro Table", coord: { x: 746, y: 385 }, speech: "🥪 Enjoying a sandwich at the bistro table!" },
      { name: "Communal Dining Bar", coord: { x: 865, y: 385 }, speech: "🍱 Eating lunch & chatting at the dining bar!" },
      { name: "Cafe Booth Sofa", coord: { x: 855, y: 500 }, speech: "☕ Relaxing with coffee in the lounge booth!" },
      { name: "Espresso Counter", coord: { x: 730, y: 338 }, speech: "🥐 Tasting fresh pastries from the cafe bar!" }
    ];

    const departurePhrases = [
      "🥪 Grabbing a quick lunch at the cafe!",
      "☕ Heading to the cafe for an espresso break...",
      "🥗 Time for a healthy lunch break!",
      "🥐 Picking up a fresh snack from the cafe"
    ];

    const returnPhrases = [
      "💼 Back at workstation, recharged & ready!",
      "⚡ Great lunch! Resuming sprint standby.",
      "✨ Refreshed after a delicious cafe break!"
    ];

    const runDiningBreakRoutine = () => {
      if (meetingMode) return;

      // Filter idle agents sitting in open office (exclude Marcus who stays in boss office)
      const availableCandidates = agents.filter(
        (ag) => ag.id !== 'marcus' && ag.status === 'idle' && !isWalking[ag.id]
      );

      if (availableCandidates.length === 0) return;

      // Prioritize employees who have NOT visited the cafe recently
      let eligible = availableCandidates.filter((ag) => !recentEatersRef.current.includes(ag.id));
      if (eligible.length < 2) {
        // Reset recent history once all/most available employees have had their turn
        recentEatersRef.current = [];
        eligible = availableCandidates;
      }

      // Randomly choose 1 or 2 idle agents from the eligible non-recent pool
      const countToPick = Math.min(eligible.length, Math.random() > 0.35 ? 2 : 1);
      const shuffled = [...eligible].sort(() => 0.5 - Math.random());
      const selectedEaters = shuffled.slice(0, countToPick);

      // Track visited employees so others get their turn next
      recentEatersRef.current.push(...selectedEaters.map((e) => e.id));
      if (recentEatersRef.current.length > 8) {
        recentEatersRef.current = recentEatersRef.current.slice(-5);
      }

      selectedEaters.forEach((eater, idx) => {
        const spot = diningSpots[(idx + Math.floor(Math.random() * diningSpots.length)) % diningSpots.length];
        const departureMsg = departurePhrases[Math.floor(Math.random() * departurePhrases.length)];
        const returnMsg = returnPhrases[Math.floor(Math.random() * returnPhrases.length)];
        const eaterDesk = FIXED_DESK_SEATS[eater.id] || { x: 290, y: 330 };

        // Step 1: Depart desk for the cafe
        setInternalSpeech((prev) => ({ ...prev, [eater.id]: departureMsg }));
        const pathToCafe = computePath(eaterDesk, spot.coord);

        walkAgentAlongPath(eater.id, pathToCafe, idx * 800, () => {
          // Arrived at Cafe: Eat / Drink & Chat
          setInternalSpeech((prev) => ({ ...prev, [eater.id]: spot.speech }));

          setTimeout(() => {
            if (meetingMode) return;
            // Step 2: Return to workstation desk
            setInternalSpeech((prev) => ({ ...prev, [eater.id]: returnMsg }));
            const returnPath = computePath(spot.coord, eaterDesk);

            walkAgentAlongPath(eater.id, returnPath, 0, () => {
              setTimeout(() => {
                setInternalSpeech((prev) => {
                  const next = { ...prev };
                  delete next[eater.id];
                  return next;
                });
              }, 4000);
            });
          }, 14000); // 14 seconds dining time
        });
      });
    };

    // First lunch round after 16s, then repeats every 48s
    const diningInitialTimer = setTimeout(runDiningBreakRoutine, 16000);
    const diningRecurringTimer = setInterval(runDiningBreakRoutine, 48000);

    return () => {
      clearTimeout(diningInitialTimer);
      clearInterval(diningRecurringTimer);
    };
  }, [meetingMode, agents]);

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
        {/* ROOM 2: 🤝 MINIMAL LIGHT-THEME CONFERENCE & SPRINT ROOM (Top Center) */}
        {/* ========================================================================= */}
        <rect x="245" y="18" width="280" height="190" fill="none" stroke="#ffffff" strokeWidth="8" />
        <rect x="249" y="22" width="272" height="182" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="365" y="195" width="40" height="18" fill="#b9ccbf" />

        {/* Natural mint tile floor seamlessly connects through the room */}

        {/* Left Daylight Window */}
        <g transform="translate(266, 24)" filter="url(#softShadow)">
          <rect x="0" y="0" width="38" height="18" fill="#e0f2fe" stroke="#94a3b8" strokeWidth="1.5" rx="1" />
          <line x1="19" y1="0" x2="19" y2="18" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="9" x2="38" y2="9" stroke="#94a3b8" strokeWidth="1" />
        </g>

        {/* Minimal Frameless 4K Smart Presentation Display (Top Center Wall) */}
        <g transform="translate(318, 24)" filter="url(#softShadow)">
          <rect x="0" y="0" width="134" height="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" rx="3" />
          <rect x="3" y="3" width="128" height="14" fill="#f8fafc" rx="1" />
          <circle cx="12" cy="10" r="2.5" fill="#10b981" />
          <text x="68" y="13.5" fill="#1e293b" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            📊 SPRINT PLANNING & ARCHITECTURE
          </text>
        </g>

        {/* Right Daylight Window */}
        <g transform="translate(466, 24)" filter="url(#softShadow)">
          <rect x="0" y="0" width="38" height="18" fill="#e0f2fe" stroke="#94a3b8" strokeWidth="1.5" rx="1" />
          <line x1="19" y1="0" x2="19" y2="18" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="9" x2="38" y2="9" stroke="#94a3b8" strokeWidth="1" />
        </g>

        {/* Minimal Frameless Glass Whiteboard (Left Wall) */}
        <g transform="translate(254, 52)" filter="url(#softShadow)">
          <rect x="0" y="0" width="11" height="42" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" rx="1" opacity="0.95" />
          <rect x="2" y="4" width="7" height="7" fill="#fef08a" stroke="#facc15" strokeWidth="0.5" />
          <rect x="2" y="13" width="7" height="7" fill="#fbcfe8" stroke="#f472b6" strokeWidth="0.5" />
          <rect x="2" y="22" width="7" height="7" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.5" />
          <rect x="2" y="31" width="7" height="7" fill="#bbf7d0" stroke="#4ade80" strokeWidth="0.5" />
        </g>

        {/* Minimal Plant (Bottom Right Corner) */}
        <g transform="translate(492, 155)" filter="url(#softShadow)">
          <rect x="0" y="10" width="16" height="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" rx="3" />
          <circle cx="8" cy="5" r="9" fill="#16a34a" stroke="#15803d" strokeWidth="1" />
          <circle cx="8" cy="5" r="5" fill="#22c55e" />
        </g>

        {/* Minimal Natural Light Blonde Oak Conference Table */}
        <g transform="translate(275, 76)" filter="url(#softShadow)">
          {/* Table Outer Blonde Oak Frame */}
          <rect x="0" y="0" width="180" height="70" rx="12" fill="#f5ede2" stroke="#d5c4af" strokeWidth="2" />
          <rect x="4" y="4" width="172" height="62" rx="10" fill="#faf6f0" />

          {/* Minimalist Recessed White Aluminum Center Hub */}
          <rect x="22" y="16" width="136" height="38" rx="5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          
          {/* Center Connectivity Ports */}
          <rect x="74" y="24" width="32" height="14" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" rx="1" />
          <circle cx="82" cy="31" r="1.5" fill="#10b981" />
          <circle cx="90" cy="31" r="1.5" fill="#3b82f6" />
          <circle cx="98" cy="31" r="1.5" fill="#f59e0b" />

          {/* Small Center Ceramic Flowerpot */}
          <circle cx="56" cy="35" r="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          <circle cx="56" cy="35" r="1.8" fill="#16a34a" />

          {/* Minimal Laptops & White Ceramic Coffee Cups */}
          <rect x="30" y="20" width="12" height="9" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" rx="1" />
          <circle cx="33" cy="33" r="2.2" fill="#ffffff" stroke="#b45309" strokeWidth="0.8" />
          
          <rect x="138" y="20" width="12" height="9" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" rx="1" />
          <circle cx="147" cy="33" r="2.2" fill="#ffffff" stroke="#b45309" strokeWidth="0.8" />
        </g>

        {/* Minimal Light Ergonomic Swivel Chairs */}
        {/* Top 5 Chairs */}
        {[300, 335, 370, 405, 435].map((cx, i) => (
          <g key={`exec-top-${i}`} transform={`translate(${cx - 10}, 56)`} filter="url(#softShadow)">
            <rect x="0" y="0" width="20" height="18" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="3" y="3" width="14" height="12" rx="2" fill="#e2e8f0" />
            <line x1="0" y1="9" x2="20" y2="9" stroke="#cbd5e1" strokeWidth="1" />
          </g>
        ))}
        {/* Bottom 5 Chairs */}
        {[300, 335, 370, 405, 435].map((cx, i) => (
          <g key={`exec-bot-${i}`} transform={`translate(${cx - 10}, 148)`} filter="url(#softShadow)">
            <rect x="0" y="0" width="20" height="18" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
            <rect x="3" y="3" width="14" height="12" rx="2" fill="#e2e8f0" />
            <line x1="0" y1="9" x2="20" y2="9" stroke="#cbd5e1" strokeWidth="1" />
          </g>
        ))}
        {/* Left Head Chair (Marcus Director Seat) */}
        <g transform="translate(250, 101)" filter="url(#softShadow)">
          <rect x="0" y="0" width="18" height="20" rx="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.8" />
          <rect x="3" y="3" width="12" height="14" rx="2" fill="#fef3c7" />
        </g>
        {/* Right Foot Chair */}
        <g transform="translate(462, 101)" filter="url(#softShadow)">
          <rect x="0" y="0" width="18" height="20" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="3" y="3" width="12" height="14" rx="2" fill="#e2e8f0" />
        </g>

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
        {/* ROOM 5: ☕ ARTISAN CAFE & DINING LOUNGE (Bottom Right Quadrant) */}
        {/* ========================================================================= */}
        <g filter="url(#softShadow)">
          {/* Cafe Terrazzo / Oak Floor Rug */}
          <rect x="685" y="260" width="255" height="315" rx="6" fill="#fdfbf7" stroke="#e2d6c5" strokeWidth="2.5" />

          {/* Top Cafe Header Marquee */}
          <rect x="695" y="265" width="235" height="15" fill="#1c1917" rx="3" />
          <text x="812" y="275.5" fill="#f59e0b" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace" letterSpacing="0.5">
            ☕ ARTISAN CAFE & DINING LOUNGE
          </text>

          {/* ----------------------------------------------------------------------- */}
          {/* 1. ESPRESSO COFFEE BAR & SMART BEVERAGE HUB */}
          {/* ----------------------------------------------------------------------- */}
          {/* Espresso Bar Counter */}
          <g transform="translate(698, 286)">
            {/* Marble Counter Base */}
            <rect x="0" y="0" width="130" height="42" fill="#e7e5e4" stroke="#78716c" strokeWidth="1.8" rx="2" />
            <rect x="2" y="2" width="126" height="38" fill="#d6d3d1" rx="1" />
            
            {/* 2-Group Espresso Machine */}
            <rect x="6" y="5" width="30" height="24" fill="#0f172a" stroke="#334155" strokeWidth="1.2" rx="1" />
            <rect x="8" y="7" width="26" height="8" fill="#1e293b" />
            <circle cx="13" cy="11" r="2" fill="#ef4444" />
            <circle cx="19" cy="11" r="2" fill="#22c55e" />
            <circle cx="25" cy="11" r="2" fill="#38bdf8" />
            {/* Portafilters & Steam Wand */}
            <line x1="14" y1="15" x2="14" y2="24" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="22" y1="15" x2="22" y2="24" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="14" cy="25" r="2" fill="#ffffff" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="22" cy="25" r="2" fill="#ffffff" stroke="#78350f" strokeWidth="0.8" />

            {/* Coffee Bean Grinder */}
            <rect x="40" y="7" width="12" height="20" fill="#1c1917" stroke="#44403c" strokeWidth="1" rx="1" />
            <circle cx="46" cy="11" r="4.5" fill="#78350f" stroke="#451a03" strokeWidth="1" />

            {/* Glass Pastry Display Case with Croissants */}
            <rect x="58" y="5" width="34" height="24" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1" rx="1" opacity="0.9" />
            <rect x="61" y="9" width="8" height="6" fill="#d97706" rx="2" />
            <rect x="71" y="9" width="8" height="6" fill="#b45309" rx="2" />
            <rect x="81" y="9" width="8" height="6" fill="#ec4899" rx="3" />
            <rect x="66" y="19" width="18" height="5" fill="#ca8a04" rx="1" />

            {/* Bar Sink with Chrome Faucet */}
            <rect x="98" y="7" width="18" height="18" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" rx="1" />
            <rect x="101" y="10" width="12" height="12" fill="#94a3b8" rx="1" />
            <path d="M 107 7 L 107 4 L 110 4 L 110 8" fill="none" stroke="#475569" strokeWidth="1.5" />

            {/* Bar Counter Front Wood Slats */}
            <rect x="4" y="32" width="122" height="6" fill="#78350f" rx="1" />
          </g>

          {/* Smart Glass-Door Cold Beverage Cooler */}
          <g transform="translate(838, 286)">
            <rect x="0" y="0" width="92" height="42" fill="#0f172a" stroke="#047857" strokeWidth="1.8" rx="2" />
            <rect x="3" y="3" width="86" height="36" fill="#022c22" rx="1" />
            
            {/* 3 Drink Shelves */}
            {[7, 18, 29].map((sy, sIdx) => (
              <g key={`drink-shelf-${sIdx}`}>
                <line x1="5" y1={sy + 7} x2="87" y2={sy + 7} stroke="#065f46" strokeWidth="1" />
                {/* Cold Cans & Bottles */}
                {[9, 19, 29, 39, 49, 59, 69, 77].map((bx, bIdx) => (
                  <rect
                    key={`can-${sIdx}-${bIdx}`}
                    x={bx}
                    y={sy}
                    width="5.5"
                    height="6.5"
                    rx="1"
                    fill={bIdx % 4 === 0 ? "#ef4444" : (bIdx % 4 === 1 ? "#38bdf8" : (bIdx % 4 === 2 ? "#10b981" : "#f59e0b"))}
                  />
                ))}
              </g>
            ))}
            <text x="46" y="37" fill="#34d399" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              4°C 🧊 COLD BEVERAGES
            </text>
          </g>

          {/* ----------------------------------------------------------------------- */}
          {/* 2. DINING SECTION: TABLES & SEATING */}
          {/* ----------------------------------------------------------------------- */}
          
          {/* DINING TABLE 1: Round Scandinavian Oak Bistro Table */}
          <g transform="translate(746, 385)">
            {/* 4 Padded Chairs */}
            <rect x="-8" y="-28" width="16" height="12" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" rx="2" />
            <rect x="-8" y="16" width="16" height="12" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" rx="2" />
            <rect x="-28" y="-8" width="12" height="16" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" rx="2" />
            <rect x="16" y="-8" width="12" height="16" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" rx="2" />

            {/* Circular Table Top */}
            <circle cx="0" cy="0" r="19" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
            <circle cx="0" cy="0" r="16" fill="#d97706" />

            {/* Tabletop Props: Ceramic Vase & Coffee Cup */}
            <circle cx="0" cy="0" r="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="#16a34a" />
            <circle cx="-7" cy="-5" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="6" cy="6" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
          </g>

          {/* DINING TABLE 2: High-Top Communal Dining Bar */}
          <g transform="translate(805, 362)">
            {/* 6 Bar Stools */}
            {[18, 48, 78, 106].map((sx, i) => (
              <g key={`stool-top-${i}`}>
                <circle cx={sx} cy="-8" r="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                <circle cx={sx} cy="-8" r="2.5" fill="#38bdf8" />
                <circle cx={sx} cy="52" r="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                <circle cx={sx} cy="52" r="2.5" fill="#38bdf8" />
              </g>
            ))}

            {/* Rectangular Table Body */}
            <rect x="0" y="0" width="125" height="44" fill="#d97706" stroke="#78350f" strokeWidth="2.2" rx="3" />
            <rect x="4" y="4" width="117" height="36" fill="#b45309" rx="2" />
            {/* Center Table Runner */}
            <rect x="10" y="16" width="105" height="12" fill="#fef3c7" rx="1" />
            
            {/* Tabletop Items: Condiments, Water Pitcher, Plates */}
            <rect x="22" y="18" width="12" height="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" rx="1" />
            <circle cx="48" cy="22" r="3.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
            <rect x="68" y="18" width="14" height="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" rx="1" />
            <circle cx="98" cy="22" r="3" fill="#ffffff" stroke="#64748b" strokeWidth="0.8" />
          </g>

          {/* ----------------------------------------------------------------------- */}
          {/* 3. CASUAL BOOTH & COFFEE LOUNGE */}
          {/* ----------------------------------------------------------------------- */}
          
          {/* DINING TABLE 3: Intimate Bistro Corner Table */}
          <g transform="translate(746, 495)">
            <circle cx="-16" cy="0" r="6" fill="#d946ef" stroke="#a21caf" strokeWidth="1.5" />
            <circle cx="16" cy="0" r="6" fill="#d946ef" stroke="#a21caf" strokeWidth="1.5" />
            <circle cx="0" cy="18" r="6" fill="#d946ef" stroke="#a21caf" strokeWidth="1.5" />

            <circle cx="0" cy="0" r="17" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
            <circle cx="0" cy="0" r="14" fill="#e2e8f0" />
            {/* Laptop / Notebook & Tea */}
            <rect x="-6" y="-5" width="12" height="9" fill="#0f172a" rx="1" />
            <circle cx="5" cy="5" r="2.5" fill="#10b981" stroke="#047857" strokeWidth="0.8" />
          </g>

          {/* DINING SECTION 4: Sage Green Upholstered Cafe Booth */}
          <g transform="translate(805, 465)">
            {/* L-Shaped / Bench Sofa Cushion */}
            <rect x="0" y="0" width="125" height="85" fill="#166534" stroke="#14532d" strokeWidth="2.5" rx="4" />
            <rect x="6" y="6" width="113" height="20" fill="#15803d" rx="2" />
            {/* Throw Pillows */}
            <rect x="12" y="9" width="14" height="14" fill="#ca8a04" rx="2" />
            <rect x="36" y="9" width="14" height="14" fill="#d97706" rx="2" />
            <rect x="74" y="9" width="14" height="14" fill="#ca8a04" rx="2" />
            <rect x="98" y="9" width="14" height="14" fill="#d97706" rx="2" />

            {/* Dining Table inside Booth */}
            <rect x="12" y="32" width="101" height="34" fill="#f59e0b" stroke="#92400e" strokeWidth="2" rx="3" />
            <rect x="16" y="36" width="93" height="26" fill="#d97706" rx="1" />
            
            {/* Dining Table Items: Ceramic Plates, Coffee Mugs, Napkins */}
            <circle cx="32" cy="49" r="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="32" cy="49" r="2" fill="#b45309" />
            <circle cx="62" cy="49" r="4" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
            <circle cx="92" cy="49" r="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="92" cy="49" r="2" fill="#15803d" />

            {/* Bottom Chairs */}
            <circle cx="32" cy="74" r="5.5" fill="#166534" stroke="#14532d" strokeWidth="1.2" />
            <circle cx="62" cy="74" r="5.5" fill="#166534" stroke="#14532d" strokeWidth="1.2" />
            <circle cx="92" cy="74" r="5.5" fill="#166534" stroke="#14532d" strokeWidth="1.2" />
          </g>

          {/* ----------------------------------------------------------------------- */}
          {/* 4. ECO RECYCLING STATION & GREENERY */}
          {/* ----------------------------------------------------------------------- */}
          {/* Waste / Recycling Sorting Station */}
          <g transform="translate(696, 435)">
            <rect x="0" y="0" width="26" height="34" fill="#334155" stroke="#1e293b" strokeWidth="1.2" rx="2" />
            <circle cx="13" cy="8" r="3" fill="#22c55e" />
            <circle cx="13" cy="17" r="3" fill="#38bdf8" />
            <circle cx="13" cy="26" r="3" fill="#f59e0b" />
          </g>

          {/* Large Indoor Potted Ficus Plant */}
          <g transform="translate(696, 532)">
            <rect x="2" y="14" width="18" height="20" fill="#b45309" stroke="#78350f" strokeWidth="1.5" rx="2" />
            <circle cx="11" cy="8" r="10" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
            <circle cx="11" cy="8" r="6" fill="#22c55e" />
          </g>
        </g>

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
