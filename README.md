# 🤖 O-TECH BOT MD

<div align="center">

![O-TECH BOT](https://img.shields.io/badge/O--TECH-BOT-blue?style=for-the-badge&logo=whatsapp)
![Node.js](https://img.shields.io/badge/Node.js-v24+-green?style=for-the-badge&logo=node.js)
![Baileys](https://img.shields.io/badge/Baileys-Latest-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)

**Bot WhatsApp premium créé par Orlando Tech 🇭🇹**

</div>

---

## ✨ Fonctionnalités

- 🛠 **Modération** — kick, promote, demote, warn, mute, tag
- 💰 **Économie** — coins, daily, work, pari, rob, transfert
- 🎮 **Jeux** — quiz, pendu, devinette, rps, 8ball
- 📊 **Stats** — top membres, leaderboard, scores
- 🖼️ **Médias** — vv, send, sticker, pp, meme
- 💬 **Fake Chat** — chat, fchat, typechat
- 🛡️ **Sécurité** — antilink, antispam, antibadword, anti-quick
- 🤖 **IA** — réponses intelligentes via Claude
- 🎵 **Musique** — recherche YouTube
- 👋 **Welcome/Bye** — avec photo de profil automatique

---

## ⚙️ Installation

### Prérequis
- Termux (Android)
- Node.js v24+
- Compte WhatsApp actif

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/orlandotech2208-create/O-TECH-BOT-MD- otech-bot
cd otech-bot

# 2. Installer les dépendances
npm install

# 3. Copier l'image du bot
cp /storage/emulated/0/Download/anon.jpg ./anon.jpg

# 4. Lancer
node index.js
```

---

## 📋 Commandes

### 📋 Info
| Commande | Description |
|----------|-------------|
| `.menu` | Afficher le menu |
| `.ping` | Tester la connexion |
| `.botinfo` | Infos du bot |
| `.uptime` | Temps en ligne |
| `.owner` | Contact owner |

### 🛠 Modération
| Commande | Description |
|----------|-------------|
| `.kick @user` | Expulser un membre |
| `.promote @user` | Rendre admin |
| `.demote @user` | Retirer admin |
| `.mute` | Fermer le groupe |
| `.unmute` | Ouvrir le groupe |
| `.warn @user` | Avertir (3 = kick) |
| `.tag [msg]` | Mentionner tout le monde |
| `.tagadmin` | Mentionner les admins |
| `.kickall` | Expulser tous les membres |
| `.promoteall` | Promouvoir tout le monde |
| `.link` | Lien du groupe |
| `.bye` | Bot quitte le groupe |

### 💰 Économie
| Commande | Description |
|----------|-------------|
| `.daily` | Reward quotidien |
| `.work` | Travailler (1h cooldown) |
| `.solde` | Voir ses coins |
| `.pari [montant]` | Parier |
| `.rob @user` | Voler des coins |
| `.transfert @user [montant]` | Envoyer des coins |
| `.richesse` | Top 10 des plus riches |

### 🎮 Jeux
| Commande | Description |
|----------|-------------|
| `.quiz` | Quiz aléatoire |
| `.pendu` | Jeu du pendu |
| `.devinette` | Devinette |
| `.8ball [question]` | Boule magique |
| `.rps pierre/feuille/ciseaux` | Pierre Feuille Ciseaux |
| `.ship @user1 @user2` | Compatibilité amoureuse |
| `.fight @user` | Combat |

### 📲 Médias
| Commande | Description |
|----------|-------------|
| `.vv` | Voir un message view once |
| `.send` | Enregistrer un statut |
| `.pp @user` | Photo de profil |
| `.meme` | Meme aléatoire |
| `.img [mot]` | Chercher une image |

### 💬 Fake Chat
| Commande | Description |
|----------|-------------|
| `.chat @user message` | Fake message |
| `.fchat @user message` | Message transféré |
| `.typechat @user message` | Simule typing |

### 🛡️ Sécurité
| Commande | Description |
|----------|-------------|
| `.antilink on/off` | Anti-lien |
| `.antispam on/off` | Anti-spam |
| `.antibadword on/off` | Anti-mauvais mots |
| `.block @user` | Bloquer |
| `.unblock @user` | Débloquer |

### 👑 Owner
| Commande | Description |
|----------|-------------|
| `.sudo @user` | Ajouter sudo |
| `.addprem @user` | Ajouter premium |
| `.setpp` | Changer photo profil |
| `.setprefix [prefix]` | Changer le préfixe |
| `.ban @user` | Bannir du bot |
| `.broadcast [msg]` | Message à tous |

---

## 🔧 Configuration

Dans `index.js`, modifie le bloc `CONFIG` :

```js
const CONFIG = {
    botName: "O-TECH BOT",
    owner: "Orlando Tech",
    ownerNumber: "50935443504", // Ton numéro
    prefix: ".",                // Préfixe des commandes
    sessionName: "session_otech",
    mode: "both",               // "group" | "private" | "both"
};
```

---

## 🚫 Anti-Quick

Pour bloquer des numéros spécifiques, ajoute-les dans :

```js
const QUICK_NUMBERS = [
    "509XXXXXXXX", // Numéro à bloquer
];
```

---

## 📞 Contact

- **WhatsApp** : +509 3544 3504
- **Email** : orlandotech2208@gmail.com
- **Brand** : O-TECH

---

<div align="center">

**O-TECH © 2026 — Innovation constante 🚀**

*Made with ❤️ in Haïti 🇭🇹*

</div>
