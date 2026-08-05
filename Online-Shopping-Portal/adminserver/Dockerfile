FROM eclipse-temurin:11-jdk-jammy AS builder

WORKDIR /workspace

COPY gradlew gradlew.bat build.gradle settings.gradle ./
COPY gradle ./gradle

RUN chmod +x gradlew

COPY src ./src

RUN ./gradlew clean bootJar --no-daemon

FROM eclipse-temurin:11-jre-jammy

WORKDIR /app

RUN groupadd --system spring \
    && useradd --system --gid spring spring

COPY --from=builder /workspace/build/libs/*.jar app.jar

USER spring:spring

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "/app/app.jar"]