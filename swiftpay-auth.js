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
    #swift-auth .password-strength {
  font-size:12px;
  margin-top:7px;
  font-weight:700;
}
#swift-auth .password-strength.weak {color:#c03950;}
#swift-auth .password-strength.medium {color:#d68910;}
#swift-auth .password-strength.strong {color:#219653;}
#swift-auth .password-requirements {
  font-size:11px;
  line-height:1.9;
  margin-top:7px;
  color:#c03950;
}
#swift-auth .password-requirements .met {
  color:#219653;
  font-weight:700;
}
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
<div id="swift-password-strength" class="password-strength" hidden>
  Password strength: —
</div>
<div id="swift-password-requirements" class="password-requirements">
  <div id="req-length">✗ At least 8 characters</div>
  <div id="req-upper">✗ One uppercase letter</div>
  <div id="req-lower">✗ One lowercase letter</div>
  <div id="req-number">✗ One number</div>
</div>
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
  
function swiftAuthDialog(title, message, options = {}) {
  return new Promise(resolve => {
    const hasInput = options.input === true;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:100000;
      display:flex;align-items:center;justify-content:center;
      padding:20px;background:rgba(5,18,40,.75);
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      width:100%;max-width:360px;background:white;
      padding:24px;border-radius:20px;
      color:#172033;font-family:system-ui,sans-serif;
      box-shadow:0 15px 50px rgba(0,0,0,.25);
    `;

    const brand = document.createElement("div");
    brand.textContent = "S SwiftPay Global";
    brand.style.cssText =
      "font-size:13px;font-weight:800;color:#246bfd;margin-bottom:14px;";

    const heading = document.createElement("h3");
    heading.textContent = title;
    heading.style.cssText =
      "margin:0 0 10px;color:#102b54;font-size:20px;";

    const description = document.createElement("p");
    description.textContent = message;
    description.style.cssText =
      "margin:0 0 18px;line-height:1.6;color:#536176;";

    let input = null;

    if (hasInput) {
      input = document.createElement("input");
      input.type = options.password ? "password" : "text";
      input.placeholder = options.placeholder || "Enter here";
      input.autocomplete = "off";
      input.style.cssText = `
        width:100%;box-sizing:border-box;padding:13px;
        border:1px solid #dbe3ef;border-radius:10px;
        font-size:15px;margin-bottom:18px;
      `;
    }

    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:10px;";

    function finish(value) {
      overlay.remove();
      resolve(value);
    }

    if (hasInput) {
      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.style.cssText =
        "flex:1;padding:13px;border:1px solid #dbe3ef;border-radius:10px;background:#f1f4f9;color:#26364d;font-weight:bold;";
      cancel.onclick = () => finish(null);
      buttons.appendChild(cancel);
    }

    const ok = document.createElement("button");
    ok.textContent = options.confirmText || "OK";
    ok.style.cssText =
      "flex:1;padding:13px;border:0;border-radius:10px;background:#102b54;color:white;font-weight:bold;";
    ok.onclick = () => finish(hasInput ? input.value : true);
    buttons.appendChild(ok);

    box.append(brand, heading, description);

    if (input) box.appendChild(input);

    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    if (input) input.focus();
  });
  }
  
  const passwordInput = $("swift-password");
const strengthDisplay = $("swift-password-strength");
const requirements = {
  length: $("req-length"),
  upper: $("req-upper"),
  lower: $("req-lower"),
  number: $("req-number")
};

function updateRequirement(element, passed, label) {
  element.textContent = (passed ? "✓ " : "✗ ") + label;
  element.classList.toggle("met", passed);
}
passwordInput.addEventListener("input", () => {
  if (mode !== "signup") {
    strengthDisplay.hidden = true;
    return;
  }

  const password = passwordInput.value;
  const hasLength = password.length >= 8;
const hasUpper = /[A-Z]/.test(password);
const hasLower = /[a-z]/.test(password);
const hasNumber = /[0-9]/.test(password);

updateRequirement(requirements.length, hasLength, "At least 8 characters");
updateRequirement(requirements.upper, hasUpper, "One uppercase letter");
updateRequirement(requirements.lower, hasLower, "One lowercase letter");
updateRequirement(requirements.number, hasNumber, "One number");
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  strengthDisplay.hidden = password.length === 0;

  if (score <= 2) {
    strengthDisplay.textContent = "Password strength: Weak";
    strengthDisplay.className = "password-strength weak";
  } else if (score <= 4) {
    strengthDisplay.textContent = "Password strength: Medium";
    strengthDisplay.className = "password-strength medium";
  } else {
    strengthDisplay.textContent = "Password strength: Strong";
    strengthDisplay.className = "password-strength strong";
  }
});
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
    
$("swift-forgot-password").onclick = async () => {
  const account = readAccount();
  const email = $("swift-email").value.trim().toLowerCase();

  if (!account || account.email !== email) {
    await swiftAuthDialog(
      "Password Recovery",
      "Enter the registered email address."
    );
    return;
  }

  const newPassword = await swiftAuthDialog(
    "Create New Password",
    "Enter your new password (at least 8 characters):",
    { input: true, password: true, placeholder: "New password", confirmText: "Continue" }
  );

  if (newPassword === null) return;

  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    await swiftAuthDialog(
      "Invalid Password",
      "Password must be at least 8 characters and include uppercase, lowercase, and a number."
    );
    return;
  }

  const confirmPassword = await swiftAuthDialog(
    "Confirm New Password",
    "Enter your new password again:",
    { input: true, password: true, placeholder: "Confirm password", confirmText: "Confirm" }
  );

  if (confirmPassword === null) return;

  if (newPassword !== confirmPassword) {
    await swiftAuthDialog(
      "Password Mismatch",
      "Passwords do not match."
    );
    return;
  }

  account.passwordHash = hashPassword(newPassword);
  saveAccount(account);
  saveLoginGuard({ count: 0, lockedUntil: 0 });
  $("swift-password").value = "";

  await swiftAuthDialog(
    "Password Reset Successful",
    "Your demo password has been reset. You can now log in."
  );
};

  function setMode(next) {
    mode = next;
    $("swift-password-requirements").hidden = mode !== "signup";
    $("swift-password-strength").hidden = mode !== "signup";
$("swift-password-strength").textContent = "Password strength: —";
$("swift-password-strength").className = "password-strength";
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

inactivityTimer = setTimeout(async () => {
  clearSession();

  await swiftAuthDialog(
    "Session Expired",
    "You have been logged out due to 10 minutes of inactivity."
  );

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
      row.innerHTML = "<strong>Profile: <span id='swift-profile-name'></span></strong>";
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

changePassword.onclick = async () => {
  const current = await swiftAuthDialog(
    "Verify Current Password",
    "Enter your current password:",
    { input: true, password: true, placeholder: "Current password" }
  );

  if (current === null) return;

  const accountData = readAccount();

  if (!accountData || hashPassword(current) !== accountData.passwordHash) {
    await swiftAuthDialog(
      "Password Verification Failed",
      "Your current password is incorrect."
    );
    return;
  }

  const newPassword = await swiftAuthDialog(
    "Change Password",
    "Enter your new password. It must contain at least 8 characters, uppercase, lowercase and a number.",
    { input: true, password: true, placeholder: "New password" }
  );

  if (newPassword === null) return;

  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    await swiftAuthDialog(
      "Invalid New Password",
      "Use at least 8 characters, including uppercase, lowercase and a number."
    );
    return;
  }

  const confirmPassword = await swiftAuthDialog(
    "Confirm New Password",
    "Enter your new password again:",
    { input: true, password: true, placeholder: "Confirm password" }
  );

  if (confirmPassword === null) return;

  if (newPassword !== confirmPassword) {
    await swiftAuthDialog(
      "Password Mismatch",
      "The passwords do not match."
    );
    return;
  }

  accountData.passwordHash = hashPassword(newPassword);
  saveAccount(accountData);

  await swiftAuthDialog(
    "Password Changed Successfully",
    "Your SwiftPay Global demo password has been updated."
  );
};


const profileActions = document.createElement("div");

profileActions.style.cssText = `
  display:flex;
  flex-direction:column;
  gap:12px;
  margin-top:18px;
  width:100%;
`;

[changePassword, logout].forEach(button => {
  button.style.cssText = `
    display:block;
    width:100%;
    box-sizing:border-box;
    padding:14px 18px;
    margin:0;
    border:0;
    border-radius:12px;
    background:#102b54;
    color:#ffffff;
    font-size:15px;
    font-weight:700;
    text-align:center;
    cursor:pointer;
  `;
  profileActions.appendChild(button);
});

profile.appendChild(profileActions);
    }

    const welcome = document.querySelector("#swift-profile-name");

    if (welcome) {
      welcome.textContent = account.name;
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

