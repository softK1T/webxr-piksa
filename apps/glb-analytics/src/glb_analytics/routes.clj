(ns glb-analytics.routes
  (:require [glb-analytics.glb :as glb]
            [cheshire.core :as json]
            [reitit.ring :as ring]
            [ring.middleware.cors :refer [wrap-cors]]))

(def ^:private MAX-SIZE (* 50 1024 1024)) ; 50 MB

(defn- ok  [body] {:status 200
                   :headers {"Content-Type" "application/json"}
                   :body (json/generate-string body)})
(defn- err [code msg] {:status code
                       :headers {"Content-Type" "application/json"}
                       :body (json/generate-string {:error msg})})

(defn- read-bytes [^java.io.InputStream is]
  (let [bos (java.io.ByteArrayOutputStream.)]
    (let [buf (byte-array 8192)]
      (loop []
        (let [n (.read is buf)]
          (when (pos? n)
            (.write bos buf 0 n)
            (recur)))))
    (.toByteArray bos)))

(defn- handler [req]
  (let [^java.io.InputStream body (:body req)]
    (if (nil? body)
      (err 400 "No file uploaded")
      (let [^bytes data (read-bytes body)]
        (cond
          (zero? (alength data))
          (err 400 "Empty file")

          (> (alength data) MAX-SIZE)
          (err 413 (str "File too large. Max " (/ MAX-SIZE 1024 1024) " MB"))

          :else
          (try
            (ok (glb/analyze data))
            (catch clojure.lang.ExceptionInfo ex
              (err 422 (ex-message ex)))
            (catch Exception ex
              (err 500 (str "Parse error: " (ex-message ex))))))))))

(defn app []
  (-> (ring/ring-handler
       (ring/router
        [["/health" {:get (fn [_] (ok {:status "ok" :service "glb-analytics"}))}]
         ["/analyze" {:post handler}]])
       (ring/create-default-handler))
      (wrap-cors :access-control-allow-origin  [#".*"]
                 :access-control-allow-methods [:get :post :options]
                 :access-control-allow-headers ["Content-Type"])))
