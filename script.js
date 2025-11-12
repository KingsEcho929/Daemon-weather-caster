// Weather Dashboard with units toggle and simple caching (localStorage)
// Geocoding: Nominatim (OpenStreetMap)
// Weather: Open-Meteo
// Author: assistant (generated)

// ---- Helpers ----
const el = id => document.getElementById(id);
const setMessage = txt => { el('message').textContent = txt || ''; };

const STORAGE = {
  CACHE_PREFIX: 'weather_cache_v1:',
  SAVED_PLACES: 'weather_saved_places',
  UNIT: 'weather_unit'
};

function cacheKey(lat, lon, unit) {
  return `${STORAGE.CACHE_PREFIX}${lat.toFixed(4)}:${lon.toFixed(4)}:${unit}`;
}

function getFromCache(lat, lon, unit) {
  try {
    const key = cacheKey(lat, lon, unit);
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    // TTL 10 minutes
    if(Date.now() - parsed._ts > 10 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch(e){ return null; }
}

function putInCache(lat, lon, unit, data) {
  try {
    const key = cacheKey(lat, lon, unit);
    const payload = { _ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch(e){}
}

function savePlace(place) {
  try {
    const raw = localStorage.getItem(STORAGE.SAVED_PLACES);
    const arr = raw ? JSON.parse(raw) : [];
    // dedupe by lat/lon
    if(!arr.some(p => p.lat === place.lat && p.lon === place.lon)) {
      arr.unshift(place);
      if(arr.length > 8) arr.pop();
      localStorage.setItem(STORAGE.SAVED_PLACES, JSON.stringify(arr));
      renderSavedPlaces();
    }
  } catch(e){}
}

function loadUnit() {
  return localStorage.getItem(STORAGE.UNIT) || 'C';
}
function saveUnit(u){ localStorage.setItem(STORAGE.UNIT, u); }

// ---- DOM refs ----
const searchInput = el('search');
const searchBtn = el('searchBtn');
const locBtn = el('locBtn');
const saveBtn = el('saveBtn');
const dashboard = el('dashboard');
const placeEl = el('place');
const tempEl = el('temp');
const descEl = el('desc');
const metaEl = el('meta');
const hourlyList = el('hourlyList');
const detailsList = el('detailsList');
const savedLocationsEl = el('savedLocations');
const cBtn = el('cBtn');
const fBtn = el('fBtn');

// ---- Geocode & Weather ----
async function geocode(query){
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if(!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if(!data || data.length === 0) throw new Error('Place not found');
  const p = data[0];
  return { name: p.display_name, lat: Number(p.lat), lon: Number(p.lon) };
}

async function fetchWeather(lat, lon, unit = 'C'){
  const cached = getFromCache(lat, lon, unit);
  if(cached) return cached;

  // Open-Meteo: request current + hourly (temp, precip, weathercode)
  // We'll request temps in Celsius and convert if needed client-side for consistent labels.
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current_weather: 'true',
    hourly: 'temperature_2m,precipitation,weathercode',
    timezone: 'auto'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather API failed');
  const json = await res.json();
  putInCache(lat, lon, unit, json);
  return json;
}

// ---- Utilities ----
function cToF(c){ return c * 9/5 + 32; }
function toUnitTemp(valC, unit){ return unit === 'F' ? Math.round(cToF(valC)) : Math.round(valC); }

function weatherCodeToDesc(code){
  if(code === 0) return 'Clear';
  if([1,2,3].includes(code)) return 'Partly cloudy';
  if([45,48].includes(code)) return 'Fog';
  if(code >= 51 && code <= 67) return 'Rain';
  if(code >= 71 && code <= 86) return 'Snow';
  if([95,96,99].includes(code)) return 'Thunderstorm';
  return 'Cloudy';
}
function weatherCodeToEmoji(code){
  if(code === 0) return '☀️';
  if([1,2,3].includes(code)) return '⛅';
  if([45,48].includes(code)) return '🌫️';
  if(code >= 51 && code <= 67) return '🌧️';
  if(code >= 71 && code <= 86) return '❄️';
  if([95,96,99].includes(code)) return '⛈️';
  return '☁️';
}
function formatHourLabel(isoStr){
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

function renderSavedPlaces(){
  try {
    const raw = localStorage.getItem(STORAGE.SAVED_PLACES);
    const arr = raw ? JSON.parse(raw) : [];
    savedLocationsEl.innerHTML = '';
    if(arr.length === 0) {
      savedLocationsEl.textContent = '';
      return;
    }
    arr.slice(0,6).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'saved';
      btn.textContent = p.name.split(',')[0];
      btn.title = p.name;
      btn.onclick = () => runForCoords(p.lat, p.lon, p.name);
      savedLocationsEl.appendChild(btn);
    });
  } catch(e){}
}

// ---- Render ----
function showWeather(placeName, lat, lon, weatherJson, unit){
  dashboard.hidden = false;
  placeEl.textContent = `${placeName} • ${lat.toFixed(3)}, ${lon.toFixed(3)}`;

  const current = weatherJson.current_weather || {};
  const tC = current.temperature ?? null;
  const wc = current.weathercode ?? 0;
  tempEl.textContent = tC !== null ? `${toUnitTemp(tC, unit)}°${unit}` : '--';
  descEl.textContent = `${weatherCodeToEmoji(wc)} ${weatherCodeToDesc(wc)}`;
  const wind = current.windspeed ? `${current.windspeed} km/h` : '—';
  metaEl.textContent = `Wind: ${wind} • Time: ${current.time ?? '—'}`;

  hourlyList.innerHTML = '';
  if(weatherJson.hourly && weatherJson.hourly.time){
    const times = weatherJson.hourly.time;
    const temps = weatherJson.hourly.temperature_2m;
    const prec = weatherJson.hourly.precipitation || [];
    const codes = weatherJson.hourly.weathercode || [];
    const nowIso = current.time;
    let startIdx = 0;
    if(nowIso){
      startIdx = times.indexOf(nowIso);
      if(startIdx === -1) {
        const now = Date.now();
        startIdx = times.findIndex(t => new Date(t).getTime() > now);
        if(startIdx === -1) startIdx = 0;
      }
    }
    const end = Math.min(times.length, startIdx + 24);
    for(let i=startIdx;i<end;i++){
      const card = document.createElement('div');
      card.className = 'hour';
      const timeLabel = document.createElement('div');
      timeLabel.className = 'h-time';
      timeLabel.textContent = formatHourLabel(times[i]);
      const tVal = document.createElement('div');
      tVal.className = 'h-temp';
      tVal.textContent = temps[i] !== undefined ? `${toUnitTemp(temps[i], unit)}°${unit}` : '--';
      const pVal = document.createElement('div');
      pVal.className = 'h-prec';
      pVal.textContent = prec[i] !== undefined && prec[i] > 0 ? `${prec[i]} mm` : `${weatherCodeToEmoji(codes[i] ?? 0)} ${weatherCodeToDesc(codes[i] ?? 0)}`;
      card.appendChild(timeLabel);
      card.appendChild(tVal);
      card.appendChild(pVal);
      hourlyList.appendChild(card);
    }
  }

  detailsList.innerHTML = '';
  const dl = [
    ['Latitude', lat],
    ['Longitude', lon],
    ['Timezone', weatherJson.timezone ?? 'auto'],
    ['Model gen time (ms)', weatherJson.generationtime_ms ? `${Math.round(weatherJson.generationtime_ms)} ms` : '—'],
  ];
  dl.forEach(([k,v])=>{
    const li = document.createElement('li');
    li.textContent = `${k}: ${v}`;
    detailsList.appendChild(li);
  });

  // enable save button
  saveBtn.disabled = false;
  saveBtn.dataset.place = JSON.stringify({ name: placeName, lat, lon });
}

// ---- Runners ----
async function runForQuery(q){
  try{
    setMessage('Geocoding...');
    const place = await geocode(q);
    await runForCoords(place.lat, place.lon, place.name);
  }catch(err){
    setMessage(err.message || 'Error');
    console.error(err);
  }
}

async function runForCoords(lat, lon, name='Current location'){
  try{
    const unit = loadUnit();
    setMessage('Fetching weather...');
    // check cache
    const cached = getFromCache(lat, lon, unit);
    if(cached) {
      showWeather(name, lat, lon, cached, unit);
      setMessage('');
      return;
    }
    const weather = await fetchWeather(lat, lon, unit);
    putInCache(lat, lon, unit, weather);
    showWeather(name, lat, lon, weather, unit);
    setMessage('');
  }catch(err){
    setMessage(err.message || 'Error');
    console.error(err);
  }
}

// ---- UI events ----
searchBtn.addEventListener('click', ()=> {
  const q = searchInput.value.trim();
  if(!q) { setMessage('Please enter a place to search.'); return; }
  runForQuery(q);
});
searchInput.addEventListener('keydown', (e)=> {
  if(e.key === 'Enter') searchBtn.click();
});
locBtn.addEventListener('click', () => {
  if(!navigator.geolocation) return setMessage('Geolocation not available on this device.');
  setMessage('Locating...');
  navigator.geolocation.getCurrentPosition(pos=>{
    runForCoords(pos.coords.latitude, pos.coords.longitude, 'Current location');
  }, err=>{
    setMessage('Location access denied or unavailable.');
    console.error(err);
  }, { timeout: 8000 });
});
saveBtn.addEventListener('click', ()=>{
  try {
    const payload = JSON.parse(saveBtn.dataset.place || '{}');
    if(payload && payload.lat && payload.lon) {
      savePlace(payload);
      setMessage('Place saved.');
    }
  } catch(e){}
});

// units
function setUnitButtons(u){
  if(u === 'F'){ fBtn.classList.add('active'); cBtn.classList.remove('active'); }
  else { cBtn.classList.add('active'); fBtn.classList.remove('active'); }
}
cBtn.addEventListener('click', ()=> {
  saveUnit('C'); setUnitButtons('C');
  // re-run current display if present
  const text = placeEl.textContent;
  if(text){ const coords = text.split('•')[1]; if(coords){ const [lat,lon] = coords.split(',').map(s=>parseFloat(s)); if(lat && lon) runForCoords(lat, lon, text.split('•')[0].trim()); } }
});
fBtn.addEventListener('click', ()=> {
  saveUnit('F'); setUnitButtons('F');
  const text = placeEl.textContent;
  if(text){ const coords = text.split('•')[1]; if(coords){ const [lat,lon] = coords.split(',').map(s=>parseFloat(s)); if(lat && lon) runForCoords(lat, lon, text.split('•')[0].trim()); } }
});

// ---- Init ----
(function init(){
  setMessage('');
  renderSavedPlaces();
  setUnitButtons(loadUnit());
  // prefill sample
  searchInput.value = 'London';
})();
