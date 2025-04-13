#!/bin/bash
set -e

echo "Checking AWS account ID"
ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account)
APP_REPO_ECR_URL="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_REPO_ECR"

# Ensure variables are set
if [ -z "$APP_REPO_ECR" ] || [ -z "$APP_REPO_ECR_URL" ]; then
    echo "Error: APP_REPO_ECR or APP_REPO_ECR_URL not set"
    exit 1
fi

echo "Building Image"
DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain docker build \
    --no-cache \
    -t $APP_REPO_ECR:latest \
    -f ../app/Dockerfile ../app

echo "Tagging Image"
docker tag $APP_REPO_ECR:latest $APP_REPO_ECR_URL:latest

echo "Pushing Image"
docker push $APP_REPO_ECR_URL:latest

echo "Image push completed successfully"