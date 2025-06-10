import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import { loadPresetsFromFirebase } from "./TransformRecallContext";

const ModelViewer = ({ modelUrl, appliedTransform }) => {
  const { scene, camera, controls } = useThree();
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (modelUrl) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          // Dispose of the previous model if it exists
          if (model) {
            scene.remove(model.scene);
            model.scene.traverse((child) => {
              if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach((m) => m.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              }
            });
          }
          setModel(gltf);
          scene.add(gltf.scene);

          // Center model
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          gltf.scene.position.sub(center);
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
          camera.position.set(center.x, center.y, cameraZ + maxDim);
          camera.lookAt(center);
          if (controls) {
            controls.target.set(center.x, center.y, center.z);
            controls.update();
          }

          // Apply transform if provided
          if (appliedTransform && appliedTransform.position && appliedTransform.rotation) {
            gltf.scene.position.set(
              appliedTransform.position.x,
              appliedTransform.position.y,
              appliedTransform.position.z
            );
            gltf.scene.rotation.set(
              (appliedTransform.rotation.x || 0) * Math.PI / 180,
              (appliedTransform.rotation.y || 0) * Math.PI / 180,
              (appliedTransform.rotation.z || 0) * Math.PI / 180
            );
          }
        },
        undefined,
        (error) => {
          console.error("Error loading model:", error);
        }
      );
    }
    // eslint-disable-next-line
  }, [modelUrl, scene, camera, controls, appliedTransform]);

  return null;
};

const WebviewViewer = ({ modelUrl }) => {
  const [qrOpen, setQrOpen] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);
  const [presets, setPresets] = useState([null, null, null, null]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [appliedIndex, setAppliedIndex] = useState(1); // Default to 1 (Front)

  // Load presets from Firebase on mount
  useEffect(() => {
    async function fetchPresets() {
      setLoadingPresets(true);
      const urlParams = new URLSearchParams(window.location.search);
      const projectName = urlParams.get('projectName') || window.projectName || 'demo';
      let loaded = null;
      try {
        loaded = await loadPresetsFromFirebase(projectName);
      } catch {}
      if (!loaded) {
        try {
          const local = localStorage.getItem('transformPresets');
          if (local) loaded = JSON.parse(local);
        } catch {}
      }
      if (loaded && Array.isArray(loaded)) setPresets(loaded);
      setLoadingPresets(false);
    }
    fetchPresets();
  }, []);

  // Generate a shortened URL for better QR scanning
  useEffect(() => {
    if (modelUrl) {
      const shortenUrl = async () => {
        try {
          const response = await fetch(
            `https://tinyurl.com/api-create.php?url=${encodeURIComponent(modelUrl)}`
          );
          const shortened = await response.text();
          setShortUrl(shortened);
        } catch (error) {
          setShortUrl(modelUrl);
        }
      };
      shortenUrl();
    }
  }, [modelUrl]);

  const handleARView = () => setQrOpen(true);
  const handleCloseQR = () => setQrOpen(false);
  const qrCodeValue = shortUrl || modelUrl;

  // UI for preset recall buttons
  const presetLabels = [null, "Front", "Side", "Back"];

  return (
    <div>
      {/* 3D Viewer Canvas */}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        style={{ width: "100%", height: "70vh", background: "#f0f0f0" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <OrbitControls enablePan={false} enableRotate={false} />
        <Environment preset="studio" background={false} />
        <Center>
          <ModelViewer modelUrl={modelUrl} appliedTransform={presets[appliedIndex]} />
        </Center>
      </Canvas>

      {/* Preset recall buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        margin: '16px 0',
        alignItems: 'center',
        position: 'fixed', // ensure always on top
        bottom: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001, // higher than .preview-viewer-container
        background: 'rgba(255,255,255,0.95)',
        padding: '4px 12px',
        borderRadius: '10px',
        boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
      }}>
        {[1, 2, 3].map((index) => (
          <Button
            key={index}
            variant={appliedIndex === index ? "contained" : "outlined"}
            color="primary"
            disabled={loadingPresets || !presets[index]}
            onClick={() => setAppliedIndex(index)}
            style={{ minWidth: 60 }}
          >
            {loadingPresets ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="spinner" style={{ width: 16, height: 16, border: '2px solid #ccc', borderTop: '2px solid #1976d2', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                ...
              </span>
            ) : (
              presetLabels[index]
            )}
          </Button>
        ))}
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Buttons for additional functionality */}
      <div className="preview-viewer-container">
        <Button
          className="movebutton"
          variant="contained"
          startIcon={<img src="/icons/arrows.svg" alt="Move" />}
        ></Button>
        <Button
          className="zoomout"
          variant="contained"
          startIcon={<img src="/icons/zoom-out.svg" alt="Zoom Out" />}
        ></Button>
        <Button
          className="zoomin"
          variant="contained"
          startIcon={<img src="/icons/zoom-in.svg" alt="Zoom In" />}
        ></Button>
        <Button
          className="colorpicker"
          variant="contained"
          startIcon={<img src="/icons/color-wheel.png" alt="Color Picker" />}
        ></Button>
      </div>

      {/* AR View Button */}
      <div className="Arviewbutton-container">
        <Button
          className="ARbutton"
          variant="contained"
          startIcon={<img src="/icons/Aricon.svg" alt="AR View" />}
          onClick={handleARView}
        >
          See in your Space
        </Button>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onClose={handleCloseQR}>
        <DialogTitle>Scan QR Code for AR View</DialogTitle>
        <DialogContent>
          {qrCodeValue ? (
            <QRCodeCanvas value={qrCodeValue} size={256} />
          ) : (
            <p>Model URL is not available</p>
          )}
          <p>Scan this QR code with your mobile device to view the model in AR.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebviewViewer;