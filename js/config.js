const ABLY_KEY = 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM'; // ← YOUR REAL KEY

window.APP_CONFIG = {
    ABLY_KEY,
    DEFAULT_CENTER: [28.5, -81.3], // Winter Park / Orlando area
    SPAWN_EXPIRE_MS: 15 * 60 * 1000,
    NEST_EXPIRE_MS: 24 * 60 * 60 * 1000
};