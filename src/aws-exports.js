const awsconfig = {
    Auth: {
      identityPoolId: 'ap-south-1:dee672c2-0a23-4dd9-9fad-9152bc1a63af', // Your Cognito Identity Pool ID
      region: 'ap-south-1', // Your AWS region
    },
    Storage: {
      AWSS3: {
        bucket: 'zspace-demo', // Your S3 bucket name
        region: 'ap-south-1',
      }
    }
  };
  
  export default awsconfig;
  