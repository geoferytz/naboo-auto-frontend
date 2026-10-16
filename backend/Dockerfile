# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S naboo && adduser -S naboo -G naboo
WORKDIR /app
COPY --from=build /app/target/naboo-backend-*.jar app.jar
RUN mkdir -p /app/data/uploads && chown -R naboo:naboo /app
USER naboo
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
