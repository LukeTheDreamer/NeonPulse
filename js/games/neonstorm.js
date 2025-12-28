const { useState, useEffect, useRef } = React;

// ==========================================
// 1. GAME CONFIGURATION
// ==========================================
const BOSS_TYPES = [
    { id: 'sun', name: 'TONATIUH (SUN EATER)', hpMult: 1, color: '#ffd700', width: 100 },
    { id: 'serpent', name: 'QUETZALCOATL (SKY SERPENT)', hpMult: 0.8, color: '#00ffcc', width: 140 },
    { id: 'golem', name: 'TLALOC (JADE GOLEM)', hpMult: 1.5, color: '#00aa55', width: 120 },
    { id: 'bat', name: 'CAMAZOTZ (DEATH BAT)', hpMult: 0.7, color: '#d900ff', width: 90 }
];

const THEMES = {
    NEON: { id: 'NEON', name: 'CYBER DEFAULT', price: 0, primary: '#00f3ff', secondary: '#ff003c' },
    VOID: { id: 'VOID', name: 'VOID WALKER', price: 2000, primary: '#8b5cf6', secondary: '#4c1d95' },
    MATRIX: { id: 'MATRIX', name: 'SYSTEM ROOT', price: 3500, primary: '#00ff00', secondary: '#003300' },
    GOLD: { id: 'GOLD', name: 'MIDAS TOUCH', price: 10000, primary: '#ffd700', secondary: '#ffffff' }
};

const DEFAULT_THEME = THEMES.NEON;

const getRank = (combo) => {
    if (combo >= 1000) return { label: 'GOD', color: '#ffffff', shadow: '#00f3ff' }; 
    if (combo >= 500) return { label: 'S+', color: '#ff003c', shadow: '#ff003c' }; 
    if (combo >= 250) return { label: 'S', color: '#ff0000', shadow: '#ff0000' };   
    if (combo >= 120) return { label: 'A', color: '#ff7700', shadow: '#ff7700' };   
    if (combo >= 60) return { label: 'B', color: '#ffd700', shadow: '#ffd700' };   
    if (combo >= 30) return { label: 'C', color: '#00aa55', shadow: '#00aa55' };   
    if (combo >= 15) return { label: 'D', color: '#00ffcc', shadow: '#00ffcc' };   
    return { label: 'E', color: '#555555', shadow: '#000000' };                     
};

// ==========================================
// 2. MAIN GAME COMPONENT
// ==========================================
window.NeonStormGame = ({ onExit }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    
    // UI State
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [comboCount, setComboCount] = useState(0);
    const [bossActive, setBossActive] = useState(false);
    const [bossName, setBossName] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMusicEnabled, setIsMusicEnabled] = useState(true);
    
    // Menu States
    const [showHangar, setShowHangar] = useState(false);
    const [showStory, setShowStory] = useState(false);
    const [showTips, setShowTips] = useState(false);
    
    // Player Profile State
    const [credits, setCredits] = useState(() => {
        const saved = localStorage.getItem('credits');
        return saved ? parseInt(saved, 10) : 0; 
    });
    
    const [unlockedThemes, setUnlockedThemes] = useState(['NEON']);
    const [activeTheme, setActiveTheme] = useState(THEMES.NEON);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState([]);
    const [playerName, setPlayerName] = useState("");
    const [scoreSubmitted, setScoreSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // ENGINE REFS
    const audioContextRef = useRef(null);
    const musicNodesRef = useRef({ oscillators: [], playing: false, intervals: [] });
    const activeThemeRef = useRef(THEMES.NEON); 
    const isGameActiveRef = useRef(false);
    const isHangarOpenRef = useRef(false);
    const isMusicEnabledRef = useRef(true);

    const gameStateRef = useRef({
        isGameActive: false,
        powerUpLevel: 0,
        score: 0,
        player: { x: 375, y: 500, width: 50, height: 50, speed: 8, lean: 0 },
        bullets: [], enemies: [], powderDrops: [], stars: [], particles: [], floatingTexts: [],
        boss: null, nextBossScore: 10000, bossLevel: 1, lastBossId: null, bossCooldown: 0,
        keys: {}, lastEnemySpawn: 0, enemySpawnRate: 800, lastPowderSpawn: 0,
        powderSpawnRate: 4000, powerUpEndTime: 0, animationId: null, 
        lastKillTime: 0, hitStop: 0, currentCombo: 0, frameCount: 0
    });

    // --- SYNC STATE TO REFS ---
    useEffect(() => { activeThemeRef.current = activeTheme; }, [activeTheme]);
    useEffect(() => { isHangarOpenRef.current = showHangar || showStory || showTips; }, [showHangar, showStory, showTips]);
    useEffect(() => { isMusicEnabledRef.current = isMusicEnabled; }, [isMusicEnabled]);
    
    // UPDATED: Sync Credits to LocalStorage
    useEffect(() => { localStorage.setItem('credits', credits); }, [credits]);

    // UPDATED: Check for Logged In User on Mount
    useEffect(() => {
        if (window.netlifyIdentity) {
            const user = window.netlifyIdentity.currentUser();
            if (user) {
                // Pre-fill name from Identity or Metadata
                setPlayerName(user.user_metadata?.full_name || user.email.split('@')[0].toUpperCase());
            }
        }
    }, []);

    // --- API CALLS (UPDATED FOR NETLIFY IDENTITY) ---
    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/.netlify/functions/get_scores');
            if (res.ok) setLeaderboard(await res.json());
        } catch (err) { 
            // Fallback for dev/demo
            setLeaderboard([{ username: "NEON_GOD", score: 99999 }]); 
        }
    };

    const submitScore = async () => {
        if (!playerName.trim()) return alert("Enter a callsign!");
        
        // 1. Check Auth Status
        const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
        
        if (!user) {
            alert("Please Login to Upload Score");
            window.netlifyIdentity.open(); // Open Login Modal
            return;
        }

        setIsLoading(true);
        try {
            // 2. Get Secure Token
            const token = await user.jwt();

            // 3. Send to Backend
            const res = await fetch('/.netlify/functions/submit_score', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`, // Secure Header
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    gameId: 'neon-storm', // Must match DB 'games' table
                    score: score,
                    // Metadata is optional, but good for display
                    metadata: { username: playerName } 
                })
            });

            if (res.ok) {
                setScoreSubmitted(true);
                fetchLeaderboard();
            } else {
                throw new Error(await res.text());
            }
        } catch (err) { 
            console.error(err);
            alert("Score upload failed. Try again."); 
        }
        setIsLoading(false);
    };

    // --- SHOP LOGIC ---
    const handleBuyTheme = (themeId) => {
        const theme = THEMES[themeId];
        if (unlockedThemes.includes(themeId)) {
            setActiveTheme(theme);
        } else {
            if (credits >= theme.price) {
                setCredits(prev => prev - theme.price);
                setUnlockedThemes(prev => [...prev, themeId]);
                setActiveTheme(theme);
            } else {
                alert("INSUFFICIENT CREDITS");
            }
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(console.error);
        else document.exitFullscreen();
    };

    const toggleMusic = () => {
        const newState = !isMusicEnabled;
        setIsMusicEnabled(newState);
        if (!newState) stopMusic();
        else if (isGameActiveRef.current) startMusic(!!gameStateRef.current.boss);
    };

    // --- AUDIO SYSTEM ---
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const playSfx = (type) => {
        if (!audioContextRef.current) return;
        try {
            const ctx = audioContextRef.current;
            const now = ctx.currentTime;
            
            const spawnOsc = (wave, freq, detune, dur, vol, slideTo) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = wave;
                osc.frequency.setValueAtTime(freq, now);
                if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
                if (detune) osc.detune.value = detune;
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + dur);
            };

            switch (type) {
                case 'shoot':
                    spawnOsc('square', 800, 0, 0.1, 0.05, 200);
                    spawnOsc('triangle', 200, 0, 0.1, 0.1, 50);
                    break;
                case 'explosion':
                    spawnOsc('sawtooth', 100, 0, 0.4, 0.2, 10);
                    spawnOsc('square', 50, Math.random() * 1000, 0.2, 0.1, 10);
                    break;
                case 'hit':
                    spawnOsc('sawtooth', 200, Math.random()*100, 0.1, 0.1, 50);
                    break;
                case 'powerup':
                    spawnOsc('sine', 400, 0, 0.4, 0.1, 1200);
                    spawnOsc('triangle', 405, 0, 0.4, 0.05, 1205);
                    break;
                case 'combo':
                    const pitch = 800 + (gameStateRef.current.currentCombo * 50);
                    spawnOsc('sine', pitch, 0, 0.1, 0.1);
                    break;
                case 'combo_break':
                    spawnOsc('sawtooth', 300, 0, 0.3, 0.1, 100);
                    break;
            }
        } catch (e) { /* ignore */ }
    };

    const startMusic = (isBoss = false) => {
        stopMusic();
        if (!isMusicEnabledRef.current) return;
        initAudio();
        if (!audioContextRef.current) return;
        
        musicNodesRef.current.playing = true;
        const playLoop = () => {
            if (!musicNodesRef.current.playing || audioContextRef.current.state !== 'running') return;
            const now = audioContextRef.current.currentTime;
            const bassNotes = isBoss ? [43.65, 43.65, 38.89, 48.99] : [55, 48.99, 65.41, 73.42];
            const note = bassNotes[Math.floor((now * (isBoss ? 4 : 2)) % bassNotes.length)];
            try {
                const osc = audioContextRef.current.createOscillator();
                const gain = audioContextRef.current.createGain();
                osc.type = isBoss ? 'square' : 'sawtooth';
                osc.frequency.setValueAtTime(note, now);
                const filter = audioContextRef.current.createBiquadFilter();
                filter.type = 'lowpass'; filter.frequency.value = 600;
                osc.connect(filter); filter.connect(gain); gain.connect(audioContextRef.current.destination);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (isBoss ? 0.2 : 0.45));
                osc.start(now); osc.stop(now + 0.5);
            } catch (e) {}
        };
        const interval = setInterval(playLoop, isBoss ? 100 : 125);
        musicNodesRef.current.intervals.push(interval);
    };

    const stopMusic = () => {
        musicNodesRef.current.playing = false;
        musicNodesRef.current.intervals.forEach(clearInterval);
        musicNodesRef.current.intervals = [];
    };

    const addScore = (amount) => {
        if (!isGameActiveRef.current) return;
        const s = gameStateRef.current;
        s.score += amount;
        setScore(s.score);
    };

    // --- GAME ACTIONS ---
    const spawnBoss = () => {
        const s = gameStateRef.current;
        s.enemies = []; 
        let availableBosses = BOSS_TYPES;
        if (s.lastBossId) availableBosses = BOSS_TYPES.filter(b => b.id !== s.lastBossId);
        const bossType = availableBosses[Math.floor(Math.random() * availableBosses.length)];
        s.lastBossId = bossType.id;
        setBossName(bossType.name);
        const baseHp = 500 * s.bossLevel;
        s.boss = { x: 400 - (bossType.width/2), y: -200, width: bossType.width, height: 100, hp: baseHp * bossType.hpMult, maxHp: baseHp * bossType.hpMult, type: bossType.id, color: bossType.color, state: 'entering', vx: 2, vy: 0, lastShot: 0, angle: 0, timer: 0 };
        setBossActive(true);
        startMusic(true); 
        gameStateRef.current.floatingTexts.push({ x: 400, y: 300, text: "ANCIENT GOD AWAKENED", life: 1.0, scale: 0, vy: -2, color: bossType.color });
        playSfx('explosion');
    };

    const fireBullet = () => {
        const s = gameStateRef.current;
        if (!isGameActiveRef.current) return;
        const theme = activeThemeRef.current || DEFAULT_THEME;
        
        initAudio();
        playSfx('shoot');
        
        s.player.y = Math.min(600, s.player.y + 4); 
        const pColor = theme.primary || '#00f3ff';
        
        s.particles.push({ x: s.player.x + 25, y: s.player.y - 10, life: 0.2, type: 'muzzle_flash', size: 15, color: '#fff', decay: 0.3 });
        
        s.bullets.push({ x: s.player.x + 22, y: s.player.y, vx: 0, vy: -15, type: 'main', isPlayer: true, active: true });
        
        if (s.powerUpLevel >= 1) { s.bullets.push({ x: s.player.x - 10, y: s.player.y + 10, vx: -1, vy: -14, type: 'side', isPlayer: true, active: true }); s.bullets.push({ x: s.player.x + 50, y: s.player.y + 10, vx: 1, vy: -14, type: 'side', isPlayer: true, active: true }); }
        if (s.powerUpLevel >= 2) { s.bullets.push({ x: s.player.x - 20, y: s.player.y + 20, vx: -3, vy: -12, type: 'side', isPlayer: true, active: true }); s.bullets.push({ x: s.player.x + 60, y: s.player.y + 20, vx: 3, vy: -12, type: 'side', isPlayer: true, active: true }); }
        if (s.powerUpLevel >= 3) { s.bullets.push({ x: s.player.x, y: s.player.y, vx: -5, vy: -10, type: 'side', isPlayer: true, active: true }); s.bullets.push({ x: s.player.x + 40, y: s.player.y, vx: 5, vy: -10, type: 'side', isPlayer: true, active: true }); }
    };

    const createExplosion = (x, y, color, count = 10, speed = 1) => {
        const s = gameStateRef.current;
        if (!s.particles) s.particles = [];
        
        s.particles.push({ x, y, life: 1.0, type: 'ring', size: 5, max_size: 40 * speed, color: color, decay: 0.08 });
        s.particles.push({ x, y, life: 1.0, type: 'core_flash', size: 10 * speed, color: '#fff', decay: 0.15 });

        for (let i = 0; i < 8*speed; i++) {
            const angle = Math.random() * Math.PI * 2; const velocity = (Math.random() * 8 + 4) * speed;
            s.particles.push({ x, y, vx: Math.cos(angle)*velocity, vy: Math.sin(angle)*velocity, life: 1.0, color: '#ffffaa', type: 'spark', decay: 0.1 });
        }
        for (let i = 0; i < 10*speed; i++) {
            const angle = Math.random() * Math.PI * 2; const velocity = (Math.random() * 4 + 1) * speed;
            s.particles.push({ x, y, vx: Math.cos(angle)*velocity, vy: Math.sin(angle)*velocity, life: 1.0, color: color || '#fff', type: 'debris', size: (Math.random()*5+3)*speed, decay: 0.04, rotation: Math.random(), rotSpeed: 0.1, drag: 0.95 });
        }
    };

    const createShockwave = (x, y, color = '#fff') => {
        gameStateRef.current.particles.push({ x, y, life: 1.0, type: 'shockwave', size: 1, decay: 0.05, color });
    };

    const handleGameOver = () => {
        if (!isGameActiveRef.current) return;
        isGameActiveRef.current = false;
        gameStateRef.current.isGameActive = false;
        setGameOver(true);
        setGameStarted(false);
        stopMusic();
    };

    // --- GAME LOOP ---
    const update = () => {
        if (!isGameActiveRef.current) return;
        const s = gameStateRef.current;
        const theme = activeThemeRef.current || DEFAULT_THEME;
        
        if (s.hitStop > 0) { s.hitStop--; return; }
        
        s.frameCount++;
        const now = Date.now();
        s.stars.forEach(st => { st.y += st.speed; if (st.y > 600) st.y = 0; });

        // Player Move
        const speedBoost = Math.min(4.5, s.powerUpLevel * 1.5);
        const spd = s.player.speed + speedBoost;
        let moveX = 0;
        if (s.keys['a'] || s.keys['arrowleft']) moveX = -1;
        if (s.keys['d'] || s.keys['arrowright']) moveX = 1;
        s.player.x += moveX * spd;
        s.player.lean = s.player.lean * 0.8 + (moveX * 0.3) * 0.2; 
        if (s.keys['w'] || s.keys['arrowup']) s.player.y -= spd;
        if (s.keys['s'] || s.keys['arrowdown']) s.player.y += spd;
        s.player.x = Math.max(0, Math.min(800 - 50, s.player.x));
        s.player.y = Math.max(0, Math.min(600 - 50, s.player.y));

        if (s.frameCount % 2 === 0) {
            const trailColor = s.powerUpLevel > 0 ? (theme.secondary || '#ff003c') : (theme.primary || '#00f3ff');
            s.particles.push({ x: s.player.x + 25 + (Math.random() * 10 - 5), y: s.player.y + 45, vx: (Math.random() - 0.5), vy: Math.random() * 4 + 2, life: 1.0, color: trailColor, size: Math.random() * 4 + 2, decay: 0.05, type: 'trail' });
        }

        // Combo Logic
        const timeElapsed = now - s.lastKillTime;
        const timeRemainingPct = Math.max(0, 1 - (timeElapsed / 3000));
        const rankInfo = getRank(s.currentCombo);
        const timerBar = document.getElementById('combo-timer-bar');
        const rankText = document.getElementById('combo-rank-text');
        if (timerBar && rankText) {
            timerBar.style.width = `${timeRemainingPct * 100}%`;
            timerBar.style.backgroundColor = theme.primary;
            timerBar.style.boxShadow = `0 0 10px ${theme.primary}`;
            rankText.innerText = rankInfo.label;
            rankText.style.color = rankInfo.color;
            rankText.style.textShadow = `0 0 15px ${rankInfo.shadow}`;
        }
        if (timeElapsed > 3000) { s.currentCombo = 0; setComboCount(0); }

        // PowerUp Logic
        const puBar = document.getElementById('powerup-bar');
        const puContainer = document.getElementById('powerup-ui');
        const puText = document.getElementById('powerup-text');
        if (s.powerUpLevel > 0) {
            if (now >= s.powerUpEndTime) { s.powerUpLevel = 0; s.powerUpEndTime = 0; if (puContainer) puContainer.style.opacity = '0'; } 
            else {
                const remaining = s.powerUpEndTime - now; const pct = Math.max(0, (remaining / 5000) * 100);
                if (puBar && puContainer && puText) {
                    puContainer.style.opacity = '1'; puBar.style.width = `${pct}%`;
                    puText.innerText = `SYSTEM UPGRADE // LVL ${s.powerUpLevel}`;
                    puText.style.color = theme.secondary;
                    puBar.style.background = `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`;
                }
            }
        } else { if (puContainer) puContainer.style.opacity = '0'; }

        // --- BOSS SPAWN CHECK ---
        if (s.score >= s.nextBossScore && !s.boss && now > s.bossCooldown) {
            spawnBoss();
        }

        // Boss Logic
        if (s.boss) {
            const b = s.boss;
            b.timer++; b.angle += 0.02;
            const hpBar = document.getElementById('boss-hp-fill');
            if (hpBar) hpBar.style.width = `${(b.hp / b.maxHp) * 100}%`;

            if (b.state === 'entering') {
                b.y += 2; if (b.y >= 80) b.state = 'fighting';
            } else {
                const cx = b.x + b.width/2; const cy = b.y + b.height/2; 
                if (b.type === 'sun') { b.x += b.vx; if (b.x < 50 || b.x > 750 - b.width) b.vx *= -1; b.y = 80 + Math.sin(now / 800) * 40; } 
                else if (b.type === 'serpent') { b.x = 400 - (b.width/2) + Math.sin(now / 1000) * 250; b.y = 80 + Math.cos(now / 500) * 30; } 
                else if (b.type === 'golem') { if (cx < s.player.x + 15) b.x += 1; else if (cx > s.player.x + 35) b.x -= 1; b.y = 80 + Math.sin(now / 1200) * 10; } 
                else if (b.type === 'bat') { if (b.timer % 60 === 0) { b.vx = (Math.random() - 0.5) * 12; b.vy = (Math.random() - 0.5) * 4; } b.x += b.vx; b.y += b.vy; b.x = Math.max(0, Math.min(800 - b.width, b.x)); b.y = Math.max(20, Math.min(200, b.y)); b.vx *= 0.95; b.vy *= 0.95; }

                const baseRate = Math.max(500, 1500 - (s.bossLevel * 100));
                let fireRate = baseRate;
                if (b.type === 'bat') fireRate = baseRate * 0.6; if (b.type === 'golem') fireRate = baseRate * 1.5;

                if (now - b.lastShot > fireRate) {
                    b.lastShot = now; playSfx('shoot'); 
                    if (b.type === 'sun') { for(let i=0; i<8; i++) { const angle = (i/8)*Math.PI*2 + b.angle; s.bullets.push({ x: cx, y: cy, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, type: 'boss', active: true, isPlayer: false, size: 6 }); } }
                    else if (b.type === 'serpent') { const angle = Math.atan2((s.player.y+25)-cy, (s.player.x+25)-cx); for(let i=-0.3; i<=0.3; i+=0.3) s.bullets.push({ x: cx, y: cy+30, vx: Math.cos(angle+i)*5, vy: Math.sin(angle+i)*5, type: 'boss', active: true, color: '#00ffcc', isPlayer: false, size: 5 }); }
                    else if (b.type === 'golem') { s.bullets.push({ x: cx, y: cy+40, vx: 0, vy: 6, type: 'boss', active: true, color: '#00aa55', isPlayer: false, size: 15 }); }
                    else { s.bullets.push({ x: cx-20, y: cy+20, vx: (Math.random()-0.5), vy: 7, type: 'boss', active: true, color: '#d900ff', isPlayer: false, size: 4 }); s.bullets.push({ x: cx+20, y: cy+20, vx: (Math.random()-0.5), vy: 7, type: 'boss', active: true, color: '#d900ff', isPlayer: false, size: 4 }); }
                }
            }

            s.bullets.forEach(bu => {
                if (bu.active && bu.isPlayer && bu.x > b.x && bu.x < b.x + b.width && bu.y > b.y && bu.y < b.y + b.height) {
                    b.hp -= 10; bu.active = false; createExplosion(bu.x, bu.y, '#fff', 2, 0.5);
                    s.currentCombo++; setComboCount(s.currentCombo); addScore(10 * s.currentCombo); s.lastKillTime = now;
                    if (b.hp <= 0) {
                          createExplosion(b.x + b.width/2, b.y + b.height/2, b.color, 100, 2); createShockwave(b.x + b.width/2, b.y + b.height/2, b.color);
                          s.boss = null; setBossActive(false); s.bossLevel++; s.nextBossScore += 10000; addScore(5000); 
                          s.bossCooldown = now + 30000; 
                          gameStateRef.current.floatingTexts.push({ x: b.x + b.width/2, y: b.y, text: "GOD SLAIN", life: 1.0, scale: 0, vy: -2, color: '#ff0000' });
                          s.hitStop = 10; startMusic(false); playSfx('explosion');
                    }
                }
            });
        }

        // Bullets Move & Cleanup
        s.bullets.forEach(b => { 
            if (b.active) { 
                b.x += b.vx; b.y += b.vy; 
                if(b.y < -20 || b.y > 620 || b.x < -20 || b.x > 820) b.active = false; 
            } 
        });
        s.bullets = s.bullets.filter(b => b.active);

        // Enemies
        if (!s.boss) {
             if (now - s.lastEnemySpawn > s.enemySpawnRate) { 
                const roll = Math.random(); 
                let type = 'standard', hp = 1, speed = 2.5 + Math.random() * 2;
                if (roll > 0.88) { type = 'tank'; hp = 5; speed = 1.0; } 
                else if (roll > 0.75) { type = 'stalker'; hp = 1; speed = 4.0; }
                else if (roll > 0.6) { type = 'phantom'; hp = 1; speed = 2.2; }
                s.enemies.push({ x: Math.random() * 750, y: -60, type, hp, speed, scale: 0, hitFlash: 0 }); 
                s.lastEnemySpawn = now; 
            }
            
            s.enemies.forEach(e => {
                e.y += e.speed;
                if (e.scale < 1) e.scale += 0.1;
                if (e.hitFlash > 0) e.hitFlash--;

                if (e.type === 'stalker') e.x += Math.sign((s.player.x+25)-(e.x+25)) * 1.8;
                else if (e.type === 'phantom') e.x += Math.sin(now / 150) * 5;
                
                // COMBO RULE #3: Enemy crosses bottom = BREAK COMBO
                if (e.y > 600 && !e.escaped) {
                    if (s.currentCombo > 0) {
                        gameStateRef.current.floatingTexts.push({ x: e.x, y: 580, text: "COMBO BROKEN", life: 1.0, scale: 0, vy: -1, color: '#ff003c' });
                        playSfx('combo_break');
                    }
                    s.currentCombo = 0;
                    setComboCount(0);
                    e.escaped = true; 
                }

                const dist = Math.sqrt(Math.pow((e.x+25)-(s.player.x+25),2) + Math.pow((e.y+25)-(s.player.y+25),2));
                if (dist < 40) { 
                    if (s.powerUpLevel > 0) { 
                        e.hp = 0; s.currentCombo++; addScore(50 * s.currentCombo); setComboCount(s.currentCombo); s.lastKillTime = now; s.hitStop = 4; createExplosion(e.x + 25, e.y + 25, '#d900ff', 20); playSfx('explosion'); 
                    } else { 
                        handleGameOver();
                    } 
                }

                s.bullets.forEach(b => {
                    if (b.active && b.isPlayer && Math.abs(b.x - e.x - 20) < 35 && Math.abs(b.y - e.y - 20) < 35) {
                        e.hp--; b.active = false; createExplosion(b.x, b.y, '#fff', 3, 0.5);
                        e.hitFlash = 3; 

                        if (e.hp <= 0) { 
                            s.currentCombo++; setComboCount(s.currentCombo); 
                            const base = e.type === 'tank' ? 30 : 10; addScore(base * s.currentCombo); 
                            gameStateRef.current.floatingTexts.push({ x: e.x + 10, y: e.y, text: `+${base * s.currentCombo}`, life: 1.0, scale: 0, vy: -2, color: '#fff' });
                            s.lastKillTime = now; playSfx('combo'); s.hitStop = 3; 
                            let hitColor = e.type === 'tank' ? '#00ffcc' : (e.type === 'stalker' ? '#ff0055' : '#d900ff'); createExplosion(e.x + 25, e.y + 25, hitColor, 15, 1);
                        } else {
                            playSfx('hit');
                        }
                    }
                });
            });
            s.enemies = s.enemies.filter(e => e.hp > 0 && e.y < 650);
        }

        if (s.boss) {
             s.bullets.forEach(b => {
                if (!b.active && !b.isPlayer) return;
                if (!b.isPlayer && Math.abs(b.x - (s.player.x + 25)) < (b.size + 15) && Math.abs(b.y - (s.player.y + 25)) < (b.size + 15)) {
                    if (s.powerUpLevel > 0) { s.powerUpLevel--; b.active = false; createExplosion(s.player.x + 25, s.player.y + 25, '#ff003c', 15); playSfx('hit'); s.hitStop = 5; gameStateRef.current.floatingTexts.push({ x: s.player.x, y: s.player.y - 20, text: "SYSTEM DAMAGE", life: 1.0, scale: 0, vy: -1, color: '#ff003c' }); } else { handleGameOver(); }
                }
             });
        }

        if (now - s.lastPowderSpawn > s.powderSpawnRate) { s.powderDrops.push({ x: Math.random() * 750, y: -50, float: 0, rot: 0 }); s.lastPowderSpawn = now; }
        s.powderDrops.forEach((d, i) => {
            d.y += 2.5; d.float += 0.1; d.rot += 0.05;
            if (Math.abs(d.x - s.player.x) < 50 && Math.abs(d.y - s.player.y) < 50) {
                s.powderDrops.splice(i, 1); 
                s.powerUpLevel = Math.min(3, s.powerUpLevel + 1);
                s.powerUpEndTime = now + 5000; 
                addScore(1000); s.currentCombo++; setComboCount(s.currentCombo); s.lastKillTime = now;
                gameStateRef.current.floatingTexts.push({ x: s.player.x, y: s.player.y - 30, text: "POWER UP +1000", life: 1.0, scale: 0, vy: -1, color: theme.primary });
                playSfx('powerup'); createShockwave(s.player.x + 25, s.player.y + 25);
            }
        });

        s.particles.forEach(p => { 
            if (p.type === 'shockwave') { p.size += 4; p.life -= p.decay; } 
            else if (p.type === 'core_flash') { p.size += 2; p.life -= p.decay; } 
            else if (p.type === 'muzzle_flash') { p.life -= p.decay; } 
            else if (p.type === 'ring') { p.size += (p.max_size - p.size) * 0.2; p.life -= p.decay; }
            else if (p.type === 'spark') { p.x += p.vx; p.y += p.vy; p.life -= p.decay; } 
            else { 
                p.x += p.vx; p.y += p.vy; p.life -= p.decay; 
                if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
                if (p.type === 'debris') p.rotation += p.rotSpeed; 
            } 
        });
        s.particles = s.particles.filter(p => p.life > 0);
        
        s.floatingTexts.forEach(t => { 
            t.y += t.vy; t.life -= 0.02; 
            if (t.scale < 1) t.scale += 0.2; 
        }); 
        s.floatingTexts = s.floatingTexts.filter(t => t.life > 0);
    };

    const draw = () => {
        const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); const s = gameStateRef.current;
        const theme = activeThemeRef.current || DEFAULT_THEME;
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 800, 600);
        s.stars.forEach(st => { ctx.fillStyle = `rgba(${theme.primary === '#00f3ff' ? '0,243,255' : '255,255,255'}, ${st.brightness})`; ctx.fillRect(st.x, st.y, st.size, st.size); });

        s.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            if (p.type === 'shockwave') { ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke(); } 
            else if (p.type === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke(); } 
            else if (p.type === 'core_flash') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); }
            else if (p.type === 'muzzle_flash') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); }
            else if (p.type === 'spark') { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*2, p.y - p.vy*2); ctx.stroke(); }
            else if (p.type === 'debris') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); ctx.restore(); }
            else { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
        });
        
        ctx.globalAlpha = 1.0; 

        if (s.boss) {
            const b = s.boss; const cx = b.x + b.width/2; const cy = b.y + b.height/2; ctx.save(); ctx.translate(cx, cy); ctx.shadowBlur = 25; ctx.shadowColor = b.color;
            if (b.type === 'sun') { ctx.save(); ctx.rotate(b.angle); ctx.fillStyle = '#5500aa'; for(let i=0; i<8; i++) { ctx.save(); ctx.rotate(i * Math.PI/4); ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(-15, -50); ctx.lineTo(15, -50); ctx.fill(); ctx.restore(); } ctx.strokeStyle = '#d900ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,0, 55, 0, Math.PI*2); ctx.stroke(); ctx.restore(); ctx.fillStyle = '#1a0633'; ctx.beginPath(); ctx.arc(0,0, 25, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2; ctx.strokeRect(-10, -10, 8, 5); ctx.strokeRect(2, -10, 8, 5); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-4, 5); ctx.lineTo(4, 5); ctx.stroke(); } 
            else if (b.type === 'serpent') { ctx.fillStyle = '#004433'; ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(40, -30); ctx.lineTo(30, 40); ctx.lineTo(0, 55); ctx.lineTo(-30, 40); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(-60, -50); ctx.lineTo(-40, -10); ctx.moveTo(40, -30); ctx.lineTo(60, -50); ctx.lineTo(40, -10); ctx.stroke(); ctx.fillStyle = '#ff0000'; ctx.fillRect(-25, 0, 10, 20); ctx.fillRect(15, 0, 10, 20); } 
            else if (b.type === 'golem') { ctx.strokeStyle = '#00aa55'; ctx.lineWidth = 4; ctx.fillStyle = '#052211'; ctx.fillRect(-50, -50, 100, 100); ctx.strokeRect(-50, -50, 100, 100); ctx.strokeRect(-30, -30, 20, 20); ctx.strokeRect(10, -30, 20, 20); ctx.fillRect(-30, 10, 60, 20); ctx.fillStyle = '#00aa55'; ctx.fillRect(-25, 10, 10, 10); ctx.fillRect(-5, 10, 10, 10); ctx.fillRect(15, 10, 10, 10); } 
            else if (b.type === 'bat') { ctx.fillStyle = '#220033'; ctx.strokeStyle = '#d900ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(40, -20); ctx.lineTo(60, 10); ctx.lineTo(30, 30); ctx.lineTo(0, 40); ctx.lineTo(-30, 30); ctx.lineTo(-60, 10); ctx.lineTo(-40, -20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-15, -40); ctx.lineTo(0, -20); ctx.lineTo(15, -40); ctx.lineTo(10, -20); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-10, 0, 3, 0, Math.PI*2); ctx.arc(10, 0, 3, 0, Math.PI*2); ctx.fill(); }
            ctx.restore();
        }

        if (s.isGameActive) {
            const px = s.player.x, py = s.player.y;
            ctx.save(); 
            ctx.translate(px + 25, py + 25); 
            ctx.rotate(s.player.lean); 
            ctx.translate(-(px + 25), -(py + 25));
            
            ctx.shadowBlur = s.powerUpLevel > 0 ? 30 : 15; ctx.shadowColor = s.powerUpLevel > 0 ? theme.primary : '#ff7700'; ctx.strokeStyle = s.powerUpLevel > 0 ? theme.primary : '#ff7700'; ctx.lineWidth = 2;
            const drawWing = (flip) => { ctx.save(); if(flip) { ctx.translate(px+50, py); ctx.scale(-1, 1); ctx.translate(-(px), -py); } ctx.beginPath(); ctx.moveTo(px + 10, py + 25); ctx.quadraticCurveTo(px - 10, py + 30, px - 15, py + 10); ctx.lineTo(px + 10, py + 20); ctx.moveTo(px + 10, py + 30); ctx.quadraticCurveTo(px - 10, py + 45, px - 10, py + 25); ctx.lineTo(px + 15, py + 35); ctx.stroke(); ctx.restore(); }
            drawWing(false); drawWing(true);
            ctx.fillStyle = '#1a0633'; ctx.beginPath(); ctx.moveTo(px + 25, py); ctx.quadraticCurveTo(px + 35, py + 15, px + 35, py + 35); ctx.lineTo(px + 25, py + 45); ctx.lineTo(px + 15, py + 35); ctx.quadraticCurveTo(px + 15, py + 15, px + 25, py); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = theme.secondary; ctx.shadowColor = theme.secondary; ctx.beginPath(); ctx.moveTo(px+25, py+20); ctx.lineTo(px+30, py+30); ctx.lineTo(px+25, py+40); ctx.lineTo(px+20, py+30); ctx.fill();
            ctx.restore();
        }

        if (!s.boss) {
            s.enemies.forEach(e => {
                const ex = e.x, ey = e.y; 
                ctx.save(); 
                ctx.translate(ex+25, ey+25); 
                // Pop in scale
                if(e.scale !== undefined) ctx.scale(e.scale, e.scale);
                
                ctx.lineWidth = 2;
                let color = e.hitFlash > 0 ? '#ffffff' : (e.type === 'tank' ? '#00ffcc' : (e.type === 'stalker' ? '#ff0055' : '#d900ff')); 
                if (e.hp < (e.type === 'tank' ? 5 : 1) && e.hitFlash === 0) { color = '#ffffff'; } 
                
                ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = e.hitFlash > 0 ? 20 : 10;
                
                if (e.type === 'tank') { ctx.strokeRect(-25, 5, 50, 15); ctx.strokeRect(-20, -10, 40, 15); ctx.strokeRect(-10, -25, 20, 15); ctx.beginPath(); ctx.moveTo(-5, -25); ctx.lineTo(-5, 20); ctx.moveTo(5, -25); ctx.lineTo(5, 20); ctx.stroke(); } 
                else if (e.type === 'stalker') { ctx.beginPath(); ctx.moveTo(0, 25); ctx.quadraticCurveTo(15, 0, 15, -15); ctx.lineTo(5, -25); ctx.lineTo(-5, -25); ctx.lineTo(-15, -15); ctx.quadraticCurveTo(-15, 0, 0, 25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, -15); ctx.stroke(); } 
                else if (e.type === 'phantom') { ctx.strokeStyle = '#d900ff'; ctx.shadowColor = '#d900ff'; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(15, 10); ctx.quadraticCurveTo(0, 25, -15, 10); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 5); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -5, 2, 0, Math.PI*2); ctx.fill(); } 
                else { ctx.beginPath(); ctx.rect(-15, -15, 30, 30); ctx.stroke(); ctx.strokeRect(-15, -25, 8, 10); ctx.strokeRect(7, -25, 8, 10); ctx.fillStyle = '#00ffcc'; ctx.fillRect(-10, -5, 6, 6); ctx.fillRect(4, -5, 6, 6); ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-5, 20); ctx.lineTo(0, 10); ctx.lineTo(5, 20); ctx.lineTo(10, 10); ctx.stroke(); }
                ctx.restore();
            });
        }

        s.bullets.forEach(b => { 
            // COSMETIC: Bullet colors based on Theme
            ctx.fillStyle = b.isPlayer ? (b.type === 'side' ? theme.secondary : theme.primary) : (b.color || '#ff0000');
            ctx.shadowBlur = 5; ctx.shadowColor = ctx.fillStyle; 
            if (b.isPlayer) { ctx.beginPath(); ctx.moveTo(b.x + 4.5, b.y); ctx.lineTo(b.x + 9, b.y + 15); ctx.lineTo(b.x + 4.5, b.y + 10); ctx.lineTo(b.x, b.y + 15); ctx.fill(); } 
            else { ctx.beginPath(); ctx.arc(b.x, b.y, b.size || 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); } 
        });

        s.powderDrops.forEach(d => { const off = Math.sin(d.float) * 5; const dx = d.x + off + 15; const dy = d.y + 20; ctx.save(); ctx.translate(dx, dy); ctx.rotate(d.rot); ctx.strokeStyle = theme.primary; ctx.lineWidth = 2; ctx.shadowColor = theme.primary; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(-4, -4, 8, 8); for(let i=0; i<4; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 2); ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-5, -22); ctx.lineTo(5, -22); ctx.closePath(); ctx.stroke(); ctx.restore(); } ctx.restore(); });
        
        s.floatingTexts.forEach(t => { 
            ctx.globalAlpha = t.life; 
            const size = 20 * (t.scale || 1);
            ctx.font = `bold ${size}px Orbitron`; 
            ctx.fillStyle = t.color || '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(t.text, t.x, t.y); ctx.fillText(t.text, t.x, t.y); 
            ctx.globalAlpha = 1.0; 
        });
    };

    const loop = () => { 
        try {
            update(); 
            draw(); 
        } catch (e) {
            console.error("Game Loop Error:", e);
        }
        gameStateRef.current.animationId = requestAnimationFrame(loop); 
    };
    
    const start = () => {
        initAudio();
        const s = gameStateRef.current;
        s.enemies = []; s.bullets = []; s.powderDrops = []; s.floatingTexts = [];
        s.particles = []; 
        s.player = { x: 375, y: 500, width: 50, height: 50, speed: 8, lean: 0 };
        s.boss = null; s.nextBossScore = 10000; s.bossLevel = 1; s.lastBossId = null;
        s.score = 0; s.powerUpLevel = 0; s.powerUpEndTime = 0; s.bossCooldown = 0;
        
        s.lastEnemySpawn = 0;

        setGameOver(false);
        setGameStarted(true);
        isGameActiveRef.current = true;
        s.isGameActive = true; 
        
        setScore(0); setComboCount(0); setScoreSubmitted(false);
        startMusic(false);
    };

    // --- EFFECT: ONE TIME INIT ---
    useEffect(() => {
        initAudio();
        fetchLeaderboard();

        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        const handleKeyDown = (e) => {
            if (isHangarOpenRef.current || !isGameActiveRef.current) return;
            const key = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
            gameStateRef.current.keys[key] = true;
            if (key === ' ') fireBullet();
        };

        const handleKeyUp = (e) => gameStateRef.current.keys[e.key.toLowerCase()] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        gameStateRef.current.animationId = requestAnimationFrame(loop);

        return () => { 
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            stopMusic();
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            cancelAnimationFrame(gameStateRef.current.animationId);
        };
    }, []);

    return (
        <div ref={containerRef} className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center font-rajdhani overflow-hidden" style={{ backgroundColor: '#050505' }}>
             {/* HANGAR MODAL */}
             {showHangar && (
                <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
                    <div className="max-w-4xl w-full bg-black border border-cyan-500 p-8 clip-cyber relative">
                        <button onClick={() => setShowHangar(false)} className="absolute top-4 right-4 text-cyan-500 hover:text-white">[X] CLOSE</button>
                        <h2 className="text-4xl font-black text-white mb-6 text-center font-orbitron">HANGAR // CUSTOMIZE</h2>
                        <div className="text-center mb-8 text-cyan-400 font-mono tracking-widest">CREDITS: {credits}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.values(THEMES).map(theme => {
                                const isUnlocked = unlockedThemes.includes(theme.id);
                                const isEquipped = activeTheme.id === theme.id;
                                return (
                                    <div key={theme.id} className={`p-4 border ${isEquipped ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20 bg-white/5'} flex flex-col items-center gap-2 group hover:border-cyan-400 transition-all`}>
                                            <div className="w-16 h-16 rounded-full mb-2 border-2" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, borderColor: theme.primary }}></div>
                                            <h3 className="font-bold text-white text-sm">{theme.name}</h3>
                                            {isUnlocked ? (
                                                <button 
                                                    onClick={() => { setActiveTheme(theme); }} 
                                                    className={`px-4 py-1 text-xs font-bold uppercase ${isEquipped ? 'bg-yellow-400 text-black' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-400 hover:text-black'} clip-cyber-btn w-full`}
                                                >
                                                    {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleBuyTheme(theme.id)} 
                                                    className="px-4 py-1 text-xs font-bold uppercase bg-white/10 text-white hover:bg-white hover:text-black clip-cyber-btn w-full"
                                                >
                                                    BUY {theme.price}
                                                </button>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
             )}

             {/* STORY MODAL */}
             {showStory && (
                <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
                    <div className="max-w-2xl w-full bg-black border border-cyan-500 p-8 clip-cyber relative">
                        <button onClick={() => setShowStory(false)} className="absolute top-4 right-4 text-cyan-500 hover:text-white">[X] CLOSE</button>
                        <h2 className="text-3xl font-black text-white mb-6 text-center font-orbitron text-cyan-400">Protocol: Tezcatlipoca</h2>
                        <div className="space-y-4 text-gray-300 font-rajdhani text-lg leading-relaxed">
                            <p>The Year is 2099. The ancient Aztec gods were not myths, but <span className="text-yellow-400 font-bold">extraterrestrial AIs</span> dormant in the Earth's crust.</p>
                            <p>Now they have awakened, digitizing the atmosphere into a neon-soaked simulation known as '<span className="text-pink-500 font-bold">Mictlan</span>'.</p>
                            <p>You are a <span className="text-cyan-400 font-bold">Nagual</span>—a spirit hacker—piloting the last analog fighter jet. Your mission: Pierce the digital veil, defeat the God-AIs, and restore reality.</p>
                        </div>
                    </div>
                </div>
             )}

             {/* TIPS MODAL */}
             {showTips && (
                <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
                    <div className="max-w-2xl w-full bg-black border border-cyan-500 p-8 clip-cyber relative">
                        <button onClick={() => setShowTips(false)} className="absolute top-4 right-4 text-cyan-500 hover:text-white">[X] CLOSE</button>
                        <h2 className="text-3xl font-black text-white mb-6 text-center font-orbitron text-yellow-400">Tactical Database</h2>
                        <ul className="space-y-4 text-gray-300 font-rajdhani text-lg">
                            <li className="flex gap-4 items-start"><span className="text-cyan-400 font-bold">01 // OVERCLOCK:</span> <span>Hold <span className="text-white bg-white/20 px-1">[SPACE]</span> to unleash a rapid-fire barrage.</span></li>
                            <li className="flex gap-4 items-start"><span className="text-cyan-400 font-bold">02 // COMBO INTEGRITY:</span> <span>Do not let enemies cross the bottom line; it resets your combo multiplier.</span></li>
                            <li className="flex gap-4 items-start"><span className="text-cyan-400 font-bold">03 // POWER SURPLUS:</span> <span>Collect Data Drops to upgrade weapon spread.</span></li>
                            <li className="flex gap-4 items-start"><span className="text-cyan-400 font-bold">04 // SYSTEM SHOCK:</span> <span>Bosses have predictable patterns. Learn them to survive.</span></li>
                        </ul>
                    </div>
                </div>
             )}

             {/* HEADER */}
             <div className={`absolute top-0 left-0 w-full z-20 p-6 flex justify-between items-start pointer-events-none transition-all duration-300 ${isFullscreen ? 'max-w-none px-12' : 'max-w-[800px] left-1/2 -translate-x-1/2'}`}>
                <div className="pointer-events-auto flex gap-4">
                    <button onClick={onExit} className="flex items-center gap-2 text-cyan-400 hover:text-white transition-colors bg-black/50 border border-cyan-400/30 px-6 py-3 rounded-none clip-cyber-btn uppercase tracking-widest font-bold text-xs hover:bg-cyan-400/20">
                        <span className="text-xl">«</span> Return
                    </button>
                    {/* MUSIC TOGGLE BUTTON */}
                    <button onClick={toggleMusic} className={`flex items-center gap-2 transition-colors bg-black/50 border px-6 py-3 rounded-none clip-cyber-btn uppercase tracking-widest font-bold text-xs ${isMusicEnabled ? 'text-green-400 border-green-400/30 hover:bg-green-400/20' : 'text-red-400 border-red-400/30 hover:bg-red-400/20'}`}>
                        {isMusicEnabled ? '♫ ON' : '♫ OFF'}
                    </button>
                </div>
                {!isFullscreen && (
                    <div className="text-center">
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white italic font-[Orbitron] drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                            NEON<span style={{ color: activeTheme.secondary }}>STORM</span>
                        </h1>
                    </div>
                )}
                <div className="pointer-events-auto text-right flex flex-col items-end gap-4">
                    <button onClick={toggleFullscreen} className="flex items-center gap-2 text-pink-500 hover:text-white transition-colors bg-black/50 border border-pink-500/30 px-6 py-3 rounded-none clip-cyber-btn uppercase tracking-widest font-bold text-xs hover:bg-pink-500/20">
                        {isFullscreen ? '][ MINIMIZE' : '[ ] MAXIMIZE'}
                    </button>
                    <div className="bg-black/40 p-4 border border-cyan-400/20 clip-cyber-btn backdrop-blur-md">
                        <div className="flex gap-8 text-right">
                            <div><p className="text-[10px] text-cyan-400/60 uppercase font-black tracking-widest">Score</p><p className="text-4xl font-black text-white font-mono">{score}</p></div>
                            <div>
                                <div className="flex items-baseline gap-2 justify-end">
                                    <p id="combo-rank-text" className="text-4xl font-black italic text-gray-500 font-[Orbitron]">E</p>
                                    <div><p className="text-[10px] text-pink-500/60 uppercase font-black tracking-widest text-right">Combo</p><p className="text-4xl font-black text-pink-500 font-mono">{comboCount}x</p></div>
                                </div>
                                <div className="w-full h-1 bg-gray-800 mt-1"><div id="combo-timer-bar" className="h-full bg-cyan-400 w-0 transition-none shadow-[0_0_10px_#00f3ff]"></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`relative group transition-all duration-500 ${isFullscreen ? 'w-full h-full flex items-center justify-center' : 'w-auto h-auto'}`}>
                <canvas ref={canvasRef} width={800} height={600} className={`bg-black border border-cyan-400/20 transition-all duration-500 ${isFullscreen ? 'w-full h-full object-contain max-h-screen' : 'shadow-[0_0_80px_rgba(0,243,255,0.15)]'}`} />
                <div id="powerup-ui" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-300 opacity-0 pointer-events-none">
                    <span id="powerup-text" className="text-[#ffd700] font-black text-xs tracking-[0.2em] mb-1 animate-pulse">INVINCIBLE</span>
                    <div className="w-64 h-3 bg-black/60 border border-[#ffd700]/30 rounded-none overflow-hidden skew-x-12"><div id="powerup-bar" className="h-full bg-gradient-to-r from-yellow-600 to-[#ffd700]" style={{ width: '100%' }}></div></div>
                </div>
                {bossActive && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] flex flex-col items-center pointer-events-none">
                        <h2 className="text-[#ffd700] font-black text-sm uppercase tracking-widest mb-1 shadow-black drop-shadow-md">{bossName}</h2>
                        <div className="w-full h-6 bg-black/50 border-2 border-[#ffd700] rounded-none overflow-hidden skew-x-[-20deg]"><div id="boss-hp-fill" className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-none" style={{ width: '100%' }}></div></div>
                    </div>
                )}

                {/* MAIN MENU / GAME OVER UI */}
                {(!gameStarted || gameOver) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl z-30 p-8 clip-cyber border border-cyan-400/30 m-8 max-w-4xl mx-auto h-fit self-center">
                        <div className="flex flex-col items-center w-full">
                            <h2 className="text-6xl font-black text-cyan-400 mb-6 italic uppercase font-[Orbitron] tracking-tighter">{gameOver ? 'SIGNAL LOST' : 'INITIATE'}</h2>
                            
                            <div className="flex flex-col md:flex-row w-full gap-8 mb-8">
                                <div className="flex-1 bg-black/40 p-6 border border-white/10 relative">
                                    <div className="absolute top-0 left-0 w-2 h-2 bg-cyan-400"></div><div className="absolute bottom-0 right-0 w-2 h-2 bg-pink-500"></div>
                                    <div className="text-center mb-6"><p className="text-white/50 text-xs uppercase tracking-[0.2em] mb-1">Session Data</p><p className="text-5xl font-black text-white font-mono">{score}</p></div>
                                    {gameOver && !scoreSubmitted ? (
                                        <div className="space-y-4">
                                            <input type="text" placeholder="ENTER CALLSIGN" maxLength="15" className="w-full bg-white/5 border border-white/20 p-3 text-center text-white font-bold uppercase focus:outline-none focus:border-cyan-400 placeholder-white/20 font-mono tracking-wider" value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} />
                                            <button onClick={submitScore} disabled={isLoading} className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-black py-3 uppercase transition-all disabled:opacity-50 clip-cyber-btn tracking-widest">{isLoading ? 'UPLOADING...' : 'UPLOAD SCORE'}</button>
                                        </div>
                                    ) : (
                                        <div className="text-white/30 text-center text-xs font-mono uppercase">// Awaiting Combat Data</div>
                                    )}
                                </div>
                                <div className="flex-1 bg-black/40 p-6 border border-white/10 relative">
                                     <div className="absolute top-0 right-0 w-2 h-2 bg-pink-500"></div><div className="absolute bottom-0 left-0 w-2 h-2 bg-cyan-400"></div>
                                    <h3 className="text-pink-500 font-black uppercase text-xs tracking-widest mb-4 border-b border-pink-500/20 pb-2">Global Network</h3>
                                    <div className="space-y-2 h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {leaderboard.map((entry, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs group font-mono hover:bg-white/5 p-1"><span className={`font-bold ${i < 3 ? 'text-yellow-400' : 'text-white/60'}`}>{i+1}. {entry.username || "Unknown"}</span><span className="text-cyan-400">{entry.score}</span></div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <button onClick={() => setShowStory(true)} className="flex-1 bg-black/50 border border-cyan-500/30 text-cyan-400 py-3 hover:bg-cyan-900/30 transition-all font-mono text-xs uppercase tracking-widest">
                                    [ARCHIVES]
                                </button>
                                <button onClick={() => setShowTips(true)} className="flex-1 bg-black/50 border border-yellow-500/30 text-yellow-400 py-3 hover:bg-yellow-900/30 transition-all font-mono text-xs uppercase tracking-widest">
                                    [TACTICS]
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setShowHangar(true)} className="bg-white/10 hover:bg-white/20 text-cyan-400 font-black py-4 px-8 text-lg transition-all uppercase shadow-lg clip-cyber-btn tracking-widest border border-cyan-400/50">
                                    CUSTOMIZE
                                </button>
                                <button onClick={start} className="bg-white hover:bg-pink-500 hover:text-white text-black font-black py-4 px-16 text-xl transition-all uppercase shadow-[0_0_30px_rgba(255,255,255,0.1)] transform hover:scale-105 active:scale-95 clip-cyber-btn tracking-widest">
                                    {gameOver ? 'REBOOT SYSTEM' : 'BEGIN SIMULATION'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 3. GAME INITIALIZATION (THE BRIDGE)
// ==========================================
window.initGame = () => {
    const rootElement = document.getElementById('game-container');
    if (rootElement && window.ReactDOM) {
        // Clear the loading/static HTML
        const root = ReactDOM.createRoot(rootElement);
        
        // Render the React Game Component
        root.render(
            React.createElement(window.NeonStormGame, { 
                onExit: () => window.location.href = '../../index.html' 
            })
        );
    } else {
        console.error("React or Game Container not found.");
    }
};