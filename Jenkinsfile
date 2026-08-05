pipeline {
    agent any

    options {
        // Prevent the automatic checkout because a dedicated Checkout stage is used.
        skipDefaultCheckout(true)

        // Add timestamps to console output.
        timestamps()

        // Prevent two builds from updating the same GitOps repository simultaneously.
        disableConcurrentBuilds()

        // Keep only the latest 20 Jenkins builds.
        buildDiscarder(
            logRotator(
                numToKeepStr: '20',
                artifactNumToKeepStr: '10'
            )
        )

        // Stop a build that runs for too long.
        timeout(
            time: 60,
            unit: 'MINUTES'
        )
    }

    triggers {
        githubPush()
    }

    environment {
        // Application folder in the source repository.
        APP_DIR = 'Online-Shopping-Portal'

        // Docker Hub username.
        REGISTRY = 'ziazeshan141'

        // Docker image repositories.
        ADMIN_IMAGE = "${REGISTRY}/shopping-adminserver"
        PRODUCT_IMAGE = "${REGISTRY}/shopping-product"
        USER_IMAGE = "${REGISTRY}/shopping-userservice"

        // Each Jenkins build gets a unique Docker image tag.
        IMAGE_TAG = "${BUILD_NUMBER}"

        // Separate GitOps repository watched by Argo CD.
        GITOPS_REPOSITORY = 'git@github.com:ziazeshan141/shopping-portal-gitops.git'

        // GitOps branch.
        GITOPS_BRANCH = 'main'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''#!/usr/bin/env bash
                    set -eu

                    echo "Checked out commit:"
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
                    set -eu

                    echo "Git version:"
                    git --version

                    echo "Docker version:"
                    docker --version

                    echo "Docker daemon:"
                    docker info >/dev/null

                    echo "Required application folders:"
                    test -d "${APP_DIR}/adminserver"
                    test -d "${APP_DIR}/product"
                    test -d "${APP_DIR}/userservice"

                    echo "Required Dockerfiles:"
                    test -f "${APP_DIR}/adminserver/Dockerfile"
                    test -f "${APP_DIR}/product/Dockerfile"
                    test -f "${APP_DIR}/userservice/Dockerfile"
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
                                set -eu

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
                                set -eu

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
                                set -eu

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
                    set -eu

                    echo "Building Admin Server image..."
                    docker build \
                      --pull \
                      -t "${ADMIN_IMAGE}:${IMAGE_TAG}" \
                      "${APP_DIR}/adminserver"

                    echo "Building Product Service image..."
                    docker build \
                      --pull \
                      -t "${PRODUCT_IMAGE}:${IMAGE_TAG}" \
                      "${APP_DIR}/product"

                    echo "Building User Service image..."
                    docker build \
                      --pull \
                      -t "${USER_IMAGE}:${IMAGE_TAG}" \
                      "${APP_DIR}/userservice"

                    echo "Created Docker images:"
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
                        set -eu

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
                        set -eu

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

                        echo "Checking required GitOps files..."
                        test -f helm/adminserver/values.yaml
                        test -f helm/product/values.yaml
                        test -f helm/userservice/values.yaml

                        echo "Updating Admin Server image tag..."
                        sed -i \
                          "s|^  tag:.*|  tag: \\"${IMAGE_TAG}\\"|" \
                          helm/adminserver/values.yaml

                        echo "Updating Product Service image tag..."
                        sed -i \
                          "s|^  tag:.*|  tag: \\"${IMAGE_TAG}\\"|" \
                          helm/product/values.yaml

                        echo "Updating User Service image tag..."
                        sed -i \
                          "s|^  tag:.*|  tag: \\"${IMAGE_TAG}\\"|" \
                          helm/userservice/values.yaml

                        echo "Verifying updated tags..."

                        grep -q \
                          "tag: \\"${IMAGE_TAG}\\"" \
                          helm/adminserver/values.yaml

                        grep -q \
                          "tag: \\"${IMAGE_TAG}\\"" \
                          helm/product/values.yaml

                        grep -q \
                          "tag: \\"${IMAGE_TAG}\\"" \
                          helm/userservice/values.yaml

                        echo "Admin Server values:"
                        grep -A 3 "^image:" \
                          helm/adminserver/values.yaml

                        echo "Product Service values:"
                        grep -A 3 "^image:" \
                          helm/product/values.yaml

                        echo "User Service values:"
                        grep -A 3 "^image:" \
                          helm/userservice/values.yaml

                        git config user.name "Jenkins"
                        git config user.email "jenkins@local"

                        git add \
                          helm/adminserver/values.yaml \
                          helm/product/values.yaml \
                          helm/userservice/values.yaml

                        if git diff --cached --quiet; then
                            echo "No GitOps changes were detected."
                        else
                            git commit \
                              -m "Deploy shopping portal build ${IMAGE_TAG}"

                            git push \
                              origin \
                              "HEAD:${GITOPS_BRANCH}"

                            echo "GitOps repository updated successfully."
                        fi
                    '''
                }
            }
        }
    }

    post {
        always {
            junit(
                testResults: "${APP_DIR}/**/build/test-results/test/*.xml",
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

Argo CD should now detect the GitOps commit and synchronize the applications.
"""
        }

        failure {
            echo """
Pipeline failed.

Check the first failed stage:
1. Gradle build
2. Docker build
3. Docker Hub push
4. GitOps repository update
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