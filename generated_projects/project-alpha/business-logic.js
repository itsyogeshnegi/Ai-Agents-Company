/**
 * business-logic.js
 * Core Domain Business Logic & State Machine Engine
 * Architect: Ethan Vance, Principal Logic & Systems Architect
 */

"use strict";

/**
 * STATE MACHINE CONFIGURATION
 * Defines the valid lifecycles of a Todo entity.
 * Prevents illegal transitions (e.g., an Archived task cannot move directly to InProgress).
 */
const TodoState = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED',
};

const StateTransitions = {
    [TodoState.PENDING]: [TodoState.IN_PROGRESS, TodoState.ARCHIVED],
    [TodoState.IN_PROGRESS]: [TodoState.COMPLETED, TodoState.PENDING, TodoState.ARCHIVED],
    [TodoState.COMPLETED]: [TodoState.PENDING, TodoState.ARCHIVED],
    [TodoState.ARCHIVED]: [TodoState.PENDING], // Recovery path
};

/**
 * DOMAIN MODELS
 */
class TodoItem {
    constructor({ id, title, description = '', priority = 1, dueDate = null }) {
        this.validate(title, priority);
        
        this.id = id || crypto.randomUUID();
        this.title = title;
        this.description = description;
        this.priority = priority; // 1 (Low) to 5 (Critical)
        this.dueDate = dueDate ? new Date(dueDate) : null;
        this.state = TodoState.PENDING;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    validate(title, priority) {
        if (!title || typeof title !== 'string' || title.trim().length < 3) {
            throw new Error("DomainValidationError: Title must be a string of at least 3 characters.");
        }
        if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
            throw new Error("DomainValidationError: Priority must be an integer between 1 and 5.");
        }
    }

    updateTimestamp() {
        this.updatedAt = new Date();
    }
}

/**
 * CORE ENGINE
 * Handles state orchestration, filtering, and optimization algorithms.
 */
class TodoEngine {
    constructor() {
        this.store = new Map();
    }

    /**
     * Transactional Creation
     */
    createTodo(payload) {
        try {
            const item = new TodoItem(payload);
            this.store.set(item.id, item);
            return item;
        } catch (e) {
            return { error: e.message };
        }
    }

    /**
     * State Machine Transition Logic
     * Ensures the entity moves through the lifecycle according to business rules.
     */
    transitionState(id, newState) {
        const item = this.store.get(id);
        if (!item) throw new Error("EntityNotFoundError: Todo item not found.");

        const allowedTransitions = StateTransitions[item.state];
        
        if (!allowedTransitions.includes(newState)) {
            throw new Error(`IllegalStateTransition: Cannot move from ${item.state} to ${newState}`);
        }

        item.state = newState;
        item.updateTimestamp();
        return item;
    }

    /**
     * Optimization Algorithm: Weighted Priority Sorting
     * Ranks tasks based on a combination of Priority (Weight: 0.7) 
     * and Urgency/Due Date (Weight: 0.3).
     */
    getOptimizedQueue() {
        const now = new Date().getTime();
        const items = Array.from(this.store.values())
            .filter(item => item.state !== TodoState.ARCHIVED && item.state !== TodoState.COMPLETED);

        return items.sort((a, b) => {
            // Priority Score (Normalized 1-5)
            const priorityA = a.priority * 0.7;
            const priorityB = b.priority * 0.7;

            // Urgency Score (Inverse of time remaining)
            let urgencyA = 0;
            let urgencyB = 0;

            if (a.dueDate) {
                const diffA = a.dueDate.getTime() - now;
                urgencyA = diffA < 0 ? 1 : 1 / (diffA / (1000 * 60 * 60 * 24) + 1);
            }
            if (b.dueDate) {
                const diffB = b.dueDate.getTime() - now;
                urgencyB = diffB < 0 ? 1 : 1 / (diffB / (1000 * 60 * 60 * 24) + 1);
            }

            const scoreA = priorityA + (urgencyA * 0.3);
            const scoreB = priorityB + (urgencyB * 0.3);

            return scoreB - scoreA; // Descending
        });
    }

    /**
     * Data Retrieval & Projection
     */
    getTasksByState(state) {
        return Array.from(this.store.values()).filter(t => t.state === state);
    }

    deleteTodo(id) {
        if (!this.store.has(id)) return false;
        this.store.delete(id);
        return true;
    }

    /**
     * Bulk update for productivity analytics
     */
    getCompletionRate() {
        const all = Array.from(this.store.values());
        if (all.length === 0) return 0;
        const completed = all.filter(t => t.state === TodoState.COMPLETED).length;
        return (completed / all.length) * 100;
    }
}

// Export as a singleton for system-wide state consistency
export const Engine = new TodoEngine();
export { TodoState };