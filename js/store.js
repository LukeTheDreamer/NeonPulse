document.querySelectorAll(".purchaseBtn").forEach(btn => {
  btn.onclick = async () => {
    if (!currentUser) return netlifyIdentity.open();

    const item = btn.dataset.item;
    const token = await currentUser.jwt();

    const res = await fetch("/.netlify/functions/create_checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ item })
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };
});

document.getElementById("closeStore").onclick = () => {
  document.getElementById("storeModal").classList.add("hidden");
};
