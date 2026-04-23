// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   O-TECH BOT v5.0 — by Orlando Tech
//   ESM — Node v18+ — Fichier UNIQUE — 2026
//   Style Cyberpunk Neon Dark
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { createInterface } from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import qrcode from "qrcode-terminal";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AUTH_FOLDER = path.join(__dirname, "auth_info_baileys");
const PREFIX = ".";
const OWNER_NUMBER = "";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   LOGGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const logger = pino({
    level: "silent",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
        }
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   UTILITAIRES CYBERPUNK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const neon = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m"
};

function cyberLog(text, color = "cyan") {
    console.log(`${neon.bright}${neon[color]}[O-TECH]${neon.reset} ${text}`);
}

function cyberBox(title, lines) {
    const width = 50;
    const top = "╔" + "═".repeat(width - 2) + "╗";
    const bottom = "╚" + "═".repeat(width - 2) + "╝";
    const titleLine = "║" + title.padStart((width + title.length) / 2).padEnd(width - 2) + "║";

    console.log(`${neon.magenta}${top}`);
    console.log(`${neon.magenta}${titleLine}`);
    console.log("║" + " ".repeat(width - 2) + "║");

    lines.forEach(line => {
        console.log("║ " + neon.cyan + line.padEnd(width - 4) + neon.magenta + "║");
    });

    console.log(`${neon.magenta}${bottom}${neon.reset}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   ASCII ART LOGO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function showLogo() {
    console.clear();
    const logo = `
    ██████╗  ████████╗███████╗ ██████╗██╗  ██╗
    ██╔═══██╗╚══██╔══╝██╔════╝██╔════╝██║  ██║
    ██║   ██║   ██║   █████╗  ██║     ███████║
    ██║   ██║   ██║   ██╔══╝  ██║     ██╔══██║
    ╚██████╔╝   ██║   ███████╗╚██████╗██║  ██║
     ╚═════╝    ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝
         ORLANDO TECH — BOT v5.0
    `;
    console.log(`${neon.cyan}${logo}${neon.reset}`);

    cyberBox("SYSTEM STATUS", [
        "Bot Status: INITIALIZING...",
        "Protocol: Baileys Multi-Device",
        "Auth Method: QR Code + Pairing",
        "Engine: Node.js ESM",
        "Region: HAITI"
    ]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   GESTION DES COMMANDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = new Map();

function cmd(name, description, handler) {
    commands.set(name.toLowerCase(), { description, handler });
}

// Commande ping
cmd("ping", "Verifier la latence", async (msg, sock) => {
    const start = Date.now();
    await sock.sendMessage(msg.key.remoteJid, { text: "Pong!" });
    const latency = Date.now() - start;
    await sock.sendMessage(msg.key.remoteJid, { 
        text: `*Latence:* ${latency}ms\n*Bot:* O-TECH v5.0` 
    });
});

// Commande menu
cmd("menu", "Afficher le menu", async (msg, sock) => {
    let menuText = `${neon.cyan}╔══════════════════════════════════════╗\n`;
    menuText += `║     O-TECH BOT — COMMANDES          ║\n`;
    menuText += `╠══════════════════════════════════════╣\n`;

    commands.forEach((cmd, name) => {
        menuText += `║  ${PREFIX}${name.padEnd(10)} — ${cmd.description.padEnd(20)}║\n`;
    });

    menuText += `╚══════════════════════════════════════╝${neon.reset}`;

    await sock.sendMessage(msg.key.remoteJid, { text: menuText });
});

// Commande owner
cmd("owner", "Info proprietaire", async (msg, sock) => {
    await sock.sendMessage(msg.key.remoteJid, {
        text: `*Proprietaire:* Orlando Tech\n*Contact:* wa.me/${OWNER_NUMBER}\n*Version:* 5.0`
    });
});

// Commande sticker
cmd("sticker", "Creer un sticker", async (msg, sock) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.imageMessage) {
        return sock.sendMessage(msg.key.remoteJid, { 
            text: "Reponds a une image avec .sticker" 
        });
    }

    try {
        const stream = await downloadContentFromMessage(quoted.imageMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        await sock.sendMessage(msg.key.remoteJid, {
            sticker: buffer,
            mimetype: "image/webp"
        });
    } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: "Erreur creation sticker" 
        });
    }
});

// Commande group info
cmd("groupinfo", "Info groupe", async (msg, sock) => {
    if (!msg.key.remoteJid.endsWith("@g.us")) {
        return sock.sendMessage(msg.key.remoteJid, { 
            text: "Commande groupe uniquement" 
        });
    }

    try {
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const info = `
*INFO GROUPE*
Nom: ${groupMetadata.subject}
Membres: ${groupMetadata.participants.length}
Description: ${groupMetadata.desc || "Aucune"}
Createur: ${groupMetadata.owner || "Inconnu"}
        `;
        await sock.sendMessage(msg.key.remoteJid, { text: info.trim() });
    } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: "Impossible recuperer infos" 
        });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   GESTION DES MESSAGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMessage(msg, sock) {
    try {
        if (!msg.message) return;

        const messageType = Object.keys(msg.message)[0];
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || "";

        // Log message recu
        const sender = msg.key.remoteJid;
        const pushName = msg.pushName || "Unknown";
        cyberLog(`📩 ${pushName} (${sender}): ${body.substring(0, 50)}`, "green");

        // Verifier prefix
        if (!body.startsWith(PREFIX)) return;

        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (commands.has(command)) {
            await commands.get(command).handler(msg, sock);
        } else {
            await sock.sendMessage(sender, { 
                text: `Commande inconnue: ${command}\nTape ${PREFIX}menu pour voir les commandes.` 
            });
        }
    } catch (err) {
        cyberLog(`Erreur handler: ${err.message}`, "red");
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONNEXION WHATSAPP — CORRECTION PRINCIPALE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function connectToWhatsApp() {
    showLogo();

    // Creer dossier auth s'il n'existe pas
    if (!fs.existsSync(AUTH_FOLDER)) {
        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    // Recuperer derniere version Baileys
    const { version, isLatest } = await fetchLatestBaileysVersion();
    cyberLog(`Baileys v${version.join(".")} ${isLatest ? "(latest)" : ""}`, "blue");

    // Auth state
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    // Creer socket avec configuration optimisee
    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,  // Affiche QR dans terminal
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        browser: ["O-TECH Bot", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        fireInitQueries: true,
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => {
            return { conversation: "" };
        }
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   GESTION DES EVENEMENTS DE CONNEXION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // AFFICHAGE QR CODE DANS TERMINAL
        if (qr) {
            cyberLog("📱 Scan ce QR Code avec WhatsApp:", "yellow");
            console.log("");
            qrcode.generate(qr, { small: true });
            console.log("");
            cyberLog("En attente de scan...", "yellow");
            cyberLog("Astuce: Ouvre WhatsApp > Parametres > Appareils connectes > Nouveau", "cyan");
        }

        // Gestion etat connexion
        if (connection === "connecting") {
            cyberLog("Connexion en cours...", "yellow");
        }

        if (connection === "open") {
            cyberLog("CONNECTE A WHATSAPP!", "green");
            cyberLog(`Bot operationnel: ${sock.user.id.split(":")[0]}`, "green");
            cyberLog(`${new Date().toLocaleString("fr-FR")}`, "blue");

            // Message de demarrage
            console.log("");
            cyberBox("BOT ACTIF", [
                "Connecte avec succes",
                `Numero: ${sock.user.id.split(":")[0]}`,
                "Tape .menu pour les commandes",
                "Pret a recevoir des messages!"
            ]);
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                const reason = lastDisconnect?.error?.output?.statusCode;
                cyberLog(`Deconnecte (code: ${reason}). Reconnexion...`, "red");

                // Attendre avant reconnexion
                await new Promise(r => setTimeout(r, 3000));
                connectToWhatsApp();
            } else {
                cyberLog("Deconnecte definitivement (logged out)", "red");
                cyberLog("Supprime le dossier auth_info_baileys et relance", "yellow");
                process.exit(0);
            }
        }
    });

    // Sauvegarde credentials
    sock.ev.on("creds.update", saveCreds);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   GESTION DES MESSAGES ENTRANTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    sock.ev.on("messages.upsert", async (m) => {
        if (m.type === "notify") {
            for (const msg of m.messages) {
                await handleMessage(msg, sock);
            }
        }
    });

    // Gestion des groupes
    sock.ev.on("groups.upsert", (groups) => {
        groups.forEach(g => {
            cyberLog(`Nouveau groupe: ${g.subject}`, "magenta");
        });
    });

    return sock;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   INTERFACE CLI INTERACTIVE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function startCLI(sock) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${neon.cyan}[O-TECH]>${neon.reset} `
    });

    rl.prompt();

    rl.on("line", async (line) => {
        const [cmd, ...args] = line.trim().split(/ +/);

        switch (cmd.toLowerCase()) {
            case "help":
                console.log(`${neon.yellow}Commandes CLI:${neon.reset}`);
                console.log("  status  — Verifier statut connexion");
                console.log("  restart — Redemarrer le bot");
                console.log("  logout  — Deconnecter et effacer auth");
                console.log("  exit    — Quitter");
                break;

            case "status":
                console.log(sock?.user ? 
                    `${neon.green}Connecte: ${sock.user.id}${neon.reset}` : 
                    `${neon.red}Non connecte${neon.reset}`
                );
                break;

            case "restart":
                cyberLog("Redemarrage...", "yellow");
                process.exit(0);
                break;

            case "logout":
                cyberLog("Deconnexion et suppression auth...", "red");
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                process.exit(0);
                break;

            case "exit":
                cyberLog("Au revoir!", "cyan");
                process.exit(0);
                break;

            default:
                if (cmd) cyberLog(`Commande inconnue: ${cmd}`, "red");
        }

        rl.prompt();
    });

    rl.on("close", () => {
        cyberLog("Interface fermee", "cyan");
        process.exit(0);
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   POINT D'ENTREE PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
    try {
        const sock = await connectToWhatsApp();
        startCLI(sock);
    } catch (err) {
        cyberLog(`Erreur fatale: ${err.message}`, "red");
        console.error(err);
        process.exit(1);
    }
}

// Gestion erreurs non capturees
process.on("uncaughtException", (err) => {
    cyberLog(`Exception: ${err.message}`, "red");
});

process.on("unhandledRejection", (err) => {
    cyberLog(`Rejection: ${err?.message || err}`, "red");
});

main();
