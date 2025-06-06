import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { storage } from "./firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment,Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Button, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import CircularProgress from "@mui/material/CircularProgress";

const ShareARPage = () => {
  const { projectName } = useParams();
  const [modelUrl, setModelUrl] = useState(null);
  const [usdzUrl, setUsdzUrl] = useState(null);
  const [skybox, setSkybox] = useState("studio");
  const [background, setBackground] = useState("#ffffff");
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 }); // ✅ added
  const controlsRef = useRef();
  const cameraRef = useRef();
  const [modelLoading, setModelLoading] = useState(false);


  useEffect(() => {
    const loadARData = async () => {
      setLoading(true);
      try {
        const jsonRef = ref(storage, `projects/${projectName}/share-ar-data.json`);
        const jsonUrl = await getDownloadURL(jsonRef);
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`Failed to fetch AR data: ${response.statusText}`);
        const data = await response.json();
        setModelUrl(data.modelUrl);
        setUsdzUrl(data.usdzUrl);
        setSkybox(data.skybox || "studio");
        setBackground(data.background || "#ffffff");
      } catch (error) {
        console.error("Error loading AR data:", error);
        setModelUrl("");
        setUsdzUrl("");
      } finally {
        setLoading(false);
      }
    };

    if (projectName) loadARData();
  }, [projectName]);

  useEffect(() => {
    if (modelUrl) useGLTF.preload(modelUrl);
  }, [modelUrl]);

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

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {modelLoading && (
        <div className="loading-overlay">
          <CircularProgress size={50} thickness={4} />
          <p style={{ marginTop: 10 }}>Loading Model...</p>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 1, 10], fov: 45 }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
        }}
      >
        <ambientLight intensity={0.5} />
        <OrbitControls ref={controlsRef} />
        <Environment preset={skybox} background={false} />
        <Center>
          {modelUrl && (
          <GLBModel
            modelUrl={modelUrl}
            color={color}
            scale={scale}
            position={position}
            rotation={rotation} // ✅ added
            setModelLoading={setModelLoading}
            onModelLoaded={(size, center) => {
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
        
      </Canvas>

      <div
        className="preview-viewer-container"
        style={{ marginBottom: 10 }}
      >
        <div style={{
          backgroundColor: color,
          position: 'fixed',
          top: -310,
          left: 20,
          width: 120,
          height: 40,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          padding: '4px 8px',
        }}>
          <img src="/Zealous Logo.svg" alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: color }}>
          <img src="/icons/arrows.svg" alt="move icon" width={24} height={24} />
        </Button>
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: color }} onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}>
          <img src="/icons/zoom-out.svg" alt="zoom out icon" width={24} height={24} />
        </Button>
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: color }} onClick={() => setScale((s) => Math.min(s + 0.1, 3))}>
          <img src="/icons/zoom-in.svg" alt="zoom in icon" width={24} height={24} />
        </Button>
      </div>

      <div style={{
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
  boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1)",
}}>
  {[
    { label: "Front", rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 5 } },
    { label: "Side", rotation: { x: 0, y: Math.PI / 2, z: 0 }, position: { x: 5, y: 0, z: 0 } },
    { label: "Back", rotation: { x: 0, y: Math.PI, z: 0 }, position: { x: 0, y: 0, z: -5 } },
  ].map((view, i) => (
    <IconButton
      key={i}
      style={{ backgroundColor: color }}
      onClick={() => {
        setRotation(view.rotation);
        setPosition(view.position);
      }}
    >
      <img src="/icons/circle-line-icon.svg" alt={view.label} width={20} height={20} title={view.label} />
    </IconButton>
  ))}
</div>


      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <Button
          variant="contained"
          startIcon={<img className="Aricon-icon" src="/icons/Aricon.svg" alt="AR" />}
          style={{ backgroundColor: color }}
          sx={{ color: 'black', fontWeight: 'bold' }}
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
    </div>
  );
};

const GLBModel = ({ modelUrl, color, scale, position, rotation, onModelLoaded, setModelLoading }) => {
  const { scene } = useGLTF(modelUrl);
  const modelRef = useRef();

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