//ModelLoader.jsx


import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useThree,useFrame  } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Center, Html, Grid } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Card, CardContent, Typography, Button } from "@mui/material";
import { Amplify } from 'aws-amplify';
import { Storage } from '@aws-amplify/storage';
import awsconfig from './aws-exports';
import { Text } from '@react-three/drei';



function PositionTracker({ onUpdate }) {
  const { scene } = useThree();
  const modelRef = useRef();

  useFrame(() => {
    if (modelRef.current) {
      const { x, y, z } = modelRef.current.position;
      onUpdate({ x, y, z });
    }
  });

  return <primitive object={scene} ref={modelRef} />;
}




















Amplify.configure(awsconfig);

// Helper function to dispose model resources
const disposeModel = (scene) => {
  scene.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
};


const extractHierarchy = (scene) => {
  if (!scene || !scene.children) {
    console.error("Invalid scene structure:", scene);
    return [];
  }

  return scene.children.map((child) => ({
    name: child.name || "Unnamed",
    type: child.isMesh ? "Mesh" : "Group",
    children: child.children ? extractHierarchy(child) : [],
  }));
};


const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

const ModelViewer = ({ model, position, rotation }) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (model && model.scene) {
      const box = new THREE.Box3().setFromObject(model.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.scene.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));

      camera.position.set(center.x, center.y, cameraZ + maxDim);
      camera.lookAt(center);

      if (controls) {
        controls.target.set(center.x, center.y, center.z);
        controls.update();
      }
    }
  }, [model, camera, controls]);

  useEffect(() => {
    if (model && model.scene) {
      model.scene.position.set(position.x, position.y, position.z);
      model.scene.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }, [model, position, rotation]);

  if (!model) return null;
  return <primitive object={model.scene} />;
};

// Function to store the model (to local storage or trigger upload to S3)
const storeModel = (modelData, fileName) => {
  // Convert model data to blob and store in local storage (example)
  const modelBlob = new Blob([modelData], { type: 'application/octet-stream' });
  const reader = new FileReader();

  reader.onloadend = () => {
    // Store the model in local storage
    localStorage.setItem(fileName, reader.result);
    console.log('Model stored in local storage:', fileName);
  };

  reader.readAsDataURL(modelBlob);
};

const ModelLoader = ({ setHierarchy, setSelectedModel, selectedSkybox, setShowPreview, 
  showPreview, setModelSettings,setModelUrl,setModelFile,showGrid,selectedVariant,setVariants  }) => {
  const [uploadedModel, setUploadedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState([]);
  const [modelPosition, setModelPosition] = useState({ x: 0, y: 0, z: 0 });
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const controlsRef = useRef();

  useEffect(() => {
    if (!showPreview) {
      setHierarchy([]);
    }
  
  }, [showPreview,  setHierarchy]);

  // Load presets from model.json
  useEffect(() => {
    fetch("/model.json")
      .then(res => res.json())
      .then(data => setPresets(data.models || []));
  }, []);

  // ✅ Update model when a new variant is selected
  useEffect(() => {
    if (selectedVariant) {
      const reader = new FileReader();
      reader.onload = async (e) => {
          const loader = new GLTFLoader();
          try {
              const gltf = await loader.parseAsync(e.target.result, "");
              setUploadedModel(gltf);
              setSelectedModel(gltf);
          } catch (error) {
              console.error("Error loading variant:", error);
          }
      };
      reader.readAsArrayBuffer(selectedVariant);
  }
  }, [selectedVariant, setSelectedModel]);

  const handleUpload = async (file) => {
    setLoading(true);
    try {
      const fileKey = `models/${file.name}`;
      await Storage.put(fileKey, file, { contentType: file.type });
      const url = await Storage.get(fileKey, { expires: 3600 });
      setModelUrl(url);
      console.log('Model uploaded:', url);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Error uploading model. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleFile = async (file) => {
    if (file && (file.name.endsWith('.gltf') || file.name.endsWith('.glb'))) {
      const reader = new FileReader();
      setLoading(true);
  
      reader.onload = async (e) => {
        const loader = new GLTFLoader();
        try {
          const gltf = await loader.parseAsync(e.target.result, '');
          setUploadedModel(gltf);
          setSelectedModel(gltf);
          setModelFile(file); // Pass the file to the parent component
          setVariants((prevVariants) => {
            if (prevVariants.length === 0) {
              return [file]; // Set imported model as the first variant
            }
            return prevVariants;
          });
          const extractedHierarchy = extractHierarchy(gltf.scene);
          setHierarchy(extractedHierarchy);
          
          // Model is not stored automatically here
          // Call storeModel function from another script if needed
        } catch (error) {
          console.error('Error loading model:', error);
        } finally {
          setLoading(false);
        }
      };
  
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        setLoading(false);
      };
  
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a .gltf or .glb file');
    }
  };


  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };


const AxesHelperComponent = ({
  size = 1,
  fontSize = 0.3,
  showLabels = true,
  xColor = '#ff0000',
  yColor = '#00ff00',
  zColor = '#0000ff',
}) => {
  const ref = React.useRef();

  React.useEffect(() => {
    if (ref.current) {
      ref.current.setColors(
        new THREE.Color(xColor),
        new THREE.Color(yColor),
        new THREE.Color(zColor)
      );
    }
  }, [xColor, yColor, zColor]);

  return (
    <>
      <axesHelper ref={ref} args={[1]} />
      <Text position={[size + 0.1, 0, 0]} fontSize={0.35} color="red">X</Text>
      <Text position={[0,size + 0.2, 0, 0]} fontSize={0.35} color="green">Y</Text>
      <Text position={[0, 0, size + 0.2]} fontSize={0.35} color="blue">Z</Text>
    </>
  );
};
  
  
  return (
    
    <div className="model-loader-container" style={{height:'100vh',width: '110vw',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'}} >
          <div  style={{  position: 'fixed', top: 20, left: 20, width: 120, height: 40, zIndex: 10000, display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)', padding: '4px 8px', }} >
            <img src="/Zealous Logo.svg"  alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}  />
          </div>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        dpr={[1, 2]}
        className="AppBg"
        onDrop={handleDrop}
        onDragOver={handleDragOver}  >

        {!showPreview && showGrid &&(
          <Grid
            position={[0, -0.5, 0]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor={"#dfdfdf"}
            sectionSize={2.5}
            sectionThickness={1}
            sectionColor={"#dfdfdf"}
            fadeDistance={30}
            fadeStrength={1}
            infiniteGrid
          />
        )}

        <ambientLight intensity={0.2} />
        <OrbitControls ref={controlsRef} />
        <ContactShadows position={[0, -0.4, 0]} opacity={0.5} scale={10} blur={1.5} far={1} />
        <Environment preset={selectedSkybox || 'city'} background={false} />
        
        {/* <CameraTracker setCameraPosition={setCameraPosition} /> */}
        <Center>
          <ModelViewer
            model={uploadedModel}
            position={modelPosition}
            rotation={modelRotation}
          /> 
          
        </Center>

        {!uploadedModel && !loading && (
          <Html center>
            <Card className="upload-options" style={{  width: 300,  height: 180,  borderRadius: 12, padding: 16, boxShadow:"0 4px 8px rgba(0, 0, 0, 0.2)",
                backgroundColor: '#fff', display: 'flex',  flexDirection: 'column',  justifyContent: 'center',}} >
              <CardContent>
                <Typography variant="body2"  className="drag-drop-message"  sx={{fontWeight:'bold', py:1, borderRadius:2, fontSize: '0.95rem',
                 mt: 1,  textAlign: 'center', bgcolor: 'background.paper',  transition: 'all 0.3s ease',
                  '&:hover': {transform: 'scale(1.01)', fontFamily: "Inter, sans-serif",  },}} >
                  Drag and drop a 3D model <br /><br /> (.gltf or .glb) here
                </Typography><br />
                <Button
                  variant="contained"
                  component="label"
                  className="file-input" sx={{width:130, py: 0.5, borderRadius: 2, fontSize: '0.85rem', textTransform: 'none', boxShadow:"0 4px 8px rgba(0, 0, 0, 0.2)",
                     transition: 'all 0.3s ease-in-out', '&:hover': { fontWeight: 600,boxShadow: 2,color:'black', }}} >
                 Browse Files
                  <input
                    type="file"
                    accept=".gltf,.glb"
                    onChange={handleFileInputChange}
                    hidden
                  />
                </Button>
              </CardContent>
            </Card>
          </Html>
        )}

        {loading && (
          <Html center>
            <LoadingSpinner />
          </Html>
        )}
      </Canvas>

      {loading && (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      )}
   
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          width: 120,
          height: 120,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          zIndex: 9999,
          pointerEvents: 'none', 
        }}
      >
        <Canvas
          camera={{ position: [2, 2, 2], fov: 50 }}
          style={{ width: '100%', height: '100%', borderRadius: 8 }}
        >
          <ambientLight intensity={0.8} />
          <AxesHelperComponent size={1} fontSize={0.15}
                  xColor="#ff6347"
                  yColor="#32cd32"
                  zColor="#1e90ff"
                  showLabels={true} />

                  
        </Canvas>
      </div>

       </div>
  );
};

export default ModelLoader;
