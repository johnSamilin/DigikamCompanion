import { Pressable, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
});

export function Tag({ onClick, name }) {
  return (
    <Pressable style={styles.wrapper} onPress={onClick}>
      <Text style={styles.name}>{name}</Text>
    </Pressable>
  );
}