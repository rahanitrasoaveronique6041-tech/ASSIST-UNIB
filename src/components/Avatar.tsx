import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface AvatarProps {
  size?: number;
}

export function Avatar({ size = 32 }: AvatarProps) {
  return (
    <View
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <MaterialCommunityIcons
        name="robot-happy-outline"
        size={size * 0.6}
        color={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
