// firebase.js
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAeRCknCH_bAHjgtog4D-JRhnxS8wtWGrU",
    authDomain: "z-space-3d.firebaseapp.com",
    projectId: "z-space-3d",
    storageBucket: "z-space-3d.firebasestorage.app",
    messagingSenderId: "414271656193",
    appId: "1:414271656193:web:3d2200d22ca84940be0b00"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage, ref, uploadBytes, getDownloadURL };