const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    getContentType,
    downloadContentFromMessage,
    areJidsSameUser,
    makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   IMAGE ANONYMOUS (chargée depuis fichier local)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ANON_IMG = path.join(__dirname, "anon.jpg");
// Place l'image anonymous dans le dossier du bot sous le nom anon.jpg

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONFIG PRINCIPALE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CONFIG = {
    botName: "O-TECH BOT",
    owner: "Orlando Tech",
    ownerNumber: "50935443504",
    prefix: ".",
    sessionName: "session_otech",
    mode: "both",
    antiLink: false,
    antiSpam: false,
    antiBadWord: false,
    spamLimit: 5,
    spamWindow: 5000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   NUMÉROS QUICK BLOQUÉS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QUICK_NUMBERS = [
    // Ajoute les numéros Quick ici (sans @s.whatsapp.net)
    // ex: "50938123456"
];

const ANTI_QUICK_MSGS = [
    "😂 j'ai rien fais pour merite ca hein",
    "🤣 QUI pa janm tounen! Ou fe wont! 😭",
    "💀 nou gen pwen pou sa ti bb 😂",
    "ah monche bay vag non",
    "😭 al kick manmanw ak papaw 🤣",
];

// Messages quand quelqu'un essaie de kick l'owner
const ANTI_KICK_OWNER_MSGS = [
    "😂 j'ai rien fais pour merite ca hein — *O-TECH BOT rejoint le groupe automatiquement!* 🔄",
    "🤣 ou panse ou ka retire mwen? Pa janm! 😭 — *Bot de retour!* 🚀",
    "💀 nou gen pwen pou sa ti bb 😂 — *O-TECH BOT tounen!* ⚡",
    "ah monche bay vag non — *Mwen la toujou!* 🤖",
    "😭 al kick manmanw 🤣 — *Impossible retire mwen!* 👑",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   STOCKAGE EN MÉMOIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const spamMap = new Map();
const warnMap = new Map();
const groupSettings = new Map();
const viewOnceStore = new Map();

// ── ÉCONOMIE
const coinsData = new Map();
const xpData = new Map();
const dailyCooldown = new Map();
const workCooldown = new Map();

// ── STATS GROUPE
const groupMsgStats = new Map();

// ── JEUX
const quizSessions = new Map();
const penduSessions = new Map();

// ── HELPERS ÉCONOMIE
const getCoins = (jid) => coinsData.get(jid) || 0;
const addCoins = (jid, amount) => coinsData.set(jid, Math.max(0, getCoins(jid) + amount));
const getLevel = (jid) => {
    const xp = xpData.get(jid) || 0;
    const level = Math.floor(xp / 100) + 1;
    return { level, xp };
};
const addXP = (jid, amount) => xpData.set(jid, (xpData.get(jid) || 0) + amount);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   UTILITAIRES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getBody = (msg) =>
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || "";

const isGroup = (jid) => jid?.endsWith("@g.us");
const isOwner = (jid) => {
    if (!jid) return false;
    const clean = jid.replace(/:[0-9]+@/, "@").replace("@s.whatsapp.net", "").replace("@c.us", "");
    return clean === CONFIG.ownerNumber || clean.split("@")[0] === CONFIG.ownerNumber;
};
const shortNum = (jid) => {
    if (!jid) return "";
    if (typeof jid !== "string") return String(jid);
    return jid.split("@")[0] || jid;
};

const reply = async (sock, from, text, quoted) =>
    sock.sendMessage(from, { text }, { quoted });

const sendImg = async (sock, from, imgPath, caption, quoted) => {
    if (fs.existsSync(imgPath)) {
        await sock.sendMessage(from, { image: fs.readFileSync(imgPath), caption }, { quoted });
    } else {
        await reply(sock, from, caption, quoted);
    }
};

const getGroupSetting = (groupId, key) => {
    const s = groupSettings.get(groupId);
    return s?.[key] ?? CONFIG[key];
};
const setGroupSetting = (groupId, key, value) => {
    if (!groupSettings.has(groupId)) groupSettings.set(groupId, {});
    groupSettings.get(groupId)[key] = value;
};

const containsLink = (text) =>
    /https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|youtu\.be/i.test(text);

const badWords = ["mot1", "mot2"];
const containsBadWord = (text) => badWords.some((w) => text.toLowerCase().includes(w));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TÉLÉCHARGER MÉDIA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function downloadMedia(msg, type) {
    const stream = await downloadContentFromMessage(msg, type);
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   BLAGUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const blagues = [
    "Pourquoi les plongeurs plongent-ils en arrière ? Parce que sinon ils tomberaient dans le bateau !",
    "Un homme entre dans une bibliothèque : 'Un livre sur la paranoïa svp.' La bibliothécaire chuchote : 'Ils sont juste derrière vous !'",
    "Qu'est-ce qu'un canif ? Un petit fien !",
    "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël !",
    "Qu'est-ce qu'un crocodile qui surveille des bagages ? Un sac à dents !",
    "Pourquoi les fantômes ne mentent-ils pas ? Parce qu'on voit à travers eux !",
    "Kisa yo rele yon bèf ki fè matematik? Yon kalkila-towo!",
    "Poukisa poul la travèse wout la? Pou rive lòt bò a!",
    "Ou konnen diferans ant yon liv ak yon zanmi? Ou ka fèmen yon liv!",
];

const ball8Responses = [
    "✅ Oui, absolument!", "✅ C'est certain.", "✅ Sans aucun doute.",
    "🟡 Peut-être...", "🟡 Les signes sont flous.", "🟡 Demande encore plus tard.",
    "❌ Non, pas du tout.", "❌ Les signes disent non.", "❌ Très peu probable.",
];

const conseils = [
    "💡 Travay di se kle siksè. Kontinye avanse!",
    "💡 Pa janm abandone rèv ou. Chak jou se yon nouvo opòtinite!",
    "💡 Aprann yon bagay nouvo chak jou. Konesans se pouvwa!",
    "💡 Respekte tèt ou pou lòt moun respekte ou.",
    "💡 O-TECH la pou ou: Innovation constante!",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   COMMANDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = {

    // ── MENU ─────────────────────────────────────
    menu: async (sock, from, msg, args, sender) => {
        const p = CONFIG.prefix;
        const now = new Date();
        const hour = now.getHours();
        const greeting = hour < 12 ? "🌅 Bonjou" : hour < 18 ? "☀️ Bonswa" : "🌙 Bonswa";
        const menuText =
            `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
            `┃  ⚡ *O-TECH BOT v3.0* ⚡   ┃\n` +
            `┃  _Powered by Orlando Tech_  ┃\n` +
            `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
            `${greeting}! 👋 *@${shortNum(sender)}*\n\n` +
            `╔══════════════════════╗\n` +
            `║  📋 *INFO & GÉNÉRAL* ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}menu  › ${p}ping  › ${p}botinfo\n` +
            `› ${p}uptime  › ${p}owner  › ${p}otech\n` +
            `› ${p}public  › ${p}prive  › ${p}grouponly\n\n` +
            `╔══════════════════════╗\n` +
            `║  🛡️ *MODÉRATION*     ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}kick  › ${p}add  › ${p}promote\n` +
            `› ${p}demote  › ${p}mute  › ${p}unmute\n` +
            `› ${p}warn  › ${p}resetwarn  › ${p}delete\n` +
            `› ${p}tag  › ${p}tagadmin  › ${p}admins\n` +
            `› ${p}groupinfo  › ${p}link  › ${p}revoke\n\n` +
            `╔══════════════════════╗\n` +
            `║  🔒 *SÉCURITÉ*       ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}antilink  › ${p}antispam\n` +
            `› ${p}antibadword\n\n` +
            `╔══════════════════════╗\n` +
            `║  🎮 *FUN & JEUX*     ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}blague  › ${p}8ball  › ${p}pile\n` +
            `› ${p}dé  › ${p}rps  › ${p}compteur\n` +
            `› ${p}conseil  › ${p}quote  › ${p}meme\n` +
            `› ${p}ship  › ${p}hug  › ${p}slap  › ${p}fight\n` +
            `› ${p}quiz  › ${p}pendu  › ${p}lettre\n` +
            `› ${p}devinette\n\n` +
            `╔══════════════════════╗\n` +
            `║  📲 *MÉDIAS & OUTILS*║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}vv  › ${p}send  › ${p}sticker\n` +
            `› ${p}tts  › ${p}calc  › ${p}météo\n` +
            `› ${p}profil  › ${p}pp\n\n` +
            `╔══════════════════════╗\n` +
            `║  📊 *STATS & ÉCONOMIE*║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}stats  › ${p}top  › ${p}monscore\n` +
            `› ${p}solde  › ${p}daily  › ${p}work\n` +
            `› ${p}pari  › ${p}transfert  › ${p}rob\n` +
            `› ${p}richesse\n\n` +
            `╔══════════════════════╗\n` +
            `║  🎵 *MUSIQUE*        ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}musique  › ${p}ytb  › ${p}paroles\n` +
            `› ${p}playlist  › ${p}radio\n\n` +
            `╔══════════════════════╗\n` +
            `║  🤖 *INTELLIGENCE IA*║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}ia *[question]* — Poser une question\n\n` +
            `╔══════════════════════╗\n` +
            `║  👑 *OWNER ONLY*     ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}admin  › ${p}broadcast  › ${p}listgroups\n` +
            `› ${p}banuser  › ${p}unbanuser  › ${p}clearstats\n` +
            `› ${p}aikey  › ${p}public  › ${p}prive\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚡ *${Object.keys(commands).length} commandes* disponibles\n` +
            `🌐 *O-TECH © 2026* — Innovation constante 🚀\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await sendImg(sock, from, ANON_IMG, menuText, msg);
    },

    // ── PING ─────────────────────────────────────
    ping: async (sock, from, msg) => {
        const start = Date.now();
        await reply(sock, from, "🏓 Calcul...", msg);
        await reply(sock, from, `⚡ *Pong!* Latence : *${Date.now() - start}ms*`, msg);
    },

    // ── BOTINFO ──────────────────────────────────
    botinfo: async (sock, from, msg) => {
        const u = process.uptime();
        const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = Math.floor(u % 60);
        await sendImg(sock, from, ANON_IMG,
            `🤖 *O-TECH BOT — Informations*\n\n` +
            `▸ Nom : *${CONFIG.botName}*\n` +
            `▸ Créateur : *${CONFIG.owner}*\n` +
            `▸ Préfixe : *${CONFIG.prefix}*\n` +
            `▸ Uptime : *${h}h ${m}m ${s}s*\n` +
            `▸ Anti-lien : *${CONFIG.antiLink ? "ON" : "OFF"}*\n` +
            `▸ Anti-spam : *${CONFIG.antiSpam ? "ON" : "OFF"}*\n` +
            `▸ Mode : *${CONFIG.mode}*\n` +
            `▸ Node.js : *${process.version}*\n` +
            `▸ Commandes : *${Object.keys(commands).length}*`, msg);
    },

    // ── UPTIME ───────────────────────────────────
    uptime: async (sock, from, msg) => {
        const u = process.uptime();
        const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = Math.floor(u % 60);
        await reply(sock, from, `⏱ *Uptime :* ${h}h ${m}m ${s}s`, msg);
    },

    // ── OWNER ────────────────────────────────────
    owner: async (sock, from, msg) => {
        await reply(sock, from,
            `👑 *Owner O-TECH BOT*\n\n` +
            `▸ Nom : *${CONFIG.owner}*\n` +
            `▸ WhatsApp : wa.me/${CONFIG.ownerNumber}\n` +
            `▸ Brand : *O-TECH*\n` +
            `▸ Site : otech.ht`, msg);
    },

    // ── OTECH PRÉSENTATION ───────────────────────
    otech: async (sock, from, msg, args, sender) => {
        const presentText =
            `𝐀𝐓𝐓𝐄𝐍𝐓𝐈𝐎𝐍 : 𝐋𝐞 𝐬𝐞𝐫𝐯𝐞𝐮𝐫 𝐝𝐞 𝐜𝐞 𝐠𝐫𝐨𝐮𝐩𝐞 𝐞𝐬𝐭 𝐝é𝐬𝐨𝐫𝐦𝐚𝐢𝐬 𝐬𝐨𝐮𝐬 𝐜𝐨𝐧𝐭𝐫ô𝐥𝐞 𝐝𝐮 𝐬𝐲𝐬𝐭è𝐦𝐞 𝐎-𝐓𝐄𝐂𝐇 BOT —͟͞͞\n` +
            `𝐉𝐞 𝐬𝐮𝐢𝐬 𝐥'𝐢𝐧𝐭𝐞𝐫𝐟𝐚𝐜𝐞 𝐪𝐮𝐢 𝐯𝐞𝐢𝐥𝐥𝐞 𝐬𝐮𝐫 𝐯𝐨𝐬 𝐝𝐨𝐧𝐧é𝐞𝐬. 𝐀𝐮𝐜𝐮𝐧 𝐦𝐞𝐬𝐬𝐚𝐠𝐞, 𝐚𝐮𝐜𝐮𝐧 𝐦é𝐝𝐢𝐚, 𝐚𝐮𝐜𝐮𝐧 𝐦𝐞𝐦𝐛𝐫𝐞 𝐧'é𝐜𝐡𝐚𝐩𝐩𝐞 à 𝐦𝐨𝐧 𝐬𝐜𝐚𝐧𝐧𝐞𝐫\n\n` +
            `𝐐𝐮𝐚𝐧𝐝 𝐣𝐞 𝐥𝐚𝐧𝐜𝐞 le 𝐓𝐚𝐠𝐀𝐥𝐥, 𝐜'𝐞𝐬𝐭 𝐮𝐧𝐞 𝐢𝐧𝐣𝐞𝐜𝐭𝐢𝐨𝐧 𝐝𝐞 𝐩𝐨𝐢𝐬𝐨𝐧 𝐝𝐚𝐧𝐬 𝐯𝐨𝐬 𝐧𝐨𝐭𝐢𝐟𝐢𝐜𝐚𝐭𝐢𝐨𝐧𝐬. 𝐐𝐮𝐚𝐧𝐝 𝐣𝐞 𝐊𝐢𝐜𝐤, 𝐜'𝐞𝐬𝐭 𝐮𝐧 𝐖𝐈𝐏𝐄 𝐝é𝐟𝐢𝐧𝐢𝐭𝐢𝐟 𝐝𝐞 𝐭𝐨𝐧 𝐚𝐜𝐜è𝐬\n\n` +
            ` 𝐍'𝐞𝐬𝐬𝐚𝐢𝐞 𝐩𝐚𝐬 𝐝𝐞 𝐦'𝐢𝐠𝐧𝐨𝐫𝐞𝐫 : 𝐭𝐨𝐧 𝐧𝐮𝐦é𝐫𝐨 𝐞𝐬𝐭 𝐝é𝐣à 𝐢𝐧𝐝𝐞𝐱é 𝐝𝐚𝐧𝐬 𝐦𝐚 𝐛𝐚𝐬𝐞 𝐝𝐞 𝐝𝐨𝐧𝐧é𝐞𝐬 𝐩𝐫𝐢𝐯é𝐞\n\n` +
            `[𝐏𝐑𝐎𝐓𝐎𝐂𝐎𝐋𝐄 𝐄𝐗É𝐂𝐔𝐓𝐈𝐎𝐍] : > *𝐒𝐜𝐚𝐧 𝐝𝐮 𝐠𝐫𝐨𝐮𝐩𝐞... 𝟏𝟎𝟎%*\n` +
            `𝐕é𝐫𝐢𝐟𝐢𝐜𝐚𝐭𝐢𝐨𝐧 𝐝𝐞𝐬 𝐩𝐫𝐢𝐯𝐢𝐥è𝐠𝐞𝐬... 𝐀𝐃𝐌𝐈𝐍 𝐎𝐍𝐋𝐘\n\n` +
            `𝐂𝐨𝐧𝐭𝐫ô𝐥𝐞 𝐝𝐞𝐬 𝐦𝐞𝐦𝐛𝐫𝐞𝐬... 𝐒𝐎𝐔𝐌𝐈𝐒𝐒𝐈𝐎𝐍 𝐓𝐎𝐓𝐀𝐋𝐄\n` +
            `𝐑𝐞𝐬𝐭𝐞 𝐝𝐚𝐧𝐬 𝐥𝐞𝐬 𝐫è𝐠𝐥𝐞𝐬... 𝐨𝐮 𝐬𝐨𝐢𝐬 𝐞𝐱𝐩𝐮𝐥𝐬é 𝐝𝐮 𝐬𝐲𝐬𝐭è𝐦𝐞. —͟͞͞\n\n` +
            `> 𝐌𝐫. 𝐎𝐫𝐥𝐚𝐧𝐝𝐨`;
        await sendImg(sock, from, ANON_IMG, presentText, msg);
    },

    // ── MODE PUBLIC ──────────────────────────────
    public: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        CONFIG.mode = "both";
        await reply(sock, from,
            `🌐 *Mode PUBLIC activé*\n\n` +
            `▸ Le bot répond à *tout le monde*\n` +
            `▸ Groupes + Messages privés\n\n` +
            `_O-TECH BOT — Mode: PUBLIC_ ✅`, msg);
    },

    // ── MODE PRIVÉ ───────────────────────────────
    prive: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        CONFIG.mode = "private";
        await reply(sock, from,
            `🔒 *Mode PRIVÉ activé*\n\n` +
            `▸ Le bot répond *seulement en privé*\n` +
            `▸ Les groupes sont ignorés\n\n` +
            `_O-TECH BOT — Mode: PRIVÉ_ 🔒`, msg);
    },

    // ── MODE GROUPE SEULEMENT ────────────────────
    grouponly: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        CONFIG.mode = "group";
        await reply(sock, from,
            `👥 *Mode GROUPE SEULEMENT activé*\n\n` +
            `▸ Le bot répond *seulement dans les groupes*\n` +
            `▸ Les messages privés sont ignorés\n\n` +
            `_O-TECH BOT — Mode: GROUPE_ 👥`, msg);
    },
    kick: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Commande groupe seulement.", msg);
        if (!isOwner(sender)) {
            const meta = await sock.groupMetadata(from);
            const senderInfo = meta.participants.find(p => p.id.includes(shortNum(sender)));
            if (!senderInfo?.admin) return reply(sock, from, "❌ Tu dois être admin!", msg);
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre : .kick @membre", msg);
        for (const jid of mentioned) {
            if (isOwner(jid)) {
                // Envoyer un message drôle et ignorer
                await sock.sendMessage(from, {
                    text: randomChoice(ANTI_KICK_OWNER_MSGS),
                    mentions: [sender]
                });
                continue;
            }
            await sock.groupParticipantsUpdate(from, [jid], "remove");
        }
        const kicked = mentioned.filter(j => !isOwner(j));
        if (kicked.length) await reply(sock, from, `✅ *${kicked.length}* membre(s) expulsé(s).`, msg);
    },

    // ── ADD ──────────────────────────────────────
    add: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        if (!args[0]) return reply(sock, from, "❌ Usage : .add 509XXXXXXXX", msg);
        const num = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await sock.groupParticipantsUpdate(from, [num], "add");
        await reply(sock, from, `✅ Membre ajouté!`, msg);
    },

    // ── PROMOTE ──────────────────────────────────
    promote: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        await sock.groupParticipantsUpdate(from, mentioned, "promote");
        await reply(sock, from, `⬆️ Membre(s) promu(s) admin! 👑`, msg);
    },

    // ── DEMOTE ───────────────────────────────────
    demote: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un admin.", msg);
        for (const jid of mentioned) {
            if (isOwner(jid)) { await reply(sock, from, "⛔ Impossible de retirer l'owner!", msg); continue; }
        }
        await sock.groupParticipantsUpdate(from, mentioned, "demote");
        await reply(sock, from, `⬇️ Admin retiré!`, msg);
    },

    // ── MUTE ─────────────────────────────────────
    mute: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupSettingUpdate(from, "announcement");
        await reply(sock, from, "🔇 Groupe fermé — seuls les admins peuvent écrire.", msg);
    },

    // ── UNMUTE ───────────────────────────────────
    unmute: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupSettingUpdate(from, "not_announcement");
        await reply(sock, from, "🔊 Groupe ouvert — tout le monde peut écrire!", msg);
    },

    // ── WARN ─────────────────────────────────────
    warn: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        for (const jid of mentioned) {
            if (isOwner(jid)) { await reply(sock, from, "⛔ Impossible d'avertir l'owner!", msg); continue; }
            const current = warnMap.get(jid) || 0;
            warnMap.set(jid, current + 1);
            const total = warnMap.get(jid);
            if (total >= 3) {
                await sock.groupParticipantsUpdate(from, [jid], "remove");
                warnMap.delete(jid);
                await reply(sock, from, `⛔ @${shortNum(jid)} expulsé après *3 avertissements*!`, msg);
            } else {
                await reply(sock, from, `⚠️ @${shortNum(jid)} — Avertissement *${total}/3*.\n_Encore ${3 - total} avant expulsion._`, msg);
            }
        }
    },

    // ── RESETWARN ────────────────────────────────
    resetwarn: async (sock, from, msg) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        for (const jid of mentioned) warnMap.delete(jid);
        await reply(sock, from, "✅ Avertissements réinitialisés.", msg);
    },

    // ── TAG ALL ──────────────────────────────────
    tag: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const members = meta.participants.map((p) => p.id);
        const customMsg = args.join(" ") || "📢 Attention tout le monde!";
        const adminsCount = meta.participants.filter(p => p.admin).length;
        let text =
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔔 *${customMsg}*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🏢 *Groupe:* ${meta.subject}\n` +
            `👥 *Membres:* ${members.length}\n` +
            `👮 *Admins:* ${adminsCount}\n\n` +
            `📌 *Membres tagués:*\n`;
        for (const m of members) text += `@${shortNum(m)} `;
        text += `\n\n_— O-TECH BOT 🚀_`;

        // Essayer d'envoyer avec la photo du groupe
        try {
            const gpUrl = await sock.profilePictureUrl(from, "image");
            const res = await fetch(gpUrl);
            const gpBuf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: gpBuf, caption: text, mentions: members }, { quoted: msg });
        } catch (_) {
            // Pas de photo de groupe → envoyer texte seul
            await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
        }
    },

    // ── TAG ADMIN ────────────────────────────────
    tagadmin: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin);
        const mentions = admins.map(a => a.id);
        const customMsg = args.join(" ") || "📢 Message pour les admins!";
        let text = `*${customMsg}*\n\n👮 *Admins:*\n`;
        for (const a of admins) text += `@${shortNum(a.id)}\n`;
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    // ── ADMINS LIST ──────────────────────────────
    admins: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin);
        const mentions = admins.map(a => a.id);
        let text = `👮 *Liste des Admins* (${admins.length}):\n\n`;
        for (const a of admins) text += `${a.admin === "superadmin" ? "👑" : "⭐"} @${shortNum(a.id)}\n`;
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    // ── GROUPINFO ────────────────────────────────
    groupinfo: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const adminsCount = meta.participants.filter(p => p.admin).length;
        const total = meta.participants.length;
        const created = new Date(meta.creation * 1000).toLocaleDateString("fr-FR");
        const infoText =
            `📊 *Infos du Groupe*\n\n` +
            `👥 *Nom :* ${meta.subject}\n` +
            `📝 *Description :* ${meta.desc || "Aucune"}\n` +
            `👤 *Membres :* ${total}\n` +
            `👮 *Admins :* ${adminsCount}\n` +
            `📅 *Créé le :* ${created}\n` +
            `🆔 *ID :* ${from}`;
        try {
            const ppUrl = await sock.profilePictureUrl(from, "image");
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: buf, caption: infoText }, { quoted: msg });
        } catch (_) {
            await reply(sock, from, infoText, msg);
        }
    },

    // ── LINK ─────────────────────────────────────
    link: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        try {
            const code = await sock.groupInviteCode(from);
            await reply(sock, from, `🔗 *Lien du groupe:*\nhttps://chat.whatsapp.com/${code}`, msg);
        } catch (_) {
            await reply(sock, from, "❌ Le bot doit être admin.", msg);
        }
    },

    // ── REVOKE ───────────────────────────────────
    revoke: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupRevokeInvite(from);
        await reply(sock, from, "✅ Lien du groupe révoqué!", msg);
    },

    // ── DELETE ───────────────────────────────────
    delete: async (sock, from, msg) => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctx?.stanzaId) return reply(sock, from, "❌ Réponds au message à supprimer.", msg);
        await sock.sendMessage(from, {
            delete: { remoteJid: from, fromMe: false, id: ctx.stanzaId, participant: ctx.participant }
        });
    },

    // ── PROFIL ───────────────────────────────────
    profil: async (sock, from, msg, args) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || (isGroup(from) ? msg.key.participant : from);
        try {
            const ppUrl = await sock.profilePictureUrl(target, "image");
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, {
                image: buf,
                caption: `👤 *Profil de* @${shortNum(target)}\n📱 *Numéro :* +${shortNum(target)}`,
                mentions: [target]
            }, { quoted: msg });
        } catch (_) {
            await reply(sock, from, `👤 @${shortNum(target)} — Photo de profil non disponible.`, msg);
        }
    },

    // ── VV (View Once bypass) ─────────────────────
    vv: async (sock, from, msg, args, sender) => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        // Essayer de trouver le view once dans le message cité directement
        const quotedMsg = ctx?.quotedMessage;
        const stanzaId = ctx?.stanzaId;

        // 1. Chercher dans le store (si intercepté automatiquement)
        let stored = stanzaId ? viewOnceStore.get(stanzaId) : null;

        // 2. Si pas dans le store, essayer de télécharger directement depuis le quotedMessage
        if (!stored && quotedMsg) {
            const voMsg =
                quotedMsg?.viewOnceMessage?.message ||
                quotedMsg?.viewOnceMessageV2?.message ||
                quotedMsg?.viewOnceMessageV2Extension?.message;

            if (voMsg) {
                try {
                    await reply(sock, from, "⏳ Déverrouillage en cours...", msg);
                    let mediaMsg = null;
                    let mediaType = null;
                    if (voMsg.imageMessage) { mediaMsg = voMsg.imageMessage; mediaType = "image"; }
                    else if (voMsg.videoMessage) { mediaMsg = voMsg.videoMessage; mediaType = "video"; }

                    if (mediaMsg) {
                        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buf = Buffer.concat(chunks);
                        stored = { type: mediaType, buffer: buf, sender: ctx?.participant || from };
                    }
                } catch (e) {
                    console.warn("[VV direct]", e.message);
                }
            }
        }

        if (!stored) return reply(sock, from,
            "❌ *View once introuvable!*\n\n_Le message doit:\n- Être récent\n- Avoir été reçu APRÈS que le bot était connecté\n- Être un vrai message view once_", msg);

        try {
            const caption = `👁️ *View Once — O-TECH BOT*\n_De:_ @${shortNum(stored.sender)}`;
            if (stored.type === "image") {
                await sock.sendMessage(from, {
                    image: stored.buffer, caption, mentions: [stored.sender]
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    video: stored.buffer, caption, mentions: [stored.sender]
                }, { quoted: msg });
            }
        } catch (e) {
            await reply(sock, from, `❌ Erreur: ${e.message}`, msg);
        }
    },

    // ── SEND (enregistrer statut) ─────────────────
    send: async (sock, from, msg, args, sender) => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctx?.quotedMessage) return reply(sock, from, "❌ Réponds à un statut/message avec .send", msg);

        const quotedMsg = ctx.quotedMessage;
        const quotedType = Object.keys(quotedMsg)[0];

        try {
            if (quotedType === "imageMessage") {
                const imgMsg = quotedMsg.imageMessage;
                const buf = await downloadMedia(imgMsg, "image");
                await sock.sendMessage(from, {
                    image: buf,
                    caption: imgMsg.caption || "📸 _Statut enregistré via O-TECH BOT_",
                }, { quoted: msg });
                await reply(sock, from, "✅ Photo enregistrée!", msg);

            } else if (quotedType === "videoMessage") {
                const vidMsg = quotedMsg.videoMessage;
                const buf = await downloadMedia(vidMsg, "video");
                await sock.sendMessage(from, {
                    video: buf,
                    caption: vidMsg.caption || "🎥 _Statut enregistré via O-TECH BOT_",
                }, { quoted: msg });
                await reply(sock, from, "✅ Vidéo enregistrée!", msg);

            } else if (quotedType === "conversation" || quotedType === "extendedTextMessage") {
                const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";
                await reply(sock, from, `📝 *Statut enregistré:*\n\n${text}`, msg);

            } else if (quotedType === "audioMessage") {
                const audMsg = quotedMsg.audioMessage;
                const buf = await downloadMedia(audMsg, "audio");
                await sock.sendMessage(from, {
                    audio: buf,
                    mimetype: "audio/mp4",
                    ptt: audMsg.ptt || false,
                }, { quoted: msg });
                await reply(sock, from, "✅ Audio enregistré!", msg);
            } else {
                await reply(sock, from, "❌ Type de média non supporté.", msg);
            }
        } catch (e) {
            await reply(sock, from, `❌ Erreur: ${e.message}`, msg);
        }
    },

    // ── SÉCURITÉ ─────────────────────────────────
    antilink: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const val = args[0]?.toLowerCase();
        if (!["on", "off"].includes(val)) return reply(sock, from, "❌ Usage : .antilink on/off", msg);
        setGroupSetting(from, "antiLink", val === "on");
        await reply(sock, from, `🔗 Anti-lien : *${val.toUpperCase()}*`, msg);
    },

    antispam: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const val = args[0]?.toLowerCase();
        if (!["on", "off"].includes(val)) return reply(sock, from, "❌ Usage : .antispam on/off", msg);
        setGroupSetting(from, "antiSpam", val === "on");
        await reply(sock, from, `🛡 Anti-spam : *${val.toUpperCase()}*`, msg);
    },

    antibadword: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const val = args[0]?.toLowerCase();
        if (!["on", "off"].includes(val)) return reply(sock, from, "❌ Usage : .antibadword on/off", msg);
        setGroupSetting(from, "antiBadWord", val === "on");
        await reply(sock, from, `🤬 Anti-bad-word : *${val.toUpperCase()}*`, msg);
    },

    // ── FUN ──────────────────────────────────────
    blague: async (sock, from, msg) => {
        await reply(sock, from, `😂 *Blague du jour:*\n\n${randomChoice(blagues)}`, msg);
    },

    "8ball": async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Pose une question ! Ex : .8ball Vais-je réussir ?", msg);
        await reply(sock, from, `🎱 *Magic 8-Ball*\n\n❓ _${args.join(" ")}_\n\n${randomChoice(ball8Responses)}`, msg);
    },

    pile: async (sock, from, msg) => {
        await reply(sock, from, `Résultat : ${Math.random() < 0.5 ? "🪙 *PILE*" : "🪙 *FACE*"}`, msg);
    },

    "dé": async (sock, from, msg, args) => {
        const faces = parseInt(args[0]) || 6;
        const result = Math.floor(Math.random() * faces) + 1;
        await reply(sock, from, `🎲 Dé à ${faces} faces → *${result}*`, msg);
    },

    rps: async (sock, from, msg, args) => {
        const choices = ["pierre", "feuille", "ciseaux"];
        const emojis = { pierre: "🪨", feuille: "📄", ciseaux: "✂️" };
        const player = args[0]?.toLowerCase();
        if (!choices.includes(player)) return reply(sock, from, "❌ Choisis : pierre, feuille ou ciseaux", msg);
        const bot = randomChoice(choices);
        let result;
        if (player === bot) result = "🟡 *Égalité!*";
        else if (
            (player === "pierre" && bot === "ciseaux") ||
            (player === "feuille" && bot === "pierre") ||
            (player === "ciseaux" && bot === "feuille")
        ) result = "✅ *Tu gagnes!*";
        else result = "❌ *Tu perds!*";
        await reply(sock, from, `🎮 *Pierre / Feuille / Ciseaux*\n\nToi: ${emojis[player]} *${player}*\nBot: ${emojis[bot]} *${bot}*\n\n${result}`, msg);
    },

    compteur: async (sock, from, msg, args) => {
        const n = parseInt(args[0]);
        if (isNaN(n) || n < 1 || n > 10) return reply(sock, from, "❌ Usage : .compteur 5 (1-10)", msg);
        for (let i = n; i >= 1; i--) {
            await sock.sendMessage(from, { text: `⏳ *${i}...*` });
            await wait(1000);
        }
        await sock.sendMessage(from, { text: "🎉 *BOOM!*" });
    },

    conseil: async (sock, from, msg) => {
        await reply(sock, from, randomChoice(conseils), msg);
    },

    quote: async (sock, from, msg) => {
        const quotes = [
            "\"Le succès c'est tomber 7 fois et se relever 8.\" — Proverbe japonais",
            "\"La vie, c'est ce qui arrive quand on est occupé à faire d'autres projets.\" — J. Lennon",
            "\"Rèv ou se GPS ou. Swiv li!\" — O-TECH",
            "\"Chak jou ou pa aprann se yon jou ou pèdi.\" — Proverbe haïtien",
            "\"Innovation se pa yon opsyon, se yon obligasyon.\" — O-TECH",
        ];
        await reply(sock, from, `💬 ${randomChoice(quotes)}`, msg);
    },

    // ── UTILITAIRES ──────────────────────────────
    tts: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage : .tts votre texte", msg);
        await reply(sock, from, `*${args.join(" ").toUpperCase()}*`, msg);
    },

    calc: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage : .calc 2+2", msg);
        try {
            const expr = args.join("").replace(/[^0-9+\-*/.()%]/g, "");
            const result = Function(`"use strict"; return (${expr})`)();
            await reply(sock, from, `🧮 *${expr} = ${result}*`, msg);
        } catch {
            await reply(sock, from, "❌ Expression invalide.", msg);
        }
    },

    météo: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage : .météo Port-au-Prince", msg);
        await reply(sock, from,
            `🌤 *Météo — ${args.join(" ")}*\n\n_Intègre une clé API OpenWeatherMap pour activer._\nhttps://openweathermap.org/api`, msg);
    },

    sticker: async (sock, from, msg) => {
        await reply(sock, from, "🎨 Sticker — installe *sharp* et *fluent-ffmpeg* pour activer.", msg);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   🎮 JEUX
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    quiz: async (sock, from, msg, args, sender) => {
        const questions = [
            { q: "Quelle est la capitale d'Haïti?", r: "port-au-prince", a: "Port-au-Prince" },
            { q: "Combien de couleurs dans le drapeau haïtien?", r: "2", a: "2 (bleu et rouge)" },
            { q: "En quelle année Haïti a obtenu son indépendance?", r: "1804", a: "1804" },
            { q: "Quelle est la monnaie d'Haïti?", r: "gourde", a: "La Gourde (HTG)" },
            { q: "Quel est le plus grand pays du monde?", r: "russie", a: "La Russie" },
            { q: "Combien de continents y a-t-il?", r: "7", a: "7 continents" },
            { q: "Quelle est la planète la plus proche du soleil?", r: "mercure", a: "Mercure" },
            { q: "Combien font 15 x 15?", r: "225", a: "225" },
            { q: "Qui a inventé l'ampoule électrique?", r: "edison", a: "Thomas Edison" },
            { q: "Quelle est la langue officielle du Brésil?", r: "portugais", a: "Le Portugais" },
            { q: "Quel animal est le plus grand du monde?", r: "baleine bleue", a: "La Baleine bleue" },
            { q: "En quelle année a débuté la 2ème Guerre Mondiale?", r: "1939", a: "1939" },
            { q: "Combien d'os a le corps humain adulte?", r: "206", a: "206 os" },
            { q: "Quelle est la capitale de la France?", r: "paris", a: "Paris" },
            { q: "Quel est le symbole chimique de l'or?", r: "au", a: "Au" },
        ];
        const q = randomChoice(questions);
        const key = `quiz_${from}_${sender}`;
        quizSessions.set(key, { answer: q.r, correct: q.a, time: Date.now() });
        setTimeout(() => quizSessions.delete(key), 30000);
        await reply(sock, from,
            `🎯 *QUIZ O-TECH*\n\n❓ ${q.q}\n\n_Tu as 30 secondes! Réponds directement._`, msg);
    },

    pendu: async (sock, from, msg, args, sender) => {
        const mots = [
            "HAITI", "TECHNOLOGIE", "INNOVATION", "WHATSAPP", "ORDINATEUR",
            "INTERNET", "PROGRAMME", "ROBOT", "INTELLIGENCE", "DIGITAL",
            "ANDROID", "TERMUX", "BAILEYS", "JAVASCRIPT", "OTECH",
        ];
        const mot = randomChoice(mots);
        const key = `pendu_${from}`;
        penduSessions.set(key, {
            mot, trouve: Array(mot.length).fill("_"),
            lettresEssayees: [], erreurs: 0, maxErreurs: 6,
            joueur: sender
        });
        const session = penduSessions.get(key);
        await reply(sock, from,
            `🎮 *JEU DU PENDU*\n\n` +
            `Mot: *${session.trouve.join(" ")}*\n` +
            `Lettres: ${session.mot.length}\n\n` +
            `_Tape .lettre X pour proposer une lettre_\n` +
            `_Erreurs: 0/${session.maxErreurs}_`, msg);
    },

    lettre: async (sock, from, msg, args, sender) => {
        const key = `pendu_${from}`;
        const session = penduSessions.get(key);
        if (!session) return reply(sock, from, "❌ Pas de partie en cours. Tape .pendu", msg);
        const lettre = args[0]?.toUpperCase();
        if (!lettre || lettre.length !== 1) return reply(sock, from, "❌ Usage: .lettre A", msg);
        if (session.lettresEssayees.includes(lettre))
            return reply(sock, from, `⚠️ Lettre *${lettre}* déjà essayée!`, msg);

        session.lettresEssayees.push(lettre);
        if (session.mot.includes(lettre)) {
            for (let i = 0; i < session.mot.length; i++) {
                if (session.mot[i] === lettre) session.trouve[i] = lettre;
            }
        } else {
            session.erreurs++;
        }

        const penduArt = ["😊", "😐", "😟", "😨", "😰", "😱", "💀"];
        const gagne = !session.trouve.includes("_");
        const perdu = session.erreurs >= session.maxErreurs;

        if (gagne) {
            penduSessions.delete(key);
            const gains = session.mot.length * 10;
            addCoins(sender, gains);
            return reply(sock, from,
                `🎉 *GAGNÉ!*\n\nMot: *${session.mot}*\n💰 +${gains} coins gagnés!`, msg);
        }
        if (perdu) {
            penduSessions.delete(key);
            return reply(sock, from,
                `💀 *PERDU!*\n\nLe mot était: *${session.mot}*\n\n_Tape .pendu pour rejouer_`, msg);
        }

        await reply(sock, from,
            `${penduArt[session.erreurs]} *PENDU*\n\n` +
            `Mot: *${session.trouve.join(" ")}*\n` +
            `Lettres essayées: ${session.lettresEssayees.join(", ")}\n` +
            `Erreurs: ${session.erreurs}/${session.maxErreurs}`, msg);
    },

    devinette: async (sock, from, msg, args, sender) => {
        const devinettes = [
            { q: "Je parle sans bouche, j'entends sans oreilles. Qu'est-ce que c'est?", r: "echo", a: "L'écho" },
            { q: "Plus je sèche, plus je suis mouillée. Qu'est-ce que c'est?", r: "serviette", a: "Une serviette" },
            { q: "J'ai des dents mais je ne mords pas. Qu'est-ce que c'est?", r: "peigne", a: "Un peigne" },
            { q: "Je vole sans ailes, je pleure sans yeux. Qu'est-ce que c'est?", r: "nuage", a: "Un nuage" },
            { q: "Plus on m'enlève, plus je grandis. Qu'est-ce que c'est?", r: "trou", a: "Un trou" },
            { q: "Tout le monde me passe dessus mais personne ne m'écrase. Qu'est-ce?", r: "route", a: "La route" },
        ];
        const d = randomChoice(devinettes);
        const key = `devinette_${from}_${sender}`;
        quizSessions.set(key, { answer: d.r, correct: d.a, time: Date.now() });
        setTimeout(() => quizSessions.delete(key), 45000);
        await reply(sock, from,
            `🧩 *DEVINETTE O-TECH*\n\n${d.q}\n\n_45 secondes pour répondre!_`, msg);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   📊 STATS GROUPE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    stats: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).length;
        const total = meta.participants.length;
        const groupStats = groupMsgStats.get(from) || {};
        const totalMsgs = Object.values(groupStats).reduce((a, b) => a + b, 0);
        await reply(sock, from,
            `📊 *Stats du Groupe*\n\n` +
            `🏢 *${meta.subject}*\n` +
            `👥 Membres: *${total}*\n` +
            `👮 Admins: *${admins}*\n` +
            `💬 Messages enregistrés: *${totalMsgs}*\n` +
            `🎯 Membres actifs: *${Object.keys(groupStats).length}*`, msg);
    },

    top: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const groupStats = groupMsgStats.get(from) || {};
        const sorted = Object.entries(groupStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        if (!sorted.length) return reply(sock, from, "❌ Pas encore de stats. Commencez à chatter!", msg);
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        let text = `🏆 *TOP 10 MEMBRES ACTIFS*\n\n`;
        const mentions = [];
        for (let i = 0; i < sorted.length; i++) {
            const [jid, count] = sorted[i];
            text += `${medals[i]} @${shortNum(jid)} — *${count} msgs*\n`;
            mentions.push(jid);
        }
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    monscore: async (sock, from, msg, args, sender) => {
        const groupStats = groupMsgStats.get(from) || {};
        const myMsgs = groupStats[sender] || 0;
        const coins = getCoins(sender);
        const lvl = getLevel(sender);
        await reply(sock, from,
            `📈 *Ton Score*\n\n` +
            `👤 @${shortNum(sender)}\n` +
            `💬 Messages: *${myMsgs}*\n` +
            `⭐ Niveau: *${lvl.level}* (${lvl.xp} XP)\n` +
            `💰 Coins: *${coins}*`, msg);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   💰 ÉCONOMIE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    solde: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        const coins = getCoins(target);
        const lvl = getLevel(target);
        await reply(sock, from,
            `💰 *Solde O-TECH*\n\n` +
            `👤 @${shortNum(target)}\n` +
            `💵 Coins: *${coins}*\n` +
            `⭐ Niveau: *${lvl.level}*\n` +
            `📊 XP: *${lvl.xp}*`, msg);
    },

    daily: async (sock, from, msg, args, sender) => {
        const now = Date.now();
        const lastDaily = dailyCooldown.get(sender) || 0;
        const cooldown = 24 * 60 * 60 * 1000;
        if (now - lastDaily < cooldown) {
            const reste = Math.ceil((cooldown - (now - lastDaily)) / 3600000);
            return reply(sock, from, `⏳ Daily déjà réclamé! Reviens dans *${reste}h*`, msg);
        }
        const gain = Math.floor(Math.random() * 200) + 100;
        addCoins(sender, gain);
        dailyCooldown.set(sender, now);
        await reply(sock, from,
            `🎁 *Daily Reward!*\n\n` +
            `💰 Tu as reçu *${gain} coins*!\n` +
            `💵 Solde total: *${getCoins(sender)} coins*\n\n` +
            `_Reviens demain pour ton prochain daily!_`, msg);
    },

    transfert: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .transfert @user montant", msg);
        const montant = parseInt(args[args.length - 1]);
        if (isNaN(montant) || montant <= 0) return reply(sock, from, "❌ Montant invalide.", msg);
        const target = mentioned[0];
        const myCoins = getCoins(sender);
        if (myCoins < montant) return reply(sock, from, `❌ Pas assez de coins! Tu as *${myCoins}*`, msg);
        addCoins(sender, -montant);
        addCoins(target, montant);
        await sock.sendMessage(from, {
            text: `💸 *Transfert effectué!*\n\n` +
                `De: @${shortNum(sender)}\n` +
                `À: @${shortNum(target)}\n` +
                `💰 Montant: *${montant} coins*`,
            mentions: [sender, target]
        }, { quoted: msg });
    },

    pari: async (sock, from, msg, args, sender) => {
        const montant = parseInt(args[0]);
        if (isNaN(montant) || montant <= 0) return reply(sock, from, "❌ Usage: .pari 100", msg);
        const myCoins = getCoins(sender);
        if (myCoins < montant) return reply(sock, from, `❌ Pas assez de coins! Tu as *${myCoins}*`, msg);
        const gagne = Math.random() > 0.5;
        if (gagne) {
            addCoins(sender, montant);
            await reply(sock, from,
                `🎰 *GAGNÉ!*\n\n+${montant} coins!\n💰 Solde: *${getCoins(sender)} coins*`, msg);
        } else {
            addCoins(sender, -montant);
            await reply(sock, from,
                `🎰 *PERDU!*\n\n-${montant} coins!\n💰 Solde: *${getCoins(sender)} coins*`, msg);
        }
    },

    work: async (sock, from, msg, args, sender) => {
        const now = Date.now();
        const lastWork = workCooldown.get(sender) || 0;
        const cooldown = 60 * 60 * 1000; // 1h
        if (now - lastWork < cooldown) {
            const reste = Math.ceil((cooldown - (now - lastWork)) / 60000);
            return reply(sock, from, `⏳ Tu viens de travailler! Reviens dans *${reste} min*`, msg);
        }
        const jobs = [
            { job: "développeur web", gain: 80 },
            { job: "graphiste", gain: 60 },
            { job: "vendeur O-TECH", gain: 70 },
            { job: "technicien réseau", gain: 90 },
            { job: "community manager", gain: 50 },
        ];
        const job = randomChoice(jobs);
        addCoins(sender, job.gain);
        workCooldown.set(sender, now);
        await reply(sock, from,
            `💼 *Work Done!*\n\n` +
            `Tu as travaillé comme *${job.job}*\n` +
            `💰 Gagné: *${job.gain} coins*\n` +
            `💵 Solde: *${getCoins(sender)} coins*\n\n` +
            `_Reviens dans 1h pour retravailler_`, msg);
    },

    rob: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .rob @user", msg);
        const target = mentioned[0];
        if (isOwner(target)) return reply(sock, from, "❌ Tu peux pas voler l'owner!", msg);
        const targetCoins = getCoins(target);
        if (targetCoins < 50) return reply(sock, from, `❌ @${shortNum(target)} est trop pauvre!`, msg);
        const success = Math.random() > 0.45;
        if (success) {
            const vol = Math.floor(targetCoins * 0.2);
            addCoins(sender, vol);
            addCoins(target, -vol);
            await sock.sendMessage(from, {
                text: `🦹 *Vol réussi!*\n\n` +
                    `Tu as volé *${vol} coins* à @${shortNum(target)}!\n` +
                    `💰 Solde: *${getCoins(sender)} coins*`,
                mentions: [sender, target]
            }, { quoted: msg });
        } else {
            const amende = 50;
            addCoins(sender, -amende);
            await sock.sendMessage(from, {
                text: `🚔 *Vol raté!*\n\n` +
                    `Tu as été arrêté en essayant de voler @${shortNum(target)}!\n` +
                    `💸 Amende: *${amende} coins*\n` +
                    `💰 Solde: *${getCoins(sender)} coins*`,
                mentions: [sender, target]
            }, { quoted: msg });
        }
    },

    richesse: async (sock, from, msg) => {
        const sorted = [...coinsData.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        if (!sorted.length) return reply(sock, from, "❌ Personne n'a encore de coins!", msg);
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        let text = `💰 *TOP 10 RICHESSES O-TECH*\n\n`;
        const mentions = sorted.map(([jid]) => jid);
        for (let i = 0; i < sorted.length; i++) {
            const [jid, coins] = sorted[i];
            text += `${medals[i]} @${shortNum(jid)} — *${coins} coins*\n`;
        }
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   🖼️ IMAGES FUN (GIF & MEME via URL publiques)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    meme: async (sock, from, msg) => {
        const memes = [
            "https://i.imgur.com/RPyxZSU.jpg",
            "https://i.imgur.com/1uOWpvB.jpg",
            "https://i.imgur.com/HiHJSCH.jpg",
            "https://i.imgur.com/O5XOG7O.jpg",
            "https://i.imgur.com/yL5oDEQ.jpg",
        ];
        try {
            const url = randomChoice(memes);
            const res = await fetch(url);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: buf, caption: "😂 *Meme du jour!*" }, { quoted: msg });
        } catch (_) {
            await reply(sock, from, "❌ Impossible de charger le meme.", msg);
        }
    },

    ship: async (sock, from, msg, args) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length < 2) return reply(sock, from, "❌ Usage: .ship @user1 @user2", msg);
        const pct = Math.floor(Math.random() * 101);
        let emoji = pct >= 80 ? "💕" : pct >= 50 ? "💛" : pct >= 30 ? "😐" : "💔";
        const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
        await sock.sendMessage(from, {
            text: `💘 *SHIP METER*\n\n` +
                `@${shortNum(mentioned[0])}\n` +
                `❤️ x ❤️\n` +
                `@${shortNum(mentioned[1])}\n\n` +
                `[${bar}] *${pct}%* ${emoji}`,
            mentions: mentioned
        }, { quoted: msg });
    },

    hug: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .hug @user", msg);
        await sock.sendMessage(from, {
            text: `🤗 @${shortNum(sender)} fait un câlin à @${shortNum(mentioned[0])}!\n_(っ◕‿◕)っ_`,
            mentions: [sender, ...mentioned]
        }, { quoted: msg });
    },

    slap: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .slap @user", msg);
        if (isOwner(mentioned[0])) return reply(sock, from, "❌ Tu peux pas gifler l'owner!", msg);
        await sock.sendMessage(from, {
            text: `👋 @${shortNum(sender)} gifle @${shortNum(mentioned[0])}! 😂\n*BAM!* 💥`,
            mentions: [sender, ...mentioned]
        }, { quoted: msg });
    },

    fight: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .fight @user", msg);
        const winner = Math.random() > 0.5 ? sender : mentioned[0];
        const loser = winner === sender ? mentioned[0] : sender;
        const moves = ["uppercut", "coup de pied volant", "combo 3 coups", "esquive + contre", "KO final"];
        await sock.sendMessage(from, {
            text: `⚔️ *FIGHT!*\n\n` +
                `@${shortNum(sender)} VS @${shortNum(mentioned[0])}\n\n` +
                `💥 ${randomChoice(moves)}...\n` +
                `💥 ${randomChoice(moves)}...\n` +
                `💥 ${randomChoice(moves)}...\n\n` +
                `🏆 *@${shortNum(winner)} GAGNE!*\n` +
                `😵 @${shortNum(loser)} est KO!`,
            mentions: [sender, ...mentioned]
        }, { quoted: msg });
    },

    pp: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        try {
            const ppUrl = await sock.profilePictureUrl(target, "image");
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, {
                image: buf,
                caption: `🖼️ *Photo de profil*\n@${shortNum(target)}`,
                mentions: [target]
            }, { quoted: msg });
        } catch (_) {
            await reply(sock, from, `❌ @${shortNum(target)} n'a pas de photo de profil.`, msg);
        }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   🤖 MENU IA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ia: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from,
            `🤖 *O-TECH IA*\n\nUsage: *.ia ta question*\n\nEx: _.ia c'est quoi l'intelligence artificielle?_`, msg);
        const question = args.join(" ");
        await reply(sock, from, `🤖 _Analyse en cours..._`, msg);
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": CONFIG.anthropicKey || "",
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: "claude-haiku-4-5-20251001",
                    max_tokens: 500,
                    system: "Tu es O-TECH BOT, un assistant IA créé par Orlando Tech pour WhatsApp. Réponds de façon concise, en français ou en créole haïtien selon la langue de l'utilisateur. Sois direct et utile.",
                    messages: [{ role: "user", content: question }]
                })
            });
            const data = await res.json();
            const answer = data.content?.[0]?.text || "❌ Pas de réponse.";
            await reply(sock, from,
                `🤖 *O-TECH IA*\n\n❓ _${question}_\n\n━━━━━━━━━━━━━━\n\n${answer}\n\n━━━━━━━━━━━━━━\n_Powered by O-TECH_ ⚡`, msg);
        } catch (e) {
            await reply(sock, from, `❌ IA indisponible. Configure la clé API dans CONFIG.anthropicKey`, msg);
        }
    },

    aikey: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!args[0]) return reply(sock, from, "❌ Usage: .aikey sk-ant-XXXXX", msg);
        CONFIG.anthropicKey = args[0];
        await reply(sock, from, "✅ Clé API IA enregistrée!", msg);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   🎵 MENU MUSIQUE / YOUTUBE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ytb: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from,
            `🎵 *YouTube Search*\n\nUsage: *.ytb nom de la chanson*\n\nEx: _.ytb Rihanna Umbrella_`, msg);
        const query = encodeURIComponent(args.join(" "));
        const searchUrl = `https://www.youtube.com/results?search_query=${query}`;
        await reply(sock, from,
            `🎵 *Résultat YouTube*\n\n` +
            `🔍 Recherche: *${args.join(" ")}*\n\n` +
            `🔗 ${searchUrl}\n\n` +
            `_Copie ce lien dans YouTube pour écouter_ 🎶`, msg);
    },

    musique: async (sock, from, msg, args) => {
        const p = CONFIG.prefix;
        await reply(sock, from,
            `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
            `┃  🎵 *MENU MUSIQUE*   ┃\n` +
            `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
            `› ${p}ytb *[chanson]* — Chercher sur YouTube\n` +
            `› ${p}paroles *[chanson]* — Trouver les paroles\n` +
            `› ${p}playlist — Playlist O-TECH recommandée\n` +
            `› ${p}radio — Liens radios haïtiennes\n\n` +
            `_Ex: .ytb Drake God's Plan_\n\n` +
            `_O-TECH BOT 🎶_`, msg);
    },

    paroles: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .paroles nom artiste - chanson", msg);
        const query = encodeURIComponent(args.join(" ") + " lyrics");
        await reply(sock, from,
            `🎤 *Paroles — ${args.join(" ")}*\n\n` +
            `🔗 https://www.google.com/search?q=${query}\n\n` +
            `_Clique pour trouver les paroles_ 🎵`, msg);
    },

    playlist: async (sock, from, msg) => {
        await reply(sock, from,
            `🎵 *Playlist O-TECH Recommandée*\n\n` +
            `🔥 *Trap / Hip-Hop*\n` +
            `▸ Drake, Travis Scott, Future\n\n` +
            `🌴 *Kompa / Haïti*\n` +
            `▸ T-Vice, Harmonik, Carimi\n\n` +
            `💫 *Afrobeats*\n` +
            `▸ Burna Boy, Wizkid, Davido\n\n` +
            `🎶 *R&B*\n` +
            `▸ The Weeknd, SZA, Giveon\n\n` +
            `_Tape .ytb + nom artiste pour chercher_ 🚀`, msg);
    },

    radio: async (sock, from, msg) => {
        await reply(sock, from,
            `📻 *Radios Haïtiennes en ligne*\n\n` +
            `🔴 *Radio Caraïbes FM*\n` +
            `▸ https://radiocaraibesfm.com\n\n` +
            `🔵 *Radio Metropole*\n` +
            `▸ https://www.metropolehaiti.com\n\n` +
            `🟢 *Radio Scoop FM*\n` +
            `▸ https://radioscoopfm.com\n\n` +
            `🟡 *HBN Radio*\n` +
            `▸ https://hbnradio.com\n\n` +
            `_Klike pou koute an dirèk_ 🎶`, msg);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   👑 MENU ADMIN OWNER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    admin: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const p = CONFIG.prefix;
        const u = process.uptime();
        const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = Math.floor(u % 60);
        await sendImg(sock, from, ANON_IMG,
            `┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
            `┃  👑 *PANEL OWNER O-TECH* ┃\n` +
            `┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
            `⚙️ *Statut Bot*\n` +
            `▸ Mode: *${CONFIG.mode}*\n` +
            `▸ Uptime: *${h}h ${m}m ${s}s*\n` +
            `▸ Cmds: *${Object.keys(commands).length}*\n` +
            `▸ IA Key: *${CONFIG.anthropicKey ? "✅ Configurée" : "❌ Non configurée"}*\n\n` +
            `╔══════════════════════╗\n` +
            `║  🔧 *CONTRÔLE BOT*   ║\n` +
            `╚══════════════════════╝\n` +
            `› ${p}public — Mode tout le monde\n` +
            `› ${p}prive — Mode privé seulement\n` +
            `› ${p}grouponly — Mode groupes seulement\n` +
            `› ${p}aikey [clé] — Configurer clé IA\n` +
            `› ${p}broadcast [msg] — Message tous groupes\n` +
            `› ${p}listgroups — Voir tous les groupes\n` +
            `› ${p}banuser @user — Bannir un user du bot\n` +
            `› ${p}unbanuser @user — Débannir\n` +
            `› ${p}clearstats — Reset stats\n\n` +
            `_Panel Owner — O-TECH © 2026_ 👑`, msg);
    },

    broadcast: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!args.length) return reply(sock, from, "❌ Usage: .broadcast ton message", msg);
        const broadMsg = args.join(" ");
        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        if (!groupIds.length) return reply(sock, from, "❌ Aucun groupe trouvé.", msg);
        await reply(sock, from, `📡 Envoi du broadcast à *${groupIds.length}* groupes...`, msg);
        let sent = 0;
        for (const gid of groupIds) {
            try {
                await sock.sendMessage(gid, {
                    text: `📢 *BROADCAST O-TECH BOT*\n\n${broadMsg}\n\n_— Mr. Orlando_ 👑`
                });
                sent++;
                await wait(500);
            } catch (_) {}
        }
        await reply(sock, from, `✅ Broadcast envoyé à *${sent}/${groupIds.length}* groupes!`, msg);
    },

    listgroups: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const groups = await sock.groupFetchAllParticipating();
        const list = Object.values(groups);
        if (!list.length) return reply(sock, from, "❌ Aucun groupe.", msg);
        let text = `👥 *Groupes O-TECH BOT* (${list.length})\n\n`;
        for (let i = 0; i < list.length; i++) {
            text += `${i + 1}. *${list[i].subject}*\n`;
            text += `   └ ${list[i].participants.length} membres\n`;
        }
        await reply(sock, from, text, msg);
    },

    banuser: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .banuser @user", msg);
        if (!CONFIG.bannedUsers) CONFIG.bannedUsers = [];
        for (const jid of mentioned) {
            if (!CONFIG.bannedUsers.includes(jid)) CONFIG.bannedUsers.push(jid);
        }
        await reply(sock, from, `🚫 *${mentioned.length}* user(s) banni(s) du bot!`, msg);
    },

    unbanuser: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .unbanuser @user", msg);
        if (!CONFIG.bannedUsers) CONFIG.bannedUsers = [];
        CONFIG.bannedUsers = CONFIG.bannedUsers.filter(j => !mentioned.includes(j));
        await reply(sock, from, `✅ *${mentioned.length}* user(s) débanni(s)!`, msg);
    },

    clearstats: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        groupMsgStats.clear();
        coinsData.clear();
        xpData.clear();
        await reply(sock, from, "🗑️ *Stats, coins et XP réinitialisés!*", msg);
    },

};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SÉCURITÉ — DÉTECTION SPAM / LIENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function runSecurityChecks(sock, from, msg, sender, body) {
    if (!isGroup(from)) return false;
    const antiLink = getGroupSetting(from, "antiLink");
    const antiSpam = getGroupSetting(from, "antiSpam");
    const antiBadWord = getGroupSetting(from, "antiBadWord");

    if (antiLink && containsLink(body) && !isOwner(sender)) {
        await sock.sendMessage(from, {
            delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender }
        });
        await sock.sendMessage(from, {
            text: `🔗 @${shortNum(sender)} Les liens sont interdits dans ce groupe!`,
            mentions: [sender],
        });
        return true;
    }

    if (antiBadWord && containsBadWord(body) && !isOwner(sender)) {
        await sock.sendMessage(from, {
            delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender }
        });
        await sock.sendMessage(from, {
            text: `⚠️ @${shortNum(sender)} Langage inapproprié détecté. Message supprimé!`,
            mentions: [sender],
        });
        return true;
    }

    if (antiSpam && !isOwner(sender)) {
        if (!spamMap.has(sender)) spamMap.set(sender, { count: 0, timer: null });
        const data = spamMap.get(sender);
        data.count++;
        clearTimeout(data.timer);
        data.timer = setTimeout(() => spamMap.delete(sender), CONFIG.spamWindow);
        if (data.count >= CONFIG.spamLimit) {
            await sock.groupParticipantsUpdate(from, [sender], "remove");
            spamMap.delete(sender);
            await sock.sendMessage(from, {
                text: `🚫 @${shortNum(sender)} expulsé pour spam.`,
                mentions: [sender],
            });
            return true;
        }
    }
    return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   INTERCEPTER VIEW ONCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function interceptViewOnce(sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;

    // Chercher le message view once dans toutes les structures possibles
    const viewOnceMsg =
        msg.message?.viewOnceMessage?.message ||
        msg.message?.viewOnceMessageV2?.message ||
        msg.message?.viewOnceMessageV2Extension?.message ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message;

    if (!viewOnceMsg) return;

    const storeKey = msg.key.id;

    try {
        let mediaMsg = null;
        let mediaType = null;

        if (viewOnceMsg.imageMessage) {
            mediaMsg = viewOnceMsg.imageMessage;
            mediaType = "image";
        } else if (viewOnceMsg.videoMessage) {
            mediaMsg = viewOnceMsg.videoMessage;
            mediaType = "video";
        }

        if (!mediaMsg || !mediaType) return;

        // Télécharger le média
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buf = Buffer.concat(chunks);

        viewOnceStore.set(storeKey, { type: mediaType, buffer: buf, sender });
        console.log(`[VV] ✅ ${mediaType} intercepté (${storeKey.slice(0,8)}...)`);
        setTimeout(() => viewOnceStore.delete(storeKey), 600000); // 10 min

    } catch (e) {
        console.warn("[VV] Erreur:", e.message);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   GESTIONNAIRE DE MESSAGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMessage(sock, m) {
    const msg = m.messages[0];
    // fromMe géré plus bas

    const from = msg.key.remoteJid;
    // Si fromMe (message envoyé par le bot = l'owner), on force le sender à ownerNumber
    const rawSender = msg.key.participant || from;
    const sender = msg.key.fromMe
        ? CONFIG.ownerNumber + "@s.whatsapp.net"
        : rawSender;
    const body = getBody(msg).trim();
    const inGroup = isGroup(from);

    // Intercepter view once automatiquement
    await interceptViewOnce(sock, msg);

    // fromMe = message envoyé depuis ce numéro (le bot = l'owner)
    // On accepte TOUS les messages fromMe comme venant de l'owner

    if (CONFIG.mode === "group" && !inGroup) return;
    if (CONFIG.mode === "private" && inGroup) return;

    // Vérifier si user banni du bot
    if (CONFIG.bannedUsers?.includes(sender) && !isOwner(sender)) return;

    const blocked = await runSecurityChecks(sock, from, msg, sender, body);
    if (blocked) return;

    // ── TRACKING STATS + XP ─────────────────────────
    if (isGroup(from)) {
        if (!groupMsgStats.has(from)) groupMsgStats.set(from, {});
        const gs = groupMsgStats.get(from);
        gs[sender] = (gs[sender] || 0) + 1;
        addXP(sender, 2);
    }

    // ── VÉRIFICATION RÉPONSES QUIZ/DEVINETTE ─────
    if (!body.startsWith(CONFIG.prefix)) {
        const quizKey = `quiz_${from}_${sender}`;
        const devKey = `devinette_${from}_${sender}`;
        for (const key of [quizKey, devKey]) {
            const session = quizSessions.get(key);
            if (session && body.toLowerCase().includes(session.answer.toLowerCase())) {
                quizSessions.delete(key);
                const gain = 50;
                addCoins(sender, gain);
                addXP(sender, 20);
                await reply(sock, from,
                    `✅ *BONNE RÉPONSE!*\n\nRéponse: *${session.correct}*\n💰 +${gain} coins!\n⭐ +20 XP!`, msg);
                return;
            }
        }
        return;
    }

    const args = body.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const handler = commands[commandName];

    if (handler) {
        try {
            // ⚡ RÉACTION automatique dès que la commande est reçue
            const reactEmojis = ["⚡","🤖","🔥","✅","💫","🚀","⚙️","💥","🎯","👑"];
            try {
                await sock.sendMessage(from, {
                    react: { text: randomChoice(reactEmojis), key: msg.key }
                });
            } catch (_) {}

            await handler(sock, from, msg, args, sender);
        } catch (err) {
            console.error(`[ERREUR] .${commandName}:`, err.message);
            // Réaction erreur
            try {
                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            } catch (_) {}
            await reply(sock, from, `❌ Erreur lors de l'exécution de *.${commandName}*`, msg);
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONNEXION PRINCIPALE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function startOTechBot() {
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionName);
    const { version } = await fetchLatestBaileysVersion();

    // Demander numéro AVANT de créer le socket
    let phoneNumber = null;
    if (!state.creds.registered) {
        phoneNumber = await question("📱 Ton numéro WhatsApp (ex: 50935443504) : ");
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
        console.log("⏳ Connexion en cours, patiente...");
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
    });

    // Pairing code — attendre que le socket soit VRAIMENT prêt
    if (phoneNumber && !state.creds.registered) {
        // Attendre l'event "connecting" puis demander le code
        await new Promise(resolve => setTimeout(resolve, 3000));
        let retries = 3;
        while (retries > 0) {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                const fmt = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n╔══════════════════════════════════╗`);
                console.log(`║   🚀 CODE JUMELAGE O-TECH BOT   ║`);
                console.log(`║          >> ${fmt} <<          ║`);
                console.log(`╚══════════════════════════════════╝`);
                console.log(`\n👉 Ouvre WhatsApp sur ton téléphone`);
                console.log(`👉 ⋮ Menu → Appareils connectés`);
                console.log(`👉 Connecter avec un numéro de téléphone`);
                console.log(`👉 Entre le code: ${fmt}\n`);
                break;
            } catch (e) {
                retries--;
                console.log(`⚠️  Tentative échouée (${e.message}), retry dans 3s...`);
                if (retries === 0) {
                    console.log(`❌ Impossible d\'obtenir le code. Supprime '${CONFIG.sessionName}' et relance.`);
                    process.exit(1);
                }
                await wait(3000);
            }
        }
    }

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut && code !== 401;
            if (shouldReconnect) {
                console.log(`🔄 Reconnexion... (code: ${code})`);
                await wait(4000);
                startOTechBot();
            } else {
                console.log(`🔴 Session expirée. Supprime '${CONFIG.sessionName}' et relance.`);
                process.exit(0);
            }
        } else if (connection === "open") {
            console.log(`\n✅ ${CONFIG.botName} EST EN LIGNE!`);
            console.log(`▸ Préfixe : ${CONFIG.prefix}`);
            console.log(`▸ Mode    : ${CONFIG.mode}`);
            console.log(`▸ Commandes : ${Object.keys(commands).length}\n`);

            // Photo de profil du bot = image anonymous
            try {
                if (fs.existsSync(ANON_IMG)) {
                    const botJid = sock.user?.id;
                    if (botJid) {
                        await sock.updateProfilePicture(botJid, { img: fs.readFileSync(ANON_IMG) });
                        console.log("🖼  Photo de profil Anonymous O-TECH appliquée.");
                    }
                }
            } catch (err) {
                console.warn("⚠️  Photo de profil:", err.message);
            }
        }
    });

    sock.ev.on("messages.upsert", (m) => handleMessage(sock, m));

    // ── ARRIVÉES / DÉPARTS + ANTI-QUICK ──────────
    sock.ev.on("group-participants.update", async (anu) => {
        try {
            const groupId = anu.id;
            const metadata = await sock.groupMetadata(groupId);
            const groupName = metadata.subject;
            const memberCount = metadata.participants.length;

            for (const num of anu.participants) {
                const numShort = shortNum(num);

                // ── ANTI-QUICK ────────────────────
                if (QUICK_NUMBERS.includes(numShort) && anu.action === "add") {
                    const quickMsg = randomChoice(ANTI_QUICK_MSGS);
                    await sock.sendMessage(groupId, { text: quickMsg, mentions: [num] });
                    try {
                        await sock.groupParticipantsUpdate(groupId, [num], "remove");
                        await sock.sendMessage(groupId, { text: "🚫 *Quick* expulsé automatiquement! Ou pa gen dwa isit." });
                    } catch (_) {}
                    continue;
                }

                // ── OWNER PROTÉGÉ ─────────────────
                if (isOwner(num) && anu.action === "remove") {
                    // Quelqu'un a kické l'owner — envoyer message drôle
                    // (le bot ne peut pas se re-ajouter lui-même, mais il signale)
                    try {
                        // Trouver qui a fait le kick (actor = celui qui a kické)
                        const kickerJid = anu.actor || null;
                        const kickerShort = kickerJid ? shortNum(kickerJid) : "quelqu'un";
                        const antiMsg = randomChoice(ANTI_KICK_OWNER_MSGS);
                        // On essaie d'envoyer dans le groupe (si bot encore dedans)
                        await sock.sendMessage(groupId, {
                            text: `@${kickerShort} ${antiMsg}`,
                            mentions: kickerJid ? [kickerJid] : []
                        });
                    } catch (_) {}
                    continue;
                }

                let contactName = numShort;
                try {
                    const info = await sock.onWhatsApp(num);
                    if (info?.[0]?.notify) contactName = info[0].notify;
                } catch {}

                if (anu.action === "add") {
                    // Photo de profil du nouveau membre
                    let ppBuf = null;
                    try {
                        const ppUrl = await sock.profilePictureUrl(num, "image");
                        const res = await fetch(ppUrl);
                        ppBuf = Buffer.from(await res.arrayBuffer());
                    } catch (_) {}

                    // Photo du groupe
                    let groupPpBuf = null;
                    try {
                        const gpUrl = await sock.profilePictureUrl(groupId, "image");
                        const res = await fetch(gpUrl);
                        groupPpBuf = Buffer.from(await res.arrayBuffer());
                    } catch (_) {}

                    const welcomeText =
                        `╔══════════════════════════╗\n` +
                        `║  🌐 *BIENVENUE CHEZ O-TECH* ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `👋 Salut @${numShort}!\n\n` +
                        `👤 *Nom :* ${contactName}\n` +
                        `📱 *Numéro :* +${numShort}\n` +
                        `🏢 *Groupe :* ${groupName}\n` +
                        `👥 *Membres :* ${memberCount}\n\n` +
                        `📜 Merci de lire la description et\n` +
                        `respecter les règles du groupe.\n\n` +
                        `_Innovation constante — O-TECH BOT_ 🚀`;

                    // Envoyer photo profil du membre + message welcome
                    if (ppBuf) {
                        await sock.sendMessage(groupId, {
                            image: ppBuf,
                            caption: welcomeText,
                            mentions: [num]
                        });
                    } else {
                        await sock.sendMessage(groupId, { text: welcomeText, mentions: [num] });
                    }

                } else if (anu.action === "remove") {
                    // Photo de profil du membre qui part
                    let ppBuf = null;
                    try {
                        const ppUrl = await sock.profilePictureUrl(num, "image");
                        const res = await fetch(ppUrl);
                        ppBuf = Buffer.from(await res.arrayBuffer());
                    } catch (_) {}

                    const byeText =
                        `╔══════════════════════════╗\n` +
                        `║    👋 *DÉPART DE O-TECH*   ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `😢 *${contactName}* (+${numShort})\n` +
                        `vient de quitter *${groupName}*.\n\n` +
                        `👥 *Membres restants :* ${memberCount}\n\n` +
                        `_On espère te revoir bientôt — O-TECH BOT_ 🚀`;

                    if (ppBuf) {
                        await sock.sendMessage(groupId, {
                            image: ppBuf,
                            caption: byeText,
                            mentions: [num]
                        });
                    } else {
                        await sock.sendMessage(groupId, { text: byeText, mentions: [num] });
                    }
                }
            }
        } catch (err) {
            console.error("[GROUP EVENT]", err.message);
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   DÉMARRAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n╔═══════════════════════════╗");
console.log("║    🤖  O-TECH BOT v3.0    ║");
console.log("║   Powered by O-TECH.ht    ║");
console.log("╚═══════════════════════════╝\n");

startOTechBot();
