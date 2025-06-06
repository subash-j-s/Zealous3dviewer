//Hierachy.jsx


import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledListItem = styled(ListItem)(({ theme, level }) => ({
  paddingLeft: theme.spacing(level * 2),
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:before': {
    content: '"▸"',
    position: 'absolute',
    left: theme.spacing(1),
    color: theme.palette.text.secondary,
  }
}));


const Hierarchy = ({ hierarchy }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleListItemClick = (index) => {
    setSelectedIndex(index);
  };

  return (
    <Box 
      sx={{
        p: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        maxWidth: 400,
        mx: 'auto',
        bgcolor: 'background.paper'
      }}
    >

      {/* Logo Image */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <img 
          src="/Zealous Logo.svg" 
          alt="Logo" 
          style={{ maxWidth: '100%', height: '50px' }} 
        />
      </Box>

      {/* <Button 
        variant="contained" 
        fullWidth
        size="small"
        sx={{ textTransform: 'none' }}
        // Upload functionality (keeping button)
      >
        Upload to Aws
      </Button> */}
    </Box>
  );
};

export default Hierarchy;
