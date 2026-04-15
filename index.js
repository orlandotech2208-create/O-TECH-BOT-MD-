// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   O-TECH BOT v4.0 — by Orlando Tech 🇭🇹
//   ESM complet — Compatible Node v24/v25
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    getContentType,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    areJidsSameUser,
} from "baileys";
import pino from "pino";
import { createInterface } from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CONFIG = {
    botName:     "O-TECH BOT",
    owner:       "Orlando Tech",
    ownerNumber: "50935443504",
    prefix:      ".",
    sessionName: "session_otech",
    mode:        "both",
    antiLink:    false,
    antiSpam:    false,
    antiBadWord: false,
    spamLimit:   5,
    spamWindow:  5000,
};

const ANON_IMG = path.join(__dirname, "anon.jpg");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   NUMÉROS BLOQUÉS (QUICK etc.)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QUICK_NUMBERS = [];

const ANTI_QUICK_MSGS = [
    "😂 Eyyy Quick! Ou vini kòm? Ale Quick papa ou, mwen pa papa ou frè! Bot O-TECH pa fè jwèt ak moun kòm ou, soti nan group la nèt epi ale fè lavi ou lwen! 💀🤣",
    "🤣 QUICK?! Aaah non non non frè... ou panse ou ka rantre konsa san pèmisyon?! Ale Quick, group sa pa pou moun kòm ou, soti la epi pa janm tounen! 😭🚫",
    "💀 Eyyy sa Quick sa! Ou pa wè se O-TECH BOT isit? Yon bot serye pou moun serye! Ou Quick, ou pa gen kote isit, ale fè wout ou! 😂🤡",
    "🚫 QUICK DETECTED nan radar O-TECH! Frè mwen konnen trukaj ou yo, group sa pa pou ou. Ale retire kò ou, papa ou rele ou lakay! 💀😭🤣",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   MÉMOIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const spamMap       = new Map();
const warnMap       = new Map();
const groupSettings = new Map();
const viewOnceStore = new Map();
const coinsData     = new Map();
const xpData        = new Map();
const dailyCooldown = new Map();
const workCooldown  = new Map();
const groupMsgStats = new Map();
const quizSessions  = new Map();
const penduSessions = new Map();
const bannedUsers   = new Set();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   UTILITAIRES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const rl       = createInterface({ input: process.stdin, output: process.stdout });
const question = (t) => new Promise(r => rl.question(t, r));
const wait     = (ms) => new Promise(r => setTimeout(r, ms));
const rand     = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shortNum = (jid) => jid?.split("@")[0] || "";
const isGroup  = (jid) => jid?.endsWith("@g.us");
const isOwner  = (jid) => shortNum(jid) === CONFIG.ownerNumber;
const isSudo   = (jid) => CONFIG.sudoUsers?.includes(jid) || isOwner(jid);

const getCoins  = (j) => coinsData.get(j) || 0;
const addCoins  = (j, n) => coinsData.set(j, Math.max(0, getCoins(j) + n));
const getXP     = (j) => xpData.get(j) || 0;
const addXP     = (j, n) => xpData.set(j, getXP(j) + n);
const getLevel  = (j) => Math.floor(getXP(j) / 100) + 1;

const getGroupSetting = (gid, key) => groupSettings.get(gid)?.[key] ?? CONFIG[key];
const setGroupSetting = (gid, key, val) => {
    if (!groupSettings.has(gid)) groupSettings.set(gid, {});
    groupSettings.get(gid)[key] = val;
};

const containsLink    = (t) => /https?:\/\/|www\.|wa\.me|t\.me|bit\.ly/i.test(t);
const badWords        = ["mot1", "mot2"];
const containsBadWord = (t) => badWords.some(w => t.toLowerCase().includes(w));

const getBody = (msg) =>
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption || "";

const reply   = (sock, from, text, msg) => sock.sendMessage(from, { text }, { quoted: msg });
const sendImg = async (sock, from, imgPath, caption, msg) => {
    if (fs.existsSync(imgPath)) {
        await sock.sendMessage(from, { image: fs.readFileSync(imgPath), caption }, { quoted: msg });
    } else {
        await reply(sock, from, caption, msg);
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   DATA FUN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const blagues = [
    "Pourquoi les plongeurs plongent en arrière? Parce que sinon ils tomberaient dans le bateau!",
    "Qu'est-ce qu'un canif? Un petit fien!",
    "Pourquoi les fantômes ne mentent pas? Parce qu'on voit à travers eux!",
    "Kisa yo rele yon bèf ki fè matematik? Yon kalkila-towo!",
    "Poukisa poul la travèse wout la? Pou rive lòt bò a!",
    "Comment appelle-t-on un chat tombé dans un pot de peinture? Un chat-peint!",
];

const ball8 = [
    "✅ Oui, absolument!", "✅ C'est certain.", "✅ Sans aucun doute.",
    "🟡 Peut-être...", "🟡 Les signes sont flous.", "🟡 Demande plus tard.",
    "❌ Non, pas du tout.", "❌ Les signes disent non.", "❌ Très peu probable.",
];

const quotes = [
    "\"Rèv ou se GPS ou. Swiv li!\" — O-TECH 🚀",
    "\"Chak jou ou pa aprann se yon jou ou pèdi.\" — Proverbe haïtien",
    "\"Innovation se pa yon opsyon, se yon obligasyon.\" — O-TECH",
    "\"Le succès c'est tomber 7 fois et se relever 8.\" — Proverbe japonais",
    "\"La vie commence là où finit ta zone de confort.\"",
];

const quizDB = [
    { q: "Quelle est la capitale d'Haïti?", r: "port-au-prince", a: "Port-au-Prince" },
    { q: "En quelle année Haïti a eu son indépendance?", r: "1804", a: "1804" },
    { q: "Quelle est la monnaie d'Haïti?", r: "gourde", a: "La Gourde (HTG)" },
    { q: "Combien font 15 x 15?", r: "225", a: "225" },
    { q: "Quelle est la planète la plus proche du soleil?", r: "mercure", a: "Mercure" },
    { q: "Qui a inventé l'ampoule électrique?", r: "edison", a: "Thomas Edison" },
    { q: "Quelle est la langue officielle du Brésil?", r: "portugais", a: "Le Portugais" },
    { q: "Combien d'os a le corps humain adulte?", r: "206", a: "206 os" },
    { q: "Quel est le symbole chimique de l'or?", r: "au", a: "Au" },
    { q: "Combien de continents y a-t-il?", r: "7", a: "7 continents" },
];

const jobs = [
    { job: "développeur web", gain: 80 },
    { job: "graphiste O-TECH", gain: 60 },
    { job: "vendeur tech", gain: 70 },
    { job: "technicien réseau", gain: 90 },
    { job: "community manager", gain: 50 },
    { job: "photographe", gain: 65 },
    { job: "traducteur", gain: 55 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   INTERCEPTER VIEW ONCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function interceptViewOnce(msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const vo =
        msg.message?.viewOnceMessage?.message ||
        msg.message?.viewOnceMessageV2?.message ||
        msg.message?.viewOnceMessageV2Extension?.message;
    if (!vo) return;
    try {
        let mediaMsg = null, mediaType = null;
        if (vo.imageMessage)      { mediaMsg = vo.imageMessage; mediaType = "image"; }
        else if (vo.videoMessage) { mediaMsg = vo.videoMessage; mediaType = "video"; }
        if (!mediaMsg) return;
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        viewOnceStore.set(msg.key.id, { type: mediaType, buffer: Buffer.concat(chunks), sender });
        setTimeout(() => viewOnceStore.delete(msg.key.id), 600000);
        console.log(`[VV] ✅ ${mediaType} intercepté`);
    } catch (e) { console.warn("[VV]", e.message); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   COMMANDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = {

    // ── MENU ─────────────────────────────────────
    menu: async (sock, from, msg, args, sender) => {
        const p = CONFIG.prefix;
        const text =
            `╔═══════════════════════════╗\n` +
            `║       🤖 *O-TECH BOT*      ║\n` +
            `║  _Powered by Orlando Tech_ ║\n` +
            `╚═══════════════════════════╝\n\n` +
            `*📋 INFO*\n` +
            `▸ ${p}menu ▸ ${p}ping ▸ ${p}botinfo\n` +
            `▸ ${p}uptime ▸ ${p}owner\n\n` +
            `*🛠 MODÉRATION*\n` +
            `▸ ${p}kick ▸ ${p}add ▸ ${p}promote\n` +
            `▸ ${p}demote ▸ ${p}mute ▸ ${p}unmute\n` +
            `▸ ${p}warn ▸ ${p}resetwarn ▸ ${p}delete\n` +
            `▸ ${p}tag ▸ ${p}tagadmin ▸ ${p}admins\n` +
            `▸ ${p}groupinfo ▸ ${p}link ▸ ${p}revoke\n` +
            `▸ ${p}kickall ▸ ${p}kickall2 ▸ ${p}promoteall\n` +
            `▸ ${p}demoteall ▸ ${p}bye ▸ ${p}join\n\n` +
            `*🛡 SÉCURITÉ*\n` +
            `▸ ${p}antilink ▸ ${p}antispam ▸ ${p}antibadword\n` +
            `▸ ${p}block ▸ ${p}unblock ▸ ${p}ban ▸ ${p}unban\n\n` +
            `*💰 ÉCONOMIE*\n` +
            `▸ ${p}daily ▸ ${p}work ▸ ${p}solde\n` +
            `▸ ${p}pari ▸ ${p}rob ▸ ${p}transfert ▸ ${p}richesse\n\n` +
            `*🎮 JEUX*\n` +
            `▸ ${p}quiz ▸ ${p}pendu ▸ ${p}lettre\n` +
            `▸ ${p}devinette ▸ ${p}8ball ▸ ${p}rps\n` +
            `▸ ${p}pile ▸ ${p}dé ▸ ${p}compteur\n` +
            `▸ ${p}ship ▸ ${p}hug ▸ ${p}slap ▸ ${p}fight\n\n` +
            `*📊 STATS*\n` +
            `▸ ${p}top ▸ ${p}stats ▸ ${p}monscore\n\n` +
            `*📲 MÉDIAS*\n` +
            `▸ ${p}vv ▸ ${p}send ▸ ${p}pp ▸ ${p}meme\n` +
            `▸ ${p}sticker ▸ ${p}img ▸ ${p}tiktok ▸ ${p}url\n\n` +
            `*💬 FAKE CHAT*\n` +
            `▸ ${p}chat ▸ ${p}fchat ▸ ${p}typechat\n\n` +
            `*⚙️ UTILS*\n` +
            `▸ ${p}fancy ▸ ${p}tts ▸ ${p}calc\n` +
            `▸ ${p}blague ▸ ${p}quote ▸ ${p}conseil\n` +
            `▸ ${p}profil ▸ ${p}setpp ▸ ${p}setprefix\n` +
            `▸ ${p}public ▸ ${p}sudo ▸ ${p}addprem\n\n` +
            `*🐞 BUG*\n` +
            `▸ ${p}close ▸ ${p}kill ▸ ${p}fuck\n\n` +
            `_O-TECH © 2026 — Innovation constante_ 🚀`;
        await sendImg(sock, from, ANON_IMG, text, msg);
    },

    // ── INFO ─────────────────────────────────────
    ping: async (sock, from, msg) => {
        const t = Date.now();
        await reply(sock, from, `🏓 *Pong!* ⚡ ${Date.now() - t}ms`, msg);
    },

    botinfo: async (sock, from, msg) => {
        const u = process.uptime();
        const h = Math.floor(u/3600), m = Math.floor((u%3600)/60), s = Math.floor(u%60);
        const ram = (process.memoryUsage().heapUsed/1024/1024).toFixed(1);
        await sendImg(sock, from, ANON_IMG,
            `🤖 *O-TECH BOT v4.0*\n\n` +
            `▸ Nom: *${CONFIG.botName}*\n` +
            `▸ Créateur: *${CONFIG.owner}*\n` +
            `▸ Préfixe: *${CONFIG.prefix}*\n` +
            `▸ Uptime: *${h}h ${m}m ${s}s*\n` +
            `▸ RAM: *${ram} MB*\n` +
            `▸ Node.js: *${process.version}*\n` +
            `▸ Commandes: *${Object.keys(commands).length}*\n` +
            `▸ Mode: *${CONFIG.mode}*`, msg);
    },

    uptime: async (sock, from, msg) => {
        const u = process.uptime();
        await reply(sock, from, `⏱ *Uptime:* ${Math.floor(u/3600)}h ${Math.floor((u%3600)/60)}m ${Math.floor(u%60)}s`, msg);
    },

    owner: async (sock, from, msg) => {
        await reply(sock, from, `👑 *Owner O-TECH BOT*\n\n▸ ${CONFIG.owner}\n▸ wa.me/${CONFIG.ownerNumber}\n▸ otech.ht`, msg);
    },

    // ── MODÉRATION ───────────────────────────────
    kick: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .kick @user", msg);
        for (const jid of mentioned) {
            if (isOwner(jid)) { await reply(sock, from, "⛔ Impossible de kick l'owner!", msg); continue; }
            await sock.groupParticipantsUpdate(from, [jid], "remove");
        }
        await reply(sock, from, `✅ *${mentioned.length}* membre(s) expulsé(s)!`, msg);
    },

    add: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        if (!args[0]) return reply(sock, from, "❌ Usage: .add 509XXXXXXXX", msg);
        const num = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await sock.groupParticipantsUpdate(from, [num], "add");
        await reply(sock, from, "✅ Membre ajouté!", msg);
    },

    promote: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .promote @user", msg);
        await sock.groupParticipantsUpdate(from, mentioned, "promote");
        await reply(sock, from, "⬆️ Promu(s) admin! 👑", msg);
    },

    demote: async (sock, from, msg, args, sender) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .demote @user", msg);
        for (const jid of mentioned) {
            if (isOwner(jid)) { await reply(sock, from, "⛔ Impossible de demote l'owner!", msg); continue; }
        }
        await sock.groupParticipantsUpdate(from, mentioned, "demote");
        await reply(sock, from, "⬇️ Admin retiré!", msg);
    },

    mute: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupSettingUpdate(from, "announcement");
        await reply(sock, from, "🔇 Groupe fermé — admins only.", msg);
    },

    unmute: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupSettingUpdate(from, "not_announcement");
        await reply(sock, from, "🔊 Groupe ouvert!", msg);
    },

    warn: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .warn @user", msg);
        for (const jid of mentioned) {
            if (isOwner(jid)) { await reply(sock, from, "⛔ Impossible d'avertir l'owner!", msg); continue; }
            const current = (warnMap.get(jid) || 0) + 1;
            warnMap.set(jid, current);
            if (current >= 3) {
                await sock.groupParticipantsUpdate(from, [jid], "remove");
                warnMap.delete(jid);
                await reply(sock, from, `⛔ @${shortNum(jid)} expulsé après 3 avertissements!`, msg);
            } else {
                await reply(sock, from, `⚠️ @${shortNum(jid)} — Avertissement *${current}/3*`, msg);
            }
        }
    },

    resetwarn: async (sock, from, msg) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .resetwarn @user", msg);
        for (const jid of mentioned) warnMap.delete(jid);
        await reply(sock, from, "✅ Avertissements réinitialisés.", msg);
    },

    delete: async (sock, from, msg) => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctx?.stanzaId) return reply(sock, from, "❌ Réponds au message à supprimer.", msg);
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: ctx.stanzaId, participant: ctx.participant } });
    },

    tag: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const members = meta.participants.map(p => p.id);
        const customMsg = args.join(" ") || "📢 Attention tout le monde!";
        let text = `*${customMsg}*\n\n🏢 *${meta.subject}* — 👥 *${members.length} membres*\n\n`;
        for (const m of members) text += `@${shortNum(m)} `;
        await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
    },

    tagadmin: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin);
        const mentions = admins.map(a => a.id);
        const customMsg = args.join(" ") || "📢 Message pour les admins!";
        let text = `*${customMsg}*\n\n👮 *Admins (${admins.length}):*\n`;
        for (const a of admins) text += `@${shortNum(a.id)}\n`;
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    admins: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin);
        const mentions = admins.map(a => a.id);
        let text = `👮 *Admins (${admins.length}):*\n\n`;
        for (const a of admins) text += `${a.admin === "superadmin" ? "👑" : "⭐"} @${shortNum(a.id)}\n`;
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    groupinfo: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const adminsCount = meta.participants.filter(p => p.admin).length;
        const created = new Date(meta.creation * 1000).toLocaleDateString("fr-FR");
        const infoText =
            `📊 *Infos du Groupe*\n\n` +
            `👥 *Nom:* ${meta.subject}\n` +
            `📝 *Desc:* ${meta.desc || "Aucune"}\n` +
            `👤 *Membres:* ${meta.participants.length}\n` +
            `👮 *Admins:* ${adminsCount}\n` +
            `📅 *Créé le:* ${created}`;
        try {
            const ppUrl = await sock.profilePictureUrl(from, "image");
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: buf, caption: infoText }, { quoted: msg });
        } catch (_) { await reply(sock, from, infoText, msg); }
    },

    link: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        try {
            const code = await sock.groupInviteCode(from);
            await reply(sock, from, `🔗 https://chat.whatsapp.com/${code}`, msg);
        } catch (_) { await reply(sock, from, "❌ Le bot doit être admin.", msg); }
    },

    revoke: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupRevokeInvite(from);
        await reply(sock, from, "✅ Lien révoqué!", msg);
    },

    // ── KICKALL — Expulse TOUS les membres non-admin ──
    kickall: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const targets = meta.participants.filter(p => !p.admin && !isOwner(p.id));
        if (!targets.length) return reply(sock, from, "❌ Aucun membre à expulser.", msg);
        await reply(sock, from, `⏳ Expulsion de *${targets.length}* membres...`, msg);
        let count = 0;
        for (const m of targets) {
            try { await sock.groupParticipantsUpdate(from, [m.id], "remove"); count++; await wait(600); } catch (_) {}
        }
        await reply(sock, from, `✅ *${count}* membres expulsés!`, msg);
    },

    // ── KICKALL2 — Expulse ABSOLUMENT tout le monde ──
    kickall2: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const targets = meta.participants.filter(p => !isOwner(p.id));
        await reply(sock, from, `⏳ Expulsion totale de *${targets.length}* personnes...`, msg);
        let count = 0;
        for (const m of targets) {
            try { await sock.groupParticipantsUpdate(from, [m.id], "remove"); count++; await wait(400); } catch (_) {}
        }
        await reply(sock, from, `✅ Groupe vidé! *${count}* expulsé(s).`, msg);
    },

    promoteall: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const targets = meta.participants.filter(p => !p.admin);
        for (const m of targets) { try { await sock.groupParticipantsUpdate(from, [m.id], "promote"); await wait(400); } catch (_) {} }
        await reply(sock, from, `✅ *${targets.length}* membres promus admins!`, msg);
    },

    demoteall: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const targets = meta.participants.filter(p => p.admin && !isOwner(p.id));
        for (const a of targets) { try { await sock.groupParticipantsUpdate(from, [a.id], "demote"); await wait(400); } catch (_) {} }
        await reply(sock, from, `✅ *${targets.length}* admins rétrogradés!`, msg);
    },

    bye: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await reply(sock, from, "👋 *O-TECH BOT quitte le groupe. Au revoir!*", msg);
        await wait(1000);
        await sock.groupLeave(from);
    },

    join: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!args[0]) return reply(sock, from, "❌ Usage: .join https://chat.whatsapp.com/XXXXX", msg);
        const code = args[0].replace("https://chat.whatsapp.com/", "");
        try { await sock.groupAcceptInvite(code); await reply(sock, from, "✅ Groupe rejoint!", msg); }
        catch (e) { await reply(sock, from, `❌ Erreur: ${e.message}`, msg); }
    },

    // ── SÉCURITÉ ─────────────────────────────────
    antilink: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const val = args[0]?.toLowerCase();
        if (!["on","off"].includes(val)) return reply(sock, from, "❌ Usage: .antilink on/off", msg);
        setGroupSetting(from, "antiLink", val === "on");
        await reply(sock, from, `🔗 Anti-lien: *${val.toUpperCase()}*`, msg);
    },

    antispam: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const val = args[0]?.toLowerCase();
        if (!["on","off"].includes(val)) return reply(sock, from, "❌ Usage: .antispam on/off", msg);
        setGroupSetting(from, "antiSpam", val === "on");
        await reply(sock, from, `🛡 Anti-spam: *${val.toUpperCase()}*`, msg);
    },

    antibadword: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const val = args[0]?.toLowerCase();
        if (!["on","off"].includes(val)) return reply(sock, from, "❌ Usage: .antibadword on/off", msg);
        setGroupSetting(from, "antiBadWord", val === "on");
        await reply(sock, from, `🤬 Anti-bad-word: *${val.toUpperCase()}*`, msg);
    },

    block: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .block @user", msg);
        for (const jid of mentioned) { try { await sock.updateBlockStatus(jid, "block"); } catch (_) {} }
        await reply(sock, from, `🚫 *${mentioned.length}* user(s) bloqué(s)!`, msg);
    },

    unblock: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .unblock @user", msg);
        for (const jid of mentioned) { try { await sock.updateBlockStatus(jid, "unblock"); } catch (_) {} }
        await reply(sock, from, `✅ *${mentioned.length}* user(s) débloqué(s)!`, msg);
    },

    ban: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .ban @user", msg);
        for (const jid of mentioned) bannedUsers.add(jid);
        await reply(sock, from, `🚫 *${mentioned.length}* user(s) banni(s) du bot!`, msg);
    },

    unban: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .unban @user", msg);
        for (const jid of mentioned) bannedUsers.delete(jid);
        await reply(sock, from, `✅ *${mentioned.length}* user(s) débanni(s)!`, msg);
    },

    // ── ÉCONOMIE ─────────────────────────────────
    solde: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        await reply(sock, from, `💰 *Solde O-TECH*\n\n👤 @${shortNum(target)}\n💵 Coins: *${getCoins(target)}*\n⭐ Niveau: *${getLevel(target)}*\n📊 XP: *${getXP(target)}*`, msg);
    },

    daily: async (sock, from, msg, args, sender) => {
        const now = Date.now(), last = dailyCooldown.get(sender) || 0;
        const cd = 24 * 60 * 60 * 1000;
        if (now - last < cd) {
            const reste = Math.ceil((cd - (now - last)) / 3600000);
            return reply(sock, from, `⏳ Daily déjà réclamé! Reviens dans *${reste}h*`, msg);
        }
        const gain = Math.floor(Math.random() * 200) + 100;
        addCoins(sender, gain); dailyCooldown.set(sender, now);
        await reply(sock, from, `🎁 *Daily Reward!*\n\n💰 +*${gain} coins*!\n💵 Total: *${getCoins(sender)} coins*\n\n_Reviens demain!_`, msg);
    },

    work: async (sock, from, msg, args, sender) => {
        const now = Date.now(), last = workCooldown.get(sender) || 0;
        const cd = 60 * 60 * 1000;
        if (now - last < cd) {
            const reste = Math.ceil((cd - (now - last)) / 60000);
            return reply(sock, from, `⏳ Reviens dans *${reste} min*`, msg);
        }
        const job = rand(jobs);
        addCoins(sender, job.gain); workCooldown.set(sender, now);
        await reply(sock, from, `💼 *Work Done!*\n\nTu as travaillé comme *${job.job}*\n💰 +*${job.gain} coins*\n💵 Total: *${getCoins(sender)} coins*\n\n_Reviens dans 1h_`, msg);
    },

    pari: async (sock, from, msg, args, sender) => {
        const montant = parseInt(args[0]);
        if (isNaN(montant) || montant <= 0) return reply(sock, from, "❌ Usage: .pari 100", msg);
        if (getCoins(sender) < montant) return reply(sock, from, `❌ Pas assez! Tu as *${getCoins(sender)} coins*`, msg);
        const gagne = Math.random() > 0.5;
        addCoins(sender, gagne ? montant : -montant);
        await reply(sock, from, gagne
            ? `🎰 *GAGNÉ!* +${montant} coins!\n💵 Total: *${getCoins(sender)}*`
            : `🎰 *PERDU!* -${montant} coins!\n💵 Total: *${getCoins(sender)}*`, msg);
    },

    rob: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .rob @user", msg);
        const target = mentioned[0];
        if (isOwner(target)) return reply(sock, from, "❌ Tu peux pas voler l'owner!", msg);
        if (getCoins(target) < 50) return reply(sock, from, `❌ @${shortNum(target)} est trop pauvre!`, msg);
        const success = Math.random() > 0.45;
        if (success) {
            const vol = Math.floor(getCoins(target) * 0.2);
            addCoins(sender, vol); addCoins(target, -vol);
            await sock.sendMessage(from, { text: `🦹 *Vol réussi!*\n\nTu as volé *${vol} coins* à @${shortNum(target)}!\n💰 Total: *${getCoins(sender)}*`, mentions: [target] }, { quoted: msg });
        } else {
            addCoins(sender, -50);
            await sock.sendMessage(from, { text: `🚔 *Vol raté!* Amende: *50 coins*\n💰 Total: *${getCoins(sender)}*`, mentions: [target] }, { quoted: msg });
        }
    },

    transfert: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .transfert @user montant", msg);
        const montant = parseInt(args[args.length - 1]);
        if (isNaN(montant) || montant <= 0) return reply(sock, from, "❌ Montant invalide.", msg);
        if (getCoins(sender) < montant) return reply(sock, from, `❌ Pas assez! Tu as *${getCoins(sender)}*`, msg);
        addCoins(sender, -montant); addCoins(mentioned[0], montant);
        await sock.sendMessage(from, { text: `💸 *Transfert!*\nDe: @${shortNum(sender)} → @${shortNum(mentioned[0])}\n💰 *${montant} coins*`, mentions: [sender, mentioned[0]] }, { quoted: msg });
    },

    richesse: async (sock, from, msg) => {
        const sorted = [...coinsData.entries()].sort((a,b) => b[1]-a[1]).slice(0,10);
        if (!sorted.length) return reply(sock, from, "❌ Personne n'a de coins!", msg);
        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
        let text = `💰 *TOP 10 RICHESSES*\n\n`;
        const mentions = sorted.map(([j]) => j);
        for (let i = 0; i < sorted.length; i++) text += `${medals[i]} @${shortNum(sorted[i][0])} — *${sorted[i][1]} coins*\n`;
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    // ── STATS ────────────────────────────────────
    top: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const gs = groupMsgStats.get(from) || {};
        const sorted = Object.entries(gs).sort((a,b) => b[1]-a[1]).slice(0,10);
        if (!sorted.length) return reply(sock, from, "❌ Pas encore de stats.", msg);
        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
        let text = `🏆 *TOP 10 MEMBRES ACTIFS*\n\n`;
        const mentions = sorted.map(([j]) => j);
        for (let i = 0; i < sorted.length; i++) text += `${medals[i]} @${shortNum(sorted[i][0])} — *${sorted[i][1]} msgs*\n`;
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    },

    stats: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const meta = await sock.groupMetadata(from);
        const gs = groupMsgStats.get(from) || {};
        await reply(sock, from,
            `📊 *Stats Groupe*\n\n🏢 *${meta.subject}*\n👥 Membres: *${meta.participants.length}*\n👮 Admins: *${meta.participants.filter(p=>p.admin).length}*\n💬 Messages: *${Object.values(gs).reduce((a,b)=>a+b,0)}*\n🎯 Actifs: *${Object.keys(gs).length}*`, msg);
    },

    monscore: async (sock, from, msg, args, sender) => {
        const gs = groupMsgStats.get(from) || {};
        await reply(sock, from,
            `📈 *Ton Score*\n\n👤 @${shortNum(sender)}\n💬 Messages: *${gs[sender]||0}*\n⭐ Niveau: *${getLevel(sender)}*\n📊 XP: *${getXP(sender)}*\n💰 Coins: *${getCoins(sender)}*`, msg);
    },

    // ── JEUX ─────────────────────────────────────
    quiz: async (sock, from, msg, args, sender) => {
        const q = rand(quizDB);
        const key = `quiz_${from}_${sender}`;
        quizSessions.set(key, { answer: q.r, correct: q.a });
        setTimeout(() => quizSessions.delete(key), 30000);
        await reply(sock, from, `🎯 *QUIZ O-TECH*\n\n❓ ${q.q}\n\n_30 secondes! Réponds directement._`, msg);
    },

    pendu: async (sock, from, msg) => {
        const mots = ["HAITI","TECHNOLOGIE","INNOVATION","WHATSAPP","ORDINATEUR","INTERNET","OTECH","JAVASCRIPT","ANDROID","TERMUX"];
        const mot = rand(mots);
        penduSessions.set(`pendu_${from}`, { mot, trouve: Array(mot.length).fill("_"), lettres: [], erreurs: 0, max: 6 });
        const s = penduSessions.get(`pendu_${from}`);
        await reply(sock, from, `🎮 *JEU DU PENDU*\n\nMot: *${s.trouve.join(" ")}*\nLettres: ${mot.length}\nErreurs: 0/${s.max}\n\n_Tape .lettre X_`, msg);
    },

    lettre: async (sock, from, msg, args) => {
        const key = `pendu_${from}`;
        const s = penduSessions.get(key);
        if (!s) return reply(sock, from, "❌ Pas de partie. Tape .pendu", msg);
        const lettre = args[0]?.toUpperCase();
        if (!lettre || lettre.length !== 1) return reply(sock, from, "❌ Usage: .lettre A", msg);
        if (s.lettres.includes(lettre)) return reply(sock, from, `⚠️ Lettre *${lettre}* déjà essayée!`, msg);
        s.lettres.push(lettre);
        if (s.mot.includes(lettre)) {
            for (let i = 0; i < s.mot.length; i++) if (s.mot[i] === lettre) s.trouve[i] = lettre;
        } else { s.erreurs++; }
        const art = ["😊","😐","😟","😨","😰","😱","💀"];
        if (!s.trouve.includes("_")) {
            penduSessions.delete(key);
            addCoins(msg.key.participant || from, s.mot.length * 10);
            return reply(sock, from, `🎉 *GAGNÉ!* Mot: *${s.mot}*\n💰 +${s.mot.length*10} coins!`, msg);
        }
        if (s.erreurs >= s.max) {
            penduSessions.delete(key);
            return reply(sock, from, `💀 *PERDU!* Le mot était: *${s.mot}*`, msg);
        }
        await reply(sock, from, `${art[s.erreurs]} *PENDU*\n\nMot: *${s.trouve.join(" ")}*\nEssayées: ${s.lettres.join(", ")}\nErreurs: ${s.erreurs}/${s.max}`, msg);
    },

    devinette: async (sock, from, msg, args, sender) => {
        const devs = [
            { q: "Je parle sans bouche, j'entends sans oreilles. Qu'est-ce?", r: "echo", a: "L'écho" },
            { q: "Plus je sèche, plus je suis mouillée. Qu'est-ce?", r: "serviette", a: "Une serviette" },
            { q: "J'ai des dents mais je ne mords pas. Qu'est-ce?", r: "peigne", a: "Un peigne" },
            { q: "Plus on m'enlève, plus je grandis. Qu'est-ce?", r: "trou", a: "Un trou" },
            { q: "Tout le monde me passe dessus mais personne ne m'écrase. Qu'est-ce?", r: "route", a: "La route" },
        ];
        const d = rand(devs);
        quizSessions.set(`dev_${from}_${sender}`, { answer: d.r, correct: d.a });
        setTimeout(() => quizSessions.delete(`dev_${from}_${sender}`), 45000);
        await reply(sock, from, `🧩 *DEVINETTE O-TECH*\n\n${d.q}\n\n_45 secondes!_`, msg);
    },

    "8ball": async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Pose une question! Ex: .8ball Vais-je réussir?", msg);
        await reply(sock, from, `🎱 *Magic 8-Ball*\n\n❓ _${args.join(" ")}_\n\n${rand(ball8)}`, msg);
    },

    rps: async (sock, from, msg, args) => {
        const choices = ["pierre","feuille","ciseaux"];
        const emojis = { pierre:"🪨", feuille:"📄", ciseaux:"✂️" };
        const player = args[0]?.toLowerCase();
        if (!choices.includes(player)) return reply(sock, from, "❌ Choisis: pierre, feuille ou ciseaux", msg);
        const bot = rand(choices);
        let result;
        if (player === bot) result = "🟡 *Égalité!*";
        else if ((player==="pierre"&&bot==="ciseaux")||(player==="feuille"&&bot==="pierre")||(player==="ciseaux"&&bot==="feuille")) result = "✅ *Tu gagnes!*";
        else result = "❌ *Tu perds!*";
        await reply(sock, from, `🎮 *RPS*\n\nToi: ${emojis[player]} vs Bot: ${emojis[bot]}\n\n${result}`, msg);
    },

    pile: async (sock, from, msg) => {
        await reply(sock, from, `🪙 Résultat: *${Math.random()<0.5?"PILE":"FACE"}*`, msg);
    },

    "dé": async (sock, from, msg, args) => {
        const f = parseInt(args[0]) || 6;
        await reply(sock, from, `🎲 Dé ${f} faces → *${Math.floor(Math.random()*f)+1}*`, msg);
    },

    compteur: async (sock, from, msg, args) => {
        const n = parseInt(args[0]);
        if (isNaN(n)||n<1||n>10) return reply(sock, from, "❌ Usage: .compteur 5 (1-10)", msg);
        for (let i = n; i >= 1; i--) { await sock.sendMessage(from, { text: `⏳ *${i}...*` }); await wait(1000); }
        await sock.sendMessage(from, { text: "🎉 *BOOM!*" });
    },

    ship: async (sock, from, msg, args) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length < 2) return reply(sock, from, "❌ Usage: .ship @user1 @user2", msg);
        const pct = Math.floor(Math.random()*101);
        const emoji = pct>=80?"💕":pct>=50?"💛":pct>=30?"😐":"💔";
        const bar = "█".repeat(Math.floor(pct/10))+"░".repeat(10-Math.floor(pct/10));
        await sock.sendMessage(from, {
            text: `💘 *SHIP METER*\n\n@${shortNum(mentioned[0])} ❤️ @${shortNum(mentioned[1])}\n\n[${bar}] *${pct}%* ${emoji}`,
            mentions: mentioned
        }, { quoted: msg });
    },

    hug: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .hug @user", msg);
        await sock.sendMessage(from, { text: `🤗 @${shortNum(sender)} fait un câlin à @${shortNum(mentioned[0])}!\n_(っ◕‿◕)っ_`, mentions: [sender,...mentioned] }, { quoted: msg });
    },

    slap: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .slap @user", msg);
        if (isOwner(mentioned[0])) return reply(sock, from, "❌ Tu peux pas gifler l'owner!", msg);
        await sock.sendMessage(from, { text: `👋 @${shortNum(sender)} gifle @${shortNum(mentioned[0])}! *BAM!* 💥`, mentions: [sender,...mentioned] }, { quoted: msg });
    },

    fight: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .fight @user", msg);
        const moves = ["uppercut 💥","coup de pied volant 🦵","combo 3 coups 👊","esquive + contre ⚡","KO final 💀"];
        const winner = Math.random()>0.5 ? sender : mentioned[0];
        const loser  = winner===sender ? mentioned[0] : sender;
        await sock.sendMessage(from, {
            text: `⚔️ *FIGHT!*\n\n@${shortNum(sender)} VS @${shortNum(mentioned[0])}\n\n💥 ${rand(moves)}\n💥 ${rand(moves)}\n💥 ${rand(moves)}\n\n🏆 *@${shortNum(winner)} GAGNE!*\n😵 @${shortNum(loser)} est KO!`,
            mentions: [sender,...mentioned]
        }, { quoted: msg });
    },

    // ── MÉDIAS ───────────────────────────────────
    vv: async (sock, from, msg, args, sender) => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const stanzaId = ctx?.stanzaId;
        let stored = stanzaId ? viewOnceStore.get(stanzaId) : null;

        // Essai direct si pas dans le store
        if (!stored && ctx?.quotedMessage) {
            const qm = ctx.quotedMessage;
            const vo = qm?.viewOnceMessage?.message || qm?.viewOnceMessageV2?.message || qm?.viewOnceMessageV2Extension?.message;
            if (vo) {
                try {
                    const mediaMsg = vo.imageMessage || vo.videoMessage;
                    const mediaType = vo.imageMessage ? "image" : "video";
                    if (mediaMsg) {
                        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        stored = { type: mediaType, buffer: Buffer.concat(chunks), sender: ctx?.participant || from };
                    }
                } catch (_) {}
            }
        }

        if (!stored) return reply(sock, from, "❌ View once introuvable. Doit être récent et reçu après connexion du bot.", msg);
        const caption = `👁️ *View Once — O-TECH BOT*\n_De:_ @${shortNum(stored.sender)}`;
        await sock.sendMessage(from, stored.type === "image"
            ? { image: stored.buffer, caption, mentions: [stored.sender] }
            : { video: stored.buffer, caption, mentions: [stored.sender] }, { quoted: msg });
    },

    send: async (sock, from, msg, args, sender) => {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctx?.quotedMessage) return reply(sock, from, "❌ Réponds à un message/statut avec .send", msg);
        const qm = ctx.quotedMessage;
        const type = Object.keys(qm)[0];
        try {
            if (type === "imageMessage") {
                const buf = await downloadContentFromMessage(qm.imageMessage, "image").then(s => { const c=[]; return new Promise(async r => { for await(const ch of s) c.push(ch); r(Buffer.concat(c)); }); });
                await sock.sendMessage(from, { image: buf, caption: qm.imageMessage.caption || "📸 _Via O-TECH BOT_" }, { quoted: msg });
            } else if (type === "videoMessage") {
                const buf = await downloadContentFromMessage(qm.videoMessage, "video").then(s => { const c=[]; return new Promise(async r => { for await(const ch of s) c.push(ch); r(Buffer.concat(c)); }); });
                await sock.sendMessage(from, { video: buf, caption: qm.videoMessage.caption || "🎥 _Via O-TECH BOT_" }, { quoted: msg });
            } else if (type === "audioMessage") {
                const buf = await downloadContentFromMessage(qm.audioMessage, "audio").then(s => { const c=[]; return new Promise(async r => { for await(const ch of s) c.push(ch); r(Buffer.concat(c)); }); });
                await sock.sendMessage(from, { audio: buf, mimetype: "audio/mp4", ptt: false }, { quoted: msg });
            } else {
                const text = qm.conversation || qm.extendedTextMessage?.text || "";
                await reply(sock, from, `📝 *Statut:*\n\n${text}`, msg);
            }
        } catch (e) { await reply(sock, from, `❌ Erreur: ${e.message}`, msg); }
    },

    pp: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        try {
            const ppUrl = await sock.profilePictureUrl(target, "image");
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: buf, caption: `🖼️ *PP de* @${shortNum(target)}`, mentions: [target] }, { quoted: msg });
        } catch (_) { await reply(sock, from, `❌ @${shortNum(target)} n'a pas de photo de profil.`, msg); }
    },

    profil: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        try {
            const ppUrl = await sock.profilePictureUrl(target, "image");
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, {
                image: buf,
                caption: `👤 *Profil*\n@${shortNum(target)}\n📱 +${shortNum(target)}\n💰 Coins: *${getCoins(target)}*\n⭐ Niveau: *${getLevel(target)}*`,
                mentions: [target]
            }, { quoted: msg });
        } catch (_) { await reply(sock, from, `👤 @${shortNum(target)}\n💰 Coins: *${getCoins(target)}*\n⭐ Niveau: *${getLevel(target)}*`, msg); }
    },

    meme: async (sock, from, msg) => {
        const memes = ["https://i.imgur.com/RPyxZSU.jpg","https://i.imgur.com/1uOWpvB.jpg","https://i.imgur.com/HiHJSCH.jpg"];
        try {
            const res = await fetch(rand(memes));
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: buf, caption: "😂 *Meme du jour!*" }, { quoted: msg });
        } catch (_) { await reply(sock, from, "❌ Impossible de charger le meme.", msg); }
    },

    img: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .img mot", msg);
        try {
            const res = await fetch(`https://source.unsplash.com/800x600/?${encodeURIComponent(args.join(" "))}`);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(from, { image: buf, caption: `🖼️ *${args.join(" ")}*` }, { quoted: msg });
        } catch (_) { await reply(sock, from, "❌ Image introuvable.", msg); }
    },

    tiktok: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .tiktok [lien]", msg);
        await reply(sock, from, `🎵 *TikTok DL*\n\nUtilise snaptik.app pour télécharger:\n${args[0]}`, msg);
    },

    url: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .url https://...", msg);
        await sock.sendMessage(from, { text: args[0] }, { quoted: msg });
    },

    sticker: async (sock, from, msg) => {
        await reply(sock, from, "🎨 Sticker — installe *sharp* pour activer.", msg);
    },

    // ── FAKE CHAT ────────────────────────────────
    chat: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length || args.length < 2) return reply(sock, from, "❌ Usage: .chat @user message", msg);
        const target = mentioned[0];
        const texte = args.filter(a => !a.startsWith("@") && !/^\d+$/.test(a)).join(" ");
        if (!texte.trim()) return reply(sock, from, "❌ Écris un message.", msg);
        try {
            await sock.sendMessage(from, { text: texte, mentions: [target] }, {
                quoted: { key: { remoteJid: from, fromMe: false, id: msg.key.id, participant: target }, message: { extendedTextMessage: { text: texte } } }
            });
            try { await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } }); } catch (_) {}
        } catch (e) { await reply(sock, from, `❌ ${e.message}`, msg); }
    },

    fchat: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length || args.length < 2) return reply(sock, from, "❌ Usage: .fchat @user message", msg);
        const target = mentioned[0];
        const texte = args.filter(a => !a.startsWith("@") && !/^\d+$/.test(a)).join(" ");
        if (!texte.trim()) return reply(sock, from, "❌ Écris un message.", msg);
        await sock.sendMessage(from, { text: `_Transféré de @${shortNum(target)}_\n\n${texte}`, mentions: [target] });
        try { await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } }); } catch (_) {}
    },

    typechat: async (sock, from, msg, args, sender) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length || args.length < 2) return reply(sock, from, "❌ Usage: .typechat @user message", msg);
        const target = mentioned[0];
        const texte = args.filter(a => !a.startsWith("@") && !/^\d+$/.test(a)).join(" ");
        if (!texte.trim()) return reply(sock, from, "❌ Écris un message.", msg);
        await sock.sendPresenceUpdate("composing", from);
        await wait(2000);
        await sock.sendPresenceUpdate("paused", from);
        await sock.sendMessage(from, { text: texte, mentions: [target] }, {
            quoted: { key: { remoteJid: from, fromMe: false, id: "0", participant: target }, message: { conversation: texte } }
        });
        try { await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } }); } catch (_) {}
    },

    // ── UTILS ────────────────────────────────────
    fancy: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .fancy texte", msg);
        const norm  = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        const fancy = "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇";
        let result = "";
        for (const c of args.join(" ")) { const i = norm.indexOf(c); result += i !== -1 ? [...fancy][i] : c; }
        await reply(sock, from, result, msg);
    },

    tts: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .tts texte", msg);
        await reply(sock, from, `*${args.join(" ").toUpperCase()}*`, msg);
    },

    calc: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage: .calc 2+2", msg);
        try {
            const expr = args.join("").replace(/[^0-9+\-*/.()%]/g, "");
            const result = Function(`"use strict"; return (${expr})`)();
            await reply(sock, from, `🧮 *${expr} = ${result}*`, msg);
        } catch { await reply(sock, from, "❌ Expression invalide.", msg); }
    },

    blague: async (sock, from, msg) => { await reply(sock, from, `😂 *Blague:*\n\n${rand(blagues)}`, msg); },
    quote:  async (sock, from, msg) => { await reply(sock, from, `💬 ${rand(quotes)}`, msg); },
    conseil: async (sock, from, msg) => {
        const conseils = ["💡 Travay di se kle siksè!","💡 Pa janm abandone rèv ou!","💡 Aprann yon bagay nouvo chak jou!","💡 O-TECH la pou ou — Innovation constante!"];
        await reply(sock, from, rand(conseils), msg);
    },

    setpp: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage) return reply(sock, from, "❌ Réponds à une image avec .setpp", msg);
        try {
            const stream = await downloadContentFromMessage(quoted.imageMessage, "image");
            const chunks = []; for await (const ch of stream) chunks.push(ch);
            await sock.updateProfilePicture(isGroup(from) ? from : sock.user.id, { img: Buffer.concat(chunks) });
            await reply(sock, from, "✅ Photo de profil mise à jour!", msg);
        } catch (e) { await reply(sock, from, `❌ Erreur: ${e.message}`, msg); }
    },

    setprefix: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        if (!args[0]) return reply(sock, from, "❌ Usage: .setprefix !", msg);
        CONFIG.prefix = args[0];
        await reply(sock, from, `✅ Préfixe changé: *${CONFIG.prefix}*`, msg);
    },

    public: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        CONFIG.mode = CONFIG.mode === "both" ? "private" : "both";
        await reply(sock, from, `🌐 Mode: *${CONFIG.mode === "both" ? "PUBLIC" : "PRIVÉ"}*`, msg);
    },

    sudo: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .sudo @user", msg);
        if (!CONFIG.sudoUsers) CONFIG.sudoUsers = [];
        for (const jid of mentioned) if (!CONFIG.sudoUsers.includes(jid)) CONFIG.sudoUsers.push(jid);
        await sock.sendMessage(from, { text: `✅ Sudo ajouté!\n@${shortNum(mentioned[0])} peut utiliser les commandes admin.`, mentions: mentioned }, { quoted: msg });
    },

    addprem: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Usage: .addprem @user", msg);
        if (!CONFIG.premiumUsers) CONFIG.premiumUsers = [];
        for (const jid of mentioned) if (!CONFIG.premiumUsers.includes(jid)) CONFIG.premiumUsers.push(jid);
        await sock.sendMessage(from, { text: `💎 @${shortNum(mentioned[0])} est maintenant *Premium* 🌟`, mentions: mentioned }, { quoted: msg });
    },

    // ── BUG ──────────────────────────────────────
    close: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || from;
        const bug = "‎".repeat(1000) + "​".repeat(1000);
        for (let i = 0; i < 3; i++) { await sock.sendMessage(target, { text: bug }); await wait(300); }
    },

    kill: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || from;
        const invisible = "​".repeat(5000);
        for (let i = 0; i < 5; i++) { await sock.sendMessage(target, { text: invisible }); await wait(200); }
    },

    fuck: async (sock, from, msg, args, sender) => {
        if (!isOwner(sender)) return reply(sock, from, "❌ Owner seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || from;
        const chars = ["꧁","꧂","⚠","🔴","💢","⛔","🚨"];
        for (let i = 0; i < 10; i++) { await sock.sendMessage(target, { text: chars[i%chars.length].repeat(300) }); await wait(150); }
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SÉCURITÉ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function runSecurityChecks(sock, from, msg, sender, body) {
    if (!isGroup(from)) return false;
    if (isOwner(sender)) return false;
    const antiLink    = getGroupSetting(from, "antiLink");
    const antiSpam    = getGroupSetting(from, "antiSpam");
    const antiBadWord = getGroupSetting(from, "antiBadWord");

    if (antiLink && containsLink(body)) {
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } });
        await sock.sendMessage(from, { text: `🔗 @${shortNum(sender)} Les liens sont interdits!`, mentions: [sender] });
        return true;
    }
    if (antiBadWord && containsBadWord(body)) {
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } });
        await sock.sendMessage(from, { text: `⚠️ @${shortNum(sender)} Langage inapproprié!`, mentions: [sender] });
        return true;
    }
    if (antiSpam) {
        if (!spamMap.has(sender)) spamMap.set(sender, { count: 0, timer: null });
        const data = spamMap.get(sender);
        data.count++;
        clearTimeout(data.timer);
        data.timer = setTimeout(() => spamMap.delete(sender), CONFIG.spamWindow);
        if (data.count >= CONFIG.spamLimit) {
            await sock.groupParticipantsUpdate(from, [sender], "remove");
            spamMap.delete(sender);
            await sock.sendMessage(from, { text: `🚫 @${shortNum(sender)} expulsé pour spam.`, mentions: [sender] });
            return true;
        }
    }
    return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   GESTIONNAIRE DE MESSAGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMessage(sock, m) {
    const msg = m.messages[0];
    if (!msg?.message) return;

    const from   = msg.key.remoteJid;
    const sender = msg.key.fromMe
        ? CONFIG.ownerNumber + "@s.whatsapp.net"
        : (msg.key.participant || from);
    const body   = getBody(msg).trim();
    const inGroup = isGroup(from);

    // Intercepter view once
    await interceptViewOnce(msg);

    // Ignorer messages du bot (sauf owner)
    if (msg.key.fromMe && !isOwner(sender)) return;

    // Mode
    if (CONFIG.mode === "group" && !inGroup) return;
    if (CONFIG.mode === "private" && inGroup) return;

    // Banni
    if (bannedUsers.has(sender) && !isOwner(sender)) return;

    // Sécurité
    const blocked = await runSecurityChecks(sock, from, msg, sender, body);
    if (blocked) return;

    // Stats + XP
    if (inGroup) {
        if (!groupMsgStats.has(from)) groupMsgStats.set(from, {});
        const gs = groupMsgStats.get(from);
        gs[sender] = (gs[sender] || 0) + 1;
        addXP(sender, 2);
    }

    // Quiz check
    if (!body.startsWith(CONFIG.prefix)) {
        for (const [key, session] of quizSessions) {
            if (key.includes(from) && key.includes(shortNum(sender))) {
                if (body.toLowerCase().includes(session.answer.toLowerCase())) {
                    quizSessions.delete(key);
                    addCoins(sender, 50); addXP(sender, 20);
                    await reply(sock, from, `✅ *BONNE RÉPONSE!*\n\nRéponse: *${session.correct}*\n💰 +50 coins! ⭐ +20 XP!`, msg);
                }
            }
        }
        return;
    }

    const args = body.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();
    const handler = commands[cmd];

    if (handler) {
        try {
            const reactEmojis = ["⚡","🤖","🔥","✅","💫","🚀","⚙️","💥"];
            try { await sock.sendMessage(from, { react: { text: rand(reactEmojis), key: msg.key } }); } catch (_) {}
            await handler(sock, from, msg, args, sender);
        } catch (err) {
            console.error(`[ERR] .${cmd}:`, err.message);
            try { await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }); } catch (_) {}
            await reply(sock, from, `❌ Erreur: *.${cmd}*`, msg);
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONNEXION PRINCIPALE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function startOTechBot() {
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionName);
    const { version } = await fetchLatestBaileysVersion();

    // Demander numéro AVANT le socket
    let phoneNumber = null;
    if (!state.creds.registered) {
        phoneNumber = await question("📱 Ton numéro (ex: 50935443504): ");
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
        console.log("⏳ Création du socket...");
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["O-TECH BOT", "Chrome", "4.0.0"],
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        getMessage: async () => undefined,
    });

    // Pairing code — attendre que socket soit stable
    if (phoneNumber && !state.creds.registered) {
        await wait(3000);
        let tries = 3;
        while (tries > 0) {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                const fmt  = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n╔══════════════════════════════════╗");
                console.log("║   🚀 O-TECH BOT — CODE JUMELAGE  ║");
                console.log(`║          >>>  ${fmt}  <<<          ║`);
                console.log("╚══════════════════════════════════╝");
                console.log("\n👉 WhatsApp → ⋮ → Appareils connectés");
                console.log("👉 Connecter avec un numéro de téléphone");
                console.log(`👉 Entre le code: ${fmt}\n`);
                break;
            } catch (e) {
                tries--;
                console.log(`⚠️ Tentative échouée: ${e.message}`);
                if (tries === 0) { console.log("❌ Impossible. Supprime session_otech/ et relance."); process.exit(1); }
                await wait(3000);
            }
        }
    }

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "connecting") console.log("🔄 Connexion...");
        if (connection === "open") {
            console.log(`\n✅ ${CONFIG.botName} EST EN LIGNE!`);
            console.log(`▸ Préfixe: ${CONFIG.prefix} | Mode: ${CONFIG.mode} | Cmds: ${Object.keys(commands).length}\n`);
            try {
                if (fs.existsSync(ANON_IMG)) {
                    await sock.updateProfilePicture(sock.user.id, { img: fs.readFileSync(ANON_IMG) });
                    console.log("🖼 Photo anonymous appliquée.");
                }
            } catch (_) {}
        }
        if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut && code !== 401;
            if (shouldReconnect) { console.log(`🔄 Reconnexion (${code})...`); await wait(5000); startOTechBot(); }
            else { console.log("🔴 Session expirée. Supprime session_otech/ et relance."); process.exit(0); }
        }
    });

    sock.ev.on("messages.upsert", (m) => {
        if (m.type === "notify") handleMessage(sock, m).catch(console.error);
    });

    // ── WELCOME / BYE / ANTI-QUICK ───────────────
    sock.ev.on("group-participants.update", async (anu) => {
        try {
            const meta = await sock.groupMetadata(anu.id);
            for (const num of anu.participants) {
                const ns = shortNum(num);

                // Anti-Quick
                if (QUICK_NUMBERS.includes(ns) && anu.action === "add") {
                    await sock.sendMessage(anu.id, { text: rand(ANTI_QUICK_MSGS), mentions: [num] });
                    try { await sock.groupParticipantsUpdate(anu.id, [num], "remove"); } catch (_) {}
                    continue;
                }

                let name = ns;
                try { const info = await sock.onWhatsApp(num); if (info?.[0]?.notify) name = info[0].notify; } catch (_) {}

                let ppBuf = null;
                try {
                    const ppUrl = await sock.profilePictureUrl(num, "image");
                    const res = await fetch(ppUrl);
                    ppBuf = Buffer.from(await res.arrayBuffer());
                } catch (_) {}

                if (anu.action === "add") {
                    const welcomeText =
                        `╔══════════════════════════╗\n` +
                        `║  🌐 *BIENVENUE CHEZ O-TECH* ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `👋 Salut @${ns}!\n\n` +
                        `👤 *Nom:* ${name}\n` +
                        `📱 *Numéro:* +${ns}\n` +
                        `🏢 *Groupe:* ${meta.subject}\n` +
                        `👥 *Membres:* ${meta.participants.length}\n\n` +
                        `📜 Respecte les règles du groupe.\n` +
                        `_Innovation constante — O-TECH BOT_ 🚀`;
                    if (ppBuf) {
                        await sock.sendMessage(anu.id, { image: ppBuf, caption: welcomeText, mentions: [num] });
                    } else {
                        await sock.sendMessage(anu.id, { text: welcomeText, mentions: [num] });
                    }
                } else if (anu.action === "remove") {
                    const byeText =
                        `👋 *${name}* (+${ns})\n` +
                        `vient de quitter *${meta.subject}*.\n` +
                        `👥 *Membres restants:* ${meta.participants.length}\n\n` +
                        `_On espère te revoir — O-TECH BOT_ 🚀`;
                    if (ppBuf) {
                        await sock.sendMessage(anu.id, { image: ppBuf, caption: byeText, mentions: [num] });
                    } else {
                        await sock.sendMessage(anu.id, { text: byeText, mentions: [num] });
                    }
                }
            }
        } catch (e) { console.error("[GROUP]", e.message); }
    });

    sock.ev.on("creds.update", saveCreds);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   START
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n╔═══════════════════════════╗");
console.log("║    🤖  O-TECH BOT v4.0    ║");
console.log("║   Powered by O-TECH.ht    ║");
console.log("╚═══════════════════════════╝\n");

startOTechBot();
