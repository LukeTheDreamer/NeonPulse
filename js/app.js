const { useState, useEffect } = React;

// Link to the game component defined in neonstorm.js
const NeonStormGame = window.NeonStormGame;

// ==========================================
// 1. CONFIG & CONSTANTS
// ==========================================
const STORE_ITEMS = {
    CREDITS_5000: { id: "credits_5000", type: "credits", amount: 5000, price: 5, label: "5,000 CREDITS", icon: "💎", color: "text-cyan-400" },
    CREDITS_15000: { id: "credits_15000", type: "credits", amount: 15000, price: 12, label: "15,000 CREDITS", icon: "💎", color: "text-purple-400" },
    CREDITS_50000: { id: "credits_50000", type: "credits", amount: 50000, price: 35, label: "50,000 CREDITS", icon: "💎", color: "text-yellow-400" },
    TIER_1: { id: "tier_1", type: "tier", tier: 1, price: 30, label: "INITIATE TIER", icon: "🔸", color: "text-orange-500" },
    TIER_2: { id: "tier_2", type: "tier", tier: 2, price: 90, label: "VETERAN TIER", icon: "🔷", color: "text-gray-400" },
    TIER_3: { id: "tier_3", type: "tier", tier: 3, price: 500, label: "LEGEND TIER", icon: "👑", color: "text-yellow-500" }
};

// ==========================================
// 2. COMPONENT: NAV BAR (With Badges)
// ==========================================
const NavBar = ({ user, onLogout, onOpenStore }) => {
    const getTierBadge = (tier) => {
        switch (tier) {
            case 3: return <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[10px] font-black px-2 py-0.5 clip-cyber-btn shadow-[0_0_10px_rgba(250,204,21,0.5)]">LEGEND</span>;
            case 2: return <span className="bg-gradient-to-r from-gray-300 to-gray-500 text-black text-[10px] font-black px-2 py-0.5 clip-cyber-btn">VETERAN</span>;
            case 1: return <span className="bg-gradient-to-r from-orange-400 to-orange-700 text-black text-[10px] font-black px-2 py-0.5 clip-cyber-btn">INITIATE</span>;
            default: return null;
        }
    };

    return (
        <nav className="flex justify-between items-center px-8 py-6 sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = "/"}>
                <div className="w-8 h-8 bg-cyan-400 clip-cyber-btn animate-pulse"></div>
                <div className="font-orbitron font-black text-2xl tracking-widest text-white group-hover:text-cyan-400 transition-colors uppercase">
                    Neon<span className="text-pink-500">Pulse</span>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                {user ? (
                    <>
                        <div className="flex flex-col items-end mr-4">
                            <div className="flex items-center gap-2">
                                {getTierBadge(user.supporter_tier)}
                                <div className="text-cyan-400 font-bold font-orbitron tracking-widest text-sm uppercase">
                                    {user.email.split('@')[0]}
                                </div>
                            </div>
                            <div className="text-yellow-400 font-mono text-xs">
                                <span className="opacity-50">CR:</span> {user.credits?.toLocaleString()}
                            </div>
                        </div>
                        <button onClick={onOpenStore} className="px-6 py-2 border border-yellow-400/30 text-yellow-400 font-bold hover:bg-yellow-400 hover:text-black transition-all clip-cyber-btn text-lg uppercase italic">
                            $ Store
                        </button>
                        <button onClick={onLogout} className="px-4 py-2 border border-red-500/30 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all clip-cyber-btn text-xs uppercase">
                            Logout
                        </button>
                    </>
                ) : (
                    <button onClick={() => netlifyIdentity.open()} className="px-8 py-3 bg-cyan-400 text-black font-black hover:bg-white transition-all clip-cyber-btn text-lg uppercase italic">
                        Initialize Identity
                    </button>
                )}
            </div>
        </nav>
    );
};

// ==========================================
// 3. COMPONENT: STORE MODAL
// ==========================================
const CyberStore = ({ onClose, user }) => {
    const [loadingItem, setLoadingItem] = useState(null);
    const [donationAmount, setDonationAmount] = useState(10);

    const initiateCheckout = async (itemConfig) => {
        if (!user) return netlifyIdentity.open();
        setLoadingItem(itemConfig.id);

        try {
            const response = await fetch('/.netlify/functions/create_checkout', {
                method: 'POST',
                body: JSON.stringify({
                    type: itemConfig.type,
                    amount: itemConfig.amount || donationAmount,
                    tier: itemConfig.tier || null,
                    userId: user.id
                })
            });
            const { url } = await response.json();
            if (url) window.location.href = url;
        } catch (err) {
            alert("Secure Link Failure: " + err.message);
            setLoadingItem(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
            <div className="max-w-5xl w-full bg-black border border-cyan-400 p-8 clip-cyber relative my-8">
                <button onClick={onClose} className="absolute top-4 right-4 text-pink-500 font-bold hover:text-white uppercase">[X] Close</button>
                <h2 className="text-4xl font-orbitron font-black text-white mb-8 text-center uppercase italic">System <span className="text-yellow-400">Market</span></h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.values(STORE_ITEMS).map(item => (
                        <div key={item.id} className="bg-gray-900/50 p-6 border border-white/10 hover:border-cyan-400 transition-all flex flex-col items-center">
                            <div className="text-4xl mb-4">{item.icon}</div>
                            <h3 className={`font-bold mb-1 ${item.color}`}>{item.label}</h3>
                            <p className="text-xs text-gray-500 mb-6 font-mono">${item.price}.00 USD</p>
                            <button 
                                onClick={() => initiateCheckout(item)} 
                                disabled={!!loadingItem}
                                className="w-full py-2 bg-white text-black font-black uppercase clip-cyber-btn hover:bg-cyan-400 transition-colors"
                            >
                                {loadingItem === item.id ? "SYNCING..." : "PURCHASE"}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Direct Donation Section */}
                <div className="mt-8 p-6 border border-pink-500/20 bg-pink-500/5 clip-cyber flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-pink-500 font-orbitron">DIRECT DONATION</h3>
                        <p className="text-xs text-gray-400 uppercase tracking-tighter">Support the grid. Any amount translates to credits ($1 = 1000 CR).</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <input 
                            type="number" 
                            value={donationAmount} 
                            onChange={(e) => setDonationAmount(e.target.value)}
                            className="bg-black border border-pink-500 p-2 text-white w-24 text-center font-mono"
                        />
                        <button 
                            onClick={() => initiateCheckout({ id: 'donation', type: 'donation' })}
                            className="px-8 py-2 bg-pink-500 text-black font-black clip-cyber-btn hover:bg-white transition-all uppercase"
                        >
                            Donate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 4. MAIN APP LOGIC
// ==========================================
const App = () => {
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);
    const [showStore, setShowStore] = useState(false);

    useEffect(() => {
        // Initialize Netlify Identity
        netlifyIdentity.on("init", user => syncUser(user));
        netlifyIdentity.on("login", user => { syncUser(user); netlifyIdentity.close(); });
        netlifyIdentity.on("logout", () => { setUser(null); setView('home'); });

        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            alert("TRANSACTION VERIFIED. ASSETS INJECTED.");
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    const syncUser = async (netlifyUser) => {
        if (!netlifyUser) return;
        try {
            const token = await netlifyUser.jwt();
            const res = await fetch('/.netlify/functions/get_user_profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dbData = await res.json();
            setUser({ ...netlifyUser, ...dbData });
        } catch (err) {
            console.error("Sync Error:", err);
            setUser(netlifyUser); // Basic fallback
        }
    };

    if (view === 'neon_storm') {
        return <NeonStormGame onExit={() => setView('home')} user={user} />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-black text-white">
            <NavBar 
                user={user} 
                onOpenStore={() => setShowStore(true)}
                onLogout={() => netlifyIdentity.logout()}
            />

            {showStore && <CyberStore onClose={() => setShowStore(false)} user={user} />}

            {/* HERO SECTION */}
            <header className="relative pt-32 pb-20 px-6 text-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
                <h1 className="relative text-7xl md:text-9xl font-black font-orbitron mb-4 italic uppercase tracking-tighter">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400">Neon Pulse</span>
                </h1>
                <p className="font-bold text-pink-500 tracking-[0.6em] text-xs md:text-sm mb-12 uppercase">Grid Connection: Stable // Protocols: Active</p>
                
                <div className="max-w-4xl mx-auto bg-gray-900/40 border border-cyan-500/20 p-8 clip-cyber flex flex-col md:flex-row items-center gap-8 backdrop-blur-md">
                    <div className="flex-1 text-left">
                        <h2 className="text-4xl font-black font-orbitron mb-2 uppercase italic text-white">Neon Storm</h2>
                        <p className="text-gray-400 font-rajdhani text-lg">Ancient AI Gods have awakened. Pilot your Nagual craft and pierce the digital veil.</p>
                    </div>
                    <button onClick={() => setView('neon_storm')} className="px-12 py-5 bg-cyan-400 text-black font-black font-orbitron text-xl clip-cyber-btn hover:bg-white transition-all uppercase italic">
                        Initialize
                    </button>
                </div>
            </header>

            {/* UPCOMING GAMES */}
            <section className="max-w-7xl mx-auto px-8 py-20 w-full grid grid-cols-1 md:grid-cols-2 gap-8 opacity-50">
                <div className="border border-white/10 p-8 clip-cyber bg-gray-900/20">
                    <h3 className="font-orbitron font-bold text-xl mb-2 text-gray-500 uppercase italic">Cyber Chess 2099</h3>
                    <p className="text-xs font-mono uppercase text-gray-600 tracking-widest">[ Status: Encrypted ]</p>
                </div>
                <div className="border border-white/10 p-8 clip-cyber bg-gray-900/20">
                    <h3 className="font-orbitron font-bold text-xl mb-2 text-gray-500 uppercase italic">Neural Racer</h3>
                    <p className="text-xs font-mono uppercase text-gray-600 tracking-widest">[ Status: Offline ]</p>
                </div>
            </section>

            <footer className="mt-auto py-12 border-t border-white/5 text-center text-[10px] font-mono text-gray-600 tracking-[0.3em] uppercase">
                System v2.5.1 // Powered by Neon Core // Unauthorized Access Prohibited
            </footer>
        </div>
    );
};

// Mount the App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);