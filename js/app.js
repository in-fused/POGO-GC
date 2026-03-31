let currentUsername = '', currentTeam = '', currentGroup = 'GLOBAL';
let channel = null;

async function joinChat() {
    const username = document.getElementById('usernameInput').value.trim();
    const group = document.getElementById('groupInput').value.trim().toUpperCase() || 'GLOBAL';

    if (!username) return alert("Trainer name required!");
    if (!currentTeam) return alert("Select your team!");

    currentUsername = username;
    currentGroup = group;

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainUI').classList.remove('hidden');

    channel = await initializeAbly(username, currentTeam, group);
    subscribeToMessages(appendMessage);
    subscribeToMapReports(addMapMarker);
    await enterPresence(username, currentTeam);

    document.getElementById('groupName').textContent = group === 'GLOBAL' ? '🌍 Global Chat' : `🔒 ${group}`;
    appendSystemMessage(`👋 Welcome, <strong>${currentUsername}</strong>! Team <span class="team-${currentTeam} px-2 py-0.5 rounded text-xs">${currentTeam.toUpperCase()}</span>`);
}

function appendMessage(data) {
    const container = document.getElementById('messagesContainer');
    const isMine = data.username === currentUsername;
    let html = '';
    if (data.type === 'raid') {
        html = `<div class="raid-card text-white rounded-3xl p-5 mx-auto max-w-xs"><div class="flex justify-between items-start"><div><div class="inline-flex items-center gap-2 bg-white/20 text-xs px-3 py-1 rounded-3xl mb-2"><i class="fas fa-dragon"></i> RAID</div><p class="font-bold text-xl">${data.boss}</p><p class="opacity-90">${data.location}</p></div><div class="text-right text-sm"><div class="font-mono">${data.time}</div><div class="mt-1 text-xs opacity-75">${data.players} needed</div></div></div><button onclick="joinRaid(this)" class="mt-4 bg-white text-red-600 px-5 py-2 rounded-2xl font-bold text-sm">JOIN RAID</button></div>`;
    } else {
        html = `<div class="flex ${isMine ? 'justify-end' : 'justify-start'}"><div class="message-bubble ${isMine ? 'bg-purple-600 text-white' : 'bg-white text-gray-800 shadow'} rounded-3xl px-5 py-3">${!isMine ? `<div class="flex items-center gap-2 text-xs mb-1"><span class="team-${data.team} text-white px-2 py-px rounded-full text-[10px]">${data.team.toUpperCase()}</span>${data.username}</div>` : ''}<p class="text-[15px]">${data.text}</p><div class="text-[10px] opacity-70 mt-1 text-right">${new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div></div></div>`;
    }
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
}

function appendSystemMessage(text) {
    const container = document.getElementById('messagesContainer');
    container.insertAdjacentHTML('beforeend', `<div class="text-center py-3"><div class="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-3xl text-sm">${text}</div></div>`);
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !channel) return;
    const msg = { username: currentUsername, team: currentTeam, text, timestamp: Date.now(), type: 'chat' };
    channel.publish('message', msg);
    appendMessage(msg);
    input.value = '';
}

function toggleRaidForm() {
    document.getElementById('raidModal').classList.toggle('hidden');
}

function postRaid() {
    const boss = document.getElementById('raidBoss').value.trim();
    const location = document.getElementById('raidLocation').value.trim();
    const time = document.getElementById('raidTime').value;
    const players = document.getElementById('raidPlayers').value;
    if (!boss || !location || !time) return alert("Fill all fields!");
    const raidData = { username: currentUsername, team: currentTeam, type: 'raid', boss, location, time, players, timestamp: Date.now() };
    channel.publish('message', raidData);
    appendMessage(raidData);
    toggleRaidForm();
}

function joinRaid(btn) {
    btn.innerHTML = `✅ Joined! <i class="fas fa-check ml-1"></i>`;
    btn.disabled = true;
}

function switchTab(tab) {
    document.getElementById('tabContent0').classList.toggle('hidden', tab !== 0);
    document.getElementById('tabContent1').classList.toggle('hidden', tab !== 1);
    document.getElementById('tab0').classList.toggle('text-purple-600', tab === 0);
    document.getElementById('tab0').classList.toggle('border-b-2', tab === 0);
    document.getElementById('tab1').classList.toggle('text-purple-600', tab === 1);
    document.getElementById('tab1').classList.toggle('border-b-2', tab === 1);
    if (tab === 1 && !map) initMap();
}

function toggleFloatingMode() {
    const mainUI = document.getElementById('mainUI');
    const toggleBtn = document.getElementById('floatingToggle');
    isFloating = !isFloating;
    if (isFloating) {
        mainUI.classList.add('floating-mode');
        toggleBtn.classList.remove('hidden');
    } else {
        mainUI.classList.remove('floating-mode');
        toggleBtn.classList.add('hidden');
    }
}

function shareGroup() {
    const msg = currentGroup === 'GLOBAL' ? "🌍 Join me in PokeRaid Global Chat!" : `🔒 Group code: ${currentGroup}`;
    navigator.clipboard.writeText(msg).then(() => alert("✅ Copied!"));
}

function leaveChat() {
    if (confirm("Leave chat?")) location.reload();
}

// Init
window.onload = async () => {
    await loadPokemonData();
    console.log('%c🚀 PokeRaid Chat - Complete multi-file version loaded!', 'color:#6C5CE7; font-weight:bold');
};