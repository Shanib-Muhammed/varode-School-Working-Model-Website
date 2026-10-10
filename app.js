import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

// These are safe-to-use public browser settings, not secret keys.
const SUPABASE_URL = "https://iglcowsagtkasxwmsqvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aeVa71kYfaKZqW2sS3xtwg_BNUoMF6p";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const reportsElement = document.querySelector("#reports");
const messageElement = document.querySelector("#message");
const totalElement = document.querySelector("#total-count");
const latestElement = document.querySelector("#latest-date");
const refreshButton = document.querySelector("#refresh-button");

function formatDate(value) {
  if (!value) return "Time not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function makeReportCard(report) {
  const card = document.createElement("article");
  card.className = "report-card";

  const { data } = supabase.storage.from("crack-photos").getPublicUrl(report.photo_path);
  const image = document.createElement("img");
  image.className = "report-image";
  image.src = data.publicUrl;
  image.alt = "Road crack report photo";
  image.loading = "lazy";
  image.onerror = () => {
    image.removeAttribute("src");
    image.alt = "Photo unavailable";
  };

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

  body.append(tag, title, time, coords, map);
  card.append(image, body);
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
    messageElement.textContent = "Could not load reports. Check the Supabase Data API settings and browser console.";
    totalElement.textContent = "—";
    latestElement.textContent = "Unavailable";
    return;
  }

  const reports = data || [];
  totalElement.textContent = String(reports.length);
  latestElement.textContent = reports.length ? formatDate(reports[0].detected_at || reports[0].created_at) : "No reports yet";

  if (!reports.length) {
    messageElement.textContent = "Dashboard connected. No robot reports have arrived yet.";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No reports yet. When the Raspberry Pi uploads its first report, it will appear here.";
    reportsElement.append(empty);
    return;
  }

  messageElement.textContent = `Showing ${reports.length} most recent report(s).`;
  for (const report of reports) {
    reportsElement.append(makeReportCard(report));
  }
}

refreshButton.addEventListener("click", loadReports);
loadReports();

// Refresh periodically so newly uploaded reports appear automatically.
window.setInterval(loadReports, 30000);