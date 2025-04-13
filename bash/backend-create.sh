#!/bin/bash

ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
BUCKET_NAME="backend-tf-${ACCOUNT_ID}"
PROJECT_NAME=$(basename $(dirname $(pwd)))

cat <<EOF > state.tf
terraform {
  backend "s3" {
    bucket        = "${BUCKET_NAME}"
    key           = "${PROJECT_NAME}/state/terraform.tfstate"
    region        = "us-east-1"
  }
}
EOF