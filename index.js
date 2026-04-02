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
    "😂 Eyyy Quick! Ou vini kòm bro? Ale Quick papa ou, mwen pa papa ou! Bot O-TECH pa fè jwèt ak moun kòm ou, soti nan group la nèt epi ale fè lavi ou lwen! 💀🤣 Sa ou t ap fè isit? Retounen kote ou soti a, group sa se pa pou ou menm!",
    "🤣 QUICK?! Aaah non non non frè... ou panse ou ka rantre konsa san pèmisyon?! Mwen te konnen ou ta vini kanmenm! Ale Quick, group sa pa pou moun kòm ou ditou, soti la epi pa janm tounen! Ou fè wont! 😭🚫",
    "💀 Eyyy sa Quick sa! Ou pa wè se O-TECH BOT isit? Yon bot serye pou moun serye! Ou Quick, ou pa gen kote isit menm, ale fè wout ou epi di papa ou bonswa pou mwen! Ou kont regleman group la! 😂🤡",
    "🚫 QUICK DETECTED nan radar O-TECH! Frè mwen konnen trukaj ou yo depi lontan, group sa se pa pou ou menm ditou. Ale Quick retire kò ou, papa ou ak manman ou rele ou lakay depi lontan! 💀😭🤣 Sa w ap fè isit toujou?",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   STOCKAGE EN MÉMOIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const spamMap = new Map();
const warnMap = new Map();
const groupSettings = new Map();
const viewOnceStore = new Map(); // stocker les view once reçus

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
const isOwner = (jid) => jid?.replace(/:[0-9]+@/, "@").replace("@s.whatsapp.net", "") === CONFIG.ownerNumber;
const shortNum = (jid) => jid?.split("@")[0] || jid;

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
        const menuText =
            `╔═══════════════════════════╗\n` +
            `║       🤖 *O-TECH BOT*       ║\n` +
            `║  _Powered by Orlando Tech_  ║\n` +
            `╚═══════════════════════════╝\n\n` +
            `*📋 INFO*\n` +
            `▸ ${p}menu — Ce menu\n` +
            `▸ ${p}ping — Test connexion\n` +
            `▸ ${p}botinfo — Infos du bot\n` +
            `▸ ${p}uptime — Temps en ligne\n` +
            `▸ ${p}owner — Contact owner\n\n` +
            `*🛠 MODÉRATION* _(groupe)_\n` +
            `▸ ${p}kick @user — Expulser\n` +
            `▸ ${p}add numéro — Ajouter\n` +
            `▸ ${p}promote @user — Rendre admin\n` +
            `▸ ${p}demote @user — Retirer admin\n` +
            `▸ ${p}mute — Fermer le groupe\n` +
            `▸ ${p}unmute — Ouvrir le groupe\n` +
            `▸ ${p}warn @user — Avertir (3=kick)\n` +
            `▸ ${p}resetwarn @user — Reset warn\n` +
            `▸ ${p}tag [msg] — Mentionner tout le monde\n` +
            `▸ ${p}tagadmin [msg] — Mentionner admins\n` +
            `▸ ${p}admins — Liste des admins\n` +
            `▸ ${p}groupinfo — Infos + photo groupe\n` +
            `▸ ${p}link — Lien d'invitation\n` +
            `▸ ${p}revoke — Révoquer le lien\n` +
            `▸ ${p}delete — Supprimer un message\n\n` +
            `*🛡 SÉCURITÉ*\n` +
            `▸ ${p}antilink on/off\n` +
            `▸ ${p}antispam on/off\n` +
            `▸ ${p}antibadword on/off\n\n` +
            `*🎮 FUN & JEUX*\n` +
            `▸ ${p}blague — Blague aléatoire\n` +
            `▸ ${p}8ball question — Boule magique\n` +
            `▸ ${p}pile — Pile ou Face\n` +
            `▸ ${p}dé [faces] — Lancer un dé\n` +
            `▸ ${p}rps pierre/feuille/ciseaux\n` +
            `▸ ${p}compteur 5 — Compte à rebours\n` +
            `▸ ${p}conseil — Conseil du jour\n` +
            `▸ ${p}quote — Citation inspirante\n\n` +
            `*📲 MÉDIAS & UTILITAIRES*\n` +
            `▸ ${p}vv — Voir un message view once\n` +
            `▸ ${p}send — Enregistrer statut (en réponse)\n` +
            `▸ ${p}sticker — Image → Sticker\n` +
            `▸ ${p}tts texte — Texte stylé\n` +
            `▸ ${p}calc expression — Calculatrice\n` +
            `▸ ${p}météo ville — Météo (beta)\n` +
            `▸ ${p}profil @user — Voir profil\n\n` +
            `_O-TECH © 2025 — Innovation constante_ 🚀`;

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

    // ── KICK ─────────────────────────────────────
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
            if (isOwner(jid)) { await reply(sock, from, "⛔ Impossible d'expulser le propriétaire!", msg); continue; }
            await sock.groupParticipantsUpdate(from, [jid], "remove");
        }
        await reply(sock, from, `✅ *${mentioned.length}* membre(s) expulsé(s).`, msg);
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
        let text = `*${customMsg}*\n\n`;
        for (const m of members) text += `@${shortNum(m)} `;
        await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
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
        if (!ctx?.stanzaId) return reply(sock, from, "❌ Réponds à un message view once avec .vv", msg);

        const stored = viewOnceStore.get(ctx.stanzaId);
        if (!stored) return reply(sock, from, "❌ Message view once introuvable. Il doit être récent.", msg);

        try {
            if (stored.type === "image") {
                await sock.sendMessage(from, {
                    image: stored.buffer,
                    caption: `👁 *View Once déverrouillé*\n_De:_ @${shortNum(stored.sender)}`,
                    mentions: [stored.sender]
                }, { quoted: msg });
            } else if (stored.type === "video") {
                await sock.sendMessage(from, {
                    video: stored.buffer,
                    caption: `👁 *View Once déverrouillé*\n_De:_ @${shortNum(stored.sender)}`,
                    mentions: [stored.sender]
                }, { quoted: msg });
            }
        } catch (e) {
            await reply(sock, from, "❌ Erreur lors du déverrouillage.", msg);
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
    const viewOnceMsg =
        msg.message?.viewOnceMessage?.message ||
        msg.message?.viewOnceMessageV2?.message ||
        msg.message?.viewOnceMessageV2Extension?.message;

    if (!viewOnceMsg) return;

    try {
        if (viewOnceMsg.imageMessage) {
            const buf = await downloadMedia(viewOnceMsg.imageMessage, "image");
            viewOnceStore.set(msg.key.id, { type: "image", buffer: buf, sender });
            setTimeout(() => viewOnceStore.delete(msg.key.id), 300000); // 5 min
        } else if (viewOnceMsg.videoMessage) {
            const buf = await downloadMedia(viewOnceMsg.videoMessage, "video");
            viewOnceStore.set(msg.key.id, { type: "video", buffer: buf, sender });
            setTimeout(() => viewOnceStore.delete(msg.key.id), 300000);
        }
    } catch (_) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   GESTIONNAIRE DE MESSAGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleMessage(sock, m) {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const body = getBody(msg).trim();
    const inGroup = isGroup(from);

    // Intercepter view once automatiquement
    await interceptViewOnce(sock, msg);

    if (CONFIG.mode === "group" && !inGroup) return;
    if (CONFIG.mode === "private" && inGroup) return;

    const blocked = await runSecurityChecks(sock, from, msg, sender, body);
    if (blocked) return;

    if (!body.startsWith(CONFIG.prefix)) return;

    const args = body.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const handler = commands[commandName];

    if (handler) {
        try {
            await handler(sock, from, msg, args, sender);
        } catch (err) {
            console.error(`[ERREUR] .${commandName}:`, err.message);
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

    // Demander numéro AVANT de créer le socket (fix bug 401)
    let phoneNumber = null;
    if (!state.creds.registered) {
        phoneNumber = await question("📱 Ton numéro WhatsApp (ex: 50935443504) : ");
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
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
        keepAliveIntervalMs: 30_000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
    });

    // Pairing code APRÈS création socket + délai 2s
    if (phoneNumber && !state.creds.registered) {
        await wait(2000);
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            const fmt = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n╔══════════════════════════════╗`);
            console.log(`║  🚀 CODE DE JUMELAGE O-TECH  ║`);
            console.log(`║         ${fmt}         ║`);
            console.log(`╚══════════════════════════════╝`);
            console.log("👉 WhatsApp → ⋮ → Appareils connectés → Connecter avec un numéro\n");
        } catch (e) {
            console.log("❌ Erreur pairing code:", e.message);
            console.log(`💡 Supprime le dossier '${CONFIG.sessionName}' et relance.`);
            process.exit(1);
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
                    await sock.updateProfilePicture(sock.user.id, { img: fs.readFileSync(ANON_IMG) });
                    console.log("🖼  Photo de profil Anonymous O-TECH appliquée.");
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
                if (isOwner(num) && anu.action === "remove") continue;

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
