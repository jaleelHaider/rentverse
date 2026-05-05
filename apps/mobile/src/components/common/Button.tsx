import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
}: ButtonProps) => {
const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = { ...styles.base as ViewStyle };

    // Size styles
    switch (size) {
      case 'sm':
        return { ...baseStyle, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...styles.sm };
      case 'lg':
        return { ...baseStyle, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, ...styles.lg };
      case 'md':
      default:
        return { ...baseStyle, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...styles.md };
    }
  };

const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.neutral.mediumGray : colors.primary.darkBlue,
          borderColor: disabled ? colors.neutral.mediumGray : colors.primary.darkBlue,
        };
      case 'secondary':
        return {
          backgroundColor: colors.neutral.veryLightGray,
          borderColor: colors.neutral.lightBorder,
        };
      case 'outline':
        return {
          backgroundColor: colors.neutral.white,
          borderColor: colors.primary.darkBlue,
          borderWidth: 2,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: disabled ? colors.neutral.mediumGray : colors.status.error,
          borderColor: disabled ? colors.neutral.mediumGray : colors.status.error,
        };
      default:
        return {};
    }
  };

const getTextStyle = () => {
    const baseTextStyle: any = { ...styles.text };

    switch (variant) {
      case 'primary':
      case 'danger':
        baseTextStyle.color = disabled ? colors.neutral.white : colors.neutral.white;
        break;
      case 'secondary':
        baseTextStyle.color = disabled ? colors.neutral.mediumGray : colors.text.primary;
        break;
      case 'outline':
        baseTextStyle.color = disabled ? colors.neutral.mediumGray : colors.primary.darkBlue;
        break;
      case 'ghost':
        baseTextStyle.color = disabled ? colors.neutral.mediumGray : colors.primary.darkBlue;
        break;
      default:
        baseTextStyle.color = colors.text.primary;
    }

return baseTextStyle;
  };

  const buttonStyle = getButtonStyle();
  const variantStyle = getVariantStyle();
  const textStyle = getTextStyle();

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        variantStyle,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.content}>
        {loading ? (
          <Text style={[textStyle, { marginRight: spacing.sm }]}>⟳</Text>
        ) : icon && iconPosition === 'left' ? (
          <MaterialIcons name={icon as any} size={20} color={textStyle.color as any} style={styles.iconLeft} />
        ) : null}

        <Text style={[textStyle, styles.label]}>{label}</Text>

        {icon && iconPosition === 'right' ? (
          <MaterialIcons name={icon as any} size={20} color={textStyle.color} style={styles.iconRight} />
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sm: {
    borderRadius: borderRadius.sm,
  },
  md: {},
  lg: {
    borderRadius: borderRadius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    marginHorizontal: spacing.sm,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
