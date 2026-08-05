pipeline {
    agent any

    environment {
        APP_DIR = 'Online-Shopping-Portal'

        REGISTRY = 'your-dockerhub-username'

        ADMIN_IMAGE = "${REGISTRY}/shopping-adminserver"
        PRODUCT_IMAGE = "${REGISTRY}/shopping-product"
        USER_IMAGE = "${REGISTRY}/shopping-userservice"

        IMAGE_TAG = "${BUILD_NUMBER}"
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
                sh """
                    docker build \
                      -t ${ADMIN_IMAGE}:${IMAGE_TAG} \
                      ${APP_DIR}/adminserver

                    docker build \
                      -t ${PRODUCT_IMAGE}:${IMAGE_TAG} \
                      ${APP_DIR}/product

                    docker build \
                      -t ${USER_IMAGE}:${IMAGE_TAG} \
                      ${APP_DIR}/userservice
                """
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
                        echo "$DOCKER_PASSWORD" |
                        docker login \
                          -u "$DOCKER_USERNAME" \
                          --password-stdin

                        docker push ${ADMIN_IMAGE}:${IMAGE_TAG}
                        docker push ${PRODUCT_IMAGE}:${IMAGE_TAG}
                        docker push ${USER_IMAGE}:${IMAGE_TAG}

                        docker logout
                    '''
                }
            }
        }
    }
}