import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { storage } from "./firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Button, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { ContentCopy } from "@mui/icons-material";
import { useTransformRecall, loadPresetsFromFirebase } from "./TransformRecallContext";
import { OrbitControls, Environment, Center, useGLTF, GizmoHelper, GizmoViewport } from "@react-three/drei";
// import { GizmoViewcube, Text } from '@react-three/drei';

const ShareARPage = (props) => {
  // Accept projectName from either /share-ar/:projectName or /embedded/:projectName
  const params = useParams();
  const projectName = params.projectName || props.projectName;

  const [modelUrl, setModelUrl] = useState(null);
  const [usdzUrl, setUsdzUrl] = useState(null);
  const [skybox, setSkybox] = useState("studio");
  const [background, setBackground] = useState("#ffffff");
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 }); // radians
  const controlsRef = useRef();
  const cameraRef = useRef();
  const [modelLoading, setModelLoading] = useState(false);
  const [modelCenter, setModelCenter] = useState(null);
  const [modelSize, setModelSize] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [presets, setPresets] = useState([null, null, null, null]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const { presets: contextPresets } = useTransformRecall();
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const loadARData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const jsonRef = ref(storage, `projects/${projectName}/share-ar-data.json`);
        const jsonUrl = await getDownloadURL(jsonRef);
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`Failed to fetch AR data: ${response.statusText}`);
        const data = await response.json();
        if (!data.modelUrl) throw new Error("No modelUrl found in AR data.");
        setModelUrl(data.modelUrl);
        setUsdzUrl(data.usdzUrl);
        setSkybox(data.skybox || "studio");
        setBackground(data.background || "#ffffff");
            } catch (error) {
        console.error("Error loading AR data:", error);
        setModelUrl("");
        setUsdzUrl("");
        let msg = "";
        if (error.message.includes("storage/object-not-found")) {
          msg = "This shared model does not exist or has been deleted.";
        } else if (error.message.includes("Failed to fetch")) {
          msg = "Failed to load model: Could not fetch the file. This is usually caused by a bad link, missing file, or CORS/permissions issues on the storage bucket. Please check the model link, make sure the file exists, and that CORS and storage rules allow public access.";
        } else {
          msg = `Failed to load model: ${error.message}`;
        }
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    if (projectName) loadARData();
  }, [projectName]);

  useEffect(() => {
    if (modelUrl) useGLTF.preload(modelUrl);
  }, [modelUrl]);

  useEffect(() => {
    // Hide loader as soon as both loading and modelLoading are false
    if (!loading && !modelLoading) {
      setShowInitialLoader(false);
    } else {
      setShowInitialLoader(true);
    }
  }, [loading, modelLoading]);

  const defaultPresets = [
    null,
    { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, // Front
    { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } }, // Side
    { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 180, z: 0 } }, // Back
  ];

  useEffect(() => {
    async function fetchPresets() {
      setLoadingPresets(true);
      let loaded = null;
      try {
        loaded = await loadPresetsFromFirebase(projectName);
        if (loaded) console.log('[DEBUG] Loaded presets from Firebase:', loaded);
      } catch (e) {
        console.log('[DEBUG] Error loading presets from Firebase:', e);
      }
      if (!loaded) {
        try {
          const local = localStorage.getItem('transformPresets');
          if (local) loaded = JSON.parse(local);
          if (loaded) console.log('[DEBUG] Loaded presets from localStorage:', loaded);
        } catch (e) {
          console.log('[DEBUG] Error loading presets from localStorage:', e);
        }
      }
      if (!loaded || !Array.isArray(loaded) || loaded.length < 4) {
        loaded = defaultPresets;
        console.log('[DEBUG] Using default presets:', loaded);
      }
      setPresets(loaded);
      setLoadingPresets(false);
    }
    if (projectName) fetchPresets();
  }, [projectName]);

  const openARView = () => {
    if (!modelUrl) {
      alert("Model not found!");
      return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS && usdzUrl) {
      window.location.href = usdzUrl;
    } else if (isAndroid) {
      window.location.href = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
        modelUrl
      )}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;end;`;
    } else if (navigator.xr) {
      alert("WebXR not implemented yet. Try opening this on a mobile device for AR.");
    } else {
      alert("Your device does not support AR.");
    }
  };

  // Generate embeddable iframe link for this model view
  const currentUrl = window.location.origin + "/embedded/" + projectName;
  const iframeCode = `<iframe src=\"${currentUrl}\" frameborder=\"0\" width=\"100%\" height=\"900\" allow=\"xr-spatial-tracking; fullscreen;\"></iframe>`;

  // if (loading) return <div>Loading...</div>;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Error Message UI */}
      {errorMsg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.97)',
          zIndex: 4000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#b00',
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 1,
          textAlign: 'center',
          padding: 32,
        }}>
          <img src="/icons/cross.png" alt="Error" style={{ width: 60, height: 60, marginBottom: 24 }} />
          <div>{errorMsg}</div>
          <div style={{ fontSize: 16, color: '#555', marginTop: 16 }}>
            Please check your link or contact the model owner.
          </div>
        </div>
      )}

      {/* Initial Loader Overlay - always visible until model is ready */}
      {showInitialLoader && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.95)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img src="/icons/move2.png" alt="Loading Icon" style={{ width: 80, height: 80, marginBottom: 24, animation: 'spin 1.2s linear infinite' }} />
          <div style={{ marginTop: 10, fontWeight: 700, fontSize: 28, color: '#222', letterSpacing: 2, textShadow: '0 2px 8px #fff' }}>
            {loading ? 'Webpage is loading...' : '3D Model is loading...'}
          </div>
          <div style={{ marginTop: 8, fontWeight: 400, fontSize: 18, color: '#444', letterSpacing: 1 }}>
            {loading
              ? 'Please wait while the webpage loads.'
              : 'Please wait while your 3D model loads.'}
          </div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Share Button Centered Above Model */}
      <div style={{
        position: "fixed",
        top: 90,
        left: "92%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Button
          variant="contained"
          startIcon={<img src="/icons/share.png" alt="Share" style={{ width: 22, height: 22 }} />}
          sx={{ color: 'black', fontWeight: 'bold', background: '#eee', boxShadow: 2, borderRadius: 2, px: 2, alignItems: 'center', display: 'flex' }}
          onClick={() => setShareOpen(true)}
        >
          Share
        </Button>
      </div>

      <Canvas
        camera={{ position: [0, 1, 10], fov: 45 }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
        }}
      >
        <ambientLight intensity={0.5} />
        <OrbitControls ref={controlsRef} enablePan={false}  enableRotate={true} />
        <Environment preset={skybox} background={false} />
        <Center>
          {modelUrl && position && rotation && (
            <GLBModel
              modelUrl={modelUrl}
              color={color}
              scale={scale}
              position={position}
              rotation={rotation}
              setModelLoading={setModelLoading}
              onModelLoaded={(size, center) => {
                setModelSize(size);
                setModelCenter(center);
                if (cameraRef.current) {
                  const maxDim = Math.max(size.x, size.y, size.z);
                  const fov = cameraRef.current.fov * (Math.PI / 180);
                  const distance = maxDim / (2 * Math.tan(fov / 2));
                  cameraRef.current.position.set(center.x, center.y, center.z + distance * 1.5);
                  cameraRef.current.lookAt(center);
                }
              }}
            />
          )}
        </Center>
        <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
          {/* <GizmoViewcube /> */}
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>

      {/* Zealous Logo in top left corner */}
      <div style={{
        backgroundColor: color,
        position: 'fixed',
        top: 30,
        left: 30,
        width: 120,
        height: 40,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        padding: '4px 8px',
        pointerEvents: 'auto',
      }}>
        <img src="/Zealous Logo.svg" alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
      </div>

      {/* Controls: Move, Zoom Out, Zoom In in bottom left */}
      <div
        className="preview-viewer-controls"
        style={{
          position: 'fixed',
          top: 350,
          left: 70,
          zIndex: 10010,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          pointerEvents: 'auto',
        }}
      >
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: "#eee", zIndex: 2001 }}
          onClick={() => {
            setPosition({ x: 0, y: 0, z: 0 });
            setRotation({ x: 0, y: 0, z: 0 });
            if (cameraRef.current && modelCenter && modelSize) {
              const center = modelCenter;
              const size = modelSize;
              const maxDim = Math.max(size.x, size.y, size.z);
              const fov = cameraRef.current.fov * (Math.PI / 180);
              const distance = maxDim / (2 * Math.tan(fov / 2));
              cameraRef.current.position.set(center.x, center.y, center.z + distance * 1.5);
              cameraRef.current.lookAt(center);
              if (controlsRef.current) {
                controlsRef.current.target.set(center.x, center.y, center.z);
                controlsRef.current.update();
              }
            }
          }}
        >
          <img src="/icons/arrows.svg" alt="move icon" width={24} height={24} />
        </Button>
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: "#eee", zIndex: 2001 }}
          onClick={() => {
            setScale((s) => {
              const newScale = Math.max(s - 0.1, 0.3);
              if (cameraRef.current && modelCenter && modelSize) {
                const camera = cameraRef.current;
                const target = controlsRef.current ? controlsRef.current.target : modelCenter;
                const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
                const distance = camera.position.distanceTo(target);
                const newDistance = distance * (s / newScale);
                camera.position.copy(direction.multiplyScalar(newDistance).add(target));
                camera.lookAt(target);
                if (controlsRef.current) {
                  controlsRef.current.update();
                }
              }
              return newScale;
            });
          }}
        >
          <img src="/icons/zoom-out.svg" alt="zoom out icon" width={24} height={24} />
        </Button>
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: "#eee", zIndex: 2001 }}
          onClick={() => {
            setScale((s) => {
              const newScale = Math.min(s + 0.1, 3);
              if (cameraRef.current && modelCenter && modelSize) {
                const camera = cameraRef.current;
                const target = controlsRef.current ? controlsRef.current.target : modelCenter;
                const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
                const distance = camera.position.distanceTo(target);
                const newDistance = distance * (s / newScale);
                camera.position.copy(direction.multiplyScalar(newDistance).add(target));
                camera.lookAt(target);
                if (controlsRef.current) {
                  controlsRef.current.update();
                }
              }
              return newScale;
            });
          }}
        >
          <img src="/icons/zoom-in.svg" alt="zoom in icon" width={24} height={24} />
        </Button>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 50,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
          zIndex: 9999,
          background: "rgba(255,255,255,0.95)",
          padding: "4px 12px",
          borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)"
        }}
      >
        {[1, 2, 3].map((index, i) => {
          // Only use index 1,2,3 (never 0)
          const preset = (contextPresets && contextPresets[index]) || (presets && presets[index]);
          const isDisabled = loadingPresets || !preset || typeof preset.position !== 'object' || typeof preset.rotation !== 'object';
          return (
            <IconButton
              key={index}
              style={{ backgroundColor: "#eee", flexDirection: "column", cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              disabled={isDisabled}
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                if (isDisabled) return;
                setRotation({
                  x: (preset.rotation.x ?? 0) * Math.PI / 180,
                  y: (preset.rotation.y ?? 0) * Math.PI / 180,
                  z: (preset.rotation.z ?? 0) * Math.PI / 180,
                });
                setPosition({
                  x: preset.position.x ?? 0,
                  y: preset.position.y ?? 0,
                  z: preset.position.z ?? 0
                });
                if (controlsRef.current && cameraRef.current && modelCenter && modelSize) {
                  const controls = controlsRef.current;
                  const center = modelCenter;
                  const size = modelSize;
                  const maxDim = Math.max(size.x, size.y, size.z);
                  const fov = cameraRef.current.fov * (Math.PI / 180);
                  const distance = maxDim / (2 * Math.tan(fov / 2));
                  cameraRef.current.position.set(center.x, center.y, center.z + distance * 1.5);
                  cameraRef.current.lookAt(center);
                  controls.target.set(center.x, center.y, center.z);
                  controls.update();
                }
              }}
              title={["Front","Side","Back"][i]}
            >
              {loadingPresets ? (
                <span className="spinner" style={{ width: 18, height: 18, border: '2px solid #ccc', borderTop: '2px solid #1976d2', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
              ) : (
                <img src="/icons/circle-line-icon.svg" alt={["Front","Side","Back"][i]} width={20} height={20} title={["Front","Side","Back"][i]} />
              )}
            </IconButton>
          );
        })}
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>

      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <Button
          variant="contained"
          startIcon={<img className="Aricon-icon" src="/icons/Aricon.svg" alt="AR" />}
          style={{ backgroundColor: "#eee" }}
          sx={{ color: 'black', fontWeight: 'bold',gap:1, }}
          onClick={openARView}
        >
          See in your Space
        </Button>
      </div>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)}>
        <DialogTitle style={{ textAlign: "center" }}>Scan QR Code</DialogTitle>
        <DialogContent style={{ textAlign: "center" }}>
          <QRCodeCanvas value={modelUrl} size={250} />
          <p>Scan to view the model in AR.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onClose={() => { setShareOpen(false); setCopySuccess(false); }}>
        <DialogContent style={{ textAlign: "center", minWidth: 350 }}>
          <div style={{ marginBottom: 12, fontSize: 24, fontWeight: 'bold', }}>
            Share this model:
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12, 
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* Share Embed Link Button Only */}
            <Button
              variant="contained"
              size="small"
              sx={{
                fontSize: 13,
                textTransform: 'none',
                minWidth: 120,
                px: 2,
                py: 1,
                background: '#fff',
                color: '#111',
                fontWeight: 'bold',
                boxShadow: '#eee',
                '&:hover': {
                  background: '#f5f5f5',
                  color: '#111',
                  borderColor: '#222',
                },
              }}
              onClick={() => {
                navigator.clipboard.writeText(currentUrl);
                setCopySuccess('link');
                setTimeout(() => setCopySuccess(false), 1500);
              }}
            >
              Share Embed Link
            </Button>
            {copySuccess === 'link' && (
              <span style={{ color: 'green', fontSize: 13, marginLeft: 6 }}>Copied!</span>
            )}
            {/* Iframe Embed Button Only */}
            <Button
              variant="contained"
              size="small"
              sx={{
                fontSize: 13,
                textTransform: 'none',
                minWidth: 120,
                px: 2,
                py: 1,
                background: '#fff',
                color: '#111',
                fontWeight: 'bold',
                boxShadow: '#eee',
                '&:hover': {
                  background: '#f5f5f5',
                  color: '#111',
                  borderColor: '#222',
                },
              }}
              onClick={async () => {
                try {
                  if (window.navigator && window.navigator.clipboard) {
                    await window.navigator.clipboard.writeText(iframeCode);
                    setCopySuccess('iframe');
                    setTimeout(() => setCopySuccess(false), 1500);
                  } else {
                    // fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = iframeCode;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    setCopySuccess('iframe');
                    setTimeout(() => setCopySuccess(false), 1500);
                  }
                } catch (err) {
                  alert('Failed to copy iframe code.');
                }
              }}
            >
              Embed Iframe Code
            </Button>
            {copySuccess === 'iframe' && (
              <span style={{ color: 'green', fontSize: 13, marginLeft: 6 }}>Copied!</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// In GLBModel, expose modelRef globally for button access
const GLBModel = ({ modelUrl, color, scale, position, rotation, onModelLoaded, setModelLoading }) => {
  const { scene } = useGLTF(modelUrl);
  const modelRef = useRef();

  // Expose modelRef globally for button access
  window.modelRef = modelRef;

  useEffect(() => {
    if (!scene || !modelRef.current) return;

    setModelLoading?.(true);

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.set(color);
      }
    });

    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    onModelLoaded?.(size, center);

    const done = setTimeout(() => {
      setModelLoading?.(false);
    }, 1000); // model loading timeout

    return () => clearTimeout(done);
  }, [modelUrl, color]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.set(position.x, position.y, position.z);
      modelRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
      modelRef.current.scale.set(scale, scale, scale);
    }
  }, [position, rotation, scale]);

  return (
    <primitive
      ref={modelRef}
      object={scene}
      scale={[scale, scale, scale]}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    />
  );
};

const buttonStyles = {
  width: 47,
  height: 47,
  borderRadius: '20%',
  padding: 0,
  minWidth: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  '& .MuiButton-startIcon': {
    margin: 0,
  },
};

export default ShareARPage;

// Initialize default presets in localStorage if not already present (and always overwrite if invalid)
try {
  let storedPresets = localStorage.getItem('transformPresets');
  let parsed = storedPresets ? JSON.parse(storedPresets) : null;
  const valid = Array.isArray(parsed) && parsed.length === 4 && parsed.slice(1).every(p => p && typeof p.position === 'object' && typeof p.rotation === 'object');
  if (!valid) {
    localStorage.setItem('transformPresets', JSON.stringify([
      null,
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } },
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 180, z: 0 } }
    ]));
  }
} catch (e) {
  localStorage.setItem('transformPresets', JSON.stringify([
    null,
    { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } },
    { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 180, z: 0 } }
  ]));
}