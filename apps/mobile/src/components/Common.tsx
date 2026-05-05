import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: any;
  scrollable?: boolean;
  centerContent?: boolean;
  backgroundColor?: string;
  paddingHorizontal?: boolean;
}

export function ScreenContainer({
  children,
  scrollable = false,
  centerContent = false,
  backgroundColor = '#ffffff',
  paddingHorizontal = true,
}: ScreenContainerProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            paddingHorizontal ? styles.paddingHorizontal : null,
            centerContent ? styles.centerContent : null,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View
        style={[
          styles.flex,
          paddingHorizontal ? styles.paddingHorizontal : null,
          centerContent ? styles.centerContent : null,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
}: ButtonProps) {
  return (
    <Pressable
      onPress={!disabled && !loading ? onPress : undefined}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        fullWidth ? styles.fullWidth : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary' ? styles.buttonTextSecondary : styles.buttonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  paddingHorizontal: {
    paddingHorizontal: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  buttonDanger: {
    backgroundColor: '#dc2626',
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
  buttonTextSecondary: {
    color: '#111827',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
