#!/bin/bash

# AWS Multi-Region CDK Demo Destruction Script
# Usage: ./scripts/destroy.sh [region] [stack-name]

set -e

REGION=${1:-us-east-1}
STACK_NAME=${2:-all}

echo "Destroying resources in region: $REGION"
echo "Stack: $STACK_NAME"

# Change to CDK directory
cd cdk

# Destroy based on stack name
if [ "$STACK_NAME" = "all" ]; then
    echo "Destroying all stacks..."
    npx cdk destroy --all --force
else
    echo "Destroying stack: $STACK_NAME"
    npx cdk destroy $STACK_NAME --force
fi

echo "Destruction completed successfully!"