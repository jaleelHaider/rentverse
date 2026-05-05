import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = 'Loading...', fullScreen = false }: LoadingProps) {
  return (
    <View style={[styles.loadingContainer, fullScreen ? styles.fullScreen : styles.inlineLoading]}>
      <ActivityIndicator size="large" color="#4f46e5" />
      {message && (
        <Text style={styles.loadingMessage}>{message}</Text>
      )}
    </View>
  );
}

interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorProps) {
  return (
    <View style={styles.screenCenter}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>
          Error
        </Text>
        <Text style={styles.errorMessage}>
          {message}
        </Text>
        {onRetry && (
          <Text
            onPress={onRetry}
            style={styles.retryAction}
          >
            Try Again
          </Text>
        )}
      </View>
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.screenCenter}>
      <Text style={styles.emptyTitle}>
        {title}
      </Text>
      {description && (
        <Text style={styles.emptyDescription}>
          {description}
        </Text>
      )}
      {action && (
        <Text
          onPress={action.onPress}
          style={styles.emptyAction}
        >
          {action.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  inlineLoading: {
    paddingVertical: 32,
  },
  loadingMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
  },
  screenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    color: '#7f1d1d',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 16,
  },
  retryAction: {
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#4b5563',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAction: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
});
