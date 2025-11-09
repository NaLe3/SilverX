# infra/

Ce dossier regroupera les artefacts d’infrastructure lorsque nous passerons au déploiement :
- `k8s/` : manifests Helm/Helmfile (Rails, bridge, bases managées).
- `terraform/` : VPC, load balancer, secrets manager, observabilité.
- `ansible/` : (optionnel) playbooks de bootstrap.
- `env/` : valeurs par environnement (dev/staging/prod) — **sans secrets**.

> Placeholder pour l’instant : à compléter lors de l’itération infra (déploiement).
