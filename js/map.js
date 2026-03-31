let mapInstance = null;
let markers = new Map();

function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('map', { zoomControl: true, attributionControl: false }).setView(window.APP_CONFIG.DEFAULT_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);

    navigator.geolocation.getCurrentPosition(pos => {
        mapInstance.setView([pos.coords.latitude, pos.coords.longitude], 15);
    });
}

function addMapMarker(data) {
    if (Date.now() > data.expires) return;

    const iconUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonId(data.pokemon)}.png`;
    const icon = L.icon({ iconUrl, iconSize: [42, 42], popupAnchor: [0, -15] });

    const marker = L.marker([data.lat, data.lng], { icon })
        .addTo(mapInstance)
        .bindPopup(`<div class="text-center"><img src="${iconUrl}" class="mx-auto w-12 h-12"><p class="font-bold">${data.pokemon}</p><p class="text-xs">${data.type.toUpperCase()} • ${data.username}</p></div>`);

    markers.set(data.timestamp, marker);

    setTimeout(() => {
        if (markers.has(data.timestamp)) {
            mapInstance.removeLayer(markers.get(data.timestamp));
            markers.delete(data.timestamp);
        }
    }, data.expires - Date.now());
}

window.reportLocation = async function(type) {
    const pokemonName = prompt(type === 'spawn' ? "Which Pokémon spawned?" : "Which Pokémon is nesting?");
    if (!pokemonName) return;

    navigator.geolocation.getCurrentPosition(async pos => {
        const report = {
            type,
            username: currentUsername,
            team: currentTeam,
            pokemon: pokemonName.trim(),
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now(),
            expires: Date.now() + (type === 'spawn' ? window.APP_CONFIG.SPAWN_EXPIRE_MINUTES * 60 * 1000 : window.APP_CONFIG.NEST_EXPIRE_HOURS * 60 * 60 * 1000)
        };
        await channelInstance.publish(type, report);
        addMapMarker(report);
        alert(`✅ ${type.toUpperCase()} reported live!`);
    });
};

window.centerMyLocation = function() {
    if (!mapInstance) return;
    navigator.geolocation.getCurrentPosition(pos => mapInstance.setView([pos.coords.latitude, pos.coords.longitude], 16));
};