output "elastic_ip" {
  description = "Point your DNS A records at this IP (arthvion.com, www, api.arthvion.com)"
  value       = aws_eip.app.public_ip
}

output "ssh_command" {
  value = "ssh ec2-user@${aws_eip.app.public_ip}"
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.bucket
}
