import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import {
  X,
  RotateCcw,
  Flashlight,
  FlashlightOff,
  Camera as CameraIcon,
  Check,
  Crop,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';

export default function CameraScreen() {
  const params = useLocalSearchParams<{ fromGallery?: string; imageUri?: string }>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(params.imageUri || null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 300, height: 400 });
  const [activeHandle, setActiveHandle] = useState<'move' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [zoom, setZoom] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const gestureStart = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 });
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // If coming from gallery, load the image directly for editing
  useEffect(() => {
    if (params.fromGallery === 'true' && params.imageUri) {
      setCapturedPhoto(params.imageUri);
      // Automatically open edit mode
      setTimeout(() => {
        editPhoto();
      }, 100);
    }
  }, [params.fromGallery, params.imageUri]);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (photo?.uri && photo?.base64) {
        // Get image dimensions
        Image.getSize(photo.uri, (width, height) => {
          setImageDimensions({ width, height });
          // Initialize crop area to center of image
          const cropWidth = Math.min(300, width * 0.8);
          const cropHeight = Math.min(400, height * 0.6);
          setCropArea({
            x: (width - cropWidth) / 2,
            y: (height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight,
          });
        });
        setCapturedPhoto(photo.uri);
        setPhotoBase64(photo.base64);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
    }
  };

  const retakePicture = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedPhoto(null);
    setPhotoBase64(null);
    setIsEditing(false);
  };

  const editPhoto = async () => {
    if (!capturedPhoto) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Get fresh dimensions of the current image
    Image.getSize(capturedPhoto, (width, height) => {
      setImageDimensions({ width, height });
      // Reset crop area to center with new dimensions
      const cropWidth = Math.min(300, width * 0.8);
      const cropHeight = Math.min(400, height * 0.6);
      setCropArea({
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
      setIsEditing(true);
    });
  };

  const confirmCrop = async () => {
    if (!capturedPhoto) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Calculate the crop area relative to the actual image size
      const { width, height } = imageDimensions;

      const actions = [
        {
          crop: {
            originX: Math.round(cropArea.x),
            originY: Math.round(cropArea.y),
            width: Math.round(cropArea.width),
            height: Math.round(cropArea.height),
          },
        },
      ];

      const result = await ImageManipulator.manipulateAsync(
        capturedPhoto,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (result.uri && result.base64) {
        setCapturedPhoto(result.uri);
        setPhotoBase64(result.base64);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const cancelEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
  };

  // Unified gesture handler
  const handleGestureStart = (evt: any, handle: 'move' | 'tl' | 'tr' | 'bl' | 'br') => {
    const touch = evt.nativeEvent;
    gestureStart.current = {
      x: touch.pageX,
      y: touch.pageY,
      cropX: cropArea.x,
      cropY: cropArea.y,
      cropWidth: cropArea.width,
      cropHeight: cropArea.height,
    };
    setActiveHandle(handle);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleGestureMove = (evt: any) => {
    if (!activeHandle) return;

    const touch = evt.nativeEvent;
    const screenDx = touch.pageX - gestureStart.current.x;
    const screenDy = touch.pageY - gestureStart.current.y;

    // Use actual container dimensions if available, otherwise fallback
    const displayWidth = containerDimensions.width > 0 ? containerDimensions.width : screenWidth;
    const displayHeight = containerDimensions.height > 0 ? containerDimensions.height : screenHeight - 200;

    const imageAspect = imageDimensions.width / imageDimensions.height;
    const displayAspect = displayWidth / displayHeight;

    let scale = 1;
    if (imageAspect > displayAspect) {
      scale = imageDimensions.width / displayWidth;
    } else {
      scale = imageDimensions.height / displayHeight;
    }

    const imageDx = screenDx * scale;
    const imageDy = screenDy * scale;

    const minSize = 100;

    if (activeHandle === 'move') {
      // Move the entire crop area
      let newX = gestureStart.current.cropX + imageDx;
      let newY = gestureStart.current.cropY + imageDy;

      newX = Math.max(0, Math.min(newX, imageDimensions.width - gestureStart.current.cropWidth));
      newY = Math.max(0, Math.min(newY, imageDimensions.height - gestureStart.current.cropHeight));

      setCropArea({
        x: newX,
        y: newY,
        width: gestureStart.current.cropWidth,
        height: gestureStart.current.cropHeight,
      });
    } else {
      // Resize from corner
      let newX = gestureStart.current.cropX;
      let newY = gestureStart.current.cropY;
      let newWidth = gestureStart.current.cropWidth;
      let newHeight = gestureStart.current.cropHeight;

      if (activeHandle === 'tl') {
        newX = gestureStart.current.cropX + imageDx;
        newY = gestureStart.current.cropY + imageDy;
        newWidth = gestureStart.current.cropWidth - imageDx;
        newHeight = gestureStart.current.cropHeight - imageDy;
      } else if (activeHandle === 'tr') {
        newY = gestureStart.current.cropY + imageDy;
        newWidth = gestureStart.current.cropWidth + imageDx;
        newHeight = gestureStart.current.cropHeight - imageDy;
      } else if (activeHandle === 'bl') {
        newX = gestureStart.current.cropX + imageDx;
        newWidth = gestureStart.current.cropWidth - imageDx;
        newHeight = gestureStart.current.cropHeight + imageDy;
      } else if (activeHandle === 'br') {
        newWidth = gestureStart.current.cropWidth + imageDx;
        newHeight = gestureStart.current.cropHeight + imageDy;
      }

      // Keep within bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newWidth = Math.min(imageDimensions.width - newX, newWidth);
      newHeight = Math.min(imageDimensions.height - newY, newHeight);

      // Enforce minimum size
      if (newWidth >= minSize && newHeight >= minSize) {
        setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
    }
  };

  const handleGestureEnd = () => {
    setActiveHandle(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmPhoto = async () => {
    if (capturedPhoto && photoBase64) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let optimizedBase64 = photoBase64;

      // Optimize image for faster processing
      try {
        const result = await ImageManipulator.manipulateAsync(
          capturedPhoto,
          [{ resize: { width: 1024 } }], // Resize to max 1024px width
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        optimizedBase64 = result.base64 || photoBase64;
      } catch (error) {
        console.log('Image optimization failed, using original:', error);
      }

      router.push({
        pathname: '/translate-result',
        params: {
          imageUri: capturedPhoto,
          base64: optimizedBase64,
        },
      });
    }
  };

  const toggleFlashlight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashMode(current => current === 'off' ? 'on' : 'off');
  };

  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackTitle}>Camera Not Available</Text>
          <Text style={styles.webFallbackText}>
            Camera is not available on web. Please use the photo upload feature.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <CameraIcon color="#ffffff" size={64} />
          <Text style={styles.permissionTitle}>Camera Permission</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to take photos and translate text
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Edit mode - crop the photo
  if (capturedPhoto && isEditing) {
    // Use actual container dimensions if available
    const displayWidth = containerDimensions.width > 0 ? containerDimensions.width : screenWidth;
    const displayHeight = containerDimensions.height > 0 ? containerDimensions.height : screenHeight - 200;

    const imageAspect = imageDimensions.width / imageDimensions.height;
    const displayAspect = displayWidth / displayHeight;

    let scale = 1;
    let displayImageWidth = displayWidth;
    let displayImageHeight = displayHeight;
    let imageOffsetX = 0;
    let imageOffsetY = 0;

    if (imageAspect > displayAspect) {
      // Image is wider - fit to width
      displayImageWidth = displayWidth;
      displayImageHeight = displayWidth / imageAspect;
      scale = imageDimensions.width / displayWidth;
      // Image is centered vertically
      imageOffsetY = (displayHeight - displayImageHeight) / 2;
    } else {
      // Image is taller - fit to height
      displayImageHeight = displayHeight;
      displayImageWidth = displayHeight * imageAspect;
      scale = imageDimensions.height / displayHeight;
      // Image is centered horizontally
      imageOffsetX = (displayWidth - displayImageWidth) / 2;
    }

    // Convert crop area from image coordinates to screen coordinates
    const cropOverlay = {
      left: (cropArea.x / scale) + imageOffsetX,
      top: (cropArea.y / scale) + imageOffsetY,
      width: cropArea.width / scale,
      height: cropArea.height / scale,
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.editContainer}>
          {/* Edit Header */}
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.headerButton} onPress={cancelEdit}>
              <X color="#ffffff" size={24} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Crop Image</Text>
            <TouchableOpacity style={styles.headerButton} onPress={confirmCrop}>
              <Check color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>

          {/* Image with crop overlay */}
          <View
            style={styles.editImageContainer}
            onLayout={(event) => {
              const { width, height, x, y } = event.nativeEvent.layout;
              setContainerDimensions({ width, height, x, y });
            }}
          >
            <Image
              source={{ uri: capturedPhoto }}
              style={[styles.previewImage, { width: displayImageWidth, height: displayImageHeight }]}
              resizeMode="contain"
            />

            {/* Crop overlay - positioned absolutely over the image */}
            <View
              style={[
                styles.cropAreaContainer,
                {
                  left: cropOverlay.left,
                  top: cropOverlay.top,
                  width: cropOverlay.width,
                  height: cropOverlay.height,
                },
              ]}
              onTouchMove={handleGestureMove}
              onTouchEnd={handleGestureEnd}
            >
              {/* Movable center area */}
              <View
                style={styles.cropAreaCenter}
                onTouchStart={(e) => handleGestureStart(e, 'move')}
              >
                <View style={styles.cropBorder} />
                <View style={styles.cropCenterIcon}>
                  <View style={styles.moveDots} />
                </View>
              </View>

              {/* Corner handles */}
              <View
                style={[styles.cornerHandle, styles.topLeft]}
                onTouchStart={(e) => handleGestureStart(e, 'tl')}
              >
                <View style={styles.cornerHandleInner} />
              </View>
              <View
                style={[styles.cornerHandle, styles.topRight]}
                onTouchStart={(e) => handleGestureStart(e, 'tr')}
              >
                <View style={styles.cornerHandleInner} />
              </View>
              <View
                style={[styles.cornerHandle, styles.bottomLeft]}
                onTouchStart={(e) => handleGestureStart(e, 'bl')}
              >
                <View style={styles.cornerHandleInner} />
              </View>
              <View
                style={[styles.cornerHandle, styles.bottomRight]}
                onTouchStart={(e) => handleGestureStart(e, 'br')}
              >
                <View style={styles.cornerHandleInner} />
              </View>
            </View>

            {/* Dark overlay - non-interactive, just for visual effect */}
            <View style={styles.cropDarkOverlay} pointerEvents="none">
              {/* Top */}
              <View style={[styles.darkArea, { height: cropOverlay.top, width: '100%' }]} />

              {/* Middle row */}
              <View style={{ flexDirection: 'row', height: cropOverlay.height }}>
                <View style={[styles.darkArea, { width: cropOverlay.left }]} />
                <View style={{ width: cropOverlay.width }} />
                <View style={[styles.darkArea, { flex: 1 }]} />
              </View>

              {/* Bottom */}
              <View style={[styles.darkArea, { flex: 1, width: '100%' }]} />
            </View>
          </View>

          {/* Edit Instructions */}
          <View style={styles.editInstructions}>
            <Text style={styles.editInstructionsText}>
              Drag center to move • Drag corners to resize
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Preview captured photo
  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedPhoto }}
            style={styles.previewImage}
            resizeMode="contain"
          />

          {/* Preview Header */}
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.headerButton} onPress={retakePicture}>
              <X color="#ffffff" size={24} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.headerButton} />
          </View>

          {/* Preview Controls */}
          <View style={styles.previewControls}>
            <TouchableOpacity
              style={[styles.previewButton, styles.retakeButton]}
              onPress={retakePicture}
            >
              <RotateCcw color="#ffffff" size={20} />
              <Text style={styles.previewButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.previewButton, styles.editButton]}
              onPress={editPhoto}
            >
              <Crop color="#ffffff" size={20} />
              <Text style={styles.previewButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.previewButton, styles.confirmButton]}
              onPress={confirmPhoto}
            >
              <Check color="#ffffff" size={20} />
              <Text style={styles.previewButtonText}>Translate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        flash={flashMode}
        zoom={zoom}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <X color="#ffffff" size={24} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Camera</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} onPress={toggleFlashlight}>
            {flashMode === 'on' ? (
              <Flashlight color="#fbbf24" size={24} />
            ) : (
              <FlashlightOff color="#ffffff" size={24} />
            )}
          </TouchableOpacity>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomContainer}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              setZoom(Math.max(0, zoom - 0.1));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <ZoomOut color="#ffffff" size={20} />
          </TouchableOpacity>
          <View style={styles.zoomBar}>
            <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
          </View>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              setZoom(Math.min(1, zoom + 0.1));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <ZoomIn color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleCameraFacing}
          >
            <RotateCcw color="#ffffff" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>

        {/* Helper text */}
        <View style={styles.helperContainer}>
          <Text style={styles.helperText}>
            Take a photo of the text you want to translate
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  helperContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  helperText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  zoomContainer: {
    position: 'absolute',
    bottom: 140,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  zoomFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  retakeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  editButton: {
    backgroundColor: '#f59e0b',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  webFallbackText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Edit mode styles
  editContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  editImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 100,
  },
  cropAreaContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  cropAreaCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  cropCenterIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveDots: {
    width: 8,
    height: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    opacity: 0.4,
  },
  cornerHandle: {
    position: 'absolute',
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  topLeft: {
    top: -35,
    left: -35,
  },
  topRight: {
    top: -35,
    right: -35,
  },
  bottomLeft: {
    bottom: -35,
    left: -35,
  },
  bottomRight: {
    bottom: -35,
    right: -35,
  },
  cornerHandleInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cropDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    zIndex: 5,
  },
  darkArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  editInstructions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  editInstructionsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
