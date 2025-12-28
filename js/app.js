const { useState, useEffect } = React;

const STORE_ITEMS = {
    CREDITS_5000: { id: "credits_5000", type: "credits", amount: 5000, price: 5, label: "5,000 CREDITS", icon: "💎" },
    TIER_1: { id: "tier_1", type: "tier", tier: 1, price: 30, label: "INITIATE TIER", icon: "🔸" },
    TIER_3: { id: "tier_3", type: "tier", tier: 3, price: 500, label: "LEGEND TIER", icon: "👑" }
};

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('hub'); // 'hub' or 'game'

    useEffect(() => {
        const currentUser = netlifyIdentity.currentUser();
        if (currentUser) syncUser(currentUser);

        netlifyIdentity.on("login", user => {
            syncUser(user);
            netlifyIdentity.close();
        });
        
        netlifyIdentity.on("logout", () => setUser(null));
        setLoading(false);
    }, []);

    const syncUser = async (netlifyUser) => {
        try {
            const token = await netlifyUser.jwt();
            const res = await fetch('/.netlify/functions/get_user_profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dbData = await res.json();
            setUser({ ...netlifyUser, ...dbData });
        } catch (err) {
            console.error("User sync failed:", err);
        }
    };

    const handlePurchase = async (item) => {
        if (!user) return netlifyIdentity.open();
        try {
            const token = await user.jwt();
            const res = await fetch('/.netlify/functions/create_checkout', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(item)
            });
            const { url } = await res.json();
            window.location.href = url;
        } catch (err) {
            alert("Checkout failed. Check console.");
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen p-8 flex flex-col items-center">
            {/* Header / Profile Bar */}
            <nav className="w-full max-w-6xl flex justify-between items-center mb-12 border-b border-cyan-400/30 pb-6">
                <h1 className="font-orbitron text-3xl font-black text-white italic tracking-tighter">
                    NEON<span className="text-pink-600">PULSE</span>
                </h1>
                
                <div className="flex items-center gap-6">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-cyan-400 font-bold text-sm uppercase">Credits: {user.credits || 0}</p>
                                <p className="text-white/50 text-[10px] uppercase tracking-widest">
                                    {user.supporter_tier > 0 ? `Tier ${user.supporter_tier} Supporter` : 'User'}
                                </p>
                            </div>
                            <button onClick={() => netlifyIdentity.logout()} className="text-xs text-pink-500 hover:text-white uppercase font-bold">Logout</button>
                        </div>
                    ) : (
                        <button onClick={() => netlifyIdentity.open()} className="px-6 py-2 border border-cyan-400 text-cyan-400 font-bold hover:bg-cyan-400 hover:text-black transition-all clip-path-cyber">
                            INITIALIZE LOGIN
                        </button>
                    )}
                </div>
            </nav>

            {/* Game Grid */}
            <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="relative group p-1 bg-cyan-400/20 hover:bg-cyan-400/40 transition-all cursor-pointer overflow-hidden clip-path-cyber"
                     onClick={() => window.location.href = '/neonstorm.html'}>
                    <div className="bg-black p-6 h-full flex flex-col gap-4">
                        <div className="h-40 bg-gradient-to-br from-cyan-900 to-black flex items-center justify-center">
                            <span className="text-4xl">🛸</span>
                        </div>
                        <h2 className="font-orbitron text-xl font-bold text-cyan-400">NEON STORM</h2>
                        <p className="text-sm text-gray-400">Combat simulation protocol. Survive the ancient AI gods.</p>
                        <button className="mt-auto bg-cyan-400 text-black font-black py-2 uppercase tracking-widest text-xs">Play Now</button>
                    </div>
                </div>

                {/* Placeholder for future games */}
                <div className="p-1 bg-white/5 clip-path-cyber opacity-50 grayscale cursor-not-allowed">
                    <div className="bg-black p-6 h-full flex flex-col items-center justify-center border border-dashed border-white/20">
                        <p className="font-orbitron text-white/20 text-sm">ENCRYPTED DATA...</p>
                    </div>
                </div>
            </main>

            {/* Store Section */}
            <section className="w-full max-w-6xl mt-20">
                <h3 className="font-orbitron text-cyan-400 text-sm tracking-widest mb-8 uppercase text-center">// Supply Depot</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.values(STORE_ITEMS).map(item => (
                        <button key={item.id} onClick={() => handlePurchase(item)}
                                className="p-6 border border-white/10 bg-white/5 hover:border-pink-500 transition-all flex flex-col items-center gap-3">
                            <span className="text-3xl">{item.icon}</span>
                            <span className="font-bold text-white tracking-widest">{item.label}</span>
                            <span className="text-pink-500 font-mono">${item.price}.00</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));