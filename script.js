// script.js - Entry Point & Auth Manager

document.addEventListener('DOMContentLoaded', () => {
    console.log("System Initializing...");

    // 1. Initialize Netlify Identity
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on("init", user => {
            console.log("Auth Init:", user ? "User Found" : "Guest Mode");
        });

        window.netlifyIdentity.on("login", user => {
            console.log("User Logged In");
            window.netlifyIdentity.close();
            // Reload to ensure the game component picks up the user state cleanly
            window.location.reload(); 
        });

        window.netlifyIdentity.on("logout", () => {
            console.log("User Logged Out");
            window.location.reload();
        });
    } else {
        console.warn("Netlify Identity Widget not loaded. Check index.html");
    }

    // 2. Start the Game (Calls the function defined in neonstorm.js)
    if (window.initGame) {
        window.initGame();
    } else {
        console.error("NeonStorm game engine not found. Ensure neonstorm.js is loaded before script.js");
    }
});