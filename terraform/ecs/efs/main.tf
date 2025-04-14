resource "aws_efs_file_system" "app_storage" {
  creation_token = "${var.project_name}-efs"
  encrypted      = true

  tags = {
    Name = "${var.project_name}-efs"
  }
}

resource "aws_efs_mount_target" "app_storage_mount" {
  count           = length(var.private_subnets)
  file_system_id  = aws_efs_file_system.app_storage.id
  subnet_id       = var.private_subnets[count.index]
  security_groups = [aws_security_group.efs_sg.id]
}

resource "aws_security_group" "efs_sg" {
  name        = "${var.project_name}-efs-sg"
  description = "Security group for EFS mount targets"
  vpc_id      = var.vpc_id

  ingress {
    description     = "NFS from ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [var.sg_ecs_tasks_id]  
  }
}