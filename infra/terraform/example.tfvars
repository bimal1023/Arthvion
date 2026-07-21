# Copy to terraform.tfvars and fill in. terraform.tfvars is gitignored —
# keep real admin IPs out of the repo.
#
#   terraform plan  -var-file=terraform.tfvars
#   terraform apply -var-file=terraform.tfvars

key_pair_name = "arthvion-key"

# Keyed by the rule description AWS shows in the console. Add admin IPs HERE,
# not in the console — a hand-added rule is drift, and the next apply revokes
# it (potentially locking you out of the box it just touched).
allowed_ssh_cidrs = {
  "SSH from admin IP only" = "203.0.113.10/32"
  "SSH admin IP 2"         = "203.0.113.11/32"
}

# Pinned on purpose — see the ami_id description in variables.tf. Changing this
# REPLACES the instance and destroys the root volume, which holds the
# uncommitted infra/.env. Back that file up before you ever bump this.
# ami_id = "ami-02e447f4c654c7179"
