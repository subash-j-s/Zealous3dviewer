import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Embedded = ({ open, onClose, embedUrl }) => {
    const embedCode = `<iframe src="${embedUrl}" width="600" height="400"></iframe>`;


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Upload Successful
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={onClose} 
          aria-label="close" 
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
        <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Your file has been successfully uploaded. Below is the embedded code you can use:
        </Typography>
        
        <TextField
          label="Embedded Code"
          multiline
          rows={4}
          value={embedCode}
          fullWidth
          disabled
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <Button variant="contained" onClick={onClose} fullWidth>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default Embedded;