(ns glb-analytics.routes
  (:require [glb-analytics.glb :as glb]
            [muuntaja.core :as m]
            [reitit.ring :as ring]
            [reitit.ring.middleware.muuntaja :as muuntaja]
            [ring.middleware.cors :refer [wrap-cors]]))

(def ^:private MAX-SIZE (* 50 1024 1024)) ; 50 MB

(defn- ok  [body] {:status 200 :body body})
(defn- err [code msg] {:status code :body {:error msg}})

(def ^:private router
  (ring/router
   [["/health"
     {:get (fn [_] (ok {:status "ok" :service "glb-analytics"}))}]

    ["/analyze"
     {:post
      (fn [req]
        (let [body    (slurp (:body req))
              ^bytes data (.getBytes ^String body "ISO-8859-1")]
          (cond
            (> (alength data) MAX-SIZE)
            (err 413 (str "File too large. Max " (/ MAX-SIZE 1024 1024) " MB"))
            :else
            (try
              (ok (glb/analyze data))
              (catch clojure.lang.ExceptionInfo ex
                (err 422 (ex-message ex)))
              (catch Exception ex
                (err 500 (str "Parse error: " (ex-message ex))))))))}]]
   {:data {:muuntaja   m/instance
           :middleware [muuntaja/format-middleware]}}))

(defn app []
  (-> (ring/ring-handler router (ring/create-default-handler))
      (wrap-cors :access-control-allow-origin  [#".*"]
                 :access-control-allow-methods [:get :post :options]
                 :access-control-allow-headers ["Content-Type"])))
