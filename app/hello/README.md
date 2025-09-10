# Hello Java Application

A simple Java Spring Boot application that responds with "Hello" messages.

## Building

```bash
mvn clean package
```

## Running Locally

```bash
java -jar target/hello-app.jar
```

## Docker

```bash
docker build -t hello-app .
docker run -p 8080:8080 hello-app
```

## Endpoints

- `GET /` - Returns "Hello World!"
- `GET /health` - Health check endpoint