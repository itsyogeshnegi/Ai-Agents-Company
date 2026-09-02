/**
 * @typedef {'X' | 'O' | null} CellValue
 * @typedef {'ACTIVE' | 'DRAW' | 'WON'} GameStatus
 * @typedef {'X' | 'O' | null} Winner
 * 
 * @typedef {Object} GameState
 * @property {CellValue[]} board - Flat array of 9 cells
 * @property { 'X' | 'O' } currentPlayer - The player whose turn it is
 * @property {GameStatus} status - Current status of the game
 * @property {Winner} winner - The winning player if status is 'WON'
 * @property {number[] | null} winningLine - The indices of the winning combination
 */

/**
 * TicTacToeEngine: A deterministic state machine for Tic Tac Toe logic.
 * Follows SOLID principles and ensures immutable state transitions.
 */
export const TicTacToeEngine = (() => {
  const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6],            // Diagonals
  ];

  /**
   * Generates the initial game state.
   * @returns {GameState}
   */
  const createInitialState = () => ({
    board: Array(9).fill(null),
    currentPlayer: 'X',
    status: 'ACTIVE',
    winner: null,
    winningLine: null,
  });

  /**
   * Validates if a move is legal.
   * @param {GameState} state 
   * @param {number} index 
   * @returns {{isValid: boolean, error: string | null}}
   */
  const validateMove = (state, index) => {
    if (index < 0 || index > 8) {
      return { isValid: false, error: 'Index out of bounds.' };
    }
    if (state.status !== 'ACTIVE') {
      return { isValid: false, error: 'Game has already ended.' };
    }
    if (state.board[index] !== null) {
      return { isValid: false, error: 'Cell is already occupied.' };
    }
    return { isValid: true, error: null };
  };

  /**
   * Internal helper to check for win conditions.
   * @param {CellValue[]} board 
   * @returns {{winner: Winner, line: number[] | null}}
   */
  const calculateWinner = (board) => {
    for (const combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: combination };
      }
    }
    return { winner: null, line: null };
  };

  /**
   * Processes a move and returns the next state of the machine.
   * @param {GameState} state 
   * @param {number} index 
   * @returns {{nextState: GameState, error: string | null}}
   */
  const makeMove = (state, index) => {
    const validation = validateMove(state, index);
    if (!validation.isValid) {
      return { nextState: state, error: validation.error };
    }

    // Create immutable copy of board
    const newBoard = [...state.board];
    newBoard[index] = state.currentPlayer;

    const { winner, line } = calculateWinner(newBoard);
    const isDraw = !winner && newBoard.every((cell) => cell !== null);

    if (winner) {
      return {
        nextState: {
          ...state,
          board: newBoard,
          status: 'WON',
          winner: winner,
          winningLine: line,
        },
        error: null,
      };
    }

    if (isDraw) {
      return {
        nextState: {
          ...state,
          board: newBoard,
          status: 'DRAW',
          winner: null,
          winningLine: null,
        },
        error: null,
      };
    }

    return {
      nextState: {
        ...state,
        board: newBoard,
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
        status: 'ACTIVE',
        winner: null,
        winningLine: null,
      },
      error: null,
    };
  };

  /**
   * Resets the game state.
   * @returns {GameState}
   */
  const resetGame = () => createInitialState();

  return {
    createInitialState,
    makeMove,
    resetGame,
    validateMove,
  };
})();