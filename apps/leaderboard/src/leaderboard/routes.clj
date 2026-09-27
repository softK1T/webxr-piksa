(ns leaderboard.routes
  (:require [leaderboard.db :as db]
            [muuntaja.core :as m]
            [reitit.ring :as ring]
            [reitit.ring.middleware.muuntaja :as muuntaja]
            [ring.middleware.cors :refer [wrap-cors]]))

(defn- ok [body] {:status 200 :body body})
(defn- bad [msg] {:status 400 :body {:error msg}})

(def ^:private router
  (ring/router
   [["/health" {:get (fn [_] (ok {:status "ok"}))}]

    ["/leaderboard"
     {:get (fn [_] (ok {:results (db/top10)}))}]

    ["/leaderboard/user/:user-id"
     {:get (fn [{:keys [path-params]}]
             (let [uid (parse-long (:user-id path-params))]
               (if uid
                 (ok {:results (db/user-results uid)})
                 (bad "invalid user-id"))))}]

    ["/results"
     {:post (fn [{:keys [body-params]}]
              (let [{:keys [user_id login time_sec mistakes]} body-params]
                (cond
                  (not (pos-int? user_id))  (bad "user_id must be a positive integer")
                  (not (string? login))     (bad "login is required")
                  (not (pos-int? time_sec)) (bad "time_sec must be a positive integer")
                  :else
                  (do (db/insert-result! user_id login time_sec (or mistakes 0))
                      {:status 201 :body {:ok true}}))))}]]
   {:data {:muuntaja   m/instance
           :middleware [muuntaja/format-middleware]}}))

(defn app []
  (-> (ring/ring-handler router
                         (ring/create-default-handler))
      (wrap-cors :access-control-allow-origin  [#".*"]
                 :access-control-allow-methods [:get :post]
                 :access-control-allow-headers ["Content-Type"])))
