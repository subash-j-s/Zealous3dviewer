import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "./firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// 3 slots: 1=Front, 2=Side, 3=Back
const defaultPresets = [
  null,
  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, // Front
  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } }, // Side
  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 180, z: 0 } }, // Back
];

const PRESET_FILENAME = "transform-presets.json";

// Save presets to Firebase Storage as JSON
async function savePresetsToFirebase(projectName, presets) {
  if (!projectName) return;
  const json = JSON.stringify(presets, null, 2);
  const fileRef = ref(storage, `projects/${projectName}/${PRESET_FILENAME}`);
  await uploadString(fileRef, json, 'raw');
}

// Load presets from Firebase Storage
async function loadPresetsFromFirebase(projectName) {
  if (!projectName) return null;
  try {
    const fileRef = ref(storage, `projects/${projectName}/${PRESET_FILENAME}`);
    const url = await getDownloadURL(fileRef);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch presets');
    return await response.json();
  } catch (e) {
    return null;
  }
}

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
  const [projectName, setProjectName] = useState(null);
  const [presetsLoading, setPresetsLoading] = useState(false);

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

  // On mount, try to load presets from Firebase if projectName is available
  useEffect(() => {
    if (projectName) {
      setPresetsLoading(true);
      loadPresetsFromFirebase(projectName).then((cloudPresets) => {
        if (cloudPresets) {
          setPresets(cloudPresets);
          localStorage.setItem("transformPresets", JSON.stringify(cloudPresets));
        }
        setPresetsLoading(false);
      }).catch(() => setPresetsLoading(false));
    }
  }, [projectName]);

  // Save to Firebase whenever presets change and projectName is set
  useEffect(() => {
    if (projectName && presets) {
      savePresetsToFirebase(projectName, presets);
    }
  }, [presets, projectName]);

  return (
    <TransformRecallContext.Provider value={{ presets, savePreset, recallPreset, setProjectName, presetsLoading }}>
      {children}
    </TransformRecallContext.Provider>
  );
}

export function useTransformRecall() {
  return useContext(TransformRecallContext);
}
