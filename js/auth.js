/* ==========================================================================
   ANIME.PLUS - AUTHENTICATION & SECURITY CONTROLLER (auth.js)
   Supports: Email OTP, Mobile Number OTP, Password Auth, Security Settings
   Authentication is handled by the server; no browser-side OTP or password simulation.
   ========================================================================== */

const IS_GITHUB_PAGES = window.location.hostname.endsWith("github.io");
const API_BASE = (window.API_BASE_URL || (
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : (IS_GITHUB_PAGES ? "" : `${window.location.origin}/api`)
)).replace(/\/+$/, "");

// Safe JSON parser to prevent crashes when server returns 404 HTML
async function safeJson(res) {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
  } catch (e) {}
  return null;
}


// High-quality anime avatar selection
const POPULAR_AVATARS = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=160&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=160&auto=format&fit=crop&q=80"
];

// Initialize page controllers
document.addEventListener("DOMContentLoaded", () => {
  initAuthTabs();
  initPasswordToggles();
  initOtpDigitInputs();
  initLoginForm();
  initRegisterForm();
  initForgotPasswordPage();
  initProfileSecurity();
  initPremiumPage();
  updateAuthUI();
});

/* ==========================================================================
   STATE & SESSION HELPERS
   ========================================================================== */

function getCurrentUser() {
  try {
    const token = getAuthToken() || "";
    if (token.startsWith("simulated_") || token.startsWith("google_jwt_")) return null;
    const userStr = localStorage.getItem("animeplus_user") || localStorage.getItem("crunchy_user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem("animeplus_token") || localStorage.getItem("crunchy_token");
}

function isUserLoggedIn() {
  return !!getCurrentUser();
}

function saveUserSession(user, token, refreshToken) {
  if (token) localStorage.setItem("animeplus_token", token);
  if (refreshToken) localStorage.setItem("animeplus_refresh_token", refreshToken);
  if (user) localStorage.setItem("animeplus_user", JSON.stringify(user));
  updateAuthUI();
}

function clearUserSession() {
  localStorage.removeItem("animeplus_token");
  localStorage.removeItem("animeplus_refresh_token");
  localStorage.removeItem("animeplus_user");
  localStorage.removeItem("crunchy_token");
  localStorage.removeItem("crunchy_refresh_token");
  localStorage.removeItem("crunchy_user");
}

async function logoutUser() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }
  clearUserSession();
  showToast("Logged out successfully", "info");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 600);
}

/* ==========================================================================
   OTP ENGINE (EMAIL & MOBILE)
   ========================================================================== */

// OTPs must be delivered and checked by the backend. Never simulate a code in the browser.
async function sendEmailOtp(email, purpose = "login") {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return false;
  }

  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), type: "email", purpose })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message || "Could not send the verification code.");
    showToast(data?.message || `Check ${email} for your verification code.`, "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service. Please try again.", "error");
    return false;
  }
}

// 2. Verify Email OTP & Login
async function verifyEmailOtp(email, otp, name = "") {
  if (!otp || otp.length !== 6) {
    showToast("Please enter the 6-digit OTP code", "error");
    return false;
  }

  const finalName = name.trim() || email.split("@")[0];

  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), otp, type: "email", name: finalName })
    });
    const data = await safeJson(res);
    if (!res.ok || !data?.user || !data.token) throw new Error(data?.message || "The code could not be verified.");
    saveUserSession(data.user, data.token, data.refreshToken);
    showToast("Verification successful! Welcome to ANIME.PLUS", "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service. Please try again.", "error");
    return false;
  }
}

// 3. Send OTP to Mobile Number
async function sendMobileOtp(phone, countryCode = "+91", channel = "sms", purpose = "login") {
  const fullPhone = `${countryCode || ""}${phone.trim()}`.replace(/[\s()-]/g, "");
  const channelLabel = "SMS";

  if (!phone || phone.trim().length < 6) {
    showToast("Please enter a valid mobile number", "error");
    return false;
  }

  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone, type: "mobile", channel, purpose })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message || `Could not send the ${channelLabel} code.`);
    showToast(data?.message || `Check your ${channelLabel} messages for the code.`, "success");
    return true;
  } catch (error) {
    showToast(error.message || `Could not reach the ${channelLabel} service. Please try again.`, "error");
    return false;
  }
}

// 4. Verify Mobile OTP & Login
async function verifyMobileOtp(phone, countryCode = "+91", otp, name = "") {
  const fullPhone = `${countryCode || ""}${phone.trim()}`.replace(/[\s()-]/g, "");
  if (!otp || otp.length !== 6) {
    showToast("Please enter the complete 6-digit OTP code", "error");
    return false;
  }

  const phoneDigits = fullPhone.replace(/\D/g, "");
  const finalName = name.trim() || `Otaku_${phoneDigits.slice(-4)}`;
  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone, otp, type: "mobile", name: finalName })
    });
    const data = await safeJson(res);
    if (!res.ok || !data?.user || !data.token) throw new Error(data?.message || "The code could not be verified.");
    saveUserSession(data.user, data.token, data.refreshToken);
    showToast("Phone verified! Welcome to ANIME.PLUS", "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service. Please try again.", "error");
    return false;
  }
}

// 5. Password Login
async function loginWithPassword(emailOrPhone, password) {
  if (!emailOrPhone || !password) {
    showToast("Please enter email/phone and password", "error");
    return false;
  }
  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailOrPhone, password })
    });
    const data = await safeJson(res);
    if (!res.ok || !data?.user || !data.token) throw new Error(data?.message || "Could not sign in.");
    saveUserSession(data.user, data.token, data.refreshToken);
    showToast("Welcome back to ANIME.PLUS!", "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service. Please try again.", "error");
    return false;
  }
}

function loginWithGoogle() {
  showToast("Google sign-in is not connected yet. Use email or phone verification.", "info");
}

async function registerUser(name, dob, email, phone, password, confirmPassword) {
  if (!name || !email || !password) {
    showToast("Please fill in all required fields", "error");
    return false;
  }
  if (password.length < 6) {
    showToast("Please enter a password with at least 6 characters", "error");
    return false;
  }
  if (password !== confirmPassword) {
    showToast("Passwords do not match", "error");
    return false;
  }
  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dob, email, phone, password, confirmPassword })
    });
    const data = await safeJson(res);
    if (!res.ok || !data?.user || !data.token) throw new Error(data?.message || "Could not create your account.");
    saveUserSession(data.user, data.token, data.refreshToken);
    showToast(`Account created for ${name}!`, "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service. Please try again.", "error");
    return false;
  }
}

/* ========================================================================
   PASSWORD MANAGEMENT (CHANGE, SET, FORGOT)
   ======================================================================== */
// 7. Change Existing Password
async function changePassword(oldPassword, newPassword, confirmPassword) {
  if (!oldPassword || !newPassword || !confirmPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
    showToast("Check the password fields and make sure the new passwords match.", "error");
    return false;
  }
  const token = getAuthToken();
  if (!token || !API_BASE) {
    showToast("Sign in again to change your password.", "error");
    return false;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message || "Could not change your password.");
    showToast("Password updated successfully!", "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service.", "error");
    return false;
  }
}

// 8. Set Password for OTP-registered user
async function setPassword(newPassword, confirmPassword) {
  if (!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
    showToast("Check the password fields and make sure the new passwords match.", "error");
    return false;
  }
  const token = getAuthToken();
  if (!token || !API_BASE) {
    showToast("Sign in again to set a password.", "error");
    return false;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/set-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message || "Could not set your password.");
    showToast("Password has been set successfully!", "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service.", "error");
    return false;
  }
}

// 9. Reset Password with OTP (Forgot Password Flow)
async function resetPasswordWithOtp(target, otp, newPassword, confirmPassword) {
  if (!target || !otp || !newPassword || newPassword !== confirmPassword) {
    showToast("Check the code and make sure the new passwords match.", "error");
    return false;
  }
  if (!API_BASE) {
    showToast("Secure sign-in is not configured for this site yet.", "error");
    return false;
  }
  const normalizedTarget = target.includes("@") ? target.trim().toLowerCase() : target.replace(/[\s()-]/g, "");
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: normalizedTarget, otp, newPassword, confirmPassword })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message || "Could not reset the password.");
    showToast("Password reset successfully! Please log in.", "success");
    return true;
  } catch (error) {
    showToast(error.message || "Could not reach the sign-in service.", "error");
    return false;
  }
}

/* ========================================================================
   UI INTERACTION & TAB CONTROLLERS
   ======================================================================== */
/* ==========================================================================
   UI INTERACTION & TAB CONTROLLERS
   ========================================================================== */

// Auth Method Tab Switching
function initAuthTabs() {
  const tabs = document.querySelectorAll(".auth-tab-btn");
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetPaneId = tab.getAttribute("data-tab");
      document.querySelectorAll(".auth-pane").forEach(pane => {
        pane.classList.remove("active");
      });

      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) {
        targetPane.classList.add("active");
        const firstInput = targetPane.querySelector("input:not([type=hidden])");
        if (firstInput) firstInput.focus();
      }
    });
  });
}

// Show/Hide Password Toggle Buttons
function initPasswordToggles() {
  document.querySelectorAll(".password-toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const wrapper = btn.closest(".password-input-wrapper");
      if (!wrapper) return;
      const input = wrapper.querySelector("input");
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      btn.innerHTML = isPassword 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  });
}

// 6-Digit OTP Box Auto-Advance, Backspace & Paste
function initOtpDigitInputs() {
  document.querySelectorAll(".otp-digits-container").forEach(container => {
    const inputs = Array.from(container.querySelectorAll(".otp-digit-input"));

    inputs.forEach((input, idx) => {
      input.addEventListener("input", (e) => {
        const val = input.value.replace(/\D/g, "");
        input.value = val ? val[0] : "";

        if (input.value) {
          input.classList.add("filled");
          if (idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          }
        } else {
          input.classList.remove("filled");
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = "";
          inputs[idx - 1].classList.remove("filled");
        }
      });

      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (!pasted) return;

        inputs.forEach((inp, i) => {
          if (pasted[i]) {
            inp.value = pasted[i];
            inp.classList.add("filled");
          }
        });

        const nextFocus = inputs[Math.min(pasted.length, inputs.length - 1)];
        if (nextFocus) nextFocus.focus();
      });
    });
  });
}

function getOtpCodeFromContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return "";
  const inputs = container.querySelectorAll(".otp-digit-input");
  return Array.from(inputs).map(i => i.value.trim()).join("");
}

function clearOtpInputs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll(".otp-digit-input").forEach(inp => {
    inp.value = "";
    inp.classList.remove("filled");
  });
  const first = container.querySelector(".otp-digit-input");
  if (first) first.focus();
}

// Countdown Timer Handler
function startCountdownTimer(timerId, resendBtnId, seconds = 60) {
  const timerEl = document.getElementById(timerId);
  const resendBtn = document.getElementById(resendBtnId);
  if (!timerEl) return;

  if (resendBtn) resendBtn.disabled = true;
  let remaining = seconds;
  timerEl.textContent = `Resend code in ${remaining}s`;

  const interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      timerEl.textContent = `Resend code in ${remaining}s`;
    } else {
      clearInterval(interval);
      timerEl.textContent = "Code expired. You can resend now.";
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);

  return interval;
}

/* ==========================================================================
   PAGE-SPECIFIC INITIALIZATIONS
   ========================================================================== */

// 1. LOGIN PAGE CONTROLLER
function initLoginForm() {
  // A. Email OTP Form
  const sendEmailOtpBtn = document.getElementById("sendEmailOtpBtn");
  const emailInput = document.getElementById("emailOtpInput");
  const emailOtpStep = document.getElementById("emailOtpStep");
  const emailVerifyStep = document.getElementById("emailVerifyStep");
  const emailDisplaySpan = document.getElementById("displayTargetEmail");
  const verifyEmailOtpBtn = document.getElementById("verifyEmailOtpBtn");
  const backToEmailBtn = document.getElementById("backToEmailBtn");
  const resendEmailOtpBtn = document.getElementById("resendEmailOtpBtn");

  if (sendEmailOtpBtn && emailInput) {
    sendEmailOtpBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim().toLowerCase();
      if (!email) {
        showToast("Please enter your email", "error");
        return;
      }

      sendEmailOtpBtn.disabled = true;
      sendEmailOtpBtn.textContent = "SENDING...";
      const success = await sendEmailOtp(email);
      sendEmailOtpBtn.disabled = false;
      sendEmailOtpBtn.textContent = "SEND EMAIL OTP";

      if (success) {
        if (emailDisplaySpan) emailDisplaySpan.textContent = email;
        if (emailOtpStep) emailOtpStep.classList.add("hidden");
        if (emailVerifyStep) emailVerifyStep.classList.remove("hidden");
        clearOtpInputs("emailOtpDigits");
        startCountdownTimer("emailOtpTimer", "resendEmailOtpBtn", 60);
      }
    });
  }

  if (verifyEmailOtpBtn && emailInput) {
    verifyEmailOtpBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = (document.getElementById("emailNameInput")?.value || "").trim();
      const email = emailInput.value.trim().toLowerCase();
      const otp = getOtpCodeFromContainer("emailOtpDigits");

      if (!otp || otp.length !== 6) {
        showToast("Please enter the complete 6-digit OTP code", "error");
        return;
      }

      verifyEmailOtpBtn.disabled = true;
      verifyEmailOtpBtn.textContent = "VERIFYING...";
      const success = await verifyEmailOtp(email, otp, name);
      verifyEmailOtpBtn.disabled = false;
      verifyEmailOtpBtn.textContent = "VERIFY & LOGIN";

      if (success) {
        setTimeout(() => window.location.href = "index.html", 800);
      }
    });
  }

  if (backToEmailBtn) {
    backToEmailBtn.addEventListener("click", () => {
      if (emailVerifyStep) emailVerifyStep.classList.add("hidden");
      if (emailOtpStep) emailOtpStep.classList.remove("hidden");
      if (emailInput) emailInput.focus();
    });
  }

  if (resendEmailOtpBtn && emailInput) {
    resendEmailOtpBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim().toLowerCase();
      const ok = await sendEmailOtp(email);
      if (ok) {
        clearOtpInputs("emailOtpDigits");
        startCountdownTimer("emailOtpTimer", "resendEmailOtpBtn", 60);
      }
    });
  }

  // B. Mobile OTP Form & Channel Selector
  const sendMobileOtpBtn = document.getElementById("sendMobileOtpBtn");
  const phoneInput = document.getElementById("phoneInput");
  const countrySelect = document.getElementById("countryCodeSelect");
  const mobileOtpStep = document.getElementById("mobileOtpStep");
  const mobileVerifyStep = document.getElementById("mobileVerifyStep");
  const phoneDisplaySpan = document.getElementById("displayTargetPhone");
  const verifyMobileOtpBtn = document.getElementById("verifyMobileOtpBtn");
  const backToMobileBtn = document.getElementById("backToMobileBtn");
  const resendMobileOtpBtn = document.getElementById("resendMobileOtpBtn");
  const channelGroup = document.getElementById("mobileOtpChannelGroup");

  let selectedChannel = "sms";

  if (channelGroup) {
    const channelBtns = channelGroup.querySelectorAll(".channel-pill-btn");
    channelBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        channelBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedChannel = btn.getAttribute("data-channel") || "sms";
      });
    });
  }

  // Format phone input on typing
  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/[^\d\s]/g, "");
    });
  }

  if (sendMobileOtpBtn && phoneInput) {
    sendMobileOtpBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const phone = phoneInput.value.replace(/\s+/g, "").trim();
      const countryCode = countrySelect ? countrySelect.value : "+91";

      if (!phone || phone.length < 6) {
        showToast("Please enter a valid 10-digit mobile number", "error");
        return;
      }

      const channelName = selectedChannel === "whatsapp" ? "WhatsApp" : "SMS";
      sendMobileOtpBtn.disabled = true;
      sendMobileOtpBtn.textContent = `SENDING VIA ${channelName.toUpperCase()}...`;
      const success = await sendMobileOtp(phone, countryCode, selectedChannel);
      sendMobileOtpBtn.disabled = false;
      sendMobileOtpBtn.textContent = "SEND MOBILE OTP";

      if (success) {
        if (phoneDisplaySpan) phoneDisplaySpan.textContent = `${countryCode} ${phone} (${channelName})`;
        if (mobileOtpStep) mobileOtpStep.classList.add("hidden");
        if (mobileVerifyStep) mobileVerifyStep.classList.remove("hidden");
        clearOtpInputs("mobileOtpDigits");
        startCountdownTimer("mobileOtpTimer", "resendMobileOtpBtn", 60);
      }
    });
  }

  if (verifyMobileOtpBtn && phoneInput) {
    verifyMobileOtpBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = (document.getElementById("mobileNameInput")?.value || "").trim();
      const phone = phoneInput.value.trim();
      const countryCode = countrySelect ? countrySelect.value : "+91";
      const otp = getOtpCodeFromContainer("mobileOtpDigits");

      if (!otp || otp.length !== 6) {
        showToast("Please enter the complete 6-digit OTP code", "error");
        return;
      }

      verifyMobileOtpBtn.disabled = true;
      verifyMobileOtpBtn.textContent = "VERIFYING...";
      const success = await verifyMobileOtp(phone, countryCode, otp, name);
      verifyMobileOtpBtn.disabled = false;
      verifyMobileOtpBtn.textContent = "VERIFY & LOGIN";

      if (success) {
        setTimeout(() => window.location.href = "index.html", 800);
      }
    });
  }

  if (backToMobileBtn) {
    backToMobileBtn.addEventListener("click", () => {
      if (mobileVerifyStep) mobileVerifyStep.classList.add("hidden");
      if (mobileOtpStep) mobileOtpStep.classList.remove("hidden");
      if (phoneInput) phoneInput.focus();
    });
  }

  if (resendMobileOtpBtn && phoneInput) {
    resendMobileOtpBtn.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();
      const countryCode = countrySelect ? countrySelect.value : "+91";
      const ok = await sendMobileOtp(phone, countryCode, selectedChannel);
      if (ok) {
        clearOtpInputs("mobileOtpDigits");
        startCountdownTimer("mobileOtpTimer", "resendMobileOtpBtn", 60);
      }
    });
  }

  // C. Password Login Form
  const passwordLoginForm = document.getElementById("passwordLoginForm");
  if (passwordLoginForm) {
    passwordLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idInput = document.getElementById("loginIdentifier");
      const passInput = document.getElementById("loginPassword");
      if (!idInput || !passInput) return;

      const success = await loginWithPassword(idInput.value.trim(), passInput.value.trim());
      if (success) {
        setTimeout(() => window.location.href = "index.html", 800);
      }
    });
  }

  // D. Google Social Login Button
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginWithGoogle();
    });
  }

  // E. Guest Login Button
  const guestLoginBtn = document.getElementById("guestLoginBtn");
  if (guestLoginBtn) {
    guestLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const guestUser = {
        id: "usr_guest_demo",
        name: "ShadowHunter",
        email: "guest@ANIME.PLUS",
        phone: "",
        dob: "2000-01-01",
        avatar: POPULAR_AVATARS[1],
        tier: "MEGA FAN VIP",
        joinedDate: "August 2026",
        authMethod: "guest"
      };
      saveUserSession(guestUser, "guest_token_demo", "guest_refresh");
      showToast("Logged in as ANIME.PLUS Guest Explorer!", "success");
      setTimeout(() => window.location.href = "index.html", 700);
    });
  }
}

// 2. REGISTER PAGE CONTROLLER
function initRegisterForm() {
  const registerForm = document.getElementById("registerForm");
  const googleRegisterBtn = document.getElementById("googleRegisterBtn");

  if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginWithGoogle();
    });
  }

  if (!registerForm) return;

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (document.getElementById("regName")?.value || "").trim();
    const dob = (document.getElementById("regDob")?.value || "").trim();
    const email = (document.getElementById("regEmail")?.value || "").trim();
    const phone = (document.getElementById("regPhone")?.value || "").trim();
    const pass = (document.getElementById("regPassword")?.value || "").trim();
    const confirm = (document.getElementById("regConfirmPassword")?.value || "").trim();

    const ok = await registerUser(name, dob, email, phone, pass, confirm);
    if (ok) {
      setTimeout(() => window.location.href = "index.html", 900);
    }
  });
}

// 3. FORGOT PASSWORD CONTROLLER
function initForgotPasswordPage() {
  const forgotForm = document.getElementById("forgotPasswordForm");
  const sendResetOtpBtn = document.getElementById("sendResetOtpBtn");
  const resetTargetInput = document.getElementById("resetTargetInput");
  const resetOtpStep = document.getElementById("resetOtpStep");
  const newPasswordStep = document.getElementById("newPasswordStep");
  const resendResetOtpBtn = document.getElementById("resendResetOtpBtn");
  const submitNewPasswordBtn = document.getElementById("submitNewPasswordBtn");

  if (sendResetOtpBtn && resetTargetInput) {
    sendResetOtpBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const target = resetTargetInput.value.trim();
      if (!target) {
        showToast("Please enter your registered email or phone", "error");
        return;
      }

      sendResetOtpBtn.disabled = true;
      sendResetOtpBtn.textContent = "SENDING...";
      const ok = target.includes("@") ? await sendEmailOtp(target, "password_reset") : await sendMobileOtp(target, "", "sms", "password_reset");
      sendResetOtpBtn.disabled = false;
      sendResetOtpBtn.textContent = "SEND RESET CODE";

      if (ok) {
        if (resetOtpStep) resetOtpStep.classList.remove("hidden");
        if (newPasswordStep) newPasswordStep.classList.remove("hidden");
        clearOtpInputs("resetOtpDigits");
        startCountdownTimer("resetOtpTimer", "resendResetOtpBtn", 60);
      }
    });
  }

  if (resendResetOtpBtn && resetTargetInput) {
    resendResetOtpBtn.addEventListener("click", async () => {
      const target = resetTargetInput.value.trim();
      const ok = target.includes("@")
        ? await sendEmailOtp(target, "password_reset")
        : await sendMobileOtp(target, "", "sms", "password_reset");
      if (ok) {
        clearOtpInputs("resetOtpDigits");
        startCountdownTimer("resetOtpTimer", "resendResetOtpBtn", 60);
      }
    });
  }

  if (submitNewPasswordBtn && resetTargetInput) {
    submitNewPasswordBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const target = resetTargetInput.value.trim();
      const otp = getOtpCodeFromContainer("resetOtpDigits");
      const newPass = document.getElementById("newPasswordInput")?.value || "";
      const confirmPass = document.getElementById("confirmNewPasswordInput")?.value || "";

      if (!otp || otp.length !== 6) {
        showToast("Please enter the 6-digit OTP code", "error");
        return;
      }

      const ok = await resetPasswordWithOtp(target, otp, newPass, confirmPass);
      if (ok) {
        setTimeout(() => window.location.href = "login.html", 1000);
      }
    });
  }
}

// 4. PROFILE & SECURITY CONTROLLER
function initProfileSecurity() {
  const user = getCurrentUser();
  const profileNameEl = document.getElementById("profileUserName");
  const profileEmailEl = document.getElementById("profileUserEmail");
  const profilePhoneEl = document.getElementById("profileUserPhone");
  const profileDobEl = document.getElementById("profileUserDob");
  const profileTierEl = document.getElementById("profileUserTier");
  const profileAvatarImg = document.getElementById("profileAvatarImg");
  const avatarGrid = document.getElementById("avatarPickerGrid");
  const logoutBtn = document.getElementById("profileLogoutBtn");
  const changePasswordForm = document.getElementById("changePasswordForm");

  const editProfileInfoForm = document.getElementById("editProfileInfoForm");
  const editProfileNameInput = document.getElementById("editProfileName");
  const editProfileDobInput = document.getElementById("editProfileDob");

  if (user) {
    if (profileNameEl) profileNameEl.textContent = user.name || "AnimeFan";
    if (profileEmailEl) profileEmailEl.textContent = user.email || "No email set";
    if (profilePhoneEl) profilePhoneEl.textContent = user.phone || "No phone linked";
    if (profileDobEl) profileDobEl.textContent = `🎂 DOB: ${user.dob || "Not Specified"}`;
    if (profileTierEl) profileTierEl.textContent = user.tier || "MEGA FAN VIP";
    if (profileAvatarImg && user.avatar) profileAvatarImg.src = user.avatar;

    if (editProfileNameInput) editProfileNameInput.value = user.name || "";
    if (editProfileDobInput && user.dob && user.dob !== "Not Specified") editProfileDobInput.value = user.dob;
  }

  if (editProfileInfoForm) {
    editProfileInfoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      let currentUser = getCurrentUser();
      if (!currentUser) {
        showToast("Please log in to update profile", "error");
        return;
      }

      const newName = editProfileNameInput ? editProfileNameInput.value.trim() : "";
      const newDob = editProfileDobInput ? editProfileDobInput.value : "";

      if (!newName) {
        showToast("Name cannot be empty", "error");
        return;
      }

      currentUser.name = newName;
      currentUser.dob = newDob || "Not Specified";

      localStorage.setItem("animeplus_user", JSON.stringify(currentUser));

      if (profileNameEl) profileNameEl.textContent = currentUser.name;
      if (profileDobEl) profileDobEl.textContent = `🎂 DOB: ${currentUser.dob}`;

      updateAuthUI();
      showToast("Name & Date of Birth updated successfully!", "success");
    });
  }

  if (avatarGrid) {
    avatarGrid.innerHTML = POPULAR_AVATARS.map((src, idx) => `
      <div class="avatar-option ${user && user.avatar === src ? 'selected' : ''}" onclick="selectProfileAvatar('${src}')">
        <img src="${src}" alt="Avatar ${idx + 1}">
      </div>
    `).join("");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPass = document.getElementById("currentPassword")?.value || "";
      const newPass = document.getElementById("newProfilePassword")?.value || "";
      const confirmPass = document.getElementById("confirmProfilePassword")?.value || "";

      const ok = await changePassword(currentPass, newPass, confirmPass);
      if (ok) {
        changePasswordForm.reset();
      }
    });
  }
}

function selectProfileAvatar(src) {
  let user = getCurrentUser();
  if (!user) {
    showToast("Please log in first", "error");
    return;
  }

  user.avatar = src;
  localStorage.setItem("animeplus_user", JSON.stringify(user));
  const profileImg = document.getElementById("profileAvatarImg");
  if (profileImg) profileImg.src = src;

  document.querySelectorAll(".avatar-option").forEach(opt => {
    const img = opt.querySelector("img");
    if (img && img.src === src) opt.classList.add("selected");
    else opt.classList.remove("selected");
  });

  showToast("Avatar updated successfully!", "success");
  updateAuthUI();
}

// 5. PREMIUM TRIAL BUTTONS
function initPremiumPage() {
  document.querySelectorAll(".start-trial-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan") || "Mega Fan";
      let user = getCurrentUser();
      if (!user) {
        window.location.href = "login.html";
        return;
      }

      user.tier = plan.toUpperCase() + " VIP";
      localStorage.setItem("animeplus_user", JSON.stringify(user));
      showToast(`Activated 14-Day Free Trial for ${plan}!`, "success");
      setTimeout(() => window.location.href = "index.html", 1000);
    });
  });
}

