import config from '../config.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');

export default {
    name: 'welcome',
    description: 'Gère le message de bienvenue dans le groupe',
    adminOnly: false,
    category: 'group',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const prefix = config.config.prefix;
        if (!isGroup) {
            return await sock.sendMessage(sender, { text: '❌ Cette commande fonctionne uniquement dans les groupes' });
        }
        const groupId = sender;
        const action = args[0]?.toLowerCase();
        if (!action || (action !== 'on' && action !== 'off' && action !== 'test')) {
            const settings = config.getSettings(groupId);
            const status = settings.welcome ? '✅ Activé' : '❌ Désactivé';
            return await sock.sendMessage(sender, {
                text: `╭━━━ *WELCOME* ━━━\n┃\n┃ 📌 *Statut:* ${status}\n┃\n┃ 📖 *Commandes:*\n┃ ${prefix}welcome on   → Activer\n┃ ${prefix}welcome off  → Désactiver\n┃ ${prefix}welcome test → Aperçu\n┃\n╰━━━━━━━━━━━━━━━\n> ${config.config.botName}`
            });
        }
        if (action === 'on') {
            config.updateGroupSetting(groupId, 'welcome', true);
            await sock.sendMessage(sender, { text: `✅ *Message de bienvenue activé*` });
        } else if (action === 'off') {
            config.updateGroupSetting(groupId, 'welcome', false);
            await sock.sendMessage(sender, { text: `❌ *Message de bienvenue désactivé*` });
        } else if (action === 'test') {
            const groupMetadata = await sock.groupMetadata(groupId);
            await sendWelcomeMsg(sock, groupId, sock.user.id, groupMetadata);
        }
    },

    sendWelcome: async (sock, groupId, newMemberJid) => {
        const settings = config.getSettings(groupId);
        if (!settings.welcome) return;
        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            await sendWelcomeMsg(sock, groupId, newMemberJid, groupMetadata);
            console.log(chalk.green(`✓ Welcome envoyé à ${newMemberJid.split('@')[0]}`));
        } catch (error) {
            console.error('Welcome error:', error);
        }
    }
};

async function sendWelcomeMsg(sock, groupId, memberJid, groupMetadata) {
    const botName = config.config.botName;
    const memberCount = groupMetadata.participants.length;
    const groupDesc = groupMetadata.desc || 'Aucune description';
    const groupName = groupMetadata.subject;
    const memberNumber = memberJid.split('@')[0];
    const prefix = config.config.prefix;

    const welcomeText = `╭━━━ *BIENVENUE* ━━━\n┃\n┃ 👋 *Bienvenue @${memberNumber} !*\n┃\n┃ 📌 *Groupe:* ${groupName}\n┃ 👥 *Membres:* ${memberCount}\n┃ 📝 *Description:*\n┃ ${groupDesc.substring(0, 60)}${groupDesc.length > 60 ? '...' : ''}\n┃\n┃ 🤖 *${botName}* est à ton service\n┃ 📖 Tape ${prefix}menu pour les commandes\n┃\n┃ 👤 *Créé par Orlando*\n┃\n╰━━━━━━━━━━━━━━━`;

    const imagePath = path.join(mediaDir, 'welcome.jpg');
    if (fs.existsSync(imagePath)) {
        await sock.sendMessage(groupId, {
            image: { url: imagePath },
            caption: welcomeText,
            mentions: [memberJid]
        });
    } else {
        await sock.sendMessage(groupId, { text: welcomeText, mentions: [memberJid] });
    }
}
