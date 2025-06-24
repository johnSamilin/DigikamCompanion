import { observer } from 'mobx-react-lite';
import { SafeScreen } from '@/components/template';
import { ScrollView, Text, View } from 'react-native';
import { useStore } from '@/store';
import { Button, FolderPicker, TagTree } from '@/components/molecules';
import { styles } from './styles';
import { useEffect } from 'react';

function Settings() {
  const store = useStore();

  useEffect(() => {
    // Analyze photo sorting when component mounts and root folder is available
    if (store.normalizedRootPath && !store.photoSortStats) {
      store.analyzePhotoSorting();
    }
  }, [store.normalizedRootPath]);

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

  const formatLastUpdate = () => {
    if (!store.lastWallpaperUpdate) return 'Never';
    const date = new Date(store.lastWallpaperUpdate);
    return date.toLocaleString();
  };

  const handleAnalyzePhotos = () => {
    store.analyzePhotoSorting();
  };

  const handleSortPhotos = () => {
    store.sortPhotos();
  };

  const renderPhotoSortStats = () => {
    if (!store.photoSortStats) return null;

    if (store.photoSortStats.error) {
      return (
        <Text style={styles.errorText}>
          Error: {store.photoSortStats.error}
        </Text>
      );
    }

    if (store.photoSortStats.totalPhotos === 0) {
      return (
        <Text style={styles.infoText}>
          No photos found in DCIM folder
        </Text>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          📸 {store.photoSortStats.totalPhotos} photos will be moved and added to database
        </Text>
        <Text style={styles.statsText}>
          📁 {store.photoSortStats.foldersToCreate.length} albums will be created:
        </Text>
        <View style={styles.foldersList}>
          {store.photoSortStats.foldersToCreate.slice(0, 10).map(folder => (
            <Text key={folder} style={styles.folderText}>
              • {folder}
            </Text>
          ))}
          {store.photoSortStats.foldersToCreate.length > 10 && (
            <Text style={styles.folderText}>
              ... and {store.photoSortStats.foldersToCreate.length - 10} more
            </Text>
          )}
        </View>
        <Text style={styles.infoText}>
          Photos will be organized by date and automatically indexed in Digikam database
        </Text>
      </View>
    );
  };

  return (
    <SafeScreen>
      <ScrollView style={styles.container}>
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
          <Text style={styles.sectionTitle}>Database</Text>
          <Text style={styles.description}>
            Manage database synchronization with Digikam
          </Text>
          <View style={styles.buttons}>
            <Button 
              title="Sync Database" 
              onPress={store.forceSyncDatabase}
              color={store.hasUnsavedChanges ? '#ff0000' : '#1a1a1a'}
              textColor="#ffffff"
            />
          </View>
          {store.hasUnsavedChanges && (
            <Text style={styles.warningText}>
              You have unsaved changes that will be synced back to Digikam database
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sort Photos</Text>
          <Text style={styles.description}>
            Move photos from DCIM to organized year/month structure and add them to Digikam database
          </Text>
          
          {renderPhotoSortStats()}
          
          <View style={styles.buttons}>
            <Button 
              title="Analyze" 
              onPress={handleAnalyzePhotos}
              color="#1a1a1a"
              disabled={!store.normalizedRootPath}
            />
            {store.photoSortStats && store.photoSortStats.totalPhotos > 0 && (
              <Button 
                title={store.isSortingPhotos ? "Sorting..." : "Sort Photos"}
                onPress={handleSortPhotos}
                color="#00ff00"
                textColor="#000000"
                disabled={store.isSortingPhotos}
              />
            )}
          </View>
          
          {!store.normalizedRootPath && (
            <Text style={styles.warningText}>
              Please select a root folder first
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallpaper Update Frequency</Text>
          <Text style={styles.description}>
            Last update: {formatLastUpdate()}
          </Text>
          <View style={styles.buttons}>
            <Button 
              title="1 Day" 
              onPress={() => updateFrequency(1)}
              color={store.wallpaperFrequency === 1 ? '#00ff00' : '#1a1a1a'}
              textColor={store.wallpaperFrequency === 1 ? '#000000' : '#ffffff'}
            />
            <Button 
              title="2 Days" 
              onPress={() => updateFrequency(2)}
              color={store.wallpaperFrequency === 2 ? '#00ff00' : '#1a1a1a'}
              textColor={store.wallpaperFrequency === 2 ? '#000000' : '#ffffff'}
            />
            <Button 
              title="3 Days" 
              onPress={() => updateFrequency(3)}
              color={store.wallpaperFrequency === 3 ? '#00ff00' : '#1a1a1a'}
              textColor={store.wallpaperFrequency === 3 ? '#000000' : '#ffffff'}
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
              textColor={store.wallpaperType === 'both' ? '#000000' : '#ffffff'}
            />
            <Button 
              title="Home" 
              onPress={() => setWallpaperType('home')}
              color={store.wallpaperType === 'home' ? '#00ff00' : '#1a1a1a'}
              textColor={store.wallpaperType === 'home' ? '#000000' : '#ffffff'}
            />
            <Button 
              title="Lock" 
              onPress={() => setWallpaperType('lock')}
              color={store.wallpaperType === 'lock' ? '#00ff00' : '#1a1a1a'}
              textColor={store.wallpaperType === 'lock' ? '#000000' : '#ffffff'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallpaper Tags</Text>
          <Text style={styles.description}>
            Select tags to use for wallpaper rotation ({store.wallpaperTags.size} selected)
          </Text>
          <ScrollView style={styles.tagList} nestedScrollEnabled>
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

        <View style={styles.buttonsWrapper}>
          <Button 
            title="Update Now" 
            onPress={store.updateWallpaper}
            color="#00ff00"
            textColor="#000000"
          />
          {store.wallpaperTimer && (
            <Button 
              title="Stop Service" 
              onPress={store.stopWallpaperService}
              color="#ff0000"
            />
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

export default observer(Settings);