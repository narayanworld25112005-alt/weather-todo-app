/* =========================================================
   WEATHER  (Open-Meteo: free, no API key)
   1) Geocoding API: city name -> latitude/longitude
   2) Forecast API: current weather + next days for that spot
   ========================================================= */

const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city");
const weatherMsg = document.getElementById("weather-msg");
const weatherResult = document.getElementById("weather-result");

// Open-Meteo weather code -> text and emoji icon
function describe(code) {
  if (code === 0) return ["Clear sky", "☀️"];
  if (code === 1) return ["Mostly clear", "🌤️"];
  if (code === 2) return ["Partly cloudy", "⛅"];
  if (code === 3) return ["Overcast", "☁️"];
  if (code === 45 || code === 48) return ["Fog", "🌫️"];
  if (code >= 51 && code <= 57) return ["Drizzle", "🌦️"];
  if (code >= 61 && code <= 67) return ["Rain", "🌧️"];
  if (code >= 71 && code <= 77) return ["Snow", "❄️"];
  if (code >= 80 && code <= 82) return ["Rain showers", "🌧️"];
  if (code >= 95) return ["Thunderstorm", "⛈️"];
  return ["Unknown", "🌡️"];
}

// A short tip based on the weather
function makeTip(code, temp) {
  if (code >= 95) return "Thunderstorm expected. Stay indoors and finish your study tasks.";
  if (code >= 51 && code <= 82) return "Rain today. Carry an umbrella if you go out. ☔";
  if (temp >= 35) return "Very hot. Drink water and avoid the midday sun.";
  if (code === 45 || code === 48) return "Foggy outside. Take extra care while travelling.";
  if (temp <= 10) return "It’s cold. Wear something warm.";
  return "Perfect weather for outdoor activities! ☀️";
}

function formatTime(iso) {          // "2026-10-21T17:34" -> "5:34 PM"
  let [h, m] = iso.split("T")[1].split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + String(m).padStart(2, "0") + " " + ampm;
}

function showWeatherMessage(text, isError) {
  weatherMsg.textContent = text;
  weatherMsg.className = isError ? "error" : "muted";
  weatherMsg.hidden = !text;
}

async function getWeather(city) {
  showWeatherMessage("Loading...", false);
  weatherResult.hidden = true;
  try {
    // Step 1: find the city
    const geoRes = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(city));
    if (!geoRes.ok) throw new Error("network");
    const geo = await geoRes.json();
    if (!geo.results || geo.results.length === 0) {
      showWeatherMessage('No city found for "' + city + '". Check the spelling and try again.', true);
      return;
    }
    const place = geo.results[0];

    // Step 2: get the weather for those coordinates
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.latitude + "&longitude=" + place.longitude +
      "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunset&forecast_days=5&timezone=auto";
    const res = await fetch(url);
    if (!res.ok) throw new Error("network");
    const data = await res.json();
    const cur = data.current, daily = data.daily;

    // Step 3: show it
    const [text, icon] = describe(cur.weather_code);
    document.getElementById("place").textContent = "📍 " + place.name + (place.country ? ", " + place.country : "");
    document.getElementById("temp").textContent = Math.round(cur.temperature_2m);
    document.getElementById("condition").textContent = text;
    document.getElementById("icon").textContent = icon;
    document.getElementById("humidity").textContent = cur.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(cur.wind_speed_10m) + " km/h";
    document.getElementById("sunset").textContent = formatTime(daily.sunset[0]);
    document.getElementById("tip").textContent = makeTip(cur.weather_code, cur.temperature_2m);

    // Next 4 days
    const list = document.getElementById("forecast");
    list.innerHTML = "";
    for (let i = 1; i <= 4; i++) {
      const [label, ic] = describe(daily.weather_code[i]);
      const day = new Date(daily.time[i] + "T00:00").toLocaleDateString("en-US", { weekday: "short" });
      const li = document.createElement("li");
      li.innerHTML = '<div class="d"></div><div class="i" role="img"></div><div class="t"></div>';
      li.querySelector(".d").textContent = day;
      li.querySelector(".i").textContent = ic;
      li.querySelector(".i").setAttribute("aria-label", label);
      li.querySelector(".t").textContent = Math.round(daily.temperature_2m_max[i]) + "° / " + Math.round(daily.temperature_2m_min[i]) + "°";
      list.appendChild(li);
    }

    weatherResult.hidden = false;
    showWeatherMessage("", false);
    try { localStorage.setItem("lastCity", city); } catch (e) {}
  } catch (err) {
    showWeatherMessage("Could not load the weather. Check your internet connection and try again.", true);
  }
}

weatherForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) { showWeatherMessage("Type a city name first.", true); return; }
  getWeather(city);
});

document.getElementById("date").textContent =
  new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

let startCity = "Bhubaneswar";
try { startCity = localStorage.getItem("lastCity") || startCity; } catch (e) {}
cityInput.value = startCity;
getWeather(startCity);


/* =========================================================
   THEME (light / dark)
   ========================================================= */
const themeBtn = document.getElementById("theme");
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  themeBtn.setAttribute("aria-checked", t === "dark");
  try { localStorage.setItem("theme", t); } catch (e) {}
}
let savedTheme = null;
try { savedTheme = localStorage.getItem("theme"); } catch (e) {}
setTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
themeBtn.addEventListener("click", function () {
  setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});


/* =========================================================
   TO-DO LIST
   Each task: { id, text, done, due }  due = today | tomorrow | later
   Saved in localStorage so tasks stay after a refresh.
   ========================================================= */
const todoForm = document.getElementById("todo-form");
const taskInput = document.getElementById("task");
const dueSelect = document.getElementById("due");
const todoList = document.getElementById("todo-list");
const todoMsg = document.getElementById("todo-msg");
const countEl = document.getElementById("count");
const DUE_LABEL = { today: "Today", tomorrow: "Tomorrow", later: "Later" };
const TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';

let tasks = [];
let filter = "all";
let editingId = null;
try { tasks = JSON.parse(localStorage.getItem("tasks")) || []; } catch (e) { tasks = []; }
tasks.forEach(function (t) { if (!t.due) t.due = "today"; });   // older saved tasks

function save() { try { localStorage.setItem("tasks", JSON.stringify(tasks)); } catch (e) {} }

function visibleTasks() {
  return tasks.filter(function (t) {
    if (filter === "today") return t.due === "today";
    if (filter === "pending") return !t.done;
    if (filter === "completed") return t.done;
    return true;
  });
}

function render() {
  todoList.innerHTML = "";
  const shown = visibleTasks();
  if (shown.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = tasks.length === 0 ? "No tasks yet. Add your first one above." : "No tasks in this view.";
    todoList.appendChild(li);
  }
  shown.forEach(function (task) {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.done;
    check.setAttribute("aria-label", "Mark complete: " + task.text);
    check.addEventListener("change", function () { task.done = check.checked; save(); render(); });
    li.appendChild(check);

    if (editingId === task.id) {
      // Edit mode: press Enter to save, Escape to cancel
      const edit = document.createElement("input");
      edit.type = "text"; edit.className = "edit"; edit.value = task.text;
      edit.setAttribute("aria-label", "Edit task");
      edit.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          const v = edit.value.trim();
          if (!v) { todoMsg.textContent = "A task can't be empty."; return; }
          task.text = v; editingId = null; todoMsg.textContent = ""; save(); render();
        } else if (e.key === "Escape") { editingId = null; render(); }
      });
      li.appendChild(edit);
      setTimeout(function () { edit.focus(); }, 0);
    } else {
      const span = document.createElement("span");
      span.className = "text";
      span.textContent = task.text;            // textContent keeps user input safe
      span.title = "Double-click to edit";
      span.addEventListener("dblclick", function () { editingId = task.id; render(); });
      li.appendChild(span);

      const tag = document.createElement("span");
      tag.className = "tag" + (task.done ? " ok" : "");
      tag.textContent = task.done ? "✓ Completed" : DUE_LABEL[task.due];
      li.appendChild(tag);

      const del = document.createElement("button");
      del.type = "button"; del.className = "del"; del.innerHTML = TRASH;
      del.setAttribute("aria-label", "Delete task: " + task.text);
      del.addEventListener("click", function () {
        tasks = tasks.filter(function (t) { return t.id !== task.id; });
        save(); render();
      });
      li.appendChild(del);
    }
    todoList.appendChild(li);
  });

  const left = tasks.filter(function (t) { return !t.done; }).length;
  countEl.textContent = tasks.length ? left + " of " + tasks.length + " left" : "";
}

todoForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) { todoMsg.textContent = "Type a task first."; return; }
  tasks.push({ id: Date.now(), text: text, done: false, due: dueSelect.value });
  taskInput.value = ""; todoMsg.textContent = "";
  save(); render();
});

document.getElementById("add-focus").addEventListener("click", function () { taskInput.focus(); });

document.querySelectorAll(".chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
    render();
  });
});

document.getElementById("clear").addEventListener("click", function () {
  tasks = tasks.filter(function (t) { return !t.done; });
  save(); render();
});

render();
