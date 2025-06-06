import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

const webModelViewer = ({ modelUrl }) => {
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

          // Add the new model to the scene
          setModel(gltf);
          scene.add(gltf.scene);

          // Adjust camera and controls to fit the model
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
        },
        undefined,
        (error) => {
          console.error("Error loading model:", error);
        }
      );
    }
  }, [modelUrl, scene, camera, controls]);

  return null; // The model is added to the scene directly
};

const WebviewViewer = ({ modelUrl }) => {
  const [qrOpen, setQrOpen] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);

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
          console.log("✅ Shortened URL:", shortened);
        } catch (error) {
          console.error("❌ Short URL generation failed:", error);
          setShortUrl(modelUrl); // Fallback to original URL
        }
      };
      shortenUrl();
    }
  }, [modelUrl]);

  const handleARView = () => {
    setQrOpen(true);
  };

  const handleCloseQR = () => {
    setQrOpen(false);
  };

  const qrCodeValue = shortUrl || modelUrl; // Use shortened URL if available
  console.log("📱 QR Code Value:", qrCodeValue);

  return (
    <div>
      {/* 3D Viewer Canvas */}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        style={{ width: "100%", height: "70vh", background: "#f0f0f0" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <OrbitControls />
        <Environment preset="studio" background={false} />
        <Center>
          <ModelViewer modelUrl={modelUrl} />
        </Center>
      </Canvas>

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