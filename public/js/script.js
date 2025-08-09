document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.role === "user") {
    showDashboard(user);
  }

  document.getElementById("loginButton").addEventListener("click", () => {
    document.getElementById("loginForm").style.display = "block";
  });

  document.getElementById("loginFormElement")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = this.email.value;
    const password = this.password.value;

    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok && data.user.role === "user") {
      localStorage.setItem("user", JSON.stringify(data.user));
      showDashboard(data.user);
    } else {
      alert(data.message || "Login failed");
    }
  });
});

function showDashboard(user) {
  document.getElementById("authLinks").style.display = "none";
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("dashboardSection").style.display = "block";
  document.getElementById("profileInfo").style.display = "flex";

  document.getElementById("userName").textContent = user.fullName;
  document.getElementById("profilePhoto").src = "http://localhost:5000" + user.profilePhoto;

  fetch("http://localhost:5000/api/admin/users")
    .then((res) => res.json())
    .then((users) => {
      const currentUser = users.find((u) => u._id === user.id);
      if (currentUser) {
        document.getElementById("investmentAmount").textContent = currentUser.investmentAmount;
        document.getElementById("profit").textContent = currentUser.profit;
        document.getElementById("totalInterest").textContent = currentUser.totalInterest;
      }
    });
}

function logout() {
  localStorage.removeItem("user");
  location.reload();
}
