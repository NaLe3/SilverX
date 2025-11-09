# voice-agent — MVP Agent Téléphonique (Rails + Node)

## Quickstart (dev via Docker)
1. Copiez `.env.example` vers `.env` et renseignez les clés sandbox (ou des faux tokens).
2. Lancez `docker-compose up --build` (le premier run va builder Rails et le bridge).
3. Points d'entrée : Rails http://localhost:3000/health • Bridge ws://localhost:8080/stream?call_id=dev • Sidekiq UI (via logs) sur le même conteneur que Rails.

## Arbo
- `rails_app/`  → Cerveau métier (DB, jobs, admin Hotwire/Tailwind)
- `bridge_node/` → Temps réel audio (WS Media Streams, VAD/barge-in)
- `scripts/bench/` → Scripts de bench latence/barge-in
- `docs/` → Contrats d’interface et notes d’architecture

## Contrats & Flags
- Providers togglables : `TTS_PROVIDER`, `STT_PROVIDER`, `TELCO_PROVIDER`
- RGPD : `RECORDING_ENABLED`, `DATA_TTL_DAYS`, texte consentement vocal
