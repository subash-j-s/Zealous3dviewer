import React, { useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Center } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

import ModelLoader from './ModelLoader';


const Viewcanvas = () => {
  return (
    

    <div className='app-container' >
         <Canvas camera={{ position: [0, 0, 3], fov: 40 }} dpr={[1, 2]} className='AppBg'>
        <ambientLight intensity={0.2} />
        <OrbitControls/>
        <ContactShadows
          position={[0, -0.4, 0]} // Adjust shadow position to be closer to model base
          opacity={0.5}
          scale={10}
          blur={1.5}
          far={1}
        />
        <Environment preset="city" 
        background={true}
        blur={1} />
        <Center>
       
        </Center>
      </Canvas>




    </div>
  )
}

export default Viewcanvas