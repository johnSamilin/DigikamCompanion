# Semantic Image Search — rclip research notes (Android / 9x15)

**Status:** feasibility study, no implementation decision yet. Resumed from an analysis of
[rclip](https://github.com/yurijmikhalevich/rclip) v4.1.3 (MIT) on 2026-11-19. English by
request; relates to the desktop scope in [multiplatform-ubuntu.md](multiplatform-ubuntu.md).

## How rclip works (verified in source)

- Pipeline: CLIP embeddings + per-directory SQLite index + brute-force cosine similarity.
  No server; no torch at runtime (torch/open_clip are dev-only, for model export).
- Model: OpenCLIP `ViT-B-32-256` checkpoint `datacomp_s34b_b86k`
  (= `laion/CLIP-ViT-B-32-256x256-DataComp-s34B-b86K`, trained on DataComp-1B), 512-dim
  embeddings, 256px input. Exported to ONNX + Core ML, hosted at
  HF `yurijmikhalevich/rclip-models`. Older rclip used `ViT-B-32-quickgelu`/OpenAI weights;
  index DB version 4 switched to DataComp (see `rclip/db.py` migration — version bump
  forces a full re-index).
- Runtime: ONNX Runtime CPUExecutionProvider (Linux/Windows); Core ML with
  `ComputeUnit.ALL` for the visual index encoder on macOS (hence Apple-Silicon-only support).
  Telemetry explicitly disabled (`ORT_DISABLE_TELEMETRY=1` before importing onnxruntime).
- Index (SQLite): `images(id, deleted, filepath UNIQUE, modified_at, size, vector BLOB, hash)`,
  ~2.2 KB per image; `hash` = SHA-256 of first 1 MB + last 1 KB for rename/duplicate detection.
  Incremental updates via mtime+size. Mixing text/image queries is vector arithmetic
  (`+`/`-` with `2:weight` prefixes) on L2-normalized vectors.
- "Fully local" is accurate with three caveats: one-time model download from Hugging Face on
  first run (cache paths configurable via `RCLIP_DATADIR` / `RCLIP_MODEL_CACHE_DIR`);
  image-URL queries are downloaded (50 MB cap); the TUI can download a result image.
  Photos and embeddings never leave the machine.
- Quality expectation: typical DataComp ViT-B/32 — good at objects, scenes, gross attributes;
  weak at counting, in-image text, fine distinctions. Scores (~0.25–0.3 = good match) are
  only comparable within one query.

## Model artifact sizes (fp32, checked via HF API)

| File | Size |
|---|---|
| `visual.onnx` | 351.8 MB |
| `textual.onnx` | 254.3 MB |
| `bpe_simple_vocab_16e6.txt.gz` | ~1.3 MB |
| `visual.mlpackage` | Core ML, macOS only |

fp16/int8 quantization roughly halves/quarters these; an int8 text encoder at 60–90 MB is
realistic for phone delivery.

## Integration options for 9x15 (Digikam DB + Syncthing pipeline)

### Option A — desktop indexes, phone searches (recommended starting point)

1. Python script on the desktop (reuse rclip's ONNX artifacts or read its SQLite index)
   exports 512-dim vectors keyed by **`images.id` from `digikam4.db`** — never by absolute
   paths (server paths vs SAF URIs on Android will never match; digikam ids are stable and
   already used in `DigikamLibrary.kt`). It can index digikam 256px thumbnails: the model
   input is 256×256, so quality loss is minimal and indexing is far faster than decoding
   originals.
2. The index travels to the phone via the existing Syncthing pipeline
   (~2 KB/photo → 50k photos ≈ 100 MB; trivial for Syncthing).
3. The phone runs only the **text encoder** (quantized) + a Kotlin port of rclip's
   `SimpleTokenizer` (~150 LOC plain BPE merge) + a cosine scan; results merge into the
   existing tag/album filtering.
- Pros: same embedding space as desktop rclip (comparable scores, thresholds portable);
  zero phone indexing cost; no HEIC/RAW decoding pain on Android.
- Con: no image-to-image search on the phone (that needs the visual encoder).
- Pairs well with the multiplatform plan: the same sidecar index works on the Ubuntu desktop
  target, where the app already reads `digikam4.db` and photos by absolute path.

### Option B — fully on-device

- ONNX Runtime Mobile (`com.microsoft.onnxruntime:onnxruntime-android`; current minSdk 26 is
  fine) + a WorkManager incremental indexer over the synced folder.
- Prefer **Apple MobileCLIP2 S/B** (ONNX export from `apple/ml-mobileclip`, tens of MB,
  near ViT-B/32 quality, 2–4× faster) over rclip's fp32 visual model. ~30–80 ms/image on
  SD 8-gen → indexing 50k photos takes 30–60 minutes once, then incremental.
- Pros: self-contained; enables image-to-image ("similar photos").
- Con: different embedding space — incompatible with desktop rclip and with any precomputed
  index; re-index required per model choice.

### Option C — ML Kit Embeddings + AppSearch (watch, don't commit)

- Preview `com.google.mlkit:genai-embedding` (EmbeddingGemma 2, 768-dim, text+image, NPU via
  AICore) + AndroidX AppSearch cosine ranking; zero APK bloat.
- But: requires the AICore Developer Preview program and recent devices; Google's own docs
  say a model version change forces a **full re-index** — fragile for a synced library.
  Re-evaluate in ~a year.

## Implementation-day gotchas

- Do **not** write vectors into the synced `digikam4.db` — it is owned by Digikam's
  schema/migrations and gets overwritten by sync. Use a separate app-owned `semantic.db`
  (or a synced sidecar index for Option A).
- Framework `SQLiteDatabase` (used today in `DigikamLibrary.kt` / `DigikamThumbnailStore.kt`)
  cannot load SQLite extensions → no `sqlite-vec`. Either plain-Kotlin brute-force cosine
  (fine at our scale: 50k×512 ≈ tens of millions of MACs, hundreds of ms) or move to
  androidx.sqlite `BundledSQLiteDriver` if a vec extension is wanted. (The multiplatform
  plan's JDBC `org.xerial:sqlite-jdbc` desktop path *can* load extensions.)
- Store `model_hash` + index version inside the index and require re-index on mismatch
  (rclip does this via `DB.VERSION`).
- Scores are relative within one query — show top-N with a similarity indicator, don't cut
  on an absolute threshold; hybrid tag/keyword + semantic ranking is the sweet spot.
- Faces: CLIP-family models are unsuitable for face matching — digikam face crops would need
  a separate MobileFaceNet/ArcFace embedding if ever wanted.
