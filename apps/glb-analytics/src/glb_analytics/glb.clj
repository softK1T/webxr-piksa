(ns glb-analytics.glb
  "Parse a GLB (GL Transmission Format Binary) file and extract mesh statistics.
   GLB spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html"
  (:require [cheshire.core :as json])
  (:import (java.nio ByteBuffer ByteOrder)))

(def ^:private GLB-MAGIC 0x46546C67)
(def ^:private GLB-VERSION 2)
(def ^:private CHUNK-JSON 0x4E4F534A)
(def ^:private CHUNK-BIN  0x004E4942)

(defn- le-buf ^ByteBuffer [^bytes data]
  (doto (ByteBuffer/wrap data)
    (.order ByteOrder/LITTLE_ENDIAN)))

(defn parse [^bytes data]
  (when (< (alength data) 12)
    (throw (ex-info "File too small" {:size (alength data)})))
  (let [buf (le-buf data)
        magic   (.getInt buf)
        version (.getInt buf)
        _len    (.getInt buf)]
    (when (not= magic GLB-MAGIC)
      (throw (ex-info "Not a GLB file" {:magic (format "0x%X" magic)})))
    (when (not= version GLB-VERSION)
      (throw (ex-info "Unsupported GLB version" {:version version})))
    (loop [chunks {}]
      (if (< (.remaining buf) 8)
        chunks
        (let [chunk-len  (.getInt buf)
              chunk-type (.getInt buf)
              chunk-data (byte-array chunk-len)]
          (.get buf chunk-data)
          (recur
           (cond
             (= chunk-type CHUNK-JSON)
             (assoc chunks :json (json/parse-string (String. chunk-data "UTF-8") true))
             (= chunk-type CHUNK-BIN)
             (assoc chunks :bin-size chunk-len)
             :else chunks)))))))

(defn- count-triangles [gltf]
  (let [accessors (get gltf :accessors [])
        meshes    (get gltf :meshes [])]
    (reduce
     (fn [total prim]
       (let [idx-acc (:indices prim)
             mode    (get prim :mode 4)
             cnt     (when idx-acc (get-in accessors [idx-acc :count] 0))]
         (+ total (if (and idx-acc (= mode 4)) (quot cnt 3) 0))))
     0
     (mapcat :primitives meshes))))

(defn analyze [^bytes data]
  (let [chunks   (parse data)
        gltf     (get chunks :json {})
        bin-size (get chunks :bin-size 0)]
    {:file_size   (alength data)
     :bin_size    bin-size
     :meshes      (count (get gltf :meshes []))
     :primitives  (reduce + (map #(count (:primitives %)) (get gltf :meshes [])))
     :triangles   (count-triangles gltf)
     :materials   (count (get gltf :materials []))
     :textures    (count (get gltf :textures []))
     :images      (count (get gltf :images []))
     :animations  (count (get gltf :animations []))
     :nodes       (count (get gltf :nodes []))
     :skins       (count (get gltf :skins []))
     :extensions  (vec (keys (get gltf :extensionsUsed {})))}))
