FROM clojure:temurin-21-tools-deps-alpine
WORKDIR /app

# Cache deps first
COPY deps.edn .
RUN clojure -P

COPY src src

EXPOSE 3001
CMD ["clojure", "-M:run"]
