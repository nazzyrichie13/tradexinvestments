document.addEventListener("DOMContentLoaded", () => {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (storedUser?.role === "admin" && token) {
    showAdminDashboard(token);
  }

  document.getElementById("adminLoginFormElement")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    try {
      const res = await fetch("https://tradexinvestments.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return alert(data.message || "Login failed");
      }

      if (data.user?.role === "admin" && data.token) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        showAdminDashboard(data.token);
      } else {
        alert("You are not authorized as admin");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
    }
  });
});

async function showAdminDashboard(token) {
  document.getElementById("adminLoginForm").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";

  try {
    const res = await fetch("https://tradexinvestments.onrender.com/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      return logout();
    }

    const users = await res.json();

    const userListDiv = document.getElementById("userList");
    userListDiv.innerHTML = "";
    users.forEach((u) => {
      const userDiv = document.createElement("div");
      userDiv.className = "user-block";
      userDiv.innerHTML = `
        <p><strong>${u.fullName}</strong> (${u.email})</p>
        <p><strong>Investment:</strong> $<input type="number" id="investmentAmount-${u._id}" value="${u.investmentAmount || 0}" /></p>
        <p><strong>Profit:</strong> $<input type="number" id="profit-${u._id}" value="${u.profit || 0}" /></p>
        <p><strong>Total Interest:</strong> $<input type="number" id="interest-${u._id}" value="${u.totalInterest || 0}" /></p>
        <button onclick="updateUser('${u._id}')">Update</button>
        <hr/>
      `;
      userListDiv.appendChild(userDiv);
    });
  } catch (err) {
    console.error(err);
    alert("Error fetching users");
  }
}

async function updateUser(userId) {
  const token = localStorage.getItem("token");
  if (!token) return logout();

  const investmentAmount = parseFloat(document.getElementById(`investmentAmount-${userId}`).value) || 0;
  const profit = parseFloat(document.getElementById(`profit-${userId}`).value) || 0;
  const totalInterest = parseFloat(document.getElementById(`interest-${userId}`).value) || 0;

  try {
    const res = await fetch(`https://tradexinvestments.onrender.com/api/admin/user/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ investmentAmount, profit, totalInterest })
    });

    const data = await res.json();

    if (!res.ok) {
      return alert(data.message || "Failed to update user");
    }

    alert("User updated successfully!");
  } catch (err) {
    console.error(err);
    alert("Error updating user");
  }
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "admin.html";
}
