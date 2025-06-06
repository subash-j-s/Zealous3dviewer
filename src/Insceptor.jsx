import React, { useState, useEffect, useRef } from 'react';
import { IconButton, Switch, Slider, ToggleButton, ToggleButtonGroup, Collapse, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
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
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

const Inspector = ({
  selectedModel,
  onSkyboxChange,
  setShowPreview,
  setModelSettings,
  setShowGrid,
  showGrid
}) => {
  const [livePosition, setLivePosition] = useState({ x: 0, y: 0, z: 0 });
  const [liveRotation, setLiveRotation] = useState({ x: 0, y: 0, z: 0 });
  const [sensitivity, setSensitivity] = useState('low');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transformOpen, setTransformOpen] = useState(false);
  const [selectedSkybox, setSelectedSkybox] = useState("city");
  const [effects, setEffects] = useState({ bloom: false, vignette: false });
  const [effectsOpen, setEffectsOpen] = useState(false); // Add this to your Inspector state
  const [skyboxFading, setSkyboxFading] = useState(false);
  const [pendingSkybox, setPendingSkybox] = useState(null);

  // 0: original, 1-3: user slots
  const [savedTransforms, setSavedTransforms] = useState([null, null, null, null]);
  const originalTransform = useRef({ position: null, rotation: null });

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
  const saveTransform = (index) => {
    if (index === 0) return; // Prevent overwriting original
    const newTransforms = [...savedTransforms];
    newTransforms[index] = {
      position: { ...livePosition },
      rotation: { ...liveRotation }
    };
    setSavedTransforms(newTransforms);
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

          {/* Move EffectsDropdown here */}
          <Box onClick={() => setEffectsOpen(!effectsOpen)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', 
            justifyContent: 'space-between', ml: -0.6, mb: 1, borderRadius: 2, bgcolor: 'background.level1',ml: -0.9 }}>
            <Typography level="subtitle1" sx={{ fontSize: '12px' }}>Effects</Typography>
            {effectsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          <Collapse in={effectsOpen} timeout="auto" unmountOnExit>
            <EffectsDropdown effects={effects} setEffects={setEffects} />
          </Collapse>

          <Box onClick={() => setTransformOpen(!transformOpen)} sx={{ cursor: 'pointer',  display: 'flex', alignItems: 'center', 
            justifyContent: 'space-between',ml: -0.6, mb: 1,  borderRadius: 2, bgcolor: 'background.level1',ml: -0.9 }}>
            <Typography level="subtitle1" sx={{ fontSize: '12px',  }}>Camera</Typography>
            {transformOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>

          <Collapse in={transformOpen} timeout="auto" unmountOnExit>
            <Box sx={{ border: '1px solid #ccc', borderRadius: 2, p: 1 }}>
              {/* Sensitivity option moved here */}
              <Box>
                <Typography level="subtitle1" sx={{ fontSize: '12px', mb: 0.5, }}>Sensitivity</Typography>
                <ToggleButtonGroup
                  value={sensitivity}
                  exclusive
                  onChange={(e, val) => val && setSensitivity(val)}
                  size="small"
                  fullWidth
                  sx={{
                    gap: 0.5,
                    borderRadius: 2,
                    bgcolor: 'background.level1',
                    display: 'flex',
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

              {['x', 'y', 'z'].map((axis) => (
                <Box key={`pos-${axis}`} sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: '11px' }}>Pos {axis.toUpperCase()}:</Typography>
                  <Slider
                    size="small"
                    value={livePosition[axis]}
                    onChange={(_, value) => handlePositionChange(axis, value)}
                    min={-10}
                    max={10}
                    step={stepValue}
                  />
                  <Input
                    type="number"
                    size="sm"
                    value={livePosition[axis]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handlePositionChange(axis, val);
                    }}
                    sx={{ width: '100%', mt: 0.5,fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                  />
                </Box>
              ))}

              {['x', 'y', 'z'].map((axis) => (
                <Box key={`rot-${axis}`} sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: '11px' }}>Rot {axis.toUpperCase()} (°):</Typography>
                  <Slider
                    size="small"
                    value={liveRotation[axis]}
                    onChange={(_, value) => handleRotationChange(axis, value)}
                    min={-180}
                    max={180}
                    step={rotStep}
                  />
                  <Input
                    type="number"
                    size="sm"
                    value={liveRotation[axis]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handleRotationChange(axis, val);
                    }}
                    sx={{ width: '100%', mt: 0.5 }}
                  />
                </Box>
              ))}

              {/* Save buttons in a single row */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center',fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => saveTransform(1)}
                  sx={{
                    fontSize: '9px',
                    minWidth: 28,
                    minHeight: 18,
                    px: 1,
                    py: 0.2,
                    borderRadius: 2
                  }}
                >
                  1
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => saveTransform(2)}
                  sx={{
                    fontSize: '9px',
                    minWidth: 28,
                    minHeight: 18,
                    px: 1,
                    py: 0.2,
                    borderRadius: 2,fontFamily: 'Inter, sans-serif', 
                  }}
                >
                  2
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => saveTransform(3)}
                  sx={{
                    fontSize: '9px',
                    minWidth: 28,
                    minHeight: 18,
                    px: 1,
                    py: 0.2,
                    borderRadius: 2
                  }}
                >
                  3
                </Button>
              </Box>

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
              <Button
                size="small"
                variant={savedTransforms[1] ? "contained" : "outlined"}
                color={savedTransforms[1] ? "primary" : "inherit"}
                disabled={!savedTransforms[1]}
                onClick={() => recallTransform(1)}
                sx={{
                  fontSize: '8px',
                  minWidth: 22,
                  minHeight: 14,
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 2
                }}
              >
                1
              </Button>
              <Button
                size="small"
                variant={savedTransforms[2] ? "contained" : "outlined"}
                color={savedTransforms[2] ? "primary" : "inherit"}
                disabled={!savedTransforms[2]}
                onClick={() => recallTransform(2)}
                sx={{
                  fontSize: '8px',
                  minWidth: 22,
                  minHeight: 14,
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 2
                }}
              >
                2
              </Button>
              <Button
                size="small"
                variant={savedTransforms[3] ? "contained" : "outlined"}
                color={savedTransforms[3] ? "primary" : "inherit"}
                disabled={!savedTransforms[3]}
                onClick={() => recallTransform(3)}
                sx={{
                  fontSize: '8px',
                  minWidth: 22,
                  minHeight: 14,
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 2
                }}
              >
                3
              </Button>
            </Box>
            </Box>
          </Collapse>
        </Box>
      </Collapse>

      {/* 3D Model Canvas */}
      <Canvas style={{ height: '400px', width: '100%', borderRadius: '8px', marginTop: '16px' }}>
        {/* ...other components... */}
        <Environment preset={selectedSkybox} background={false} />
        {(effects.bloom || effects.vignette) && (
          <EffectComposer>
            {effects.bloom && <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />}
            {effects.vignette && <Vignette eskil={false} offset={0.1} darkness={1.1} />}
          </EffectComposer>
        )}
        {/* ...other components... */}
      </Canvas>

      {skyboxFading && (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      bgcolor: 'background.paper',
      opacity: 0.7,
      zIndex: 9999,
      pointerEvents: 'none',
      transition: 'opacity 0.4s',
      animation: 'fadeInOut 0.4s linear'
    }}
  />
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
    <Box sx={{ width: 193, display: 'flex', gap: 4, alignItems: 'center', marginLeft: -0.6, borderRadius: 5, marginLeft: -0.9 }}>
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
  <Box sx={{ marginLeft: -0.5, borderRadius: 5, mt: 0.5, gap: 8, width: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center',marginLeft: -0.9 }}>
    <Typography level="subtitle1" sx={{ fontSize: '12px', fontFamily: "Inter, sans-serif", color: 'primary.main' }}>Preview</Typography>
    <IconButton
      onClick={() => setShowPreview(true)}
      sx={{ p: 0.15, border: '1px solid grey', borderRadius: 2, transition: 'all 0.3s ease', color: 'black', '&:hover': { backgroundColor: 'black', color: 'white' } }}
    >
      <RemoveRedEyeIcon fontSize="small" />
    </IconButton>
  </Box>
);

const GridSetting = ({ showGrid, setShowGrid }) => (
  <Box sx={{ width: 180, marginLeft: -0.6, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: -0.9 }}>
    <Typography level="subtitle1" sx={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'primary.main' }}>Grid</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {showGrid ? <GridOnIcon sx={{ color: '#1976d2' }} /> : <GridOffIcon sx={{ color: '#aaa' }} />}
      <Switch checked={showGrid} onChange={() => setShowGrid(!showGrid)} variant="outlined" color={showGrid ? 'primary' : 'neutral'} />
    </Box>
  </Box>
);

function EffectsDropdown({ effect, setEffect }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 5,
          px: 1,
          py: 0.5,
          width: '100%',
          cursor: 'pointer',
          backgroundColor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'sm',
          justifyContent: 'space-between',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            color: 'text.primary',
          }}
        >
          {effect ? `Effect: ${effect}` : 'Select Effect'}
        </Typography>
        <ExpandMoreIcon fontSize="small" />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          sx: { fontSize: '12px' },
        }}
      >
        {[
          'ambientOcclusion',  'fading',  'smoothEdges',  'adjustments', 'vignette',  'grain',  'colorBalance',  'bloom',  'softShadows',  'reflections',
        ].map((key) => (
          <MenuItem
            key={key}
            onClick={() => {
              setEffect(key);
              setAnchorEl(null);
            }}
          >
            <ListItemText
              primary={key.charAt(0).toUpperCase() + key.slice(1)}
              primaryTypographyProps={{ fontSize: '12px' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}




export default Inspector;