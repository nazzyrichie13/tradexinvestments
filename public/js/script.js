document.getElementById('signupForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  console.log("Signup form submitted");

  const formData = new FormData(this);

  if (!formData.get('password')) {
    alert('Password is required');
    return;
  }

  try {
    const res = await fetch('https://tradexinvestments.onrender.com/api/auth/signup', {
      method: 'POST',
      body: formData, // keep as multipart/form-data
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { message: 'Invalid server response' };
    }

    if (!res.ok) {
      alert(data.message || 'Signup failed');
      return;
    }

    alert('Signup successful! Please login.');
    window.location.href = 'login-user.html';

  } catch (error) {
    console.error(error);
    alert('Network error during signup');
  }
});
