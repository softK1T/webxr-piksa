FROM clojure:temurin-21-tools-deps-alpine AS build
WORKDIR /app
COPY deps.edn .
RUN clojure -P
COPY src src
RUN clojure -T:uberjar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/leaderboard.jar leaderboard.jar
EXPOSE 3000
CMD ["java", "-jar", "leaderboard.jar"]
