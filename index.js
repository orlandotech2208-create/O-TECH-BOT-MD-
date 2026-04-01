const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    getContentType,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   IMAGE DE PROFIL O-TECH (intégrée en base64)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const OTECH_PROFILE_PIC = Buffer.from(
    fs.existsSync(path.join(__dirname, "welcome.jpg"))
        ? fs.readFileSync(path.join(__dirname, "welcome.jpg"))
        : Buffer.alloc(0)
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONFIG PRINCIPALE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CONFIG = {
    botName: "O-TECH BOT",
    owner: "Orlando Tech",
    ownerNumber: "50935443504@s.whatsapp.net", // Ton numéro ici
    prefix: ".",
    sessionName: "session_otech",
    mode: "both", // "group" | "private" | "both"

    // Sécurité — activer/désactiver manuellement
    antiLink: false,
    antiSpam: false,
    antiBadWord: false,

    // Spam threshold
    spamLimit: 5,       // nb messages max
    spamWindow: 5000,   // en ms (5 secondes)
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   STOCKAGE EN MÉMOIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const spamMap = new Map();   // { jid: { count, timer } }
const warnMap = new Map();   // { jid: warnCount }
const groupSettings = new Map(); // { groupId: { antiLink, antiSpam, ... } }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   UTILITAIRES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const getBody = (msg) =>
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption || "";

const isGroup = (jid) => jid.endsWith("@g.us");
const isOwner = (jid) => jid.replace(/:[0-9]+/, "") === CONFIG.ownerNumber.replace(/:[0-9]+/, "");

const reply = async (sock, from, text, quoted) => {
    await sock.sendMessage(from, { text }, { quoted });
};

const getGroupSetting = (groupId, key) => {
    const s = groupSettings.get(groupId);
    return s ? s[key] : CONFIG[key];
};

const setGroupSetting = (groupId, key, value) => {
    if (!groupSettings.has(groupId)) groupSettings.set(groupId, {});
    groupSettings.get(groupId)[key] = value;
};

const containsLink = (text) =>
    /https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|youtu\.be/i.test(text);

const badWords = ["mot1", "mot2"]; // Ajoute tes mots ici
const containsBadWord = (text) =>
    badWords.some((w) => text.toLowerCase().includes(w));

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   BLAGUES (FR)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const blagues = [
    "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau !",
    "Un homme entre dans une bibliothèque et demande un livre sur la paranoïa. La bibliothécaire chuchote : Ils sont juste derrière vous !",
    "Qu'est-ce qu'un canif ? Un petit fien !",
    "Pourquoi Superman porte-t-il son slip par-dessus son collant ? Parce qu'il met toujours ses super-pouvoirs en avant !",
    "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël !",
    "Qu'est-ce qu'un crocodile qui surveille des bagages ? Un sac à dents !",
    "Pourquoi les fantômes ne mentent-ils pas ? Parce qu'on voit à travers eux !",
    "C'est l'histoire d'une vague qui rencontre une autre vague... Ça fait des remous.",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   8BALL RÉPONSES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ball8Responses = [
    "✅ Oui, absolument.",
    "✅ C'est certain.",
    "✅ Sans aucun doute.",
    "🟡 Peut-être...",
    "🟡 Les signes sont flous.",
    "🟡 Demande encore plus tard.",
    "❌ Non, pas du tout.",
    "❌ Les signes disent non.",
    "❌ Très peu probable.",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   COMMANDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = {

    // ── INFO ──────────────────────────────────
    menu: async (sock, from, msg, args) => {
        const text =
            `╔═══════════════════════════╗\n` +
            `║       🤖 *O-TECH BOT*       ║\n` +
            `║   _Propulsé par Orlando Tech_   ║\n` +
            `╚═══════════════════════════╝\n\n` +
            `*📋 INFO*\n` +
            `▸ ${CONFIG.prefix}menu — Ce menu\n` +
            `▸ ${CONFIG.prefix}ping — Test de connexion\n` +
            `▸ ${CONFIG.prefix}botinfo — Infos du bot\n` +
            `▸ ${CONFIG.prefix}uptime — Temps en ligne\n\n` +
            `*🛠 MODÉRATION* _(groupe)_\n` +
            `▸ ${CONFIG.prefix}kick @user — Expulser\n` +
            `▸ ${CONFIG.prefix}add numéro — Ajouter\n` +
            `▸ ${CONFIG.prefix}promote @user — Admin\n` +
            `▸ ${CONFIG.prefix}demote @user — Retirer admin\n` +
            `▸ ${CONFIG.prefix}mute — Fermer le groupe\n` +
            `▸ ${CONFIG.prefix}unmute — Ouvrir le groupe\n` +
            `▸ ${CONFIG.prefix}warn @user — Avertir\n` +
            `▸ ${CONFIG.prefix}resetwarn @user — Reset warn\n` +
            `▸ ${CONFIG.prefix}tag — Mentionner tout le monde\n` +
            `▸ ${CONFIG.prefix}delete — Supprimer un message\n\n` +
            `*🛡 SÉCURITÉ* _(owner/admin)_\n` +
            `▸ ${CONFIG.prefix}antilink on/off\n` +
            `▸ ${CONFIG.prefix}antispam on/off\n` +
            `▸ ${CONFIG.prefix}antibadword on/off\n\n` +
            `*🎮 FUN & JEUX*\n` +
            `▸ ${CONFIG.prefix}blague — Blague aléatoire\n` +
            `▸ ${CONFIG.prefix}8ball question — Boule magique\n` +
            `▸ ${CONFIG.prefix}pile — Pile ou Face\n` +
            `▸ ${CONFIG.prefix}dé — Lancer un dé\n` +
            `▸ ${CONFIG.prefix}rps pierre/feuille/ciseaux\n` +
            `▸ ${CONFIG.prefix}compteur nombre — Compte à rebours\n\n` +
            `*🔧 UTILITAIRES*\n` +
            `▸ ${CONFIG.prefix}sticker — Image → Sticker\n` +
            `▸ ${CONFIG.prefix}tts texte — Texte en gras stylé\n` +
            `▸ ${CONFIG.prefix}calc expression — Calculatrice\n` +
            `▸ ${CONFIG.prefix}météo ville — Météo (beta)\n\n` +
            `_O-TECH © 2025 — Innovation constante_`;
        await reply(sock, from, text, msg);
    },

    ping: async (sock, from, msg) => {
        const start = Date.now();
        await reply(sock, from, "🏓 Calcul...", msg);
        const latency = Date.now() - start;
        await reply(sock, from, `⚡ *Pong!* Latence : *${latency}ms*`, msg);
    },

    botinfo: async (sock, from, msg) => {
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        await reply(sock, from,
            `🤖 *O-TECH BOT — Informations*\n\n` +
            `▸ Nom : *${CONFIG.botName}*\n` +
            `▸ Créateur : *${CONFIG.owner}*\n` +
            `▸ Préfixe : *${CONFIG.prefix}*\n` +
            `▸ Uptime : *${h}h ${m}m ${s}s*\n` +
            `▸ Anti-lien : *${CONFIG.antiLink ? "ON" : "OFF"}*\n` +
            `▸ Anti-spam : *${CONFIG.antiSpam ? "ON" : "OFF"}*\n` +
            `▸ Mode : *${CONFIG.mode}*\n` +
            `▸ Node.js : *${process.version}*`,
            msg
        );
    },

    uptime: async (sock, from, msg) => {
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        await reply(sock, from, `⏱ *Uptime :* ${h}h ${m}m ${s}s`, msg);
    },

    // ── MODÉRATION ────────────────────────────
    kick: async (sock, from, msg, args, metadata) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Commande réservée aux groupes.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre à expulser.", msg);
        for (const jid of mentioned) {
            await sock.groupParticipantsUpdate(from, [jid], "remove");
        }
        await reply(sock, from, `✅ *${mentioned.length}* membre(s) expulsé(s).`, msg);
    },

    add: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Commande réservée aux groupes.", msg);
        if (!args[0]) return reply(sock, from, "❌ Usage : .add 509XXXXXXXX", msg);
        const num = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await sock.groupParticipantsUpdate(from, [num], "add");
        await reply(sock, from, `✅ Membre ajouté.`, msg);
    },

    promote: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        await sock.groupParticipantsUpdate(from, mentioned, "promote");
        await reply(sock, from, `⬆️ Membre(s) promu(s) admin.`, msg);
    },

    demote: async (sock, from, msg, args) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        await sock.groupParticipantsUpdate(from, mentioned, "demote");
        await reply(sock, from, `⬇️ Admin retiré.`, msg);
    },

    mute: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupSettingUpdate(from, "announcement");
        await reply(sock, from, "🔇 Groupe fermé — seuls les admins peuvent écrire.", msg);
    },

    unmute: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        await sock.groupSettingUpdate(from, "not_announcement");
        await reply(sock, from, "🔊 Groupe ouvert — tout le monde peut écrire.", msg);
    },

    warn: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        for (const jid of mentioned) {
            const current = warnMap.get(jid) || 0;
            warnMap.set(jid, current + 1);
            const total = warnMap.get(jid);
            if (total >= 3) {
                await sock.groupParticipantsUpdate(from, [jid], "remove");
                warnMap.delete(jid);
                await reply(sock, from, `⛔ @${jid.split("@")[0]} a été expulsé après 3 avertissements.`, msg);
            } else {
                await reply(sock, from, `⚠️ @${jid.split("@")[0]} — Avertissement *${total}/3*.`, msg);
            }
        }
    },

    resetwarn: async (sock, from, msg) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply(sock, from, "❌ Mentionne un membre.", msg);
        for (const jid of mentioned) warnMap.delete(jid);
        await reply(sock, from, "✅ Avertissements réinitialisés.", msg);
    },

    tag: async (sock, from, msg) => {
        if (!isGroup(from)) return reply(sock, from, "❌ Groupe seulement.", msg);
        const metadata = await sock.groupMetadata(from);
        const members = metadata.participants.map((p) => p.id);
        const mentions = members.map((m) => `@${m.split("@")[0]}`).join(" ");
        await sock.sendMessage(from, {
            text: `📢 *Attention tout le monde !*\n\n${mentions}`,
            mentions: members,
        }, { quoted: msg });
    },

    delete: async (sock, from, msg) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!quoted || !stanzaId) return reply(sock, from, "❌ Réponds au message à supprimer.", msg);
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: stanzaId, participant } });
    },

    // ── SÉCURITÉ ──────────────────────────────
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

    // ── FUN & JEUX ────────────────────────────
    blague: async (sock, from, msg) => {
        await reply(sock, from, `😂 *Blague du jour :*\n\n${randomChoice(blagues)}`, msg);
    },

    "8ball": async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Pose une question ! Ex : .8ball Vais-je réussir ?", msg);
        const question_text = args.join(" ");
        await reply(sock, from,
            `🎱 *Magic 8-Ball*\n\n❓ _${question_text}_\n\n${randomChoice(ball8Responses)}`,
            msg
        );
    },

    pile: async (sock, from, msg) => {
        const result = Math.random() < 0.5 ? "🪙 *PILE*" : "🪙 *FACE*";
        await reply(sock, from, `Résultat : ${result}`, msg);
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
        if (!choices.includes(player))
            return reply(sock, from, "❌ Choisis : pierre, feuille ou ciseaux", msg);
        const bot = randomChoice(choices);
        let result;
        if (player === bot) result = "🟡 *Égalité !*";
        else if (
            (player === "pierre" && bot === "ciseaux") ||
            (player === "feuille" && bot === "pierre") ||
            (player === "ciseaux" && bot === "feuille")
        ) result = "✅ *Tu gagnes !*";
        else result = "❌ *Tu perds !*";
        await reply(sock, from,
            `🎮 *Pierre / Feuille / Ciseaux*\n\nToi : ${emojis[player]} *${player}*\nBot : ${emojis[bot]} *${bot}*\n\n${result}`,
            msg
        );
    },

    compteur: async (sock, from, msg, args) => {
        const n = parseInt(args[0]);
        if (isNaN(n) || n < 1 || n > 10)
            return reply(sock, from, "❌ Usage : .compteur 5 (entre 1 et 10)", msg);
        for (let i = n; i >= 1; i--) {
            await sock.sendMessage(from, { text: `⏳ *${i}...*` });
            await wait(1000);
        }
        await reply(sock, from, "🎉 *BOOM !*", msg);
    },

    // ── UTILITAIRES ───────────────────────────
    tts: async (sock, from, msg, args) => {
        if (!args.length) return reply(sock, from, "❌ Usage : .tts votre texte ici", msg);
        const text = args.join(" ");
        const styled = `*${text.toUpperCase()}*`;
        await reply(sock, from, styled, msg);
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
        const city = args.join(" ");
        // Intègre ton API météo ici (OpenWeatherMap, etc.)
        await reply(sock, from,
            `🌤 *Météo — ${city}*\n\n_Intègre une clé API OpenWeatherMap pour activer cette fonctionnalité._\nhttps://openweathermap.org/api`,
            msg
        );
    },

    sticker: async (sock, from, msg) => {
        const type = getContentType(msg.message);
        if (!["imageMessage", "videoMessage"].includes(type))
            return reply(sock, from, "❌ Réponds à une image ou vidéo courte avec .sticker", msg);
        // Nécessite sharp/ffmpeg — placeholder
        await reply(sock, from, "🎨 Fonctionnalité sticker — installe *sharp* et *fluent-ffmpeg* pour l'activer.", msg);
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

    // Anti-lien
    if (antiLink && containsLink(body)) {
        await sock.sendMessage(from, {
            delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender }
        });
        await sock.sendMessage(from, {
            text: `🔗 @${sender.split("@")[0]} Les liens sont interdits dans ce groupe !`,
            mentions: [sender],
        });
        return true;
    }

    // Anti-bad-word
    if (antiBadWord && containsBadWord(body)) {
        // 1. Suppression immédiate du message
        await sock.sendMessage(from, {
            delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender }
        });

        // 2. Message d'avertissement stylé
        const warningText = 
            `╔═══════════════════════════╗\n` +
            `║   ⚠️  *SÉCURITÉ O-TECH* ⚠️   ║\n` +
            `╚═══════════════════════════╝\n\n` +
            `🛑 @${sender.split("@")[0]}\n` +
            `> *Action :* Message supprimé.\n` +
            `> *Raison :* Langage inapproprié détecté.\n\n` +
            `💡 _Merci de rester respectueux pour le bien de la communauté._\n\n` +
            `*O-TECH BOT v1.0 — Surveillance Active* 🛡️`;

        await sock.sendMessage(from, {
            text: warningText,
            mentions: [sender],
        });
        return true;
    }

    // Anti-spam
    if (antiSpam) {
        if (!spamMap.has(sender)) {
            spamMap.set(sender, { count: 0, timer: null });
        }
        const data = spamMap.get(sender);
        data.count++;
        clearTimeout(data.timer);
        data.timer = setTimeout(() => spamMap.delete(sender), CONFIG.spamWindow);
        if (data.count >= CONFIG.spamLimit) {
            await sock.groupParticipantsUpdate(from, [sender], "remove");
            spamMap.delete(sender);
            await sock.sendMessage(from, {
                text: `🚫 @${sender.split("@")[0]} expulsé pour spam.`,
                mentions: [sender],
            });
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
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const body = getBody(msg).trim();
    const inGroup = isGroup(from);

    // Filtre selon le mode
    if (CONFIG.mode === "group" && !inGroup) return;
    if (CONFIG.mode === "private" && inGroup) return;

    // Vérifications sécurité (avant commandes)
    const blocked = await runSecurityChecks(sock, from, msg, sender, body);
    if (blocked) return;

    // Traitement des commandes
    if (!body.startsWith(CONFIG.prefix)) return;

    const args = body.slice(CONFIG.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const handler = commands[commandName];

    if (handler) {
        try {
            await handler(sock, from, msg, args);
        } catch (err) {
            console.error(`[ERREUR] Commande .${commandName} :`, err.message);
            await reply(sock, from, `❌ Erreur lors de l'exécution de *.${commandName}*`, msg);
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CONNEXION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function startOTechBot() {
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionName);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
    });

    // Pairing Code
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question("📱 Entrez votre numéro (ex: 5093xxxxxxx) : ");
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`\n╔══════════════════════════╗`);
        console.log(`║  🚀 CODE DE JUMELAGE O-TECH  ║`);
        console.log(`║         ${code}         ║`);
        console.log(`╚══════════════════════════╝\n`);
    }

    // Événements de connexion
    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log(shouldReconnect
                ? `🔄 Reconnexion... (code: ${code})`
                : `🔴 Session terminée. Supprime le dossier ${CONFIG.sessionName} et relance.`
            );
            if (shouldReconnect) startOTechBot();
        } else if (connection === "open") {
            console.log(`\n✅ ${CONFIG.botName} EST EN LIGNE !`);
            console.log(`▸ Préfixe : ${CONFIG.prefix}`);
            console.log(`▸ Mode    : ${CONFIG.mode}`);
            console.log(`▸ Commandes : ${Object.keys(commands).length}\n`);

            // ── Photo de profil du bot ──
            try {
                const imgPath = path.join(__dirname, "welcome.jpg");
                if (fs.existsSync(imgPath)) {
                    const imgBuffer = fs.readFileSync(imgPath);
                    await sock.updateProfilePicture(sock.user.id, { img: imgBuffer });
                    console.log("🖼  Photo de profil O-TECH appliquée.");
                } else {
                    console.warn("⚠️  welcome.jpg introuvable — photo de profil non définie.");
                }
            } catch (err) {
                console.warn("⚠️  Photo de profil :", err.message);
            }
        }
    });

    sock.ev.on("messages.upsert", (m) => handleMessage(sock, m));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //   GESTION DES ARRIVÉES / DÉPARTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    sock.ev.on("group-participants.update", async (anu) => {
        try {
            const groupId   = anu.id;
            const metadata  = await sock.groupMetadata(groupId);
            const groupName = metadata.subject;
            const memberCount = metadata.participants.length;

            for (const num of anu.participants) {
                const shortNum = num.split("@")[0];

                let contactName = shortNum;
                try {
                    const info = await sock.onWhatsApp(num);
                    if (info?.[0]?.notify) contactName = info[0].notify;
                } catch { }

                if (anu.action === "add") {
                    const welcomeText =
                        `╔══════════════════════════╗\n` +
                        `║  🌐 *BIENVENUE CHEZ O-TECH*  ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `👋 Salut @${shortNum} !\n\n` +
                        `👤 *Nom :* ${contactName}\n` +
                        `📱 *Numéro :* +${shortNum}\n` +
                        `🏢 *Groupe :* ${groupName}\n` +
                        `👥 *Membres :* ${memberCount}\n\n` +
                        `📜 Merci de lire la description du groupe\n` +
                        `et de respecter les règles.\n\n` +
                        `_Innovation constante — O-TECH BOT_ 🚀`;
                    await sock.sendMessage(groupId, { text: welcomeText, mentions: [num] });

                } else if (anu.action === "remove") {
                    const byeText =
                        `╔══════════════════════════╗\n` +
                        `║     👋 *DÉPART DE O-TECH*    ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `😢 *${contactName}* (+${shortNum})\n` +
                        `vient de quitter *${groupName}*.\n\n` +
                        `👥 *Membres restants :* ${memberCount}\n\n` +
                        `_On espère te revoir bientôt — O-TECH BOT_ 🚀`;
                    await sock.sendMessage(groupId, { text: byeText, mentions: [num] });
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
startOTechBot();
