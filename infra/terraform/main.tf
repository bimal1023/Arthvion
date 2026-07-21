terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "selected" {
  id = data.aws_subnets.default.ids[0]
}

# ── S3 bucket for nightly pg_dump backups ───────────────────────────────────
resource "aws_s3_bucket" "backups" {
  bucket = "arthvion-db-backups-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    filter {}
    expiration {
      days = var.backup_retention_days
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── IAM role letting the instance write backups to that bucket only ────────
resource "aws_iam_role" "ec2_backup_role" {
  name = "arthvion-ec2-backup-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "s3_backup_write" {
  name = "arthvion-s3-backup-write"
  role = aws_iam_role.ec2_backup_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.backups.arn, "${aws_s3_bucket.backups.arn}/*"]
    }]
  })
}

# ── Bedrock access for the agents (LLM_PROVIDER=bedrock) ───────────────────
# The "us." inference profiles route a request to whichever of us-east-1/2 or
# us-west-2 has capacity, so the policy must allow BOTH the profile itself and
# the underlying foundation models in every region it can land in — a policy
# naming only the profile fails at invoke time.
resource "aws_iam_role_policy" "bedrock_invoke" {
  name = "arthvion-bedrock-invoke"
  role = aws_iam_role.ec2_backup_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
      ]
      Resource = [
        "arn:aws:bedrock:*::foundation-model/anthropic.*",
        "arn:aws:bedrock:*:${data.aws_caller_identity.current.account_id}:inference-profile/us.anthropic.*",
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_backup_profile" {
  name = "arthvion-ec2-backup-profile"
  role = aws_iam_role.ec2_backup_role.name
}

# ── Security group ───────────────────────────────────────────────────────
resource "aws_security_group" "app" {
  name        = "arthvion-app-sg"
  description = "Arthvion single-box app server"
  vpc_id      = data.aws_vpc.default.id

  dynamic "ingress" {
    for_each = var.allowed_ssh_cidrs
    content {
      description = ingress.key
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  ingress {
    description = "HTTP (redirects to HTTPS via Caddy)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "arthvion-app-sg" }
}

# ── Data volume (Postgres data + Caddy certs) — survives instance rebuilds ─
resource "aws_ebs_volume" "data" {
  availability_zone = data.aws_subnet.selected.availability_zone
  size              = var.data_volume_size_gb
  type              = "gp3"
  encrypted         = true
  tags              = { Name = "arthvion-data" }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_instance" "app" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.app.id]
  subnet_id              = data.aws_subnets.default.ids[0]
  availability_zone      = data.aws_subnet.selected.availability_zone
  iam_instance_profile   = aws_iam_instance_profile.ec2_backup_profile.name

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    backup_bucket = aws_s3_bucket.backups.bucket
    aws_region    = var.aws_region
    domain_name   = var.domain_name
  })
  user_data_replace_on_change = true

  tags = { Name = "arthvion-app" }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "arthvion-app-eip" }
}
