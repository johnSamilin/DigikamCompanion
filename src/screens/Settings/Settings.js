import { observer } from 'mobx-react-lite';
import { SafeScreen } from '@/components/template';
import { ScrollView, Text, View } from 'react-native';
import { useStore } from '@/store';
import { Button, FolderPicker, TagTree } from '@/components/molecules';
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

  const updateFrequency = (days) => {
    store.setWallpaperFrequency(days);
  };

  const setWallpaperType = (type) => {
    store.setWallpaperType(type);
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Root Folder</Text>
          <Text style={styles.description}>
            Specify the root folder where photos (and Digikam database) are located
          </Text>
          {store.rootFolder && (
            <Text style={styles.currentPath}>
              Current: {store.normalizedRootPath}
            </Text>
          )}
          <View style={styles.folderPicker}>
            <FolderPicker />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallpaper Update Frequency</Text>
          <View style={styles.buttons}>
            <Button 
              title="1 Day" 
              onPress={() => updateFrequency(1)}
              color={store.wallpaperFrequency === 1 ? '#00ff00' : '#1a1a1a'}
            />
            <Button 
              title="2 Days" 
              onPress={() => updateFrequency(2)}
              color={store.wallpaperFrequency === 2 ? '#00ff00' : '#1a1a1a'}
            />
            <Button 
              title="3 Days" 
              onPress={() => updateFrequency(3)}
              color={store.wallpaperFrequency === 3 ? '#00ff00' : '#1a1a1a'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallpaper Type</Text>
          <View style={styles.buttons}>
            <Button 
              title="Both" 
              onPress={() => setWallpaperType('both')}
              color={store.wallpaperType === 'both' ? '#00ff00' : '#1a1a1a'}
            />
            <Button 
              title="Home" 
              onPress={() => setWallpaperType('home')}
              color={store.wallpaperType === 'home' ? '#00ff00' : '#1a1a1a'}
            />
            <Button 
              title="Lock" 
              onPress={() => setWallpaperType('lock')}
              color={store.wallpaperType === 'lock' ? '#00ff00' : '#1a1a1a'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallpaper Tags</Text>
          <Text style={styles.description}>
            Select tags to use for wallpaper rotation
          </Text>
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
            title="Stop Service" 
            onPress={store.stopWallpaperService}
            color="#ff0000"
          />
        </View>
      </View>
    </SafeScreen>
  );
}

export default observer(Settings);