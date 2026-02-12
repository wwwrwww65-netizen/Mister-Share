# Google Play Permission & Data Safety Justification

**App Name:** Mister Share
**Package Name:** com.mistershare.filetransfer

This document outlines the technical and policy justifications for the permissions used in Mister Share. Use this information when filling out the **Google Play Data Safety Form** and **Permissions Declaration**.

---

## 🛡️ 1. Storage Permissions (No MANAGE_EXTERNAL_STORAGE)

**We DO NOT use `MANAGE_EXTERNAL_STORAGE`.**

We strictly adhere to Google Play Policy by using standard permissions and the Storage Access Framework.

*   **Android 10 and below:** We use `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` to access files selected by the user for transfer.
*   **Android 11+:** We use the **Storage Access Framework (SAF)** (`ACTION_OPEN_DOCUMENT_TREE`) to request access to specific directories (like Game Data/OBB) only when the user explicitly initiates a "Game Restore" operation.

### Justification for Reviewers (if asked about OBB access):
> "This app allows users to transfer game data files (OBB) between devices. We comply with Android privacy best practices by using the Storage Access Framework (SAF). We do NOT request broad storage access. Instead, we ask the user to explicitly grant access only to the specific game folder they wish to restore (e.g., `Android/obb/com.pubg`) via the system picker. This ensures user privacy and data minimization."

---

## 📦 2. High-Risk Permission: QUERY_ALL_PACKAGES

**Why do we need this?**
Mister Share is a **File and App Transfer Tool**. A core feature is allowing users to browse, select, and send their installed applications (APKs) to other devices nearby (offline sharing).

**Justification for Google Play Console:**
1.  **Core Functionality:** The app's primary purpose includes backing up and sharing installed applications.
2.  **User Awareness:** The user explicitly selects "Apps" from the home screen to see a list of their installed apps for selection.
3.  **Necessity:** Without `QUERY_ALL_PACKAGES`, Android 11+ prevents the app from seeing the full list of installed apps, breaking this core feature.

> **Declaration Statement:** "Mister Share is a peer-to-peer file sharing tool. One of its primary features is 'App Sharing', which allows users to list, select, and transfer installed apps (APKs) to another device. The `QUERY_ALL_PACKAGES` permission is essential to generate the list of installed applications for the user to select from."

---

## 🔒 3. Data Safety Section (Questionnaire)

**Q: Does your app collect or share any of the required user data types?**
**A: No.**

**Explanation:**
*   **No Collection:** The app creates a direct Peer-to-Peer (P2P) connection via Wi-Fi Direct. Files are transferred directly from Device A to Device B over a local offline network.
*   **No Uploads:** No data is ever uploaded to a cloud server or third-party service.
*   **No Sharing:** No user data is shared with any external entity.
*   **Safe Transfer:** All local transfers are encrypted.

---

## 🔐 4. Security Measures (Zip Slip Protection)

To protect users during the "Game Restore" process:
1.  **Strict Path Validation:** We implemented checks to prevent "Zip Slip" vulnerabilities. Every file entry in a ZIP is validated to ensure its canonical path stays within the user-selected target directory.
2.  **No Overwrite of System Files:** The SAF picker restricts us to the specific folder the user chose. We cannot write outside this sandbox.

---

**Summary Statement for App Description:**
> "Mister Share respects your privacy. We use the official Android Storage Access Framework to securely transfer game files without requiring full device storage access. All transfers happen offline."
