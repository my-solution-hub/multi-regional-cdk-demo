# Dockerfile for Hello Java Application
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy the application JAR
COPY target/hello-app.jar app.jar

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]