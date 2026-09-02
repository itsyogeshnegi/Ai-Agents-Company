/**
 * motion-effects.js | Tic Tac Toe Interactive Engine
 * Engineer: Elena Rostova
 * Focus: 60fps Micro-interactions, Spring Physics, & Hardware Acceleration
 */

const MotionEngine = (() => {
    const CONFIG = {
        springStiffness: 0.4,
        springDamping: 0.7,
        colors: {
            accentX: '#00f2ff',
            accentO: '#ff007a',
            bg: '#0a0a0c',
            glass: 'rgba(255, 255, 255, 0.03)'
        }
    };

    const setupStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --bg: ${CONFIG.colors.bg};
                --glass: ${CONFIG.colors.glass};
                --accent-x: ${CONFIG.colors.accentX};
                --accent-o: ${CONFIG.colors.accentO};
            }
            body { 
                background: var(--bg); 
                color: white; 
                font-family: 'Inter', system-ui, sans-serif; 
                margin: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                overflow: hidden; 
            }
            .game-container {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2rem;
                perspective: 1000px;
            }
            .status {
                font-size: 1.5rem;
                font-weight: 300;
                letter-spacing: 2px;
                text-transform: uppercase;
                opacity: 0;
                transform: translateY(-20px);
                animation: slideDown 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(3, 100px);
                grid-template-rows: repeat(3, 100px);
                gap: 12px;
                padding: 12px;
                background: var(--glass);
                backdrop-filter: blur(10px);
                border-radius: 24px;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                transform: scale(0.9);
                opacity: 0;
                animation: popIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .cell {
                width: 100px;
                height: 100px;
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 3rem;
                font-weight: 800;
                transition: background 0.3s ease, transform 0.1s ease;
                will-change: transform, background;
                position: relative;
                overflow: hidden;
                user-select: none;
            }
            .cell:hover {
                background: rgba(255,255,255,0.1);
                transform: translateY(-2px);
            }
            .cell:active {
                transform: scale(0.95);
            }
            .cell.x { color: var(--accent-x); text-shadow: 0 0 15px var(--accent-x); }
            .cell.o { color: var(--accent-o); text-shadow: 0 0 15px var(--accent-o); }
            
            .symbol-anim {
                animation: symbolSpring 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            
            .win-line {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                pointer-events: none;
                z-index: 10;
            }
            .win-path {
                stroke-dasharray: 1000;
                stroke-dashoffset: 1000;
                animation: drawLine 0.6s ease-out forwards;
                stroke-width: 8;
                stroke-linecap: round;
                filter: blur(1px);
            }

            @keyframes slideDown { to { opacity: 1; transform: translateY(0); } }
            @keyframes popIn { to { opacity: 1; transform: scale(1); } }
            @keyframes symbolSpring { 
                0% { transform: scale(0) rotate(-45deg); opacity: 0; }
                100% { transform: scale(1) rotate(0); opacity: 1; }
            }
            @keyframes drawLine { to { stroke-dashoffset: 0; } }

            .reset-btn {
                margin-top: 2rem;
                padding: 12px 24px;
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 50px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .reset-btn:hover {
                background: white;
                color: black;
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(255,255,255,0.2);
            }
        `;
        document.head.appendChild(style);
    };

    const createGame = () => {
        const container = document.createElement('div');
        container.className = 'game-container';
        
        const status = document.createElement('div');
        status.className = 'status';
        status.innerText = "Player X's Turn";
        
        const grid = document.createElement('div');
        grid.className = 'grid';
        
        const winSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        winSvg.setAttribute('class', 'win-line');
        winSvg.setAttribute('viewBox', '0 0 324 324'); // Grid size approx
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('class', 'win-path');
        path.setAttribute('fill', 'none');
        winSvg.appendChild(path);
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'reset-btn';
        resetBtn.innerText = 'Reset Experience';

        container.append(status, grid, winSvg, resetBtn);
        document.body.appendChild(container);

        return { status, grid, path, resetBtn, winSvg };
    };

    const LogicEngine = (() => {
        let board = Array(9).fill(null);
        let currentPlayer = 'X';
        let gameActive = true;

        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diags
        ];

        return {
            checkWin: () => {
                for (let cond of winConditions) {
                    const [a, b, c] = cond;
                    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                        return { winner: board[a], line: cond };
                    }
                }
                if (!board.includes(null)) return { winner: 'Draw' };
                return null;
            },
            makeMove: (index) => {
                if (board[index] || !gameActive) return null;
                board[index] = currentPlayer;
                return currentPlayer;
            },
            togglePlayer: () => {
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                return currentPlayer;
            },
            reset: () => {
                board.fill(null);
                currentPlayer = 'X';
                gameActive = true;
                return currentPlayer;
            },
            setInactive: () => { gameActive = false; }
        };
    })();

    const init = () => {
        setupStyles();
        const { status, grid, path, resetBtn, winSvg } = createGame();
        
        const cells = [];
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            
            cell.addEventListener('click', (e) => {
                const move = LogicEngine.makeMove(i);
                if (!move) return;

                // Visual Update
                cell.innerHTML = `<span class="symbol-anim">${move}</span>`;
                cell.classList.add(move.toLowerCase());

                // Ripple Effect
                const ripple = document.createElement('div');
                ripple.className = 'ripple'; 
                // Simplified ripple logic via CSS if added, or JS:
                cell.style.backgroundColor = 'rgba(255,255,255,0.2)';
                setTimeout(() => cell.style.backgroundColor = '', 200);

                const result = LogicEngine.checkWin();
                if (result) {
                    LogicEngine.setInactive();
                    if (result.winner === 'Draw') {
                        status.innerText = "It's a Kinetic Tie";
                    } else {
                        status.innerText = `${result.winner} Dominates`;
                        drawWinLine(result.line, path);
                    }
                } else {
                    const next = LogicEngine.togglePlayer();
                    status.innerText = `Player ${next}'s Turn`;
                }
            });
            
            grid.appendChild(cell);
            cells.push(cell);
        }

        const drawWinLine = (line, pathElement) => {
            const coords = line.map(idx => {
                const cell = cells[idx];
                const rect = cell.getBoundingClientRect();
                const gridRect = grid.getBoundingClientRect();
                return {
                    x: rect.left - gridRect.left + rect.width / 2,
                    y: rect.top - gridRect.top + rect.height / 2
                };
            });

            const d = `M ${coords[0].x} ${coords[0].y} L ${coords[2].x} ${coords[2].y}`;
            pathElement.setAttribute('d', d);
            pathElement.setAttribute('stroke', LogicEngine.board[line[0]] === 'X' ? CONFIG.colors.accentX : CONFIG.colors.accentO);
        };

        resetBtn.addEventListener('click', () => {
            const next = LogicEngine.reset();
            status.innerText = `Player ${next}'s Turn`;
            cells.forEach(c => {
                c.innerHTML = '';
                c.className = 'cell';
            });
            path.setAttribute('d', '');
        });
    };

    return { init };
})();

// Execute
window.addEventListener('DOMContentLoaded', () => MotionEngine.init());