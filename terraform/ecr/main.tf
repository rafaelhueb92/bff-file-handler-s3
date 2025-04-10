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

  provisioner "local-exec" {
    command = <<EOF
      set -x

      aws --version

      echo "Checking AWS configuration..."
      aws configure list
      
      echo "Verifying AWS credentials..."
      aws sts get-caller-identity

      AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
      echo "AWS Account ID: $AWS_ACCOUNT_ID"

      ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.${var.aws_region}.amazonaws.com"
      echo "ECR Registry: $ECR_REGISTRY"

      echo "Clearing existing Docker credentials..."
      docker logout $ECR_REGISTRY || true

      echo "Getting ECR login token..."
      TOKEN=$(aws ecr get-login-password --region ${var.aws_region})
      
      if [ -z "$TOKEN" ]; then
        echo "Failed to get ECR token"
        exit 1
      fi

      echo "Authenticating with ECR..."
      echo "$TOKEN" | docker login --username AWS --password-stdin $ECR_REGISTRY

      if [ $? -ne 0 ]; then
        echo "Failed to login to ECR"
        # Check Docker config
        cat ~/.docker/config.json || true
        exit 1
      fi

      echo "Verifying ECR access..."
      aws ecr describe-repositories --repository-names ${split("/", aws_ecr_repository.app_repo.repository_url)[1]} --region ${var.aws_region}

      echo "Building Docker image..."
      cd ${path.module}/../../app
      
      if [ ! -f Dockerfile ]; then
        echo "Dockerfile not found in $(pwd)"
        exit 1
      fi

      DOCKER_BUILDKIT=1 docker build --progress=plain -t ${aws_ecr_repository.app_repo.repository_url}:latest .

      if [ $? -ne 0 ]; then
        echo "Failed to build Docker image"
        exit 1
      fi

      echo "Tagging image..."
      docker tag ${aws_ecr_repository.app_repo.repository_url}:latest $ECR_REGISTRY/${split("/", aws_ecr_repository.app_repo.repository_url)[1]}:latest

      echo "Pushing Docker image..."
      docker push --verbose ${aws_ecr_repository.app_repo.repository_url}:latest

      #if [ $? -ne 0 ]; then
      #  echo "Failed to push Docker image"
      #  # Check Docker daemon status
      #  docker info
      #  # List images
      #  docker images
      #  exit 1
      #fi

      echo "Successfully pushed image to ECR"
    EOF
  }

  depends_on = [
    aws_ecr_repository.app_repo,
    aws_ecr_lifecycle_policy.app_repo_policy
  ]
}