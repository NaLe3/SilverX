objectif & choix techniques

On construit un MVP d’agent conversationnel au téléphone capable de comprendre, parler et agir (tools CRM/RAG) avec une latence perçue ≤ 600 ms et barge-in fluide.
Architecture monorepo avec deux apps :

Rails (full-stack) : cerveau métier (DB Postgres, Sidekiq/Redis, endpoints tools, webhooks telco), console admin (Hotwire/Tailwind), RGPD (consentement, TTL, export/suppression).

Node Bridge : temps réel audio (WebSocket Media Streams), VAD/barge-in, resampling PCM16 ↔ μ-law 8 kHz, backpressure.

Téléphonie : Twilio ou Vonage (Media Streams).
STT : Gladia ou Speechmatics (FR, streaming).
LLM : Mistral (tool/function calling).
TTS : ElevenLabs (qualité/expressivité) + fallback UE (ReadSpeaker/Acapela).
Observabilité : logs JSON corrélés (call_id), métriques p50/p95 ASR/LLM/TTS, tracing basique.
Feature flags : TTS_PROVIDER, STT_PROVIDER, TELCO_PROVIDER configurables depuis l’admin.
RGPD : DPA/SCC, consentement vocal, minimisation & TTL, PII masking, export/suppression par call_id.

Tickets (titre + description, dans l’ordre)

1) Bootstrap monorepo — Créer l’arborescence (rails_app/, bridge_node/, scripts/, docs/), .env.example, README, .gitignore.

2) Rails full-stack + Docker — Initialiser Rails 8 (non-API) avec Postgres/Redis/Sidekiq, healthcheck, Dockerfile minimal.

3) Bridge Node (TS) + WS echo + Docker — Serveur WebSocket de base, echo/loopback, Dockerfile, tests “smoke”.

4) Compose dev + tunnel — docker-compose.yml (db, redis, rails, bridge) et tunnel public pour recevoir les webhooks.

5) Pré-flight légal & providers — DPA/SCC, script d’intro vocale (consentement), variables RECORDING_ENABLED/DATA_TTL_DAYS.

6) Provision telco + webhooks — Acheter/configurer le numéro, câbler /voice/inbound et /voice/status (callbacks signés).

7) Audio pipeline (resampling/codec) — Implémenter PCM16↔μ-law 8 kHz avec tests simples (pas de clipping, faible latence).

8) Interfaces adapters STT/LLM/TTS (fakes) — Définir contrats TypeScript + timeouts/erreurs typées, faux providers pour dev.

9) Modèles & migrations — Créer Call, Message, Action (index/validations, PII chiffrées).

10) Endpoints métier de base — Exposer /calls, /calls/:id/messages, /tools/dispatch avec JSON stable.

11) Jobs & purge TTL — Activer Sidekiq, job de purge programmée des données selon TTL.

12) Observabilité initiale — Logs JSON corrélés (call_id), métriques p50/p95 (ASR/LLM/TTS), mini dashboard.

13) Auth & RBAC admin — Authentification (Devise/warden) et rôles admin / support pour l’accès console.

14) UI Admin — Layout & stack — Installer Hotwire/Tailwind, layout admin (sidebar/topbar), page /admin/health.

15) UI Admin — Liste des appels — Page /admin/calls avec tri/filtres/pagination et export CSV.

16) UI Admin — Détail d’un appel — Timeline messages, métriques clés et résumé (placeholder).

17) UI Admin — Paramètres & Feature Flags — Page /admin/settings (providers, TTL, texte consentement) avec persistance.

18) UI Admin — Metrics — Page /admin/metrics (p50/p95, erreurs/min, % barge-in), liens vers dashboard externe si dispo.

19) Barge-in & VAD (cut-through) — Détection voix, arrêt TTS immédiat, gestion du ducking.

20) Timeouts & reprise de dialogue — Règles silence/relance, message de secours, escalade après échecs successifs.

22) Intégration TTS ElevenLabs — Streaming et prosodie FR (vitesse/pauses), premier paquet audio rapide.

23) Fallback TTS UE — Adapter ReadSpeaker/Acapela et bascule automatique sur erreur répétée.

24) Bench latence E2E & charge légère — Scripts d’appel multiples, rapport p95, alertes si dépassement.

26) Résumé, PII-masking & export CSV — Jobs de résumé et masquage (e-mail/tel/IBAN), export CSV à durée de vie limitée.

27) Rate-limit & Circuit-breakers — Protections STT/TTS/LLM & tools, retries exponentiels limités pour éviter les cascades.

28) Rollout providers & reload config — Feature flags centralisés, relecture live par le Bridge sans redeploy.

29) Playbooks incidents — Procédures pannes (TTS down, telco KO), rollback/canary et communication interne.

30) DPIA & dossier RGPD final — Si nécessaire : DPIA, registre de traitements, preuves consentement/TTL, procédures d’exercice de droits.

31) Go/No-Go démo — Scénarios de test bout-en-bout, critères d’acceptation, validation perf & privacy avant présentation.