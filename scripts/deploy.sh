#!/bin/bash

# AWS Multi-Region CDK Demo Deployment Script
# Usage: ./scripts/deploy.sh [region] [stack-name]

set -e

REGION=${1:-us-east-1}
STACK_NAME=${2:-all}

echo "Deploying to region: $REGION"
echo "Stack: $STACK_NAME"

# Change to CDK directory
cd cdk

# Build the project
echo "Building TypeScript..."
npm run build

# Deploy based on stack name
if [ "$STACK_NAME" = "all" ]; then
    echo "Deploying all stacks..."
    npx cdk deploy --all --require-approval never
else
    echo "Deploying stack: $STACK_NAME"
    npx cdk deploy $STACK_NAME --require-approval never
fi

echo "Deployment completed successfully!"