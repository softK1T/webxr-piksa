(ns glb-analytics.core
  (:require [glb-analytics.routes :as routes]
            [ring.adapter.jetty :as jetty])
  (:gen-class))

(defn -main [& _]
  (let [port (Integer/parseInt (or (System/getenv "GLB_PORT") "3001"))]
    (println (str "[glb-analytics] listening on port " port))
    (jetty/run-jetty (routes/app) {:port port :join? true})))
