pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        APP_DIR = 'Online-Shopping-Portal'

        REGISTRY = 'ziazeshan141'

        ADMIN_IMAGE = "${REGISTRY}/shopping-adminserver"
        PRODUCT_IMAGE = "${REGISTRY}/shopping-product"
        USER_IMAGE = "${REGISTRY}/shopping-userservice"

        IMAGE_TAG = "${BUILD_NUMBER}"

        GITOPS_REPOSITORY = 'git@github.com:ziazeshan141/shopping-portal-gitops.git'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Gradle Applications') {
            parallel {
                stage('Admin Server') {
                    steps {
                        dir("${APP_DIR}/adminserver") {
                            sh '''
                                set -e

                                chmod +x gradlew
                                ./gradlew clean test bootJar --no-daemon
                            '''
                        }
                    }
                }

                stage('Product Service') {
                    steps {
                        dir("${APP_DIR}/product") {
                            sh '''
                                set -e

                                chmod +x gradlew
                                ./gradlew clean test bootJar --no-daemon
                            '''
                        }
                    }
                }

                stage('User Service') {
                    steps {
                        dir("${APP_DIR}/userservice") {
                            sh '''
                                set -e

                                chmod +x gradlew
                                ./gradlew clean test bootJar --no-daemon
                            '''
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -e

                    docker build \
                      -t "${ADMIN_IMAGE}:${IMAGE_TAG}" \
                      "${APP_DIR}/adminserver"

                    docker build \
                      -t "${PRODUCT_IMAGE}:${IMAGE_TAG}" \
                      "${APP_DIR}/product"

                    docker build \
                      -t "${USER_IMAGE}:${IMAGE_TAG}" \
                      "${APP_DIR}/userservice"

                    echo "Docker images created:"
                    docker images | grep "shopping-"
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
                    sh '''
                        set -e

                        echo "$DOCKER_PASSWORD" |
                        docker login \
                          -u "$DOCKER_USERNAME" \
                          --password-stdin

                        docker push "${ADMIN_IMAGE}:${IMAGE_TAG}"
                        docker push "${PRODUCT_IMAGE}:${IMAGE_TAG}"
                        docker push "${USER_IMAGE}:${IMAGE_TAG}"

                        docker logout
                    '''
                }
            }
        }

        stage('Update GitOps Repository') {
            steps {
                sshagent(credentials: ['gitops-ssh-key']) {
                    sh '''
                        set -e

                        rm -rf shopping-portal-gitops

                        mkdir -p "$HOME/.ssh"
                        chmod 700 "$HOME/.ssh"

                        if ! ssh-keygen -F github.com > /dev/null; then
                            ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts"
                        fi

                        chmod 600 "$HOME/.ssh/known_hosts"

                        git clone \
                          --branch main \
                          "$GITOPS_REPOSITORY" \
                          shopping-portal-gitops

                        cd shopping-portal-gitops

                        sed -i \
                          "s|^  tag:.*|  tag: \\"${IMAGE_TAG}\\"|" \
                          helm/adminserver/values.yaml

                        sed -i \
                          "s|^  tag:.*|  tag: \\"${IMAGE_TAG}\\"|" \
                          helm/product/values.yaml

                        sed -i \
                          "s|^  tag:.*|  tag: \\"${IMAGE_TAG}\\"|" \
                          helm/userservice/values.yaml

                        echo "Admin Server image:"
                        grep -A 3 "^image:" helm/adminserver/values.yaml

                        echo "Product Service image:"
                        grep -A 3 "^image:" helm/product/values.yaml

                        echo "User Service image:"
                        grep -A 3 "^image:" helm/userservice/values.yaml

                        git config user.name "Jenkins"
                        git config user.email "jenkins@local"

                        git add \
                          helm/adminserver/values.yaml \
                          helm/product/values.yaml \
                          helm/userservice/values.yaml

                        if git diff --cached --quiet; then
                            echo "No GitOps changes found."
                        else
                            git commit \
                              -m "Deploy shopping portal build ${IMAGE_TAG}"

                            git push origin HEAD:main
                        fi
                    '''
                }
            }
        }
    }

    post {
        success {
            echo """
            Pipeline completed successfully.

            Published images:
            ${ADMIN_IMAGE}:${IMAGE_TAG}
            ${PRODUCT_IMAGE}:${IMAGE_TAG}
            ${USER_IMAGE}:${IMAGE_TAG}

            GitOps repository updated with tag:
            ${IMAGE_TAG}
            """
        }

        failure {
            echo 'Pipeline failed. Review the failed Jenkins stage.'
        }

        always {
            sh 'docker logout || true'
        }
    }
}