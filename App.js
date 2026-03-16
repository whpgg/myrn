import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [webCanGoBack, setWebCanGoBack] = useState(false);
  const webviewRef = useRef(null);

  const hotSearches = [
    'AI 搜索',
    '今日热点',
    '高途热榜',
    '天气预报',
    '小说影视',
    '本地服务',
  ];

  const quickLinks = ['新闻', '视频', '地图', '贴吧'];
  const explainUrl =
    'https://zhixue.gaotu.cn/explain?token=ZCtSVUVyYlI1dkFBQ3R5YUxrbGJSUVN3WVE5OWVjYnZwM1FkbmdIQU85bE84ZEJuUTNmdzVjSldtb0puKzNubVVTTVJRR1Z4N3E3UmRQaWxTUVpYVGdDUUNacFJnVTZDOXdNOVNaN1A3My9rTi90Vzh2ZzBuMGo3UzNCNGpIRHBqd3BMVjArOFNUOU5GSmR5VGRMU0lITStsOFhybFlKSW42QzAzS1B5MzNUVTFjSzdubXVaL2llQ3g4SlY3K3hwUllYRmQwdU1ZOW1TdHByWGx2bEtYWUhHMzZFWUtHbEpLVFlFc200N2pzTEhZTHNTYmxNQUJ1V1dkekM3TmhNTjUvMUtkQUlYRHA5QUEwVSsxaFNhSENPL1Z4ZzBSbHl1UzBOOHRENzV2aldUV2VOb2pWblprRU9qTE84V0pZayt6U3VublJLZDRyZ2p5Tk1Ob0lFSXlsWm5KSW1BV0JHc0R1NkV5djU2N3BJPS4wMmM3ODRjZjRkZWYyZDVmOTZlNTA0NTM4MjQ5ZDI0OThiODYzNzFkMWY4YWE5ZjY0NmRhMTI1MWEyMjE4NjE5&action=view';

  const handleTakePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('无法拍照', '请先在系统设置中允许相机权限。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setCapturedPhotoUri(result.assets[0].uri);
  }, []);

  const handleOpenExplain = useCallback(() => {
    setShowWebView(true);
  }, []);

  const handleCloseExplain = useCallback(() => {
    setShowWebView(false);
    setWebCanGoBack(false);
  }, []);

  const handleWebBack = useCallback(() => {
    if (webCanGoBack && webviewRef.current) {
      webviewRef.current.injectJavaScript('window.history.back(); true;');
      return true;
    }

    handleCloseExplain();
    return true;
  }, [handleCloseExplain, webCanGoBack]);


  useEffect(() => {
    if (!showWebView) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () =>
      handleWebBack()
    );

    return () => {
      subscription.remove();
    };
  }, [handleWebBack, showWebView]);

  useEffect(() => {
    const setOrientation = async () => {
      try {
        if (showWebView) {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
          return;
        }

        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch (error) {
        // 在不支持锁屏方向的平台（如部分 Web）上忽略异常
      }
    };

    setOrientation();

    return () => {
      if (!showWebView) {
        return;
      }

      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, [showWebView]);

  if (showWebView) {
    return (
      <SafeAreaProvider>
        <View style={styles.webviewFullscreen}>
          <StatusBar hidden style="light" />
          <WebView
            ref={webviewRef}
            source={{ uri: explainUrl }}
            style={styles.webviewFullscreen}
            allowsBackForwardNavigationGestures
            onNavigationStateChange={(navState) => {
              setWebCanGoBack(navState.canGoBack);
            }}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleWebBack}
            style={styles.floatingBackButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.floatingBackText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" translucent={false} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.logoWrapper}>
            <Text style={[styles.logoLetter, styles.blue]}>高</Text>
            <Text style={[styles.logoLetter, styles.red]}>途</Text>
          </View>

          <View style={styles.searchCard}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                placeholder="高途检索"
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cameraButton}
                onPress={handleTakePhoto}
              >
                <Text style={styles.cameraText}>拍照</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.searchButton}
              onPress={handleOpenExplain}
            >
              <Text style={styles.searchButtonText}>高途智学讲解</Text>
            </TouchableOpacity>

            {capturedPhotoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Text style={styles.photoPreviewTitle}>拍照结果</Text>
                <Image source={{ uri: capturedPhotoUri }} style={styles.photoPreviewImage} />
              </View>
            ) : null}
          </View>

          <View style={styles.quickLinks}>
            {quickLinks.map((item) => (
              <TouchableOpacity key={item} activeOpacity={0.8} style={styles.quickLink}>
                <Text style={styles.quickLinkText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>高途热搜</Text>
              <Text style={styles.sectionMore}>换一换</Text>
            </View>

            {hotSearches.map((item, index) => (
              <View key={item} style={styles.hotRow}>
                <View style={styles.hotIndex}>
                  <Text style={styles.hotIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.hotText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>常用入口</Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>登录</Text>
              <Text style={styles.footerLink}>收藏</Text>
              <Text style={styles.footerLink}>设置</Text>
              <Text style={styles.footerLink}>更多</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webviewFullscreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 24,
    left: 16,
    height: 40,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  floatingBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
  },
  logoWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 28,
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
  },
  blue: {
    color: '#2563eb',
  },
  red: {
    color: '#ef4444',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe4f0',
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 8,
    height: 52,
    backgroundColor: '#f8fafc',
  },
  searchIcon: {
    fontSize: 20,
    color: '#9ca3af',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  cameraButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  cameraText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  searchButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  photoPreviewWrap: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  photoPreviewTitle: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 8,
    fontWeight: '600',
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  quickLink: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionMore: {
    fontSize: 13,
    color: '#6b7280',
  },
  hotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  hotIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hotIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  hotText: {
    fontSize: 15,
    color: '#1f2937',
  },
  footerCard: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLink: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '600',
  },
});
