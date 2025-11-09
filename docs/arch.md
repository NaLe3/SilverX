# Architecture (aperçu)
- Rails (full-stack) : métier, base de données, jobs, console admin.
- Bridge Node : streaming audio temps réel (WebSocket), VAD/barge-in, resampling.

Providers ciblés :
- Téléphonie : Twilio / Vonage.
- STT : Gladia / Speechmatics.
- LLM : Mistral.
- TTS : ElevenLabs (+ fallback UE).

Consultez `ROADMAP.md` pour le détail des jalons, observabilité et RGPD.
