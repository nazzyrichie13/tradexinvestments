document.addEventListener("DOMContentLoaded", () => {
  const savedUser = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (savedUser && token) {
    showDashboard(savedUser);
  }

  const loginButton = document.getElementById("loginButton");
  const loginFormElement = document.getElementById("loginFormElement");

  if (loginButton) {
    loginButton.addEventListener("click", () => {
      const loginForm = document.getElementById("loginForm");
      if (loginForm) loginForm.style.display = "block";
    });
  }

  if (loginFormElement) {
    loginFormElement.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = this.email.value.trim();
      const password = this.password.value.trim();

      try {
        const res = await fetch("https://tradexinvestments.onrender.com/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok && data.user && data.token) {
          // Store both user info and token
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("token", data.token);
          showDashboard(data.user);
        } else {
          alert(data.message || "Login failed");
        }
      } catch (error) {
        alert("Network error, please try again later.");
        console.error(error);
      }
    });
  }
});

async function showDashboard(user) {
  document.getElementById("authLinks")?.style.setProperty("display", "none");
  document.getElementById("loginForm")?.style.setProperty("display", "none");
  document.getElementById("dashboardSection")?.style.setProperty("display", "block");
  document.getElementById("profileInfo")?.style.setProperty("display", "flex");

  // Display user name
  const userNameEl = document.getElementById("userName");
  if (userNameEl) userNameEl.textContent = user.fullName || "User";

  // Display profile photo or fallback
  const profilePhotoEl = document.getElementById("profilePhoto");
  if (profilePhotoEl) {
    profilePhotoEl.src = user.profilePhoto
      ? `https://tradexinvestments.onrender.com/${user.profilePhoto.replace(/^\/?/, '')}`
      : "/default-profile.png";
  }

  // Fetch the latest user data securely
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://tradexinvestments.onrender.com/api/users/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch user data");

    const freshUser = await res.json();

    document.getElementById("investmentAmount").textContent = freshUser.investmentAmount ?? "0";
    document.getElementById("profit").textContent = freshUser.profit ?? "0";
    document.getElementById("totalInterest").textContent = freshUser.totalInterest ?? "0";
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  location.reload();
}
