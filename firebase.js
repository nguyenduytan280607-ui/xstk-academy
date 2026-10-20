
import { initializeApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend
} from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyAoutTUdBDj_0yBHnxahADgcU_7syRdk8",
  authDomain: "xstk-academy.firebaseapp.com",
  projectId: "xstk-academy",
  storageBucket: "xstk-academy.firebasestorage.app",
  messagingSenderId: "382774634231",
  appId: "1:382774634231:web:3e576a8dc325e24c8455f2"
};

const app = initializeApp(firebaseConfig);

const ai = getAI(app, {
  backend: new GoogleAIBackend()
});

export const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash"
});
