  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
  import {
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, increment, query, orderBy, limit, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyC3Ip7T4qbVmlkcyzbMgEBAWl5V0xgjnBk",
    authDomain: "ferro-lanca.firebaseapp.com",
    projectId: "ferro-lanca",
    storageBucket: "ferro-lanca.firebasestorage.app",
    messagingSenderId: "526218624052",
    appId: "1:526218624052:web:88c58acb2680f790d9de61",
    measurementId: "G-10GG85VLQP"
  };
  try{
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    window.__lb = {
      db, collection, addDoc, getDocs, doc, updateDoc, increment, query, orderBy, limit, serverTimestamp, ready:true
    };
  }catch(e){
    window.__lb = { ready:false };
    console.error('Firebase não iniciou — o Placar vai ficar indisponível.', e);
  }
