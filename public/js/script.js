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

    try {
      const res = await fetch("https://tradexinvestments.onrender.com/api/auth/login", {
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
    } catch (error) {
      alert("Network error, please try again later.");
      console.error(error);
    }
  });
});

function showDashboard(user) {
  document.getElementById("authLinks").style.display = "none";
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("dashboardSection").style.display = "block";
  document.getElementById("profileInfo").style.display = "flex";

  document.getElementById("userName").textContent = user.fullName;
  document.getElementById("profilePhoto").src = "https://tradexinvestments.onrender.com" + user.profilePhoto;

  fetch("https://tradexinvestments.onrender.com/api/admin/users")
    .then((res) => res.json())
    .then((users) => {
      const currentUser = users.find((u) => u._id === user._id);  // fixed id property
      if (currentUser) {
        document.getElementById("investmentAmount").textContent = currentUser.investmentAmount;
        document.getElementById("profit").textContent = currentUser.profit;
        document.getElementById("totalInterest").textContent = currentUser.totalInterest;
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });
}

function logout() {
  localStorage.removeItem("user");
  location.reload();
}
