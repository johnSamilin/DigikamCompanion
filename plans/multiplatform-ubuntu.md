# 9x15 Multiplatform Build Plan

**Goal:** migrate 9x15 from an Android-only project to a Kotlin Multiplatform application that builds the current Android APK and an installable Ubuntu `amd64` `.deb` package.

**Architecture:** the shared Compose Multiplatform UI and application logic live in the `composeApp` module. File-system access, settings, SQLite, directory selection, and the system share dialog are represented by small interfaces in `commonMain` and implemented separately for Android and JVM Desktop. The Ubuntu target uses Compose Desktop and is packaged by `org.jetbrains.compose`, without Electron, WebView, or an auxiliary runtime server.

**Tech Stack:** Kotlin Multiplatform, Compose Multiplatform, Gradle Kotlin DSL, Android Gradle Plugin, Compose Desktop/JVM, JDBC SQLite (`org.xerial:sqlite-jdbc`), `java.util.prefs.Preferences`, Kotlin coroutines, JUnit 5.

## First Release Scope

- Target platforms: Android API 26+ and Ubuntu 22.04+ `x86_64` (`amd64`).
- Artifacts: Android debug/release APKs and an Ubuntu `.deb`; AppImage, RPM, macOS, and Windows are outside the first release but must not require changes to shared code.
- On Ubuntu, the user selects a directory containing `digikam4.db`; the application reads it and its associated photos directly through absolute paths.
- Existing scenarios are supported: photo list, date filtering, tag/album filtering, full-screen viewing, zoom, multi-selection, copy, and system share.
- Do not use Android APIs, AndroidX UI classes, `Context`, `Uri`, or `SQLiteDatabase` in `commonMain`.
- Do not transfer Android `SharedPreferences` or the Storage Access Framework into desktop code. The persisted Android URI remains only in the Android implementation; desktop stores an absolute path.
- Do not release a package until a smoke test confirms `.deb` installation, application launch, and reading a test digiKam library on Ubuntu.

## Target Structure

```text
9x15/
  composeApp/
    build.gradle.kts
    src/
      commonMain/kotlin/ru/example/ninexfifteen/
        App.kt
        model/LibraryModels.kt
        data/LibraryRepository.kt
        data/SettingsRepository.kt
        data/ThumbnailRepository.kt
        platform/PlatformServices.kt
        presentation/AppState.kt
        presentation/AppViewModel.kt
        ui/HomeScreen.kt
        ui/FilterScreen.kt
        ui/ViewerScreen.kt
        ui/theme/PunkTheme.kt
      commonTest/kotlin/ru/example/ninexfifteen/
        presentation/AppViewModelTest.kt
        data/FakeRepositories.kt
      androidMain/kotlin/ru/example/ninexfifteen/
        MainActivity.kt
        AndroidLibraryRepository.kt
        AndroidSettingsRepository.kt
        AndroidThumbnailRepository.kt
        AndroidPlatformServices.kt
      desktopMain/kotlin/ru/example/ninexfifteen/
        main.kt
        DesktopLibraryRepository.kt
        DesktopSettingsRepository.kt
        DesktopThumbnailRepository.kt
        DesktopPlatformServices.kt
      desktopTest/kotlin/ru/example/ninexfifteen/
        DesktopLibraryRepositoryTest.kt
  app/                                  # removed after migrating the Android target
  build.gradle.kts
  settings.gradle.kts
  gradle/libs.versions.toml
  README.md
  .github/workflows/build.yml
```

`composeApp` replaces `app`: it is a single Gradle module with `androidTarget()` and `jvm("desktop")`. This keeps a single build entry point and allows additional desktop targets to be added incrementally without duplicating the UI or data model.

## Shared-Layer Contracts

```kotlin
data class Library(
    val statistics: Statistics,
    val photos: List<Photo>,
    val thumbnailSource: ThumbnailSource?,
)

data class Statistics(val photos: Int, val albums: Int, val tags: Int)
data class Photo(
    val relativePath: String,
    val date: LocalDate?,
    val uniqueHash: String?,
    val fileSize: Long,
)
data class Tag(val id: Long, val parentId: Long?, val name: String)
data class Album(val id: Long, val rootId: Long, val relativePath: String)

interface LibraryRepository {
    suspend fun load(filters: LibraryFilters): Library?
    suspend fun loadTags(): List<Tag>
    suspend fun loadAlbums(): List<Album>
}

interface SettingsRepository {
    fun load(): SavedSettings
    fun save(settings: SavedSettings)
}

interface PlatformServices {
    suspend fun chooseRootDirectory(): String?
    suspend fun chooseCopyDestination(): String?
    fun share(files: List<String>)
}
```

`LibraryFilters` contains `tagIds`, `albumIds`, and an optional date range. `SavedSettings` stores `rootDirectory`, `selectedTagIds`, and `selectedAlbumIds`. `ThumbnailSource` hides the difference between an Android cache file and the desktop path to the thumbnails database.

## Tasks

### Task 1: Establish the Multiplatform Gradle Build

**Files:**
- Create: `gradle/libs.versions.toml`
- Create: `composeApp/build.gradle.kts`
- Modify: `settings.gradle.kts`
- Modify: `build.gradle.kts`
- Remove after successful migration: `app/`

**Deliverable:** `./gradlew :composeApp:assembleDebug`, `./gradlew :composeApp:compileKotlinDesktop`, and `./gradlew :composeApp:packageDeb` are supported commands.

- [ ] Add a consistent set of Kotlin, Compose Multiplatform, AGP, coroutines, `sqlite-jdbc`, and JUnit 5 versions to the version catalog. Select versions compatible with both the Gradle wrapper and JDK 17; define them only in `libs.versions.toml`.
- [ ] Replace the `:app` inclusion with `:composeApp` in `settings.gradle.kts` and apply plugin aliases in the root `build.gradle.kts`.
- [ ] Configure `composeApp` with `androidTarget()` (minSdk 26, compileSdk 35, and the namespace/applicationId from the current `app/build.gradle.kts`) and `jvm("desktop")` using JDK 17.
- [ ] Configure the Android APK and Compose Desktop native distributions. Set `packageName = "9x15"`, source `packageVersion` from one Gradle property, and set `TargetFormat.Deb`, `linux.deb.maintainer`, `linux.deb.packageName = "9x15"`, and `modules("java.sql")`.
- [ ] Run `./gradlew :composeApp:assembleDebug :composeApp:compileKotlinDesktop`.
- [ ] Run `./gradlew :composeApp:packageDeb` on a Linux x86_64 runner. Expected file: `composeApp/build/compose/binaries/main/deb/9x15_<version>_amd64.deb`.
- [ ] Create commit `build: add Kotlin Multiplatform Android and desktop targets`.

### Task 2: Extract Platform-Independent Models and State

**Files:**
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/model/LibraryModels.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/data/LibraryRepository.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/data/SettingsRepository.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/platform/PlatformServices.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/presentation/AppState.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/presentation/AppViewModel.kt`
- Create: `composeApp/src/commonTest/kotlin/ru/example/ninexfifteen/data/FakeRepositories.kt`
- Create: `composeApp/src/commonTest/kotlin/ru/example/ninexfifteen/presentation/AppViewModelTest.kt`

**Deliverable:** the rules for loading, resetting filters, and selecting photos do not depend on Android or desktop APIs.

- [ ] Write test `resetFilters clears saved tag, album and date filters`: the fake repository receives an empty `LibraryFilters`, and `AppState` contains no active filter.
- [ ] Write test `selecting a parent tag selects every descendant`: `AppViewModel.toggleTag` adds child tag IDs, matching the current `FilterActivity.toggleTag` behavior.
- [ ] Run `./gradlew :composeApp:allTests`; tests must fail because the contracts and view model do not exist yet.
- [ ] Create immutable data classes from the current `DigikamLibrary.Library`, `Statistics`, `Photo`, `Tag`, and `Album`; add `LibraryFilters` and `SavedSettings`.
- [ ] Create `LibraryRepository`, `SettingsRepository`, `ThumbnailRepository`, and `PlatformServices` contracts plus the `AppViewModel` dependencies; every read operation must be `suspend`.
- [ ] Implement `AppViewModel` with one `StateFlow<AppState>`. It loads settings and the library, applies filters, stores selected paths, and presents loading and errors as state data rather than Android views.
- [ ] Run `./gradlew :composeApp:allTests`; expected result: PASS.
- [ ] Create commit `feat: add shared library state and contracts`.

### Task 3: Implement Desktop digiKam Access and Settings

**Files:**
- Create: `composeApp/src/desktopMain/kotlin/ru/example/ninexfifteen/DesktopLibraryRepository.kt`
- Create: `composeApp/src/desktopMain/kotlin/ru/example/ninexfifteen/DesktopThumbnailRepository.kt`
- Create: `composeApp/src/desktopMain/kotlin/ru/example/ninexfifteen/DesktopSettingsRepository.kt`
- Create: `composeApp/src/desktopMain/kotlin/ru/example/ninexfifteen/DesktopPlatformServices.kt`
- Create: `composeApp/src/desktopTest/kotlin/ru/example/ninexfifteen/DesktopLibraryRepositoryTest.kt`

**Deliverable:** the desktop target reads a local digiKam library without Android URIs and does not modify its SQLite files.

- [ ] Create a temporary SQLite fixture with `Images`, `Albums`, `Tags`, `ImageInformation`, and `ImageTags` tables; write tests for photo ordering, tag/album filtering, and excluding `_Digikam_*` from the counter.
- [ ] Run `./gradlew :composeApp:desktopTest`; expected result: FAIL.
- [ ] Implement `DesktopLibraryRepository` with read-only JDBC SQLite. Recursively find `digikam4.db` in the selected root directory, execute parameterized versions of the current `DigikamLibrary` queries, and close `Connection`, `PreparedStatement`, and `ResultSet` with `use`.
- [ ] Implement `DesktopThumbnailRepository`: look for `thumbnails-digikam.db` next to the core database, then below root; extract the blob first by file path, then by `uniqueHash` and `fileSize`.
- [ ] Implement `DesktopSettingsRepository` using `Preferences.userRoot().node("ru/example/ninexfifteen")`. Persist the absolute `rootDirectory`, selected tag IDs, and selected album IDs; never persist user photos or database copies.
- [ ] Implement `DesktopPlatformServices` with `FileDialog` or a Compose file picker for directory selection, `Desktop.getDesktop().open` for the destination directory, and `Desktop.getDesktop().mail` only when supported. If system share is unavailable, the UI must offer to open the directory containing selected files rather than falsely report success.
- [ ] Run `./gradlew :composeApp:desktopTest`; expected result: PASS.
- [ ] Create commit `feat: add desktop digiKam adapters`.

### Task 4: Migrate the Interface to Compose Multiplatform

**Files:**
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/App.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/ui/HomeScreen.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/ui/FilterScreen.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/ui/ViewerScreen.kt`
- Create: `composeApp/src/commonMain/kotlin/ru/example/ninexfifteen/ui/theme/PunkTheme.kt`
- Create: `composeApp/src/androidMain/kotlin/ru/example/ninexfifteen/MainActivity.kt`
- Create: `composeApp/src/desktopMain/kotlin/ru/example/ninexfifteen/main.kt`
- Remove after parity verification: `app/src/main/java/ru/example/ninexfifteen/*.kt`

**Deliverable:** Android and Ubuntu launch the same Compose UI and provide the same user scenarios.

- [ ] Write a Compose UI test for HomeScreen: when `isLoading = true`, a loading state exists; on error, the error text exists; with two selected photos, `Share` and `Copy` are available.
- [ ] Write a Compose UI test for FilterScreen: system tags are not shown, and toggling a parent tag changes every descendant's state.
- [ ] Run `./gradlew :composeApp:allTests`; expected result: FAIL until the screens exist.
- [ ] Implement `PunkTheme` by moving the color palette, contrasting borders, and typography from `PunkStyle.kt` to Compose `MaterialTheme`, `Modifier.border`, and composable controls. Do not copy Android `View` classes or drawable XML.
- [ ] Implement `HomeScreen`: adaptive photo grid, counter, select/unselect, date selection, filter navigation, root-directory settings, and loading status. Use `LazyVerticalGrid`; load images off the main thread and cancel loads for items that leave the screen.
- [ ] Implement `FilterScreen` with Tags/Albums tabs, search, tree indentation, and cascading descendant selection.
- [ ] Implement `ViewerScreen`: navigation through the current photo set, image zoom and pan, file path, and share. The behavior matches `PhotoSliderActivity` and `ZoomImageView`; Android-specific `FileProvider` stays in the Android adapter.
- [ ] Connect Android `MainActivity` to `setContent { NineByFifteenApp(...) }` and desktop `main()` to `application { Window { NineByFifteenApp(...) } }`. Inject the corresponding port implementations from tasks 3 and 5.
- [ ] Run `./gradlew :composeApp:allTests :composeApp:assembleDebug :composeApp:compileKotlinDesktop`; expected result: PASS.
- [ ] Create commit `feat: migrate 9x15 UI to Compose Multiplatform`.

### Task 5: Implement Android Adapters Without Regressing File Access

**Files:**
- Create: `composeApp/src/androidMain/kotlin/ru/example/ninexfifteen/AndroidLibraryRepository.kt`
- Create: `composeApp/src/androidMain/kotlin/ru/example/ninexfifteen/AndroidThumbnailRepository.kt`
- Create: `composeApp/src/androidMain/kotlin/ru/example/ninexfifteen/AndroidSettingsRepository.kt`
- Create: `composeApp/src/androidMain/kotlin/ru/example/ninexfifteen/AndroidPlatformServices.kt`
- Create: `composeApp/src/androidMain/AndroidManifest.xml`
- Create: `composeApp/src/androidUnitTest/kotlin/ru/example/ninexfifteen/AndroidSettingsRepositoryTest.kt`

**Deliverable:** Android uses SAF and FileProvider for its existing scenarios while returning data through the shared contracts.

- [ ] Write a unit test for persisting and reading selected tag and album IDs in `AndroidSettingsRepository`.
- [ ] Run `./gradlew :composeApp:testDebugUnitTest`; expected result: FAIL.
- [ ] Move the `DigikamLibrary` and `DigikamThumbnailStore` algorithms into Android port implementations, preserving read-only SQLite and copying the database from `DocumentFile` to cache when the root is available only as a `Uri`.
- [ ] Move the SharedPreferences URI and filters into `AndroidSettingsRepository`; URI conversion into an assumed filesystem path is allowed only as best effort for display, while database reads must work through ContentResolver.
- [ ] Implement root/copy directory selection with the Activity Result API and Android sharing through `FileProvider`. Register the `FileProvider`, required permission, and `file_paths.xml` in the new manifest.
- [ ] Run `./gradlew :composeApp:testDebugUnitTest :composeApp:assembleDebug`; expected result: PASS.
- [ ] Install the debug APK on API 26 and API 35 emulator/device, select an SAF directory, open the library, apply a filter, copy one photo, and share one photo.
- [ ] Create commit `feat: preserve Android storage and sharing adapters`.

### Task 6: Package and Verify Ubuntu

**Files:**
- Create: `.github/workflows/build.yml`
- Create: `README.md`
- Modify: `.gitignore`

**Deliverable:** CI publishes a verified `.deb` as an artifact, and the documentation explains reproducible build and installation steps.

- [ ] Add a CI workflow with two jobs: Android (`./gradlew :composeApp:assembleDebug :composeApp:testDebugUnitTest`) and Ubuntu (`./gradlew :composeApp:desktopTest :composeApp:packageDeb`). Upload the APK and `.deb` with upload-artifact.
- [ ] Add an Ubuntu smoke step: install the generated `.deb` using `sudo apt-get install -y ./<deb>`; execute `/opt/9x15/bin/9x15` with `xvfb-run` and a timeout; verify that the process creates a window and terminates at the timeout without a crash loop.
- [ ] Add to README the JDK 17 and Linux x86_64 requirements, `./gradlew :composeApp:packageDeb`, the artifact path, installation with `sudo apt install ./9x15_<version>_amd64.deb`, removal with `sudo apt remove 9x15`, and the Ubuntu `amd64`-only support limitation.
- [ ] Extend `.gitignore` with `**/build/`, `.gradle/`, IDE metadata, and packaging output; do not ignore the Gradle wrapper, source, or plans.
- [ ] On an actual Ubuntu 22.04+ machine, install the `.deb`, select a directory containing a copy of `digikam4.db` and at least two photos, and verify list display, thumbnail fallback, filters, viewer, copy, and share fallback.
- [ ] Run the complete suite: `./gradlew :composeApp:allTests :composeApp:assembleDebug :composeApp:packageDeb`.
- [ ] Create commit `ci: package and verify Ubuntu desktop build`.

## Acceptance Criteria

- From a clean checkout with JDK 17, `./gradlew :composeApp:assembleDebug` builds the Android APK.
- On Ubuntu x86_64, `./gradlew :composeApp:packageDeb` builds an installable `.deb`.
- After installation, the Ubuntu package launches from the application menu and from `/opt/9x15/bin/9x15`.
- The desktop application selects a directory, finds `digikam4.db`, and shows photos, tags, albums, and dates without writing to the digiKam database.
- Android retains SAF access, while desktop does not depend on Android permissions or URIs.
- Shared code imports neither `android.*`, `androidx.*`, `java.awt.*`, JDBC, nor `java.util.prefs`.
- CI runs unit/UI tests and attaches the APK and `.deb` to every successful build.

## Future Extensions

After a successful Ubuntu release, create separate plans for `TargetFormat.AppImage`, Windows MSI, and macOS DMG. Those targets use the existing `desktopMain` and Compose UI; platform-specific behavior must be added through new `PlatformServices` implementations rather than `commonMain`.
