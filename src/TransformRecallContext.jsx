import React, { createContext, useContext, useState } from "react";
import { storage, ref, uploadBytes, getDownloadURL } from "./firebase";

// 3 slots: 1=Front, 2=Side, 3=Back
const defaultPresets = [
  null,
  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, // Front
  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } }, // Side
  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 180, z: 0 } }, // Back
];

const TransformRecallContext = createContext();

export function TransformRecallProvider({ children }) {
  // Load from localStorage if available
  const getInitialPresets = () => {
    try {
      const stored = localStorage.getItem("transformPresets");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return defaultPresets;
  };
  const [presets, setPresets] = useState(getInitialPresets);

  const savePreset = (index, position, rotation) => {
    setPresets((prev) => {
      const next = [...prev];
      next[index] = { position: { ...position }, rotation: { ...rotation } };
      // Save to localStorage
      try {
        localStorage.setItem("transformPresets", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const recallPreset = (index) => presets[index];

  return (
    <TransformRecallContext.Provider value={{ presets, savePreset, recallPreset }}>
      {children}
    </TransformRecallContext.Provider>
  );
}

export function useTransformRecall() {
  return useContext(TransformRecallContext);
}

// Save presets to Firebase Storage as JSON
export async function savePresetsToFirebase(projectName, presets) {
  if (!projectName) return;
  const jsonRef = ref(storage, `projects/${projectName}/transform-presets.json`);
  const blob = new Blob([JSON.stringify(presets)], { type: "application/json" });
  await uploadBytes(jsonRef, blob);
}

// Load presets from Firebase Storage as JSON
export async function loadPresetsFromFirebase(projectName) {
  if (!projectName) return null;
  try {
    const jsonRef = ref(storage, `projects/${projectName}/transform-presets.json`);
    const url = await getDownloadURL(jsonRef);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch presets JSON");
    return await response.json();
  } catch (e) {
    return null;
  }
}
