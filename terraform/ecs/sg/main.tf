resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Security group for ECS tasks running Compodoc"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow traffic from ALB to ECS tasks on port 8080"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # All protocols
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-ecs-tasks-sg"
    }
  )
}