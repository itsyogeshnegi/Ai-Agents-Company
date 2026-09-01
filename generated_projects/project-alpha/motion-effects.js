Here is the production-ready implementation of `motion-effects.js`. I have structured this as a modular Class to ensure it doesn't pollute the global namespace and can be initialized easily.

### 1. The CSS Framework (`motion-styles.css`)
Add these to your stylesheet to handle the hardware acceleration and base states.

:root {
    --transition-smooth: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    --transition-spring: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: var(--transition-smooth);
    will-change: transform, opacity;
}

.reveal.active {
    opacity: 1;
    transform: translateY(0);
}

.magnetic-wrap {
    display: inline-block;
    transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

.theme-transitioning {
    transition: background-color 0.8s ease, color 0.8s ease !important;
}

.modal-spring {
    transform: scale(0.9) opacity(0);
    transition: var(--transition-spring);
}

.modal-spring.open {
    transform: scale(1) opacity(1);
}

### 2. The Logic (`motion-effects.js`)

/**
 * motion-effects.js
 * Creative Motion & Interaction Layer for Hotel Website
 * Designed by Elena Rostova
 */

class HotelMotionEngine {
    constructor() {
        this.init();
    }

    init() {
        this.initRevealOnScroll();
        this.initMagneticButtons();
        this.initParticleField();
        this.initModalDynamics();
        this.initThemeToggle();
        
        // Optimization: Listen for resize to recalculate positions if necessary
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Smooth Reveal on Scroll
     * Uses IntersectionObserver for high performance
     */
    initRevealOnScroll() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Once revealed, we can stop observing this element
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    /**
     * Magnetic Button Interaction
     * Attracts the button slightly toward the cursor for a tactile feel
     */
    initMagneticButtons() {
        const magnets = document.querySelectorAll('.magnetic-wrap');
        
        magnets.forEach(magnet => {
            magnet.addEventListener('mousemove', (e) => {
                const rect = magnet.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const moveX = (e.clientX - centerX) * 0.4; // Strength factor
                const moveY = (e.clientY - centerY) * 0.4;
                
                magnet.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });

            magnet.addEventListener('mouseleave', () => {
                magnet.style.transform = `translate(0px, 0px)`;
            });
        });
    }

    /**
     * Floating Particle Effects
     * Creates subtle atmospheric floating elements (e.g., for Hero sections)
     */
    initParticleField() {
        const container = document.querySelector('.particle-container');
        if (!container) return;

        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'hotel-particle';
            
            // Randomize position and animation delay
            const size = Math.random() * 4 + 2 + 'px';
            particle.style.width = size;
            particle.style.height = size;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 5 + 's';
            particle.style.opacity = Math.random() * 0.5;

            container.appendChild(particle);
        }
    }

    /**
     * Modal Spring Dynamics
     * Handles the entrance and exit of booking modals
     */
    initModalDynamics() {
        const modal = document.querySelector('.modal-spring');
        const trigger = document.querySelector('.open-booking');
        const close = document.querySelector('.close-modal');

        if (!modal || !trigger) return;

        trigger.addEventListener('click', () => {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden'; // Prevent scroll
        });

        close.addEventListener('click', () => {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    /**
     * Theme Toggling Animations
     * Smooth transition between Day and Night modes
     */
    initThemeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', () => {
            document.body.classList.add('theme-transitioning');
            
            // Toggle theme class
            document.body.classList.toggle('dark-mode');
            
            // Remove transition class after animation completes to maintain performance
            setTimeout(() => {
                document.body.classList.remove('theme-transitioning');
            }, 800);
        });
    }

    handleResize() {
        // Reset animations or recalculate if layout shifts drastically
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    window.HotelMotion = new HotelMotionEngine();
});

### 3. Supplementary Particle CSS
Add this to your CSS to enable the floating particle movement.

.particle-container {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 1;
}

.hotel-particle {
    position: absolute;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    animation: float-particle 10s infinite ease-in-out;
}

@keyframes float-particle {
    0%, 100% { transform: translateY(0) translateX(0); }
    33% { transform: translateY(-20px) translateX(10px); }
    66% { transform: translateY(-10px) translateX(-10px); }
}