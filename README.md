# 🤖 O-Tech Bot — WhatsApp Bot par Orlando

Bot WhatsApp multifonction basé sur Baileys.

---

## 📋 Prérequis

- Android ou Linux (Termux recommandé)
- Node.js 18+
- npm

---

## 📱 Installation sur Termux

### Étape 1 — Installer Termux
Télécharge **Termux** depuis F-Droid (pas le Play Store) :
👉 https://f-droid.org/packages/com.termux/

### Étape 2 — Mettre à jour les paquets
```bash
pkg update && pkg upgrade -y
```

### Étape 3 — Installer Node.js et Git
```bash
pkg install nodejs git ffmpeg -y
```

### Étape 4 — Transférer le bot
Copie le dossier `o-tech-bot` dans Termux via :
- USB : utilise `cp` depuis `/sdcard`
- ADB : `adb push o-tech-bot /data/data/com.termux/files/home/`
- Ou directement depuis l'app Fichiers Android

Exemple si tu as le ZIP dans le stockage interne :
```bash
cp /sdcard/Download/o-tech-bot.zip ~/
cd ~
unzip o-tech-bot.zip
cd o-tech-bot
```

### Étape 5 — Installer les dépendances
```bash
npm install
```

### Étape 6 — Lancer le bot
```bash
npm start
```

### Étape 7 — Connecter WhatsApp
Le bot te demande ton numéro au format international **sans le +** :
```
243XXXXXXXXX
```
Ensuite :
1. Ouvre WhatsApp sur ton téléphone
2. Va dans **Paramètres > Appareils connectés**
3. Appuie sur **Connecter un appareil**
4. Entre le code affiché dans Termux

---

## 🔄 Relancer le bot après fermeture de Termux

```bash
cd ~/o-tech-bot
npm start
```

### (Optionnel) Garder le bot actif en arrière-plan avec PM2

```bash
npm install -g pm2
pm2 start index.js --name o-tech-bot
pm2 save
pm2 startup
```

Pour voir les logs :
```bash
pm2 logs o-tech-bot
```

Pour arrêter :
```bash
pm2 stop o-tech-bot
```

---

## 🗂️ Structure du projet

```
o-tech-bot/
├── index.js          ← Point d'entrée principal
├── config.js         ← Gestionnaire de configuration
├── package.json      ← Dépendances npm
├── config.json       ← Créé automatiquement au 1er lancement
├── sessionData/      ← Session WhatsApp (créé automatiquement)
├── media/
│   ├── menu.jpg      ← Image affichée avec !menu
│   ├── welcome.jpg   ← Image affichée quand quelqu'un rejoint
│   └── notfound.jpg  ← Image pour commande inconnue
└── commands/         ← Toutes les commandes du bot
    ├── menu.js
    ├── ping.js
    ├── ai.js
    └── ...
```

---

## ⚙️ Configuration

Edite `config.json` après le premier démarrage pour changer :
- `ownerNumber` : ton numéro sans + (ex: `243833389567`)
- `ownerJid` : même numéro avec `@s.whatsapp.net`
- `prefix` : le préfixe des commandes (par défaut `!`)
- `mode` : `"public"` ou `"private"`

---

## 📜 Commandes principales

| Commande | Description |
|---|---|
| `!menu` | Affiche le menu complet |
| `!ping` | Teste la latence |
| `!ai [question]` | Pose une question à l'IA |
| `!sticker` | Crée un sticker depuis une image/vidéo |
| `!url` | Génère un lien Catbox pour un média |
| `!vv` | Dévoile un média vue unique |
| `!welcome on/off` | Active le message de bienvenue en groupe |
| `!antilink on/off` | Active l'anti-lien en groupe |
| `!kick @user` | Expulse un membre (admin) |
| `!promote @user` | Nomme un admin (admin) |
| `!mode public/privé` | Change le mode du bot (owner) |
| `!restart` | Redémarre le bot (owner) |

---

## ⚠️ Remarque importante

Ne partage jamais le dossier `sessionData/` — il contient ta session WhatsApp.

---

**o-tech bot** — Créé par **Orlando** 🤖
