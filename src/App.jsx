//App.jsx

import { useState } from "react";
import Insceptor from "./Insceptor";
import ModelLoader from "./ModelLoader";
import PreviewViewer from "./PreviewViewer";
import { Storage } from "@aws-amplify/storage";
import { storage, ref, uploadBytes, getDownloadURL } from "./firebase"; // Import Firebase
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography, // ✅ Add this import
} from "@mui/material";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { QRCodeCanvas } from "qrcode.react"; // Import QRCodeCanvas

export default function App() {
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedSkybox, setSelectedSkybox] = useState("city");
  const [showPreview, setShowPreview] = useState(false);
  const [modelSettings, setModelSettings] = useState({
    model: null,
    background: "#ffffff", // default background color
    skybox: "city",
  });
  const [modelUrl, setModelUrl] = useState(null); // Store uploaded model URL
  const [showGrid, setShowGrid] = useState(false); // ✅ Add Grid toggle state
  const [modelFile, setModelFile] = useState(null); // Store the uploaded file
  const [openDialog, setOpenDialog] = useState(false); // State for dialog
  const [projectName, setProjectName] = useState(""); // State for project name
  const [variants, setVariants] = useState([]); // Store the variants
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0); // Track the current variant
  const [selectedVariant, setSelectedVariant] = useState(null); // State for model variants
  const [loadingUpload, setLoadingUpload] = useState(false); // ✅ Loader state
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [variantNames, setVariantNames] = useState([]); // ✅ Add this line
  const [previewImages, setPreviewImages] = useState([]); // ✅ Add this line
  const [usdzFiles, setUsdzFiles] = useState([]); // .usdz files
  const [openARDialog, setOpenARDialog] = useState(false);
  const [usdzFileForAR, setUsdzFileForAR] = useState(null); // New state for USDZ file in Share AR
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // New state for QR code URL


  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });

  

  // ✅ Generic function to upload a file to S3
  const uploadToS3 = async (file, key, contentType) => {
    try {
      await Storage.put(key, file, { contentType });
      return await Storage.get(key, { expires: 3600 });
    } catch (error) {
      console.error("Error uploading to S3:", error);
      alert("Failed to upload file. Please try again.");
      return null;
    }
  };

  // ✅ Function to generate a shareable link
  const handleShare = async () => {
    if (!modelFile) {
      alert("No model selected. Please import a model first.");
      return;
    }

    try {
      const fileKey = `models/${modelFile.name}`;
      const uploadedModelUrl = await uploadToS3(
        modelFile,
        fileKey,
        modelFile.type
      );
      if (!uploadedModelUrl) return;

      setModelUrl(uploadedModelUrl);

      const shareId = `share-${Date.now()}`;
      const shareData = {
        modelUrl: uploadedModelUrl,
        skybox: selectedSkybox,
        background: modelSettings.background,
        previewIcons: true,
      };

      const shareFileKey = `${shareId}.json`;
      const uploadedShareUrl = await uploadToS3(
        new Blob([JSON.stringify(shareData)], { type: "application/json" }),
        shareFileKey,
        "application/json"
      );
      if (!uploadedShareUrl) return;

      const shareUrl = `${window.location.origin}/share/${shareId}`;
      console.log("Shareable URL:", shareUrl);
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Shareable link copied to clipboard!");
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      alert("Failed to generate shareable link. Please try again.");
    }
  };

  // Open the dialog when "Share" is clicked
  const handleShareClick = () => {
    if (!modelFile) {
      alert("No model selected. Please import a model first.");
      return;
    }
    setOpenDialog(true);

    if (!projectName.trim()) {
      alert("Please enter a valid project name.");
      return;
    }

    if (variants.length > 0) {
      setOpenPreviewDialog(true); // If variants exist, open preview upload
    } else {
      handleShareToFirebase();
    }
  };

  const handlePreviewImageUpload = (index, file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImages((prev) => {
        const newPreviews = [...prev];
        newPreviews[index] = reader.result;
        return newPreviews;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVariantNameChange = (index, newName) => {
    setVariantNames((prevNames) => {
      const newNames = [...prevNames];
      newNames[index] = newName;
      return newNames;
    });
  };

  // Handle USDZ file upload
  const handleUsdzUpload = (index, file) => {
    setUsdzFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      newFiles[index] = file;
      return newFiles;
    });
  };

  // Handle project name input
  const handleProjectNameChange = (event) => {
    setProjectName(event.target.value);
  };

  // Close the dialog
  const handleDialogClose = () => {
    setOpenDialog(false);
    setProjectName("");
  };

  // ✅ Function to upload to Firebase and generate a shareable link
  const handleShareToFirebase = async () => {
    if (!modelFile) {
      alert("No model selected. Please import a model first.");
      return;
    }

    if (!projectName) {
      alert("Please enter a project name.");
      return;
    }

    setLoadingUpload(true); // ✅ Show loader

    try {
      const projectFolder = `projects/${projectName}`;
      let variantUrls = [];
      let usdzUrls = [];
      let previewUrls = [];

      // ✅ Upload the imported model as "variant1.glb"
      const modelFileName = `${projectFolder}/variant1.glb`;
      const modelRef = ref(storage, modelFileName);
      await uploadBytes(modelRef, modelFile);
      const modelDownloadUrl = await getDownloadURL(modelRef);
      variantUrls.push(modelDownloadUrl);

      // // ✅ Upload all variants as "variant2.glb", "variant3.glb", etc.
      // for (let i = 0; i < variants.length; i++) {
      //   const variantFileName = `${projectFolder}/variant${i + 1}.glb`;
      //   const variantRef = ref(storage, variantFileName);
      //   // ✅ Check if file is properly read
      //  console.log("Uploading Variant:", i + 2, variants[i]);

      // if (!variants[i]) {
      //  console.error(`Variant ${i + 2} is undefined or empty!`);
      //   continue; // Skip uploading this variant
      //   }
      //   await uploadBytes(variantRef, variants[i]);
      //   const variantDownloadUrl = await getDownloadURL(variantRef);
      //   variantUrls.push(variantDownloadUrl);
      // }

      if (usdzFiles[0]) {
        const usdzFileName = `${projectFolder}/variant1.usdz`;
        const usdzRef = ref(storage, usdzFileName);
        await uploadBytes(usdzRef, usdzFiles[0]);
        const usdzDownloadUrl = await getDownloadURL(usdzRef);
        usdzUrls.push(usdzDownloadUrl);
      } else {
        usdzUrls.push(null); // No USDZ for this variant
      }

      // Upload variant models
      for (let i = 0; i < variants.length; i++) {
        const variantFile = variants[i];
        const variantRef = ref(
          storage,
          `${projectFolder}/${variantNames[i] || `variant${i + 1}`}.glb`
        );
        await uploadBytes(variantRef, variantFile);
        const variantDownloadUrl = await getDownloadURL(variantRef);
        variantUrls.push(variantDownloadUrl);
      }

      // Upload preview images
      for (let i = 0; i < previewImages.length; i++) {
        const variantFile = variants[i];
        const variantName = variantNames[i] || `variant${i + 2}`;
        const variantFileName = `${projectFolder}/${variantName}.glb`;
        const variantRef = ref(storage, variantFileName);
        await uploadBytes(variantRef, variantFile);
        const variantDownloadUrl = await getDownloadURL(variantRef);
        variantUrls.push(variantDownloadUrl);

        if (usdzFiles[i + 1]) {
          // +1 because variant1 is the imported model
          const usdzFileName = `${projectFolder}/${variantName}.usdz`;
          const usdzRef = ref(storage, usdzFileName);
          await uploadBytes(usdzRef, usdzFiles[i + 1]);
          const usdzDownloadUrl = await getDownloadURL(usdzRef);
          usdzUrls.push(usdzDownloadUrl);
        } else {
          usdzUrls.push(null);
        }
      }

      // ✅ Upload JSON file with variant URLs
      const jsonFileName = `${projectFolder}/share-data.json`;
      const jsonRef = ref(storage, jsonFileName);
      const shareData = {
        modelUrl: variantUrls[0], // Default to variant1.glb
        skybox: selectedSkybox,
        background: modelSettings.background,
        variants: variantUrls,
        usdzVariants: usdzUrls, // Add USDZ URLs
        previews: previewUrls,
      };

      await uploadBytes(
        jsonRef,
        new Blob([JSON.stringify(shareData)], { type: "application/json" })
      );
      console.log("JSON file uploaded:", jsonFileName);

      // ✅ Copy shareable link
      const shareUrl = `${window.location.origin}/share/${projectName}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Shareable link copied to clipboard!");
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to generate shareable link. Please try again.");
    } finally {
      setLoadingUpload(false); // ✅ Hide loader after upload
    }
  };

  const onVariantUpload = (file) => {
    if (file) {
      setVariants((prevVariants) => {
        const newVariants = [...prevVariants, file];
        console.log("Variant uploaded:", file.name, newVariants); // Add this line for feedback
        setCurrentVariantIndex(newVariants.length - 1); // Set index to the last uploaded variant
        return newVariants;
      });
    } else {
      console.log("No file uploaded.");
    }
  };

  // ✅ Function to toggle variants
  const onToggleVariant = (index) => {
    setCurrentVariantIndex(index);
  };

  // ✅ Handle variant uploads
  const handleVariantUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const loader = new GLTFLoader();
      try {
        const gltf = await loader.parseAsync(e.target.result, "");

        setVariants((prevVariants) => {
          const newVariants = [...prevVariants]; // ✅ Correctly define newVariants
          console.log("Variants Updated:", newVariants); // ✅ Debugging log

          // If no variants exist, add the imported model as the first variant
          if (newVariants.length === 0 && selectedModel) {
            newVariants.push(selectedModel);
          }

          // Add the new variant
          newVariants.push(file);
          setCurrentVariantIndex(newVariants.length - 1); // ✅ Fix: Set the correct index

          return newVariants;
        });
      } catch (error) {
        console.error("Error loading variant:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ✅ Handle variant switching
  const handleToggleVariant = async (index) => {
    setCurrentVariantIndex(index);

    const file = variants[index];
    if (!file) {
      console.error("Selected variant file is missing.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const loader = new GLTFLoader();
      try {
        const gltf = await loader.parseAsync(e.target.result, "");
        setSelectedModel(gltf); // ✅ Set the parsed model
      } catch (error) {
        console.error("Error loading variant:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleShareAR = async () => {
    if (!modelFile) {
      alert("No model selected. Please import a model first.");
      return;
    }

    if (!projectName.trim()) {
      alert("Please enter a valid project name.");
      return;
    }

    setLoadingUpload(true);

    try {
      const projectFolder = `projects/${projectName}`;

      // Upload the GLB model
      const modelFileName = `${projectFolder}/variant1.glb`;
      const modelRef = ref(storage, modelFileName);
      await uploadBytes(modelRef, modelFile);
      const modelDownloadUrl = await getDownloadURL(modelRef);

      // Upload the USDZ file if provided
      let usdzDownloadUrl = null;
      if (usdzFileForAR) {
        const usdzFileName = `${projectFolder}/variant1.usdz`;
        const usdzRef = ref(storage, usdzFileName);
        await uploadBytes(usdzRef, usdzFileForAR);
        usdzDownloadUrl = await getDownloadURL(usdzRef);
      }

      // Upload JSON with AR data
      const jsonFileName = `${projectFolder}/share-ar-data.json`;
      const jsonRef = ref(storage, jsonFileName);
      const shareData = {
        modelUrl: modelDownloadUrl,
        usdzUrl: usdzDownloadUrl,
        skybox: selectedSkybox,
        background: modelSettings.background,
      };

      await uploadBytes(
        jsonRef,
        new Blob([JSON.stringify(shareData)], { type: "application/json" })
      );
      console.log("AR JSON file uploaded:", jsonFileName);

      // Generate the share URL
      const shareUrl = `${window.location.origin}/share-ar/${projectName}`;

      // Copy the link to clipboard
      await navigator.clipboard.writeText(shareUrl);

      // Set the QR code URL for display
      setQrCodeUrl(shareUrl);

      // Optional: Alert user that link is copied (can be removed if QR code display is enough)
      alert("Shareable AR link copied to clipboard!");
    } catch (error) {
      console.error("Error uploading files for AR sharing:", error);
      alert("Failed to generate shareable link and QR code. Please try again.");
    } finally {
      setLoadingUpload(false);
    }
  };

  // Reset QR code and dialog state when closing
  const handleARDialogClose = () => {
    setOpenARDialog(false);
    setQrCodeUrl(null); // Reset QR code
    setUsdzFileForAR(null); // Reset USDZ file
    setProjectName(""); // Reset project name
  };

  

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
    <div   className={`main-layout ${showPreview ? "preview-mode" : ""}`}>
      {/* {!showPreview && (
        <div className="hierachystyle">
          <Hierarchy hierarchy={hierarchy} />
        </div>
      )} */}

      <div  className={`app-container ${showPreview ? "preview-mode" : ""}`  }>
        <ModelLoader
          setHierarchy={setHierarchy}
          setSelectedModel={setSelectedModel}
          selectedSkybox={selectedSkybox}
          setShowPreview={setShowPreview}
          showPreview={showPreview}
          setModelUrl={setModelUrl}
          setModelFile={setModelFile}
          showGrid={showGrid}
          selectedVariant={variants[currentVariantIndex]} // Pass selected variant
          setVariants={setVariants} // ✅ Pass setVariants here
          uploadedModel={selectedModel} // ✅ Ensure selectedModel is passed 
          setCameraPosition={setCameraPosition} 
        />

        {/* Show PreviewViewer only when showPreview is true */}
        {showPreview && <PreviewViewer modelUrl={modelUrl}  />}

        {showPreview && (
        <PreviewViewer
          modelUrl={modelUrl}
          cameraPosition={cameraPosition} // ✅ pass this
        />
      )}

        {loadingUpload && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Uploading models, please wait...</p>
          </div>
        )}

        {/* <Button onClick={() => setOpenDialog(true)}>Share</Button> */}

        {/* Share to Firebase Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Enter Project Name</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Project Name"
              type="text"
              fullWidth
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleShareClick}>Next</Button>
          </DialogActions>
        </Dialog>

        {/* Preview Image Upload & Rename Dialog */}
        <Dialog
          open={openPreviewDialog}
          onClose={() => setOpenPreviewDialog(false)}
        >
          <DialogTitle>Upload Preview Images & Rename Variants</DialogTitle>
          <DialogContent>
            {/* Variant 1 (Imported Model) */}
            <div style={{ marginBottom: "10px" }}>
              <Typography>Variant 1</Typography>
              <TextField
                label="Variant Name"
                fullWidth
                value={variantNames[0] || ""}
                onChange={(e) => handleVariantNameChange(0, e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePreviewImageUpload(0, e.target.files[0])}
              />
              <input
                type="file"
                accept=".usdz"
                onChange={(e) => handleUsdzUpload(0, e.target.files[0])}
              />
              {previewImages[0] && (
                <img src={previewImages[0]} alt="Preview" width={100} />
              )}
            </div>

            {variants.map((variant, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <Typography>Variant {index + 2}</Typography>
                <TextField
                  label="Variant Name"
                  fullWidth
                  value={variantNames[index + 1] || ""}
                  onChange={(e) =>
                    handleVariantNameChange(index + 1, e.target.value)
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handlePreviewImageUpload(index + 1, e.target.files[0])
                  }
                />
                <input
                  type="file"
                  accept=".usdz"
                  onChange={(e) =>
                    handleUsdzUpload(index + 1, e.target.files[0])
                  }
                />
                {previewImages[index + 1] && (
                  <img
                    src={previewImages[index + 1]}
                    alt="Preview"
                    width={100}
                  />
                )}
              </div>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPreviewDialog(false)}>Cancel</Button>
            <Button onClick={handleShareToFirebase}>Upload & Share</Button>
          </DialogActions>
        </Dialog>

        {/* Exit and Share buttons in top-left when in preview mode */}
        {showPreview && (
          <div className="preview-buttons">
            <button
              className="exit-preview"
              onClick={() => setShowPreview(false)}
              style={{ width: "47px",height:'47px',}}
            >
              <img
                className="Aricon-icon"
                src="/icons/cross.png"
                alt="Close"
                style={{ width: "100%", height: "100%" }}
              />
            </button>
            {/* <button className="share-button" onClick={handleShareClick}>
              Share
            </button> */}
            <button
              className="share-ar-button"
              onClick={() => setOpenARDialog(true)}
              style={{ width: "47px", height: "47px" }}
            >
            <img
                className="Aricon-icon"
                src="icons/share.png"
                alt="share"
                style={{ width: "100%", height: "100%" }}
              />
            </button>
          </div>
        )}
      </div>

      <Dialog open={openARDialog} onClose={handleARDialogClose}>
        <DialogTitle>Share AR Model</DialogTitle>
        <DialogContent>
          {!qrCodeUrl ? (
            <>
              <TextField
                autoFocus
                margin="dense"
                label="Project Name"
                type="text"
                fullWidth
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <Typography variant="subtitle1" style={{ marginTop: "10px" }}>
                Upload USDZ File (Optional, for iOS AR):
              </Typography>
              <input
                type="file"
                accept=".usdz"
                onChange={(e) => setUsdzFileForAR(e.target.files[0])}
                style={{ marginTop: "10px" }}
              />
              {usdzFileForAR && (
                <Typography variant="body2">
                  Selected: {usdzFileForAR.name}
                </Typography>
              )}
              {loadingUpload && (
                <Typography variant="body1">Uploading...</Typography>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <Typography variant="h6">
                Scan QR Code to View AR Model
              </Typography>
              <QRCodeCanvas value={qrCodeUrl} size={256} />
              <Typography variant="body2" style={{ marginTop: "10px" }}>
                Link copied to clipboard. Scan the QR code or use the link
                below:
              </Typography>
              <Typography
                variant="body2"
                style={{ marginTop: "5px", wordBreak: "break-all" }}
              >
                <a href={qrCodeUrl} target="_blank" rel="noopener noreferrer">
                  {qrCodeUrl}
                </a>
              </Typography>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleARDialogClose}>
            {qrCodeUrl ? "Close" : "Cancel"}
          </Button>
          {!qrCodeUrl && (
            <Button onClick={handleShareAR} disabled={loadingUpload}>
              Share AR
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {!showPreview && (
        <div className="Inspectorstyle">
          <Insceptor
            selectedModel={selectedModel}
            onSkyboxChange={setSelectedSkybox}
            setShowPreview={setShowPreview}
            setModelSettings={setModelSettings}
            setShowGrid={setShowGrid} // ✅ Pass Grid toggle function
            showGrid={showGrid} // ✅ Pass Grid
            onVariantUpload={handleVariantUpload} // Pass the upload function
            onToggleVariant={handleToggleVariant} // Pass the toggle function
            variants={variants} // Pass the variants array
            currentVariantIndex={currentVariantIndex} // Pass the current variant index
             
          />
        </div>
      )}

    </div>
    </div>
  );
}
