# MisterShare Project Brief

## 1. Project Identity
- **App Name:** Mister Share
- **Package Name:** `com.mistershare.filetransfer`
- **Description:** A high-speed file and application sharing tool designed to outperform competitors like SHAREit, Zapya, and Xender. Key capabilities include ultra-fast transfer rates and specialized support for sharing Android OBB and DATA files for games.

## 2. Tech Stack & Versions
### Core
- **Framework:** React Native `0.74.7`
- **Engine:** React `18.2.0`
- **Language:** TypeScript `5.0.4`
- **State Management:** Zustand `^5.0.9`

### Navigation
- **Library:** React Navigation v6 (`native`, `stack`, `bottom-tabs`)

### Key Native Dependencies
- **Connectivity:**
    - `react-native-wifi-p2p`: `^3.6.0`
    - `react-native-tcp-socket`: `^6.3.0`
    - `react-native-ble-plx`: `^3.5.0`
- **File System & Storage:**
    - `react-native-fs`: `^2.20.0`
    - `react-native-blob-util`: `^0.19.11`
    - `react-native-safe-area-context`: `^4.14.0`
    - `@react-native-async-storage/async-storage`: `^2.2.0`
- **Media & Camera:**
    - `react-native-vision-camera`: `^4.7.3`
- **Utilities:**
    - `react-native-device-info`: `^15.0.1`
    - `react-native-installed-application`: `^1.0.6`
    - `react-native-restart`: `^0.0.27`
    - `react-native-localize`: `^3.6.1`
    - `i18next`: `^25.7.3`

## 3. Environment (Android)
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)
- **Compile SDK:** 34
- **Kotlin Version:** 1.9.22
- **NDK Version:** 26.1.10909125
- **Build Tools:** 34.0.0

## 4. Architecture
The project follows a **Hybrid Native/React Native** architecture with a clear separation of concerns (Layered Architecture):

### UI Layer (`src/screens`, `src/components`)
- **Screens:** Functional React components managing specific views (e.g., `FileBrowser`, `Transfer`, `ReceiveScreen`).
- **Components:** Reusable UI elements implementing the design system.
- **Theme:** Centralized styling (`src/theme`) and translations (`src/translations`, `src/i18n.ts`).

### State & Logic Layer (`src/store`, `src/services`)
- **Store:** Global state managed via `Zustand` (e.g., `transferStore`) for transfer queue, active items, and connection status.
- **Services:** TypeScript wrappers acting as bridges to native logic (e.g., `SAFService`, `WiFiDirectAdvanced`, `TcpHandshakeService`). This layer abstracts the complexity of native calls.

### Native Layer (`android/app/.../com/mistershare`)
- **Modules:** Critical performance and system-level operations are implemented in Kotlin to bypass JS bridge limitations for heavy tasks.
    - **Connectivity & Networking:** `WiFiDirectAdvancedModule`, `TcpHandshakeModule`, `BLEConnectionModule`, `TransferSocketModule`.
    - **File Access & Storage:** `SAFModule` (Storage Access Framework), `MediaStoreModule`, `FileProviderModule` for handling OBB/DATA and scoped storage restricted files.
    - **Background Services:** `TransferService` (Foreground Service) for resilient background transfers.
