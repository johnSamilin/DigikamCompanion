import { makeAutoObservable, runInAction } from 'mobx';
import { Dimensions, NativeModules, ToastAndroid, AppState } from 'react-native';
import {
  copyFile,
  DocumentDirectoryPath,
  readDir,
  stat,
  moveFile,
  mkdir,
  exists,
} from 'react-native-fs';
import { MMKV } from 'react-native-mmkv';
import SQLite from 'react-native-sqlite-storage';

const mmkv = new MMKV();
const dbName = 'digikam4';
const originalDbName = 'digikam4-original.db';
const localDbPath = `${DocumentDirectoryPath}/${originalDbName}`;
const BATCH_SIZE = 50;

export class RootStore {
  rootFolder = null;
  isReady = false;
  db = null;
  albums = new Map();
  tags = new Map();
  tagTree = new Map();
  imagetags = new Map();
  images = [];
  userSelectedImages = new Set();
  isPermissionDenied = true;
  log = [];
  activeFilters = {
    albumIds: new Set(),
    tagIds: new Set(),
  };
  orientaion = 'P';
  fileUriPrefix = `file://`;
  wallpaperTags = new Set();
  wallpaperFrequency = 1;
  wallpaperTimer = null;
  wallpaperType = 'both'; // 'home', 'lock', or 'both'
  lastWallpaperUpdate = null;
  hasUnsavedChanges = false;
  photoSortStats = null;
  isSortingPhotos = false;

  get isFilterApplied() {
    return (
      this.activeFilters.albumIds.size > 0 || this.activeFilters.tagIds.size > 0
    );
  }

  get normalizedRootPath() {
    if (!this.rootFolder) return null;

    let path = decodeURIComponent(this.rootFolder);
    path = path.replace(/^(content|file):\/\//, '');
    path = path.replace(/^\/+/, '');
    
    if (path.includes(':')) {
      path = path.substring(path.indexOf(':') + 1);
    }
    
    return path.replace(/\/+$/, '');
  }

  get isDatabaseReady() {
    return this.db !== null && this.isReady;
  }

  constructor() {
    makeAutoObservable(this);
    this.rootFolder = mmkv.getString('rootfolder');
    this.wallpaperTags = new Set(JSON.parse(mmkv.getString('wallpaperTags') || '[]'));
    this.wallpaperFrequency = parseInt(mmkv.getString('wallpaperFrequency') || '1', 10);
    this.wallpaperType = mmkv.getString('wallpaperType') || 'both';
    this.lastWallpaperUpdate = mmkv.getString('lastWallpaperUpdate');
    
    if (this.rootFolder) {
      this.getDBConnection().then(() => {
        // Only start wallpaper service after database is ready
        if (this.wallpaperTags.size > 0) {
          this.checkAndStartWallpaperService();
        }
      }).catch(error => {
        this.addLog(`Failed to initialize database: ${error.message}`);
      });
    }
    
    Dimensions.addEventListener('change', ({ window: { width, height } }) => {
      runInAction(() => {
        this.orientaion = width < height ? 'P' : 'L';
      });
    });

    // Listen for app state changes to sync database when app goes to background
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.syncDatabaseToOriginal();
    }
  };

  getDBConnection = async () => {
    try {
      await this.copyDBToCache();
      runInAction(() => {
        this.isPermissionDenied = false;
      });

      return new Promise((resolve, reject) => {
        SQLite.openDatabase(
          {
            name: dbName,
            createFromLocation: originalDbName,
          },
          database => {
            runInAction(() => {
              this.db = database;
              this.isReady = true;
            });
            Promise.all([
              this.readAlbums(),
              this.readTags(),
              this.readTagsTree(),
              this.readImageTags(),
            ]).then(() => {
              this.addLog('Database initialized successfully');
              resolve();
            }).catch(reject);
          },
          error => {
            this.addLog(`Database connection failed: ${error.message}`);
            reject(error);
          },
        );
      });
    } catch (er) {
      this.addLog(`Database setup error: ${er.message}`);
      throw er;
    }
  };

  copyDBToCache = () => {
    const originalDbPath = `/storage/emulated/0/${this.normalizedRootPath}/${dbName}.db`;
    return copyFile(originalDbPath, localDbPath).then(() => {
      this.addLog(`DB File copied to ${localDbPath}`);
    });
  };

  syncDatabaseToOriginal = async () => {
    if (!this.hasUnsavedChanges || !this.isDatabaseReady || !this.normalizedRootPath) {
      return;
    }

    try {
      const originalDbPath = `/storage/emulated/0/${this.normalizedRootPath}/${dbName}.db`;
      
      // Close the database connection temporarily
      if (this.db) {
        await new Promise((resolve, reject) => {
          this.db.close(resolve, reject);
        });
      }

      // Copy the modified database back to the original location
      await copyFile(localDbPath, originalDbPath);
      
      // Reopen the database
      await new Promise((resolve, reject) => {
        SQLite.openDatabase(
          {
            name: dbName,
            createFromLocation: originalDbName,
          },
          database => {
            runInAction(() => {
              this.db = database;
              this.hasUnsavedChanges = false;
            });
            this.addLog('Database synced back to original location');
            resolve();
          },
          reject,
        );
      });

    } catch (error) {
      this.addLog(`Failed to sync database: ${error.message}`);
      ToastAndroid.show('Failed to save changes to database', ToastAndroid.LONG);
    }
  };

  markDatabaseChanged = () => {
    runInAction(() => {
      this.hasUnsavedChanges = true;
    });
  };

  setRootFolder = value => {
    this.rootFolder = value;
    mmkv.set('rootfolder', value);
    this.getDBConnection().then(() => {
      // Start wallpaper service after database is ready
      if (this.wallpaperTags.size > 0) {
        this.checkAndStartWallpaperService();
      }
    }).catch(error => {
      this.addLog(`Failed to initialize database after folder selection: ${error.message}`);
    });
  };

  readAlbums = () => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT id, albumRoot, relativePath from Albums order by relativePath DESC',
          [],
          (t, res) => {
            const fldrs = new Map();
            for (let index = 0; index < res.rows.length; index++) {
              const folder = res.rows.item(index);
              fldrs.set(folder.id, folder);
            }
            this.addLog('READ ALBUMS');
            runInAction(() => {
              this.albums = fldrs;
            });
            resolve();
          },
          (_, er) => {
            this.addLog(`SELECT ALBUMS ERR: ${er.message}`);
            reject(er);
          },
        );
      });
    });
  };

  readTags = () => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT id, name from Tags where id > 25',
          [],
          (t, res) => {
            const tags = new Map();
            for (let index = 0; index < res.rows.length; index++) {
              const tag = res.rows.item(index);
              tags.set(tag.id, { ...tag, children: [] });
            }
            this.addLog('READ TAGS');
            runInAction(() => {
              this.tags = tags;
            });
            resolve();
          },
          (_, er) => {
            this.addLog(`SELECT TAGS ERR: ${er.message}`);
            reject(er);
          },
        );
      });
    });
  };

  readTagsTree = () => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT id, pid from TagsTree',
          [],
          (t, res) => {
            const tree = new Map();
            const processedTags = new Set();

            // First pass: Build parent-child relationships
            for (let index = 0; index < res.rows.length; index++) {
              const { id, pid } = res.rows.item(index);
              if (this.tags.has(id)) {
                if (pid > 0 && this.tags.has(pid)) {
                  const parent = this.tags.get(pid);
                  const child = this.tags.get(id);
                  parent.children.push(child);
                  processedTags.add(id);
                }
              }
            }

            // Second pass: Add remaining tags to root level
            this.tags.forEach((tag, id) => {
              if (!processedTags.has(id)) {
                tree.set(id, tag);
              }
            });

            this.addLog('READ TAGS TREE');
            runInAction(() => {
              this.tagTree = tree;
            });
            resolve();
          },
          (_, er) => {
            this.addLog(`SELECT TAGS TREE ERR: ${er.message}`);
            reject(er);
          },
        );
      });
    });
  };

  readImageTags = () => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT imageid, tagid from ImageTags',
          [],
          (t, res) => {
            const imagetags = new Map();
            for (let index = 0; index < res.rows.length; index++) {
              const { imageid, tagid } = res.rows.item(index);
              const tags = imagetags.get(imageid) || [];
              const tag = this.tags.get(tagid);
              if (tag) {
                tags.push({ tagid, tagname: tag.name });
              }
              imagetags.set(imageid, tags);
            }
            this.addLog('READ IMAGE TAGS');
            runInAction(() => {
              this.imagetags = imagetags;
            });
            resolve();
          },
          (_, er) => {
            this.addLog(`SELECT Image TAGS ERR: ${er.message}`);
            reject(er);
          },
        );
      });
    });
  };

  selectPhotos = async (activeFilters = { albumIds: [], tagIds: [] }) => {
    if (!this.isDatabaseReady) {
      this.addLog('Cannot select photos: Database not ready');
      return Promise.reject(new Error('Database not ready'));
    }

    this.dropUserSelection();
    const constraints = ['album is not null'];

    if (activeFilters.albumIds.length) {
      constraints.push(`album in (${activeFilters.albumIds.join(', ')})`);
    }
    if (activeFilters.tagIds.length) {
      constraints.push(
        `id in (select imageid from ImageTags where tagid in (${activeFilters.tagIds.join(
          ', ',
        )}))`,
      );
    }

    const sql = `select id, album, name from Images where ${
      constraints.length > 0 ? constraints.join(' and ') : '1'
    } order by name desc`;
    this.addLog(sql);

    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          sql,
          [],
          (t, res) => {
            const images = [];
            try {
              for (let index = 0; index < res.rows.length; index += BATCH_SIZE) {
                const batch = [];
                for (
                  let j = index;
                  j < Math.min(index + BATCH_SIZE, res.rows.length);
                  j++
                ) {
                  const image = res.rows.item(j);
                  const album = this.albums.get(image.album);
                  if (album) {
                    image.uri = `${this.fileUriPrefix}/storage/emulated/0/${this.normalizedRootPath}${album.relativePath}/${image.name}`;
                    batch.push(image);
                  }
                }
                images.push(...batch);
              }
            } catch (er) {
              this.addLog(`Error when constructing image paths: ${er.message}`);
            }
            this.addLog(`${images.length} IMAGES`);
            runInAction(() => {
              this.images = images;
            });
            resolve();
          },
          (_, er) => {
            this.addLog(`SELECT IMAGES ERR: ${er.message}`);
            reject(er);
            ToastAndroid.show(
              'Problem getting data. Check system messages',
              ToastAndroid.LONG,
            );
          },
        );
      });
    });
  };

  addLog(text) {
    const d = new Date();
    const timestamp = `${d.getFullYear()}.${d.getMonth()}.${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    runInAction(() => {
      this.log.push(`${timestamp} - ${text}`);
      if (this.log.length > 1000) {
        this.log = this.log.slice(-1000);
      }
    });
  }

  addAlbumToFilters = id => {
    runInAction(() => {
      this.activeFilters.albumIds.add(id);
      // Add all child albums
      this.albums.forEach(album => {
        if (album.relativePath.startsWith(this.albums.get(id).relativePath + '/')) {
          this.activeFilters.albumIds.add(album.id);
        }
      });
    });
  };

  removeAlbumFromFilters = id => {
    runInAction(() => {
      this.activeFilters.albumIds.delete(id);
      // Remove all child albums
      this.albums.forEach(album => {
        if (album.relativePath.startsWith(this.albums.get(id).relativePath + '/')) {
          this.activeFilters.albumIds.delete(album.id);
        }
      });
    });
  };

  addTagToFilters = id => {
    runInAction(() => {
      this.activeFilters.tagIds.add(id);
      // Add all child tags recursively
      const addChildTags = (tag) => {
        if (tag.children) {
          tag.children.forEach(child => {
            this.activeFilters.tagIds.add(child.id);
            addChildTags(child);
          });
        }
      };
      const tag = this.tags.get(id);
      if (tag) {
        addChildTags(tag);
      }
    });
  };

  removeTagFromFilters = id => {
    runInAction(() => {
      this.activeFilters.tagIds.delete(id);
      // Remove all child tags recursively
      const removeChildTags = (tag) => {
        if (tag.children) {
          tag.children.forEach(child => {
            this.activeFilters.tagIds.delete(child.id);
            removeChildTags(child);
          });
        }
      };
      const tag = this.tags.get(id);
      if (tag) {
        removeChildTags(tag);
      }
    });
  };

  resetFilters = () => {
    runInAction(() => {
      this.activeFilters.albumIds.clear();
      this.activeFilters.tagIds.clear();
    });
  };

  // Database helper methods for photo sorting
  findOrCreateAlbum = (relativePath) => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.addLog(`Finding or creating album: ${relativePath}`);

      // First check if album already exists
      const existingAlbum = Array.from(this.albums.values()).find(
        album => album.relativePath === relativePath
      );

      if (existingAlbum) {
        this.addLog(`Album already exists: ${relativePath} (ID: ${existingAlbum.id})`);
        resolve(existingAlbum.id);
        return;
      }

      // Create new album with timeout protection
      const timeoutId = setTimeout(() => {
        reject(new Error(`Album creation timeout for ${relativePath}`));
      }, 10000); // 10 second timeout

      this.db.transaction(tx => {
        // Get the next available album ID
        tx.executeSql(
          'SELECT MAX(id) as maxId FROM Albums',
          [],
          (_, res) => {
            try {
              const nextId = (res.rows.item(0).maxId || 0) + 1;
              this.addLog(`Creating album with ID ${nextId}: ${relativePath}`);
              
              // Insert the new album (albumRoot is typically 1 for main collection)
              tx.executeSql(
                'INSERT INTO Albums (id, albumRoot, relativePath) VALUES (?, ?, ?)',
                [nextId, 1, relativePath],
                (_, albumRes) => {
                  clearTimeout(timeoutId);
                  // Update local state
                  const newAlbum = { id: nextId, albumRoot: 1, relativePath };
                  runInAction(() => {
                    this.albums.set(nextId, newAlbum);
                  });
                  
                  this.markDatabaseChanged();
                  this.addLog(`Successfully created album: ${relativePath} (ID: ${nextId})`);
                  resolve(nextId);
                },
                (_, er) => {
                  clearTimeout(timeoutId);
                  this.addLog(`CREATE ALBUM ERR: ${er.message}`);
                  reject(er);
                }
              );
            } catch (error) {
              clearTimeout(timeoutId);
              this.addLog(`Error in album creation: ${error.message}`);
              reject(error);
            }
          },
          (_, er) => {
            clearTimeout(timeoutId);
            this.addLog(`GET MAX ALBUM ID ERR: ${er.message}`);
            reject(er);
          }
        );
      }, (error) => {
        clearTimeout(timeoutId);
        this.addLog(`Album creation transaction failed: ${error.message}`);
        reject(error);
      });
    });
  };

  addImageToDatabase = (fileName, albumId, fileStats) => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.addLog(`Adding image to database: ${fileName} (album: ${albumId})`);

      // Add timeout protection
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image database insertion timeout for ${fileName}`));
      }, 5000); // 5 second timeout

      this.db.transaction(tx => {
        // Get the next available image ID
        tx.executeSql(
          'SELECT MAX(id) as maxId FROM Images',
          [],
          (_, res) => {
            try {
              const nextId = (res.rows.item(0).maxId || 0) + 1;
              
              // Prepare image metadata
              const modificationDate = new Date(fileStats.mtime);
              
              this.addLog(`Creating image record with ID ${nextId}: ${fileName}`);
              
              // Insert the new image
              tx.executeSql(
                `INSERT INTO Images (
                  id, name, album, modificationDate, fileSize, uniqueHash
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  nextId,
                  fileName,
                  albumId,
                  modificationDate.toISOString(),
                  fileStats.size,
                  `${fileName}_${Date.now()}` // Simple unique hash
                ],
                (_, imageRes) => {
                  clearTimeout(timeoutId);
                  this.addLog(`Successfully added image to database: ${fileName} (ID: ${nextId})`);
                  resolve(nextId);
                },
                (_, er) => {
                  clearTimeout(timeoutId);
                  this.addLog(`ADD IMAGE ERR: ${er.message}`);
                  reject(er);
                }
              );
            } catch (error) {
              clearTimeout(timeoutId);
              this.addLog(`Error in image database insertion: ${error.message}`);
              reject(error);
            }
          },
          (_, er) => {
            clearTimeout(timeoutId);
            this.addLog(`GET MAX IMAGE ID ERR: ${er.message}`);
            reject(er);
          }
        );
      }, (error) => {
        clearTimeout(timeoutId);
        this.addLog(`Image database transaction failed: ${error.message}`);
        reject(error);
      });
    });
  };

  // Photo sorting methods
  analyzePhotoSorting = async () => {
    if (!this.normalizedRootPath) {
      this.addLog('Cannot analyze photo sorting: No root folder selected');
      return;
    }

    try {
      this.addLog('Analyzing DCIM folder for photo sorting...');
      
      const dcimPath = '/storage/emulated/0/DCIM';
      const rootPath = `/storage/emulated/0/${this.normalizedRootPath}`;
      
      // Check if DCIM exists
      const dcimExists = await exists(dcimPath);
      if (!dcimExists) {
        runInAction(() => {
          this.photoSortStats = {
            totalPhotos: 0,
            foldersToCreate: [],
            error: 'DCIM folder not found'
          };
        });
        return;
      }

      const photoExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.raw', '.dng'];
      const photosToMove = [];
      const foldersToCreate = new Set();

      // Recursively scan DCIM folder
      const scanFolder = async (folderPath) => {
        try {
          const items = await readDir(folderPath);
          
          for (const item of items) {
            if (item.isDirectory()) {
              await scanFolder(item.path);
            } else if (item.isFile()) {
              const extension = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
              if (photoExtensions.includes(extension)) {
                try {
                  const fileStats = await stat(item.path);
                  const modDate = new Date(fileStats.mtime);
                  const year = modDate.getFullYear();
                  const month = String(modDate.getMonth() + 1).padStart(2, '0');
                  
                  const targetFolder = `${year}/${month}`;
                  const targetPath = `${rootPath}/${targetFolder}`;
                  
                  photosToMove.push({
                    sourcePath: item.path,
                    targetPath: `${targetPath}/${item.name}`,
                    targetFolder,
                    fileName: item.name,
                    modDate: modDate.toISOString(),
                    fileStats,
                  });
                  
                  foldersToCreate.add(targetFolder);
                } catch (statError) {
                  this.addLog(`Failed to get stats for ${item.path}: ${statError.message}`);
                }
              }
            }
          }
        } catch (error) {
          this.addLog(`Failed to scan folder ${folderPath}: ${error.message}`);
        }
      };

      await scanFolder(dcimPath);

      runInAction(() => {
        this.photoSortStats = {
          totalPhotos: photosToMove.length,
          foldersToCreate: Array.from(foldersToCreate).sort(),
          photosToMove,
          error: null
        };
      });

      this.addLog(`Photo sorting analysis complete: ${photosToMove.length} photos found, ${foldersToCreate.size} folders to create`);

    } catch (error) {
      this.addLog(`Photo sorting analysis failed: ${error.message}`);
      runInAction(() => {
        this.photoSortStats = {
          totalPhotos: 0,
          foldersToCreate: [],
          error: error.message
        };
      });
    }
  };

  sortPhotos = async () => {
    if (!this.photoSortStats || this.photoSortStats.totalPhotos === 0) {
      ToastAndroid.show('No photos to sort. Run analysis first.', ToastAndroid.LONG);
      return;
    }

    if (this.isSortingPhotos) {
      ToastAndroid.show('Photo sorting already in progress', ToastAndroid.SHORT);
      return;
    }

    runInAction(() => {
      this.isSortingPhotos = true;
    });

    try {
      this.addLog('Starting photo sorting process...');
      const rootPath = `/storage/emulated/0/${this.normalizedRootPath}`;
      
      // Step 1: Create all necessary folders first
      this.addLog('Step 1: Creating folder structure...');
      for (const folder of this.photoSortStats.foldersToCreate) {
        const folderPath = `${rootPath}/${folder}`;
        try {
          const folderExists = await exists(folderPath);
          if (!folderExists) {
            await mkdir(folderPath, { NSURLIsExcludedFromBackupKey: false });
            this.addLog(`Created folder: ${folder}`);
          } else {
            this.addLog(`Folder already exists: ${folder}`);
          }
        } catch (error) {
          this.addLog(`Failed to create folder ${folder}: ${error.message}`);
          throw error; // Stop if we can't create folders
        }
      }

      // Step 2: Create albums in database for each folder
      this.addLog('Step 2: Creating database albums...');
      const albumMap = new Map();
      for (const folder of this.photoSortStats.foldersToCreate) {
        try {
          this.addLog(`Creating album for folder: ${folder}`);
          const albumId = await this.findOrCreateAlbum(`/${folder}`);
          albumMap.set(folder, albumId);
          this.addLog(`Album ready: ${folder} (ID: ${albumId})`);
        } catch (error) {
          this.addLog(`Failed to create album for ${folder}: ${error.message}`);
          // Continue with other albums even if one fails
        }
      }

      // Step 3: Move photos in smaller batches and add to database
      this.addLog('Step 3: Moving photos and updating database...');
      let movedCount = 0;
      let errorCount = 0;
      let addedToDbCount = 0;
      const batchSize = 5; // Reduced batch size for better progress tracking
      
      for (let i = 0; i < this.photoSortStats.photosToMove.length; i += batchSize) {
        const batch = this.photoSortStats.photosToMove.slice(i, i + batchSize);
        this.addLog(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(this.photoSortStats.photosToMove.length/batchSize)}`);
        
        for (const photo of batch) {
          try {
            this.addLog(`Processing photo: ${photo.fileName}`);
            
            // Check if target file already exists
            const targetExists = await exists(photo.targetPath);
            if (targetExists) {
              // Generate unique filename
              const extension = photo.fileName.substring(photo.fileName.lastIndexOf('.'));
              const baseName = photo.fileName.substring(0, photo.fileName.lastIndexOf('.'));
              let counter = 1;
              let newTargetPath = photo.targetPath;
              let newFileName = photo.fileName;
              
              while (await exists(newTargetPath)) {
                newFileName = `${baseName}_${counter}${extension}`;
                newTargetPath = `${photo.targetPath.substring(0, photo.targetPath.lastIndexOf('/'))}/${newFileName}`;
                counter++;
              }
              
              photo.targetPath = newTargetPath;
              photo.fileName = newFileName;
              this.addLog(`Renamed to avoid conflict: ${newFileName}`);
            }
            
            // Move the file
            this.addLog(`Moving file: ${photo.sourcePath} -> ${photo.targetPath}`);
            await moveFile(photo.sourcePath, photo.targetPath);
            movedCount++;
            this.addLog(`Successfully moved: ${photo.fileName} -> ${photo.targetFolder}`);
            
            // Add to database
            const albumId = albumMap.get(photo.targetFolder);
            if (albumId && this.isDatabaseReady) {
              try {
                this.addLog(`Adding to database: ${photo.fileName}`);
                // Get updated file stats after move
                const newFileStats = await stat(photo.targetPath);
                await this.addImageToDatabase(photo.fileName, albumId, newFileStats);
                addedToDbCount++;
                this.addLog(`Successfully added to database: ${photo.fileName}`);
              } catch (dbError) {
                this.addLog(`Failed to add ${photo.fileName} to database: ${dbError.message}`);
                // Continue even if database addition fails
              }
            } else {
              this.addLog(`Skipping database addition for ${photo.fileName}: albumId=${albumId}, dbReady=${this.isDatabaseReady}`);
            }
            
          } catch (error) {
            errorCount++;
            this.addLog(`Failed to process ${photo.fileName}: ${error.message}`);
            // Continue with next photo even if this one fails
          }
        }
        
        // Update progress more frequently
        const progressMessage = `Processed ${Math.min(i + batchSize, this.photoSortStats.totalPhotos)}/${this.photoSortStats.totalPhotos} photos...`;
        ToastAndroid.show(progressMessage, ToastAndroid.SHORT);
        this.addLog(progressMessage);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 4: Refresh albums and images data
      this.addLog('Step 4: Refreshing data...');
      if (addedToDbCount > 0) {
        try {
          await this.readAlbums();
          this.addLog('Albums refreshed after photo sorting');
        } catch (error) {
          this.addLog(`Failed to refresh albums: ${error.message}`);
        }
      }

      const message = `Photo sorting complete! Moved ${movedCount} photos, added ${addedToDbCount} to database, ${errorCount} errors`;
      ToastAndroid.show(message, ToastAndroid.LONG);
      this.addLog(message);

      // Clear stats after successful sort
      runInAction(() => {
        this.photoSortStats = null;
      });

    } catch (error) {
      const message = `Photo sorting failed: ${error.message}`;
      ToastAndroid.show(message, ToastAndroid.LONG);
      this.addLog(message);
    } finally {
      runInAction(() => {
        this.isSortingPhotos = false;
      });
      this.addLog('Photo sorting process finished');
    }
  };

  // Tag management methods
  createTag = (name, parentId = null) => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.db.transaction(tx => {
        // First, get the next available tag ID
        tx.executeSql(
          'SELECT MAX(id) as maxId FROM Tags',
          [],
          (_, res) => {
            const nextId = (res.rows.item(0).maxId || 25) + 1;
            
            // Insert the new tag
            tx.executeSql(
              'INSERT INTO Tags (id, name) VALUES (?, ?)',
              [nextId, name],
              (_, tagRes) => {
                // Add to TagsTree
                const pid = parentId || 0;
                tx.executeSql(
                  'INSERT INTO TagsTree (id, pid) VALUES (?, ?)',
                  [nextId, pid],
                  (_, treeRes) => {
                    // Update local state
                    const newTag = { id: nextId, name, children: [] };
                    runInAction(() => {
                      this.tags.set(nextId, newTag);
                      
                      if (parentId && this.tags.has(parentId)) {
                        // Add to parent's children
                        const parent = this.tags.get(parentId);
                        parent.children.push(newTag);
                      } else {
                        // Add to root level
                        this.tagTree.set(nextId, newTag);
                      }
                    });
                    
                    this.markDatabaseChanged();
                    this.addLog(`Created tag: ${name} (ID: ${nextId})`);
                    resolve(newTag);
                  },
                  (_, er) => {
                    this.addLog(`CREATE TAG TREE ERR: ${er.message}`);
                    reject(er);
                  }
                );
              },
              (_, er) => {
                this.addLog(`CREATE TAG ERR: ${er.message}`);
                reject(er);
              }
            );
          },
          (_, er) => {
            this.addLog(`GET MAX TAG ID ERR: ${er.message}`);
            reject(er);
          }
        );
      });
    });
  };

  addTagToPhoto = (tagId, imageId) => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      // Check if tag is already assigned
      const existingTags = this.imagetags.get(imageId) || [];
      if (existingTags.some(t => t.tagid === tagId)) {
        resolve(); // Already assigned
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO ImageTags (imageid, tagid) VALUES (?, ?)',
          [imageId, tagId],
          () => {
            // Update local state
            const tag = this.tags.get(tagId);
            if (tag) {
              const updatedTags = [...existingTags, { tagid: tagId, tagname: tag.name }];
              runInAction(() => {
                this.imagetags.set(imageId, updatedTags);
              });
              this.markDatabaseChanged();
              this.addLog(`Added tag ${tag.name} to image ${imageId}`);
            }
            resolve();
          },
          (_, er) => {
            this.addLog(`ADD TAG TO PHOTO ERR: ${er.message}`);
            reject(er);
          }
        );
      });
    });
  };

  removeTagFromPhoto = (tagid, imageid) => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      let imagetags = this.imagetags.get(imageid);
      if (imagetags) {
        imagetags = imagetags.filter(tag => tag.tagid !== tagid);
        runInAction(() => {
          this.imagetags.set(imageid, imagetags);
        });
        this.db.transaction(tx => {
          tx.executeSql(
            'DELETE FROM ImageTags WHERE imageid = ? AND tagid = ?',
            [imageid, tagid],
            () => {
              this.markDatabaseChanged();
              resolve();
            },
            er => {
              this.addLog(`REMOVE TAGS FROM PHOTO ERR: ${er.message}`);
              reject(er);
            },
          );
        });
      } else {
        resolve();
      }
    });
  };

  deleteTag = (tagId) => {
    return new Promise((resolve, reject) => {
      if (!this.isDatabaseReady) {
        reject(new Error('Database not ready'));
        return;
      }

      this.db.transaction(tx => {
        // First remove all image associations
        tx.executeSql(
          'DELETE FROM ImageTags WHERE tagid = ?',
          [tagId],
          () => {
            // Remove from TagsTree
            tx.executeSql(
              'DELETE FROM TagsTree WHERE id = ?',
              [tagId],
              () => {
                // Remove the tag itself
                tx.executeSql(
                  'DELETE FROM Tags WHERE id = ?',
                  [tagId],
                  () => {
                    // Update local state
                    const tag = this.tags.get(tagId);
                    if (tag) {
                      runInAction(() => {
                        // Remove from all image tags
                        this.imagetags.forEach((tags, imageId) => {
                          const filteredTags = tags.filter(t => t.tagid !== tagId);
                          this.imagetags.set(imageId, filteredTags);
                        });
                        
                        // Remove from tags map
                        this.tags.delete(tagId);
                        
                        // Remove from tree
                        this.tagTree.delete(tagId);
                        
                        // Remove from parent's children if it has a parent
                        this.tags.forEach(parentTag => {
                          parentTag.children = parentTag.children.filter(child => child.id !== tagId);
                        });
                        
                        // Remove from filters
                        this.activeFilters.tagIds.delete(tagId);
                        this.wallpaperTags.delete(tagId);
                      });
                      
                      this.markDatabaseChanged();
                      this.addLog(`Deleted tag: ${tag.name}`);
                    }
                    resolve();
                  },
                  (_, er) => {
                    this.addLog(`DELETE TAG ERR: ${er.message}`);
                    reject(er);
                  }
                );
              },
              (_, er) => {
                this.addLog(`DELETE TAG TREE ERR: ${er.message}`);
                reject(er);
              }
            );
          },
          (_, er) => {
            this.addLog(`DELETE TAG ASSOCIATIONS ERR: ${er.message}`);
            reject(er);
          }
        );
      });
    });
  };

  dropUserSelection = () => {
    runInAction(() => {
      this.userSelectedImages.clear();
    });
  };

  addAllToUserSelection = () => {
    runInAction(() => {
      this.userSelectedImages = new Set(this.images.map(image => image.id));
    });
  };

  addToUserSelection = id => {
    runInAction(() => {
      this.userSelectedImages.add(id);
    });
  };

  removeFromUserSelection = id => {
    runInAction(() => {
      this.userSelectedImages.delete(id);
    });
  };

  // Wallpaper settings
  addWallpaperTag = id => {
    runInAction(() => {
      this.wallpaperTags.add(id);
      mmkv.set('wallpaperTags', JSON.stringify([...this.wallpaperTags]));
    });
    if (this.isDatabaseReady) {
      this.checkAndStartWallpaperService();
    }
  };

  removeWallpaperTag = id => {
    runInAction(() => {
      this.wallpaperTags.delete(id);
      mmkv.set('wallpaperTags', JSON.stringify([...this.wallpaperTags]));
    });
    if (this.wallpaperTags.size === 0) {
      this.stopWallpaperService();
    } else if (this.isDatabaseReady) {
      this.checkAndStartWallpaperService();
    }
  };

  setWallpaperFrequency = days => {
    runInAction(() => {
      this.wallpaperFrequency = days;
      mmkv.set('wallpaperFrequency', days.toString());
    });
    if (this.isDatabaseReady) {
      this.checkAndStartWallpaperService();
    }
  };

  setWallpaperType = type => {
    runInAction(() => {
      this.wallpaperType = type;
      mmkv.set('wallpaperType', type);
    });
  };

  checkAndStartWallpaperService = () => {
    if (!this.isDatabaseReady) {
      this.addLog('Cannot start wallpaper service: Database not ready');
      return;
    }

    if (this.wallpaperTags.size === 0) {
      this.addLog('Cannot start wallpaper service: No wallpaper tags selected');
      return;
    }

    // Check if enough time has passed since last update
    const now = new Date().getTime();
    const lastUpdate = this.lastWallpaperUpdate ? new Date(this.lastWallpaperUpdate).getTime() : 0;
    const timeDiff = now - lastUpdate;
    const requiredInterval = this.wallpaperFrequency * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    if (timeDiff >= requiredInterval || !this.lastWallpaperUpdate) {
      // Update immediately if enough time has passed
      this.updateWallpaper();
    }

    // Start the timer for future updates
    this.startWallpaperService();
  };

  startWallpaperService = () => {
    if (this.wallpaperTimer) {
      clearInterval(this.wallpaperTimer);
    }

    if (!this.isDatabaseReady || this.wallpaperTags.size === 0) {
      this.addLog('Cannot start wallpaper service: Database not ready or no tags selected');
      return;
    }

    // Calculate next update time
    const now = new Date().getTime();
    const lastUpdate = this.lastWallpaperUpdate ? new Date(this.lastWallpaperUpdate).getTime() : now;
    const nextUpdate = lastUpdate + (this.wallpaperFrequency * 24 * 60 * 60 * 1000);
    const timeUntilNext = Math.max(0, nextUpdate - now);

    // Set timeout for next update
    this.wallpaperTimer = setTimeout(() => {
      this.updateWallpaper();
      // After first update, set regular interval
      this.wallpaperTimer = setInterval(
        this.updateWallpaper,
        this.wallpaperFrequency * 24 * 60 * 60 * 1000
      );
    }, timeUntilNext);

    this.addLog(`Wallpaper service started. Next update in ${Math.round(timeUntilNext / (1000 * 60 * 60))} hours`);
  };

  stopWallpaperService = () => {
    if (this.wallpaperTimer) {
      clearTimeout(this.wallpaperTimer);
      clearInterval(this.wallpaperTimer);
      this.wallpaperTimer = null;
    }
    this.addLog('Wallpaper service stopped');
  };

  updateWallpaper = async () => {
    try {
      if (!this.isDatabaseReady) {
        this.addLog('Cannot update wallpaper: Database not ready');
        return;
      }

      if (this.wallpaperTags.size === 0) {
        this.addLog('Cannot update wallpaper: No wallpaper tags selected');
        return;
      }

      this.addLog('Starting wallpaper update...');

      await this.selectPhotos({
        albumIds: [],
        tagIds: [...this.wallpaperTags],
      });

      if (this.images.length === 0) {
        const message = 'No photos found with selected wallpaper tags';
        ToastAndroid.show(message, ToastAndroid.SHORT);
        this.addLog(message);
        return;
      }

      const randomIndex = Math.floor(Math.random() * this.images.length);
      const photo = this.images[randomIndex];

      this.addLog(`Setting wallpaper: ${photo.name} (type: ${this.wallpaperType})`);

      // Use a timeout to prevent blocking the UI
      setTimeout(async () => {
        try {
          await NativeModules.WallpaperModule.setWallpaper(photo.uri, this.wallpaperType);
          
          // Update last wallpaper update time
          const now = new Date().toISOString();
          runInAction(() => {
            this.lastWallpaperUpdate = now;
          });
          mmkv.set('lastWallpaperUpdate', now);

          const message = 'Wallpaper updated successfully';
          ToastAndroid.show(message, ToastAndroid.SHORT);
          this.addLog(`${message}: ${photo.name}`);
        } catch (error) {
          const message = `Failed to update wallpaper: ${error.message}`;
          ToastAndroid.show('Failed to update wallpaper', ToastAndroid.SHORT);
          this.addLog(message);
        }
      }, 100);

    } catch (error) {
      const message = `Wallpaper update error: ${error.message}`;
      ToastAndroid.show('Failed to update wallpaper', ToastAndroid.SHORT);
      this.addLog(message);
    }
  };

  // Manual sync method that can be called from UI
  forceSyncDatabase = async () => {
    await this.syncDatabaseToOriginal();
    ToastAndroid.show('Database synced successfully', ToastAndroid.SHORT);
  };

  // Cleanup method to be called when app is closing
  cleanup = async () => {
    this.stopWallpaperService();
    await this.syncDatabaseToOriginal();
    
    // Remove app state listener
    AppState.removeEventListener('change', this.handleAppStateChange);
    
    // Close database connection
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.close(resolve, reject);
      });
    }
  };
}

export const rootStore = new RootStore();