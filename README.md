# Weather Dashboard (Nominatim + Open-Meteo)

A compact static weather dashboard that:
- Uses Nominatim (OpenStreetMap) for geocoding (no API key).
- Uses Open-Meteo for weather (no API key).
- Supports unit toggle (°C / °F), simple local caching (10 min TTL), and saving favorite places in localStorage.

Files:
- `index.html` — UI
- `styles.css` — Styling
- `script.js` — Geocoding + weather fetch + rendering + caching
- `README.md` — this file

How to run:
1. Place files in a directory.
2. Open `index.html` in a modern browser (static file; no server required).
3. Search a place name (e.g., "New York") or click "Use my location".
4. Use the °C/°F toggle to change units. Save places with the Save button.

Notes:
- Caching: results for a lat/lon+unit are cached in localStorage for 10 minutes to reduce API calls.
- Saved locations: stored in localStorage (up to recent 8).
- The app uses public endpoints with usage limits — for high traffic build a server-side cache or sign up for a paid API.
- Accessibility: basic ARIA roles and live regions included.

Privacy:
- No API keys required.
- Location is only used when you press "Use my location" and handled client-side.

Possible enhancements:
- Add icons (SVG sprites) replacing emoji,
- Add daily forecast and graphs,
- Add server-side caching or proxy to avoid rate limits,
- Add persisted preferences sync (account-based).

License: MIT-like (use/modify as you wish).
```
