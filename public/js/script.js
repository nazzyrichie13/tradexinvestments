document.getElementById('signupForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(this);

  // Optional: basic password validation before sending
  if (!formData.get('password')) {
    alert('Password is required');
    return;
  }

  try {
    const res = await fetch('https://tradexinvestments.onrender.com/api/auth/signup', {
      method: 'POST',
      body: formData, // Send as multipart/form-data automatically
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Signup failed');
      return;
    }

    alert('Signup successful! Please login.');

    // Redirect to login page or clear form
    window.location.href = 'login-user.html'; // or your login page path

  } catch (error) {
    console.error(error);
    alert('Network error during signup');
  }
});
