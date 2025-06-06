// import React, { useState, useEffect, useRef, Suspense } from "react";
// import { Button, Dialog, DialogTitle, DialogContent, Popover, ClickAwayListener } from "@mui/material";
// import { QRCodeCanvas } from "qrcode.react";
// import { Canvas } from "@react-three/fiber";
// import { OrbitControls, useGLTF } from "@react-three/drei";

// const Model = ({ url, color, position, scale }) => {
//   const gltf = useGLTF(url, true);
//   return (
//     <primitive
//       object={gltf.scene}
//       scale={scale}
//       position={[position.x, position.y, 0]}
//     >
//       <meshStandardMaterial attach="material" color={color} />
//     </primitive>
//   );
// };

// const PreviewViewer = () => {
//   const modelUrl = "https://modelviewer.dev/shared-assets/models/Astronaut.glb"; // replace with your .glb URL
//   console.log("🔗 Model URL received in PreviewViewer:", modelUrl);

//   const [qrOpen, setQrOpen] = useState(false);
//   const [shortUrl, setShortUrl] = useState(null);

//   const [scale, setScale] = useState(1);
//   const [colorPickerOpen, setColorPickerOpen] = useState(false);
//   const [color, setColor] = useState("#ffffff");
//   const colorPickerAnchorRef = useRef(null);
//   const [position, setPosition] = useState({ x: 0, y: 0 });

//   useEffect(() => {
//     if (modelUrl) {
//       const shortenUrl = async () => {
//         try {
//           const response = await fetch(
//             `https://tinyurl.com/api-create.php?url=${encodeURIComponent(modelUrl)}`
//           );
//           const shortened = await response.text();
//           setShortUrl(shortened);
//           console.log("✅ Shortened URL:", shortened);
//         } catch (error) {
//           console.error("❌ Short URL generation failed:", error);
//           setShortUrl(modelUrl);
//         }
//       };
//       shortenUrl();
//     }
//   }, [modelUrl]);

//   const handleARView = () => setQrOpen(true);
//   const handleCloseQR = () => setQrOpen(false);
//   const qrCodeValue = shortUrl || modelUrl;

//   const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 3));
//   const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.3));
//   const handleMove = () => setPosition((prev) => ({ x: prev.x + 0.1, y: prev.y }));

//   const toggleColorPicker = () => setColorPickerOpen((open) => !open);
//   const handleClickAway = () => setColorPickerOpen(false);
//   const handleColorChange = (e) => setColor(e.target.value);

//   return (
//     <div>
//       <div className="preview-viewer-container">
//         <Button
//           className="movebutton"
//           variant="contained"
//           startIcon={<img src="/icons/arrows.svg" alt="move icon" />}
//           onClick={handleMove}
//         ></Button>

//         <Button
//           className="zoomout"
//           variant="contained"
//           startIcon={<img src="/icons/zoom-out.svg" alt="zoom out icon" />}
//           onClick={handleZoomOut}
//         ></Button>

//         <Button
//           className="zoomin"
//           variant="contained"
//           startIcon={<img src="/icons/zoom-in.svg" alt="zoom in icon" />}
//           onClick={handleZoomIn}
//         ></Button>

//         <Button
//           ref={colorPickerAnchorRef}
//           className="colorpicker"
//           variant="contained"
//           startIcon={<img src="/icons/color-wheel.png" alt="Color picker icon" />}
//           onClick={toggleColorPicker}
//           style={{
//             backgroundColor: color,
//             color: "#000",
//             border: "1px solid #ccc",
//           }}
//         ></Button>
//       </div>

//       <Popover
//         open={colorPickerOpen}
//         anchorEl={colorPickerAnchorRef.current}
//         onClose={() => setColorPickerOpen(false)}
//         anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
//         transformOrigin={{ vertical: "top", horizontal: "left" }}
//         PaperProps={{
//           style: { padding: 10, display: "flex", alignItems: "center" },
//         }}
//       >
//         <ClickAwayListener onClickAway={handleClickAway}>
//           <input
//             type="color"
//             value={color}
//             onChange={handleColorChange}
//             style={{
//               width: 40,
//               height: 40,
//               border: "none",
//               cursor: "pointer",
//               borderRadius: 5,
//               padding: 0,
//               margin: 0,
//             }}
//           />
//         </ClickAwayListener>
//       </Popover>

//       <div style={{ height: "400px", marginTop: "20px", border: "1px solid #ccc" }}>
//         <Canvas camera={{ position: [0, 0, 3] }}>
//           <ambientLight intensity={0.5} />
//           <directionalLight position={[5, 5, 5]} />
//           <Suspense fallback={null}>
//             <Model url={modelUrl} color={color} position={position} scale={scale} />
//           </Suspense>
//           <OrbitControls />
//         </Canvas>
//       </div>

//       <div className="Arviewbutton-container">
//         <Button
//           className="ARbutton"
//           variant="contained"
//           startIcon={<img className="Aricon-icon" src="/icons/Aricon.svg" alt="AR icon" />}
//           onClick={handleARView}
//         >
//           See in your Space
//         </Button>
//       </div>

//       <Dialog open={qrOpen} onClose={handleCloseQR}>
//         <DialogTitle>Scan QR Code for AR View</DialogTitle>
//         <DialogContent>
//           {qrCodeValue ? (
//             <QRCodeCanvas value={qrCodeValue} size={256} />
//           ) : (
//             <p>Model URL is not available</p>
//           )}
//           <p>Scan this QR code with your mobile device to view the model in AR.</p>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default PreviewViewer;










//  new code

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

const getArViewerUrl = (modelUrl, type = "google") => {
  if (type === "google") return `https://arvr.google.com/?model=${encodeURIComponent(modelUrl)}`;
  return modelUrl;
};

const Model = ({ modelUrl, position, rotation, scale }) => {
  const { scene } = useGLTF(modelUrl, true);

  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }, [scene]);

  // Apply rotation and position to the group
  return clonedScene ? (
    <group
      position={[
        position.x || 0,
        position.y || 0,
        position.z || 0
      ]}
      rotation={[
        (rotation.x || 0) * Math.PI / 180,
        (rotation.y || 0) * Math.PI / 180,
        (rotation.z || 0) * Math.PI / 180
      ]}
      scale={[scale, scale, scale]}
    >
      <primitive object={clonedScene} />
    </group>
  ) : null;
};

const PreviewViewer = () => {
  const [modelUrl, setModelUrl] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerAnchorRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  const arType = "google";

  useEffect(() => {
    // Replace with your model URL
    setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
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

  const handleARView = () => setQrOpen(true);
  const handleCloseQR = () => setQrOpen(false);
  const handleClickAway = () => setColorPickerOpen(false);
  const handleColorChange = (e) => setColor(e.target.value);

  const qrCodeValue = shortUrl || modelUrl;

  return (
    <div>
      <div className="preview-viewer-container" style={{ marginBottom: 10 }}>
        <Button variant="contained"  sx={{
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
                    }}   style={{ backgroundColor: color }}       onClick={() => setPosition((p) => ({ ...p, x: p.x + 1 }))}    >
                  <img src="/icons/arrows.svg" alt="move icon" width={24} height={24} />
                </Button>

        <Button variant="contained" sx={{
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
                    }}  style={{ backgroundColor: color }}       onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}>
                  <img src="/icons/zoom-out.svg" alt="zoom out icon" width={24} height={24} />
                </Button>

        <Button variant="contained"  sx={{
                    
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
                    }}   style={{ backgroundColor: color }}      onClick={() => setScale((s) => Math.min(s + 0.1, 3))}>
                  <img src="/icons/zoom-in.svg" alt="zoom in icon" width={24} height={24} />
                </Button>

        {/* Color picker button */}
        <Button variant="contained"  sx={{
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
                    }}      style={{ backgroundColor: color }}>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ opacity: 0, position: "absolute" }} />
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
        <ClickAwayListener onClickAway={handleClickAway}>
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
            style={{
              width: 40,
              height: 40,
              border: "none",
              cursor: "pointer",
              borderRadius: 5,
            }}
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

      

      <div style={{ position: "absolute", top: 40, right: 30, zIndex: 10 }}>
        <Button  style={{ backgroundColor: color, }} sx={{color:'black', fontWeight:'bold'}}
          className="ARbutton"
          variant="contained"
          startIcon={<img className="Aricon-icon" src="/icons/Aricon.svg" alt="AR icon" />}
          onClick={handleARView}
        >
          See in your Space
        </Button>
      </div>

        {/* === Added 3 buttons at bottom center to change X position === */}
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
    </div>
  );
};




export default PreviewViewer;