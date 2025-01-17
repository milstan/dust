#!/bin/sh
# first arg : name of image to build
# second arg (optional) : working directory. If not provided, it defaults to "../$1"
set -e


SCRIPT_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
WORKING_DIR="${2:-${SCRIPT_DIR}/../$1}"

# Change the current working directory to the directory in which to build the image
cd "$WORKING_DIR"

# Check the current working directory
echo "Current working directory is $(pwd)"

# Start the build and get its ID
echo "Starting build..."
BUILD_ID=$(gcloud builds submit --quiet --config "${SCRIPT_DIR}/cloudbuild.yaml" --substitutions=SHORT_SHA=$(git rev-parse --short HEAD),_IMAGE_NAME=$1 --format='value(id)' .)
