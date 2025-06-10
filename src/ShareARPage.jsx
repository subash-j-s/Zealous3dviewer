import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { storage } from "./firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment,Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Button, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { ContentCopy } from "@mui/icons-material";
import { useTransformRecall } from "./TransformRecallContext";

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
  const { presets, setProjectName, presetsLoading } = useTransformRecall();
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
        setErrorMsg(
          error.message.includes("storage/object-not-found")
            ? "This shared model does not exist or has been deleted."
            : `Failed to load model: ${error.message}`
        );
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

  useEffect(() => {
    if (projectName) setProjectName(projectName);
  }, [projectName, setProjectName]);

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
        top: 30,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Button
          variant="contained"
          startIcon={<img src="/icons/share.png" alt="Share" style={{ width: 22, height: 22 }} />}
          sx={{ color: 'black', fontWeight: 'bold', background: '#eee', boxShadow: 2, borderRadius: 2, px: 2 }}
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
        <OrbitControls ref={controlsRef} />
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
          // backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          padding: '4px 8px',
        }}>
          <img src="/Zealous Logo.svg" alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: "#eee" }}>
          <img src="/icons/arrows.svg" alt="move icon" width={24} height={24} />
        </Button>
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: "#eee" }} onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}>
          <img src="/icons/zoom-out.svg" alt="zoom out icon" width={24} height={24} />
        </Button>
        <Button variant="contained" sx={buttonStyles} style={{ backgroundColor: "#eee" }} onClick={() => setScale((s) => Math.min(s + 0.1, 3))}>
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
          {[1, 2, 3].map((index, i) => (
            <IconButton
              key={index}
              style={{ backgroundColor: "#eee" }}
              onClick={() => {
                const preset = presets[index];
                if (preset) {
                  setRotation({
                    x: (preset.rotation.x || 0) * Math.PI / 180,
                    y: (preset.rotation.y || 0) * Math.PI / 180,
                    z: (preset.rotation.z || 0) * Math.PI / 180,
                  });
                  setPosition({
                    x: preset.position.x,
                    y: preset.position.y,
                    z: preset.position.z
                  });
                }
              }}
              title={["Front","Side","Back"][i]}
              disabled={presetsLoading}
            >
              {presetsLoading ? (
                <span style={{ width: 20, height: 20, display: 'inline-block', textAlign: 'center' }}>...</span>
              ) : (
                <img src="/icons/circle-line-icon.svg" alt={["Front","Side","Back"][i]} width={20} height={20} title={["Front","Side","Back"][i]} />
              )}
            </IconButton>
          ))}
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

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.set(position.x, position.y, position.z);
      modelRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }, [position, rotation]);

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