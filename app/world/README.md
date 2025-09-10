# World Java Application

A simple Java Spring Boot application that responds with "World" messages.

## Building

```bash
mvn clean package
```

## Running Locally

```bash
java -jar target/world-app.jar
```

## Docker

```bash
docker build -t world-app .
docker run -p 8080:8080 world-app
```

## Endpoints

- `GET /` - Returns "World Hello!"
- `GET /health` - Health check endpoint