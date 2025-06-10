//  PreviewViewer.jsx

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Popover,
  ClickAwayListener,
  IconButton,
} from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useTransformRecall, loadPresetsFromFirebase } from "./TransformRecallContext";
import { useParams } from "react-router-dom";


const getArViewerUrl = (modelUrl, type = "google") => {
  if (type === "google") return `https://arvr.google.com/?model=${encodeURIComponent(modelUrl)}`;
  return modelUrl;
};

const Model = ({ modelUrl, color, scale, position, rotation, setModelLoading }) => {
  const { scene } = useGLTF(modelUrl, true);
  const modelRef = useRef();

  useEffect(() => {
    if (!scene) return;
    setModelLoading?.(true);
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.set(color);
      }
    });
    setTimeout(() => setModelLoading?.(false), 1000);
  }, [scene, color]);

  return scene ? (
    <primitive
      ref={modelRef}
      object={scene}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  ) : null;
};

const PreviewViewer = () => {
  const [modelUrl, setModelUrl] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);

  const [color, setColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState('#ffffff');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerAnchorRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 }); // ✅ added

  const [modelLoading, setModelLoading] = useState(false);

  const arType = "google";

  const { savePreset } = useTransformRecall();
  const params = useParams();
  const projectName = params.projectName || window.projectName || "demo";
  const [presets, setPresets] = useState([null, null, null, null]);

  useEffect(() => {
    // Replace with your model URL
    const url ="https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    setModelUrl(getArViewerUrl(url, "google"));
  }, []);

  useEffect(() => {
    if (!modelUrl) return;
    const arViewerUrl = getArViewerUrl(modelUrl, arType);
    const shortenUrl = async () => {
      try {
        const response = await fetch(
          `https://tinyurl.com/api-create.php?url=${encodeURIComponent(arViewerUrl)}`
        );
        const shortened = await response.text();
        setShortUrl(shortened);
      } catch {
        setShortUrl(arViewerUrl);
      }
    };
    shortenUrl();
  }, [modelUrl, arType]);

  // Load models from public/model.json
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetch('/model.json')
      .then(res => res.json())
      .then(data => setModels(data.models || []));
  }, []);

  // Load presets from Firebase on mount
  useEffect(() => {
    async function fetchPresets() {
      const loaded = await loadPresetsFromFirebase(projectName);
      console.log('[PreviewViewer] Loaded presets from Firebase for project:', projectName, loaded);
      if (loaded && Array.isArray(loaded)) setPresets(loaded);
    }
    fetchPresets();
  }, [projectName]);

  const handleARView = () => setQrOpen(true);
  const handleCloseQR = () => setQrOpen(false);
  const handleClickAway = () => setColorPickerOpen(false);
  const handleColorChange = (e) => setColor(e.target.value);

  useEffect(() => {
  const saved = localStorage.getItem('canvasBgColor');
  if (saved) setBgColor(saved);
}, []);

useEffect(() => {
  localStorage.setItem('canvasBgColor', bgColor);
}, [bgColor]);

  const qrCodeValue = shortUrl || modelUrl;

  return (
    <div>
      <div className="preview-viewer-container" style={{ marginBottom: 10 }}>
        <Button
          variant="contained"
          sx={{
            width: 47,
            height: 47,
            borderRadius: '20%',
            padding: 0,
            minWidth: 0,         // Prevents default min width
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '& .MuiButton-startIcon': {
              margin: 0, // remove default left margin
            },
          }}   style={{ backgroundColor: "#eee" }}       
          onClick={() => setPosition((p) => ({ ...p, x: p.x + 1 }))}    >
          <img src="/icons/arrows.svg" alt="move icon" width={24} height={24} />
        </Button>

        <Button
          variant="contained"
          sx={{
            width: 47,
            height: 47,
            borderRadius: '20%',
            padding: 0,
            minWidth: 0,         // Prevents default min width
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '& .MuiButton-startIcon': {
              margin: 0, // remove default left margin
            },
          }}  style={{ backgroundColor: "#eee" }}       
          onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}>
          <img src="/icons/zoom-out.svg" alt="zoom out icon" width={24} height={24} />
        </Button>

        <Button
          variant="contained"
          sx={{
            width: 47,
            height: 47,
            borderRadius: '20%',
            padding: 0,
            minWidth: 0,         // Prevents default min width
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '& .MuiButton-startIcon': {
              margin: 0, // remove default left margin
            },
          }}   style={{ backgroundColor: "#eee" }}      onClick={() => setScale((s) => Math.min(s + 0.1, 3))}>
          <img src="/icons/zoom-in.svg" alt="zoom in icon" width={24} height={24} />
        </Button>

        {/* Color picker button */}
        <Button
          variant="contained"
          sx={{
            width: 47,
            height: 47,
            borderRadius: '20%',
            padding: 0,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '& .MuiButton-startIcon': { margin: 0 },
          }}
          style={{ backgroundColor: "#eee" }}
          ref={colorPickerAnchorRef}
          onClick={() => setColorPickerOpen(true)}
        >
          <img src="/icons/color-wheel.png" alt="Color" width={24} height={24} />
        </Button>
      </div>

      <Popover
        open={colorPickerOpen}
        anchorEl={colorPickerAnchorRef.current}
        onClose={() => setColorPickerOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ClickAwayListener onClickAway={() => setColorPickerOpen(false)}>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            style={{
              width: 40,
              height: 40,
              border: "none",
              cursor: "pointer",
              borderRadius: 5,
              display: "block"
            }}
            autoFocus
          />
        </ClickAwayListener>
      </Popover>

      {/* <div 
        style={{
          marginTop: 20,
          width: 500,
          height: 500,
          border: "1px solid #ccc",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <Canvas camera={{ position: [0, 1, 5] }}>
        <Canvas camera={{ position: [cameraPosition.x, cameraPosition.y, cameraPosition.z], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <gridHelper args={[10, 10]} />
          <axesHelper args={[5]} />
          <Model modelUrl={modelUrl} color={color} scale={scale} position={position} />
          <OrbitControls />
        </Canvas>
      </div> */}

      

      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 10 }}>
        <Button  style={{ backgroundColor: "#eee", }} sx={{color:'black', fontWeight:'bold',gap: 1,}}
          className="ARbutton"
          variant="contained"
          startIcon={<img className="Aricon-icon" src="/icons/Aricon.svg" alt="AR icon" />}
          onClick={handleARView}
        >
          See in your Space
        </Button>
      </div>

        {/* === Added 3 buttons at bottom center to change X position === */}
    {/* <div style={{
        position: "fixed",
        bottom: 50,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 3,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "4px 6px",
        borderRadius: "10px",
        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1)"
      }}>
        {[
          { label: "Front", rotation: { x: 5, y: 132, z: -53 }, position: { x: -0.09, y: 0.011965077426225657, z: 0.004718775272169129 } },
          { label: "Side", rotation: { x: -10, y:-139, z: 58 }, position: { x: -0.66, y: 0.37, z: 0.6 } },
          { label: "Back", rotation: { x: 87, y: 35, z: -41 }, position: { x: -2.48, y: 0.011965077426225657, z: 0.004718775272169129 } },
        ].map((view, i) => (
          <IconButton key={i} style={{ backgroundColor: color }} onClick={() => {
            console.log(`View: ${view.label}, Pos:`, view.position, 'Rot:', view.rotation);
            setRotation(view.rotation);
            setPosition(view.position);
            setScale(1.5);
          }}>
            <img src="/icons/circle-line-icon.svg" alt={view.label} width={20} height={20} title={view.label} />
          </IconButton>
        ))}
      </div> */}


      {/* === Bottom center: 3 buttons for Front/Side/Back using shared presets === */}
      <div style={{
        position: "fixed",
        bottom: 50,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "4px 12px",
        borderRadius: "10px",
        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1)"
      }}>
        {[1, 2, 3].map((index, i) => (
          <IconButton
            key={index}
            style={{ backgroundColor: "#eee", flexDirection: "column" }}
            onClick={() => {
              const preset = presets[index];
              if (preset && preset.position && preset.rotation) {
                setRotation({
                  x: (preset.rotation.x || 0) * Math.PI / 180,
                  y: (preset.rotation.y || 0) * Math.PI / 180,
                  z: (preset.rotation.z || 0) * Math.PI / 180,
                });
                setPosition(preset.position);
                setScale(1.5);
                console.log(`[PreviewViewer] Applied preset ${index}:`, preset);
              } else {
                console.warn(`[PreviewViewer] No valid preset for button ${index}:`, preset);
                alert(`No valid preset found for button ${index}. Check your Firebase JSON.`);
              }
            }}
            title={["Front", "Side", "Back"][i]}
          >
            <img src="/icons/circle-line-icon.svg" alt={["Front", "Side", "Back"][i]} width={20} height={20} title={["Front", "Side", "Back"][i]} />
          </IconButton>
        ))}
      </div>

      <Dialog open={qrOpen} onClose={handleCloseQR}>
        <DialogTitle style={{ textAlign: "center" }}>Scan QR Code </DialogTitle>
        {/* for AR View */}
        <DialogContent>
          {qrCodeValue ? (
            <div
              style={{
                border: "2px solid #E0E0E0",
                borderRadius: "12px",
                padding: "16px",
                display: "inline-block",
                backgroundColor: "#fff",
              }}
            >
              <QRCodeCanvas value={qrCodeValue} size={250} />
            </div>
          ) : (
            <p>Model URL is not available</p>
          )}
          <p style={{ textAlign: "center" }}>Scan to view the model in AR.</p>
        </DialogContent>
      </Dialog>

      {/* Loading overlay */}
      {modelLoading && (
  <div className="loading-overlay" style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(255,255,255,0.85)',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <img src="/icons/move2.png" alt="Loading Icon" style={{ width: 70, height: 70, marginBottom: 24, animation: 'spin 1.2s linear infinite' }} />
    <div style={{ marginTop: 10, fontWeight: 700, fontSize: 28, color: '#222', letterSpacing: 2, textShadow: '0 2px 8px #fff' }}>
      Loading...
    </div>
    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
  </div>
)}
    </div>
  );
};



export default PreviewViewer;