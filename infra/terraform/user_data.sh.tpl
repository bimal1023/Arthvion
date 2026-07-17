#!/bin/bash
set -euxo pipefail

# ── Docker + compose plugin + cron ──────────────────────────────────────
dnf update -y
dnf install -y docker unzip cronie
systemctl enable --now docker
systemctl enable --now crond
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ── AWS CLI v2 (for backup uploads) ─────────────────────────────────────
curl -SL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

# ── Find and mount the data EBS volume ──────────────────────────────────
# Nitro instances expose EBS volumes as NVMe devices (nvme0n1, nvme1n1, ...);
# the /dev/sdf name given at attach time is not guaranteed to appear as a
# symlink, so identify the data disk by excluding whichever disk backs root.
ROOT_DISK=$(lsblk -no PKNAME "$(findmnt -no SOURCE /)")
DATA_DEV=""
for i in $(seq 1 30); do
  DATA_DEV=$(lsblk -dno NAME,TYPE | awk -v root="$ROOT_DISK" '$2=="disk" && $1!=root {print $1; exit}')
  [ -n "$DATA_DEV" ] && break
  sleep 2
done
DATA_DEV="/dev/$DATA_DEV"

if ! blkid "$DATA_DEV" >/dev/null 2>&1; then
  mkfs.ext4 "$DATA_DEV"
fi

mkdir -p /mnt/data
DATA_UUID=$(blkid -s UUID -o value "$DATA_DEV")
grep -q "$DATA_UUID" /etc/fstab || echo "UUID=$DATA_UUID /mnt/data ext4 defaults,nofail 0 2" >> /etc/fstab
mount -a

mkdir -p /mnt/data/pgdata /mnt/data/caddy_data /mnt/data/caddy_config /mnt/data/backups

# ── Nightly pg_dump -> S3 backup ────────────────────────────────────────
mkdir -p /opt/arthvion
cat > /opt/arthvion/backup.sh <<'BACKUP_EOF'
#!/bin/bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="/mnt/data/backups/arthvion-$STAMP.sql.gz"
docker exec arthvion-postgres pg_dump -U postgres arthvion | gzip > "$OUT"
aws s3 cp "$OUT" "s3://${backup_bucket}/db/$(basename "$OUT")" --region "${aws_region}"
rm -f "$OUT"
find /mnt/data/backups -type f -mtime +2 -delete
BACKUP_EOF
chmod +x /opt/arthvion/backup.sh

( crontab -l 2>/dev/null | grep -v arthvion/backup.sh || true; echo "0 3 * * * /opt/arthvion/backup.sh >> /var/log/arthvion-backup.log 2>&1" ) | crontab -

# ── App deploy directory ────────────────────────────────────────────────
mkdir -p /opt/arthvion/app
chown -R ec2-user:ec2-user /opt/arthvion /mnt/data

cat > /opt/arthvion/README_DEPLOY.txt <<EOF
Box is bootstrapped. To deploy the app:
  1. scp or git clone the repo into /opt/arthvion/app
  2. Put a production infra/.env there (see infra/.env.example)
  3. cd /opt/arthvion/app/infra && docker compose -f docker-compose.prod.yml up -d --build
Domain configured for Caddy: ${domain_name}
EOF
