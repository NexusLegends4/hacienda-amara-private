#!/bin/bash

# Automates the git workflow: add, commit, and push
echo "Adding changes..."
git add .

# Check if a custom message was provided, otherwise use a timestamp
MESSAGE=${1:-"Update: $(date +'%Y-%m-%d %H:%M:%S')"}

echo "Committing with message: $MESSAGE"
git commit -m "$MESSAGE"

echo "Pushing updates to repository..."
git push