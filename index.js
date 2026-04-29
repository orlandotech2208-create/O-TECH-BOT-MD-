import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.join(__dirname, 'commands');
const mediaDir = path.join(__dirname, 'media');
const sessionDir = './sessionData';

if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);
if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir);
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);

console.clear();
console.log('\x1b[36m╔════════════════════════════╗\x1b[0m');
console.log('\x1b[36m║  \x1b[1m\x1b[37m  O-TECH BOT by Orlando \x1b[0m\x1b[36m ║\x1b[0m');
console.log('\x1b[36m╚════════════════════════════╝\x1b[0m\n');

async function loadCommands() {
    const commands = new Map();
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    console.log('┌─ CHARGEMENT COMMANDES');
    for (const file of files) {
        try {
            const mod = await import(`file://${path.join(commandsDir, file)}?t=${Date.now()}`);
            if (mod.default?.name) {
                commands.set(mod.default.name, mod.default);
                console.log(`│  ✓ ${mod.default.name}`);
            }
        } catch (e) {
            console.log(`│  ✗ ${file}: ${e.message}`);
        }
    }
    console.log(`└─ ${commands.size} commandes chargées\n`);
    return commands;
}

async function askNumber() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question('📱 Numéro (ex: 50935443504): ', ans => {
            rl.close();
            resolve(ans.trim());
        });
    });
}

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const commands = await loadCommands();
    const prefix = config.config.prefix || '!';

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut) {
                console.log('\x1b[31m✗ Session expirée. Supprime sessionData et relance.\x1b[0m');
            } else {
                console.log(`\x1b[33m⟳ Reconnexion dans 3s... (code: ${code})\x1b[0m`);
                setTimeout(() => startBot(), 3000);
            }
        } else if (connection === 'open') {
            console.log('\x1b[32m✅ O-TECH BOT CONNECTÉ !\x1b[0m\n');
            try {
                const imgPath = path.join(mediaDir, 'menu.jpg');
                const txt = `╭━━━ *o-tech bot* ━━━\n┃\n┃ ✅ *Connecté !*\n┃ 📦 *${commands.size} commandes*\n┃ 👤 *Créé par Orlando*\n┃\n┃ Tape *${prefix}menu*\n┃\n╰━━━━━━━━━━━━━━━`;
                if (fs.existsSync(imgPath)) {
                    await sock.sendMessage(config.config.ownerJid, { image: { url: imgPath }, caption: txt });
                } else {
                    await sock.sendMessage(config.config.ownerJid, { text: txt });
                }
            } catch(e) { console.log('⚠ Bienvenue:', e.message); }
        }
    });

    setTimeout(async () => {
        if (!state.creds.registered) {
            const num = await askNumber();
            try {
                const code = await sock.requestPairingCode(num);
                console.log(`\n\x1b[32m┌─ CODE D'APPAIRAGE\x1b[0m`);
                console.log(`\x1b[33m│  👉 ${code}\x1b[0m`);
                console.log(`\x1b[32m└─────────────────\x1b[0m\n`);
                console.log('1. WhatsApp → Paramètres → Appareils connectés');
                console.log('2. Connecter un appareil');
                console.log(`3. Entre le code: \x1b[1m${code}\x1b[0m\n`);
            } catch(e) {
                console.log('\x1b[31mErreur pairage:', e.message, '\x1b[0m');
            }
        }
    }, 2000);

    // ✅ HANDLER MESSAGES
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            try {
                if (!msg?.message) continue;

                const from = msg.key?.remoteJid;
                if (!from || from === 'status@broadcast') continue;

                const isGroup = from.endsWith('@g.us');
                const sender = isGroup
                    ? (msg.key?.participant || msg.key?.remoteJid)
                    : from;

                const body = (
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    msg.message?.videoMessage?.caption ||
                    ''
                ).trim();

                if (!body) continue;

                console.log(`\x1b[34m📩 ${sender.split('@')[0]}: ${body}\x1b[0m`);

                if (!body.startsWith(prefix)) continue;

                const args = body.slice(prefix.length).trim().split(/\s+/);
                const cmdName = args.shift().toLowerCase();

                if (!cmdName) continue;

                console.log(`\x1b[33m⚡ CMD: ${cmdName}\x1b[0m`);

                const command = commands.get(cmdName);

                if (!command) {
                    const imgPath = path.join(mediaDir, 'notfound.jpg');
                    if (fs.existsSync(imgPath)) {
                        await sock.sendMessage(from, {
                            image: { url: imgPath },
                            caption: `❌ *${cmdName}* introuvable\n\nTape *${prefix}menu* pour voir les commandes\n\n> o-tech bot`
                        });
                    } else {
                        await sock.sendMessage(from, {
                            text: `❌ Commande *${cmdName}* introuvable\nTape *${prefix}menu*`
                        });
                    }
                    continue;
                }

                const isOwner = msg.key.fromMe ||
                    sender === config.config.ownerJid ||
                    sender.split('@')[0] === config.config.ownerNumber;

                if (config.config.mode === 'private' && !isOwner) {
                    await sock.sendMessage(from, { text: '🔒 Mode privé — seul le propriétaire peut utiliser le bot.' });
                    continue;
                }

                if (command.adminOnly && !isOwner) {
                    await sock.sendMessage(from, { text: '❌ Commande réservée au propriétaire.' });
                    continue;
                }

                await command.execute(sock, msg, args, from, isGroup, sender, commands);
                console.log(`\x1b[32m✓ ${cmdName} OK\x1b[0m`);

            } catch (err) {
                console.log(`\x1b[31m✗ Erreur: ${err.message}\x1b[0m`);
            }
        }
    });

    // Welcome nouveaux membres
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (action !== 'add') return;
        const welcomeCmd = commands.get('welcome');
        if (!welcomeCmd?.sendWelcome) return;
        for (const member of participants) {
            try { await welcomeCmd.sendWelcome(sock, id, member); } catch(e) {}
        }
    });

    return sock;
}

startBot().catch(console.error);
