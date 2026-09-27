FROM clojure:temurin-21-tools-deps-alpine AS build
WORKDIR /app
COPY deps.edn .
RUN clojure -P
COPY src src
RUN clojure -T:uberjar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/glb-analytics.jar glb-analytics.jar
EXPOSE 3001
CMD ["java", "-jar", "glb-analytics.jar"]
