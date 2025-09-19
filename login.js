// Wait for DOM and Supabase to be ready
function initializeLogin() {
  // Check if Supabase is ready
  if (typeof supabase === "undefined") {
    console.log("Waiting for Supabase to initialize...");
    setTimeout(initializeLogin, 100);
    return;
  }

  console.log("Login initialized with Supabase");

  const loginBtn = document.getElementById("submit-btn");
  const passwordInput = document.getElementById("password");

  // Handle Enter key press
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loginBtn.click();
    }
  });

  loginBtn.addEventListener("click", async () => {
    const password = passwordInput.value.trim();

    if (!password) {
      alert("Please enter a password.");
      return;
    }

    // Disable button during login attempt
    loginBtn.disabled = true;
    loginBtn.textContent = "Checking...";

    try {
      const { data, error } = await supabase
        .from("access")
        .select("*")
        .eq("password", password)
        .single();

      if (error) {
        console.error("Login error:", error);
        alert("Incorrect password. Please try again.");
        loginBtn.disabled = false;
        loginBtn.textContent = "Enter";
        return;
      }

      if (data) {
        // Password is correct - store authentication
        sessionStorage.setItem("authenticated", "true");
        // Redirect to main app
        window.location.href = "index.html";
      } else {
        alert("Incorrect password. Please try again.");
        loginBtn.disabled = false;
        loginBtn.textContent = "Enter";
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("An error occurred. Please try again later.");
      loginBtn.disabled = false;
      loginBtn.textContent = "Enter";
    }
  });
}

// Initialize on page load
window.onload = function () {
  initializeLogin();
};
