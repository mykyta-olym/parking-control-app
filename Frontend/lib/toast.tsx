import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Toast, { ToastShowParams } from 'react-native-toast-message';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type ToastType = 'success' | 'error' | 'info' | 'info-with-action';

// Debounce mechanism to prevent freezing when toasts are shown rapidly
let lastToastTime = 0;
const TOAST_DEBOUNCE_MS = 100;
let pendingToast: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const showToastDebounced = (showFn: () => void) => {
  const now = Date.now();
  const timeSinceLastToast = now - lastToastTime;

  if (pendingToast) {
    clearTimeout(debounceTimer!);
  }

  pendingToast = showFn;

  if (timeSinceLastToast < TOAST_DEBOUNCE_MS) {
    debounceTimer = setTimeout(() => {
      if (pendingToast) {
        pendingToast();
        pendingToast = null;
        lastToastTime = Date.now();
      }
    }, TOAST_DEBOUNCE_MS - timeSinceLastToast);
  } else {
    showFn();
    lastToastTime = now;
    pendingToast = null;
  }
};

const baseParams: Partial<ToastShowParams> = {
  position: 'top',
  autoHide: true,
  visibilityTime: 2500,
  topOffset: Platform.OS === 'ios' ? 50 : 40,
};

export function showSuccess(message: string, title?: string) {
  showToastDebounced(() => {
    Toast.show({
      ...baseParams,
      type: 'success',
      text1: title,
      text2: message,
    });
  });
}

export function showError(message: string, title?: string) {
  showToastDebounced(() => {
    Toast.show({
      ...baseParams,
      type: 'error',
      text1: title,
      text2: message,
    });
  });
}

export function showInfo(message: string, title?: string) {
  showToastDebounced(() => {
    Toast.show({
      ...baseParams,
      type: 'info',
      text1: title,
      text2: message,
    });
  });
}

export function showLoading(message: string = 'Načítavam…') {
  showToastDebounced(() => {
    Toast.show({
      position: 'top',
      type: 'info',
      text2: message,
      autoHide: false,
      topOffset: Platform.OS === 'ios' ? 50 : 40,
    });
  });
}

export function hideToast() {
  Toast.hide();
}

export function notifyApiError(err: unknown, fallback: string = 'Nastala chyba. Skúste znova.') {
  const message = err instanceof Error ? err.message : fallback;
  showError(message);
}

export function showInfoWithAction(
  message: string, 
  title?: string, 
  actionLabel: string = 'Otvoriť',
  onAction?: () => void
) {
  showToastDebounced(() => {
    Toast.show({
      ...baseParams,
      type: 'info-with-action',
      text1: title,
      text2: message,
      props: {
        actionLabel,
        onAction,
      },
    });
  });
}

// Optimized toast component with Reanimated
const ToastComponent = React.memo(({ 
  type, 
  text1, 
  text2,
  props,
}: ToastShowParams & { 
  type: ToastType;
  props?: {
    actionLabel?: string;
    onAction?: () => void;
  };
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  React.useEffect(() => {
    // Entry animation - smooth spring on native thread
    // All animations run on UI thread for maximum performance
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    });
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 200,
    });

    // Cleanup function to reset values when component unmounts
    return () => {
      translateY.value = -100;
      opacity.value = 0;
      scale.value = 0.8;
    };
  }, []);

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'info':
        return 'information-circle';
      case 'info-with-action':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return Colors.status.green;
      case 'error':
        return '#ff4d4f';
      case 'info':
        return Colors.gradient.start;
      case 'info-with-action':
        return Colors.gradient.start;
      default:
        return Colors.gradient.start;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return Colors.status.light.green;
      case 'error':
        return '#FFEBEE';
      case 'info':
        return Colors.gradient.light;
      case 'info-with-action':
        return Colors.gradient.light;
      default:
        return Colors.gradient.light;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return Colors.status.green;
      case 'error':
        return '#ff4d4f';
      case 'info':
        return Colors.gradient.start;
      case 'info-with-action':
        return Colors.gradient.start;
      default:
        return Colors.gradient.start;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const handleActionPress = () => {
    if (props?.onAction) {
      props.onAction();
      Toast.hide();
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: getBackgroundColor(), borderLeftColor: getBorderColor() }, animatedStyle]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: Colors.white }]}>
          <Ionicons name={getIconName() as any} size={24} color={getIconColor()} />
        </View>
        <View style={styles.textContainer}>
          {text1 && (
            <Text style={styles.title} numberOfLines={1}>
              {text1}
            </Text>
          )}
          {text2 && (
            <Text style={styles.message} numberOfLines={2}>
              {text2}
            </Text>
          )}
        </View>
        {type === 'info-with-action' && props?.onAction && (
          <Pressable
            onPress={handleActionPress}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.actionButtonText}>
              {props.actionLabel || 'Otvoriť'}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Memoization comparison
  return (
    prevProps.type === nextProps.type &&
    prevProps.text1 === nextProps.text1 &&
    prevProps.text2 === nextProps.text2 &&
    prevProps.props?.actionLabel === nextProps.props?.actionLabel
  );
});

ToastComponent.displayName = 'ToastComponent';

export const toastConfig = {
  success: (props: ToastShowParams) => <ToastComponent {...props} type="success" />,
  error: (props: ToastShowParams) => <ToastComponent {...props} type="error" />,
  info: (props: ToastShowParams) => <ToastComponent {...props} type="info" />,
  'info-with-action': (props: ToastShowParams & { props?: { actionLabel?: string; onAction?: () => void } }) => (
    <ToastComponent {...props} type="info-with-action" />
  ),
};

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    shadowColor: Colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
    lineHeight: 22,
  },
  message: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gradient.start,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gradient.start,
  },
});


