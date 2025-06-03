import { makeAutoObservable, runInAction } from 'mobx';
import { Dimensions, ToastAndroid } from 'react-native';
import {
  copyFile,
  DocumentDirectoryPath,
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
  db;
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

  constructor() {
    makeAutoObservable(this);
    this.rootFolder = mmkv.getString('rootfolder');
    if (this.rootFolder) {
      this.getDBConnection();
    }
    
    Dimensions.addEventListener('change', ({ window: { width, height } }) => {
      runInAction(() => {
        this.orientaion = width < height ? 'P' : 'L';
      });
    });
  }

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
              this.isReady = true;
              this.db = database;
            });
            Promise.all([
              this.readAlbums(),
              this.readTags(),
              this.readTagsTree(),
              this.readImageTags(),
            ]).then(resolve);
          },
          reject,
        );
      });
    } catch (er) {
      this.addLog(`\r\n${er.message}`);
    }
  };

  copyDBToCache = () => {
    const originalDbPath = `/storage/emulated/0/${this.normalizedRootPath}/${dbName}.db`;
    return copyFile(originalDbPath, localDbPath).then(() => {
      this.addLog(`DB File copied to ${localDbPath}`);
    });
  };

  setRootFolder = value => {
    this.rootFolder = value;
    mmkv.set('rootfolder', value);
    this.getDBConnection();
  };

  readAlbums = () => {
    return new Promise((resolve, reject) => {
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
              'Проблема с получением данных. Посмотрите системные сообщения',
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

  removeTagFromPhoto = (tagid, imageid) => {
    return new Promise((resolve, reject) => {
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
            () => resolve(),
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
}

export const rootStore = new RootStore();