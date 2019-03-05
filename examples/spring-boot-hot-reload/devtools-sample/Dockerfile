FROM maven:3.5.2-jdk-8-alpine AS build
WORKDIR /app

COPY pom.xml /app/pom.xml
RUN mvn dependency:resolve

COPY src /app/src
ENTRYPOINT ["mvn", "spring-boot:run"]

EXPOSE 8080
