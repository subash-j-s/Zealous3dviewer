// Controls.jsx
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

const Controls = ({ enablePan, zoomDirection }) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (controls) {
      controls.enablePan = enablePan; // ✅ Enable/Disable Pan
    }
  }, [enablePan, controls]);

  useEffect(() => {
    if (zoomDirection !== 0) {
      const zoomFactor = zoomDirection > 0 ? 0.9 : 1.1; // ✅ Zoom In (0.9) / Out (1.1)
      camera.position.multiplyScalar(zoomFactor);
    }
  }, [zoomDirection, camera]);

  return null; // ✅ This component doesn't render anything
};

export default Controls;
