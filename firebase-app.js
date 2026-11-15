import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const status = (message) => window.SQRO?.setStatus(message);
const configReady = firebaseConfig &&
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_API_KEY" &&
  firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
  firebaseConfig.appId && firebaseConfig.appId !== "PASTE_APP_ID";

if (!configReady) {
  status("Setup required: paste your Firebase web-app config into firebase-config.js, then redeploy.");
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const quotes = collection(db, "quotations");
  let currentUser = null;
  let syncing = false;

  async function syncAll() {
    if (!currentUser || syncing) return;
    syncing = true;
    try {
      const local = window.SQRO.getLibrary();
      const remoteSnap = await getDocs(quotes);
      const merged = {};
      remoteSnap.forEach((item) => {
        const q = item.data();
        if (q && q.ref) merged[q.ref] = q;
      });

      // Preserve whichever copy has the latest local timestamp.
      for (const [ref, q] of Object.entries(local)) {
        const cloudCopy = merged[ref];
        if (!cloudCopy || Number(q.at || 0) >= Number(cloudCopy.at || 0)) {
          merged[ref] = q;
          await setDoc(doc(db, "quotations", ref), {
            ...q,
            updatedBy: currentUser.uid,
            updatedAt: serverTimestamp()
          });
        }
      }

      // Load the merged library into this browser. This also migrates legacy localStorage records.
      window.SQRO.replaceLibrary(merged);
      status(`Cloud sync complete · ${Object.keys(merged).length} quotation(s) · ${currentUser.email}`);
    } catch (error) {
      console.error("Firestore sync failed", error);
      status("Cloud sync failed: " + (error.code || error.message) + ". Check Firestore and security rules.");
    } finally {
      syncing = false;
    }
  }

  async function saveCurrentLibrary() {
    if (!currentUser || syncing) return;
    syncing = true;
    try {
      const local = window.SQRO.getLibrary();
      for (const [ref, q] of Object.entries(local)) {
        await setDoc(doc(db, "quotations", ref), {
          ...q,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp()
        });
      }
      status(`Saved ${Object.keys(local).length} quotation(s) to the shared cloud database.`);
    } catch (error) {
      console.error("Firestore save failed", error);
      status("Cloud save failed: " + (error.code || error.message) + ". Your browser copy is still saved locally.");
    } finally {
      syncing = false;
    }
  }

  $("loginButton").addEventListener("click", async () => {
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    if (!email || !password) {
      status("Enter your team email and password.");
      return;
    }
    $("loginButton").disabled = true;
    status("Signing in…");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      status("Sign-in failed: " + (error.code || error.message));
    } finally {
      $("loginButton").disabled = false;
    }
  });

$("signOutBtn").addEventListener("click", () => signOut(auth));

window.addEventListener("sqro:save-library", saveCurrentLibrary);

window.addEventListener("sqro:delete", async (event) => {
  if (!currentUser || !event.detail?.ref) return;

  try {
    await deleteDoc(doc(db, "quotations", event.detail.ref));
    status("Quotation deleted from the shared cloud database.");
  } catch (error) {
    status("Cloud delete failed: " + (error.code || error.message));
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  window.SQRO?.setCloudUser(user?.email || "");

  if (user) {
    status("Connected. Checking cloud quotations and migrating this browser's saved library…");
    await syncAll();
  } else {
    status("Signed out. Sign in with an account created by your Firebase project administrator.");
  }
});
