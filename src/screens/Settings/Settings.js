import { observer } from 'mobx-react-lite';
import { SafeScreen } from '@/components/template';
import { ScrollView, Text, View } from 'react-native';
import { useStore } from '@/store';
import { Button, TagTree } from '@/components/molecules';
import { styles } from './styles';

function Settings() {
  const store = useStore();

  const toggleTag = (newState, id) => {
    if (newState) {
      store.addWallpaperTag(id);
    } else {
      store.removeWallpaperTag(id);
    }
  };

  const updateFrequency = (minutes) => {
    store.setWallpaperFrequency(minutes);
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Wallpaper Settings</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Frequency</Text>
          <View style={styles.buttons}>
            <Button 
              title="15 min" 
              onPress={() => updateFrequency(15)}
              color={store.wallpaperFrequency === 15 ? '#00ff00' : '#1a1a1a'}
            />
            <Button 
              title="30 min" 
              onPress={() => updateFrequency(30)}
              color={store.wallpaperFrequency === 30 ? '#00ff00' : '#1a1a1a'}
            />
            <Button 
              title="1 hour" 
              onPress={() => updateFrequency(60)}
              color={store.wallpaperFrequency === 60 ? '#00ff00' : '#1a1a1a'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Tags</Text>
          <ScrollView style={styles.tagList}>
            {Array.from(store.tagTree.values()).map(tag => (
              <TagTree
                key={tag.id}
                tag={tag}
                isSelected={store.wallpaperTags.has(tag.id)}
                onChangeState={toggleTag}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.buttons}>
          <Button 
            title="Update Now" 
            onPress={store.updateWallpaper}
            color="#00ff00"
            textColor="#000000"
          />
          <Button 
            title="Stop" 
            onPress={store.stopWallpaperService}
            color="#ff0000"
          />
        </View>
      </View>
    </SafeScreen>
  );
}

export default observer(Settings);