resource "aws_ecr_repository" "app_repo" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  tags = var.tags
}

resource "aws_ecr_lifecycle_policy" "app_repo_policy" {
  count      = var.enable_lifecycle_policy ? 1 : 0
  repository = aws_ecr_repository.app_repo.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last ${var.image_retention_count} images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.image_retention_count
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "null_resource" "docker_build_push" {
  triggers = {
    ecr_repository_url = aws_ecr_repository.app_repo.repository_url
    docker_file_hash  = filemd5("${path.module}/../../app/Dockerfile")
  }

  environment = {
      BASIC_AUTH_USERNAME = var.app_user
      BASIC_AUTH_PASSWORD = var.app_password
    }

  provisioner "local-exec" {
    command = <<EOF
      aws configure list

      AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
      echo "AWS Account ID: $AWS_ACCOUNT_ID"

      echo "Logging in to ECR..."
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.${var.aws_region}.amazonaws.com

      if [ $? -ne 0 ]; then
        echo "Failed to login to ECR"
        exit 1
      fi

      echo "Building Docker image..."
      cd ${path.module}/../../app && docker build -t ${aws_ecr_repository.app_repo.repository_url}:latest .

      if [ $? -ne 0 ]; then
        echo "Failed to build Docker image"
        exit 1
      fi

      echo "Pushing Docker image..."
      docker push ${aws_ecr_repository.app_repo.repository_url}:latest

      if [ $? -ne 0 ]; then
        echo "Failed to push Docker image"
        exit 1
      fi
    EOF
  }

  depends_on = [
    aws_ecr_repository.app_repo,
    aws_ecr_lifecycle_policy.app_repo_policy
  ]
}