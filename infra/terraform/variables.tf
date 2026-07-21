variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type (arm64/Graviton)"
  type        = string
  default     = "t4g.medium"
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = <<-EOT
    CIDRs allowed to SSH in, keyed by the rule description AWS shows in the
    console — e.g. { "SSH from admin IP only" = "1.2.3.4/32" }. A map rather
    than a single string so a second admin IP can be added in config instead
    of by hand in the console; a hand-added rule reads as drift and gets
    revoked on the next apply. Never use 0.0.0.0/0.
  EOT
  type        = map(string)

  validation {
    condition     = !contains(values(var.allowed_ssh_cidrs), "0.0.0.0/0")
    error_message = "Refusing to open SSH to 0.0.0.0/0."
  }
}

variable "ami_id" {
  description = <<-EOT
    AMI for the app instance, pinned deliberately.

    This used to resolve the "latest Amazon Linux 2023 arm64" SSM parameter,
    which AWS republishes on every patch release. Because `ami` forces
    replacement on aws_instance, that turned every unrelated apply into a
    destroy/recreate of production — taking the root volume (and the
    uncommitted infra/.env living on it) with it.

    Bump this on purpose when you intend to rebuild the box. Current value:
    the AMI i-04bfc46e7f56980ed was launched from.
  EOT
  type        = string
  default     = "ami-02e447f4c654c7179"
}

variable "domain_name" {
  description = "Root domain (DNS stays at your registrar, e.g. GoDaddy — this is just used for Caddy's TLS config)"
  type        = string
  default     = "arthvion.com"
}

variable "data_volume_size_gb" {
  description = "Size of the separate EBS volume that holds Postgres data + Caddy TLS certs"
  type        = number
  default     = 20
}

variable "root_volume_size_gb" {
  description = "Size of the root EBS volume (OS, docker images)"
  type        = number
  default     = 20
}

variable "backup_retention_days" {
  description = "Days to keep nightly pg_dump backups in S3 before they auto-expire"
  type        = number
  default     = 14
}
