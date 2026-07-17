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

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH in, e.g. \"1.2.3.4/32\" (your IP). Never leave this 0.0.0.0/0."
  type        = string
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
