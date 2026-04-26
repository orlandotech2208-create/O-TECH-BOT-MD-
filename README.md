<!-- O-TECH BOT README -->

<div align="center">

```
 ██████╗       ████████╗███████╗ ██████╗██╗  ██╗
██╔═══██╗      ╚══██╔══╝██╔════╝██╔════╝██║  ██║
██║   ██║ ████╗   ██║   █████╗  ██║     ███████║
██║   ██║      ╝  ██║   ██╔══╝  ██║     ██╔══██║
╚██████╔╝         ██║   ███████╗╚██████╗██║  ██║
 ╚═════╝          ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝
```

# ⚡ O-TECH BOT v2.0 ⚡

### WhatsApp Bot — Powered by **Orlando Tech**

![Version](https://img.shields.io/badge/Version-2.0.0-00ff99?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Termux-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)
![Baileys](https://img.shields.io/badge/Baileys-6.7.9-blue?style=for-the-badge)

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
2. Entre ton numéro sans `+` → ex: `50935443504`
3. **WhatsApp va envoyer une notification** → clique dessus
4. OU va manuellement: **Paramètres → Appareils connectés → Connecter un appareil → Connecter avec un numéro**
5. Entre le code affiché dans Termux

---

## 🚀 Lancer en arrière-plan (PM2)

```bash
# Installer PM2
npm install -g pm2

# Démarrer le bot
pm2 start index.js --name otech-bot

# Voir les logs
pm2 logs otech-bot

# Redémarrer
pm2 restart otech-bot

# Sauvegarder pour auto-démarrage
pm2 save
```

---

## 🔄 Reset session

```bash
rm -rf session_otech && node index.js
```

---

## 📋 Toutes les Commandes

> **Préfixe:** `.`

---

### ℹ️ Commandes Info

| Commande | Description |
|----------|-------------|
| `.menu` | Afficher le menu complet |
| `.help` | Alias de .menu |
| `.ping` | Vérifier si le bot est actif + latence |
| `.owner` | Infos sur le propriétaire du bot |
| `.info` | Informations du groupe actuel |

---

### 🛡️ Modération

| Commande | Description | Requis |
|----------|-------------|--------|
| `.kick @user` | Kicker un membre du groupe | Admin |
| `.add numéro` | Ajouter un membre (ex: `.add 50912345678`) | Admin |
| `.promote @user` | Promouvoir un membre en admin | Admin |
| `.demote @user` | Rétrograder un admin | Admin |
| `.mute @user` | Empêcher un membre d'utiliser le bot | Admin |
| `.unmute @user` | Rétablir les droits d'un membre | Admin |
| `.warn @user` | Avertir un membre (3 warns = kick auto) | Admin |
| `.clearwarn @user` | Effacer les avertissements | Admin |
| `.warns @user` | Voir le nombre d'avertissements | Admin |
| `.delete` | Supprimer un message (reply) | Admin |

---

### 👥 Gestion du Groupe

| Commande | Description | Requis |
|----------|-------------|--------|
| `.open` | Ouvrir le groupe (tout le monde peut écrire) | Admin |
| `.close` | Fermer le groupe (admins seulement) | Admin |
| `.groupname nom` | Changer le nom du groupe | Admin |
| `.groupdesc description` | Changer la description | Admin |
| `.tag texte @user` | Mentionner des membres avec message | Admin |
| `.tagall texte` | Mentionner TOUS les membres | Admin |

---

### 🔒 Sécurité Automatique

| Commande | Description | Requis |
|----------|-------------|--------|
| `.antilink on/off` | Bloquer les liens dans le groupe | Admin |
| `.antispam on/off` | Bloquer le spam (>5 msgs en 5s) | Admin |
| `.antibadword on/off` | Bloquer les grossièretés | Admin |

---

### ⚡ Commandes Bulk (Owner uniquement)

| Commande | Description |
|----------|-------------|
| `.kickall` | Kicker tous les membres non-admins |
| `.kickall2` | Kicker absolument tout le monde (admins inclus) |
| `.promoteall` | Promouvoir tous les membres en admin |
| `.demoteall` | Rétrograder tous les admins |
| `.broadcast message` | Envoyer un message à tous les groupes |
| `.listgroups` | Lister tous les groupes du bot |
| `.contacts` | Exporter tous les numéros du groupe |

---

### 🎮 Jeux & Divertissement

| Commande | Description |
|----------|-------------|
| `.quiz` | Lancer un quiz (30 secondes pour répondre) |
| `.devinette` | Poser une devinette |
| `.wordchain` | Démarrer/arrêter le jeu de chaîne de mots |
| `.duel @user` | Défier un membre en duel (l'adversaire doit répondre "oui") |
| `.leaderboard` / `.lb` | Afficher le classement des points |

---

### 🤖 Menus Futurs

| Commande | Description |
|----------|-------------|
| `.ai` / `.ia` | Menu Intelligence Artificielle *(prochainement)* |
| `.music` / `.musique` | Menu Téléchargement Musique *(prochainement)* |

---

## ✨ Fonctionnalités Automatiques

- 🎉 **Message de bienvenue** automatique avec nom, numéro et compteur de membres
- 👋 **Message d'au revoir** pour les membres qui quittent
- 🛡️ **Protection anti-kick owner** — le bot alerte avec humour si quelqu'un tente de kicker l'owner
- 😄 **Réaction emoji** automatique sur les messages (aléatoire)
- ⚠️ **Système de warns** avec kick automatique à 3 avertissements
- 💾 **Persistance des données** — warns, mutes et settings sauvegardés sur disque

---

## ⚙️ Configuration

```js
// Dans index.js, modifie ces valeurs:
const config = {
  ownerName:   '𝐌𝐫. 𝐎𝐫𝐥𝐚𝐧𝐝𝐎 Tech',
  ownerNumber: ['50935443504'],     // Ton numéro sans +
  botName:     'O-TECH BOT',
  prefix:      '.',                  // Préfixe des commandes
  maxWarns:    3,                    // Warnings avant kick auto
};
```

---

## 🏗️ Structure du projet

```
otech-bot/
├── index.js          # Fichier principal du bot
├── package.json      # Dépendances Node.js
├── session_otech/    # Session WhatsApp (auto-générée)
└── data/
    ├── warns.json    # Avertissements des membres
    ├── mutes.json    # Membres mutés
    ├── settings.json # Paramètres des groupes
    └── leaderboard.json # Classement des jeux
```

---

## 📦 Dépendances

| Package | Version | Rôle |
|---------|---------|------|
| `@whiskeysockets/baileys` | ^6.7.9 | Bibliothèque WhatsApp |
| `@hapi/boom` | ^10.0.1 | Gestion des erreurs |
| `pino` | ^8.21.0 | Logger silencieux |

---

## 👑 Auteur

<div align="center">

**𝐌𝐫. 𝐎𝐫𝐥𝐚𝐧𝐝𝐎 Tech**

[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/50935443504)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:orlandotech2208@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/orlandotech2208-create)

**🌐 O-TECH Brand | Haiti 🇭🇹**

*Digital Agency • Online Shop • Academy • Bots & Apps*

</div>

---

<div align="center">

⭐ **Donne une étoile si le bot t'a aidé!** ⭐

*O-TECH BOT © 2025 — Tous droits réservés*

</div>
