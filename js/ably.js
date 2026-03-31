let ably = null;
let channel = null;

async function initializeAbly(username, team, group) {
    if (ably) return channel;

    ably = new Ably.Realtime({ key: window.APP_CONFIG.ABLY_KEY, clientId: username });

    await new Promise(resolve => ably.connection.once('connected', resolve));

    const channelName = `poke-raid-${group}`;
    channel = ably.channels.get(channelName);

    return channel;
}

function subscribeToMessages(callback) {
    if (channel) channel.subscribe('message', msg => callback(msg.data));
}

function subscribeToMapReports(callback) {
    if (channel) channel.subscribe(['spawn', 'nest'], msg => callback(msg.data));
}

async function enterPresence(username, team) {
    if (channel) await channel.presence.enter({ username, team });
}