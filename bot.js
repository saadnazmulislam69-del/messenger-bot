require('dotenv').config();
const http = require('http');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const login = require('fca-eryxenx'); // Using the older library to avoid E2EE issues

// --- 1. HTTP Server (For Render) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));

// --- 2. MongoDB ---
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    await client.connect();
    db = client.db('messengerBot');
    console.log("✅ Connected to MongoDB");
}

// --- 3. Facebook Bot ---
function startBot() {
    if (!fs.existsSync('appstate.json')) {
        console.log("❌ ERROR: appstate.json not found!");
        return;
    }
    const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

    login({ appState: appState }, (err, api) => {
        if (err) return console.error("Login failed:", err);
        console.log("✅ Bot is online!");

        api.listenMqtt(async (err, event) => {
            if (err) return console.error(err);
            if (event.type !== "message") return;

            const prefix = process.env.PREFIX || "/";
            const body = event.body ? event.body.trim() : "";

            if (!body || !body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === "ping") {
                api.sendMessage("🏓 Pong! The bot is alive.", event.threadID, (err) => {
                    if (err) console.error("Send error:", err);
                });
            }

            if (command === "dbtest") {
                try {
                    const collection = db.collection('test');
                    await collection.insertOne({ time: new Date() });
                    const count = await collection.countDocuments();
                    api.sendMessage(`🗄️ MongoDB is working! Total: ${count}`, event.threadID);
                } catch (e) {
                    api.sendMessage("❌ DB error: " + e.message, event.threadID);
                }
            }
        });
    });
}

connectDB().then(() => startBot()).catch(console.error);
