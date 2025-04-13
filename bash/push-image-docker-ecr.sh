echo "Building Image"
DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain docker build --no-cache -t $APP_REPO_ECR:latest ../app/Dockerfile

echo "Tagging Image"
docker tag $APP_REPO_ECR:latest $APP_REPO_ECR_URL:latest

echo "Pushing Image"
docker push $APP_REPO_ECR_URL:latest