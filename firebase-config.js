// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD89NwTh9luRbGhNknaFRF1NVwHb6wSaac",
    authDomain: "adhd-a5ba6.firebaseapp.com",
    databaseURL: "https://adhd-a5ba6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "adhd-a5ba6",
    storageBucket: "adhd-a5ba6.firebasestorage.app",
    messagingSenderId: "732495403324",
    appId: "1:732495403324:web:4be27eb586780b31606639"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
