# 🤖 N8N Workflow-Kollektion — AI Orchestra

Dieses Verzeichnis enthält alle n8n-Automatisierungen, die als **Arme des AI Orchestra Brains** fungieren.

---

## 📋 Workflows

| # | Workflow | Datei | Richtung | Trigger | Status |
|---|----------|-------|----------|---------|--------|
| 1 | 📧 E-Mail Klassifizierer | `email-classifier-workflow.json` | Eingehend | Gmail Trigger | ✅ Bereit |
| 2 | 🐦 Twitter/X Listener | `twitter-listener.json` | Eingehend | Polling alle 5 Min | ✅ Bereit |
| 3 | 📸 Instagram Listener | `instagram-listener.json` | Eingehend | Meta Webhook (Echtzeit) | ✅ Bereit |
| 4 | ▶️ YouTube Listener | `youtube-listener.json` | Eingehend | Polling alle 15 Min | ✅ Bereit |
| 5 | 🎵 TikTok Listener | `tiktok-listener.json` | Eingehend | Polling alle 30 Min | ✅ Bereit |
| 6 | 📢 Social Media Publisher | `social-media-publisher.json` | Ausgehend | Webhook (AI Brain → n8n) | ✅ Bereit |
| 7 | 📧 E-Mail Kampagnen-Sender | `email-campaign-sender.json` | Ausgehend | Webhook (AI Brain → n8n) | ✅ Bereit |

---

## 🏗️ Gesamtarchitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     EINGEHENDE KANÄLE                           │
│                                                                 │
│  Gmail ──────────────────────────────┐                          │
│  Twitter/X (polling 5 min) ──────────┤                          │
│  Instagram (Meta Webhook Echtzeit) ──┤──► N8N ──► POST          │
│  YouTube (polling 15 min) ───────────┤         /api/inbox       │
│  TikTok (polling 30 min) ────────────┘                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   AI Brain          │
              │   Node.js + LangGraph│
              │   /api/inbox        │
              │                     │
              │ Klassifizierung:     │
              │ → SUPPORT_BUG       │
              │ → SUPPORT_PRICING   │
              │ → HOT_LEAD          │
              │ → OTHER (ignoriert) │
              └─────────┬───────────┘
                        │
              ┌─────────▼───────────┐
              │ HITL Gate           │
              │ (Dashboard-Freigabe)│
              └─────────┬───────────┘
                        │ Genehmigt
┌───────────────────────▼──────────────────────────────────────────┐
│                     AUSGEHENDE KANÄLE                            │
│                                                                  │
│  N8N Publisher Webhook ──► Twitter/X (direkt)                    │
│                        ──► LinkedIn (direkt)                     │
│                        ──► Instagram (2-Schritt API)             │
│                        ──► TikTok (manuell, kein Text-API)       │
│                        ──► YouTube (manuell, Community API)      │
│                                                                  │
│  E-Mail-Kampagnen-Webhook ──► SMTP → Empfänger-Batches (50/Los) │
└──────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ N8N Environment Variables

Alle Variablen unter **N8N Settings → Variables** anlegen:

```env
# AI Brain (Pflicht für alle Workflows)
AI_BRAIN_URL=http://localhost:3000
AI_BRAIN_API_KEY=<Mandanten-API-Key>
N8N_WEBHOOK_SECRET=<Geheimnis aus server/.env>

# Telegram (Benachrichtigungen)
TELEGRAM_BOT_TOKEN=<Bot-Token>
TELEGRAM_CHAT_ID=<Chat-ID>

# Twitter/X
TWITTER_BEARER_TOKEN=<Bearer-Token aus Developer Portal>
TWITTER_HANDLE=<dein_handle_ohne_@>

# Instagram (Meta)
INSTAGRAM_ACCESS_TOKEN=<Long-Lived Token>
INSTAGRAM_PAGE_ID=<Business Account ID>
INSTAGRAM_VERIFY_TOKEN=<Eigener Verify-String für Webhook-Handshake>
INSTAGRAM_DEFAULT_IMAGE_URL=<Fallback Bild-URL für Posts>

# YouTube
YOUTUBE_API_KEY=<API Key aus Google Cloud Console>
YOUTUBE_CHANNEL_ID=<UCxxx...>

# TikTok
TIKTOK_ACCESS_TOKEN=<OAuth Access Token>

# E-Mail
EMAIL_FROM_NAME=<Absendername>
EMAIL_FROM_ADDR=<absender@domain.de>
# SMTP über N8N Credentials (nicht als Variable): smtp_credentials
```

---

## 🔐 N8N Credentials (Credential-Objekte)

| Credential-Name | Typ | Workflow |
|-----------------|-----|---------|
| `gmail_oauth` | Gmail OAuth2 | email-classifier |
| `twitter_oauth2` | Twitter OAuth2 API | social-media-publisher |
| `linkedin_oauth2` | LinkedIn OAuth2 API | social-media-publisher |
| `smtp_credentials` | SMTP | email-campaign-sender |

---

## 📡 Webhook-URLs (in N8N generiert)

| Workflow | Webhook-Pfad | Wo eintragen |
|----------|-------------|--------------|
| Instagram Listener | `/webhook/instagram-webhook` | Meta Developer → Instagram → Webhooks |
| Social Media Publisher | `/webhook/publish` | `server/.env` → `N8N_PUBLISH_WEBHOOK` |
| E-Mail Kampagnen-Sender | `/webhook/email-campaign` | Optional direkt aufrufbar |

---

## 🚀 Einrichtungsreihenfolge

1. **N8N starten** → `docker run -it --rm -p 5678:5678 n8nio/n8n`
2. **ENV-Variablen** in N8N Settings anlegen (siehe oben)
3. **Credentials** anlegen: Gmail OAuth, Twitter OAuth2, LinkedIn OAuth2, SMTP
4. **Alle 7 JSON-Dateien importieren**: N8N → Workflows → Import from file
5. **Instagram Webhook-URL** in Meta Developer Console eintragen
6. **`N8N_PUBLISH_WEBHOOK`** in `server/.env` auf die Publisher-Webhook-URL setzen
7. **Workflows aktivieren** (Toggle oben rechts in N8N)
8. **Test**: Gmail-Test-Mail senden, Twitter-Mention posten

---

## 📝 Payload-Format für /api/inbox

Alle Listener senden an `POST AI_BRAIN_URL/api/inbox`:

```json
{
  "platform":     "gmail|twitter|instagram|youtube|tiktok",
  "platform_id":  "eindeutige ID (Idempotenz)",
  "author":       "@username oder Name",
  "author_email": "email@domain.de",
  "subject":      "Betreff oder Kontext",
  "content":      "Nachrichteninhalt (max. 3000 Zeichen)"
}
```

Antwort-Statuses: `AWAITING_HUMAN_APPROVAL_SUPPORT` | `PROCESSING` | `DUPLICATE` | `NOTED` | `IGNORED`

---

## ⚠️ Plattform-Einschränkungen

| Plattform | Einschränkung |
|-----------|--------------|
| TikTok | Kein Text-only Post API. Videoposts erfordern Upload-Endpoint + Video-Datei. |
| YouTube | Community Posts erfordern separaten Scope. Kommentar-Replies funktionieren via Data API v3. |
| Twitter/X | API v2 Free Tier: 1.500 Tweets/Monat schreiben, 10.000 lesen/Monat. |
| Instagram | Text-Posts benötigen entweder ein Bild/Video oder Carousel. Reine Text-Posts nicht möglich. |
