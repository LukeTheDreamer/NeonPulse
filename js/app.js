document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. STATE MANAGEMENT
    // =========================================
    const state = {
        credits: 9000,
        isSimRunning: false,
        gameLoopId: null
    };

    // =========================================
    // 2. DOM ELEMENT REFERENCES
    // =========================================
    const ui = {
        // Dashboard Elements
        creditDisplay: document.getElementById('credit-display'),
        btnLaunch: document.getElementById('btn-launch'),
        supplyButtons: document.querySelectorAll('.btn--supply'),
        toastContainer: document.getElementById('toast-container'),
        
        // Views
        dashboardView: document.getElementById('dashboard-view'),
        gameView: document.getElementById('game-view'),
        
        // Game Elements
        btnExit: document.getElementById('btn-exit-game'),
        canvas: document.getElementById('game-canvas')
    };

    // =========================================
    // 3. GAME ENGINE VARIABLES
    // =========================================
    const game = {
        ctx: ui.canvas.getContext('2d'),
        width: 0,
        height: 0,
        player: { 
            x: 0, 
            y: 0, 
            size: 20, 
            speed: 5,
            color: '#00ffff'
        },
        keys: { 
            ArrowUp: false, 
            ArrowDown: false, 
            ArrowLeft: false, 
            ArrowRight: false 
        },
        particles: []
    };

    // =========================================
    // 4. INITIALIZATION
    // =========================================
    function init() {
        console.log("%c NEON PULSE SYSTEM ONLINE ", "background: #00ffff; color: #000; font-weight: bold; padding: 2px;");
        attachEventListeners();
        setupInputHandlers();
    }

    function attachEventListeners() {
        // Dashboard Interactions
        if (ui.btnLaunch) {
            ui.btnLaunch.addEventListener('click', handleLaunchSim);
        }
        
        // Supply Depot Interactions
        ui.supplyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => handleSupplyAction(e.currentTarget));
        });

        // Game Interactions
        if (ui.btnExit) {
            ui.btnExit.addEventListener('click', stopGame);
        }
    }

    function setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            if(game.keys.hasOwnProperty(e.code)) game.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            if(game.keys.hasOwnProperty(e.code)) game.keys[e.code] = false;
        });
    }

    // =========================================
    // 5. VIEW LOGIC (SWITCHING)
    // =========================================

    function handleLaunchSim() {
        if (state.isSimRunning) return;

        // Visual Feedback on Button
        const originalText = ui.btnLaunch.innerText;
        ui.btnLaunch.innerText = "INITIALIZING...";
        ui.btnLaunch.style.background = "var(--neon-pink)";
        ui.btnLaunch.style.color = "black";
        ui.btnLaunch.disabled = true;

        showToast("Neural Link Established. Loading Engine...", "normal");

        // Simulate Loading Delay
        setTimeout(() => {
            // Reset Button State
            ui.btnLaunch.innerText = originalText;
            ui.btnLaunch.style.background = "";
            ui.btnLaunch.style.color = "";
            ui.btnLaunch.disabled = false;

            // Switch Views
            ui.dashboardView.classList.add('hidden');
            ui.gameView.classList.remove('hidden');
            
            // Start Game Engine
            startGame();
        }, 1500);
    }

    function stopGame() {
        state.isSimRunning = false;
        cancelAnimationFrame(state.gameLoopId);
        
        // Switch Views Back
        ui.gameView.classList.add('hidden');
        ui.dashboardView.classList.remove('hidden');
        
        showToast("Simulation Aborted.", "warn");
    }

    // =========================================
    // 6. GAME LOOP & RENDERING
    // =========================================

    function startGame() {
        state.isSimRunning = true;
        showToast("SIMULATION ACTIVE: PILOT MANUAL CONTROL", "success");

        // Resize Canvas to fit the container dynamically
        game.width = ui.canvas.clientWidth;
        game.height = ui.canvas.clientHeight;
        ui.canvas.width = game.width;
        ui.canvas.height = game.height;

        // Center Player
        game.player.x = game.width / 2;
        game.player.y = game.height / 2;

        // Start Loop
        gameLoop();
    }

    function gameLoop() {
        if (!state.isSimRunning) return;

        // 1. Clear Screen with slight opacity for trail effect
        game.ctx.fillStyle = 'rgba(10, 10, 18, 0.3)'; 
        game.ctx.fillRect(0, 0, game.width, game.height);

        // 2. Update Physics
        updatePlayerPosition();
        updateParticles();

        // 3. Draw Elements
        drawPlayer();

        // 4. Request Next Frame
        state.gameLoopId = requestAnimationFrame(gameLoop);
    }

    function updatePlayerPosition() {
        const p = game.player;
        // Basic movement with boundary checking
        if (game.keys.ArrowUp && p.y > 0) p.y -= p.speed;
        if (game.keys.ArrowDown && p.y < game.height) p.y += p.speed;
        if (game.keys.ArrowLeft && p.x > 0) p.x -= p.speed;
        if (game.keys.ArrowRight && p.x < game.width) p.x += p.speed;

        // Emit particles while moving
        if (game.keys.ArrowUp || game.keys.ArrowDown || game.keys.ArrowLeft || game.keys.ArrowRight) {
            createParticle(p.x, p.y + 10);
        }
    }

    function drawPlayer() {
        const ctx = game.ctx;
        const x = game.player.x;
        const y = game.player.y;

        ctx.save();
        ctx.translate(x, y);
        
        // Draw Triangle Ship
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(10, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(-10, 10);
        ctx.closePath();

        ctx.strokeStyle = game.player.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#000'; // Inner black
        ctx.fill();
        
        // Neon Glow Effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = game.player.color;
        ctx.stroke();

        ctx.restore();
    }

    // --- Particle System ---
    function createParticle(x, y) {
        // Throttling: don't create particle every single frame
        if (Math.random() > 0.4) return; 

        game.particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2, // Falling down (exhaust)
            life: 1.0,
            color: Math.random() > 0.5 ? '#ff00ff' : '#00ffff'
        });
    }

    function updateParticles() {
        for (let i = game.particles.length - 1; i >= 0; i--) {
            let p = game.particles[i];
            
            p.life -= 0.04; // Fade out speed
            p.x += p.vx;
            p.y += p.vy;

            if (p.life <= 0) {
                game.particles.splice(i, 1);
            } else {
                game.ctx.globalAlpha = p.life;
                game.ctx.fillStyle = p.color;
                game.ctx.beginPath();
                game.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                game.ctx.fill();
                game.ctx.globalAlpha = 1.0;
            }
        }
    }

    // =========================================
    // 7. UI LOGIC (SUPPLY & CREDITS)
    // =========================================

    function handleSupplyAction(btn) {
        const action = btn.dataset.action;

        if (action === 'add-credits') {
            const amount = parseInt(btn.dataset.amount);
            addCredits(amount);
            showToast(`Transaction Verified: +${amount.toLocaleString()} Credits`, "success");
        } 
        else if (action === 'buy-item') {
            const item = btn.dataset.item;
            showToast(`Purchase Successful: ${item}`, "success");
        } 
        else if (action === 'donate') {
            showToast("Donation received. Reputation increased.", "warn"); // Warn color looks gold-ish
        }
    }

    function addCredits(amount) {
        const start = state.credits;
        const end = start + amount;
        state.credits = end;
        animateValue(ui.creditDisplay, start, end, 800);
    }

    // Animate number counting up
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Easing function for smoother stop could be added here
            obj.innerText = Math.floor(progress * (end - start) + start).toLocaleString();
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // =========================================
    // 8. TOAST NOTIFICATION SYSTEM
    // =========================================
    function showToast(message, type = 'normal') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        // Select Icon
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warn') icon = '👑';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        ui.toastContainer.appendChild(toast);

        // Remove automatically after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // Start the System
    init();
});