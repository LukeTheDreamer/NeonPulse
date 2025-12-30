document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE MANAGEMENT ---
    const state = {
        credits: 9000,
        isSimRunning: false
    };

    // --- DOM ELEMENTS ---
    const ui = {
        creditDisplay: document.getElementById('credit-display'),
        btnLaunch: document.getElementById('btn-launch'),
        supplyButtons: document.querySelectorAll('.btn--supply'),
        toastContainer: document.getElementById('toast-container')
    };

    // --- INITIALIZATION ---
    function init() {
        console.log("%c NEON PULSE SYSTEM ONLINE ", "background: #00ffff; color: #000; font-weight: bold; padding: 2px;");
        attachEventListeners();
    }

    function attachEventListeners() {
        // Launch Button
        if (ui.btnLaunch) {
            ui.btnLaunch.addEventListener('click', handleLaunchSim);
        }

        // Supply Depot Buttons
        ui.supplyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => handleSupplyAction(e.currentTarget));
        });
    }

    // --- LOGIC HANDLERS ---

    function handleLaunchSim() {
        if (state.isSimRunning) return;

        state.isSimRunning = true;
        const originalText = ui.btnLaunch.innerText;
        
        // UI Feedback
        ui.btnLaunch.innerText = "INITIALIZING...";
        ui.btnLaunch.style.background = "var(--neon-pink)";
        ui.btnLaunch.style.color = "black";
        ui.btnLaunch.disabled = true;

        showToast("Neural Link Established. Handshaking...", "normal");

        // Simulate async operation
        setTimeout(() => {
            showToast("SIMULATION LAUNCHED: NEON STORM", "success");
            
            // Reset UI
            ui.btnLaunch.innerText = originalText;
            ui.btnLaunch.style.background = "";
            ui.btnLaunch.style.color = "";
            ui.btnLaunch.disabled = false;
            state.isSimRunning = false;
        }, 2000);
    }

    function handleSupplyAction(btn) {
        const action = btn.dataset.action;

        if (action === 'add-credits') {
            const amount = parseInt(btn.dataset.amount);
            addCredits(amount);
            showToast(`Transaction Verified: +${amount} Credits`, "success");
        } 
        else if (action === 'buy-item') {
            const item = btn.dataset.item;
            showToast(`Purchase Successful: ${item}`, "success");
        } 
        else if (action === 'donate') {
            showToast("Donation received. Reputation increased.", "warn");
        }
    }

    function addCredits(amount) {
        const start = state.credits;
        const end = start + amount;
        state.credits = end;
        animateValue(ui.creditDisplay, start, end, 800);
    }

    // --- UTILITIES ---

    // Number counting animation
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Format with commas
            obj.innerText = Math.floor(progress * (end - start) + start).toLocaleString();
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Custom Toast Notification
    function showToast(message, type = 'normal') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        // Add icon based on type
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warn') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        ui.toastContainer.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // Start System
    init();
});