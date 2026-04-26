'use strict';

// ════════════════════════════════════════════════════════
//        🤖 O-TECH BOT - by 𝐌𝐫. 𝐎𝐫𝐥𝐚𝐧𝐝𝐎 Tech
//              WhatsApp Bot - Baileys + Node.js
// ════════════════════════════════════════════════════════

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  areJidsSameUser,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');

const pino   = require('pino');
const rl     = require('readline');
const fs     = require('fs');
const path   = require('path');
const { Boom } = require('@hapi/boom');

// ── CONFIG ───────────────────────────────────────────────
const config = {
  ownerName:   '𝐌𝐫. 𝐎𝐫𝐥𝐚𝐧𝐝𝐎 Tech',
  ownerNumber: ['50935443504'],
  botName:     'O-TECH BOT',
  prefix:      '.',
  sessionDir:  './session_otech',
  dataDir:     './data',
  maxWarns:    3,
};

// ── DATA / PERSISTANCE ───────────────────────────────────
if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

const dbPath = (n) => path.join(config.dataDir, `${n}.json`);

function loadDB(name) {
  try {
    if (fs.existsSync(dbPath(name))) return JSON.parse(fs.readFileSync(dbPath(name), 'utf8'));
  } catch {}
  return {};
}

function saveDB(name, data) {
  try { fs.writeFileSync(dbPath(name), JSON.stringify(data, null, 2)); } catch {}
}

let warns        = loadDB('warns');        // warns[group][jid] = count
let mutes        = loadDB('mutes');        // mutes[group][jid] = true
let grpSettings  = loadDB('settings');     // grpSettings[group] = { antilink, antispam, antibadword }
let leaderboard  = loadDB('leaderboard'); // leaderboard[group][jid] = score

// Sessions en mémoire (pas besoin de persistance)
const quizSessions      = {};
const duelSessions      = {};
const wordChainSessions = {};
const spamTracker       = {};

// ── CUSTOM STORE (remplacement de makeInMemoryStore) ─────
const store = {
  messages:      {},
  groupMetadata: {},

  bind(ev) {
    ev.on('messages.upsert', ({ messages }) => {
      for (const m of messages) {
        const jid = m.key.remoteJid;
        if (!this.messages[jid]) this.messages[jid] = [];
        this.messages[jid].push(m);
        if (this.messages[jid].length > 100) this.messages[jid].shift();
      }
    });

    ev.on('groups.update', (updates) => {
      for (const u of updates) {
        if (this.groupMetadata[u.id]) Object.assign(this.groupMetadata[u.id], u);
      }
    });

    ev.on('group-participants.update', ({ id, participants, action }) => {
      const meta = this.groupMetadata[id];
      if (!meta) return;
      if (action === 'add') {
        for (const p of participants) {
          if (!meta.participants.find(x => x.id === p))
            meta.participants.push({ id: p, admin: null });
        }
      } else if (action === 'remove') {
        meta.participants = meta.participants.filter(p => !participants.includes(p.id));
      } else if (action === 'promote') {
        meta.participants.forEach(p => { if (participants.includes(p.id)) p.admin = 'admin'; });
      } else if (action === 'demote') {
        meta.participants.forEach(p => { if (participants.includes(p.id)) p.admin = null; });
      }
    });
  },

  async getGroupMetadata(jid, sock) {
    if (!this.groupMetadata[jid]) {
      try { this.groupMetadata[jid] = await sock.groupMetadata(jid); } catch {}
    }
    return this.groupMetadata[jid];
  },
};

// ── HELPERS ──────────────────────────────────────────────
function toJid(num) {
  return String(num).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

function isOwner(jid) {
  const n = String(jid).replace(/[^0-9]/g, '');
  return config.ownerNumber.some(o => String(o).replace(/[^0-9]/g, '') === n);
}

function getSettings(groupJid) {
  if (!grpSettings[groupJid])
    grpSettings[groupJid] = { antilink: false, antispam: false, antibadword: false };
  return grpSettings[groupJid];
}

function getTextFromMsg(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  ).trim();
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return { message: ctx?.quotedMessage, sender: ctx?.participant, stanzaId: ctx?.stanzaId };
}

const BAD_WORDS = ['merde', 'putain', 'connard', 'salope', 'batard', 'bâtard', 'fuck', 'shit', 'kont', 'manman'];

function hasBadWord(text) {
  const t = text.toLowerCase();
  return BAD_WORDS.some(w => t.includes(w));
}

function hasLink(text) {
  return /https?:\/\/|www\.|wa\.me\/|t\.me\/|discord\.gg\//i.test(text);
}

const QUIZ_POOL = [
  { q: '🧠 Quelle est la capitale d\'Haïti?',           a: 'port-au-prince' },
  { q: '🧠 Combien font 7 × 8?',                        a: '56' },
  { q: '🧠 Quel est le plus grand océan du monde?',     a: 'pacifique' },
  { q: '🧠 Combien de continents existe-t-il?',         a: '7' },
  { q: '🧠 Quelle planète est la plus proche du soleil?', a: 'mercure' },
  { q: '🧠 Quel est l\'animal terrestre le plus rapide?', a: 'guépard' },
  { q: '🧠 Combien d\'heures dans une journée?',        a: '24' },
  { q: '🧠 Quelle est la langue la plus parlée au monde?', a: 'anglais' },
  { q: '🧠 Qui est le père de la nation haïtienne?',   a: 'dessalines' },
  { q: '🧠 En quelle année Haïti a-t-il obtenu son indépendance?', a: '1804' },
];

const DEVINETTES = [
  { q: '🤔 Je suis toujours devant toi mais on ne peut pas me voir. Qui suis-je?', a: 'futur' },
  { q: '🤔 Plus je sèche, plus je suis mouillée. Qui suis-je?',                   a: 'serviette' },
  { q: '🤔 J\'ai des dents mais je ne mords pas. Qui suis-je?',                   a: 'peigne' },
  { q: '🤔 Je cours mais j\'ai pas de jambes. Qui suis-je?',                      a: 'rivière' },
  { q: '🤔 Je parle sans bouche. Qui suis-je?',                                   a: 'écho' },
];

const AUTO_EMOJIS = ['🔥', '💯', '✅', '👍', '🚀', '⚡', '🎯', '💪', '😎'];

// ── MENU ─────────────────────────────────────────────────
function buildMenu() {
  return `╔══════════════════════════╗
║   🤖 *O-TECH BOT MENU*    ║
║   by ${config.ownerName}  ║
╚══════════════════════════╝

📌 *MODÉRATION*
├ .kick @user
├ .add numéro
├ .promote @user
├ .demote @user
├ .mute @user
├ .unmute @user
├ .warn @user
├ .clearwarn @user
└ .delete (reply msg)

👥 *GROUPE*
├ .tag texte @user
├ .tagall texte
├ .open / .close
├ .groupname nom
└ .groupdesc description

🔒 *SÉCURITÉ*
├ .antilink on/off
├ .antispam on/off
└ .antibadword on/off

⚡ *BULK (owner only)*
├ .kickall
├ .kickall2
├ .promoteall
├ .demoteall
├ .broadcast message
├ .contacts
└ .listgroups

🎮 *JEUX*
├ .quiz
├ .devinette
├ .wordchain
├ .leaderboard
└ .duel @user

ℹ️ *INFO*
├ .ping
├ .owner
├ .info
└ .menu

> _${config.botName} © O-TECH 2025_`;
}

// ────────────────────────────────────────────────────────
//                     DÉMARRAGE BOT
// ────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    fireInitQueries: false,
    getMessage: async () => undefined,
  });

  store.bind(sock.ev);

  // ── PAIRING CODE ─────────────────────────────────────
  if (!sock.authState.creds.registered) {
    const rli = rl.createInterface({ input: process.stdin, output: process.stdout });
    const num = await new Promise(res => rli.question('📱 Entre ton numéro (ex: 50935443504): ', res));
    rli.close();
    const cleaned = num.trim().replace(/[^0-9]/g, '');
    await new Promise(r => setTimeout(r, 2000));
    const code = await sock.requestPairingCode(cleaned);
    console.log(`\n🔑 Code de pairing: ${code}\n   Entre ce code dans WhatsApp > Appareils liés\n`);
  }

  // ── CONNEXION ─────────────────────────────────────────
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reconnect = code !== DisconnectReason.loggedOut;
      console.log(`\n❌ Déconnecté (code: ${code}). Reconnexion: ${reconnect}`);
      if (reconnect) setTimeout(startBot, 4000);
      else console.log('🔐 Session expirée. Supprime ./session_otech et relance.');
    } else if (connection === 'connecting') {
      console.log('🔄 Connexion en cours...');
    } else if (connection === 'open') {
      console.log(`\n✅ ${config.botName} connecté! ✨\n`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ── WELCOME / FAREWELL + ANTI-KICK ───────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const meta = await store.getGroupMetadata(id, sock);
      if (!meta) return;

      const groupName  = meta.subject || 'ce groupe';
      const memberCount = meta.participants?.length || 0;

      for (const pJid of participants) {
        const num = pJid.replace('@s.whatsapp.net', '');

        // Anti-kick: si l'owner est retiré, alerte avec humour
        if (action === 'remove' && isOwner(pJid)) {
          await sock.sendMessage(id, {
            text: `⚠️ *ALERTE SÉCURITÉ!*\n\nKilè ou vin fou pou ou kick _${config.ownerName}_?! 😤😂\nMwen la tankou move lespri, mwen pap janm ale! 👻\n\nEssaie encore et tu verras... 😏\n\n_${config.botName} © O-TECH_`,
          });
          continue;
        }

        if (action === 'add') {
          await sock.sendMessage(id, {
            text: `╔══════════════════════╗\n║   🎉 *BIENVENUE!*     ║\n╚══════════════════════╝\n\nBienvenue @${num} dans *${groupName}*! 🚀\n\n📱 Numéro: +${num}\n👥 Membres: ${memberCount}\n\n_Profite bien de ton séjour!_ 😊\n\n_${config.botName} © O-TECH_`,
            mentions: [pJid],
          });
        } else if (action === 'remove') {
          await sock.sendMessage(id, {
            text: `╔══════════════════════╗\n║   👋 *AU REVOIR!*     ║\n╚══════════════════════╝\n\n@${num} a quitté *${groupName}* 😢\n\n👥 Membres restants: ${memberCount}\n\n_Bonne continuation!_ 🌟\n\n_${config.botName} © O-TECH_`,
            mentions: [pJid],
          });
        }
      }
    } catch (e) {
      console.error('[welcome/farewell]', e.message);
    }
  });

  // ── HANDLER PRINCIPAL ────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        if (!jid) continue;

        const isGroup  = jid.endsWith('@g.us');
        const sender   = isGroup ? (msg.key.participant || '') : jid;
        if (!sender) continue;

        const senderNum = sender.replace('@s.whatsapp.net', '');
        const ownerFlag = isOwner(sender);
        const text      = getTextFromMsg(msg);

        // ── Métadonnées groupe ──────────────────────────
        let meta        = null;
        let senderAdmin = false;
        let botAdmin    = false;
        let botJid      = '';

        if (isGroup) {
          meta      = await store.getGroupMetadata(jid, sock);
          botJid    = jidNormalizedUser(sock.user?.id || '');
          senderAdmin = !!(meta?.participants?.find(p => areJidsSameUser(p.id, sender))?.admin);
          botAdmin    = !!(meta?.participants?.find(p => areJidsSameUser(p.id, botJid))?.admin);

          // ── Mute check ─────────────────────────────────
          if (mutes[jid]?.[sender] && !ownerFlag && !senderAdmin) continue;

          // ── Anti-link ──────────────────────────────────
          const settings = getSettings(jid);
          if (settings.antilink && !senderAdmin && !ownerFlag && hasLink(text)) {
            if (botAdmin) {
              try { await sock.sendMessage(jid, { delete: msg.key }); } catch {}
              await sock.sendMessage(jid, {
                text: `🚫 *Anti-lien activé!*\n@${senderNum} les liens sont interdits ici!\n\n_${config.botName}_`,
                mentions: [sender],
              });
            }
            continue;
          }

          // ── Anti-bad-word ──────────────────────────────
          if (settings.antibadword && !senderAdmin && !ownerFlag && hasBadWord(text)) {
            if (botAdmin) {
              try { await sock.sendMessage(jid, { delete: msg.key }); } catch {}
              await sock.sendMessage(jid, {
                text: `🚫 *Langage inapproprié!*\n@${senderNum} surveille ton vocabulaire!\n\n_${config.botName}_`,
                mentions: [sender],
              });
            }
            continue;
          }

          // ── Anti-spam ──────────────────────────────────
          if (settings.antispam && !senderAdmin && !ownerFlag) {
            const key = `${jid}|${sender}`;
            const now = Date.now();
            if (!spamTracker[key]) spamTracker[key] = [];
            spamTracker[key] = spamTracker[key].filter(t => now - t < 5000);
            spamTracker[key].push(now);
            if (spamTracker[key].length > 5) {
              await sock.sendMessage(jid, {
                text: `🚫 *Anti-spam!*\n@${senderNum} arrête le spam!\n\n_${config.botName}_`,
                mentions: [sender],
              });
              spamTracker[key] = [];
              continue;
            }
          }

          // ── Auto-réaction emoji (20% de chance) ────────
          if (text && Math.random() < 0.2) {
            try {
              await sock.sendMessage(jid, {
                react: {
                  text: AUTO_EMOJIS[Math.floor(Math.random() * AUTO_EMOJIS.length)],
                  key: msg.key,
                },
              });
            } catch {}
          }

          // ── Quiz check ─────────────────────────────────
          if (quizSessions[jid] && !text.startsWith(config.prefix)) {
            const session = quizSessions[jid];
            if (text.toLowerCase() === session.answer) {
              clearTimeout(session.timeout);
              delete quizSessions[jid];
              if (!leaderboard[jid]) leaderboard[jid] = {};
              leaderboard[jid][sender] = (leaderboard[jid][sender] || 0) + 3;
              saveDB('leaderboard', leaderboard);
              await sock.sendMessage(jid, {
                text: `🎉 *BONNE RÉPONSE!*\nBravo @${senderNum}! +3 points 🏆\n\n_${config.botName}_`,
                mentions: [sender],
              });
            }
            continue;
          }

          // ── Chaîne de mots check ───────────────────────
          if (wordChainSessions[jid] && !text.startsWith(config.prefix)) {
            const session = wordChainSessions[jid];
            const word = text.toLowerCase().trim();
            if (/^[a-zA-ZÀ-ÿ]+$/.test(word) && word[0] === session.lastLetter) {
              if (!session.words.includes(word)) {
                session.lastLetter = word[word.length - 1];
                session.words.push(word);
                if (!leaderboard[jid]) leaderboard[jid] = {};
                leaderboard[jid][sender] = (leaderboard[jid][sender] || 0) + 1;
                saveDB('leaderboard', leaderboard);
                await sock.sendMessage(jid, {
                  text: `✅ *${word}* accepté!\n🔠 Prochain mot commence par *${session.lastLetter.toUpperCase()}*\n📍 @${senderNum} +1 pt`,
                  mentions: [sender],
                });
              } else {
                await sock.sendMessage(jid, { text: `❌ Ce mot a déjà été utilisé!\n\n_${config.botName}_` });
              }
            }
            continue;
          }

          // ── Duel accept check ──────────────────────────
          if (duelSessions[jid]?.waitingAccept && duelSessions[jid].player2 === sender) {
            if (['oui', 'yes', 'wi'].includes(text.toLowerCase())) {
              const duel  = duelSessions[jid];
              duel.waitingAccept = false;
              const winner = Math.random() < 0.5 ? duel.player1 : duel.player2;
              const loser  = winner === duel.player1 ? duel.player2 : duel.player1;
              clearTimeout(duel.timeout);
              delete duelSessions[jid];
              if (!leaderboard[jid]) leaderboard[jid] = {};
              leaderboard[jid][winner] = (leaderboard[jid][winner] || 0) + 5;
              saveDB('leaderboard', leaderboard);
              await sock.sendMessage(jid, {
                text: `⚔️ *RÉSULTAT DU DUEL!*\n\n🏆 Gagnant: @${winner.replace('@s.whatsapp.net', '')}\n💀 Perdant: @${loser.replace('@s.whatsapp.net', '')}\n\n+5 pts pour le gagnant! 🎯\n\n_${config.botName} © O-TECH_`,
                mentions: [winner, loser],
              });
            }
          }
        }

        // ── Vérification préfixe commande ───────────────
        if (!text.startsWith(config.prefix)) continue;

        const parts = text.slice(config.prefix.length).trim().split(/\s+/);
        const cmd   = parts.shift().toLowerCase();
        const body  = parts.join(' ');

        const mentioned = getMentioned(msg);
        const quoted    = getQuoted(msg);

        // Shortcut reply
        const reply = (t) =>
          sock.sendMessage(jid, { text: t, mentions: (t.match(/@(\d+)/g) || []).map(m => toJid(m.slice(1))) }, { quoted: msg });

        // Vérifs communes
        const needGroup = async () => { if (!isGroup) { await reply('❌ Cette commande est réservée aux groupes!'); return true; } return false; };
        const needAdmin = async () => {
          if (!senderAdmin && !ownerFlag) { await reply('❌ Réservé aux admins!'); return true; }
          return false;
        };
        const needOwner = async () => { if (!ownerFlag) { await reply('❌ Réservé au owner!'); return true; } return false; };
        const needBotAdmin = async () => { if (!botAdmin) { await reply('❌ Le bot doit être admin!'); return true; } return false; };

        // ════════════════════════════════════════════════
        //                   COMMANDES
        // ════════════════════════════════════════════════
        switch (cmd) {

          // ── INFO ──────────────────────────────────────
          case 'menu':
          case 'help':
            await reply(buildMenu());
            break;

          case 'ping': {
            const t = Date.now();
            await reply(`🏓 *Pong!* \`${Date.now() - t}ms\`\n✅ ${config.botName} est en ligne!\n\n_O-TECH_`);
            break;
          }

          case 'owner':
            await reply(`👑 *OWNER*\n\n🎭 Nom: ${config.ownerName}\n📱 WhatsApp: wa.me/${config.ownerNumber[0]}\n📧 Email: orlandotech2208@gmail.com\n🌐 O-TECH Brand\n\n_${config.botName} © O-TECH_`);
            break;

          case 'info':
            if (await needGroup()) break;
            await reply(`╔══════════════════════╗\n║  📊 *INFO GROUPE*     ║\n╚══════════════════════╝\n\n📌 Nom: ${meta?.subject || 'N/A'}\n👥 Membres: ${meta?.participants?.length || 0}\n👑 Admins: ${meta?.participants?.filter(p => p.admin)?.length || 0}\n📝 Desc: ${meta?.desc || 'Aucune'}\n\n_${config.botName} © O-TECH_`);
            break;

          // ── MODÉRATION ────────────────────────────────
          case 'kick': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un membre ou reply!'); break; }
            if (isOwner(target)) { await reply(`❌ Je ne peux pas kick ${config.ownerName}! 😤`); break; }
            if (areJidsSameUser(target, botJid)) { await reply('❌ Je ne peux pas me kicker moi-même!'); break; }
            await sock.groupParticipantsUpdate(jid, [target], 'remove');
            await reply(`✅ @${target.replace('@s.whatsapp.net', '')} a été kické! 👢\n\n_${config.botName}_`);
            break;
          }

          case 'add': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            if (!body) { await reply('❌ Usage: .add numéro (ex: .add 50912345678)'); break; }
            const addJid = toJid(body);
            await sock.groupParticipantsUpdate(jid, [addJid], 'add');
            await reply(`✅ +${body.replace(/[^0-9]/g, '')} a été ajouté! ✨\n\n_${config.botName}_`);
            break;
          }

          case 'promote': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un membre!'); break; }
            await sock.groupParticipantsUpdate(jid, [target], 'promote');
            await reply(`✅ @${target.replace('@s.whatsapp.net', '')} est maintenant *admin*! 👑\n\n_${config.botName}_`);
            break;
          }

          case 'demote': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un admin!'); break; }
            await sock.groupParticipantsUpdate(jid, [target], 'demote');
            await reply(`✅ @${target.replace('@s.whatsapp.net', '')} n'est plus admin!\n\n_${config.botName}_`);
            break;
          }

          case 'mute': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un membre!'); break; }
            if (isOwner(target)) { await reply('❌ Impossible de muter le owner!'); break; }
            if (!mutes[jid]) mutes[jid] = {};
            mutes[jid][target] = true;
            saveDB('mutes', mutes);
            await reply(`🔇 @${target.replace('@s.whatsapp.net', '')} a été muté!\n\n_${config.botName}_`);
            break;
          }

          case 'unmute': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un membre!'); break; }
            if (mutes[jid]) delete mutes[jid][target];
            saveDB('mutes', mutes);
            await reply(`🔊 @${target.replace('@s.whatsapp.net', '')} a été démuté!\n\n_${config.botName}_`);
            break;
          }

          case 'warn': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un membre!'); break; }
            if (isOwner(target)) { await reply(`❌ Je ne peux pas avertir ${config.ownerName}!`); break; }
            if (!warns[jid]) warns[jid] = {};
            warns[jid][target] = (warns[jid][target] || 0) + 1;
            saveDB('warns', warns);
            const count = warns[jid][target];
            if (count >= config.maxWarns) {
              await sock.groupParticipantsUpdate(jid, [target], 'remove');
              delete warns[jid][target];
              saveDB('warns', warns);
              await reply(`🚫 @${target.replace('@s.whatsapp.net', '')} kické après *${config.maxWarns} avertissements*!\n\n_${config.botName}_`);
            } else {
              await reply(`⚠️ Avertissement à @${target.replace('@s.whatsapp.net', '')}\n⚠️ ${count}/${config.maxWarns}\n\n_${config.botName}_`);
            }
            break;
          }

          case 'clearwarn': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const target = mentioned[0] || quoted.sender;
            if (!target) { await reply('❌ Mentionne un membre!'); break; }
            if (warns[jid]) delete warns[jid][target];
            saveDB('warns', warns);
            await reply(`✅ Avertissements de @${target.replace('@s.whatsapp.net', '')} effacés!\n\n_${config.botName}_`);
            break;
          }

          case 'warns': {
            if (await needGroup()) break;
            const target = mentioned[0] || quoted.sender || sender;
            const count = warns[jid]?.[target] || 0;
            await reply(`⚠️ @${target.replace('@s.whatsapp.net', '')} a *${count}/${config.maxWarns}* avertissements.\n\n_${config.botName}_`);
            break;
          }

          case 'delete':
          case 'del': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            if (!quoted.stanzaId) { await reply('❌ Fais reply sur le message à supprimer!'); break; }
            try {
              await sock.sendMessage(jid, {
                delete: {
                  remoteJid: jid,
                  id: quoted.stanzaId,
                  participant: quoted.sender,
                  fromMe: false,
                },
              });
            } catch {
              await reply('❌ Impossible de supprimer ce message.');
            }
            break;
          }

          // ── TAG ───────────────────────────────────────
          case 'tag': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (!body) { await reply('❌ Usage: .tag texte @user'); break; }
            await sock.sendMessage(jid, { text: body, mentions: mentioned });
            break;
          }

          case 'tagall': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const allJids = meta?.participants?.map(p => p.id) || [];
            const msg2    = body || '📢 Attention tout le monde!';
            const tags    = allJids.map(j => `@${j.replace('@s.whatsapp.net', '')}`).join(' ');
            await sock.sendMessage(jid, {
              text: `📢 *${msg2}*\n\n${tags}\n\n_${config.botName}_`,
              mentions: allJids,
            });
            break;
          }

          // ── GROUPE ────────────────────────────────────
          case 'open': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            await sock.groupSettingUpdate(jid, 'not_announcement');
            await reply(`✅ Groupe *ouvert*! Tout le monde peut écrire.\n\n_${config.botName}_`);
            break;
          }

          case 'close': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            await sock.groupSettingUpdate(jid, 'announcement');
            await reply(`🔒 Groupe *fermé*! Seuls les admins peuvent écrire.\n\n_${config.botName}_`);
            break;
          }

          case 'groupname': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            if (!body) { await reply('❌ Usage: .groupname NouveauNom'); break; }
            await sock.groupUpdateSubject(jid, body);
            await reply(`✅ Nom du groupe changé en *${body}*!\n\n_${config.botName}_`);
            break;
          }

          case 'groupdesc': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            if (await needBotAdmin()) break;
            if (!body) { await reply('❌ Usage: .groupdesc Nouvelle description'); break; }
            await sock.groupUpdateDescription(jid, body);
            await reply(`✅ Description du groupe mise à jour!\n\n_${config.botName}_`);
            break;
          }

          // ── SÉCURITÉ ──────────────────────────────────
          case 'antilink': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const val = body.toLowerCase();
            if (!['on', 'off'].includes(val)) { await reply('❌ Usage: .antilink on/off'); break; }
            getSettings(jid).antilink = val === 'on';
            saveDB('settings', grpSettings);
            await reply(`🔗 Anti-lien: *${val.toUpperCase()}*\n\n_${config.botName}_`);
            break;
          }

          case 'antispam': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const val = body.toLowerCase();
            if (!['on', 'off'].includes(val)) { await reply('❌ Usage: .antispam on/off'); break; }
            getSettings(jid).antispam = val === 'on';
            saveDB('settings', grpSettings);
            await reply(`🛡️ Anti-spam: *${val.toUpperCase()}*\n\n_${config.botName}_`);
            break;
          }

          case 'antibadword': {
            if (await needGroup()) break;
            if (await needAdmin()) break;
            const val = body.toLowerCase();
            if (!['on', 'off'].includes(val)) { await reply('❌ Usage: .antibadword on/off'); break; }
            getSettings(jid).antibadword = val === 'on';
            saveDB('settings', grpSettings);
            await reply(`🤬 Anti-grossièretés: *${val.toUpperCase()}*\n\n_${config.botName}_`);
            break;
          }

          // ── BULK (owner only) ─────────────────────────
          case 'kickall': {
            if (await needGroup()) break;
            if (await needOwner()) break;
            if (await needBotAdmin()) break;
            const targets = (meta?.participants || []).filter(p =>
              !p.admin && !isOwner(p.id) && !areJidsSameUser(p.id, botJid)
            );
            await reply(`⏳ Kick de *${targets.length}* membres en cours...\n\n_${config.botName}_`);
            let done = 0;
            for (const p of targets) {
              try { await sock.groupParticipantsUpdate(jid, [p.id], 'remove'); done++; } catch {}
              await new Promise(r => setTimeout(r, 1500));
            }
            await reply(`✅ *${done}/${targets.length}* membres kickés!\n\n_${config.botName}_`);
            break;
          }

          case 'kickall2': {
            if (await needGroup()) break;
            if (await needOwner()) break;
            if (await needBotAdmin()) break;
            const targets = (meta?.participants || []).filter(p =>
              !isOwner(p.id) && !areJidsSameUser(p.id, botJid)
            );
            await reply(`⏳ Kick de *${targets.length}* membres (admins inclus)...\n\n_${config.botName}_`);
            let done = 0;
            for (const p of targets) {
              try { await sock.groupParticipantsUpdate(jid, [p.id], 'remove'); done++; } catch {}
              await new Promise(r => setTimeout(r, 1500));
            }
            await reply(`✅ *${done}* membres kickés!\n\n_${config.botName}_`);
            break;
          }

          case 'promoteall': {
            if (await needGroup()) break;
            if (await needOwner()) break;
            if (await needBotAdmin()) break;
            const targets = (meta?.participants || []).filter(p =>
              !p.admin && !areJidsSameUser(p.id, botJid)
            );
            await reply(`⏳ Promotion de *${targets.length}* membres...\n\n_${config.botName}_`);
            let done = 0;
            for (const p of targets) {
              try { await sock.groupParticipantsUpdate(jid, [p.id], 'promote'); done++; } catch {}
              await new Promise(r => setTimeout(r, 1000));
            }
            await reply(`✅ *${done}* membres promus admin!\n\n_${config.botName}_`);
            break;
          }

          case 'demoteall': {
            if (await needGroup()) break;
            if (await needOwner()) break;
            if (await needBotAdmin()) break;
            const targets = (meta?.participants || []).filter(p =>
              p.admin && !isOwner(p.id) && !areJidsSameUser(p.id, botJid)
            );
            await reply(`⏳ Rétrogradation de *${targets.length}* admins...\n\n_${config.botName}_`);
            let done = 0;
            for (const p of targets) {
              try { await sock.groupParticipantsUpdate(jid, [p.id], 'demote'); done++; } catch {}
              await new Promise(r => setTimeout(r, 1000));
            }
            await reply(`✅ *${done}* admins rétrogradés!\n\n_${config.botName}_`);
            break;
          }

          case 'broadcast': {
            if (await needOwner()) break;
            if (!body) { await reply('❌ Usage: .broadcast message'); break; }
            let allGroups;
            try { allGroups = await sock.groupFetchAllParticipating(); } catch { allGroups = {}; }
            const gids = Object.keys(allGroups);
            await reply(`⏳ Envoi à *${gids.length}* groupes...\n\n_${config.botName}_`);
            let sent = 0;
            for (const gid of gids) {
              try {
                await sock.sendMessage(gid, {
                  text: `📢 *BROADCAST O-TECH*\n\n${body}\n\n_${config.botName} © O-TECH_`,
                });
                sent++;
              } catch {}
              await new Promise(r => setTimeout(r, 2500));
            }
            await reply(`✅ Broadcast envoyé à *${sent}/${gids.length}* groupes!\n\n_${config.botName}_`);
            break;
          }

          case 'listgroups': {
            if (await needOwner()) break;
            let allGroups;
            try { allGroups = await sock.groupFetchAllParticipating(); } catch { allGroups = {}; }
            const list = Object.values(allGroups);
            if (!list.length) { await reply('📋 Aucun groupe trouvé.\n\n_${config.botName}_'); break; }
            let txt = `📋 *GROUPES (${list.length})*\n\n`;
            list.forEach((g, i) => { txt += `${i + 1}. ${g.subject} (${g.participants.length} mbr)\n`; });
            await reply(txt + `\n_${config.botName}_`);
            break;
          }

          case 'contacts': {
            if (await needGroup()) break;
            if (await needOwner()) break;
            const nums = (meta?.participants || []).map(p => `+${p.id.replace('@s.whatsapp.net', '')}`);
            await reply(`📱 *CONTACTS (${nums.length})*\n\n${nums.join('\n')}\n\n_${config.botName}_`);
            break;
          }

          // ── JEUX ──────────────────────────────────────
          case 'quiz': {
            if (await needGroup()) break;
            if (quizSessions[jid]) { await reply('❌ Un quiz est déjà en cours!'); break; }
            const q = QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)];
            const timeout = setTimeout(async () => {
              if (quizSessions[jid]) {
                delete quizSessions[jid];
                try {
                  await sock.sendMessage(jid, {
                    text: `⏰ Temps écoulé! La réponse était: *${q.a}*\n\n_${config.botName}_`,
                  });
                } catch {}
              }
            }, 30000);
            quizSessions[jid] = { answer: q.a, timeout };
            await reply(`${q.q}\n\n⏱️ Vous avez *30 secondes*!\n\n_${config.botName}_`);
            break;
          }

          case 'devinette': {
            if (await needGroup()) break;
            const d = DEVINETTES[Math.floor(Math.random() * DEVINETTES.length)];
            await reply(`${d.q}\n\n💡 Réponse: ||${d.a}||\n\n_${config.botName}_`);
            break;
          }

          case 'wordchain':
          case 'chainmot': {
            if (await needGroup()) break;
            if (wordChainSessions[jid]) {
              delete wordChainSessions[jid];
              await reply(`🛑 Jeu de chaîne de mots *arrêté*!\n\n_${config.botName}_`);
            } else {
              const starters = ['chat', 'train', 'maison', 'soleil', 'lune', 'fleur', 'arbre'];
              const starter  = starters[Math.floor(Math.random() * starters.length)];
              wordChainSessions[jid] = { lastLetter: starter[starter.length - 1], words: [starter] };
              await reply(`🎮 *CHAÎNE DE MOTS DÉMARRÉE!*\n\n📝 Mot de départ: *${starter}*\n🔠 Prochain mot commence par: *${starter[starter.length - 1].toUpperCase()}*\n\n_Envoie un mot commençant par la bonne lettre!_\n\n_${config.botName}_`);
            }
            break;
          }

          case 'duel': {
            if (await needGroup()) break;
            const opponent = mentioned[0];
            if (!opponent) { await reply('❌ Usage: .duel @adversaire'); break; }
            if (areJidsSameUser(opponent, sender)) { await reply('❌ Tu peux pas te dueler toi-même! 😂'); break; }
            if (duelSessions[jid]) { await reply('❌ Un duel est déjà en cours!'); break; }
            const timeout = setTimeout(() => {
              if (duelSessions[jid]) {
                delete duelSessions[jid];
                sock.sendMessage(jid, { text: `⏰ Le duel a expiré (pas de réponse).\n\n_${config.botName}_` }).catch(() => {});
              }
            }, 30000);
            duelSessions[jid] = { player1: sender, player2: opponent, waitingAccept: true, timeout };
            await sock.sendMessage(jid, {
              text: `⚔️ *DUEL!*\n\n@${senderNum} défie @${opponent.replace('@s.whatsapp.net', '')}!\n\nRéponds *oui* pour accepter dans 30s!\n\n_${config.botName}_`,
              mentions: [sender, opponent],
            });
            break;
          }

          case 'leaderboard':
          case 'lb': {
            if (await needGroup()) break;
            const lb = leaderboard[jid] || {};
            const sorted = Object.entries(lb).sort((a, b) => b[1] - a[1]).slice(0, 10);
            if (!sorted.length) { await reply('📊 Le leaderboard est vide!\n\n_${config.botName}_'); break; }
            const medals = ['🥇', '🥈', '🥉'];
            let txt = `🏆 *LEADERBOARD*\n\n`;
            sorted.forEach(([uid, pts], i) => {
              txt += `${medals[i] || `${i + 1}.`} @${uid.replace('@s.whatsapp.net', '')} — *${pts} pts*\n`;
            });
            await sock.sendMessage(jid, {
              text: txt + `\n_${config.botName} © O-TECH_`,
              mentions: sorted.map(([uid]) => uid),
            });
            break;
          }

          // ── MENUS FUTURS ──────────────────────────────
          case 'ai':
          case 'ia':
            await reply(`🤖 *MENU AI - O-TECH BOT*\n\n_Prochainement:_\n• Chat IA intégré\n• Génération d'images AI\n• Résumé de texte\n• Traduction auto\n\n_${config.botName} © O-TECH_`);
            break;

          case 'music':
          case 'musique':
            await reply(`🎵 *MENU MUSIQUE - O-TECH BOT*\n\n_Prochainement:_\n• Télécharger MP3/MP4\n• Recherche YouTube\n• Paroles de chansons\n• Top charts Haïti\n\n_${config.botName} © O-TECH_`);
            break;

          // ── COMMANDE INCONNUE ─────────────────────────
          default:
            // Silence — pas de réponse pour les commandes inconnues
            break;
        }

      } catch (err) {
        console.error(`[ERREUR CMD]`, err.message);
      }
    }
  });
}

// ── LANCEMENT ────────────────────────────────────────────
startBot().catch(err => {
  console.error('❌ Erreur fatale au démarrage:', err.message);
  setTimeout(startBot, 5000);
});
