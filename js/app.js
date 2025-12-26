const { useState, useEffect } = React;

const NeonStormGame = window.NeonStormGame;

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
// REPLACE WITH YOUR REAL STRIPE PRICE IDs
const STRIPE_PRICES = {
    CREDITS: "price_1Qxyz...", 
    SKIN: "price_1Qabc...",    
    BADGE: "price_1Qdef..."    
};

const GAMES_DB = [
    {
        id: 'neon_storm',
        title: 'Neon Storm',
        desc: 'Defeat Ancient Gods in this high-speed cyber-aztec bullet hell.',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop',
        tags: ['ACTION', 'BULLET HELL'],
        badge: 'NETRUNNER CHOICE',
    },
    {
        id: 'cyber_chess',
        title: 'Cyber Chess 2099',
        desc: 'Quantum strategy. Predict the AI\'s next move before the simulation collapses.',
        image: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=800&auto=format&fit=crop',
        tags: ['STRATEGY', 'PUZZLE'],
        badge: 'OFFLINE',
    },
    {
        id: 'neural_racer',
        title: 'Neural Racer',
        desc: 'Train autonomous agents on procedurally generated neon highways.',
        image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=800&auto=format&fit=crop',
        tags: ['RACING', 'SIMULATION'],
        badge: 'LOCKED',
    }
];

// ==========================================
// AUTH COMPONENT (LOGIN / REGISTER)
// ==========================================
const AuthModal = ({ onClose, onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: ""
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const endpoint = isLogin ? '/.netlify/functions/auth_login' : '/.netlify/functions/auth_signup';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Connection Refused");

            // Save Token & User
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            onLoginSuccess(data.user);
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="max-w-md w-full bg-cyber-black border border-cyber-cyan p-8 clip-cyber relative shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                <button onClick={onClose} className="absolute top-4 right-4 text-cyber-pink font-bold hover:text-white">[X]</button>
                
                <h2 className="text-3xl font-orbitron font-black text-white mb-6 text-center">
                    {isLogin ? 'SYSTEM LOGIN' : 'NEW IDENTITY'}
                </h2>

                {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 mb-4 text-sm font-mono text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4 font-rajdhani">
                    {!isLogin && (
                        <input 
                            name="username" type="text" placeholder="CODENAME" required 
                            className="w-full bg-black/50 border border-white/20 p-3 text-white focus:border-cyber-cyan outline-none transition-colors"
                            onChange={handleChange}
                        />
                    )}
                    <input 
                        name="email" type="email" placeholder="NEURAL LINK (EMAIL)" required 
                        className="w-full bg-black/50 border border-white/20 p-3 text-white focus:border-cyber-cyan outline-none transition-colors"
                        onChange={handleChange}
                    />
                    <input 
                        name="password" type="password" placeholder="PASSPHRASE" required 
                        className="w-full bg-black/50 border border-white/20 p-3 text-white focus:border-cyber-cyan outline-none transition-colors"
                        onChange={handleChange}
                    />

                    <button 
                        disabled={loading}
                        className="w-full py-4 bg-cyber-cyan text-black font-black uppercase tracking-widest hover:bg-white transition-all clip-cyber-btn disabled:opacity-50 mt-4"
                    >
                        {loading ? 'PROCESSING...' : (isLogin ? 'ACCESS MAINFRAME' : 'GENERATE ID')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => setIsLogin(!isLogin)} 
                        className="text-cyber-pink hover:text-white text-xs uppercase tracking-widest font-bold"
                    >
                        {isLogin ? "Need an identity? Register" : "Already verified? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// STORE COMPONENT
// ==========================================
const CyberStore = ({ onClose, user }) => {
    const [loadingItem, setLoadingItem] = useState(null);

    const buyItem = async (priceId, itemName) => {
        if (!user) return alert("LOGIN REQUIRED FOR TRANSACTIONS");
        
        setLoadingItem(itemName);
        try {
            const response = await fetch('/.netlify/functions/create_checkout', { 
                method: 'POST',
                body: JSON.stringify({ priceId, itemName })
            });
            const { url } = await response.json();
            if(url) window.location.href = url;
            else alert("Connection Error");
        } catch (err) {
            console.error(err);
            alert("Transaction Failed");
            setLoadingItem(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="max-w-4xl w-full bg-cyber-black border border-cyber-cyan p-8 clip-cyber relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-cyber-pink font-bold hover:text-white">[X] CLOSE</button>
                <h2 className="text-4xl font-orbitron font-black text-white mb-2 text-center">CYBER <span className="text-cyber-yellow">MARKET</span></h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    {/* CREDITS */}
                    <div className="bg-white/5 p-6 border border-white/10 hover:border-cyber-cyan transition-all group">
                        <div className="h-24 bg-cyan-900/30 mb-4 flex items-center justify-center text-4xl">💎</div>
                        <h3 className="text-xl font-bold text-white mb-2">5000 CREDITS</h3>
                        <button onClick={() => buyItem(STRIPE_PRICES.CREDITS, 'credits_5000')} disabled={!!loadingItem} className="w-full py-3 bg-cyber-cyan text-black font-bold uppercase hover:bg-white clip-cyber-btn">
                            {loadingItem === 'credits_5000' ? '...' : 'BUY $4.99'}
                        </button>
                    </div>
                    {/* SKIN */}
                    <div className="bg-white/5 p-6 border border-white/10 hover:border-cyber-yellow transition-all group">
                        <div className="h-24 bg-yellow-900/30 mb-4 flex items-center justify-center text-4xl">👑</div>
                        <h3 className="text-xl font-bold text-white mb-2">GOLDEN SKIN</h3>
                        <button onClick={() => buyItem(STRIPE_PRICES.SKIN, 'golden_skin')} disabled={!!loadingItem} className="w-full py-3 bg-cyber-yellow text-black font-bold uppercase hover:bg-white clip-cyber-btn">
                            {loadingItem === 'golden_skin' ? '...' : 'BUY $9.99'}
                        </button>
                    </div>
                    {/* BADGE */}
                    <div className="bg-white/5 p-6 border border-white/10 hover:border-cyber-pink transition-all group">
                        <div className="h-24 bg-pink-900/30 mb-4 flex items-center justify-center text-4xl">🚀</div>
                        <h3 className="text-xl font-bold text-white mb-2">SUPPORTER</h3>
                        <button onClick={() => buyItem(STRIPE_PRICES.BADGE, 'supporter_badge')} disabled={!!loadingItem} className="w-full py-3 bg-cyber-pink text-black font-bold uppercase hover:bg-white clip-cyber-btn">
                            {loadingItem === 'supporter_badge' ? '...' : 'BUY $2.99'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// NAVIGATION
// ==========================================
const NavBar = ({ user, onOpenStore, onOpenAuth, onLogout }) => (
    <nav className="flex justify-between items-center px-8 py-6 sticky top-0 z-40 bg-cyber-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-cyber-cyan clip-cyber-btn animate-pulse"></div>
            <div className="font-orbitron font-black text-2xl tracking-widest text-white group-hover:text-cyber-cyan transition-colors">
                NEON<span className="text-cyber-pink">PULSE</span>
            </div>
        </div>
        <div className="flex gap-4 items-center">
            {user ? (
                <>
                    <div className="text-right mr-4 hidden md:block">
                        <div className="text-cyber-cyan font-bold font-orbitron tracking-widest text-sm">{user.username}</div>
                        <div className="text-cyber-yellow font-mono text-xs">CR: {user.credits}</div>
                    </div>
                    <button onClick={onOpenStore} className="px-6 py-2 border border-cyber-yellow/30 text-cyber-yellow font-rajdhani font-bold hover:bg-cyber-yellow hover:text-black transition-all clip-cyber-btn text-lg">
                        $ STORE
                    </button>
                    <button onClick={onLogout} className="px-4 py-2 border border-red-500/30 text-red-500 font-rajdhani font-bold hover:bg-red-500 hover:text-white transition-all clip-cyber-btn text-sm">
                        LOGOUT
                    </button>
                </>
            ) : (
                <button onClick={onOpenAuth} className="px-6 py-2 border border-cyber-cyan/30 text-cyber-cyan font-rajdhani font-bold hover:bg-cyber-cyan hover:text-black transition-all clip-cyber-btn text-lg">
                    // LOGIN
                </button>
            )}
        </div>
    </nav>
);

// ==========================================
// MAIN APP
// ==========================================
const App = () => {
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);
    const [showAuth, setShowAuth] = useState(false);
    const [showStore, setShowStore] = useState(false);

    // Initial Load & Auth Check
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
            // Optional: Verify token with backend here
        }

        // Handle Payment Success
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            alert(`PAYMENT SUCCESSFUL: ${params.get('item')}`);
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setView('home');
    };

    if (view === 'neon_storm') {
        return <NeonStormGame onExit={() => setView('home')} />;
    }

    return (
        <div className="min-h-screen flex flex-col relative z-10">
            <NavBar 
                user={user} 
                onOpenAuth={() => setShowAuth(true)} 
                onOpenStore={() => setShowStore(true)}
                onLogout={handleLogout}
            />
            
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLoginSuccess={setUser} />}
            {showStore && <CyberStore onClose={() => setShowStore(false)} user={user} />}
            
            <div className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyber-pink/20 blur-[150px] rounded-full pointer-events-none" />
                <h1 className="relative text-7xl md:text-9xl font-black font-orbitron mb-2 animate-glitch tracking-tighter">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-white to-cyber-cyan">NEON PULSE</span>
                </h1>
                <p className="font-rajdhani font-bold text-cyber-pink tracking-[0.5em] text-sm md:text-xl mb-8 uppercase">System Online // Ready for Input</p>
            </div>

            <div className="max-w-7xl mx-auto px-6 mb-24 relative z-10">
                <div className="relative group clip-cyber border border-cyber-cyan/30 bg-cyber-dark p-8 md:p-16 flex flex-col items-start gap-6">
                    <h2 className="text-5xl md:text-7xl font-black font-orbitron text-white">NEON STORM</h2>
                    <p className="text-xl text-gray-300 max-w-xl font-rajdhani">Defeat Ancient Gods in this high-speed cyber-aztec bullet hell.</p>
                    <button onClick={() => setView('neon_storm')} className="bg-cyber-cyan text-black font-black px-10 py-4 clip-cyber-btn font-orbitron text-xl hover:bg-white transition-all">
                        INITIALIZE
                    </button>
                </div>
            </div>
            
            {/* OTHER GAMES GRID (Static for now) */}
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                {GAMES_DB.slice(1).map(game => (
                    <div key={game.id} className="group relative bg-cyber-dark clip-cyber border border-white/10 hover:border-cyber-cyan transition-all p-6 opacity-60 hover:opacity-100">
                        <h3 className="text-2xl font-black font-orbitron mb-2 text-white">{game.title}</h3>
                        <p className="text-sm text-gray-400 font-rajdhani">{game.desc}</p>
                        <div className="mt-4 text-xs font-bold text-cyber-pink border border-cyber-pink/30 px-2 py-1 inline-block">{game.badge}</div>
                    </div>
                ))}
            </div>

            <footer className="border-t border-cyber-cyan/20 mt-auto bg-cyber-black py-12 text-center text-gray-500 font-mono text-xs">
                SYSTEM VERSION 2.4.0 // GRID ONLINE
            </footer>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);