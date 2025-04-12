#!/bin/bash

# Usage: ./delete-images-ecr-repo.sh <repository-name>

REPOSITORY_NAME=$1

if [ -z "$REPOSITORY_NAME" ]; then
    echo "Error: Repository name is required"
    echo "Usage: ./bash/delete-images-ecr-repo.sh <repository-name>"
    exit 1
fi

aws ecr list-images --repository-name "$REPOSITORY_NAME" --query 'imageIds[*]' --output json | \
    aws ecr batch-delete-image --repository-name "$REPOSITORY_NAME" --image-ids file:///dev/stdin