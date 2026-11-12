/* SwiftPay Global — Phase 2 demo authentication */
(() => {
  const KEY = "swiftpay_demo_account_v1";
  const ATTEMPTS_KEY = "swiftpay_demo_login_attempts_v1";
  const SESSION_KEY = "swiftpay_demo_session_v1";
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 60 * 1000;

  const readLoginGuard = () => {
    try {
      return JSON.parse(
        localStorage.getItem(ATTEMPTS_KEY) || '{"count":0,"lockedUntil":0}'
      );
    } catch {
      return { count: 0, lockedUntil: 0 };
    }
  };

  const saveLoginGuard = guard =>
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(guard));
  const readAccount = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  };

  const saveAccount = account =>
    localStorage.setItem(KEY, JSON.stringify(account));
  const saveSession = () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      active: true,
      lastActivity: Date.now()
    }));
  };

  const readSession = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };
  // Demo-only password fingerprint; not secure password hashing.
  const hashPassword = password => {
    let hash = 2166136261;
    for (let i = 0; i < password.length; i++) {
      hash ^= password.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  };

  const style = document.createElement("style");
  style.textContent = `
    #swift-auth {
      min-height:100vh;display:grid;place-items:center;
      padding:24px;background:#f4f7fc;
      font-family:system-ui,sans-serif;color:#14233b;
    }
    #swift-auth .auth-card {
      width:min(100%,420px);background:white;
      border:1px solid #e7edf5;border-radius:22px;
      padding:26px;box-shadow:0 12px 40px #203b6418;
    }
    #swift-auth .brand {
      font-size:22px;font-weight:850;color:#102b54;
    }
    #swift-auth .sub {font-size:13px;color:#71809a;}
    #swift-auth label {
      display:block;font-size:12px;font-weight:750;margin:14px 0 6px;
    }
    #swift-auth input {
      width:100%;box-sizing:border-box;border:1px solid #dce4ef;
      border-radius:11px;padding:13px;font:inherit;
    }
    #swift-auth button {
      width:100%;border:0;border-radius:12px;
      background:#246bfd;color:white;font-weight:800;
      padding:14px;margin-top:18px;font:inherit;
    }
    #swift-auth .switch {
      background:white;color:#246bfd;border:1px solid #dce4ef;
      margin-top:9px;
    }
    #swift-auth .error {color:#c03950;font-size:12px;}
    #swift-auth .note {
      background:#fff8e8;padding:11px;border-radius:10px;
      font-size:11px;line-height:1.5;margin-top:17px;
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "swift-auth";
  root.innerHTML = `
    <div class="auth-card">
      <div class="brand">S SwiftPay Global</div>
      <p class="sub">Your global wallet demo starts here.</p>
      <form id="swift-form">
        <div id="name-wrap">
          <label>Full name</label>
          <input id="swift-name" placeholder="Your name" maxlength="60">
        </div>
        <label>Email address</label>
        <input id="swift-email" type="email" placeholder="you@example.com" required>
        <label>Password</label>
<input id="swift-password" type="password"
  minlength="8" placeholder="At least 8 characters" required>

<button class="switch" id="swift-toggle-password" type="button">
  Show password
</button>
<button class="switch" id="swift-forgot-password" type="button">
  Forgot password?
</button>
        <div class="error" id="swift-error" role="alert"></div>
        <button id="swift-submit">Create demo account</button>
      </form>
      <button class="switch" id="swift-switch" type="button">
        Already registered? Log in
      </button>
      <div class="note">
        Demo only: account details are stored on this device.
        Do not use a real banking password. No real payments are connected.
      </div>
    </div>
  `;
  document.body.prepend(root);

  let mode = "signup";
  const $ = id => root.querySelector("#" + id);
  $("swift-toggle-password").onclick = () => {
    const passwordField = $("swift-password");

    if (passwordField.type === "password") {
      passwordField.type = "text";
      $("swift-toggle-password").textContent = "Hide password";
    } else {
      passwordField.type = "password";
      $("swift-toggle-password").textContent = "Show password";
    }
  };
    $("swift-forgot-password").onclick = () => {
    const account = readAccount();
    const email = $("swift-email").value.trim().toLowerCase();

    if (!account || account.email !== email) {
      alert("Enter the registered email address.");
      return;
    }

    const newPassword = prompt(
      "Enter your new password (at least 8 characters):"
    );

    if (newPassword === null) return;

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    const confirmPassword = prompt("Confirm your new password:");

    if (confirmPassword === null) return;

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    account.passwordHash = hashPassword(newPassword);
    saveAccount(account);
    saveLoginGuard({ count: 0, lockedUntil: 0 });
    $("swift-password").value = "";
    alert("Demo password reset successfully. You can now log in.");
  };
  function setMode(next) {
    mode = next;
    $("name-wrap").hidden = mode !== "signup";
    $("swift-submit").textContent =
      mode === "signup" ? "Create demo account" : "Log in";
    $("swift-switch").textContent =
      mode === "signup"
        ? "Already registered? Log in"
        : "New here? Create an account";
    $("swift-error").textContent = "";
  }

  function showDashboard(account) {
        saveSession();
        // Automatic logout after 10 minutes of inactivity.
    const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
let inactivityTimer;

const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer);
  saveSession();

  inactivityTimer = setTimeout(() => {
    clearSession();
    alert("You have been logged out due to 10 minutes of inactivity.");
    location.reload();
  }, SESSION_TIMEOUT_MS);
};

const activityEvents = ["click", "touchstart", "keydown", "scroll"];

activityEvents.forEach(event => {
  document.addEventListener(event, resetInactivityTimer);
});

resetInactivityTimer();

    root.style.display = "none";

    const app = document.querySelector(".app");
    const nav = document.querySelector(".nav");

    if (app) app.style.display = "";
    if (nav) nav.style.display = "";

    // Personalize the existing Profile page.
    const profileName = document.querySelector(
      "#profile .rate-row:first-child strong"
    );

    if (profileName) {
      profileName.textContent = account.name;
    }
const profileEmail = document.createElement("p");
profileEmail.id = "swift-profile-email";
profileEmail.textContent = "Email: " + account.email;
profileEmail.style.marginTop = "6px";
profileEmail.style.fontSize = "13px";
profileEmail.style.opacity = "0.75";

if (profileName && !document.getElementById("swift-profile-email")) {
  profileName.parentElement.appendChild(profileEmail);
}
    // Add welcome message and logout button.
    const profile = document.querySelector("#profile .panel");

    if (profile && !document.querySelector("#swift-logout")) {
      const row = document.createElement("div");
      row.innerHTML = "<strong id='swift-profile-name'></strong>";
      profile.prepend(row);

      const logout = document.createElement("button");
      logout.id = "swift-logout";
      logout.className = "secondary";
      logout.textContent = "Log out";

      logout.onclick = () => {
        clearSession();
                clearTimeout(inactivityTimer);

        activityEvents.forEach(event => {
  document.removeEventListener(event, resetInactivityTimer);
});
        root.style.display = "grid";
        if (app) app.style.display = "none";
        if (nav) nav.style.display = "none";
        setMode("login");
        $("swift-email").value = account.email;
        $("swift-password").value = "";
      };

const changePassword = document.createElement("button");
changePassword.textContent = "Change Password";
changePassword.className = "secondary";

changePassword.onclick = () => {
  const current = prompt("Enter your current password:");
  if (current === null) return;

  const accountData = readAccount();

  if (!accountData || hashPassword(current) !== accountData.passwordHash) {
    alert("Current password is incorrect.");
    return;
  }

  const newPassword = prompt("Enter your new password (at least 8 characters):");
  if (newPassword === null) return;
  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    alert("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
    return;
  }
  

  const confirmPassword = prompt("Confirm your new password:");
  if (confirmPassword === null) return;

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }
  accountData.passwordHash = hashPassword(newPassword);
  saveAccount(accountData);
  alert("Demo password changed successfully.");
};

profile.appendChild(changePassword);
profile.appendChild(logout);
    }

    const welcome = document.querySelector("#swift-profile-name");

    if (welcome) {
      welcome.textContent = "Welcome, " + account.name;
    }
  }

  $("swift-switch").onclick = () =>
    setMode(mode === "signup" ? "login" : "signup");

  $("swift-form").onsubmit = async event => {
    event.preventDefault();
        if (mode === "login") {
      const guard = readLoginGuard();

      if (Date.now() < guard.lockedUntil) {
        const seconds = Math.ceil(
          (guard.lockedUntil - Date.now()) / 1000
        );

        $("swift-error").textContent =
          "Too many failed attempts. Try again in " +
          seconds + " seconds.";
        return;
      }
        }
        $("swift-error").textContent = "";

    const name = $("swift-name").value.trim();
    const email = $("swift-email").value.trim().toLowerCase();
    const password = $("swift-password").value;


    try {
      const account = readAccount();
      const passwordHash = hashPassword(password);

      if (mode === "signup") {
        if (
  password.length < 8 ||
  !/[A-Z]/.test(password) ||
  !/[a-z]/.test(password) ||
  !/[0-9]/.test(password)
) {
  $("swift-error").textContent =
    "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
  return;
        }
        if (!name) {
          $("swift-error").textContent = "Enter your name.";
          return;
        }

        if (account) {
          $("swift-error").textContent =
            "An account already exists on this device. Please log in.";
          return;
        }

        const newAccount = { name, email, passwordHash };
        saveAccount(newAccount);
        showDashboard(newAccount);
            } else {
        if (!account || account.email !== email ||
            account.passwordHash !== passwordHash) {

          const guard = readLoginGuard();
          guard.count += 1;

          if (guard.count >= MAX_LOGIN_ATTEMPTS) {
            guard.count = 0;
            guard.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
            saveLoginGuard(guard);

            $("swift-error").textContent =
              "Too many failed attempts. Login locked for 60 seconds.";
          } else {
            saveLoginGuard(guard);

            $("swift-error").textContent =
              "Email or password is incorrect. Attempts remaining: " +
              (MAX_LOGIN_ATTEMPTS - guard.count);
          }

          return;
        }

        saveLoginGuard({ count: 0, lockedUntil: 0 });
        showDashboard(account);
      }
    } catch (error) {
      $("swift-error").textContent =
        "Save failed: " + (error?.message || String(error));
    }
  };

  const app = document.querySelector(".app");
  const nav = document.querySelector(".nav");

  if (app) app.style.display = "none";
  if (nav) nav.style.display = "none";

const existing = readAccount();
const session = readSession();

if (
  existing &&
  session &&
  session.active &&
  Date.now() - session.lastActivity < 10 * 60 * 1000
) {
  showDashboard(existing);
} else {
  clearSession();

  if (existing) {
    setMode("login");
    $("swift-email").value = existing.email;
  }
}
})();

