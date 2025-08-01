import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Memory as MemoryIcon,
  ElectricalServices as ElectricalServicesIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const DataEntry = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue,
    getValues
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      driverName: '',
      serialNumber: '',
      inputVoltage: '',
      inputCurrent: '',
      inputWattage: '',
      powerFactor: '',
      outputVoltage: '',
      outputCurrent: '',
      outputWattage: '',
      efficiency: '',
      thd: '',
      rippleCurrent: '',
      rippleVoltage: '',
      surgeProtection: {
        result: '',
        kvLevel: ''
      },
      highVoltageTest: {
        result: '',
        conditions: ''
      },
      thermalTest: {
        result: '',
        remarks: ''
      },
      componentDetails: '',
      issues: '',
      remarks: '',
      testDate: format(new Date(), 'yyyy-MM-dd')
    }
  });

  // Form steps
  const steps = [
    {
      label: 'Basic Information',
      icon: <AssignmentIcon />,
      description: 'Driver identification and basic details'
    },
    {
      label: 'Electrical Specifications',
      icon: <ElectricalServicesIcon />,
      description: 'Input/output measurements and performance'
    },
    {
      label: 'Safety & Quality Tests',
      icon: <SecurityIcon />,
      description: 'Safety tests and quality metrics'
    },
    {
      label: 'Additional Information',
      icon: <MemoryIcon />,
      description: 'Components, issues, and final remarks'
    }
  ];

  // Photo upload using react-dropzone
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setUploadedPhoto(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  // Remove uploaded photo
  const removePhoto = () => {
    setUploadedPhoto(null);
    setPhotoPreview(null);
  };

  // Calculate efficiency based on input/output wattage
  useEffect(() => {
    const inputWattage = parseFloat(watch('inputWattage'));
    const outputWattage = parseFloat(watch('outputWattage'));
    
    if (inputWattage && outputWattage && inputWattage > 0) {
      const efficiency = (outputWattage / inputWattage) * 100;
      setValue('efficiency', efficiency.toFixed(2));
    }
  }, [watch('inputWattage'), watch('outputWattage'), setValue]);

  // Form submission
  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      let photoUrl = '';
      let driverId = '';

      // First, submit the form data to get driver ID
      const formResponse = await axios.post('/api/drivers', data);
      driverId = formResponse.data.driverId;

      // Upload photo if provided
      if (uploadedPhoto) {
        const formData = new FormData();
        formData.append('photo', uploadedPhoto);
        formData.append('driverId', driverId);
        formData.append('driverName', data.driverName);

        const uploadResponse = await axios.post('/api/upload/driver-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        photoUrl = uploadResponse.data.file.webViewLink;
      }

      toast.success(`LED driver test data saved successfully! Driver ID: ${driverId}`);
      setSubmissionSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        reset();
        removePhoto();
        setActiveStep(0);
        setSubmissionSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      
      if (error.response?.data?.error?.details) {
        const validationErrors = error.response.data.error.details;
        validationErrors.forEach(err => {
          toast.error(`${err.path}: ${err.msg}`);
        });
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to save test data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleStepClick = (step) => {
    setActiveStep(step);
  };

  // Render basic information step
  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="driverName"
          control={control}
          rules={{ required: 'Driver name is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Driver Name *"
              error={!!errors.driverName}
              helperText={errors.driverName?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="serialNumber"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Serial Number"
              placeholder="Optional"
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="testDate"
          control={control}
          rules={{ required: 'Test date is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="date"
              label="Test Date *"
              InputLabelProps={{ shrink: true }}
              error={!!errors.testDate}
              helperText={errors.testDate?.message}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Driver Photo
        </Typography>
        <Paper
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <input {...getInputProps()} />
          {photoPreview ? (
            <Box>
              <img
                src={photoPreview}
                alt="Driver preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  borderRadius: 8
                }}
              />
              <Box mt={2}>
                <IconButton color="error" onClick={(e) => {
                  e.stopPropagation();
                  removePhoto();
                }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Box>
              <PhotoCameraIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {isDragActive ? 'Drop the photo here' : 'Drag & drop a photo here, or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Supports: JPG, PNG, WebP (max 10MB)
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  // Render electrical specifications step
  const renderElectricalSpecs = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom color="primary">
          Input Specifications
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="inputVoltage"
          control={control}
          rules={{ 
            required: 'Input voltage is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 1000, message: 'Must be ≤ 1000V' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Input Voltage (V) *"
              error={!!errors.inputVoltage}
              helperText={errors.inputVoltage?.message}
              inputProps={{ step: 0.1, min: 0, max: 1000 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="inputCurrent"
          control={control}
          rules={{ 
            required: 'Input current is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 100, message: 'Must be ≤ 100A' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Input Current (A) *"
              error={!!errors.inputCurrent}
              helperText={errors.inputCurrent?.message}
              inputProps={{ step: 0.01, min: 0, max: 100 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="inputWattage"
          control={control}
          rules={{ 
            required: 'Input wattage is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 10000, message: 'Must be ≤ 10000W' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Input Wattage (W) *"
              error={!!errors.inputWattage}
              helperText={errors.inputWattage?.message}
              inputProps={{ step: 0.1, min: 0, max: 10000 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="powerFactor"
          control={control}
          rules={{ 
            required: 'Power factor is required',
            min: { value: 0, message: 'Must be ≥ 0' },
            max: { value: 1, message: 'Must be ≤ 1' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Power Factor *"
              error={!!errors.powerFactor}
              helperText={errors.powerFactor?.message}
              inputProps={{ step: 0.01, min: 0, max: 1 }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom color="primary">
          Output Specifications
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="outputVoltage"
          control={control}
          rules={{ 
            required: 'Output voltage is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 1000, message: 'Must be ≤ 1000V' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Output Voltage (V) *"
              error={!!errors.outputVoltage}
              helperText={errors.outputVoltage?.message}
              inputProps={{ step: 0.1, min: 0, max: 1000 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="outputCurrent"
          control={control}
          rules={{ 
            required: 'Output current is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 100, message: 'Must be ≤ 100A' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Output Current (A) *"
              error={!!errors.outputCurrent}
              helperText={errors.outputCurrent?.message}
              inputProps={{ step: 0.01, min: 0, max: 100 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="outputWattage"
          control={control}
          rules={{ 
            required: 'Output wattage is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 10000, message: 'Must be ≤ 10000W' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Output Wattage (W) *"
              error={!!errors.outputWattage}
              helperText={errors.outputWattage?.message}
              inputProps={{ step: 0.1, min: 0, max: 10000 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Controller
          name="efficiency"
          control={control}
          rules={{ 
            required: 'Efficiency is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 100, message: 'Must be ≤ 100%' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Efficiency (%) *"
              error={!!errors.efficiency}
              helperText={errors.efficiency?.message || 'Auto-calculated from input/output wattage'}
              inputProps={{ step: 0.01, min: 0, max: 100 }}
              InputProps={{
                readOnly: watch('inputWattage') && watch('outputWattage')
              }}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  // Render safety and quality tests step
  const renderSafetyTests = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom color="primary">
          Quality Metrics
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="thd"
          control={control}
          rules={{ 
            required: 'THD is required',
            min: { value: 0, message: 'Must be positive' },
            max: { value: 100, message: 'Must be ≤ 100%' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="THD (%) *"
              error={!!errors.thd}
              helperText={errors.thd?.message || 'Total Harmonic Distortion'}
              inputProps={{ step: 0.01, min: 0, max: 100 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="rippleCurrent"
          control={control}
          rules={{ 
            required: 'Ripple current is required',
            min: { value: 0, message: 'Must be positive' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Ripple Current (mA) *"
              error={!!errors.rippleCurrent}
              helperText={errors.rippleCurrent?.message}
              inputProps={{ step: 0.1, min: 0 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="rippleVoltage"
          control={control}
          rules={{ 
            required: 'Ripple voltage is required',
            min: { value: 0, message: 'Must be positive' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Ripple Voltage (mV) *"
              error={!!errors.rippleVoltage}
              helperText={errors.rippleVoltage?.message}
              inputProps={{ step: 0.1, min: 0 }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom color="primary">
          Safety Tests
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="surgeProtection.result"
          control={control}
          rules={{ required: 'Surge protection result is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.surgeProtection?.result}>
              <InputLabel>Surge Protection *</InputLabel>
              <Select {...field} label="Surge Protection *">
                <MenuItem value="Pass">
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    Pass
                  </Box>
                </MenuItem>
                <MenuItem value="Fail">
                  <Box display="flex" alignItems="center">
                    <CancelIcon color="error" sx={{ mr: 1 }} />
                    Fail
                  </Box>
                </MenuItem>
              </Select>
              {errors.surgeProtection?.result && (
                <Typography variant="caption" color="error">
                  {errors.surgeProtection.result.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="surgeProtection.kvLevel"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="kV Level"
              placeholder="Optional"
              inputProps={{ step: 0.1, min: 0 }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="highVoltageTest.result"
          control={control}
          rules={{ required: 'High voltage test result is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.highVoltageTest?.result}>
              <InputLabel>High Voltage Test *</InputLabel>
              <Select {...field} label="High Voltage Test *">
                <MenuItem value="Pass">
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    Pass
                  </Box>
                </MenuItem>
                <MenuItem value="Fail">
                  <Box display="flex" alignItems="center">
                    <CancelIcon color="error" sx={{ mr: 1 }} />
                    Fail
                  </Box>
                </MenuItem>
              </Select>
              {errors.highVoltageTest?.result && (
                <Typography variant="caption" color="error">
                  {errors.highVoltageTest.result.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="highVoltageTest.conditions"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Test Conditions"
              placeholder="Optional test conditions"
              multiline
              rows={2}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="thermalTest.result"
          control={control}
          rules={{ required: 'Thermal test result is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.thermalTest?.result}>
              <InputLabel>Thermal Test *</InputLabel>
              <Select {...field} label="Thermal Test *">
                <MenuItem value="Pass">
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    Pass
                  </Box>
                </MenuItem>
                <MenuItem value="Fail">
                  <Box display="flex" alignItems="center">
                    <CancelIcon color="error" sx={{ mr: 1 }} />
                    Fail
                  </Box>
                </MenuItem>
              </Select>
              {errors.thermalTest?.result && (
                <Typography variant="caption" color="error">
                  {errors.thermalTest.result.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="thermalTest.remarks"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Thermal Test Remarks"
              placeholder="Optional remarks"
              multiline
              rows={2}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  // Render additional information step
  const renderAdditionalInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Controller
          name="componentDetails"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Component Details"
              placeholder="BOM level summary or key components used"
              multiline
              rows={4}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="issues"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Issues/Abnormalities"
              placeholder="Mark any issues or abnormalities found during testing"
              multiline
              rows={3}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="remarks"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Additional Remarks"
              placeholder="Any additional comments or observations"
              multiline
              rows={3}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  // Get step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderElectricalSpecs();
      case 2:
        return renderSafetyTests();
      case 3:
        return renderAdditionalInfo();
      default:
        return null;
    }
  };

  if (submissionSuccess) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h4" gutterBottom color="success.main">
          Test Data Saved Successfully!
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          The LED driver test data has been saved to Google Drive.
          <br />
          You will be redirected to a new form shortly.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        LED Driver Test Data Entry
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Fill in the comprehensive test data for the LED driver. All required fields are marked with *.
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    icon={step.icon}
                    onClick={() => handleStepClick(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography variant="h6">{step.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Box py={2}>
                      {getStepContent(index)}
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <div>
                        <Button
                          variant="contained"
                          onClick={index === steps.length - 1 ? handleSubmit(onSubmit) : handleNext}
                          sx={{ mt: 1, mr: 1 }}
                          disabled={loading}
                        >
                          {loading ? (
                            <CircularProgress size={24} />
                          ) : index === steps.length - 1 ? (
                            'Save Test Data'
                          ) : (
                            'Continue'
                          )}
                        </Button>
                        <Button
                          disabled={index === 0}
                          onClick={handleBack}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Back
                        </Button>
                      </div>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Summary and submit section for final step */}
        {activeStep === steps.length && (
          <Card>
            <CardContent>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Ready to Submit
                </Typography>
                <Typography variant="body2">
                  Please review all the information before submitting the test data.
                  Once submitted, the data will be saved to Google Drive and assigned a unique Driver ID.
                </Typography>
              </Alert>

              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                  disabled={loading}
                >
                  Review Form
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit(onSubmit)}
                  disabled={loading || !isValid}
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {loading ? 'Saving...' : 'Submit Test Data'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </form>
    </Box>
  );
};

export default DataEntry;