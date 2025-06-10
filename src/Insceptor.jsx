import { useState, useEffect, useRef } from 'react';
import { IconButton, Switch, Slider, ToggleButton, ToggleButtonGroup, Collapse, Button } from '@mui/material';
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import GridOnIcon from "@mui/icons-material/GridOn";
import GridOffIcon from "@mui/icons-material/GridOff";
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Input } from '@mui/joy';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
// import {
//   EffectComposer,
//   Bloom,
//   Vignette,
//   SSAO,
//   DepthOfField,
//   Noise,
//   HueSaturation,
//   ChromaticAberration,
//   ToneMapping,
//   BrightnessContrast,
//   SMAA
// } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useTransformRecall } from "./TransformRecallContext";
import { savePresetsToFirebase } from "./TransformRecallContext";
import { useParams } from "react-router-dom";

// RenderEffects Component
const RenderEffects = ({ effects }) => {
  return (
    <EffectComposer>
      {effects.bloom && <Bloom intensity={effects.bloom.intensity ?? 1} luminanceThreshold={effects.bloom.threshold ?? 0.2} luminanceSmoothing={effects.bloom.smoothing ?? 0.025}  />}
      {effects.vignette && <Vignette eskil={false} offset={0.1} darkness={1.1} />}
      {/* {effects.ambientOcclusion && <SSAO intensity={10} radius={0.05} luminanceInfluence={0.6} />} */}
      {/* {effects.fading && <DepthOfField focusDistance={0.03} focalLength={0.02} bokehScale={1.5} />} */}
      {effects.smoothEdges && <SMAA />}
      {effects.adjustments && <BrightnessContrast brightness={0.05} contrast={0.15} />}
      {effects.grain && <Noise opacity={0.2} />}
      {effects.colorBalance && <HueSaturation hue={0} saturation={0.2} />}
      {effects.softShadows && <ToneMapping mode={3} />}
      {effects.reflections && <ChromaticAberration offset={[0.001, 0.001]} />}
    </EffectComposer>
  );
};

const Inspector = ({
  selectedModel,
  onSkyboxChange,
  setShowPreview,
  setModelSettings,
  setShowGrid,
  showGrid,
  modelLoading, // <-- Add modelLoading prop
  controlsRef // <-- Accept controlsRef prop
}) => {
  const [livePosition, setLivePosition] = useState({ x: 0, y: 0, z: 0 });
  const [liveRotation, setLiveRotation] = useState({ x: 0, y: 0, z: 0 });
  const [sensitivity, setSensitivity] = useState('low');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transformOpen, setTransformOpen] = useState(false);
  const [selectedSkybox, setSelectedSkybox] = useState("city");
  const [effects, setEffects] = useState(
    { bloom: false, vignette: false, ambientOcclusion: false, fading: false, smoothEdges: false, adjustments: false, grain: false, 
      colorBalance: false, softShadows: false, reflections: false });
  const [effectsOpen, setEffectsOpen] = useState(false); 
  const [skyboxFading, setSkyboxFading] = useState(false);
  const [pendingSkybox, setPendingSkybox] = useState(null);
  const [cloudSaveStatus, setCloudSaveStatus] = useState(""); // <-- Add cloudSaveStatus state

  // 0: original, 1-3: user slots
  const [savedTransforms, setSavedTransforms] = useState([null, null, null, null]);
  const originalTransform = useRef({ position: null, rotation: null });

  const params = useParams();
  const projectName = params.projectName || window.projectName || "demo";

  useEffect(() => {
    if (selectedModel?.scene) {
      // Center the model ONCE when loaded
      const box = new THREE.Box3().setFromObject(selectedModel.scene);
      const center = box.getCenter(new THREE.Vector3());
      selectedModel.scene.position.sub(center); // Center the model
      // Optionally reset rotation here if you want
      setLivePosition({ x: selectedModel.scene.position.x, y: selectedModel.scene.position.y, z: selectedModel.scene.position.z });
      setLiveRotation({ x: selectedModel.scene.rotation.x * 180 / Math.PI, y: selectedModel.scene.rotation.y * 180 / Math.PI, z: selectedModel.scene.rotation.z * 180 / Math.PI });
      // Save original transform
      originalTransform.current = {
        position: { x: selectedModel.scene.position.x, y: selectedModel.scene.position.y, z: selectedModel.scene.position.z },
        rotation: { x: selectedModel.scene.rotation.x * 180 / Math.PI, y: selectedModel.scene.rotation.y * 180 / Math.PI, z: selectedModel.scene.rotation.z * 180 / Math.PI }
      };
      setSavedTransforms((prev) => [
        {
          position: { ...selectedModel.scene.position },
          rotation: { ...selectedModel.scene.rotation }
        },
        prev[1], prev[2], prev[3]
      ]);
    }
  }, [selectedModel?.scene]);

  const stepValue = sensitivity === 'high' ? 0.1 : 0.01;
  const rotStep = sensitivity === 'high' ? 5 : 1;

  const updateModelTransform = (pos, rot) => {
    if (selectedModel?.scene) {
      selectedModel.scene.position.set(pos.x, pos.y, pos.z);
      selectedModel.scene.rotation.set(
        rot.x * Math.PI / 180,
        rot.y * Math.PI / 180,
        rot.z * Math.PI / 180
      );
    }
  };

  const handlePositionChange = (axis, value) => {
    const updated = { ...livePosition, [axis]: value };
    setLivePosition(updated);
    updateModelTransform(updated, liveRotation);
  };

  const handleRotationChange = (axis, value) => {
    const updated = { ...liveRotation, [axis]: value };
    setLiveRotation(updated);
    updateModelTransform(livePosition, updated);
  };

  // Save current transform to a slot (1-3)
  const { savePreset, recallPreset, presets } = useTransformRecall();
  const [allSavedPrompt, setAllSavedPrompt] = useState(false);
  const saveTransform = async (index) => {
    if (index === 0) return; // Prevent overwriting original
    const newTransforms = [...savedTransforms];
    newTransforms[index] = {
      position: { ...livePosition },
      rotation: { ...liveRotation }
    };
    setSavedTransforms(newTransforms);
    savePreset(index, livePosition, liveRotation); // <-- Save to context
    // Save all presets to Firebase
    await savePresetsToFirebase(projectName, newTransforms);
    // Check if all three slots are filled
    if (newTransforms[1] && newTransforms[2] && newTransforms[3]) {
      setAllSavedPrompt(true);
      setTimeout(() => setAllSavedPrompt(false), 2500);
      // Restore original transform after all 3 are saved
      if (originalTransform.current.position && originalTransform.current.rotation) {
        setLivePosition({ ...originalTransform.current.position });
        setLiveRotation({ ...originalTransform.current.rotation });
        updateModelTransform(originalTransform.current.position, originalTransform.current.rotation);
      }
    }
    // Restore original transform after saving
    if (originalTransform.current.position && originalTransform.current.rotation) {
      setLivePosition({ ...originalTransform.current.position });
      setLiveRotation({ ...originalTransform.current.rotation });
      updateModelTransform(originalTransform.current.position, originalTransform.current.rotation);
    }
  };

  // Recall transform from a slot (0-3)
  const recallTransform = (index) => {
    const saved = savedTransforms[index];
    if (saved) {
      setLivePosition(saved.position);
      setLiveRotation(saved.rotation);
      updateModelTransform(saved.position, saved.rotation);
    }
  };

  // Pass both local and parent update to SkyboxSetting
  const handleSkyboxChange = (value) => {
    setSkyboxFading(true);
    setPendingSkybox(value);
    setTimeout(() => {
      setSelectedSkybox(value);
      if (onSkyboxChange) onSkyboxChange(value);
      setSkyboxFading(false);
      setPendingSkybox(null);
    }, 400); // 400ms fade
  };

 
  return (
    <Box sx={{ width: 230, bgcolor: "background.level1", p: 2, height: "100vh", overflowY: "auto", borderLeft: "5px solid", borderColor: "divider", boxShadow: "sm" }}>
      <Box onClick={() => setSettingsOpen(!settingsOpen)} sx={{ cursor: 'pointer', mt: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography level="subtitle1" sx={{ fontSize: '14px', fontWeight: 'bold',ml:-1, }}>Settings</Typography>
        {settingsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>

      <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1,fontFamily: 'Inter, sans-serif', }}>
          <BackgroundSetting setModelSettings={setModelSettings} />
          <SkyboxSetting onSkyboxChange={handleSkyboxChange} selectedSkybox={selectedSkybox} />
          <PreviewButton setShowPreview={setShowPreview} />
          <GridSetting setShowGrid={setShowGrid} showGrid={showGrid} />

       {/* Effects Section */}
          <Box onClick={() => setEffectsOpen(!effectsOpen)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',  
            borderRadius: 2, bgcolor: 'background.level1', ml: -0.9,mb:1,  }}>
            <Typography level="subtitle1" sx={{ fontSize: '12px' }}>Effects</Typography>
            {effectsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          <Collapse in={effectsOpen} timeout="auto" unmountOnExit>
            <Box sx={{ border: '1px solid #ccc', borderRadius: 5, p: 0.5, ml: -0.9, bgcolor: 'background.level1' }}>
              <EffectsDropdown effects={effects} setEffects={setEffects} />
            </Box>
          </Collapse>
          

          {/* Camera Section */}
          <Box onClick={() => setTransformOpen(!transformOpen)} sx={{ cursor: 'pointer',  display: 'flex', alignItems: 'center', 
            justifyContent: 'space-between', mb: 1,  borderRadius: 5, bgcolor: 'background.level1',ml: -0.9 }}>
            <Typography level="subtitle1" sx={{ fontSize: '12px',  }}>Model Position preset</Typography>
            {transformOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>

          <Collapse in={transformOpen} timeout="auto" unmountOnExit>
            <Box sx={{ border: '1px solid #ccc', borderRadius: 5, p: 1,ml:-0.9, }}>
              {/* Sensitivity and Axis Toggles in Single Row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography level="subtitle1" sx={{ fontSize: '12px', mb: 0.5 }}>Sensitivity</Typography>
                <ToggleButtonGroup
                  value={sensitivity}
                  exclusive
                  onChange={(e, val) => val && setSensitivity(val)}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'background.level1',
                    padding: '2px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <ToggleButton
                    value="low"
                    sx={{
                      fontSize: '9px',
                      px: 0.7,
                      py: 0.3,
                      minWidth: 28,
                      minHeight: 18,
                    }}
                  >
                    Low
                  </ToggleButton>
                  <ToggleButton
                    value="high"
                    sx={{
                      fontSize: '9px',
                      px: 0.7,
                      py: 0.3,
                      minWidth: 28,
                      minHeight: 18,
                    }}
                  >
                    High
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Position Controls */}
              {['x', 'y', 'z'].map((axis) => (
                <Box key={`pos-${axis}`} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', }}>
                    <Typography sx={{ fontSize: '11px' }}>Pos {axis.toUpperCase()}:</Typography>
                    <Input
                      type="number"
                      size="sm"
                      value={livePosition[axis]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) handlePositionChange(axis, val);
                      }}
                      sx={{ width: 100, fontFamily: 'Inter, sans-serif', fontSize: '12px', }}
                    />
                  </Box>
                  <Slider
                    size="small"
                    value={livePosition[axis]}
                    onChange={(_, value) => handlePositionChange(axis, value)}
                    min={-10}
                    max={10}
                    step={stepValue}
                  />
                </Box>
              ))}

              {/* Rotation Controls */}
              {['x', 'y', 'z'].map((axis) => (
                <Box key={`rot-${axis}`} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11px' }}>Rot {axis.toUpperCase()} (°):</Typography>
                    <Input
                      type="number"
                      size="sm"
                      value={liveRotation[axis]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) handleRotationChange(axis, val);
                      }}
                      sx={{ width: 100, fontSize: '12px' }}
                    />
                  </Box>
                  <Slider
                    size="small"
                    value={liveRotation[axis]}
                    onChange={(_, value) => handleRotationChange(axis, value)}
                    min={-180}
                    max={180}
                    step={rotStep}
                  />
                </Box>
              ))}

              {/* Save Buttons Row */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                <Button size="small" variant="outlined" color="success" onClick={() => saveTransform(1)}
                  sx={{ fontSize: '9px', minWidth: 28, minHeight: 18, px: 1, py: 0.2, borderRadius: 2 }}>
                  1
                </Button>
                <Button size="small" variant="outlined" color="success" onClick={() => saveTransform(2)}
                  sx={{ fontSize: '9px', minWidth: 28, minHeight: 18, px: 1, py: 0.2, borderRadius: 2 }}>
                  2
                </Button>
                <Button size="small" variant="outlined" color="success" onClick={() => saveTransform(3)}
                  sx={{ fontSize: '9px', minWidth: 28, minHeight: 18, px: 1, py: 0.2, borderRadius: 2 }}>
                  3
                </Button>
              </Box>
              {/* Save Current Transform to Cloud Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button size="small" variant="contained" color="primary"
                  onClick={async () => {
                    setCloudSaveStatus("");
                    try {
                      const singleTransform = [{ position: { ...livePosition }, rotation: { ...liveRotation } }];
                      await savePresetsToFirebase(projectName, singleTransform);
                      setCloudSaveStatus("success");
                    } catch (e) {
                      setCloudSaveStatus("error");
                    }
                  }}
                  sx={{ fontSize: '10px', minWidth: 120, minHeight: 22, borderRadius: 2 }}>
                  Save Current Transform to Cloud
                </Button>
              </Box>
              {cloudSaveStatus === 'success' && (
                <Box sx={{ mt: 1, textAlign: 'center', color: 'green', fontWeight: 'bold', fontSize: '12px' }}>
                  Transform saved to cloud!
                </Box>
              )}
              {cloudSaveStatus === 'error' && (
                <Box sx={{ mt: 1, textAlign: 'center', color: 'red', fontWeight: 'bold', fontSize: '12px' }}>
                  Failed to save transform.
                </Box>
              )}

              {/* Recall buttons in a single row */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, justifyContent: 'center' }}>
              {/* <Button
                size="small"
                variant={savedTransforms[0] ? "contained" : "outlined"}
                color={savedTransforms[0] ? "primary" : "inherit"}
                disabled={!savedTransforms[0]}
                onClick={() => recallTransform(0)}
                sx={{
                  fontSize: '8px',
                  minWidth: 22,
                  minHeight: 14,
                  p:0.8,
                  borderRadius: 2
                }}
              >
                Default
              </Button> */}
              <Button size="small"  variant={savedTransforms[1] ? "contained" : "outlined"} color={savedTransforms[1] ? "primary" : "inherit"}
                disabled={!savedTransforms[1]}  onClick={() => recallTransform(1)}
                sx={{  fontSize: '8px',  minWidth: 22,  minHeight: 14,  px: 0.5,  py: 0.1,  borderRadius: 2}}>  1 </Button>
              <Button size="small"  variant={savedTransforms[2] ? "contained" : "outlined"} color={savedTransforms[2] ? "primary" : "inherit"}
                disabled={!savedTransforms[2]} onClick={() => recallTransform(2)}
                sx={{  fontSize: '8px',  minWidth: 22,  minHeight: 14,  px: 0.5,  py: 0.1,  borderRadius: 2}}>  2 </Button>
              <Button size="small"  variant={savedTransforms[3] ? "contained" : "outlined"} color={savedTransforms[3] ? "primary" : "inherit"}
                disabled={!savedTransforms[3]}  onClick={() => recallTransform(3)}
                sx={{  fontSize: '8px',  minWidth: 22,  minHeight: 14,  px: 0.5,  py: 0.1,  borderRadius: 2}}>  3 </Button>
            </Box>
            </Box>
          </Collapse>

          {/* Reset View Button */}
          <Button
            variant="contained"
            style={{ marginTop: 12, background: '#eee', color: '#222', fontWeight: 'bold' }}
            onClick={() => {
              // Use controlsRef from props
              if (controlsRef && controlsRef.current && selectedModel && selectedModel.scene) {
                const controls = controlsRef.current;
                const model = selectedModel;
                const box = new THREE.Box3().setFromObject(model.scene);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                model.scene.position.sub(center);
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = controls.object.fov * (Math.PI / 180);
                const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
                controls.object.position.set(center.x, center.y, cameraZ + maxDim);
                controls.object.lookAt(center);
                controls.target.set(center.x, center.y, center.z);
                controls.update();
                // Debug log
                console.log('[DEBUG] Reset View: Camera and model centered', {
                  cameraPosition: controls.object.position,
                  target: controls.target,
                  modelPosition: model.scene.position
                });
              } else {
                console.log('[DEBUG] Reset View: controlsRef or selectedModel not available');
              }
            }}
          >
            Reset View
          </Button>
        </Box>
      </Collapse>

      {/* 3D Model Canvas */}
      <Canvas style={{ height: '400px', width: '100%', borderRadius: '8px', marginTop: '16px' }}>
        <Environment preset={selectedSkybox} background={false} />
        {(effects.bloom || effects.vignette) && (
          <EffectComposer>
            {effects.bloom && <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />}
            {effects.vignette && <Vignette eskil={false} offset={0.1} darkness={1.1} />}
          </EffectComposer>
        )}
      </Canvas>

      {skyboxFading && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'background.paper', opacity: 0.7,  zIndex: 9999,
                    pointerEvents: 'none',  transition: 'opacity 0.4s',  animation: 'fadeInOut 0.4s linear' }}/> )}

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
    </Box>
                );
              };

const BackgroundSetting = ({ setModelSettings }) => {
  const defaultColor = "#EBEBEB";
  const colorNameMap = {
    "#EBEBEB": "Light Gray",
    "#F7F7F7": "Off White",
    "#3E3E3E": "Dark Gray",
    "#1C1A1D": "Almost Black",
  };

  useEffect(() => {
    setModelSettings((prev) => ({ ...prev, background: defaultColor }));
    const appBgElements = document.getElementsByClassName("AppBg");
    for (let element of appBgElements) {
      element.style.backgroundColor = defaultColor;
    }
  }, []);

  const handleColorChange = (color) => {
    setModelSettings((prev) => ({ ...prev, background: color }));
    const appBgElements = document.getElementsByClassName("AppBg");
    for (let element of appBgElements) {
      element.style.backgroundColor = color;
    }
  };

  return (
    <Box sx={{ p: 0, borderRadius: 5, mb: 0.5, gap: 1, width: 199, display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', marginLeft: -1.2 }}>
      <Typography level="subtitle1" sx={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'primary.main' }}>
        Background
      </Typography>
      <Select value={defaultColor} onChange={(e, v) => handleColorChange(v)} size="sm" sx={{ width: 120, minWidth: 20, minHeight: 20 }}>
        {Object.keys(colorNameMap).map((color) => (
          <Option key={color} value={color}>
            <Box component="span" sx={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', bgcolor: color, border: '1px solid #ccc', marginRight: 1 }} />
            <span style={{ fontSize: '12px' }}>{colorNameMap[color]}</span>
          </Option>
        ))}
      </Select>
    </Box>
  );
};

const SkyboxSetting = ({ onSkyboxChange, selectedSkybox }) => {
  const skyboxOptions = ["apartment", "city", "dawn", "forest", "lobby", "night", "park", "studio", "sunset", "warehouse"];
  return (
    <Box sx={{ width: 193, display: 'flex', gap: 4, alignItems: 'center', marginLeft: -0.9, borderRadius: 5, }}>
      <Typography level="subtitle1" sx={{ fontSize: '12px', color: 'primary.main', fontFamily: "Inter, sans-serif" }}>Skybox</Typography>
      <Select value={selectedSkybox} onChange={(e, v) => onSkyboxChange(v)} size="sm" sx={{ width: "100%", minWidth: 20, minHeight: 20 }}>
        {skyboxOptions.map((option) => (
          <Option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</Option>
        ))}
      </Select>
    </Box>
  );
};

const PreviewButton = ({ setShowPreview }) => (
  <Box sx={{ marginLeft: -0.9, borderRadius: 5, mt: 0.5, gap: 7, width: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center',}}>
    <Typography level="subtitle1" sx={{ fontSize: '12px', fontFamily: "Inter, sans-serif", color: 'primary.main' }}>Preview</Typography>
    <IconButton
      onClick={() => setShowPreview(true)}
      sx={{ p: 0.1, border: '1px solid grey', borderRadius: 2, transition: 'all 0.3s ease', color: 'black', '&:hover': { backgroundColor: 'black', color: 'white' } }}
    >
      <RemoveRedEyeIcon fontSize="small" />
    </IconButton>
  </Box>
);

const GridSetting = ({ showGrid, setShowGrid }) => (
  <Box sx={{ width: 195,  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: -0.9, }}>
    <Typography level="subtitle1" sx={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'primary.main' }}>Grid</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {showGrid ? <GridOnIcon sx={{ color: '#1976d2' }} /> : <GridOffIcon sx={{ color: '#aaa' }} />}
      <Switch checked={showGrid} onChange={() => setShowGrid(!showGrid)} variant="outlined" color={showGrid ? 'primary' : 'neutral'} />
    </Box>
  </Box>
);

function EffectsDropdown({ effects, setEffects }) {
  const [expanded, setExpanded] = useState({ bloom: false, ambientOcclusion: false, fading: false, smoothEdges: false, adjustments: false, 
                                                grain: false, colorBalance: false, softShadows: false, reflections: false });

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateEffectParam = (key, param, value) => {
    setEffects((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [param]: value,
      },
    }));
  };

  const defaultParams = {
    bloom: { intensity: 1, threshold: 0.2, smoothing: 0.025 },
    ambientOcclusion: { intensity: 1, radius: 0.05, luminanceInfluence: 0.6 },
    fading: { focusDistance: 0.03, focalLength: 0.02, bokehScale: 1.5 },
    smoothEdges: { intensity: 1, radius: 0.05, luminanceInfluence: 0.6 },
    adjustments: { brightness: 0.05, contrast: 0.15 },
    grain: { opacity: 0.2 },
    colorBalance: { hue: 0, saturation: 0.2 },
    softShadows: { mode: 3 },
    reflections: { offset: [0.001, 0.001] },
  };

  const renderSliders = (key, params) => {
    return Object.entries(params).map(([param, defaultVal]) => (
      <Box key={`${key}-${param}`} sx={{ mt: 1 }}>
        <Typography sx={{ fontSize: '12px' }}>{param.charAt(0).toUpperCase() + param.slice(1)}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Slider
            size="small"
            min={0}
            max={param.includes('mode') ? 10 : 5}
            step={0.01}
            value={effects[key]?.[param] ?? defaultVal}
            onChange={(_, value) => updateEffectParam(key, param, value)}
            sx={{ flexGrow: 1 }}
          />
          <Input
            type="number"
            value={effects[key]?.[param] ?? defaultVal}
            onChange={(e) => updateEffectParam(key, param, parseFloat(e.target.value))}
            size="sm"
            sx={{ width: 60 }}
          />
        </Box>
      </Box>
    ));
  };

  const effectKeys = Object.keys(defaultParams);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1, fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
      {effectKeys.map((key) => (
        <Box key={key} sx={{ borderRadius: 2, p: 0.4, }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => toggleExpand(key)}
          >
            <Typography sx={{ fontSize: '13px' }}>{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
            {expanded[key] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>

          {expanded[key] && (
            <Box sx={{ mt: 1, pl: 1 }}>
              {renderSliders(key, defaultParams[key])}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}






export default Inspector;