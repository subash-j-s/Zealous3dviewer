import React, { useState, useEffect } from 'react';
import { IconButton, Switch, Slider, ToggleButton, ToggleButtonGroup, Collapse } from '@mui/material';
import Button from "@mui/material/Button";
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

  useEffect(() => {
    if (selectedModel?.scene) {
      const pos = selectedModel.scene.position;
      const rot = selectedModel.scene.rotation;
      setLivePosition({ x: pos.x, y: pos.y, z: pos.z });
      setLiveRotation({ x: rot.x * 180 / Math.PI, y: rot.y * 180 / Math.PI, z: rot.z * 180 / Math.PI });
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

  return (
    <Box sx={{ width: 230, bgcolor: "background.level1", p: 2, height: "100vh", overflowY: "auto", borderLeft: "5px solid", borderColor: "divider", boxShadow: "sm" }}>
      <Box onClick={() => setSettingsOpen(!settingsOpen)} sx={{ cursor: 'pointer', mt: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography level="subtitle1" sx={{ fontSize: '12px', fontWeight: 'bold' }}>Settings</Typography>
        {settingsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>

      <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <BackgroundSetting setModelSettings={setModelSettings} />
          <SkyboxSetting onSkyboxChange={onSkyboxChange} />
          <PreviewButton setShowPreview={setShowPreview} />
          <GridSetting setShowGrid={setShowGrid} showGrid={showGrid} />

          <Box>
            <Typography level="subtitle1" sx={{ fontSize: '11px', mb: 0.5 }}>Sensitivity</Typography>
            <ToggleButtonGroup
              value={sensitivity}
              exclusive
              onChange={(e, val) => val && setSensitivity(val)}
              size="small"
              fullWidth
              sx={{ gap: 0.5,  borderRadius: 2, bgcolor: 'background.level1', 
                display: 'flex',  padding: '2px' , fontFamily: 'Inter, sans-serif', }}
            >
              <ToggleButton value="low" sx={{ fontSize: '10px', px: 1, py: 0.5 }}>Low</ToggleButton>
              <ToggleButton value="high" sx={{ fontSize: '10px', px: 1, py: 0.5 }}>High</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box onClick={() => setTransformOpen(!transformOpen)} sx={{ cursor: 'pointer', mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography level="subtitle1" sx={{ fontSize: '12px', fontWeight: 'bold' }}>Transform</Typography>
            {transformOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>

          <Collapse in={transformOpen} timeout="auto" unmountOnExit>
            <Box sx={{ border: '1px solid #ccc', borderRadius: 2, p: 1 }}>
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
                    sx={{ width: '100%', mt: 0.5 }}
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
            </Box>
          </Collapse>
        </Box>
      </Collapse>
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

const SkyboxSetting = ({ onSkyboxChange }) => {
  const skyboxOptions = ["apartment", "city", "dawn", "forest", "lobby", "night", "park", "studio", "sunset", "warehouse"];
  return (
    <Box sx={{ width: 193, display: 'flex', gap: 4, alignItems: 'center', marginLeft: -0.6, borderRadius: 5, mt: 1 }}>
      <Typography level="subtitle1" sx={{ fontSize: '12px', color: 'primary.main', fontFamily: "Inter, sans-serif" }}>Skybox</Typography>
      <Select defaultValue="city" onChange={(e) => onSkyboxChange(e.target.value)} size="sm" sx={{ width: "100%", minWidth: 20, minHeight: 20 }}>
        {skyboxOptions.map((option) => (
          <Option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</Option>
        ))}
      </Select>
    </Box>
  );
};

const PreviewButton = ({ setShowPreview }) => (
  <Box sx={{ marginLeft: -0.5, borderRadius: 5, mt: 1, gap: 8, width: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  <Box sx={{ width: 180, marginLeft: -0.6, borderRadius: 5, mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <Typography level="subtitle1" sx={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'primary.main' }}>Grid</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showGrid ? <GridOnIcon sx={{ color: '#1976d2' }} /> : <GridOffIcon sx={{ color: '#aaa' }} />}
      <Switch checked={showGrid} onChange={() => setShowGrid(!showGrid)} variant="outlined" color={showGrid ? 'primary' : 'neutral'} />
    </Box>
  </Box>
);

export default Inspector;