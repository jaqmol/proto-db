'use strict';

/*
 * Copyright 2014 Ronny Reichmann – All Right Reserved
 * Contact: Ronny.Reichmann@icloud.com
 */

angular.module('proto-db', [])
    .factory('promiseWithRequest', function ($q) {
        return function(req) {
            return $q(function(resolve, reject) {
                req.onerror = function() {
                    reject( req.error );
                };
                req.onsuccess = function() {
                    resolve( req.result );
                };
            });
        }
    })
    .factory('batchPromiseWithRequests', function ($q) {
        return function(requests) {
            return $q(function(resolve, reject) {
                var resultsCollector = [];

                requests.forEach(function(req) {
                    req.onerror = function() {
                        reject( req.error );
                    };
                    req.onsuccess = function() {
                        resultsCollector.push(req.result);

                        if (resultsCollector.length === requests.length) {
                            resolve( resultsCollector );
                        }
                    };
                });
            });
        }
    })
    .factory('IndexHelper', function ($q, promiseWithRequest) {
		var IndexResult = function(primaryKeys, values) {
			this.primaryKeys = primaryKeys;
			this.values = values;
		};
		IndexResult.prototype.forEach = function(callback) {
			for (var i = 0; i < this.primaryKeys.length; i++) {
				callback(this.primaryKeys[i], this.values[i]);
			}
		};

        var IndexHelper = function(storeAccessor, indexName) {
			var self = this;

			Object.defineProperty(self, 'index', {
				get: function() {
		            return $q(function(resolve, reject) {
		                return storeAccessor.readonly.then(function(oStore) {
		                    resolve( oStore.objectStore.index(indexName) );
		                });
		            });
				}
			});

			Object.defineProperty(self, 'all', {
				get: function() {
		            return $q(function(resolve, reject) {
		                var valueCollector = [],
		                    primaryKeyCollector = [];

		                return self.forEach(function(value, primaryKey) {
		                    valueCollector.push( value );
		                    primaryKeyCollector.push( primaryKey );

		                }).then(function() {
		                    resolve( new IndexResult(primaryKeyCollector, valueCollector) );
		                });
		            });
				}
			});
        };
        IndexHelper.prototype.forEach = function(callback) {
            var self = this;

            return $q(function(resolve, reject) {
                return self.index.then(function(index) {
                    var req = index.openKeyCursor(),
                        stopper = { stop: false };

                    req.onsuccess = function(event) {
                        var cursor = req.result; // was: event.target.result;

                        if(cursor) {
                            callback(cursor.key, cursor.primaryKey, stopper);

                            if (stopper.stop) { resolve(); }
                            else              { cursor.continue(); }

                        } else {
                            resolve();
                        }
                    };
                    req.onerror = function(event) {
                        reject(req.error);
                    };
                });
            });
        };
        IndexHelper.prototype.map = function(callback) {
            var self = this;

            return $q(function(resolve, reject) {
                var collector = [];

                return self.forEach(function(value, primaryKey, stopper) {
                    collector.push( callback(value, primaryKey, stopper) );

                }).then(function() {
                    resolve( collector );
                });
            });
        };
        IndexHelper.prototype.filter = function(callback) {
            var self = this;

            return $q(function(resolve, reject) {
                var valueCollector = [],
                    primaryKeyCollector = [];

                return self.forEach(function(value, primaryKey, stopper) {
                    if ( callback(value, primaryKey, stopper) ) {
                        valueCollector.push( value );
                        primaryKeyCollector.push( primaryKey );
                    }

                }).then(function() {
                    resolve( new IndexResult(primaryKeyCollector, valueCollector) );
                });
            });
        };

        return IndexHelper;
    })
    .factory('ObjectStoreHelper', function (promiseWithRequest,
                                            batchPromiseWithRequests,
                                            $q, IndexHelper)
    {
        var ObjectStoreHelper = function(objectStore) {
            this.objectStore = objectStore;

			var self = this;
			Object.defineProperty(self, 'all', {
			    get: function() {
		            return $q(function(resolve, reject) {
		                var collector = [];

		                return self.forEach(function(value) {
		                    collector.push( value );

		                }).then(function() {
		                    resolve( collector );
		                });
		            });
			    }
			});
        };
        ObjectStoreHelper.prototype.wrapInPromise = function(itemOrItemsArray, callback) {
            if (itemOrItemsArray instanceof Array) {
                var itemsArray = itemOrItemsArray,
                    objectStore = this.objectStore;

                if (itemsArray.length === 0) {
                    return $q(function(resolve) {
                        resolve([]);
                    });

                } else {
                    var requests = itemsArray.map(function(item) {
                        return callback(item, objectStore);
                    });

                    return batchPromiseWithRequests( requests );
                }

            } else {
                var item = itemOrItemsArray,
                    req = callback(item, this.objectStore);

                return promiseWithRequest( req );
            }
        };
        ObjectStoreHelper.prototype.add = function(oneOrManyItems) {
            return this.wrapInPromise(oneOrManyItems, function(item, objectStore) {
                return objectStore.add(item);
            });
        };
        ObjectStoreHelper.prototype.clear = function() {
            return promiseWithRequest( this.objectStore.clear() );
        };
        ObjectStoreHelper.prototype.delete = function(oneOrManyPrimaryKeys) {
            return this.wrapInPromise(oneOrManyPrimaryKeys, function(primaryKey, objectStore) {
                return objectStore.delete(primaryKey);
            });
        };
        ObjectStoreHelper.prototype.get = function(oneOrManyPrimaryKeys) {
            return this.wrapInPromise(oneOrManyPrimaryKeys, function(primaryKey, objectStore) {
                return objectStore.get(primaryKey);
            });
        };
        ObjectStoreHelper.prototype.put = function(oneOrManyItems) {
            return this.wrapInPromise(oneOrManyItems, function(item, objectStore) {
                return objectStore.put(item);
            });
        };

        ObjectStoreHelper.prototype.count = function() {
            var objectStore = this.objectStore;

            return $q(function(resolve, reject) {
                var req = objectStore.count();

                req.onsuccess = function() {
                    resolve(req.result);
                };
            });
        };

        ObjectStoreHelper.prototype.forEach = function(callback) {
            var objectStore = this.objectStore;

            return $q(function(resolve, reject) {
                var req = objectStore.openCursor(),
                    stopper = { stop: false };

                req.onsuccess = function(event) {
                    var cursor = req.result; // was: event.target.result;

                    if(cursor) {
                        callback(cursor.value, stopper);

                        if (stopper.stop) { resolve(); }
                        else              { cursor.continue(); }

                    } else {
                        resolve();
                    }
                }
                req.onerror = function(event) {
                    reject(req.error);
                };
            });
        };
        ObjectStoreHelper.prototype.map = function(callback) {
            var self = this;

            return $q(function(resolve, reject) {
                var collector = [];

                return self.forEach(function(value, stopper) {
                    collector.push( callback(value, stopper) );

                }).then(function() {
                    resolve( collector );
                });
            });
        };
        ObjectStoreHelper.prototype.filter = function(callback) {
            var self = this;

            return $q(function(resolve, reject) {
                var collector = [];

                return self.forEach(function(value, stopper) {
                    if ( callback(value, stopper) ) {
                        collector.push( value );
                    }

                }).then(function() {
                    resolve( collector );
                });
            });
        };

        return ObjectStoreHelper;
    })
    .factory('createDatabaseAccessor', function($q, $timeout, ObjectStoreAccessor) {
        return function(name, version) {
			var storeConfigs = {},
				database = null,
				mappingJobs = [],
				dbAccessor = {};

			var performMappingJobs = function(finished) {
				if (mappingJobs.length === 0) {
					finished();
					return;
				}

				var job = mappingJobs.splice(0, 1)[0],
					accessor = dbAccessor[job.config.name];

				accessor.map(function(item) {
					return job.config.upgradeMapper(item, job.oldVersion, job.newVersion);

				}).then(function(mappedItems) {
					accessor.clear().then(function() {
						return accessor.add(mappedItems);

					}).then(function() {
						performMappingJobs(finished);

					}).catch(function(err) {
						console.error('Error upgrading:', err);
					});

				}).catch(function(err) {
					console.error('Error upgrading:', err);
				});
			};

			var defaultsNormalizedIndexConf = function(rawIdxConf) {
				var validStr = function(aStr) {
					return (typeof aStr === 'string') && (aStr.length > 0);
				}
				var validBool = function(aBool) {
					return typeof aBool === 'boolean';
				}

				if ( !validStr(rawIdxConf.keyPath) ) {
					throw new Error('An index configuration must at least contain a keyPath value');
				}

				var normIdxConf = { keyPath: rawIdxConf.keyPath };
				normIdxConf.name = validStr(rawIdxConf.name) ? rawIdxConf.name : rawIdxConf.keyPath;

				normIdxConf.options = {}
				if ( validBool(rawIdxConf.unique) ) {
					normIdxConf.options.unique = rawIdxConf.unique;
				}
				if ( validBool(rawIdxConf.multiEntry) ) {
					normIdxConf.options.multiEntry = rawIdxConf.multiEntry;
				}

				return normIdxConf;
			};

	        dbAccessor.open = function() {
	            return $q(function(resolve, reject) {
	                if (database !== null) {
	                    resolve(database);

	                } else {
	                    var req = indexedDB.open(name, version);

	                    req.onerror = function() {
	                        reject( req.error );
	                    };
	                    req.onsuccess = function() {
	                        database = req.result;

							if (mappingJobs.length > 0) {
								performMappingJobs(function() {
									resolve(database);
								});

							} else {
								resolve(database);
							}
	                    };
	                    req.onupgradeneeded = function(event) {
							var idb = event.target.result,
								oldVersion = event.oldVersion,
								transaction = event.target.transaction;

							for (var key in storeConfigs) {
								if ( !storeConfigs.hasOwnProperty(key) ) { continue; }

								var conf = storeConfigs[key],
									justCreated = false,
									os = null;

								if ( !idb.objectStoreNames.contains(conf.name) ) {
									var idbOSConf = {keyPath: conf.keyPath};
									if (typeof conf.autoIncrement !== 'undefined') {
										idbOSConf.autoIncrement = conf.autoIncrement;
									} else {
										idbOSConf.autoIncrement = true;
									}
									os = idb.createObjectStore(conf.name, idbOSConf);
									justCreated = true;
								}

								if ( (typeof conf.indexes !== 'undefined') && (conf.indexes.length > 0) ) {
									if (!os) { os = req.transaction.objectStore(conf.name); }

									for (var i = 0; i < conf.indexes.length; i++) {
										var idxConf = defaultsNormalizedIndexConf(conf.indexes[i]);
										os.createIndex(idxConf.name, idxConf.keyPath, idxConf.options);
									}
								}

								if ( !conf.upgradeMapper || justCreated ) { continue; }

								if (version !== oldVersion) {
									mappingJobs.push({
										'config': conf,
										'newVersion': version,
										'oldVersion': oldVersion
									});
								}
							}
	                    };
	                }
	            });
	        };
	        dbAccessor.configObjectStore = function(config) {
				if (!config.name || !config.keyPath) {
					throw new Error('Config must at least contain properties "name" and "keyPath".');
				}
				if (storeConfigs[config.name]) {
					throw new Error('Object store "' + config.name + '" already exists.');
				}

				storeConfigs[config.name] = config;
				this[config.name] = new ObjectStoreAccessor(this, config.name);
	            return this;
	        };

	        return dbAccessor;
		};
    })
    .factory('ObjectStoreAccessor', function($q, ObjectStoreHelper, IndexHelper) {
        var ObjectStoreAccessor = function(databaseAccessor, name) {
            this.databaseAccessor = databaseAccessor;
            this.name = name;

			var self = this;

			Object.defineProperty(self, 'readonly', {
			    get: function() {
					return self.provideStore(ObjectStoreAccessor.READONLY);
			    }
			});

			Object.defineProperty(self, 'readwrite', {
			    get: function() {
					return self.provideStore(ObjectStoreAccessor.READWRITE);
			    }
			});

			Object.defineProperty(self, 'all', {
			    get: function() {
					return self.readonly.then(function(oStore) {
					    return oStore.all;
					});
			    }
			});
        };

        ObjectStoreAccessor.READONLY = 'readonly';
        ObjectStoreAccessor.READWRITE = 'readwrite';

        ObjectStoreAccessor.prototype.provideStore = function(mode) {
            var dbAccessor = this.databaseAccessor,
                storeName = this.name;

            return $q(function(resolve) {
                return dbAccessor.open().then(function(db) {
                    var objectStore = db.transaction(storeName, mode).objectStore(storeName);
                    resolve(  new ObjectStoreHelper( objectStore )  );
                });
            });
        };

        ObjectStoreAccessor.prototype.index = function(indexName) {
            return new IndexHelper(this, indexName);
        };

        ObjectStoreAccessor.prototype.count = function() {
            return this.readonly.then(function(doxOSHelper) {
                return $q(function(resolve, reject) {
                    var req = doxOSHelper.objectStore.count();
                    req.onsuccess = function() {
                        resolve(req.result);
                    };
                    req.onerror = function() {
                        reject(req.error);
                    };
                });
            });
        };

        ObjectStoreAccessor.prototype.add = function(item) {
            return this.readwrite.then(function(oStore) {
                return oStore.add(item);
            });
        };
        ObjectStoreAccessor.prototype.clear = function() {
            return this.readwrite.then(function(oStore) {
                return oStore.clear();
            });
        };
        ObjectStoreAccessor.prototype.delete = function(primaryKey) {
            return this.readwrite.then(function(oStore) {
                return oStore.delete(primaryKey);
            });
        };
        ObjectStoreAccessor.prototype.get = function(primaryKey) {
            return this.readonly.then(function(oStore) {
                return oStore.get(primaryKey);
            });
        };
        ObjectStoreAccessor.prototype.put = function(item) {
            return this.readwrite.then(function(oStore) {
                return oStore.put(item);
            });
        };

        ObjectStoreAccessor.prototype.forEach = function(callback) {
            return this.readonly.then(function(oStore) {
                return oStore.forEach(callback);
            });
        };
        ObjectStoreAccessor.prototype.map = function(callback) {
            return this.readonly.then(function(oStore) {
                return oStore.map(callback);
            });
        };
        ObjectStoreAccessor.prototype.filter = function(callback) {
            return this.readonly.then(function(oStore) {
                return oStore.filter(callback);
            });
        };

        return ObjectStoreAccessor;
    })
    .factory('ProtoDB', function ($q, createDatabaseAccessor) {
		var dbNames = [],
			ProtoDB = {};

        ProtoDB.configDatabase = function(conf) {
			if (dbNames.indexOf(conf.name) > -1) {
				throw new Error('Database with name "' + conf.name + '" already exists.');
			}

            var accessor = ProtoDB[conf.name];
            if (!accessor) {
				dbNames.push(conf.name);
                accessor = createDatabaseAccessor(conf.name, conf.version);
                ProtoDB[conf.name] = accessor;
            }
            return accessor;
        };
		ProtoDB.supported = function() {
			return (typeof window.indexedDB !== 'undefined');
		};

        return ProtoDB;
    });
