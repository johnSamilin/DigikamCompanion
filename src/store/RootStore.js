import { makeAutoObservable, runInAction } from 'mobx';
import { Dimensions, ToastAndroid } from 'react-native';
import {
	CachesDirectoryPath,
	copyFile,
	DocumentDirectoryPath,
	ExternalDirectoryPath,
	ExternalStorageDirectoryPath,
	MainBundlePath,
} from 'react-native-fs';
import { MMKV } from 'react-native-mmkv';
import SQLite from 'react-native-sqlite-storage';

const mmkv = new MMKV();
const dbName = 'digikam4';
const originalDbName = 'digikam4-original.db';
// TODO найти куда копировать базу
const localDbPath = `${DocumentDirectoryPath}/${originalDbName}`;

export class RootStore {
	rootFolder = null;

	isReady = false;

	db;

	/** @type {Map<{ id: number; albumRoot: string; relativePath: string }>} */
	albums = new Map();

	/** @type {Map<number, { id: number; name: string }>} */
	tags = new Map();

	/** @type {Map<number, { tagid: number, tagname: string }[]>} */
	imagetags = new Map();

	/** @type {{ id: number; album: number; name: string; uri: string; } []} */
	images = [];

	/** @type {Set<number>} */
	userSelectedImages = new Set();

	isPermissionDenied = true;

	log = [];

	/** @type {{ albumIds: Set<number>; tagIds: Set<number> }} */
	activeFilters = {
		albumIds: new Set(),
		tagIds: new Set(),
	};

	/** @type {ENUM<'P', 'L'>} */
	orientaion = 'P';

	fileUriPrefix = `file://${ExternalStorageDirectoryPath}/`;

	get isFilterApplied() {
		return (
			this.activeFilters.albumIds.size > 0 || this.activeFilters.tagIds.size > 0
		);
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

	getDBConnection = () => {
		this.copyDBToCache()
			.then(() => {
				runInAction(() => {
					this.isPermissionDenied = false;
				});
				SQLite.openDatabase(
					{
						name: dbName,
						createFromLocation: originalDbName,
					},
					database => {
						runInAction(() => {
							this.isReady = true;
						});
						this.db = database;
						Promise.all([
							this.readAlbums(),
							this.readTags(),
							this.readImageTags(),
						]); // .then(() => this.selectPhotos()); // temporarily increasing startup performance
					},
					err => {
						this.addLog(`OPEN DATABASE ERROR: ${JSON.stringify(err)}`);
					},
				);
			})
			.catch(er => {
				this.addLog(`\r\n${er.message}`);
			});
	};

	copyDBToCache = () => {
		const root = decodeURIComponent(this.rootFolder);
		const originalDbPath = `/storage/emulated/0/${root.substring(
			root.lastIndexOf(':') + 1,
		)}/${dbName}.db`;
		return copyFile(originalDbPath, localDbPath).then(() => {
			this.addLog(`DB File copied to ${localDbPath}`);
		});
	};

	copyDBToOriginal = () => {
		const root = decodeURIComponent(this.rootFolder);
		const originalDbPath = `/storage/emulated/0/${root.substring(
			root.lastIndexOf(':') + 1,
		)}/${dbName}.db`;
		return copyFile(localDbPath, originalDbPath);
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
							resolve();
						});
						tx.commit();
					},
					er => {
						this.addLog(`SELECT ALBUMS ERR: ${er.message}`);
						tx.rollback();
						reject();
					},
				);
			});
		});
	};

	readTags = () => {
		return this.db.transaction(tx => {
			tx.executeSql(
				'SELECT id, name from Tags where id > 25', // first 25 tags are system ones
				[],
				(t, res) => {
					const tags = new Map();
					for (let index = 0; index < res.rows.length; index++) {
						const tag = res.rows.item(index);
						tags.set(tag.id, tag);
					}
					this.addLog('READ TAGS');
					this.tags = tags;
					tx.commit();
				},
				er => {
					this.addLog(`SELECT TAGS ERR: ${er.message}`);
					tx.rollback();
				},
			);
		});
	};

	readImageTags = () => {
		return this.db.transaction(tx => {
			tx.executeSql(
				'SELECT imageid, tagid from ImageTags',
				[],
				(t, res) => {
					const imagetags = new Map();
					for (let index = 0; index < res.rows.length; index++) {
						const { imageid, tagid } = res.rows.item(index);
						const tags = imagetags.has(imageid) ? imagetags.get(imageid) : [];
						const tag = this.tags.get(tagid);
						if (tag) {
							tags.push({ tagid, tagname: tag.name });
						}
						imagetags.set(imageid, tags);
					}
					this.addLog('READ IMAGE TAGS');
					this.imagetags = imagetags;
					tx.commit();
				},
				er => {
					this.addLog(`SELECT Image TAGS ERR: ${er.message}`);
					tx.rollback();
				},
			);
		});
	};

	selectPhotos = (activeFilters = { albumIds: [], tagIds: [] }) => {
		this.dropUserSelection();
		// TODO: фотки вне альбомов?
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

		this.db.transaction(tx => {
			tx.executeSql(
				sql,
				[],
				(t, res) => {
					const images = [];
					const fixedRoot = this.rootFolder
						.slice(this.rootFolder.indexOf('%3A') + 3)
						.replace('%2F', '/');
					try {
						for (let index = 0; index < res.rows.length; index++) {
							const image = res.rows.item(index);
							image.uri = `${this.fileUriPrefix}${fixedRoot}${
								this.albums.get(image.album).relativePath
							}/${image.name}`;
							images.push(image);
						}
					} catch (er) {
						this.addLog(`Error when constructing image paths: ${er.message}`);
					}
					this.addLog(`${res.rows.length} IMAGES`);
					runInAction(() => {
						this.images = images;
						tx.commit();
					});
				},
				er => {
					this.addLog(`SELECT IMAGES ERR: ${er.message}`);
					tx.rollback();
					ToastAndroid.show(
						'Проблема с получением данных. Посмотрите системные сообщения',
						ToastAndroid.LONG,
					);
				},
			);
		});
	};

	addLog(text) {
		const d = new Date();
		runInAction(() => {
			this.log.push(
				`${d.getFullYear()}.${d.getMonth()}.${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} - ${text}`,
			);
		});
	}

	getLog() {
		return this.log.join('\r\n');
	}

	addAlbumToFilters(id) {
		runInAction(() => {
			this.activeFilters.albumIds.add(id);
		});
	}

	removeAlbumFromFilters(id) {
		runInAction(() => {
			this.activeFilters.albumIds.delete(id);
		});
	}

	addTagToFilters(id) {
		runInAction(() => {
			this.activeFilters.tagIds.add(id);
		});
	}

	removeTagFromFilters(id) {
		runInAction(() => {
			this.activeFilters.tagIds.delete(id);
		});
	}

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
						(t, res) => {
							tx.commit();
							resolve();
							// have to make this work and not prevent promises from resolving
							// this.copyDBToOriginal();
							// this.selectPhotos({
							// 	albumIds: [...this.activeFilters.albumIds],
							// 	tagIds: [...this.activeFilters.tagIds],
							// });
						},
						er => {
							this.addLog(`REMOVE TAGS FROM PHOTO ERR: ${er.message}`);
							tx.rollback();
							reject();
						},
					);
				});
			}
		});
	};

	dropUserSelection = () => {
		this.userSelectedImages.clear();
	};

	addAllToUserSelection = () => {
		this.userSelectedImages = new Set(this.images.map(image => image.id));
	};

	addToUserSelection = id => {
		this.userSelectedImages.add(id);
	};

	removeFromUserSelection = id => {
		this.userSelectedImages.delete(id);
	};
}

export const rootStore = new RootStore();
