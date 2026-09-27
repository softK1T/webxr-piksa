(ns leaderboard.core
  (:require [leaderboard.db :as db]
            [leaderboard.routes :as routes]
            [ring.adapter.jetty :as jetty])
  (:gen-class))

(defn -main [& _]
  (let [db-url (or (System/getenv "DATABASE_URL")
                   "jdbc:postgresql://db:5432/piksa?user=piksa&password=change-me")
        port   (Integer/parseInt (or (System/getenv "LB_PORT") "3000"))]
    (println (str "[leaderboard] connecting to db…"))
    (db/init! db-url)
    (db/migrate!)
    (println (str "[leaderboard] listening on port " port))
    (jetty/run-jetty (routes/app) {:port port :join? true})))
