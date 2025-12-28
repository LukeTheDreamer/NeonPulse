const { useState, useEffect } = React;
const NeonStormGame = window.NeonStormGame;

const STORE_ITEMS = {
    CREDITS_5000: { id: "credits_5000", type: "credits", amount: 5000, price: 5, label: "5,000 CREDITS", icon: "💎" },
    TIER_1: { id: "tier_1", type: "tier", tier: 1, price: 30, label: "INITIATE TIER", icon: "🔸" },
    TIER_3: { id: "tier_3", type: "tier", tier: 3, price: 500, label: "LEGEND TIER", icon: "👑" }
};

const App = () => {
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);

    useEffect(() => {
        netlifyIdentity.on("init", user => syncUser(user));
        netlifyIdentity.on("login", user => { syncUser(user); netlifyIdentity.close(); });
    }, []);

    const syncUser = async (netlifyUser) => {
        if (!netlifyUser) return;
        const token = await netlifyUser.jwt();
        const res = await fetch('/.netlify/functions/get_user_profile', {
            headers: { Authorization: 'Bearer ' + token }
        });
        const dbData = await res.json();
        setUser({ ...netlifyUser, ...dbData });
    };

    return React.createElement("div", null, "Neon Pulse Active");
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
