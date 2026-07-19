# Deploy runbook — single-box EC2 (arthvion.com)

Production runs the whole stack via `docker-compose.prod.yml` on **one**
`t4g.medium` (2 vCPU / 4 GB) EC2 instance in `us-east-1`.

- Instance: `i-04bfc46e7f56980ed` · Elastic IP `54.83.191.77`
- SSH: `ssh -i ~/.ssh/arthvion-key.pem ec2-user@54.83.191.77`
- App dir on box: `/opt/arthvion/app` · prod env: `/opt/arthvion/app/infra/.env`
- Postgres data lives on a **separate EBS volume** mounted at `/mnt/data`
  (survives instance rebuilds; the root volume does not).

## ⚠️ Rule #1: build ONE image at a time

The box has 4 GB RAM. Building the backend and frontend images **at the same
time**, on top of the 7 running containers, exhausts memory and wedges the box
(low CPU, everything times out — it's swapping, not busy). This has caused a
production outage. Always build sequentially:

```bash
# from repo root — sync code first (never syncs infra/.env)
rsync -az --delete \
  --exclude='.git' --exclude='.venv' --exclude='node_modules' \
  --exclude='frontend/.next' --exclude='frontend/node_modules' \
  --exclude='__pycache__' --exclude='*.pyc' \
  --exclude='infra/terraform/.terraform' --exclude='infra/terraform/tfplan' \
  --exclude='infra/terraform/terraform.tfstate*' --exclude='infra/.env' \
  -e "ssh -i ~/.ssh/arthvion-key.pem" \
  ./ ec2-user@54.83.191.77:/opt/arthvion/app/

# then on the box — frontend first, WAIT for it to settle, then backend
ssh ... "cd /opt/arthvion/app/infra && sudo docker compose -f docker-compose.prod.yml up -d --build frontend"
# (confirm it's Up and memory has settled: free -m)
ssh ... "cd /opt/arthvion/app/infra && sudo docker compose -f docker-compose.prod.yml up -d --build backend worker beat"
```

Frontend-only change → rebuild `frontend`. Backend change → rebuild
`backend worker beat` (they share the image). Never `--build` both groups in
one command.

## Health checks (no SSH needed)

```bash
curl https://api.arthvion.com/health              # {"status":"ok"}
curl https://arthvion.com/                        # 200
curl https://api.arthvion.com/api/v1/auth/oauth/providers  # {"google":..,"microsoft":..}
```

## If the box wedges (times out, low CPU)

It's memory exhaustion. A graceful reboot may not take (OS too wedged). Force
power-cycle — data volume + Elastic IP survive:

```bash
aws ec2 stop-instances  --region us-east-1 --instance-ids i-04bfc46e7f56980ed --force
aws ec2 wait instance-stopped --region us-east-1 --instance-ids i-04bfc46e7f56980ed
aws ec2 start-instances --region us-east-1 --instance-ids i-04bfc46e7f56980ed
```
Containers restart automatically (`restart: unless-stopped`).

## Env changes only (no code)

Edit `/opt/arthvion/app/infra/.env` on the box, then restart the affected
service without a rebuild, e.g. `docker compose -f docker-compose.prod.yml up -d backend`.

## OAuth / SSO env keys

`API_BASE_URL=https://api.arthvion.com`, `GOOGLE_CLIENT_ID/SECRET`,
`MICROSOFT_CLIENT_ID/SECRET`, `MICROSOFT_TENANT=common`. Provider redirect URIs
(register in each console) must be exactly:
`https://api.arthvion.com/api/v1/auth/oauth/{google|microsoft}/callback`.
Buttons stay hidden until a provider's credentials are present.
