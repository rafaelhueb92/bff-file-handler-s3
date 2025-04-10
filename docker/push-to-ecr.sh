ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account)
AWS_REGION=$(aws configure get region)
APP_REPO_ECR='bff-file-handler'
APP_REPO_ECR_URL="$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/$APP_REPO_ECR"

echo "Building Image"

DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain docker build --no-cache -t $APP_REPO_ECR:latest .

echo "Login into ECR"

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.co

echo "Tagging Image"

docker tag $APP_REPO_ECR:latest $APP_REPO_ECR_URL:latest

echo "Pushing Image

docker push $APP_REPO_ECR_URL:latest