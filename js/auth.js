let currentUser = null;

function initAuth() {
  if (!window.netlifyIdentity) return;

  netlifyIdentity.on("init", user => {
    currentUser = user;
    updateAuthUI();
  });

  netlifyIdentity.on("login", user => {
    currentUser = user;
    netlifyIdentity.close();
    updateAuthUI();
  });

  netlifyIdentity.on("logout", () => {
    currentUser = null;
    updateAuthUI();
  });

  netlifyIdentity.init();
}

function updateAuthUI() {
  document.getElementById("loginBtn").classList.toggle("hidden", !!currentUser);
  document.getElementById("logoutBtn").classList.toggle("hidden", !currentUser);
}

document.getElementById("loginBtn").onclick = () => netlifyIdentity.open();
document.getElementById("logoutBtn").onclick = () => netlifyIdentity.logout();

initAuth();
