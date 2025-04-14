module "sg" {
  source = "./sg"

  project_name = var.project_name
  vpc_id = var.vpc_id
  allowed_security_groups = var.allowed_security_groups
}

resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/ecs/${var.project_name}/app"
  retention_in_days = 3 
}

module "ecs_task_role" {
  source = "./role"

  project_name         = var.project_name
  environment          = var.environment
  main_bucket_arn      = var.main_bucket_arn
  fallback_bucket_arn  = var.fallback_bucket_arn
}

resource "aws_ecs_cluster" "main" {
  name               = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

    configuration {
    execute_command_configuration {
      kms_key_id = var.kms_arn
      logging    = "OVERRIDE"
      
      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = "${var.project_name}-ecs-cluster"
      }

      }
    }

}

module "efs" {
    source = "./efs"
    project_name       = var.project_name
    private_subnet_ids = var.private_subnet_ids
    sg_ecs_tasks_id    = module.sg.ecs_tasks_security_group_id

    depends_on = [ module.sg ]
}

resource "aws_ecs_task_definition" "app" {

  depends_on = [ module.efs ]

  family                   = "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory

  task_role_arn      = module.ecs_task_role.task_role_arn
  execution_role_arn = module.ecs_task_role.task_execution_role_arn

  volume {
    name = "efs-storage"
    efs_volume_configuration {
      file_system_id          = module.efs.efs_id 
      transit_encryption      = "ENABLED"
      transit_encryption_port = 2049
      authorization_config {
        iam = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name  = "${var.project_name}-container",
      image = "${var.repository_url}:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      mountPoints = [
        {
          sourceVolume  = "efs-storage"
          containerPath = "/usr/src/app/tmp"
          readOnly      = false
        }
      ],
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      },
      environment = [
        {
          name  = "APP_USER"
          value = var.app_user
        },
        {
          name  = "APP_PASSWORD"
          value = var.app_password
        },
         {
          name  = "ENV"
          value = "PROD"
        },
        {
          name  = "AWS_S3_BUCKET"
          value = var.main_bucket_name
        },
        {
          name  = "AWS_S3_BUCKET_BACKUP"
          value = var.fallback_bucket_name
        },
        {
          name  = "S3_RETRY_ATTEMPTS"
          value = tostring(var.s3_retry_attempts)
        },
        {
          name  = "S3_FALLBACK_RETRY_ATTEMPTS"
          value = tostring(var.s3_fallback_retry_attempts)
        },
        {
          name  = "S3_TIME_OUT"
          value = tostring(var.s3_timeout)
        },
        {
          name  = "S3_CONN_TIME_OUT"
          value = tostring(var.s3_conn_timeout)
        },
        {
          name  = "CB_TIMEOUT"
          value = tostring(var.cb_timeout)
        },
        {
          name  = "CB_THRESHOLD"
          value = tostring(var.cb_threshold)
        },
        {
          name  = "CB_RESET_TIMEOUT"
          value = tostring(var.cb_reset_timeout)
        },
        {
          name  = "MULTER_PATH_TMP"
          value = "/usr/src/app/tmp"
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [module.sg.ecs_tasks_security_group_id]
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "${var.project_name}-container"
    container_port   = var.container_port
  }
}

