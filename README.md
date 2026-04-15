# 🤖 O-TECH BOT v4.1
**by Orlando Tech 🇭🇹 — otech.ht**

Bot WhatsApp multi-fonctions basé sur Baileys (ESM).  
Fichier unique — compatible Termux Android.

---

## 📦 INSTALLATION RAPIDE (Termux)

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
git clone https://github.com/orlandotech2208-create/O-TECH-BOT-MD- otech-bot
cd otech-bot
npm install
node index.js
```

Rentre ton numéro quand demandé → va dans WhatsApp → Appareils connectés → entre le code.

---

## ⚙️ CONFIG

Ouvre `index.js` et modifie le bloc `CONFIG` :

| Paramètre     | Description                        |
|---------------|------------------------------------|
| `ownerNumber` | Ton numéro sans + (ex: 50935443504)|
| `prefix`      | Préfixe des commandes (défaut: `.`)|
| `mode`        | `both` / `group` / `private`       |
| `sessionName` | Dossier de session Baileys         |

---

## 📋 COMMANDES

### 📋 INFO
| Commande | Description |
|----------|-------------|
| `.menu` | Affiche le menu complet |
| `.ping` | Test la vitesse du bot |
| `.botinfo` | Infos du bot (RAM, uptime...) |
| `.uptime` | Durée de fonctionnement |
| `.owner` | Contact de l'owner |

### 🛠 MODÉRATION (groupe, admin/owner)
| Commande | Description |
|----------|-------------|
| `.kick @user` | Expulse un membre |
| `.add 509XXXXXXXX` | Ajoute un membre par numéro |
| `.promote @user` | Promu admin |
| `.demote @user` | Retire admin |
| `.mute` | Ferme le groupe (admins only) |
| `.unmute` | Ouvre le groupe |
| `.warn @user` | Avertit (3 warns = kick auto) |
| `.resetwarn @user` | Remet warns à 0 pour un user |
| `.clearwarn` | Supprime TOUS les warns du groupe |
| `.delete` | Supprime un message (réponds dessus) |
| `.tag [message]` | Mentionne tous les membres |
| `.tagadmin [message]` | Mentionne tous les admins |
| `.admins` | Liste les admins |
| `.groupinfo` | Infos du groupe |
| `.link` | Lien d'invitation |
| `.revoke` | Révoque le lien |
| `.kickall` | Expulse tous les NON-admins |
| `.kickall2` | Expulse TOUT le monde (sauf owner/bot) |
| `.promoteall` | Promeut tous les membres admins |
| `.demoteall` | Rétrograde tous les admins |
| `.bye` | Le bot quitte le groupe |
| `.join [lien]` | Le bot rejoint un groupe |

### 📢 BROADCAST & CONTACTS (owner seulement)
| Commande | Description |
|----------|-------------|
| `.broadcast message` | Envoie un DM à TOUS les membres du groupe |
| `.contacts` | Exporte la liste des membres en fichier .txt |
| `.listgroups` | Liste tous les groupes du bot → envoyé en DM |

### 🛡 SÉCURITÉ
| Commande | Description |
|----------|-------------|
| `.antilink on/off` | Active/désactive anti-lien |
| `.antispam on/off` | Active/désactive anti-spam |
| `.antibadword on/off` | Active/désactive anti-grossièretés |
| `.block @user` | Bloque sur WhatsApp |
| `.unblock @user` | Débloque |
| `.ban @user` | Bannit du bot |
| `.unban @user` | Dé-bannit du bot |

### 💰 ÉCONOMIE
| Commande | Description |
|----------|-------------|
| `.daily` | Récompense quotidienne (100-300 coins) |
| `.work` | Travaille toutes les heures |
| `.solde [@user]` | Voir son solde/niveau/XP |
| `.pari [montant]` | Pari pile ou face |
| `.rob @user` | Tente de voler un membre |
| `.transfert @user montant` | Envoyer des coins |
| `.richesse` | Top 10 les plus riches |

### 🎮 JEUX
| Commande | Description |
|----------|-------------|
| `.quiz` | Question aléatoire (30s) |
| `.pendu` | Jeu du pendu |
| `.lettre X` | Proposer une lettre au pendu |
| `.devinette` | Devinette (45s) |
| `.8ball question` | Magic 8-Ball |
| `.rps pierre/feuille/ciseaux` | Pierre-Feuille-Ciseaux |
| `.pile` | Pile ou face |
| `.de [faces]` | Lancer un dé |
| `.compteur [1-10]` | Compte à rebours |
| `.ship @user1 @user2` | Compatibilité amoureuse |
| `.hug @user` | Faire un câlin |
| `.slap @user` | Gifler quelqu'un |
| `.fight @user` | Combattre quelqu'un |

### 📊 STATS
| Commande | Description |
|----------|-------------|
| `.top` | Top 10 membres les plus actifs |
| `.stats` | Stats du groupe |
| `.monscore` | Ton score personnel |

### 📲 MÉDIAS
| Commande | Description |
|----------|-------------|
| `.vv` | Révèle un message view once |
| `.send` | Renvoie un média/statut |
| `.pp [@user]` | Photo de profil |
| `.meme` | Meme aléatoire |
| `.img mot` | Image via Unsplash |
| `.tiktok [lien]` | Lien TikTok downloader |
| `.url [lien]` | Envoie un lien |
| `.sticker` | Convertit en sticker (nécessite sharp) |

### 💬 FAKE CHAT
| Commande | Description |
|----------|-------------|
| `.chat @user message` | Message en citation de quelqu'un |
| `.fchat @user message` | Message transféré fictif |
| `.typechat @user message` | Typing effect puis envoie |

### ⚙️ UTILS
| Commande | Description |
|----------|-------------|
| `.fancy texte` | Texte en gras stylisé |
| `.tts texte` | Texte en majuscules |
| `.calc expression` | Calculatrice |
| `.blague` | Blague aléatoire |
| `.quote` | Citation motivante |
| `.conseil` | Conseil en créole/français |
| `.profil [@user]` | Profil + photo |
| `.setpp` | Change photo de profil (réponds à une image) |
| `.setprefix !` | Change le préfixe |
| `.public` | Bascule mode public/privé |
| `.sudo @user` | Donne droits sudo |
| `.addprem @user` | Ajoute un membre premium |

### 🐞 BUG (owner seulement)
| Commande | Description |
|----------|-------------|
| `.close [@user]` | Freeze la cible |
| `.kill [@user]` | Spam invisible |
| `.fuck [@user]` | Spam de caractères |

---

## 🔧 BUGS CORRIGES (v4.0 → v4.1)

| Bug | Fix |
|-----|-----|
| `package.json` pointait vers `index.mjs` au lieu de `index.js` | Corrigé dans `package.json` |
| `CONFIG.sudoUsers` non défini → crash dans `isSudo()` | Maintenant initialisé à `[]` dans CONFIG |
| Import `areJidsSameUser` inutilisé | Supprimé |
| `.kickall` pouvait expulser le bot lui-même | Bot exclu avec `shortNum(botJid)` |
| `.kickall2` pareil | Bot exclu aussi |
| Commande `.dé` avec accent posait problème | Renommée `.de` |
| Anti-kick ne prévenait pas l'owner | Alerte DM envoyée automatiquement |

---

## 📁 FICHIERS

```
otech-bot/
├── index.js          ← Bot complet (fichier unique)
├── package.json      ← Dépendances
├── README.md         ← Ce fichier
├── anon.jpg          ← Photo de profil du bot (optionnel)
└── session_otech/    ← Créé automatiquement après connexion
```

---

## ⚠️ NOTES IMPORTANTES

- **`.broadcast`** envoie en DM à chaque membre — utilise un délai de 1.5s entre chaque envoi pour éviter le ban WhatsApp.
- **`.contacts`** crée un fichier `.txt` temporaire puis l'envoie comme document et le supprime.
- **`.listgroups`** envoie la liste en DM à l'owner (pas dans le groupe).
- L'image `anon.jpg` est optionnelle — si absente, le bot fonctionne quand même.
- Supprime `session_otech/` si tu changes de compte.

---

**O-TECH © 2025 — Innovation constante 🚀**
