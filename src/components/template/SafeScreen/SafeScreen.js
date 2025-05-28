import { StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SafeScreen({ children }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />
      {children}
    </View>
  );
}

export default SafeScreen;