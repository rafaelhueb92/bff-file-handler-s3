ACCOUNT_ID=''
AWS_REGION=''
APP_REPO_ECR=''
APP_REPO_ECR_URL=''

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$ACCOUNT_ID.amazonaws.co

docker build -t $APP_REPO_ECR:latest .

docker tag $APP_REPO_ECR:latest $APP_REPO_ECR_URL:latest

docker push $APP_REPO_ECR_URL:latest