document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role === "admin") {
    showAdminDashboard();
  }

  document.getElementById("adminLoginFormElement")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok && data.user.role === "admin") {
      localStorage.setItem("user", JSON.stringify(data.user));
      showAdminDashboard();
    } else {
      alert("Invalid admin credentials");
    }
  });
});

function showAdminDashboard() {
  document.getElementById("adminLoginForm").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";

  fetch("http://localhost:5000/api/admin/users")
    .then((res) => res.json())
    .then((users) => {
      const userListDiv = document.getElementById("userList");
      userListDiv.innerHTML = "";
      users.forEach((u) => {
        const userDiv = document.createElement("div");
        userDiv.className = "user-block";
        userDiv.innerHTML = `
  <p><strong>${u.fullName}</strong> (${u.email})</p>
  <p><strong>Investment:</strong> $<input type="number" id="investmentAmount-${u._id}" value="${u.investmentAmount}" /></p>
  <p><strong>Profit:</strong> $<input type="number" id="profit-${u._id}" value="${u.profit}" /></p>
  <p><strong>Total Interest:</strong> $<input type="number" id="interest-${u._id}" value="${u.totalInterest}" /></p>
  <button onclick="updateUser('${u._id}')">Update</button>
  <hr/>
`;
        userListDiv.appendChild(userDiv);
      });
    });
}

function updateUser(userId) {
  const investmentAmount = document.getElementById(`investmentAmount-${userId}`).value;
  const profit = document.getElementById(`profit-${userId}`).value;
  const totalInterest = document.getElementById(`interest-${userId}`).value;

  fetch(`http://localhost:5000/api/admin/user/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ investmentAmount, profit, totalInterest })
  })
    .then(res => res.json())
    .then(() => {
      alert("User updated successfully!");
    });
}


function logout() {
  localStorage.removeItem("user");
  window.location.href = "admin.html";
}
