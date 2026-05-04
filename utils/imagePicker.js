import * as ImagePicker from 'expo-image-picker';

export const pickImageFromCamera = async () => {
  try {
    // Request camera permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.status !== 'granted') {
      return {
        success: false,
        error: 'Camera permission not granted',
      };
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return {
        success: false,
        error: 'Camera was canceled',
      };
    }

    return {
      success: true,
      uri: result.assets[0].uri,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to open camera',
    };
  }
};

export const pickImageFromGallery = async () => {
  try {
    // Request library permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.status !== 'granted') {
      return {
        success: false,
        error: 'Gallery permission not granted',
      };
    }

    // Launch gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return {
        success: false,
        error: 'Gallery selection was canceled',
      };
    }

    return {
      success: true,
      uri: result.assets[0].uri,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to open gallery',
    };
  }
};
