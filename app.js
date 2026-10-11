import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

// Public browser settings only. Never put service-role or robot secrets here.
const SUPABASE_URL = "https://iglcowsagtkasxwmsqvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aeVa71kYfaKZqW2sS3xtwg_BNUoMF6p";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const reportsElement = document.querySelector("#reports");
const messageElement = document.querySelector("#message");
const totalElement = document.querySelector("#total-count");
const latestElement = document.querySelector("#latest-date");
const refreshButton = document.querySelector("#refresh-button");
const modal = document.querySelector("#photo-modal");
const modalImage = document.querySelector("#modal-image");
const modalCaption = document.querySelector("#modal-caption");
const modalClose = document.querySelector("#modal-close");
const loginForm = document.querySelector("#login-form");
const ADMIN_EMAIL = "muhammedshanib912@gmail.com";
const authStatus = document.querySelector("#auth-status");
const logoutButton = document.querySelector("#logout-button");
let currentSession = null;

async function updateAuthUI() {
  const { data } = await supabase.auth.getSession();
  currentSession = data.session;
  const signedIn = Boolean(currentSession);
  const isAdmin = signedIn && (currentSession.user.email || "").toLowerCase() === ADMIN_EMAIL;
  loginForm.hidden = signedIn;
  logoutButton.hidden = !signedIn;
  authStatus.textContent = isAdmin
    ? `Signed in as ${currentSession.user.email}. Admin report deletion is enabled.`
    : signedIn
      ? `Signed in as ${currentSession.user.email}, but this account is not the authorized administrator. Reports remain view-only.`
      : "Reports are public. Enter the administrator password to manage reports.";
  document.querySelectorAll(".delete-button").forEach((button) => { button.hidden = !isAdmin; });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  // The email is fixed internally; the administrator only enters a password on the page.
  const email = ADMIN_EMAIL;
  const passwordInput = document.querySelector("#admin-password");
  const password = passwordInput.value;
  const submit = loginForm.querySelector("button[type=submit]");
  submit.disabled = true;
  authStatus.textContent = "Signing in securely…";
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    currentSession = data.session;
    if ((currentSession?.user?.email || "").toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      throw new Error("This account is not authorized as the administrator.");
    }
    passwordInput.value = "";
    authStatus.textContent = "Admin login successful.";
  } catch (error) {
    authStatus.textContent = `Login failed: ${error.message}. Check that the admin user has a password set in Supabase Auth.`;
  } finally { submit.disabled = false; }
});

logoutButton.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) authStatus.textContent = `Sign out failed: ${error.message}`;
  await updateAuthUI();
  await loadReports();
});
supabase.auth.onAuthStateChange(() => { updateAuthUI().then(loadReports); });

function formatDate(value) {
  if (!value) return "Time not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function openPhoto(url, report) {
  modalImage.src = url;
  modalImage.alt = `Photo for report #${report.id}`;
  modalCaption.textContent = `Report #${report.id} · ${formatDate(report.detected_at || report.created_at)}`;
  modal.showModal();
}

modalClose.addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.open) modal.close();
});

function makeReportCard(report) {
  const card = document.createElement("article");
  card.className = "report-card";

  const { data } = supabase.storage.from("crack-photos").getPublicUrl(report.photo_path);
  const imageButton = document.createElement("button");
  imageButton.className = "image-button";
  imageButton.type = "button";
  imageButton.setAttribute("aria-label", `Open photo for report ${report.id}`);

  const image = document.createElement("img");
  image.className = "report-image";
  image.src = data.publicUrl;
  image.alt = `Photo for report #${report.id}`;
  image.loading = "lazy";
  image.onerror = () => {
    image.removeAttribute("src");
    image.alt = "Photo unavailable";
  };
  imageButton.append(image);
  imageButton.addEventListener("click", () => openPhoto(data.publicUrl, report));

  const body = document.createElement("div");
  body.className = "report-body";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = report.detection || "CRACK DETECTED";

  const title = document.createElement("h3");
  title.textContent = `Report #${report.id}`;

  const time = document.createElement("p");
  time.className = "report-time";
  time.textContent = formatDate(report.detected_at || report.created_at);

  const coords = document.createElement("div");
  coords.className = "coords";
  coords.textContent = `Latitude: ${report.latitude} · Longitude: ${report.longitude}`;

  const map = document.createElement("a");
  map.className = "map-link";
  map.href = `https://www.google.com/maps?q=${encodeURIComponent(report.latitude)},${encodeURIComponent(report.longitude)}`;
  map.target = "_blank";
  map.rel = "noopener noreferrer";
  map.textContent = "Open location in Google Maps ↗";

  const actions = document.createElement("div");
  actions.className = "report-actions";
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete report";
  deleteButton.hidden = !currentSession;
  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `Delete report #${report.id}, its photo, and its database record? This cannot be undone.`
    );
    if (!confirmed) return;

    // Ask for a server-side admin secret only when a deletion is requested.
    // It is not stored in this page or sent to GitHub.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) { authStatus.textContent = "Please sign in with the administrator password first."; return; }

    deleteButton.disabled = true;
    deleteButton.textContent = "Deleting…";
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ action: "delete", id: report.id })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Request failed (${response.status})`);
      }
      messageElement.textContent = `Report #${report.id} and its stored photo were deleted.`;
      await loadReports();
    } catch (error) {
      console.error("Delete failed:", error);
      messageElement.textContent = `Delete failed: ${error.message}. Confirm the administrator email is authorized and signed in.`;
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete report";
    }
  });

  actions.append(deleteButton);
  body.append(tag, title, time, coords, map, actions);
  card.append(imageButton, body);
  return card;
}

async function loadReports() {
  refreshButton.disabled = true;
  messageElement.textContent = "Loading reports from Supabase…";
  reportsElement.replaceChildren();

  const { data, error } = await supabase
    .from("crack_reports")
    .select("id,detection,latitude,longitude,detected_at,created_at,photo_path")
    .order("created_at", { ascending: false })
    .limit(100);

  refreshButton.disabled = false;

  if (error) {
    console.error("Could not load reports:", error);
    messageElement.textContent = "Could not load reports. Check Supabase read access / RLS policies and the browser console.";
    totalElement.textContent = "—";
    latestElement.textContent = "Unavailable";
    return;
  }

  const reports = data || [];
  totalElement.textContent = String(reports.length);
  latestElement.textContent = reports.length
    ? formatDate(reports[0].detected_at || reports[0].created_at)
    : "No reports yet";

  if (!reports.length) {
    messageElement.textContent = "Dashboard connected. No robot reports have arrived yet.";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No reports yet. When the Raspberry Pi uploads its first report, it will appear here.";
    reportsElement.append(empty);
    return;
  }

  messageElement.textContent = `Showing ${reports.length} recent report(s). Click a photo to open it full size.`;
  for (const report of reports) reportsElement.append(makeReportCard(report));
}

refreshButton.addEventListener("click", loadReports);
updateAuthUI().then(loadReports);
window.setInterval(loadReports, 30000);
