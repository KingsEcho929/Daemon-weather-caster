const form = document.getElementById('locationForm');
const input = document.getElementById('locationInput');
const output = document.getElementById('forecastOutput');
const loading = document.getElementById('loading');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  output.innerHTML = '';
  loading.style.display = 'block';

  try {
    // Geolocation lookup via Nominatim
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error('Location not found');

    const { lat, lon, display_name } = geoData[0];

    // Forecast fetch via Open-Meteo
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
    const weatherData = await weatherRes.json();

    const days = weatherData.daily.time;
    const maxTemps = weatherData.daily.temperature_2m_max;
    const minTemps = weatherData.daily.temperature_2m_min;
    const precip = weatherData.daily.precipitation_sum;

    // Render forecast
    const html = [`<h2>Forecast for ${display_name}</h2><ul class="forecast">`];
    for (let i = 0; i < days.length; i++) {
      html.push(`
        <li>
          <strong>${days[i]}</strong><br/>
          High: ${maxTemps[i]}°C<br/>
          Low: ${minTemps[i]}°C<br/>
          Precipitation: ${precip[i]} mm
        </li>
      `);
    }
    html.push('</ul>');
    output.innerHTML = html.join('');
  } catch (err) {
    output.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  } finally {
    loading.style.display = 'none';
  }
});
