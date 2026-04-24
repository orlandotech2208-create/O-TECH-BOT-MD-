<div align="center">

```
 ██████╗       ████████╗███████╗ ██████╗██╗  ██╗    ██████╗  ██████╗ ████████╗
██╔═══██╗      ╚══██╔══╝██╔════╝██╔════╝██║  ██║    ██╔══██╗██╔═══██╗╚══██╔══╝
██║   ██║█████╗   ██║   █████╗  ██║     ███████║    ██████╔╝██║   ██║   ██║   
██║   ██║╚════╝   ██║   ██╔══╝  ██║     ██╔══██║    ██╔══██╗██║   ██║   ██║   
╚██████╔╝         ██║   ███████╗╚██████╗██║  ██║    ██████╔╝╚██████╔╝   ██║   
 ╚═════╝          ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝   ╚═╝   
```

# ⚡ Izatech BOT v6.0 ⚡
### WhatsApp Bot — Powered by Izatech 

![Version](https://img.shields.io/badge/Version-6.0.0-blue?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Termux-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-red?style=flat-square)

</div>

---

## 📱 Installation (Termux)

```bash
# 1. Mettre à jour les packages
pkg update && pkg upgrade -y

# 2. Installer Node.js et Git
pkg install nodejs git -y

# 3. Cloner le bot
git clone https://github.com/orlandotech2208-create/O-TECH-BOT-MD- otech-bot

# 4. Entrer dans le dossier
cd otech-bot

# 5. Installer les dépendances
npm install

# 6. Lancer le bot
node index.js
```

---

## 🔗 Connexion (Pairing Code)

1. Lance `node index.js`
2. Entre ton numéro sans `+` → ex: `50932589664'
3. **WhatsApp va envoyer une notification** → clique dessus
4. OU va manuellement: **Paramètres → Appareils connectés → Connecter un appareil → Connecter avec un numéro**
5. Entre le code affiché dans Termux

---

## 🚀 Lancer en arrière-plan (PM2)

```bash
# Installer PM2
npm install -g pm2

# Lancer le bot en background
pm2 start index.js --name otech-bot

# Sauvegarder pour redémarrage auto
pm2 save
pm2 startup

# Commandes utiles
pm2 logs otech-bot      # Voir les logs
pm2 restart otech-bot   # Redémarrer
pm2 stop otech-bot      # Arrêter
pm2 delete otech-bot    # Supprimer
```

---

## ⚙️ Commandes principales

| Catégorie | Commandes |
|-----------|-----------|
| 📋 Info | `.menu` `.ping` `.botinfo` `.uptime` |
| 🛡️ Modération | `.kick` `.add` `.promote` `.demote` `.warn` `.mute` `.ban` |
| 📢 Groupe | `.tag` `.hidetag` `.setname` `.setdesc` `.rules` `.link` |
| 🔐 Sécurité | `.antilink` `.antispam` `.antibadword` `.antidelete` |
| 📡 Broadcast | `.broadcast` `.annonce` `.contacts` `.listgroups` |
| 💰 Économie | `.daily` `.work` `.solde` `.pari` `.rob` `.transfert` |
| 🎮 Jeux | `.quiz` `.pendu` `.8ball` `.truth` `.dare` `.wyr` `.marry` |
| 🌍 Outils | `.weather` `.translate` `.wiki` `.crypto` `.fact` |
| 👤 Owner | `.selfadmin` `.pair` `.present` `.viewstatus` `.stealpp` |
| 💀 Bug | `.close` `.kill` `.fuck` |

> Tape `.menu` pour voir toutes les commandes

---

## 🔧 Reset session

```bash
rm -rf session_otech && node index.js
```

---

## 📁 Structure

```
otech-bot/
├── index.js          # Code principal du bot
├── package.json      # Dépendances
├── README.md         # Documentation
└── session_otech/    # Session WhatsApp (auto-créé)
```

---

## 👨‍💻 Auteur

**izaTech** — 🇭🇹 Haiti  
🌐 [Izatech.ht](https://izatech.ht)  
📱 WhatsApp: [wa.me/50932589664](https://wa.me/50932589664)  

---

<div align="center">
⚡ <i>Innovation Constante — Izatech 2026</i> ⚡
</div>
