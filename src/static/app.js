document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const loginDialog = document.getElementById("login-dialog");
  const closeLoginButton = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const teacherStatus = document.getElementById("teacher-status");
  const teacherName = document.getElementById("teacher-name");
  const teacherRequired = document.getElementById("teacher-required");
  let credentials = sessionStorage.getItem("teacherCredentials");

  function authHeaders() {
    return credentials ? { Authorization: `Basic ${credentials}` } : {};
  }

  function setAuthenticated(username) {
    teacherName.textContent = username;
    loginButton.classList.add("hidden");
    teacherStatus.classList.remove("hidden");
    teacherRequired.classList.add("hidden");
    signupForm.classList.remove("hidden");
    loginDialog.classList.add("hidden");
  }

  function setLoggedOut() {
    credentials = null;
    sessionStorage.removeItem("teacherCredentials");
    loginButton.classList.remove("hidden");
    teacherStatus.classList.add("hidden");
    teacherRequired.classList.remove("hidden");
    signupForm.classList.add("hidden");
  }

  function showLoginMessage(message) {
    loginMessage.textContent = message;
    loginMessage.className = "error";
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        credentials
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to teacher-only unregister buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginButton.addEventListener("click", () => {
    loginDialog.classList.remove("hidden");
    document.getElementById("username").focus();
  });

  closeLoginButton.addEventListener("click", () => {
    loginDialog.classList.add("hidden");
  });

  logoutButton.addEventListener("click", () => {
    setLoggedOut();
    fetchActivities();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const encodedCredentials = btoa(`${username}:${password}`);

    try {
      const response = await fetch("/auth/me", {
        headers: { Authorization: `Basic ${encodedCredentials}` },
      });
      const result = await response.json();

      if (!response.ok) {
        showLoginMessage(result.detail || "Invalid teacher credentials");
        return;
      }

      credentials = encodedCredentials;
      sessionStorage.setItem("teacherCredentials", credentials);
      setAuthenticated(result.username);
      loginForm.reset();
      fetchActivities();
    } catch (error) {
      showLoginMessage("Unable to log in. Please try again.");
      console.error("Error logging in:", error);
    }
  });

  async function restoreLogin() {
    if (!credentials) {
      setLoggedOut();
      return;
    }

    const response = await fetch("/auth/me", { headers: authHeaders() });
    if (response.ok) {
      const result = await response.json();
      setAuthenticated(result.username);
    } else {
      setLoggedOut();
    }
  }

  // Initialize app
  restoreLogin();
  fetchActivities();
});
