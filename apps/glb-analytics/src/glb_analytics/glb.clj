(ns glb-analytics.glb
  "Parse a GLB (GL Transmission Format Binary) file and extract mesh statistics.
   GLB spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification"
  (:require [clojure.data.json :as json])
  (:import (java.nio ByteBuffer ByteOrder)))

(def ^:private GLB-MAGIC 0x46546C67) ; 'glTF'
(def ^:private GLB-VERSION 2)
(def ^:private CHUNK-JSON 0x4E4F534A)
(def ^:private CHUNK-BIN  0x004E4942)

(defn- le-buf ^ByteBuffer [^bytes data]
  (doto (ByteBuffer/wrap data)
    (.order ByteOrder/LITTLE_ENDIAN)))

(defn parse
  "Given a byte array, returns a map with :json-chunk (parsed map) and :bin-size (bytes).
   Throws ex-info on malformed input."
  [^bytes data]
  (when (< (alength data) 12)
    (throw (ex-info "File too small to be a valid GLB" {:size (alength data)})))
  (let [buf (le-buf data)]
    (let [magic   (.getInt buf)
          version (.getInt buf)
          _length (.getInt buf)]
      (when (not= magic GLB-MAGIC)
        (throw (ex-info "Not a GLB file (bad magic bytes)" {:magic (format "0x%X" magic)})))
      (when (not= version GLB-VERSION)
        (throw (ex-info "Unsupported GLB version" {:version version}))))
    ;; Read chunks
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
             (assoc chunks :json (json/read-str (String. chunk-data "UTF-8") :key-fn keyword))
             (= chunk-type CHUNK-BIN)
             (assoc chunks :bin-size chunk-len)
             :else chunks)))))))

(defn- count-triangles
  "Sum triangle counts across all mesh primitives.
   Each primitive's accessor gives element count; for TRIANGLES mode divide by 3 not needed
   because glTF indices count is already the number of indices (triangles = indices/3)."
  [gltf]
  (let [accessors (get gltf :accessors [])
        meshes    (get gltf :meshes [])]
    (reduce
     (fn [total prim]
       (let [idx-acc (get prim :indices)
             mode    (get prim :mode 4)  ; 4 = TRIANGLES
             count   (when idx-acc (get-in accessors [idx-acc :count] 0))]
         (+ total
            (cond
              (nil? idx-acc) 0
              (= mode 4) (quot count 3)
              :else 0))))
     0
     (mapcat :primitives meshes))))

(defn analyze
  "Parse raw GLB bytes and return analytics map."
  [^bytes data]
  (let [chunks   (parse data)
        gltf     (get chunks :json {})
        bin-size (get chunks :bin-size 0)]
    {:file-size   (alength data)
     :bin-size    bin-size
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
