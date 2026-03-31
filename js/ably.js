let ablyInstance = null;
let channelInstance = null;

async function initializeAbly(username, team, group) {
    if (ablyInstance) return channelInstance;

    ablyInstance = new Ably.Realtime({ key: window.APP_CONFIG.ABLY_KEY, clientId: username });

    await new Promise(resolve => ablyInstance.connection.once('connected', resolve));

    const channelName = `poke-raid-${group}`;
    channelInstance = ablyInstance.channels.get(channelName);

    return channelInstance;
}

function subscribeToMessages(callback) {
    if (channelInstance) channelInstance.subscribe('message', callback);
}

function subscribeToTyping(callback) {
    if (channelInstance) channelInstance.subscribe('typing', callback);
}

function subscribeToMapReports(callback) {
    if (channelInstance) channelInstance.subscribe(['spawn', 'nest'], callback);
}

async function enterPresence(username, team) {
    if (channelInstance) await channelInstance.presence.enter({ username, team });
}