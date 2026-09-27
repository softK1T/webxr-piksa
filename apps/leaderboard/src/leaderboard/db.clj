(ns leaderboard.db
  (:require [next.jdbc :as jdbc]
            [next.jdbc.result-set :as rs]
            [honey.sql :as sql]))

(defonce ^:private ds (atom nil))

(defn init! [db-url]
  (reset! ds (jdbc/get-datasource db-url)))

(defn ds [] @ds)

;; ── schema ────────────────────────────────────────────────────────────────────

(def create-table-sql
  "CREATE TABLE IF NOT EXISTS leaderboard (
     id         SERIAL PRIMARY KEY,
     user_id    INTEGER NOT NULL,
     login      TEXT    NOT NULL,
     time_sec   INTEGER NOT NULL CHECK (time_sec > 0),
     mistakes   INTEGER NOT NULL DEFAULT 0 CHECK (mistakes >= 0),
     finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );")

(defn migrate! []
  (jdbc/execute! (ds) [create-table-sql]))

;; ── queries ───────────────────────────────────────────────────────────────────

(defn insert-result! [user-id login time-sec mistakes]
  (jdbc/execute-one!
   (ds)
   (sql/format {:insert-into :leaderboard
                :values      [{:user_id    user-id
                               :login      login
                               :time_sec   time-sec
                               :mistakes   mistakes}]})
   {:builder-fn rs/as-unqualified-maps}))

(defn top10 []
  (jdbc/execute!
   (ds)
   (sql/format {:select   [:login :time_sec :mistakes :finished_at]
                :from     [:leaderboard]
                :order-by [[:time_sec :asc] [:mistakes :asc]]
                :limit    10})
   {:builder-fn rs/as-unqualified-maps}))

(defn user-results [user-id]
  (jdbc/execute!
   (ds)
   (sql/format {:select   [:time_sec :mistakes :finished_at]
                :from     [:leaderboard]
                :where    [:= :user_id user-id]
                :order-by [[:finished_at :desc]]
                :limit    20})
   {:builder-fn rs/as-unqualified-maps}))
