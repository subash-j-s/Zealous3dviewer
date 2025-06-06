//SharePage.jsx

import React, { useEffect, useState,useRef } from "react";
import { useParams } from "react-router-dom";
// import { Storage } from '@aws-amplify/storage';
import { Canvas, useThree } from "@react-three/fiber"; // Import useThree
import { OrbitControls, Environment, Center } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Button, Dialog, DialogTitle, DialogContent } from "@mui/material";
import * as THREE from 'three';
import Controls from "./Controls";
import { storage, ref, getDownloadURL } from "./firebase"; // Import Firebase Storage

const SharePage = () => {
  const { shareId } = useParams();
  const { projectName } = useParams(); // Extract projectName from the URL
  const [modelUrl, setModelUrl] = useState(null);
  const [skybox, setSkybox] = useState("studio");
  const [background, setBackground] = useState("#ffffff");
  const [loading, setLoading] = useState(true);
  const controlsRef = useRef();
  const [modelLoading, setModelLoading] = useState(false); // ✅ Track model loading state
  const [enablePan, setEnablePan] = useState(true);
  const [zoomDirection, setZoomDirection] = useState(0); // 1 for zoom in, -1 for zoom out
  const [variantTabOpen, setVariantTabOpen] = useState(false);
  const [variants, setVariants] = useState([]); // Store variant URLs
  const [previews, setPreviews] = useState([]); //
  const [usdzVariants, setUsdzVariants] = useState([]); // Store USDZ URLs


useEffect(() => {
  const loadShareData = async () => {
      setLoading(true);
      try {
          const jsonRef = ref(storage, `projects/${projectName}/share-data.json`);
          const jsonUrl = await getDownloadURL(jsonRef);
          const response = await fetch(jsonUrl);

          if (!response.ok) {
              throw new Error(`Failed to fetch share data: ${response.statusText}`);
          }

          const data = await response.json(); // ✅ Ensure data is defined

          // ✅ Get fallback URL for variant1.glb
          const fallbackUrl = await getDownloadURL(ref(storage, `projects/${projectName}/variant1.glb`));

          // ✅ Ensure unique variants (avoid duplicate variant1)
          let uniqueVariants = [...new Set(data.variants || [])]; // Remove duplicates

          if (uniqueVariants.length === 0) {
              uniqueVariants.push(fallbackUrl); // ✅ Only add fallback if no variants exist
          }

          setModelUrl(uniqueVariants[0]); // ✅ Set the first variant as default
          setSkybox(data.skybox || "studio");
          setBackground(data.background || "#ffffff");
          setVariants(data.variants || []);
          setPreviews(data.previews || []);
          setUsdzVariants(data.usdzVariants || []); // Load USDZ URLs
          setModelUrl(data.variants[0] || "");
      } catch (error) {
          console.error("Error loading share data:", error);
          setModelUrl(""); // Handle gracefully by setting an empty state
      } finally {
          setLoading(false);
      }
  };

  if (projectName) {
      loadShareData();
  }
}, [projectName]);


  // Apply zoom when zoomDirection changes
  useEffect(() => {
    if (controlsRef.current) {
      if (zoomDirection !== 0) {
        const zoomFactor = zoomDirection > 0 ? 0.9 : 1.1; // Zoom In (0.9) / Out (1.1)
        controlsRef.current.object.position.multiplyScalar(zoomFactor);
        setZoomDirection(0); // Reset zoom direction after applying
      }
    }
  }, [zoomDirection]);

  if (loading) {
    return <div>Loading...</div>;
  }

    // ✅ Function to Open AR Mode
    const openARView = () => {
      if (!modelUrl) {
        alert("Model not found!");
        return;
      }
  
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const currentVariantIndex = variants.indexOf(modelUrl);
  
      if (isIOS) {
        const usdzUrl = usdzVariants[currentVariantIndex];
        if (usdzUrl) {
          window.location.href = usdzUrl; // Use USDZ for iOS
        } else {
          alert("No USDZ file available for this variant. AR is not supported.");
        }
      } else if (isAndroid) {
        window.location.href = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;end;`;
      } else if (navigator.xr) {
        alert("WebXR not implemented yet. Try opening this on a mobile device for AR.");
      } else {
        alert("Your device does not support AR.");
      }
    };

    if (loading) {
      return <div>Loading...</div>;
    }
  
  

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      {modelLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading Model...</p>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 3], fov: 40 }}
       dpr={[1, 2]}
       className="AppBg"
       style={{ background: background }} // ✅ Apply background color from share data
      >
        <ambientLight intensity={0.2} />
        {/* <pointLight position={[10, 10, 10]} intensity={0.5} /> */}
        <OrbitControls ref={controlsRef} />
        
        <Environment preset={skybox} background={false} />
        <Center>
          <ModelViewer modelUrl={modelUrl}  setModelLoading={setModelLoading}/>
        </Center>
      </Canvas>
      <div className="preview-viewer-container">
    <Button 
  className="movebutton"
  variant="contained"
  startIcon={<img src="/icons/arrows.svg" />}
  onClick={() => setEnablePan(prev => !prev)} // ✅ Toggle pan
     >
      {enablePan }
  </Button>

<Button 
  className="zoomout"
  variant="contained"
  startIcon={<img src="/icons/zoom-out.svg" />}
  onClick={() => setZoomDirection(-1)} // ✅ Zoom Out
        >
 
</Button>

<Button 
  className="zoomin"
  variant="contained"
  startIcon={<img src="/icons/zoom-in.svg" />}
  onClick={() => setZoomDirection(1)} // ✅ Zoom In
 
></Button>

<Button 
  className="colorpicker"
  variant="contained"
  startIcon={<img src="/icons/color-wheel.png" />}
  onClick={() => setVariantTabOpen(!variantTabOpen)}
 
></Button>



</div>

{/* AR View Button */}
<div className="Arviewbutton-container">
        <Button
          className="ARbutton"
          variant="contained"
          startIcon={<img src="/icons/Aricon.svg" />}
          onClick={openARView} // ✅ Call function to open AR
        >
          See  your Space
        </Button>
      </div>

      <div className={`variant-tab ${variantTabOpen ? "open" : ""}`}>
  {/* <button className="variant-tab-toggle" onClick={() => setVariantTabOpen(!variantTabOpen)}>
    Variants
  </button> */}
  <div className="variant-list">
  {variants.slice(1).map((variant, index) => (
      <button key={index} onClick={() => setModelUrl(variant)}>
        {/* Shift previews: Use the current variant's preview for the next variant */}
        <img
          src={previews[index] || "/placeholder.jpg"} // Use the current variant's preview
          alt={`Variant ${index + 2}`} // Adjust the label to match the shifted variant
          width="100px"
        />
      </button>
    ))}
  </div>
</div>
</div>

    
  );

  
};

// ModelViewer component to load and display the 3D model
const ModelViewer = ({ modelUrl,setModelLoading }) => {
  const { scene, camera, controls } = useThree();
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (modelUrl) {
      if (setModelLoading) setModelLoading(true); // ✅ Check before calling

      const loader = new GLTFLoader();
      
      // Remove the previous model from the scene
      if (model) {
        scene.remove(model.scene);
      }


      loader.load(modelUrl, (gltf) => {
        const modelScene = gltf.scene;
        

        // Compute bounding box to center the model
        const box = new THREE.Box3().setFromObject(modelScene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        modelScene.position.sub(center); // Center the model

        // Adjust camera to fit the model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));

        camera.position.set(center.x, center.y, cameraZ + maxDim);
        camera.lookAt(center);

        if (controls) {
          controls.target.set(center.x, center.y, center.z);
          controls.update();
        }

        scene.add(modelScene);
        setModel(gltf);
        if (setModelLoading) setModelLoading(false); // ✅ Stop loading
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        if (setModelLoading) setModelLoading(false); // ✅ Stop loading
      });
    }
  }, [modelUrl, scene, camera, controls,setModelLoading]);

  return null;
};

export default SharePage;