/**
 * NEURAL LINK HUB - Core Controller
 * Handles: Auth, Neon DB Sync, and Stripe Checkout
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const creditDisplay = document.getElementById('user-credits');
    const tierDisplay = document.getElementById('user-tier');
    const authBtn = document.getElementById('auth-btn');
    const buyButtons = document.querySelectorAll('.buy-btn');

    // 1. INITIALIZE SYSTEM
    initHub();

    async function initHub() {
        console.log(">> Initializing Neural Link...");
        await fetchUserData();
    }

    // 2. FETCH USER DATA (Netlify Function + Neon DB)
    async function fetchUserData() {
        try {
            // In a real app, you'd pass a JWT or UserID here
            const response = await fetch('/.netlify/functions/get-user-data');
            const data = await response.json();

            if (data) {
                creditDisplay.innerText = data.credits.toFixed(2);
                tierDisplay.innerText = data.tier.toUpperCase();
                
                if (data.tier === 'premium') {
                    tierDisplay.style.color = 'var(--gold-leaf)';
                    tierDisplay.style.textShadow = '0 0 10px var(--gold-leaf)';
                }
            }
        } catch (err) {
            console.error(">> Link Failure: Could not sync with Neon DB", err);
            creditDisplay.innerText = "OFFLINE";
        }
    }

    // 3. STRIPE CHECKOUT LOGIC
    buyButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const priceId = e.target.getAttribute('data-price-id');
            
            // Visual feedback
            e.target.innerText = "ENCRYPTING...";
            e.target.disabled = true;

            try {
                const response = await fetch('/.netlify/functions/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ priceId })
                });

                const session = await response.json();

                if (session.url) {
                    // Redirect to Stripe's hosted checkout page
                    window.location.href = session.url;
                } else {
                    throw new Error("Session URL missing");
                }
            } catch (err) {
                console.error(">> Transaction Aborted:", err);
                alert("Neural Link Interrupted: Payment portal unavailable.");
                e.target.innerText = "RETRY";
                e.target.disabled = false;
            }
        });
    });

    // 4. AUTH SIMULATION
    authBtn.addEventListener('click', () => {
        // Toggle simulated auth state
        const status = document.getElementById('connection-status');
        if (status.innerText === 'ACTIVE') {
            status.innerText = 'SYNCING...';
            status.style.color = 'var(--neon-pink)';
            setTimeout(() => {
                status.innerText = 'LINKED';
                status.style.color = 'var(--neon-teal)';
                authBtn.innerText = 'DISCONNECT';
            }, 1500);
        } else {
            status.innerText = 'ACTIVE';
            authBtn.innerText = 'SYNC IDENTITY';
        }
    });
});