pipeline {
    agent any

    environment {
        APP_DIR = 'Online-Shopping-Portal'
        IMAGE_TAG = "${BUILD_NUMBER}"
        REGISTRY = 'your-dockerhub-username'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Admin Server') {
            steps {
                dir("${APP_DIR}/adminserver") {
                    sh '''
                        chmod +x gradlew
                        ./gradlew clean test bootJar --no-daemon
                    '''
                }
            }
        }

        stage('Build Product Service') {
            steps {
                dir("${APP_DIR}/product") {
                    sh '''
                        chmod +x gradlew
                        ./gradlew clean test bootJar --no-daemon
                    '''
                }
            }
        }

        stage('Build User Service') {
            steps {
                dir("${APP_DIR}/userservice") {
                    sh '''
                        chmod +x gradlew
                        ./gradlew clean test bootJar --no-daemon
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                    docker build \
                      -t ${REGISTRY}/shopping-adminserver:${IMAGE_TAG} \
                      ${APP_DIR}/adminserver

                    docker build \
                      -t ${REGISTRY}/shopping-product:${IMAGE_TAG} \
                      ${APP_DIR}/product

                    docker build \
                      -t ${REGISTRY}/shopping-userservice:${IMAGE_TAG} \
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
                          docker login -u "$DOCKER_USERNAME" \
                          --password-stdin

                        docker push ${REGISTRY}/shopping-adminserver:${IMAGE_TAG}
                        docker push ${REGISTRY}/shopping-product:${IMAGE_TAG}
                        docker push ${REGISTRY}/shopping-userservice:${IMAGE_TAG}

                        docker logout
                    '''
                }
            }
        }

        stage('Update GitOps Repository') {
            steps {
                echo 'Clone GitOps repository and update image tags here'
            }
        }
    }
}