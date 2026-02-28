import React, { useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { RouteNames } from "../../../appRoot/navigation/routes";
import { ThemeColors, radii, spacing, shadows } from "../../../core/theme/theme";
import { useTheme } from "../../../core/theme/ThemeProvider";

export default function CameraCaptureScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPerm, requestMediaPerm] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const selectedDateIso = route.params?.selectedDateIso;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Allow Camera</Text>
        <Text style={styles.sub}>TaskSnap needs camera to capture tasks.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: false });
    
    // Copy photo to permanent app storage
    const fileName = `task_photo_${Date.now()}.jpg`;
    const permanentUri = `${(FileSystem as any).documentDirectory}${fileName}`;
    
    try {
      console.log('📸 Copying camera photo to permanent storage:', permanentUri);
      await FileSystem.copyAsync({
        from: photo.uri,
        to: permanentUri
      });
      console.log('✅ Camera photo copied to permanent storage');
      setPhotoUri(permanentUri);
    } catch (err) {
      console.error('❌ Failed to copy camera photo:', err);
      setPhotoUri(photo.uri); // Fallback to original
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      
      // Copy library photo to permanent app storage
      const fileName = `task_photo_library_${Date.now()}.jpg`;
      const permanentUri = `${(FileSystem as any).documentDirectory}${fileName}`;
      
      try {
        console.log('📚 Copying library photo to permanent storage:', permanentUri);
        await FileSystem.copyAsync({
          from: selectedUri,
          to: permanentUri
        });
        console.log('✅ Library photo copied to permanent storage');
        setPhotoUri(permanentUri);
      } catch (err) {
        console.error('❌ Failed to copy library photo:', err);
        setPhotoUri(selectedUri); // Fallback to original
      }
    }
  };

  const saveAndContinue = async () => {
    if (!photoUri) return;
    setSaving(true);

    try {
      console.log('🚀 Starting photo save process...');
      console.log('📸 Permanent photo URI:', photoUri);

      // Photo is already saved to permanent local storage
      // No base64 conversion needed for local storage
      console.log('✅ Using permanent local storage (no base64 conversion needed)');

      // Optional: Save to device Photos (copy from permanent local storage)
      let mediaStatus = mediaPerm;
      if (!mediaStatus?.granted) {
        try {
          const res = await requestMediaPerm();
          mediaStatus = res;
        } catch (err) {
          console.log('⚠️ Media permission not granted:', err);
        }
      }

      if (mediaStatus?.granted) {
        try {
          await MediaLibrary.saveToLibraryAsync(photoUri);
          console.log('📱 Photo saved to device gallery');
        } catch (err) {
          console.log('⚠️ Failed to save to gallery (optional):', err);
        }
      }

      console.log('🎯 Navigating to task review with permanent local image...');

      // Navigate with the permanent local URI (no base64 needed)
      navigation.navigate(RouteNames.TaskReview, {
        imageUri: photoUri,  // Permanent local file path
        selectedDateIso
      });

      console.log('✅ Navigation successful');

    } catch (err) {
      console.error("❌ Failed to save photo:", err);
      // Still try to navigate even if base64 conversion fails
      try {
        navigation.navigate(RouteNames.TaskReview, {
          imageUri: photoUri,
          selectedDateIso
        });
      } catch (navErr) {
        console.error("❌ Navigation also failed:", navErr);
      }
    } finally {
      setSaving(false);
    }
  };

  // Preview mode
  if (photoUri) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: photoUri }} style={styles.previewImg} />

        <View style={styles.previewTop}>
          <Text style={styles.previewBadge}>Preview</Text>
        </View>

        <View style={styles.previewBottom}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhotoUri(null)}>
            <Text style={styles.secondaryText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={saveAndContinue} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? "Saving..." : "Use Photo"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );  
  }

  // Camera mode
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        // Keep flash mode for photo capture and enable torch for live preview.
        flash={flashEnabled ? "on" : "off"}
        enableTorch={flashEnabled}
      />

      <View style={styles.topGradient}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.header}>Capture your task or assignment</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.viewfinder}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        <View style={styles.scanLine} />
      </View>

      <View style={styles.bottomOverlay}>
        <View style={styles.aiHint}>
          <MaterialIcons name="photo-camera" size={16} color={colors.primary} />
          <Text style={styles.aiHintText}>Capture a photo, then enter task details on the next screen</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.sideButton} onPress={pickFromLibrary}>
            <View style={styles.buttonIcon}>
              <MaterialIcons name="photo-library" size={24} color="#fff" />
            </View>
            <Text style={styles.sideLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutterOuter} onPress={capture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideButton} onPress={() => setFlashEnabled((v) => !v)}>
            <View style={styles.buttonIcon}>
              <MaterialIcons name={flashEnabled ? "flash-on" : "flash-off"} size={24} color="#fff" />
            </View>
            <Text style={styles.sideLabel}>{flashEnabled ? "Flash On" : "Flash Off"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },

  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  header: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1, textAlign: "center" },

  viewfinder: {
    position: "absolute",
    top: 140,
    left: 28,
    right: 28,
    bottom: 200,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cornerTL: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    borderTopLeftRadius: radii.sm,
  },
  cornerTR: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    borderTopRightRadius: radii.sm,
  },
  cornerBL: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    borderBottomLeftRadius: radii.sm,
  },
  cornerBR: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    borderBottomRightRadius: radii.sm,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "rgba(17,82,212,0.9)",
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    gap: spacing.md,
  },
  aiHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  aiHintText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  controlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideButton: { alignItems: "center", gap: 6, width: 70 },
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600" },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },

  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  sub: { color: colors.textMuted, textAlign: "center", marginBottom: 16 },

  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  primaryText: { color: "#fff", fontWeight: "700" },

  previewWrap: { flex: 1, backgroundColor: "#000" },
  previewImg: { flex: 1 },
  previewTop: { position: "absolute", top: 55, left: 16 },
  previewBadge: { color: "#fff", backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },

  previewBottom: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 12,
  },
  secondaryBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", padding: 14, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#fff", fontWeight: "700" },
});
