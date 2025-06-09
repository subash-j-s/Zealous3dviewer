import React, { createContext, useContext, useState } from "react";

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
