import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#2563eb',
  secondary: '#64748b',
  danger: '#ef4444',
  success: '#10b981',
  background: '#ffffff',
  surface: '#f5f5f5',
  text: {
    primary: '#1a1a1a',
    secondary: '#4b5563',
    tertiary: '#666666',
  },
  border: '#e5e5e5',
};

export const typography = {
  h1: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const layout = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
});

export const elevation = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
};