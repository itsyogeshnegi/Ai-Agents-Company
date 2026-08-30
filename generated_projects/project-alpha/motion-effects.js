Hello. I'm Elena. To turn a standard Todo list into a high-end interactive experience, we need to move away from linear transitions. I've implemented **Cubic-Bezier curves** for organic movement and **Spring-based physics** for the UI elements.

Below is the complete `motion-effects.js` and the accompanying CSS dynamics.

### 1. The Motion CSS (Styles)
Add this to your stylesheet. I've defined "Motion Tokens" as CSS variables so you can tweak the "feel" globally.

:root {
    /* Motion Tokens */
    --ease-out-expo = cubic-bezier(0.19, 1, 0.22, 1);
    --ease-in-out-back = cubic-bezier(0.68, -0.55, 0.27, 1.55);
    --spring-bounce = cubic-bezier(0.34, 1.56, 0.64, 1);
    --transition-fast = 200ms var(--ease-out-expo);
    --transition-medium = 400ms var(--ease-out-expo);
    --transition-slow = 600ms var(--ease-out-expo);
}

/* Task Item Entry Animation */
.todo-item {
    transition: transform var(--transition-medium), opacity var(--transition-medium), box-shadow var(--transition-fast);
    animation: slideIn 0.5s var(--ease-out-expo) backwards;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Interaction States */
.todo-item:hover {
    transform: translateX(5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

.todo-item.completed {
    opacity: 0.6;
    transform: scale(0.98);
    transition: all var(--transition-fast);
}

/* Button Micro-interactions */
.btn-interactive {
    transition: transform var(--transition-fast), filter var(--transition-fast);
}

.btn-interactive:active {
    transform: scale(0.92);
    filter: brightness(0.9);
}

/* Modal Spring Dynamics */
.modal-overlay {
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-medium);
}

.modal-content {
    transform: scale(0.8) translateY(30px);
    transition: transform var(--transition-medium) var(--spring-bounce);
}

.modal-open .modal-overlay {
    opacity: 1;
    pointer-events: all;
}

.modal-open .modal-content {
    transform: scale(1) translateY(0);
}

/* Particle Canvas */
#motion-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
}

### 2. The Logic (`motion-effects.js`)

/**
 * motion-effects.js
 * Developed by Elena Rostova
 * Interaction & Motion Layer for Todo Application
 */

const MotionEffects = (() => {
    // Configuration
    const CONFIG = {
        particles: {
            count: 20,
            color: 'rgba(100, 149, 237, 0.15)',
            speed: 0.5
        },
        staggerDelay: 0.05
    };

    let canvas, ctx, particles = [];

    /**
     * Initialize all motion layers
     */
    const init = () => {
        setupCanvas();
        setupInteractions();
        animate();
        console.log("✨ Motion Layer Active: Elena Rostova");
    };

    /**
     * Ambient Particle System
     * Creates a subtle floating depth effect in the background
     */
    const setupCanvas = () => {
        canvas = document.createElement('canvas');
        canvas.id = 'motion-canvas';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        for (let i = 0; i < CONFIG.particles.count; i++) {
            particles.push(new Particle());
        }
    };

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 4 + 1;
            this.speedX = (Math.random() - 0.5) * CONFIG.particles.speed;
            this.speedY = (Math.random() - 0.5) * CONFIG.particles.speed;
            this.opacity = Math.random() * 0.5;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.particles.color);
            ctx.fill();
        }
    }

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    };

    /**
     * Interaction Logic
     */
    const setupInteractions = () => {
        // 1. Staggered List Reveal
        // Call this whenever the task list is rendered
        window.revealTodoList = (items) => {
            items.forEach((item, index) => {
                item.style.animationDelay = `${index * CONFIG.staggerDelay}s`;
            });
        };

        // 2. Smooth Modal Toggle
        const modal = document.querySelector('.modal-overlay');
        const trigger = document.querySelector('.add-task-btn');
        
        if (trigger && modal) {
            trigger.addEventListener('click', () => {
                document.body.classList.add('modal-open');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) document.body.classList.remove('modal-open');
            });
        }

        // 3. Theme Toggle Transition
        const themeToggle = document.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.style.transition = 'background-color 0.5s var(--ease-out-expo)';
                document.body.classList.toggle('dark-mode');
            });
        }
    };

    return { init };
})();

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', MotionEffects.init);

### How to integrate:
1. **HTML**: Ensure your "Add Task" button has the class `.add-task-btn` and the modal has the `.modal-overlay` and `.modal-content` structure.
2. **Implementation**: In your main `app.js`, whenever you add a new todo item to the DOM, simply call:
   `MotionEffects.revealTodoList(allTodoElements);`
3. **Experience**: The user will feel a "springy" response when opening modals and a fluid, staggered arrival of tasks, making the productivity tool feel lightweight and modern.