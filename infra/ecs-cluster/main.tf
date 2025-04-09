resource "aws_ecs_cluster" "this" {
  name = var.ecs_cluster_name

  configuration {
    execute_command_configuration {
      kms_key_id = var.kms_arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = var.cw_log_group_name
      }
    }
  }
}