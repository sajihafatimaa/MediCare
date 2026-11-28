(function () {
  const api = window.MediCareAPI;
  if (!api) return;
  if (!api.isLoggedIn()) { location.replace("../pages/doctor-login.html"); return; }
  document.querySelectorAll('.side-foot a[href="../pages/doctor-login.html"]').forEach(link => {
    link.addEventListener("click", async event => {
      event.preventDefault();
      try { await api.logout(); } catch (_) { localStorage.removeItem(api.tokenKey); }
      location.href = "../pages/doctor-login.html";
    });
  });
}());
