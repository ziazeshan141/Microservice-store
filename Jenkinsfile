pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()

        buildDiscarder(
            logRotator(
                numToKeepStr: '20',
                artifactNumToKeepStr: '10'
            )
        )

        timeout(
            time: 60,
            unit: 'MINUTES'
        )
    }

    triggers {
        githubPush()
    }

    environment {
        APP_DIR = 'Online-Shopping-Portal'

        REGISTRY = 'ziazeshan141'

        ADMIN_IMAGE = "${REGISTRY}/shopping-adminserver"
        PRODUCT_IMAGE = "${REGISTRY}/shopping-product"
        USER_IMAGE = "${REGISTRY}/shopping-userservice"

        IMAGE_TAG = "${BUILD_NUMBER}"

        GITOPS_REPOSITORY =
            'git@github.com:ziazeshan141/shopping-portal-gitops.git'

        GITOPS_BRANCH = 'main'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    echo "Checked-out commit:"
                    git rev-parse HEAD

                    echo "Current branch:"
                    git branch --show-current || true

                    echo "Repository contents:"
                    ls -la
                '''
            }
        }

        stage('Verify Jenkins Agent') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    echo "Git version:"
                    git --version

                    echo "Docker version:"
                    docker --version

                    echo "Python version:"
                    python3 --version

                    echo "Checking Docker daemon..."
                    docker info >/dev/null

                    echo "Checking application directories..."
                    test -d "${APP_DIR}/adminserver"
                    test -d "${APP_DIR}/product"
                    test -d "${APP_DIR}/userservice"

                    echo "Checking Dockerfiles..."
                    test -f "${APP_DIR}/adminserver/Dockerfile"
                    test -f "${APP_DIR}/product/Dockerfile"
                    test -f "${APP_DIR}/userservice/Dockerfile"

                    echo "Jenkins agent verification passed."
                '''
            }
        }

        stage('Build Gradle Applications') {
            parallel {
                stage('Admin Server') {
                    tools {
                        jdk 'jdk11'
                    }

                    steps {
                        dir("${APP_DIR}/adminserver") {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                echo "=================================="
                                echo "Building Admin Server"
                                echo "=================================="

                                echo "Java version:"
                                java -version

                                chmod +x gradlew

                                echo "Gradle version:"
                                ./gradlew --version

                                ./gradlew \
                                    clean \
                                    test \
                                    bootJar \
                                    --no-daemon
                            '''
                        }
                    }
                }

                stage('Product Service') {
                    tools {
                        jdk 'jdk11'
                    }

                    steps {
                        dir("${APP_DIR}/product") {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                echo "=================================="
                                echo "Building Product Service"
                                echo "=================================="

                                echo "Java version:"
                                java -version

                                chmod +x gradlew

                                echo "Gradle version:"
                                ./gradlew --version

                                ./gradlew \
                                    clean \
                                    test \
                                    bootJar \
                                    --no-daemon
                            '''
                        }
                    }
                }

                stage('User Service') {
                    tools {
                        jdk 'jdk17'
                    }

                    steps {
                        dir("${APP_DIR}/userservice") {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                echo "=================================="
                                echo "Building User Service"
                                echo "=================================="

                                echo "Java version:"
                                java -version

                                chmod +x gradlew

                                echo "Gradle version:"
                                ./gradlew --version

                                ./gradlew \
                                    clean \
                                    test \
                                    bootJar \
                                    --no-daemon
                            '''
                        }
                    }
                }
            }
        }

        stage('Archive JAR Files') {
            steps {
                archiveArtifacts(
                    artifacts: "${APP_DIR}/**/build/libs/*.jar",
                    fingerprint: true,
                    onlyIfSuccessful: true
                )
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    echo "Building Admin Server Docker image..."
                    docker build \
                        --pull \
                        -t "${ADMIN_IMAGE}:${IMAGE_TAG}" \
                        "${APP_DIR}/adminserver"

                    echo "Building Product Service Docker image..."
                    docker build \
                        --pull \
                        -t "${PRODUCT_IMAGE}:${IMAGE_TAG}" \
                        "${APP_DIR}/product"

                    echo "Building User Service Docker image..."
                    docker build \
                        --pull \
                        -t "${USER_IMAGE}:${IMAGE_TAG}" \
                        "${APP_DIR}/userservice"

                    echo "Docker images created:"
                    docker image inspect \
                        "${ADMIN_IMAGE}:${IMAGE_TAG}" \
                        "${PRODUCT_IMAGE}:${IMAGE_TAG}" \
                        "${USER_IMAGE}:${IMAGE_TAG}" \
                        --format '{{.RepoTags}} {{.Id}}'
                '''
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail

                        echo "$DOCKER_PASSWORD" |
                        docker login \
                            --username "$DOCKER_USERNAME" \
                            --password-stdin

                        echo "Pushing Admin Server image..."
                        docker push "${ADMIN_IMAGE}:${IMAGE_TAG}"

                        echo "Pushing Product Service image..."
                        docker push "${PRODUCT_IMAGE}:${IMAGE_TAG}"

                        echo "Pushing User Service image..."
                        docker push "${USER_IMAGE}:${IMAGE_TAG}"

                        docker logout
                    '''
                }
            }
        }

        stage('Update GitOps Repository') {
            steps {
                sshagent(credentials: ['gitops-ssh-key']) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail

                        GITOPS_DIR="shopping-portal-gitops"

                        rm -rf "$GITOPS_DIR"

                        mkdir -p "$HOME/.ssh"
                        chmod 700 "$HOME/.ssh"

                        touch "$HOME/.ssh/known_hosts"
                        chmod 600 "$HOME/.ssh/known_hosts"

                        if ! ssh-keygen \
                            -F github.com \
                            -f "$HOME/.ssh/known_hosts" \
                            >/dev/null; then

                            ssh-keyscan \
                                -H github.com \
                                >> "$HOME/.ssh/known_hosts"
                        fi

                        echo "Testing GitOps repository access..."
                        git ls-remote "$GITOPS_REPOSITORY" >/dev/null

                        echo "Cloning GitOps repository..."
                        git clone \
                            --branch "$GITOPS_BRANCH" \
                            --single-branch \
                            "$GITOPS_REPOSITORY" \
                            "$GITOPS_DIR"

                        cd "$GITOPS_DIR"

                        echo "Current GitOps branch:"
                        git branch --show-current

                        echo "Checking required GitOps files..."
                        test -f helm/adminserver/values.yaml
                        test -f helm/product/values.yaml
                        test -f helm/userservice/values.yaml

                        echo "Image configuration before update:"

                        echo "Admin Server:"
                        grep -A 3 "^image:" \
                            helm/adminserver/values.yaml

                        echo "Product Service:"
                        grep -A 3 "^image:" \
                            helm/product/values.yaml

                        echo "User Service:"
                        grep -A 3 "^image:" \
                            helm/userservice/values.yaml

                        echo "Updating image tags to ${IMAGE_TAG}..."

                        python3 - \
                            "$IMAGE_TAG" \
                            helm/adminserver/values.yaml \
                            helm/product/values.yaml \
                            helm/userservice/values.yaml <<'PYTHON_SCRIPT'
from pathlib import Path
import sys

image_tag = sys.argv[1]
files = sys.argv[2:]

for file_name in files:
    path = Path(file_name)

    if not path.exists():
        raise SystemExit(f"Required file not found: {file_name}")

    lines = path.read_text(encoding="utf-8").splitlines(
        keepends=True
    )

    inside_image_section = False
    tag_updated = False

    for index, line in enumerate(lines):
        stripped = line.strip()
        indentation = len(line) - len(line.lstrip())

        if stripped == "image:" and indentation == 0:
            inside_image_section = True
            continue

        if inside_image_section:
            if stripped and indentation == 0:
                break

            if stripped.startswith("tag:"):
                prefix = line[:indentation]

                if line.endswith("\\r\\n"):
                    newline = "\\r\\n"
                elif line.endswith("\\n"):
                    newline = "\\n"
                else:
                    newline = ""

                lines[index] = (
                    f'{prefix}tag: "{image_tag}"{newline}'
                )

                tag_updated = True
                break

    if not tag_updated:
        raise SystemExit(
            f"Could not locate image.tag in {file_name}"
        )

    path.write_text(
        "".join(lines),
        encoding="utf-8"
    )

    print(
        f"Updated {file_name} to image tag {image_tag}"
    )
PYTHON_SCRIPT

                        echo "Image configuration after update:"

                        echo "Admin Server:"
                        grep -A 3 "^image:" \
                            helm/adminserver/values.yaml

                        echo "Product Service:"
                        grep -A 3 "^image:" \
                            helm/product/values.yaml

                        echo "User Service:"
                        grep -A 3 "^image:" \
                            helm/userservice/values.yaml

                        echo "Verifying updated image tags..."

                        grep -qE \
                            "^[[:space:]]*tag:[[:space:]]*\\"${IMAGE_TAG}\\"[[:space:]]*$" \
                            helm/adminserver/values.yaml

                        grep -qE \
                            "^[[:space:]]*tag:[[:space:]]*\\"${IMAGE_TAG}\\"[[:space:]]*$" \
                            helm/product/values.yaml

                        grep -qE \
                            "^[[:space:]]*tag:[[:space:]]*\\"${IMAGE_TAG}\\"[[:space:]]*$" \
                            helm/userservice/values.yaml

                        git config user.name "Jenkins"
                        git config user.email "jenkins@local"

                        git add \
                            helm/adminserver/values.yaml \
                            helm/product/values.yaml \
                            helm/userservice/values.yaml

                        echo "Git changes:"
                        git diff --cached

                        if git diff --cached --quiet; then
                            echo "ERROR: Image tags were not changed."
                            exit 1
                        fi

                        git commit \
                            -m "Deploy shopping portal build ${IMAGE_TAG}"

                        git push \
                            origin \
                            "HEAD:${GITOPS_BRANCH}"

                        echo "Latest GitOps commit:"
                        git log -1 --oneline

                        echo "GitOps repository updated successfully."
                    '''
                }
            }
        }
    }

    post {
        always {
            junit(
                testResults:
                    "${APP_DIR}/**/build/test-results/test/*.xml",
                allowEmptyResults: true
            )

            sh '''#!/usr/bin/env bash
                docker logout || true
            '''
        }

        success {
            echo """
Pipeline completed successfully.

Published Docker images:
${ADMIN_IMAGE}:${IMAGE_TAG}
${PRODUCT_IMAGE}:${IMAGE_TAG}
${USER_IMAGE}:${IMAGE_TAG}

GitOps repository:
${GITOPS_REPOSITORY}

GitOps image tag:
${IMAGE_TAG}

Argo CD should detect the GitOps commit and synchronize the applications.
"""
        }

        failure {
            echo """
Pipeline failed.

Check the first failed stage:
1. Checkout
2. Gradle build
3. Docker build
4. Docker Hub push
5. GitOps repository update
"""
        }

        cleanup {
            sh '''#!/usr/bin/env bash
                rm -rf shopping-portal-gitops || true

                docker image rm \
                    "${ADMIN_IMAGE}:${IMAGE_TAG}" \
                    "${PRODUCT_IMAGE}:${IMAGE_TAG}" \
                    "${USER_IMAGE}:${IMAGE_TAG}" \
                    >/dev/null 2>&1 || true
            '''
        }
    }
}