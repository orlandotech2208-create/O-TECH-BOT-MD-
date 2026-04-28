import config from '../config.js';

// Persist startTime across hot-reloads
if (!process.env.BOT_START_TIME) process.env.BOT_START_TIME = Date.now().toString();
const startTime = parseInt(process.env.BOT_START_TIME);

export default {
    name: 'uptime',
    description: "Affiche le temps d'activité du bot",
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender) => {
        const uptime = Date.now() - startTime;
        const seconds = Math.floor((uptime / 1000) % 60);
        const minutes = Math.floor((uptime / (1000 * 60)) % 60);
        const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        let uptimeStr = '';
        if (days > 0) uptimeStr += `${days}j `;
        if (hours > 0) uptimeStr += `${hours}h `;
        if (minutes > 0) uptimeStr += `${minutes}m `;
        uptimeStr += `${seconds}s`;
        const statusEmoji = uptime < 3600000 ? '🟢' : uptime < 86400000 ? '🟡' : '🔴';
        await sock.sendMessage(sender, {
            text: `╭━━━ *UPTIME* ━━━\n┃\n┃ ${statusEmoji} *Actif depuis:*\n┃ ${uptimeStr}\n┃\n┃ 📅 *Démarrage:*\n┃ ${new Date(startTime).toLocaleString('fr-FR')}\n┃\n┃ 👤 *Créé par Orlando*\n┃\n╰━━━━━━━━━━━━━━━\n\n> ${config.config.botName}`
        });
    }
};
