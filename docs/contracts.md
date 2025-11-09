# Contrats d’interface

## Webhooks Telco → Rails
- POST `/voice/inbound`
- POST `/voice/status`
- Signature : *à préciser*

## Bridge ↔ Telco
- WebSocket `/stream?call_id={uuid}`
- Audio : μ-law 8 kHz (G.711) ↔ PCM 16 kHz (interne)

## Bridge → Rails (messages)
- POST `/calls/:id/messages` avec `{ role, text, confidence, latency_ms }`

## Rails Tools API
- POST `/tools/dispatch` avec `{ call_id, tool_name, arguments }`
- Réponse `{ status, data, latency_ms }`

*TODO : schémas JSON précis et codes d’erreur typés.*
