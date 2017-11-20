var loadGameTime; 
if (typeof G == 'undefined') G = {};
G.ExtLoader = function(game) {

    game.state.onStateChange.add(this.reset,this);

    this.imagesToRemoveOnStateChange = [];

    this.game = game;

    this.loadedUrls = {}; 

    this.cache = game.cache;
    this.resetLocked = false;

    this.isLoading = false;


    this.hasLoaded = false;

    this.preloadSprite = null;

    this.crossOrigin = false;


    this.baseURL = '';

    this.path = '';

  
    this.headers = {
        json: "application/json",
        xml: "application/xml"
    };

   
    this.onLoadStart = new Phaser.Signal();

    
    this.onLoadComplete = new Phaser.Signal();

    this.onPackComplete = new Phaser.Signal();

    
    this.onFileStart = new Phaser.Signal();

   
    this.onFileComplete = new Phaser.Signal();

    
    this.onFileError = new Phaser.Signal();

   
    this.useXDomainRequest = false;

    
    this._warnedAboutXDomainRequest = false;

   
    this.enableParallel = true;

    
    this.maxParallelDownloads = 4;

    
    this._withSyncPointDepth = 0;

    
    this._fileList = [];

    
    this._flightQueue = [];

    
    this._processingHead = 0;

    
    this._fileLoadStarted = false;

    
    this._totalPackCount = 0;

    
    this._totalFileCount = 0;

    
    this._loadedPackCount = 0;

    
    this._loadedFileCount = 0;

};


G.ExtLoader.TEXTURE_ATLAS_JSON_ARRAY = 0;


G.ExtLoader.TEXTURE_ATLAS_JSON_HASH = 1;


G.ExtLoader.TEXTURE_ATLAS_XML_STARLING = 2;


G.ExtLoader.PHYSICS_LIME_CORONA_JSON = 3;

/**
 * @constant
 * @type {number}
 */
G.ExtLoader.PHYSICS_PHASER_JSON = 4;

/**
 * @constant
 * @type {number}
 */
G.ExtLoader.TEXTURE_ATLAS_JSON_PYXEL = 5;

G.ExtLoader.prototype = {

    /**
     * Set a Sprite to be a "preload" sprite by passing it to this method.
     *
     * A "preload" sprite will have its width or height crop adjusted based on the percentage of the loader in real-time.
     * This allows you to easily make loading bars for games.
     *
     * The sprite will automatically be made visible when calling this.
     *
     * @method Phaser.Loader#setPreloadSprite
     * @param {Phaser.Sprite|Phaser.Image} sprite - The sprite or image that will be cropped during the load.
     * @param {number} [direction=0] - A value of zero means the sprite will be cropped horizontally, a value of 1 means its will be cropped vertically.
     */
    setPreloadSprite: function(sprite, direction) {

        direction = direction || 0;

        this.preloadSprite = {
            sprite: sprite,
            direction: direction,
            width: sprite.width,
            height: sprite.height,
            rect: null
        };

        if (direction === 0) {
            //  Horizontal rect
            this.preloadSprite.rect = new Phaser.Rectangle(0, 0, 1, sprite.height);
        } else {
            //  Vertical rect
            this.preloadSprite.rect = new Phaser.Rectangle(0, 0, sprite.width, 1);
        }

        sprite.crop(this.preloadSprite.rect);

        sprite.visible = true;

    },

    /**
     * Called automatically by ScaleManager when the game resizes in RESIZE scalemode.
     *
     * This can be used to adjust the preloading sprite size, eg.
     *
     * @method Phaser.Loader#resize
     * @protected
     */
    resize: function() {

        if (this.preloadSprite && this.preloadSprite.height !== this.preloadSprite.sprite.height) {
            this.preloadSprite.rect.height = this.preloadSprite.sprite.height;
        }

    },

    /**
     * Check whether a file/asset with a specific key is queued to be loaded.
     *
     * To access a loaded asset use Phaser.Cache, eg. {@link Phaser.Cache#checkImageKey}
     *
     * @method Phaser.Loader#checkKeyExists
     * @param {string} type - The type asset you want to check.
     * @param {string} key - Key of the asset you want to check.
     * @return {boolean} Return true if exists, otherwise return false.
     */
    checkKeyExists: function(type, key) {

        return this.getAssetIndex(type, key) > -1;

    },

    /**
     * Get the queue-index of the file/asset with a specific key.
     *
     * Only assets in the download file queue will be found.
     *
     * @method Phaser.Loader#getAssetIndex
     * @param {string} type - The type asset you want to check.
     * @param {string} key - Key of the asset you want to check.
     * @return {number} The index of this key in the filelist, or -1 if not found.
     *     The index may change and should only be used immediately following this call
     */
    getAssetIndex: function(type, key) {

        var bestFound = -1;

        for (var i = 0; i < this._fileList.length; i++) {
            var file = this._fileList[i];

            if (file.type === type && file.key === key) {
                bestFound = i;

                // An already loaded/loading file may be superceded.
                if (!file.loaded && !file.loading) {
                    break;
                }
            }
        }

        return bestFound;

    },

    /**
     * Find a file/asset with a specific key.
     *
     * Only assets in the download file queue will be found.
     *
     * @method Phaser.Loader#getAsset
     * @param {string} type - The type asset you want to check.
     * @param {string} key - Key of the asset you want to check.
     * @return {any} Returns an object if found that has 2 properties: `index` and `file`; otherwise a non-true value is returned.
     *     The index may change and should only be used immediately following this call.
     */
    getAsset: function(type, key) {

        var fileIndex = this.getAssetIndex(type, key);

        if (fileIndex > -1) {
            return {
                index: fileIndex,
                file: this._fileList[fileIndex]
            };
        }

        return false;

    },

    /**
     * Reset the loader and clear any queued assets. If `Loader.resetLocked` is true this operation will abort.
     *
     * This will abort any loading and clear any queued assets.
     *
     * Optionally you can clear any associated events.
     *
     * @method Phaser.Loader#reset
     * @protected
     * @param {boolean} [hard=false] - If true then the preload sprite and other artifacts may also be cleared.
     * @param {boolean} [clearEvents=false] - If true then the all Loader signals will have removeAll called on them.
     */
    reset: function(hard, clearEvents) {

        this.imagesToRemoveOnStateChange.forEach(function(key) {
            this.cache.removeImage(key);
        },this);
        this.imagesToRemoveOnStateChange = [];



        if (clearEvents === undefined) {
            clearEvents = false;
        }

        if (this.resetLocked) {
            return;
        }

        if (hard) {
            this.preloadSprite = null;
        }

        this.isLoading = false;

        this._processingHead = 0;
        this._fileList.length = 0;
        this._flightQueue.length = 0;

        this._fileLoadStarted = false;
        this._totalFileCount = 0;
        this._totalPackCount = 0;
        this._loadedPackCount = 0;
        this._loadedFileCount = 0;

        if (clearEvents) {
            this.onLoadStart.removeAll();
            this.onLoadComplete.removeAll();
            this.onPackComplete.removeAll();
            this.onFileStart.removeAll();
            this.onFileComplete.removeAll();
            this.onFileError.removeAll();
        }

    },

    /**
     * Internal function that adds a new entry to the file list. Do not call directly.
     *
     * @method Phaser.Loader#addToFileList
     * @protected
     * @param {string} type - The type of resource to add to the list (image, audio, xml, etc).
     * @param {string} key - The unique Cache ID key of this resource.
     * @param {string} [url] - The URL the asset will be loaded from.
     * @param {object} [properties=(none)] - Any additional properties needed to load the file. These are added directly to the added file object and overwrite any defaults.
     * @param {boolean} [overwrite=false] - If true then this will overwrite a file asset of the same type/key. Otherwise it will only add a new asset. If overwrite is true, and the asset is already being loaded (or has been loaded), then it is appended instead.
     * @param {string} [extension] - If no URL is given the Loader will sometimes auto-generate the URL based on the key, using this as the extension.
     * @return {Phaser.Loader} This instance of the Phaser Loader.
     */
    addToFileList: function(type, key, url, properties, overwrite, extension) {

        if (overwrite === undefined) {
            overwrite = false;
        }

        if (key === undefined || key === '') {
            console.warn("Phaser.Loader: Invalid or no key given of type " + type);
            return this;
        }

        if (url === undefined || url === null) {
            if (extension) {
                url = key + extension;
            } else {
                console.warn("Phaser.Loader: No URL given for file type: " + type + " key: " + key);
                return this;
            }
        }

        var file = {
            type: type,
            key: key,
            path: this.path,
            url: url,
            syncPoint: this._withSyncPointDepth > 0,
            data: null,
            loading: false,
            loaded: false,
            error: false
        };

        if (properties) {
            for (var prop in properties) {
                file[prop] = properties[prop];
            }
        }

        var fileIndex = this.getAssetIndex(type, key);

        if (overwrite && fileIndex > -1) {
            var currentFile = this._fileList[fileIndex];

            if (!currentFile.loading && !currentFile.loaded) {
                this._fileList[fileIndex] = file;
            } else {
                this._fileList.push(file);
                this._totalFileCount++;
            }
        } else if (fileIndex === -1) {
            this._fileList.push(file);
            this._totalFileCount++;
        }

        this.loadFile(this._fileList.shift());

        return this;

    },

    /**
     * Internal function that replaces an existing entry in the file list with a new one. Do not call directly.
     *
     * @method Phaser.Loader#replaceInFileList
     * @protected
     * @param {string} type - The type of resource to add to the list (image, audio, xml, etc).
     * @param {string} key - The unique Cache ID key of this resource.
     * @param {string} url - The URL the asset will be loaded from.
     * @param {object} properties - Any additional properties needed to load the file.
     */
    replaceInFileList: function(type, key, url, properties) {

        return this.addToFileList(type, key, url, properties, true);

    },

    /**
     * Add a JSON resource pack ('packfile') to the Loader.
     *
     * A packfile is a JSON file that contains a list of assets to the be loaded.
     * Please see the example 'loader/asset pack' in the Phaser Examples repository.
     *
     * Packs are always put before the first non-pack file that is not loaded / loading.
     *
     * This means that all packs added before any loading has started are added to the front
     * of the file queue, in the order added.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * The URL of the packfile can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * @method Phaser.Loader#pack
     * @param {string} key - Unique asset key of this resource pack.
     * @param {string} [url] - URL of the Asset Pack JSON file. If you wish to pass a json object instead set this to null and pass the object as the data parameter.
     * @param {object} [data] - The Asset Pack JSON data. Use this to pass in a json data object rather than loading it from a URL. TODO
     * @param {object} [callbackContext=(loader)] - Some Loader operations, like Binary and Script require a context for their callbacks. Pass the context here.
     * @return {Phaser.Loader} This Loader instance.
     */
    pack: function(key, url, data, callbackContext) {

        if (url === undefined) {
            url = null;
        }
        if (data === undefined) {
            data = null;
        }
        if (callbackContext === undefined) {
            callbackContext = null;
        }

        if (!url && !data) {
            console.warn('Phaser.Loader.pack - Both url and data are null. One must be set.');

            return this;
        }

        var pack = {
            type: 'packfile',
            key: key,
            url: url,
            path: this.path,
            syncPoint: true,
            data: null,
            loading: false,
            loaded: false,
            error: false,
            callbackContext: callbackContext
        };

        //  A data object has been given
        if (data) {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            pack.data = data || {};

            //  Already consider 'loaded'
            pack.loaded = true;
        }

        // Add before first non-pack/no-loaded ~ last pack from start prior to loading
        // (Read one past for splice-to-end)
        for (var i = 0; i < this._fileList.length + 1; i++) {
            var file = this._fileList[i];

            if (!file || (!file.loaded && !file.loading && file.type !== 'packfile')) {
                this._fileList.splice(i, 0, pack);
                this._totalPackCount++;
                break;
            }
        }

        return this;

    },

    /**
     * Adds an Image to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the image via `Cache.getImage(key)`
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#image
     * @param {string} key - Unique asset key of this image file.
     * @param {string} [url] - URL of an image file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png".
     * @param {boolean} [overwrite=false] - If an unloaded file with a matching key already exists in the queue, this entry will overwrite it.
     * @return {Phaser.Loader} This Loader instance.
     */
    image: function(key, url, overwrite) {

        return this.addToFileList('image', key, url, undefined, overwrite, '.png');

    },

    /**
     * Adds an array of images to the current load queue.
     *
     * It works by passing each element of the array to the Loader.image method.
     *
     * The files are **not** loaded immediately after calling this method. The files are added to the queue ready to be loaded when the loader starts.
     *
     * Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle.
     *
     * The keys must be unique Strings. They are used to add the files to the Phaser.Cache upon successful load.
     *
     * Retrieve the images via `Cache.getImage(key)`
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#images
     * @param {array} keys - An array of unique asset keys of the image files.
     * @param {array} [urls] - Optional array of URLs. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". If provided the URLs array length must match the keys array length.
     * @return {Phaser.Loader} This Loader instance.
     */
    images: function(keys, urls) {

        if (Array.isArray(urls)) {
            for (var i = 0; i < keys.length; i++) {
                this.image(keys[i], urls[i]);
            }
        } else {
            for (var i = 0; i < keys.length; i++) {
                this.image(keys[i]);
            }
        }

        return this;

    },

    /**
     * Adds a Text file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getText(key)`
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.txt". It will always add `.txt` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#text
     * @param {string} key - Unique asset key of the text file.
     * @param {string} [url] - URL of the text file. If undefined or `null` the url will be set to `<key>.txt`, i.e. if `key` was "alien" then the URL will be "alien.txt".
     * @param {boolean} [overwrite=false] - If an unloaded file with a matching key already exists in the queue, this entry will overwrite it.
     * @return {Phaser.Loader} This Loader instance.
     */
    text: function(key, url, overwrite) {

        return this.addToFileList('text', key, url, undefined, overwrite, '.txt');

    },

    /**
     * Adds a JSON file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getJSON(key)`. JSON files are automatically parsed upon load.
     * If you need to control when the JSON is parsed then use `Loader.text` instead and parse the text file as needed.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.json". It will always add `.json` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#json
     * @param {string} key - Unique asset key of the json file.
     * @param {string} [url] - URL of the JSON file. If undefined or `null` the url will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
     * @param {boolean} [overwrite=false] - If an unloaded file with a matching key already exists in the queue, this entry will overwrite it.
     * @return {Phaser.Loader} This Loader instance.
     */
    json: function(key, url, overwrite) {

        return this.addToFileList('json', key, url, undefined, overwrite, '.json');

    },

    /**
     * Adds a fragment shader file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getShader(key)`.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "blur"
     * and no URL is given then the Loader will set the URL to be "blur.frag". It will always add `.frag` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#shader
     * @param {string} key - Unique asset key of the fragment file.
     * @param {string} [url] - URL of the fragment file. If undefined or `null` the url will be set to `<key>.frag`, i.e. if `key` was "blur" then the URL will be "blur.frag".
     * @param {boolean} [overwrite=false] - If an unloaded file with a matching key already exists in the queue, this entry will overwrite it.
     * @return {Phaser.Loader} This Loader instance.
     */
    shader: function(key, url, overwrite) {

        return this.addToFileList('shader', key, url, undefined, overwrite, '.frag');

    },

    /**
     * Adds an XML file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getXML(key)`.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.xml". It will always add `.xml` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#xml
     * @param {string} key - Unique asset key of the xml file.
     * @param {string} [url] - URL of the XML file. If undefined or `null` the url will be set to `<key>.xml`, i.e. if `key` was "alien" then the URL will be "alien.xml".
     * @param {boolean} [overwrite=false] - If an unloaded file with a matching key already exists in the queue, this entry will overwrite it.
     * @return {Phaser.Loader} This Loader instance.
     */
    xml: function(key, url, overwrite) {

        return this.addToFileList('xml', key, url, undefined, overwrite, '.xml');

    },

    /**
     * Adds a JavaScript file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.js". It will always add `.js` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * Upon successful load the JavaScript is automatically turned into a script tag and executed, so be careful what you load!
     *
     * A callback, which will be invoked as the script tag has been created, can also be specified.
     * The callback must return relevant `data`.
     *
     * @method Phaser.Loader#script
     * @param {string} key - Unique asset key of the script file.
     * @param {string} [url] - URL of the JavaScript file. If undefined or `null` the url will be set to `<key>.js`, i.e. if `key` was "alien" then the URL will be "alien.js".
     * @param {function} [callback=(none)] - Optional callback that will be called after the script tag has loaded, so you can perform additional processing.
     * @param {object} [callbackContext=(loader)] - The context under which the callback will be applied. If not specified it will use the Phaser Loader as the context.
     * @return {Phaser.Loader} This Loader instance.
     */
    script: function(key, url, callback, callbackContext) {

        if (callback === undefined) {
            callback = false;
        }

        if (callback !== false && callbackContext === undefined) {
            callbackContext = this;
        }

        return this.addToFileList('script', key, url, {
            syncPoint: true,
            callback: callback,
            callbackContext: callbackContext
        }, false, '.js');

    },

    /**
     * Adds a binary file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getBinary(key)`.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.bin". It will always add `.bin` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * It will be loaded via xhr with a responseType of "arraybuffer". You can specify an optional callback to process the file after load.
     * When the callback is called it will be passed 2 parameters: the key of the file and the file data.
     *
     * WARNING: If a callback is specified the data will be set to whatever it returns. Always return the data object, even if you didn't modify it.
     *
     * @method Phaser.Loader#binary
     * @param {string} key - Unique asset key of the binary file.
     * @param {string} [url] - URL of the binary file. If undefined or `null` the url will be set to `<key>.bin`, i.e. if `key` was "alien" then the URL will be "alien.bin".
     * @param {function} [callback=(none)] - Optional callback that will be passed the file after loading, so you can perform additional processing on it.
     * @param {object} [callbackContext] - The context under which the callback will be applied. If not specified it will use the callback itself as the context.
     * @return {Phaser.Loader} This Loader instance.
     */
    binary: function(key, url, callback, callbackContext) {

        if (callback === undefined) {
            callback = false;
        }

        // Why is the default callback context the ..callback?
        if (callback !== false && callbackContext === undefined) {
            callbackContext = callback;
        }

        return this.addToFileList('binary', key, url, {
            callback: callback,
            callbackContext: callbackContext
        }, false, '.bin');

    },

    /**
     * Adds a Sprite Sheet to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * To clarify the terminology that Phaser uses: A Sprite Sheet is an image containing frames, usually of an animation, that are all equal
     * dimensions and often in sequence. For example if the frame size is 32x32 then every frame in the sprite sheet will be that size.
     * Sometimes (outside of Phaser) the term "sprite sheet" is used to refer to a texture atlas.
     * A Texture Atlas works by packing together images as best it can, using whatever frame sizes it likes, often with cropping and trimming
     * the frames in the process. Software such as Texture Packer, Flash CC or Shoebox all generate texture atlases, not sprite sheets.
     * If you've got an atlas then use `Loader.atlas` instead.
     *
     * The key must be a unique String. It is used to add the image to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getImage(key)`. Sprite sheets, being image based, live in the same Cache as all other Images.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien"
     * and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension.
     * If you do not desire this action then provide a URL.
     *
     * @method Phaser.Loader#spritesheet
     * @param {string} key - Unique asset key of the sheet file.
     * @param {string} url - URL of the sprite sheet file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png".
     * @param {number} frameWidth - Width in pixels of a single frame in the sprite sheet.
     * @param {number} frameHeight - Height in pixels of a single frame in the sprite sheet.
     * @param {number} [frameMax=-1] - How many frames in this sprite sheet. If not specified it will divide the whole image into frames.
     * @param {number} [margin=0] - If the frames have been drawn with a margin, specify the amount here.
     * @param {number} [spacing=0] - If the frames have been drawn with spacing between them, specify the amount here.
     * @return {Phaser.Loader} This Loader instance.
     */
    spritesheet: function(key, url, frameWidth, frameHeight, frameMax, margin, spacing) {

        if (frameMax === undefined) {
            frameMax = -1;
        }
        if (margin === undefined) {
            margin = 0;
        }
        if (spacing === undefined) {
            spacing = 0;
        }

        return this.addToFileList('spritesheet', key, url, {
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            frameMax: frameMax,
            margin: margin,
            spacing: spacing
        }, false, '.png');

    },

    /**
     * Adds an audio file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getSound(key)`.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * Mobile warning: There are some mobile devices (certain iPad 2 and iPad Mini revisions) that cannot play 48000 Hz audio.
     * When they try to play the audio becomes extremely distorted and buzzes, eventually crashing the sound system.
     * The solution is to use a lower encoding rate such as 44100 Hz.
     *
     * @method Phaser.Loader#audio
     * @param {string} key - Unique asset key of the audio file.
     * @param {string|string[]|object[]} urls - Either a single string or an array of URIs or pairs of `{uri: .., type: ..}`.
     *    If an array is specified then the first URI (or URI + mime pair) that is device-compatible will be selected.
     *    For example: `"jump.mp3"`, `['jump.mp3', 'jump.ogg', 'jump.m4a']`, or `[{uri: "data:<opus_resource>", type: 'opus'}, 'fallback.mp3']`.
     *    BLOB and DATA URIs can be used but only support automatic detection when used in the pair form; otherwise the format must be manually checked before adding the resource.
     * @param {boolean} [autoDecode=true] - When using Web Audio the audio files can either be decoded at load time or run-time.
     *    Audio files can't be played until they are decoded and, if specified, this enables immediate decoding. Decoding is a non-blocking async process, however it consumes huge amounts of CPU time on mobiles especially.
     * @return {Phaser.Loader} This Loader instance.
     */
    audio: function(key, urls, autoDecode) {

        if (this.game.sound.noAudio) {
            return this;
        }

        if (autoDecode === undefined) {
            autoDecode = true;
        }

        if (typeof urls === 'string') {
            urls = [urls];
        }

        this.addToFileList('audio', key, urls, {
            buffer: null,
            autoDecode: autoDecode
        });

        //this.loadFile(this._fileList.shift());

    },

    /**
     * Adds an audio sprite file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Audio Sprites are a combination of audio files and a JSON configuration.
     *
     * The JSON follows the format of that created by https://github.com/tonistiigi/audiosprite
     *
     * Retrieve the file via `Cache.getSoundData(key)`.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * @method Phaser.Loader#audiosprite
     * @param {string} key - Unique asset key of the audio file.
     * @param {Array|string} urls - An array containing the URLs of the audio files, i.e.: [ 'audiosprite.mp3', 'audiosprite.ogg', 'audiosprite.m4a' ] or a single string containing just one URL.
     * @param {string} [jsonURL=null] - The URL of the audiosprite configuration JSON object. If you wish to pass the data directly set this parameter to null.
     * @param {string|object} [jsonData=null] - A JSON object or string containing the audiosprite configuration data. This is ignored if jsonURL is not null.
     * @param {boolean} [autoDecode=true] - When using Web Audio the audio files can either be decoded at load time or run-time.
     *    Audio files can't be played until they are decoded and, if specified, this enables immediate decoding. Decoding is a non-blocking async process, however it consumes huge amounts of CPU time on mobiles especially.
     * @return {Phaser.Loader} This Loader instance.
     */
    audioSprite: function(key, urls, jsonURL, jsonData, autoDecode) {

        if (this.game.sound.noAudio) {
            return this;
        }

        if (jsonURL === undefined) {
            jsonURL = null;
        }
        if (jsonData === undefined) {
            jsonData = null;
        }
        if (autoDecode === undefined) {
            autoDecode = true;
        }

        this.audio(key, urls, autoDecode);

        if (jsonURL) {
            this.json(key + '-audioatlas', jsonURL);
        } else if (jsonData) {
            if (typeof jsonData === 'string') {
                jsonData = JSON.parse(jsonData);
            }

            this.cache.addJSON(key + '-audioatlas', '', jsonData);
        } else {
            console.warn('Phaser.Loader.audiosprite - You must specify either a jsonURL or provide a jsonData object');
        }

        return this;

    },

    /**
     * A legacy alias for Loader.audioSprite. Please see that method for documentation.
     *
     * @method Phaser.Loader#audiosprite
     * @param {string} key - Unique asset key of the audio file.
     * @param {Array|string} urls - An array containing the URLs of the audio files, i.e.: [ 'audiosprite.mp3', 'audiosprite.ogg', 'audiosprite.m4a' ] or a single string containing just one URL.
     * @param {string} [jsonURL=null] - The URL of the audiosprite configuration JSON object. If you wish to pass the data directly set this parameter to null.
     * @param {string|object} [jsonData=null] - A JSON object or string containing the audiosprite configuration data. This is ignored if jsonURL is not null.
     * @param {boolean} [autoDecode=true] - When using Web Audio the audio files can either be decoded at load time or run-time.
     *    Audio files can't be played until they are decoded and, if specified, this enables immediate decoding. Decoding is a non-blocking async process, however it consumes huge amounts of CPU time on mobiles especially.
     * @return {Phaser.Loader} This Loader instance.
     */
    audiosprite: function(key, urls, jsonURL, jsonData, autoDecode) {

        return this.audioSprite(key, urls, jsonURL, jsonData, autoDecode);

    },

    /**
     * Adds a video file to the current load queue.
     *
     * The file is **not** loaded immediately after calling this method. The file is added to the queue ready to be loaded when the loader starts.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getVideo(key)`.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * You don't need to preload a video in order to play it in your game. See `Video.createVideoFromURL` for details.
     *
     * @method Phaser.Loader#video
     * @param {string} key - Unique asset key of the video file.
     * @param {string|string[]|object[]} urls - Either a single string or an array of URIs or pairs of `{uri: .., type: ..}`.
     *    If an array is specified then the first URI (or URI + mime pair) that is device-compatible will be selected.
     *    For example: `"boom.mp4"`, `['boom.mp4', 'boom.ogg', 'boom.webm']`, or `[{uri: "data:<opus_resource>", type: 'opus'}, 'fallback.mp4']`.
     *    BLOB and DATA URIs can be used but only support automatic detection when used in the pair form; otherwise the format must be manually checked before adding the resource.
     * @param {string} [loadEvent='canplaythrough'] - This sets the Video source event to listen for before the load is considered complete.
     *    'canplaythrough' implies the video has downloaded enough, and bandwidth is high enough that it can be played to completion.
     *    'canplay' implies the video has downloaded enough to start playing, but not necessarily to finish.
     *    'loadeddata' just makes sure that the video meta data and first frame have downloaded. Phaser uses this value automatically if the
     *    browser is detected as being Firefox and no `loadEvent` is given, otherwise it defaults to `canplaythrough`.
     * @param {boolean} [asBlob=false] - Video files can either be loaded via the creation of a video element which has its src property set.
     *    Or they can be loaded via xhr, stored as binary data in memory and then converted to a Blob. This isn't supported in IE9 or Android 2.
     *    If you need to have the same video playing at different times across multiple Sprites then you need to load it as a Blob.
     * @return {Phaser.Loader} This Loader instance.
     */
    video: function(key, urls, loadEvent, asBlob) {

        if (loadEvent === undefined) {
            if (this.game.device.firefox) {
                loadEvent = 'loadeddata';
            } else {
                loadEvent = 'canplaythrough';
            }
        }

        if (asBlob === undefined) {
            asBlob = false;
        }

        if (typeof urls === 'string') {
            urls = [urls];
        }

        return this.addToFileList('video', key, urls, {
            buffer: null,
            asBlob: asBlob,
            loadEvent: loadEvent
        });

    },

    /**
     * Adds a Tile Map data file to the current load queue.
     *
     * You can choose to either load the data externally, by providing a URL to a json file.
     * Or you can pass in a JSON object or String via the `data` parameter.
     * If you pass a String the data is automatically run through `JSON.parse` and then immediately added to the Phaser.Cache.
     *
     * If a URL is provided the file is **not** loaded immediately after calling this method, but is added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getTilemapData(key)`. JSON files are automatically parsed upon load.
     * If you need to control when the JSON is parsed then use `Loader.text` instead and parse the text file as needed.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified and no data is given then the Loader will take the key and create a filename from that.
     * For example if the key is "level1" and no URL or data is given then the Loader will set the URL to be "level1.json".
     * If you set the format to be Tilemap.CSV it will set the URL to be "level1.csv" instead.
     *
     * If you do not desire this action then provide a URL or data object.
     *
     * @method Phaser.Loader#tilemap
     * @param {string} key - Unique asset key of the tilemap data.
     * @param {string} [url] - URL of the tile map file. If undefined or `null` and no data is given the url will be set to `<key>.json`, i.e. if `key` was "level1" then the URL will be "level1.json".
     * @param {object|string} [data] - An optional JSON data object. If given then the url is ignored and this JSON object is used for map data instead.
     * @param {number} [format=Phaser.Tilemap.CSV] - The format of the map data. Either Phaser.Tilemap.CSV or Phaser.Tilemap.TILED_JSON.
     * @return {Phaser.Loader} This Loader instance.
     */
    tilemap: function(key, url, data, format) {

        if (url === undefined) {
            url = null;
        }
        if (data === undefined) {
            data = null;
        }
        if (format === undefined) {
            format = Phaser.Tilemap.CSV;
        }

        if (!url && !data) {
            if (format === Phaser.Tilemap.CSV) {
                url = key + '.csv';
            } else {
                url = key + '.json';
            }
        }

        //  A map data object has been given
        if (data) {
            switch (format) {
                //  A csv string or object has been given
                case Phaser.Tilemap.CSV:
                    break;

                    //  A json string or object has been given
                case Phaser.Tilemap.TILED_JSON:

                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    break;
            }

            this.cache.addTilemap(key, null, data, format);
        } else {
            this.addToFileList('tilemap', key, url, {
                format: format
            });
        }

        return this;

    },

    /**
     * Adds a physics data file to the current load queue.
     *
     * The data must be in `Lime + Corona` JSON format. [Physics Editor](https://www.codeandweb.com) by code'n'web exports in this format natively.
     *
     * You can choose to either load the data externally, by providing a URL to a json file.
     * Or you can pass in a JSON object or String via the `data` parameter.
     * If you pass a String the data is automatically run through `JSON.parse` and then immediately added to the Phaser.Cache.
     *
     * If a URL is provided the file is **not** loaded immediately after calling this method, but is added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getJSON(key)`. JSON files are automatically parsed upon load.
     * If you need to control when the JSON is parsed then use `Loader.text` instead and parse the text file as needed.
     *
     * The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the URL isn't specified and no data is given then the Loader will take the key and create a filename from that.
     * For example if the key is "alien" and no URL or data is given then the Loader will set the URL to be "alien.json".
     * It will always use `.json` as the extension.
     *
     * If you do not desire this action then provide a URL or data object.
     *
     * @method Phaser.Loader#physics
     * @param {string} key - Unique asset key of the physics json data.
     * @param {string} [url] - URL of the physics data file. If undefined or `null` and no data is given the url will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
     * @param {object|string} [data] - An optional JSON data object. If given then the url is ignored and this JSON object is used for physics data instead.
     * @param {string} [format=Phaser.Physics.LIME_CORONA_JSON] - The format of the physics data.
     * @return {Phaser.Loader} This Loader instance.
     */
    physics: function(key, url, data, format) {

        if (url === undefined) {
            url = null;
        }
        if (data === undefined) {
            data = null;
        }
        if (format === undefined) {
            format = Phaser.Physics.LIME_CORONA_JSON;
        }

        if (!url && !data) {
            url = key + '.json';
        }

        //  A map data object has been given
        if (data) {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            this.cache.addPhysicsData(key, null, data, format);
        } else {
            this.addToFileList('physics', key, url, {
                format: format
            });
        }

        return this;

    },

    /**
     * Adds Bitmap Font files to the current load queue.
     *
     * To create the Bitmap Font files you can use:
     *
     * BMFont (Windows, free): http://www.angelcode.com/products/bmfont/
     * Glyph Designer (OS X, commercial): http://www.71squared.com/en/glyphdesigner
     * Littera (Web-based, free): http://kvazars.com/littera/
     *
     * You can choose to either load the data externally, by providing a URL to an xml file.
     * Or you can pass in an XML object or String via the `xmlData` parameter.
     * If you pass a String the data is automatically run through `Loader.parseXML` and then immediately added to the Phaser.Cache.
     *
     * If URLs are provided the files are **not** loaded immediately after calling this method, but are added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getBitmapFont(key)`. XML files are automatically parsed upon load.
     * If you need to control when the XML is parsed then use `Loader.text` instead and parse the XML file as needed.
     *
     * The URLs can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the textureURL isn't specified then the Loader will take the key and create a filename from that.
     * For example if the key is "megaFont" and textureURL is null then the Loader will set the URL to be "megaFont.png".
     * The same is true for the atlasURL. If atlasURL isn't specified and no atlasData has been provided then the Loader will
     * set the atlasURL to be the key. For example if the key is "megaFont" the atlasURL will be set to "megaFont.xml".
     *
     * If you do not desire this action then provide URLs and / or a data object.
     *
     * @method Phaser.Loader#bitmapFont
     * @param {string} key - Unique asset key of the bitmap font.
     * @param {string} textureURL -  URL of the Bitmap Font texture file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "megaFont" then the URL will be "megaFont.png".
     * @param {string} atlasURL - URL of the Bitmap Font atlas file (xml/json). If undefined or `null` AND `atlasData` is null, the url will be set to `<key>.xml`, i.e. if `key` was "megaFont" then the URL will be "megaFont.xml".
     * @param {object} atlasData - An optional Bitmap Font atlas in string form (stringified xml/json).
     * @param {number} [xSpacing=0] - If you'd like to add additional horizontal spacing between the characters then set the pixel value here.
     * @param {number} [ySpacing=0] - If you'd like to add additional vertical spacing between the lines then set the pixel value here.
     * @return {Phaser.Loader} This Loader instance.
     */
    bitmapFont: function(key, textureURL, atlasURL, atlasData, xSpacing, ySpacing) {

        if (textureURL === undefined || textureURL === null) {
            textureURL = key + '.png';
        }

        if (atlasURL === undefined) {
            atlasURL = null;
        }
        if (atlasData === undefined) {
            atlasData = null;
        }

        if (atlasURL === null && atlasData === null) {
            atlasURL = key + '.xml';
        }

        if (xSpacing === undefined) {
            xSpacing = 0;
        }
        if (ySpacing === undefined) {
            ySpacing = 0;
        }

        //  A URL to a json/xml atlas has been given
        if (atlasURL) {
            this.addToFileList('bitmapfont', key, textureURL, {
                atlasURL: atlasURL,
                xSpacing: xSpacing,
                ySpacing: ySpacing
            });
        } else {
            //  A stringified xml/json atlas has been given
            if (typeof atlasData === 'string') {
                var json, xml;

                try {
                    json = JSON.parse(atlasData);
                } catch (e) {
                    xml = this.parseXml(atlasData);
                }

                if (!xml && !json) {
                    throw new Error("Phaser.Loader. Invalid Bitmap Font atlas given");
                }

                this.addToFileList('bitmapfont', key, textureURL, {
                    atlasURL: null,
                    atlasData: json || xml,
                    atlasType: ( !! json ? 'json' : 'xml'),
                    xSpacing: xSpacing,
                    ySpacing: ySpacing
                });
            }
        }

        return this;

    },

    /**
     * Adds a Texture Atlas file to the current load queue.
     *
     * Unlike `Loader.atlasJSONHash` this call expects the atlas data to be in a JSON Array format.
     *
     * To create the Texture Atlas you can use tools such as:
     *
     * [Texture Packer](https://www.codeandweb.com/texturepacker/phaser)
     * [Shoebox](http://renderhjs.net/shoebox/)
     *
     * If using Texture Packer we recommend you enable "Trim sprite names".
     * If your atlas software has an option to "rotate" the resulting frames, you must disable it.
     *
     * You can choose to either load the data externally, by providing a URL to a json file.
     * Or you can pass in a JSON object or String via the `atlasData` parameter.
     * If you pass a String the data is automatically run through `JSON.parse` and then immediately added to the Phaser.Cache.
     *
     * If URLs are provided the files are **not** loaded immediately after calling this method, but are added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getImage(key)`. JSON files are automatically parsed upon load.
     * If you need to control when the JSON is parsed then use `Loader.text` instead and parse the JSON file as needed.
     *
     * The URLs can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the textureURL isn't specified then the Loader will take the key and create a filename from that.
     * For example if the key is "player" and textureURL is null then the Loader will set the URL to be "player.png".
     * The same is true for the atlasURL. If atlasURL isn't specified and no atlasData has been provided then the Loader will
     * set the atlasURL to be the key. For example if the key is "player" the atlasURL will be set to "player.json".
     *
     * If you do not desire this action then provide URLs and / or a data object.
     *
     * @method Phaser.Loader#atlasJSONArray
     * @param {string} key - Unique asset key of the texture atlas file.
     * @param {string} [textureURL] - URL of the texture atlas image file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png".
     * @param {string} [atlasURL] - URL of the texture atlas data file. If undefined or `null` and no atlasData is given, the url will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
     * @param {object} [atlasData] - A JSON data object. You don't need this if the data is being loaded from a URL.
     * @return {Phaser.Loader} This Loader instance.
     */
    atlasJSONArray: function(key, textureURL, atlasURL, atlasData) {

        return this.atlas(key, textureURL, atlasURL, atlasData, Phaser.Loader.TEXTURE_ATLAS_JSON_ARRAY);

    },

    /**
     * Adds a Texture Atlas file to the current load queue.
     *
     * Unlike `Loader.atlas` this call expects the atlas data to be in a JSON Hash format.
     *
     * To create the Texture Atlas you can use tools such as:
     *
     * [Texture Packer](https://www.codeandweb.com/texturepacker/phaser)
     * [Shoebox](http://renderhjs.net/shoebox/)
     *
     * If using Texture Packer we recommend you enable "Trim sprite names".
     * If your atlas software has an option to "rotate" the resulting frames, you must disable it.
     *
     * You can choose to either load the data externally, by providing a URL to a json file.
     * Or you can pass in a JSON object or String via the `atlasData` parameter.
     * If you pass a String the data is automatically run through `JSON.parse` and then immediately added to the Phaser.Cache.
     *
     * If URLs are provided the files are **not** loaded immediately after calling this method, but are added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getImage(key)`. JSON files are automatically parsed upon load.
     * If you need to control when the JSON is parsed then use `Loader.text` instead and parse the JSON file as needed.
     *
     * The URLs can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the textureURL isn't specified then the Loader will take the key and create a filename from that.
     * For example if the key is "player" and textureURL is null then the Loader will set the URL to be "player.png".
     * The same is true for the atlasURL. If atlasURL isn't specified and no atlasData has been provided then the Loader will
     * set the atlasURL to be the key. For example if the key is "player" the atlasURL will be set to "player.json".
     *
     * If you do not desire this action then provide URLs and / or a data object.
     *
     * @method Phaser.Loader#atlasJSONHash
     * @param {string} key - Unique asset key of the texture atlas file.
     * @param {string} [textureURL] - URL of the texture atlas image file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png".
     * @param {string} [atlasURL] - URL of the texture atlas data file. If undefined or `null` and no atlasData is given, the url will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
     * @param {object} [atlasData] - A JSON data object. You don't need this if the data is being loaded from a URL.
     * @return {Phaser.Loader} This Loader instance.
     */
    atlasJSONHash: function(key, textureURL, atlasURL, atlasData) {

        return this.atlas(key, textureURL, atlasURL, atlasData, Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);

    },

    /**
     * Adds a Texture Atlas file to the current load queue.
     *
     * This call expects the atlas data to be in the Starling XML data format.
     *
     * To create the Texture Atlas you can use tools such as:
     *
     * [Texture Packer](https://www.codeandweb.com/texturepacker/phaser)
     * [Shoebox](http://renderhjs.net/shoebox/)
     *
     * If using Texture Packer we recommend you enable "Trim sprite names".
     * If your atlas software has an option to "rotate" the resulting frames, you must disable it.
     *
     * You can choose to either load the data externally, by providing a URL to an xml file.
     * Or you can pass in an XML object or String via the `atlasData` parameter.
     * If you pass a String the data is automatically run through `Loader.parseXML` and then immediately added to the Phaser.Cache.
     *
     * If URLs are provided the files are **not** loaded immediately after calling this method, but are added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getImage(key)`. XML files are automatically parsed upon load.
     * If you need to control when the XML is parsed then use `Loader.text` instead and parse the XML file as needed.
     *
     * The URLs can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the textureURL isn't specified then the Loader will take the key and create a filename from that.
     * For example if the key is "player" and textureURL is null then the Loader will set the URL to be "player.png".
     * The same is true for the atlasURL. If atlasURL isn't specified and no atlasData has been provided then the Loader will
     * set the atlasURL to be the key. For example if the key is "player" the atlasURL will be set to "player.xml".
     *
     * If you do not desire this action then provide URLs and / or a data object.
     *
     * @method Phaser.Loader#atlasXML
     * @param {string} key - Unique asset key of the texture atlas file.
     * @param {string} [textureURL] - URL of the texture atlas image file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png".
     * @param {string} [atlasURL] - URL of the texture atlas data file. If undefined or `null` and no atlasData is given, the url will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.xml".
     * @param {object} [atlasData] - An XML data object. You don't need this if the data is being loaded from a URL.
     * @return {Phaser.Loader} This Loader instance.
     */
    atlasXML: function(key, textureURL, atlasURL, atlasData) {

        if (atlasURL === undefined) {
            atlasURL = null;
        }
        if (atlasData === undefined) {
            atlasData = null;
        }

        if (!atlasURL && !atlasData) {
            atlasURL = key + '.xml';
        }

        return this.atlas(key, textureURL, atlasURL, atlasData, Phaser.Loader.TEXTURE_ATLAS_XML_STARLING);

    },

    /**
     * Adds a Texture Atlas file to the current load queue.
     *
     * To create the Texture Atlas you can use tools such as:
     *
     * [Texture Packer](https://www.codeandweb.com/texturepacker/phaser)
     * [Shoebox](http://renderhjs.net/shoebox/)
     *
     * If using Texture Packer we recommend you enable "Trim sprite names".
     * If your atlas software has an option to "rotate" the resulting frames, you must disable it.
     *
     * You can choose to either load the data externally, by providing a URL to a json file.
     * Or you can pass in a JSON object or String via the `atlasData` parameter.
     * If you pass a String the data is automatically run through `JSON.parse` and then immediately added to the Phaser.Cache.
     *
     * If URLs are provided the files are **not** loaded immediately after calling this method, but are added to the load queue.
     *
     * The key must be a unique String. It is used to add the file to the Phaser.Cache upon successful load.
     *
     * Retrieve the file via `Cache.getImage(key)`. JSON files are automatically parsed upon load.
     * If you need to control when the JSON is parsed then use `Loader.text` instead and parse the JSON file as needed.
     *
     * The URLs can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.
     *
     * If the textureURL isn't specified then the Loader will take the key and create a filename from that.
     * For example if the key is "player" and textureURL is null then the Loader will set the URL to be "player.png".
     * The same is true for the atlasURL. If atlasURL isn't specified and no atlasData has been provided then the Loader will
     * set the atlasURL to be the key. For example if the key is "player" the atlasURL will be set to "player.json".
     *
     * If you do not desire this action then provide URLs and / or a data object.
     *
     * @method Phaser.Loader#atlas
     * @param {string} key - Unique asset key of the texture atlas file.
     * @param {string} [textureURL] - URL of the texture atlas image file. If undefined or `null` the url will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png".
     * @param {string} [atlasURL] - URL of the texture atlas data file. If undefined or `null` and no atlasData is given, the url will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json".
     * @param {object} [atlasData] - A JSON or XML data object. You don't need this if the data is being loaded from a URL.
     * @param {number} [format] - The format of the data. Can be Phaser.Loader.TEXTURE_ATLAS_JSON_ARRAY (the default), Phaser.Loader.TEXTURE_ATLAS_JSON_HASH or Phaser.Loader.TEXTURE_ATLAS_XML_STARLING.
     * @return {Phaser.Loader} This Loader instance.
     */
    atlas: function(key, textureURL, atlasURL, atlasData, format) {

        if (textureURL === undefined || textureURL === null) {
            textureURL = key + '.png';
        }

        if (atlasURL === undefined) {
            atlasURL = null;
        }
        if (atlasData === undefined) {
            atlasData = null;
        }
        if (format === undefined) {
            format = Phaser.Loader.TEXTURE_ATLAS_JSON_ARRAY;
        }

        if (!atlasURL && !atlasData) {
            if (format === Phaser.Loader.TEXTURE_ATLAS_XML_STARLING) {
                atlasURL = key + '.xml';
            } else {
                atlasURL = key + '.json';
            }
        }

        //  A URL to a json/xml file has been given
        if (atlasURL) {
            this.addToFileList('textureatlas', key, textureURL, {
                atlasURL: atlasURL,
                format: format
            });
        } else {
            switch (format) {
                //  A json string or object has been given
                case Phaser.Loader.TEXTURE_ATLAS_JSON_ARRAY:

                    if (typeof atlasData === 'string') {
                        atlasData = JSON.parse(atlasData);
                    }
                    break;

                    //  An xml string or object has been given
                case Phaser.Loader.TEXTURE_ATLAS_XML_STARLING:

                    if (typeof atlasData === 'string') {
                        var xml = this.parseXml(atlasData);

                        if (!xml) {
                            throw new Error("Phaser.Loader. Invalid Texture Atlas XML given");
                        }

                        atlasData = xml;
                    }
                    break;
            }

            this.addToFileList('textureatlas', key, textureURL, {
                atlasURL: null,
                atlasData: atlasData,
                format: format
            });

        }

        return this;

    },

    /**
     * Add a synchronization point to the assets/files added within the supplied callback.
     *
     * A synchronization point denotes that an asset _must_ be completely loaded before
     * subsequent assets can be loaded. An asset marked as a sync-point does not need to wait
     * for previous assets to load (unless they are sync-points). Resources, such as packs, may still
     * be downloaded around sync-points, as long as they do not finalize loading.
     *
     * @method Phaser.Loader#withSyncPoints
     * @param {function} callback - The callback is invoked and is supplied with a single argument: the loader.
     * @param {object} [callbackContext=(loader)] - Context for the callback.
     * @return {Phaser.Loader} This Loader instance.
     */
    withSyncPoint: function(callback, callbackContext) {

        this._withSyncPointDepth++;

        try {
            callback.call(callbackContext || this, this);
        } finally {
            this._withSyncPointDepth--;
        }

        return this;
    },

    /**
     * Add a synchronization point to a specific file/asset in the load queue.
     *
     * This has no effect on already loaded assets.
     *
     * @method Phaser.Loader#addSyncPoint
     * @param {string} type - The type of resource to turn into a sync point (image, audio, xml, etc).
     * @param {string} key - Key of the file you want to turn into a sync point.
     * @return {Phaser.Loader} This Loader instance.
     * @see {@link Phaser.Loader#withSyncPoint withSyncPoint}
     */
    addSyncPoint: function(type, key) {

        var asset = this.getAsset(type, key);

        if (asset) {
            asset.file.syncPoint = true;
        }

        return this;
    },

    /**
     * Remove a file/asset from the loading queue.
     *
     * A file that is loaded or has started loading cannot be removed.
     *
     * @method Phaser.Loader#removeFile
     * @protected
     * @param {string} type - The type of resource to add to the list (image, audio, xml, etc).
     * @param {string} key - Key of the file you want to remove.
     */
    removeFile: function(type, key) {

        var asset = this.getAsset(type, key);

        if (asset) {
            if (!asset.loaded && !asset.loading) {
                this._fileList.splice(asset.index, 1);
            }
        }

    },

    /**
     * Remove all file loading requests - this is _insufficient_ to stop current loading. Use `reset` instead.
     *
     * @method Phaser.Loader#removeAll
     * @protected
     */
    removeAll: function() {

        this._fileList.length = 0;
        this._flightQueue.length = 0;

    },

    /**
     * Start loading the assets. Normally you don't need to call this yourself as the StateManager will do so.
     *
     * @method Phaser.Loader#start
     */
    start: function() {

        if (this.isLoading) {
            return;
        }

        this.hasLoaded = false;
        this.isLoading = true;

        this.updateProgress();

        this.processLoadQueue();

    },

    /**
     * Process the next item(s) in the file/asset queue.
     *
     * Process the queue and start loading enough items to fill up the inflight queue.
     *
     * If a sync-file is encountered then subsequent asset processing is delayed until it completes.
     * The exception to this rule is that packfiles can be downloaded (but not processed) even if
     * there appear other sync files (ie. packs) - this enables multiple packfiles to be fetched in parallel.
     * such as during the start phaser.
     *
     * @method Phaser.Loader#processLoadQueue
     * @private
     */
    processLoadQueue: function() {

        if (!this.isLoading) {
            console.warn('Phaser.Loader - active loading canceled / reset');
            this.finishedLoading(true);
            return;
        }

        // Empty the flight queue as applicable
        for (var i = 0; i < this._flightQueue.length; i++) {
            var file = this._flightQueue[i];

            if (file.loaded || file.error) {
                this._flightQueue.splice(i, 1);
                i--;

                file.loading = false;
                file.requestUrl = null;
                file.requestObject = null;

                if (file.error) {
                    this.onFileError.dispatch(file.key, file);
                }

                if (file.type !== 'packfile') {
                    this._loadedFileCount++;
                    this.onFileComplete.dispatch(this.progress, file.key, !file.error, this._loadedFileCount, this._totalFileCount);
                } else if (file.type === 'packfile' && file.error) {
                    // Non-error pack files are handled when processing the file queue
                    this._loadedPackCount++;
                    this.onPackComplete.dispatch(file.key, !file.error, this._loadedPackCount, this._totalPackCount);
                }

            }
        }

        // When true further non-pack file downloads are suppressed
        var syncblock = false;

        var inflightLimit = this.enableParallel ? Phaser.Math.clamp(this.maxParallelDownloads, 1, 12) : 1;

        for (var i = this._processingHead; i < this._fileList.length; i++) {
            var file = this._fileList[i];

            // Pack is fetched (ie. has data) and is currently at the start of the process queue.
            if (file.type === 'packfile' && !file.error && file.loaded && i === this._processingHead) {
                // Processing the pack / adds more files
                this.processPack(file);

                this._loadedPackCount++;
                this.onPackComplete.dispatch(file.key, !file.error, this._loadedPackCount, this._totalPackCount);
            }

            if (file.loaded || file.error) {
                // Item at the start of file list finished, can skip it in future
                if (i === this._processingHead) {
                    this._processingHead = i + 1;
                }
            } else if (!file.loading && this._flightQueue.length < inflightLimit) {
                // -> not loaded/failed, not loading
                if (file.type === 'packfile' && !file.data) {
                    // Fetches the pack data: the pack is processed above as it reaches queue-start.
                    // (Packs do not trigger onLoadStart or onFileStart.)
                    this._flightQueue.push(file);
                    file.loading = true;

                    this.loadFile(file);
                } else if (!syncblock) {
                    if (!this._fileLoadStarted) {
                        this._fileLoadStarted = true;
                        this.onLoadStart.dispatch();
                    }

                    this._flightQueue.push(file);
                    file.loading = true;
                    this.onFileStart.dispatch(this.progress, file.key, file.url);

                    this.loadFile(file);
                }
            }

            if (!file.loaded && file.syncPoint) {
                syncblock = true;
            }

            // Stop looking if queue full - or if syncblocked and there are no more packs.
            // (As only packs can be loaded around a syncblock)
            if (this._flightQueue.length >= inflightLimit ||
                (syncblock && this._loadedPackCount === this._totalPackCount)) {
                break;
            }
        }

        this.updateProgress();

        // True when all items in the queue have been advanced over
        // (There should be no inflight items as they are complete - loaded/error.)
        if (this._processingHead >= this._fileList.length) {
            this.finishedLoading();
        } else if (!this._flightQueue.length) {
            // Flight queue is empty but file list is not done being processed.
            // This indicates a critical internal error with no known recovery.
            console.warn("Phaser.Loader - aborting: processing queue empty, loading may have stalled");

            var _this = this;

            setTimeout(function() {
                _this.finishedLoading(true);
            }, 2000);
        }

    },

    /**
     * The loading is all finished.
     *
     * @method Phaser.Loader#finishedLoading
     * @private
     * @param {boolean} [abnormal=true] - True if the loading finished abnormally.
     */
    finishedLoading: function(abnormal) {

        if (this.hasLoaded) {
            return;
        }

        this.hasLoaded = true;
        this.isLoading = false;

        // If there were no files make sure to trigger the event anyway, for consistency
        if (!abnormal && !this._fileLoadStarted) {
            this._fileLoadStarted = true;
            this.onLoadStart.dispatch();
        }

        this.onLoadComplete.dispatch();

        //this.game.state.loadComplete();

        this.reset();

    },

    /**
     * Informs the loader that the given file resource has been fetched and processed;
     * or such a request has failed.
     *
     * @method Phaser.Loader#asyncComplete
     * @private
     * @param {object} file
     * @param {string} [error=''] - The error message, if any. No message implies no error.
     */
    asyncComplete: function(file, errorMessage) {

        if (errorMessage === undefined) {
            errorMessage = '';
        }

        file.loaded = true;
        file.error = !! errorMessage;

        if (errorMessage) {
            file.errorMessage = errorMessage;

            console.warn('Phaser.Loader - ' + file.type + '[' + file.key + ']' + ': ' + errorMessage);
            // debugger;
        }

        //this.processLoadQueue();

    },

    /**
     * Process pack data. This will usually modify the file list.
     *
     * @method Phaser.Loader#processPack
     * @private
     * @param {object} pack
     */
    processPack: function(pack) {

        var packData = pack.data[pack.key];

        if (!packData) {
            console.warn('Phaser.Loader - ' + pack.key + ': pack has data, but not for pack key');
            return;
        }

        for (var i = 0; i < packData.length; i++) {
            var file = packData[i];

            switch (file.type) {
                case "image":
                    this.image(file.key, file.url, file.overwrite);
                    break;

                case "text":
                    this.text(file.key, file.url, file.overwrite);
                    break;

                case "json":
                    this.json(file.key, file.url, file.overwrite);
                    break;

                case "xml":
                    this.xml(file.key, file.url, file.overwrite);
                    break;

                case "script":
                    this.script(file.key, file.url, file.callback, pack.callbackContext || this);
                    break;

                case "binary":
                    this.binary(file.key, file.url, file.callback, pack.callbackContext || this);
                    break;

                case "spritesheet":
                    this.spritesheet(file.key, file.url, file.frameWidth, file.frameHeight, file.frameMax, file.margin, file.spacing);
                    break;

                case "video":
                    this.video(file.key, file.urls);
                    break;

                case "audio":
                    this.audio(file.key, file.urls, file.autoDecode);
                    break;

                case "audiosprite":
                    this.audiosprite(file.key, file.urls, file.jsonURL, file.jsonData, file.autoDecode);
                    break;

                case "tilemap":
                    this.tilemap(file.key, file.url, file.data, Phaser.Tilemap[file.format]);
                    break;

                case "physics":
                    this.physics(file.key, file.url, file.data, Phaser.Loader[file.format]);
                    break;

                case "bitmapFont":
                    this.bitmapFont(file.key, file.textureURL, file.atlasURL, file.atlasData, file.xSpacing, file.ySpacing);
                    break;

                case "atlasJSONArray":
                    this.atlasJSONArray(file.key, file.textureURL, file.atlasURL, file.atlasData);
                    break;

                case "atlasJSONHash":
                    this.atlasJSONHash(file.key, file.textureURL, file.atlasURL, file.atlasData);
                    break;

                case "atlasXML":
                    this.atlasXML(file.key, file.textureURL, file.atlasURL, file.atlasData);
                    break;

                case "atlas":
                    this.atlas(file.key, file.textureURL, file.atlasURL, file.atlasData, Phaser.Loader[file.format]);
                    break;

                case "shader":
                    this.shader(file.key, file.url, file.overwrite);
                    break;
            }
        }

    },

    /**
     * Transforms the asset URL.
     *
     * The default implementation prepends the baseURL if the url doesn't begin with http or //
     *
     * @method Phaser.Loader#transformUrl
     * @protected
     * @param {string} url - The url to transform.
     * @param {object} file - The file object being transformed.
     * @return {string} The transformed url. In rare cases where the url isn't specified it will return false instead.
     */
    transformUrl: function(url, file) {

        if (!url) {
            return false;
        }

        if (url.match(/^(?:blob:|data:|http:\/\/|https:\/\/|\/\/)/)) {
            return url;
        } else {
            return this.baseURL + '' + url;
            //return this.baseURL + file.path + url;
        }

    },

    /**
     * Start fetching a resource.
     *
     * All code paths, async or otherwise, from this function must return to `asyncComplete`.
     *
     * @method Phaser.Loader#loadFile
     * @private
     * @param {object} file
     */
    loadFile: function(file) {

       

        //  Image or Data?
        switch (file.type) {
            case 'packfile':
                this.xhrLoad(file, this.transformUrl(file.url, file), 'text', this.fileComplete);
                break;

            case 'image':
            case 'spritesheet':
            case 'textureatlas':
            case 'bitmapfont':
                this.loadImageTag(file);
                break;

            case 'audio':
                file.url = this.getAudioURL(file.url);

                if (file.url) {
                    //  WebAudio or Audio Tag?
                    if (this.game.sound.usingWebAudio) {
                        this.xhrLoad(file, this.transformUrl(file.url, file), 'arraybuffer', this.fileComplete);
                    } else if (this.game.sound.usingAudioTag) {
                        this.loadAudioTag(file);
                    }
                } else {
                    this.fileError(file, null, 'No supported audio URL specified or device does not have audio playback support');
                }

             

                break;

            case 'video':
                file.url = this.getVideoURL(file.url);

                if (file.url) {
                    if (file.asBlob) {
                        this.xhrLoad(file, this.transformUrl(file.url, file), 'blob', this.fileComplete);
                    } else {
                        this.loadVideoTag(file);
                    }
                } else {
                    this.fileError(file, null, 'No supported video URL specified or device does not have video playback support');
                }
                break;

            case 'json':

                this.xhrLoad(file, this.transformUrl(file.url, file), 'text', this.jsonLoadComplete);
                break;

            case 'xml':

                this.xhrLoad(file, this.transformUrl(file.url, file), 'text', this.xmlLoadComplete);
                break;

            case 'tilemap':

                if (file.format === Phaser.Tilemap.TILED_JSON) {
                    this.xhrLoad(file, this.transformUrl(file.url, file), 'text', this.jsonLoadComplete);
                } else if (file.format === Phaser.Tilemap.CSV) {
                    this.xhrLoad(file, this.transformUrl(file.url, file), 'text', this.csvLoadComplete);
                } else {
                    this.asyncComplete(file, "invalid Tilemap format: " + file.format);
                }
                break;

            case 'text':
            case 'script':
            case 'shader':
            case 'physics':
                this.xhrLoad(file, this.transformUrl(file.url, file), 'text', this.fileComplete);
                break;

            case 'binary':
                this.xhrLoad(file, this.transformUrl(file.url, file), 'arraybuffer', this.fileComplete);
                break;
        }

    },

    /**
     * Continue async loading through an Image tag.
     * @private
     */
    loadImageTag: function(file) {

        

        var _this = this;

        file.data = new Image();
        file.data.name = file.key;

        if (this.crossOrigin) {
            file.data.crossOrigin = this.crossOrigin;
        }

        file.data.onload = function() {

           

            if (file.data.onload) {
                file.data.onload = null;
                file.data.onerror = null;
                _this.fileComplete(file);
            }
        };

        file.data.onerror = function() {
            if (file.data.onload) {
                file.data.onload = null;
                file.data.onerror = null;
                _this.fileError(file);
            }
        };

        file.data.src = this.transformUrl(file.url, file);

        // Image is immediately-available/cached
        if (file.data.complete && file.data.width && file.data.height) {
            file.data.onload = null;
            file.data.onerror = null;
            this.fileComplete(file);
        }

    },

    /**
     * Continue async loading through a Video tag.
     * @private
     */
    loadVideoTag: function(file) {

        var _this = this;

        file.data = document.createElement("video");
        file.data.name = file.key;
        file.data.controls = false;
        file.data.autoplay = false;

        var videoLoadEvent = function() {

            file.data.removeEventListener(file.loadEvent, videoLoadEvent, false);
            file.data.onerror = null;
            file.data.canplay = true;
            Phaser.GAMES[_this.game.id].load.fileComplete(file);

        };

        file.data.onerror = function() {
            file.data.removeEventListener(file.loadEvent, videoLoadEvent, false);
            file.data.onerror = null;
            file.data.canplay = false;
            _this.fileError(file);
        };

        file.data.addEventListener(file.loadEvent, videoLoadEvent, false);

        file.data.src = this.transformUrl(file.url, file);
        file.data.load();

    },

    /**
     * Continue async loading through an Audio tag.
     * @private
     */
    loadAudioTag: function(file) {

        var _this = this;

        if (this.game.sound.touchLocked) {
            //  If audio is locked we can't do this yet, so need to queue this load request. Bum.
            file.data = new Audio();
            file.data.name = file.key;
            file.data.preload = 'auto';
            file.data.src = this.transformUrl(file.url, file);

            this.fileComplete(file);
        } else {
            file.data = new Audio();
            file.data.name = file.key;

            var playThroughEvent = function() {
                file.data.removeEventListener('canplaythrough', playThroughEvent, false);
                file.data.onerror = null;
                _this.fileComplete(file);
            };

            file.data.onerror = function() {
                file.data.removeEventListener('canplaythrough', playThroughEvent, false);
                file.data.onerror = null;
                _this.fileError(file);
            };

            file.data.preload = 'auto';
            file.data.src = this.transformUrl(file.url, file);
            file.data.addEventListener('canplaythrough', playThroughEvent, false);
            file.data.load();
        }

    },

    /**
     * Starts the xhr loader.
     *
     * This is designed specifically to use with asset file processing.
     *
     * @method Phaser.Loader#xhrLoad
     * @private
     * @param {object} file - The file/pack to load.
     * @param {string} url - The URL of the file.
     * @param {string} type - The xhr responseType.
     * @param {function} onload - The function to call on success. Invoked in `this` context and supplied with `(file, xhr)` arguments.
     * @param {function} [onerror=fileError]  The function to call on error. Invoked in `this` context and supplied with `(file, xhr)` arguments.
     */
    xhrLoad: function(file, url, type, onload, onerror) {

        

        if (this.useXDomainRequest && window.XDomainRequest) {
            this.xhrLoadWithXDR(file, url, type, onload, onerror);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = type;        
        if (this.headers[file.type]) {
            xhr.setRequestHeader("Accept", this.headers[file.type]);
        }

        onerror = onerror || this.fileError;

        var _this = this;

        xhr.onload = function() {

            try {
                if (xhr.readyState == 4 && xhr.status >= 400 && xhr.status <= 599) { // Handle HTTP status codes of 4xx and 5xx as errors, even if xhr.onerror was not called.
                    return onerror.call(_this, file, xhr);
                } else {
                    return onload.call(_this, file, xhr);
                }
            } catch (e) {

                //  If this was the last file in the queue and an error is thrown in the create method
                //  then it's caught here, so be sure we don't carry on processing it

                if (!_this.hasLoaded) {
                    _this.asyncComplete(file, e.message || 'Exception');
                } else {
                    if (window['console']) {
                        console.error(e);
                    }
                }
            }
        };

        xhr.onerror = function() {

            try {

                return onerror.call(_this, file, xhr);

            } catch (e) {

                if (!_this.hasLoaded) {
                    _this.asyncComplete(file, e.message || 'Exception');
                } else {
                    if (window['console']) {
                        console.error(e);
                    }
                }

            }
        };

        file.requestObject = xhr;
        file.requestUrl = url;

        xhr.send();

    },

    /**
     * Starts the xhr loader - using XDomainRequest.
     * This should _only_ be used with IE 9. Phaser does not support IE 8 and XDR is deprecated in IE 10.
     *
     * This is designed specifically to use with asset file processing.
     *
     * @method Phaser.Loader#xhrLoad
     * @private
     * @param {object} file - The file/pack to load.
     * @param {string} url - The URL of the file.
     * @param {string} type - The xhr responseType.
     * @param {function} onload - The function to call on success. Invoked in `this` context and supplied with `(file, xhr)` arguments.
     * @param {function} [onerror=fileError]  The function to call on error. Invoked in `this` context and supplied with `(file, xhr)` arguments.
     * @deprecated This is only relevant for IE 9.
     */
    xhrLoadWithXDR: function(file, url, type, onload, onerror) {

        // Special IE9 magic .. only
        if (!this._warnedAboutXDomainRequest &&
            (!this.game.device.ie || this.game.device.ieVersion >= 10)) {
            this._warnedAboutXDomainRequest = true;
            console.warn("Phaser.Loader - using XDomainRequest outside of IE 9");
        }

        // Ref: http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
        var xhr = new window.XDomainRequest();
        xhr.open('GET', url, true);
        xhr.responseType = type;

        // XDomainRequest has a few quirks. Occasionally it will abort requests
        // A way to avoid this is to make sure ALL callbacks are set even if not used
        // More info here: http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
        xhr.timeout = 3000;

        onerror = onerror || this.fileError;

        var _this = this;

        xhr.onerror = function() {
            try {
                return onerror.call(_this, file, xhr);
            } catch (e) {
                _this.asyncComplete(file, e.message || 'Exception');
            }
        };

        xhr.ontimeout = function() {
            try {
                return onerror.call(_this, file, xhr);
            } catch (e) {
                _this.asyncComplete(file, e.message || 'Exception');
            }
        };

        xhr.onprogress = function() {};

        xhr.onload = function() {
            try {
                if (xhr.readyState == 4 && xhr.status >= 400 && xhr.status <= 599) { // Handle HTTP status codes of 4xx and 5xx as errors, even if xhr.onerror was not called.
                    return onerror.call(_this, file, xhr);
                } else {
                    return onload.call(_this, file, xhr);
                }
                return onload.call(_this, file, xhr);
            } catch (e) {
                _this.asyncComplete(file, e.message || 'Exception');
            }
        };

        file.requestObject = xhr;
        file.requestUrl = url;

        //  Note: The xdr.send() call is wrapped in a timeout to prevent an issue with the interface where some requests are lost
        //  if multiple XDomainRequests are being sent at the same time.
        setTimeout(function() {
            xhr.send();
        }, 0);

    },

    /**
     * Give a bunch of URLs, return the first URL that has an extension this device thinks it can play.
     *
     * It is assumed that the device can play "blob:" or "data:" URIs - There is no mime-type checking on data URIs.
     *
     * @method Phaser.Loader#getVideoURL
     * @private
     * @param {object[]|string[]} urls - See {@link #video} for format.
     * @return {string} The URL to try and fetch; or null.
     */
    getVideoURL: function(urls) {

        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            var videoType;

            if (url.uri) // {uri: .., type: ..} pair
            {
                videoType = url.type;
                url = url.uri;

                if (this.game.device.canPlayVideo(videoType)) {
                    return url;
                }
            } else {
                // Assume direct-data URI can be played if not in a paired form; select immediately
                if (url.indexOf("blob:") === 0 || url.indexOf("data:") === 0) {
                    return url;
                }

                if (url.indexOf("?") >= 0) // Remove query from URL
                {
                    url = url.substr(0, url.indexOf("?"));
                }

                var extension = url.substr((Math.max(0, url.lastIndexOf(".")) || Infinity) + 1);

                videoType = extension.toLowerCase();

                if (this.game.device.canPlayVideo(videoType)) {
                    return urls[i];
                }
            }
        }

        return null;

    },

    /**
     * Give a bunch of URLs, return the first URL that has an extension this device thinks it can play.
     *
     * It is assumed that the device can play "blob:" or "data:" URIs - There is no mime-type checking on data URIs.
     *
     * @method Phaser.Loader#getAudioURL
     * @private
     * @param {object[]|string[]} urls - See {@link #audio} for format.
     * @return {string} The URL to try and fetch; or null.
     */
    getAudioURL: function(urls) {

        if (this.game.sound.noAudio) {
            return null;
        }

        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            var audioType;

            if (url.uri) // {uri: .., type: ..} pair
            {
                audioType = url.type;
                url = url.uri;

                if (this.game.device.canPlayAudio(audioType)) {
                    return url;
                }
            } else {
                // Assume direct-data URI can be played if not in a paired form; select immediately
                if (url.indexOf("blob:") === 0 || url.indexOf("data:") === 0) {
                    return url;
                }

                if (url.indexOf("?") >= 0) // Remove query from URL
                {
                    url = url.substr(0, url.indexOf("?"));
                }

                var extension = url.substr((Math.max(0, url.lastIndexOf(".")) || Infinity) + 1);

                audioType = extension.toLowerCase();

                if (this.game.device.canPlayAudio(audioType)) {
                    return urls[i];
                }
            }
        }

        return null;

    },

    /**
     * Error occurred when loading a file.
     *
     * @method Phaser.Loader#fileError
     * @private
     * @param {object} file
     * @param {?XMLHttpRequest} xhr - XHR request, unspecified if loaded via other means (eg. tags)
     * @param {string} reason
     */
    fileError: function(file, xhr, reason) {

        var url = file.requestUrl || this.transformUrl(file.url, file);
        var message = 'error loading asset from URL ' + url;

        if (!reason && xhr) {
            reason = xhr.status;
        }

        if (reason) {
            message = message + ' (' + reason + ')';
        }

        this.asyncComplete(file, message);

    },

    /**
     * Called when a file/resources had been downloaded and needs to be processed further.
     *
     * @method Phaser.Loader#fileComplete
     * @private
     * @param {object} file - File loaded
     * @param {?XMLHttpRequest} xhr - XHR request, unspecified if loaded via other means (eg. tags)
     */
    fileComplete: function(file, xhr) {

        var loadNext = true;



        switch (file.type) {
            case 'packfile':

                // Pack data must never be false-ish after it is fetched without error
                var data = JSON.parse(xhr.responseText);
                file.data = data || {};
                break;

            case 'image':

                this.cache.addImage(file.key, file.url, file.data);
                break;

            case 'spritesheet':

                this.cache.addSpriteSheet(file.key, file.url, file.data, file.frameWidth, file.frameHeight, file.frameMax, file.margin, file.spacing);
                break;

            case 'textureatlas':

                if (file.atlasURL == null) {
                    this.cache.addTextureAtlas(file.key, file.url, file.data, file.atlasData, file.format);
                } else {
                    //  Load the JSON or XML before carrying on with the next file
                    loadNext = false;

                    if (file.format == Phaser.Loader.TEXTURE_ATLAS_JSON_ARRAY || file.format == Phaser.Loader.TEXTURE_ATLAS_JSON_HASH || file.format == Phaser.Loader.TEXTURE_ATLAS_JSON_PYXEL) {
                        this.xhrLoad(file, this.transformUrl(file.atlasURL, file), 'text', this.jsonLoadComplete);
                    } else if (file.format == Phaser.Loader.TEXTURE_ATLAS_XML_STARLING) {
                        this.xhrLoad(file, this.transformUrl(file.atlasURL, file), 'text', this.xmlLoadComplete);
                    } else {
                        throw new Error("Phaser.Loader. Invalid Texture Atlas format: " + file.format);
                    }
                }
                break;

            case 'bitmapfont':

                if (!file.atlasURL) {
                    this.cache.addBitmapFont(file.key, file.url, file.data, file.atlasData, file.atlasType, file.xSpacing, file.ySpacing);
                } else {
                    //  Load the XML before carrying on with the next file
                    loadNext = false;
                    this.xhrLoad(file, this.transformUrl(file.atlasURL, file), 'text', function(file, xhr) {
                        var json;

                        try {
                            // Try to parse as JSON, if it fails, then it's hopefully XML
                            json = JSON.parse(xhr.responseText);
                        } catch (e) {}

                        if ( !! json) {
                            file.atlasType = 'json';
                            this.jsonLoadComplete(file, xhr);
                        } else {
                            file.atlasType = 'xml';
                            this.xmlLoadComplete(file, xhr);
                        }
                    });
                }
                break;

            case 'video':

                if (file.asBlob) {
                    try {
                        file.data = xhr.response;
                    } catch (e) {
                        throw new Error("Phaser.Loader. Unable to parse video file as Blob: " + file.key);
                    }
                }

                this.cache.addVideo(file.key, file.url, file.data, file.asBlob);
                break;

            case 'audio':

                if (this.game.sound.usingWebAudio) {
                    file.data = xhr.response;

                    this.cache.addSound(file.key, file.url, file.data, true, false);

                    if (file.autoDecode) {
                        this.game.sound.decode(file.key);
                    }
                } else {
                    this.cache.addSound(file.key, file.url, file.data, false, true);
                }
                break;

            case 'text':
                file.data = xhr.responseText;
                this.cache.addText(file.key, file.url, file.data);
                break;

            case 'shader':
                file.data = xhr.responseText;
                this.cache.addShader(file.key, file.url, file.data);
                break;

            case 'physics':
                var data = JSON.parse(xhr.responseText);
                this.cache.addPhysicsData(file.key, file.url, data, file.format);
                break;

            case 'script':
                file.data = document.createElement('script');
                file.data.language = 'javascript';
                file.data.type = 'text/javascript';
                file.data.defer = false;
                file.data.text = xhr.responseText;
                document.head.appendChild(file.data);
                if (file.callback) {
                    file.data = file.callback.call(file.callbackContext, file.key, xhr.responseText);
                }
                break;

            case 'binary':
                if (file.callback) {
                    file.data = file.callback.call(file.callbackContext, file.key, xhr.response);
                } else {
                    file.data = xhr.response;
                }

                this.cache.addBinary(file.key, file.data);

                break;
        }

        this.onFileComplete.dispatch(0, file.key, !file.error); 

    },

    /**
     * Successfully loaded a JSON file - only used for certain types.
     *
     * @method Phaser.Loader#jsonLoadComplete
     * @private
     * @param {object} file - File associated with this request
     * @param {XMLHttpRequest} xhr
     */
    jsonLoadComplete: function(file, xhr) {

        var data = JSON.parse(xhr.responseText);

        if (file.type === 'tilemap') {
            this.cache.addTilemap(file.key, file.url, data, file.format);
        } else if (file.type === 'bitmapfont') {
            this.cache.addBitmapFont(file.key, file.url, file.data, data, file.atlasType, file.xSpacing, file.ySpacing);
        } else if (file.type === 'json') {
            this.cache.addJSON(file.key, file.url, data);
        } else {
            this.cache.addTextureAtlas(file.key, file.url, file.data, data, file.format);
        }

        this.asyncComplete(file);
    },

    /**
     * Successfully loaded a CSV file - only used for certain types.
     *
     * @method Phaser.Loader#csvLoadComplete
     * @private
     * @param {object} file - File associated with this request
     * @param {XMLHttpRequest} xhr
     */
    csvLoadComplete: function(file, xhr) {

        var data = xhr.responseText;

        this.cache.addTilemap(file.key, file.url, data, file.format);

        this.asyncComplete(file);

    },

    /**
     * Successfully loaded an XML file - only used for certain types.
     *
     * @method Phaser.Loader#xmlLoadComplete
     * @private
     * @param {object} file - File associated with this request
     * @param {XMLHttpRequest} xhr
     */
    xmlLoadComplete: function(file, xhr) {

        // Always try parsing the content as XML, regardless of actually response type
        var data = xhr.responseText;
        var xml = this.parseXml(data);

        if (!xml) {
            var responseType = xhr.responseType || xhr.contentType; // contentType for MS-XDomainRequest
            console.warn('Phaser.Loader - ' + file.key + ': invalid XML (' + responseType + ')');
            this.asyncComplete(file, "invalid XML");
            return;
        }

        if (file.type === 'bitmapfont') {
            this.cache.addBitmapFont(file.key, file.url, file.data, xml, file.atlasType, file.xSpacing, file.ySpacing);
        } else if (file.type === 'textureatlas') {
            this.cache.addTextureAtlas(file.key, file.url, file.data, xml, file.format);
        } else if (file.type === 'xml') {
            this.cache.addXML(file.key, file.url, xml);
        }

        this.asyncComplete(file);

    },

    /**
     * Parses string data as XML.
     *
     * @method Phaser.Loader#parseXml
     * @private
     * @param {string} data - The XML text to parse
     * @return {?XMLDocument} Returns the xml document, or null if such could not parsed to a valid document.
     */
    parseXml: function(data) {

        var xml;

        try {
            if (window['DOMParser']) {
                var domparser = new DOMParser();
                xml = domparser.parseFromString(data, "text/xml");
            } else {
                xml = new ActiveXObject("Microsoft.XMLDOM");
                // Why is this 'false'?
                xml.async = 'false';
                xml.loadXML(data);
            }
        } catch (e) {
            xml = null;
        }

        if (!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length) {
            return null;
        } else {
            return xml;
        }

    },

    /**
     * Update the loading sprite progress.
     *
     * @method Phaser.Loader#nextFile
     * @private
     * @param {object} previousFile
     * @param {boolean} success - Whether the previous asset loaded successfully or not.
     */
    updateProgress: function() {

        if (this.preloadSprite) {
            if (this.preloadSprite.direction === 0) {
                this.preloadSprite.rect.width = Math.floor((this.preloadSprite.width / 100) * this.progress);
            } else {
                this.preloadSprite.rect.height = Math.floor((this.preloadSprite.height / 100) * this.progress);
            }

            if (this.preloadSprite.sprite) {
                this.preloadSprite.sprite.updateCrop();
            } else {
                //  We seem to have lost our sprite - maybe it was destroyed?
                this.preloadSprite = null;
            }
        }

    },

    /**
     * Returns the number of files that have already been loaded, even if they errored.
     *
     * @method Phaser.Loader#totalLoadedFiles
     * @protected
     * @return {number} The number of files that have already been loaded (even if they errored)
     */
    totalLoadedFiles: function() {

        return this._loadedFileCount;

    },

    /**
     * Returns the number of files still waiting to be processed in the load queue. This value decreases as each file in the queue is loaded.
     *
     * @method Phaser.Loader#totalQueuedFiles
     * @protected
     * @return {number} The number of files that still remain in the load queue.
     */
    totalQueuedFiles: function() {

        return this._totalFileCount - this._loadedFileCount;

    },

    /**
     * Returns the number of asset packs that have already been loaded, even if they errored.
     *
     * @method Phaser.Loader#totalLoadedPacks
     * @protected
     * @return {number} The number of asset packs that have already been loaded (even if they errored)
     */
    totalLoadedPacks: function() {

        return this._totalPackCount;

    },

    /**
     * Returns the number of asset packs still waiting to be processed in the load queue. This value decreases as each pack in the queue is loaded.
     *
     * @method Phaser.Loader#totalQueuedPacks
     * @protected
     * @return {number} The number of asset packs that still remain in the load queue.
     */
    totalQueuedPacks: function() {



        return this._totalPackCount - this._loadedPackCount;

    }

};

/**
 * The non-rounded load progress value (from 0.0 to 100.0).
 *
 * A general indicator of the progress.
 * It is possible for the progress to decrease, after `onLoadStart`, if more files are dynamically added.
 *
 * @name Phaser.Loader#progressFloat
 * @property {number}
 */
Object.defineProperty(G.ExtLoader.prototype, "progressFloat", {

    get: function() {
        var progress = (this._loadedFileCount / this._totalFileCount) * 100;
        return Phaser.Math.clamp(progress || 0, 0, 100);
    }

});

/**
 * The rounded load progress percentage value (from 0 to 100). See {@link Phaser.Loader#progressFloat}.
 *
 * @name Phaser.Loader#progress
 * @property {integer}
 */
Object.defineProperty(G.ExtLoader.prototype, "progress", {

    get: function() {
        return Math.round(this.progressFloat);
    }

});
G.AnimationGroup = function(x,y,data){

	Phaser.Group.call(this,game);
	

};

G.AnimationGroup.prototype = Object.create(Phaser.Group.prototype);
if (typeof G == 'undefined') G = {};


G.Button = function(x,y,sprite,callback,context) {

	Phaser.Button.call(this, game,G.l(x),G.l(y),null);
	
	this.state = game.state.getCurrentState();

	G.changeTexture(this,sprite);
	this.anchor.setTo(0.5);

	this.sfx = G.sfx.pop;  

	this.active = true;

	this.onClick = new Phaser.Signal(); 
	if (callback) {
		this.onClick.add(callback,context || this);
	} 

	this.onInputDown.add(this.click,this);

	this.terms = [];

	this.IMMEDIATE = false;


	this.pulsing = false;

	this.tweenScale = false;


}

G.Button.prototype = Object.create(Phaser.Button.prototype);
G.Button.constructor = G.Button;


G.Button.prototype.pulse = function(maxScale) {
	this.pulsing = true;
	this.pulsingTween = game.add.tween(this.scale).to({x: maxScale || 1.1, y: maxScale || 1.1},500,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
};

G.Button.prototype.stopPulse = function(maxScale) {
	if (this.pulsingTween) this.pulsingTween.stop();
	this.scale.setTo(maxScale || 1);
	this.pulsing = false;
};


G.Button.prototype.click = function() {
	if (!this.active) return;

	for (var i = 0; i < this.terms.length; i++) {
		if (!this.terms[i][0].call(this.terms[i][1])) {
			return;
		}
	}

	this.active = false;
	this.onClick.dispatch();

	this.sfx.play();

	var orgScaleX = this.scale.x;
	var orgScaleY = this.scale.y;

	if (this.IMMEDIATE) {
		this.active = true;
	}else {

		if (this.pulsing) {

			game.time.events.add(400,function(){this.active = true},this);

		}else {

			game.add.tween(this.scale).to({
				x: this.tweenScale ? this.tweenScale.x : orgScaleX+(Math.sign(orgScaleX)*0.2),
				y: this.tweenScale ? this.tweenScale.y : orgScaleY+(Math.sign(orgScaleY)*0.2)
			},200,Phaser.Easing.Quadratic.Out,true).onComplete.add(function() {
				game.add.tween(this.scale).to({x: orgScaleX, y: orgScaleY},200,Phaser.Easing.Quadratic.Out,true).onComplete.add(function() {
					this.active = true;
				},this)
			},this)

		}

	}

}

G.Button.prototype.addTerm = function(callback,context) {
	this.terms.push([callback,context]);
}

G.Button.prototype.addImageLabel = function(image) {
	this.label = game.make.image(0,0,'ssheet',image);
	this.label.anchor.setTo(0.5);
	this.addChild(this.label);
};

G.Button.prototype.addTextLabel = function(font,text,size,x,y,maxWidth) {
	var multi = 1/G.Loader.currentConfigMulti;

	x = (typeof x == 'undefined' ? -7 : x);
	y = (typeof y == 'undefined' ? -6 : y);
	maxWidth = (typeof maxWidth == 'undefined' ? this.width*multi*0.7 : maxWidth);

	this.label = new G.OneLineText(x,y,font,text,size || Math.floor(this.height*multi*0.7),maxWidth,0.5,0.5);
	this.addChild(this.label);
};

G.Button.prototype.addTextLabelMultiline = function(font,text) {
	var multi = 1/G.Loader.currentConfigMulti;
	this.label = new G.MultiLineText(0,0,font,text,Math.floor(this.height*multi*0.5),this.width*multi*0.7,this.height*multi*0.7,'center',0.5,0.5);
	this.addChild(this.label); 
};
if (typeof G == 'undefined') G = {};



G.FrameAnimation = function(x,y,frames,timer,loop) {

	Phaser.Image.call(this,game,G.l(x),G.l(y));

	this.animFrames = frames;
	this.animFramesLen = this.animFrames.length;

	this.timer = timer;
	this.loop = loop;

	G.changeTexture(this,this.animFrames[0]);

	this.currentTimer = 1;
	this.currentIndex = 0;

	this.active = true;
	

};

G.FrameAnimation.prototype = Object.create(Phaser.Image.prototype);

G.FrameAnimation.prototype.update = function() {

	if (this.active && (this.currentTimer+=G.deltaTime) >= this.timer) {

		this.currentTimer = this.currentTimer-this.timer;
		this.currentIndex++;

		if (this.currentIndex == this.animFramesLen) {

			if (this.loop == 0) {
				return this.active = false;
			}

			if (this.loop > 0) this.loop--;

			this.currentIndex = 0;

		}

		G.changeTexture(this,this.animFrames[this.currentIndex]);

	}

};
G.gift = {};

G.gift.getGift = function(giftsGroup) {

	var giftsGroup = giftsGroup || 'normals';

	var giftsObj = G.json.settings.gifts[giftsGroup];

	var boosterMaxNr = giftsObj.boosterMaxNr || G.json.settings.gifts.boosterMaxNr;
	var boosterChance = giftsObj.boosterChance || G.json.settings.gifts.boosterChance;

	var possibleGifts = [];

	
	
	giftsObj.list.forEach(function(e) {
		if (e[0] == 'coin') {
			possibleGifts.push(e);
		}else {

			if (e[0].indexOf('booster') !== -1 
			&& G.saveState.isBoosterUnlocked(parseInt(e[0][8])) 
			&& G.saveState.getBoosterAmount(parseInt(e[0][8])) < boosterMaxNr) {
				possibleGifts.push(e);
			}

		}
	});

	Phaser.ArrayUtils.shuffle(possibleGifts);

	var booster = Math.random() < boosterChance;

	for (var i = 0; i < possibleGifts.length; i++) {
		var gift = possibleGifts[i];
		if (gift[0].indexOf('booster') !== -1) {
			if (booster) {
				return gift.slice();
			}
		}else {
			return gift.slice();
		}
	}

	// fallback

	return ['coin',50];

};

G.gift.getLabelString = function(giftData,imgScale) {

	var middleStr = giftData[0] === 'coin' ? '' : 'x';

	var imgScale = imgScale ? '*'+imgScale+'*' : '';

	return giftData[1] + middleStr + '@'+imgScale+G.json.settings.gifts.icons[giftData[0]] + '@';

};

G.gift.applyGift = function(giftData) {

	if (giftData[0] == 'coin') {
		G.saveState.changeCoins(giftData[1]);
	}else {
		G.saveState.changeBoosterAmount(parseInt(giftData[0][8]),giftData[1]);
	}

};

G.gift.getIcon = function(giftData) {

	return G.json.settings.gifts.icons[giftData[0]];

};

G.gift.processRandomBoosters = function(gift) {

	if (gift[0] === 'coin' && gift[0][8] !== 'R') return gift; 

	var availableBoosters = [1,2,3,4,5,6,7,8].filter(function(nr){
		return G.saveState.isBoosterUnlocked(nr);
	})

	if (availableBoosters.length > 0) {
		gift[0] = 'booster#'+game.rnd.pick(availableBoosters);
	}else {
		gift[0]= 'coin';
		gift[1] = gift[1]*G.json.settings.gifts.fallbackCoins; 
	}

	return gift;
};


G.gift.getLabelPackString = function(gifts){
	var giftsStr = '';
	gifts.forEach(function(gift) {
		giftsStr += G.gift.getLabelString(gift,2) + '   ';
	});
	return giftsStr;
};

G.gift.applyGiftPack = function(gifts,sourceCoin,sourceBooster){
	gifts.forEach(function(gift){
		if (gift[0] === 'coin') {
			G.ga.event('Source:Coins:'+sourceCoin,gift[1]);
		}else {
			G.ga.event('Source:booster'+G.saveState.nrToBoosterName(gift[0][8])+':'+sourceBooster,gift[1]);
		}
		G.gift.applyGift(gift);
	});

};
if (typeof G == 'undefined') G = {};

G.GridArray = function(width,height,value,dbg) {

	if (typeof width == 'number') {

		this.createGrid.apply(this,arguments);
		
	} else if (typeof width == "string")  {

		console.log('GridArray string');

		this.data = JSON.parse(arguments[0]);
		this.width = this.data.length;
		this.height = this.data[0].length;

	} else if (Array.isArray(width)) {
		a = arguments[0];
		this.data = arguments[0];
		this.width = this.data.length; 
		this.height = this.data[0].length;

	}

};

G.GridArray.prototype = {

	createGrid: function(width,height,value) {

		this.data = []; 
		this.width = width;
		this.height = height;

		for (var collumn = 0; collumn < width; collumn++) {
			this.data[collumn] = [];
			for (var row = 0; row < height; row++) {
				this.data[collumn][row] = value || null;
			}
		}

	},

	set: function(x,y,val) {
		if (this.isInGrid(x,y)) {
			return this.data[x][y] = val;
		}else {
			if (this.dbg) console.log("setValue OUT OF RANGE");
			return false;
		}
	},

	get: function(x,y) {
		if (this.isInGrid(x,y)) {
			return this.data[x][y];
		}else {
			if (this.dbg) console.log("getValue OUT OF RANGE");
			return false;
		}
	},

	swapValues: function(x1,y1,x2,y2) {

		if (this.isInGrid(x1,y1) && this.isInGrid(x2,y2)) {
			var tmp = this.data[x1][y1];
			this.data[x1][y1] = this.data[x2][y2];
			this.data[x2][y2] = tmp;
		}else {
			if (this.dbg) console.log("swapValues OUT OF RANGE");
			return false;
		}
		
	},

	isInGrid: function(x,y) {
		return !(x < 0 || x >= this.width || y < 0 || y >= this.height);
	},

	loop: function(func,context) {

		for (var coll = 0; coll < this.width; coll++) {
			for (var row = 0; row < this.height; row++) {
				func.call(context,this.data[coll][row],coll,row,this.data);
			}
		}
	},

	clear: function(value) {
		this.loop(function(elem,x,y,array) {
			array[x][y] = value || false;
		});
	},

	findPattern: function(positions,mark) {

		var result = false;
		var len = positions.length;

		this.loop(function(elem,x,y,array) {
			if (elem == mark && !result) {

				for (var i = 0; i < len; i+=2) {
					//console.log('pos: '+(x+positions[i])+'x'+(y+positions[i+1])+' val: ' + this.get(x+positions[i],y+positions[i+1]));
					if (!this.get(x+positions[i],y+positions[i+1])) return;
					if (this.get(x+positions[i],y+positions[i+1]) !== mark) return;
				}

				//console.log("PASSED FIRST LOOP "+x+'x'+y);
				result = [];
				for (var j = 0; j < len; j+=2) {
					result.push(x+positions[j],y+positions[j+1]);
				}
				//console.log('got patt: ');
				//console.log(x+'x'+y);
				//console.log(result);


			}
		},this);

		return result;

	},


};
G.Image = function(x,y,frame,anchor,groupToAdd) {

  Phaser.Image.call(this,game,G.l(x),G.l(y),null);

  //overwrite angle component, so angle is not wrapped anymore
  Object.defineProperty(this, 'angle', {
    get: function() {
        return Phaser.Math.radToDeg(this.rotation);
    },
    set: function(value) {
        this.rotation = Phaser.Math.degToRad(value);
    }
  });
  
  this.angle = 0;

  this.state = game.state.getCurrentState();

  this.changeTexture(frame);

  if (anchor) {
    if (typeof anchor == 'number') { 
        this.anchor.setTo(anchor);
    }else {
        this.anchor.setTo(anchor[0],anchor[1]);
    }
  }

  if (groupToAdd) { 
    (groupToAdd.add || groupToAdd.addChild).call(groupToAdd,this);
  }else if (groupToAdd !== null) {
    game.world.add(this);
  }

  

  
  //game.add.existing(this)
};

G.Image.prototype = Object.create(Phaser.Image.prototype);

G.Image.prototype.stopTweens = function() {
  G.stopTweens(this);
};

G.Image.prototype.changeTexture = function(image) {
  G.changeTexture(this,image);
};

G.Image.prototype.add = function(obj) {
  return this.addChild(obj)
};
//
// $ - text from json
// @ - img
// % - variable
// ^ - text as it is
//


G.LabelParser = {
	
	specialChars: ['$','@','%','^'],
	
	changeIntoTagArray: function(str,propObj) {

		var result = [];

		var i = 0;

		while (str.length > 0) {

			if (i++ > 20) break;

			var firstTag = this.findFirstSpecialChar(str);


			if (firstTag === -1) {
				result.push(str);
				break;
			}else {

				if (firstTag[0] > 0) {
					result.push(str.slice(0,firstTag[0]))
					str = str.slice(firstTag[0]);	
				}
				str = this.cutOffTag(str,result,firstTag[1]); 

			}

		} 

		// 
		// change strings into objects
		//

		var processedResult = [];
		for (var i = 0; i < result.length; i++) {
			processedResult.push(this.processTag(result[i],propObj));
		}

		// 
		// merge texts obj
		// 
		//

		return this.mergeTextTagsInArray(processedResult);;
	},


	mergeTextTagsInArray: function(tagArray) {

		var mergedArray = [];

		var startIndex = null;
		var endIndex = null;

		for (var i = 0; i < tagArray.length; i++) {

			if (tagArray[i].type !== 'text') {

				if (startIndex !== null) {
					mergedArray.push(this.mergeTextTags(tagArray,startIndex,i));
					startIndex = null;
				}

				mergedArray.push(tagArray[i]);				

			}else {
				if (startIndex == null) {
					startIndex = i;
				}
			}
		}


		if (startIndex !== null) {
			mergedArray.push(this.mergeTextTags(tagArray,startIndex,i))
		}

		return mergedArray;

	},

	mergeTextTags: function(array,startIndex,endIndex) {

		var newObj = {type:'text',content:[]};

		for ( ; startIndex < endIndex; startIndex++) {
			newObj.content.push(array[startIndex].content);
		}

		newObj.content = newObj.content.join(' ');

		return newObj;

	},

	processTag: function(elem,propObj) {

		if (elem[0] == '@') {

			var scale = 1;

			if (elem[1] == '*' && elem.indexOf('*',2)) {
				scale = parseFloat(elem.slice(elem.indexOf('*')+1,elem.indexOf('*',2)));
				elem = elem.slice(elem.indexOf('*',2));
			}

			return {
				type: 'img',
				content: elem.slice(1,-1),
				scale: scale
			}
		}else if (elem[0] == '%') {
			return {
				type: 'text',
				content: propObj[elem.slice(1,-1)]
			}
		}else if (elem[0] == '$') {
			
			return {
				type: 'text',
				content: G.txt(parseInt(elem.slice(1,-1)))
			}
		}else if (elem[0] == '^') {
			return {
				type: 'text',
				content: elem.slice(1,-1)
			}
		}else {

			if (this.isStringJustSpaces(elem)) {
				return {
					type: 'separator',
					content: elem,
					length: elem.length
				}
			}else {
				return {
					type: 'text',
					content: elem 
				}
			}

		}


	},

	isStringJustSpaces: function(elem) {
		for (var i = 0; i < elem.length; i++) {
			if (elem[i] !== ' ') return false;
		}
		return true;
	},

	cutOffTag: function(str,result,tag) {

		var startIndex = str.indexOf(tag);
		var endIndex = str.indexOf(tag,startIndex+1);

		result.push(str.slice(startIndex,endIndex+1));

		return str.slice(0,startIndex) + str.slice(endIndex+1);

	},

	findFirstSpecialChar: function(str) {

			var smallest = Infinity;
			var foundedChar = false;

			this.specialChars.forEach(function(char) {
				var index = str.indexOf(char)
			
				if (index > -1 && smallest > index) {
					foundedChar = char;
					smallest = Math.min(index,smallest);
				}
			});

			if (smallest === Infinity) return -1;

			return [smallest, foundedChar];

	},


	createLabel: function(string,propObj,x,y,font,fontSize,anchorX,anchorY,distanceBetween,maxWidth) {

		var tagArray = this.changeIntoTagArray(string,propObj);

		var group = new G.LabelGroup(x,y,fontSize,distanceBetween,anchorX,anchorY,maxWidth);

		return group;

	}

} 


G.LabelGroup = function(str,x,y,font,fontSize,anchorX,anchorY,maxWidth) {

	Phaser.Group.call(this,game);


	this.fontData = game.cache.getBitmapFont(font).font;
	this.fontBaseSize = this.fontData.size;
	this.fontSpaceOffset = this.fontData.chars['32'].xOffset + this.fontData.chars['32'].xAdvance;

	this.str = str;
	this.tagArray = G.LabelParser.changeIntoTagArray(str);


	this.x = (typeof x === 'undefined' ? 0 : G.l(x));
	this.y = (typeof y === 'undefined' ? 0 : G.l(y));
	this.font = font;
	this.fontSize = (typeof fontSize === 'undefined' ? G.l(30) : G.l(fontSize));
	//this.distanceBetween = (typeof distanceBetween === 'undefined' ? G.l(10) : G.l(distanceBetween));
	this.distanceBetween = 0;

	this.anchorX = (typeof anchorX === 'undefined' ? 0.5 : anchorX);
	this.anchorY = (typeof anchorY === 'undefined' ? 0.5 : anchorY);

	this.maxWidth = maxWidth || 0;

	this.processTagArray();

};

G.LabelGroup.prototype = Object.create(Phaser.Group.prototype);

G.LabelGroup.prototype.processTagArray = function() {

	for (var i = 0; i < this.tagArray.length; i++) {
		if (this.tagArray[i].type == 'img') {
			var img = G.makeImage(0,0,this.tagArray[i].content,0,this);
			img.tagScale = this.tagArray[i].scale;
		}else if(this.tagArray[i].type == 'separator') {
			var img = G.makeImage(0,0,null,0,this);
			img.SEPARATOR = true;
			img.SEP_LENGTH = this.tagArray[i].length;
		}else {
			this.add(game.add.bitmapText(0,0,this.font,this.tagArray[i].content,this.fontSize))
		}
	}


	this.refresh();

};

G.LabelGroup.prototype.refresh = function() {

	this.applySizeAndAnchor();

	if (this.maxWidth > 0 && this.getWholeWidth() > this.maxWidth) {
		while(this.getWholeWidth() > this.maxWidth) {
			this.distanceBetween *= 0.9;
			this.fontSize *= 0.9;
			this.applySizeAndAnchor();
		}
	}
	
	this.spreadElements();

};

G.LabelGroup.prototype.applySizeAndAnchor = function() {

	this.children.forEach(function(e) {
		e.anchor.setTo(this.anchorX,this.anchorY);

		if (e.fontSize) {
			e.fontSize = this.fontSize;
			e.updateText();
		}else {
			e.height = this.fontSize*(e.tagScale || 1);
			e.scale.x = e.scale.y;
		}

		

		if (e.SEPARATOR) {
			e.width = (this.fontSize/this.fontBaseSize*this.fontSpaceOffset)*e.SEP_LENGTH;
		}
		
	},this);

};

G.LabelGroup.prototype.getWholeWidth = function() {

	var allDistanceBetween = (this.children.length-1) * this.distanceBetween;
	var widthOfAllElements = 0;
	this.children.forEach(function(e) {
		widthOfAllElements += e.width;
	});

	return allDistanceBetween + widthOfAllElements;
};

G.LabelGroup.prototype.spreadElements = function() {

	var startX = this.getWholeWidth()*this.anchorX*-1

	this.children.forEach(function(e,index,array) {
		e.left = (index== 0 ? startX : array[index-1].right+this.distanceBetween);
	},this);

};
if (typeof G == 'undefined') G = {};

G.Loader = {

	currentConfig : 'hd',
	currentConfigMulti : 1,
	loadingScreenActive: false, 

	passConfigs: function(conf) {
		this.configs = conf;
	},

	setConfig: function(chosen) {
		this.currentConfig = chosen;
		this.currentConfigMulti = this.configs[chosen];
	},

	loadLists: function() {

		console.log("load list");

		game.load.json('assetsLists',resourcePrefix+'assets/assets.json');
	},


	makeLoadingScreen: function() {

		if (this.loadingScreenActive) return;

		this.loadingScreenActive = true;

		G.whiteOverlay = game.add.graphics();
		G.whiteOverlay.fixedToCamera = true;
		G.whiteOverlay.beginFill(0xffffff,1);
		G.whiteOverlay.drawRect(0,0,game.width,game.height);

		G.imgRotate = G.makeImage(320,400,'candy_1',0.5);
		G.imgRotate.fadeOut = false;
		G.imgRotate.alpha = 0;
		G.imgRotate.update = function() {
			this.angle += 2;
			if (this.fadeOut) {
				this.alpha -= 0.05;
				this.bringToTop();
				if (this.alpha <= 0) {
					this.destroy();
				}
			}else {
				this.alpha += 0.05;
			}
			this.alpha = game.math.clamp(this.alpha,0,1);
		};


		game.load.onLoadComplete.addOnce(this.killLoadingScreen,this);

	},

	killLoadingScreen: function() {

		if (G.imgRotate) {
			G.whiteOverlay.destroy();
			G.imgRotate.fadeOut = true;
			G.imgRotate = false;
			this.loadingScreenActive = false;
		}

	},

	loadPOSTImage: function(name) {

		if (typeof name === 'undefined') return;

		if (!game.cache.checkImageKey(name)) {
			this.makeLoadingScreen();
			game.load.image(name,resourcePrefix+'assets/'+this.currentConfig+'/imagesPOST/'+name);
		}

	},

	loadAssets: function() {

		console.log("load assets");

		game.load.onLoadComplete.addOnce(this.processAssets,this);

		this.listsObj = game.cache.getJSON('assetsLists');
    	this.loadSFX(this.listsObj.sfx);
    	this.loadImages(this.listsObj.images);
    	this.loadSpritesheets(this.listsObj.spritesheets);
    	this.loadJson(this.listsObj.json);
    	this.loadFonts(this.listsObj.fonts);

	},

	processAssets: function() {
		this.processJson(this.listsObj.json);
		this.processSFX(this.listsObj.sfx);

	},

	loadSFX: function(list) {
		list.forEach(function(elem) {
			game.load.audio(elem,resourcePrefix+'assets/sfx/'+elem+'.mp3');
		});
	},

	loadFonts: function(list) {
		list.forEach(function(elem,i) {
			if (i % 2 == 0) return;
			game.load.bitmapFont(elem,resourcePrefix+'assets/'+this.currentConfig+'/fonts/'+elem+'.png',resourcePrefix+'assets/'+this.currentConfig+'/fonts/'+elem+'.fnt');
		},this);
	},

	loadImages: function(list) {
		list.forEach(function(elem,index,array) {
			game.load.image(elem.slice(0,elem.length-4),imagePrefix+'assets/'+this.currentConfig+'/images/'+elem);
			array[index] = elem.slice(0,elem.length-4);
		},this);
	},

	loadJson: function(list) {
		list.forEach(function(elem) {
			game.load.json(elem, resourcePrefix+'assets/json/'+elem+'.json');
		});
	},

	loadSpritesheets: function(list) {

		G.spritesheetList = list;

		list.forEach(function(elem) {
			game.load.atlasJSONHash(elem,imagePrefix+'assets/'+this.currentConfig+'/spritesheets/'+elem+'.png',resourcePrefix+'assets/'+this.currentConfig+'/spritesheets/'+elem+'.json');
		},this);
	},

	processJson: function(list) {
		G.json = {};
		list.forEach(function(elem) {
			G.json[elem] = game.cache.getJSON(elem);
		}); 
	},

	processSFX: function(list) {
		G.sfx = {};
		game.sfx = G.sfx;
		list.forEach(function(elem) {
			G.sfx[elem] = game.add.audio(elem);
		}); 
	},

};
G.Modify = function() {

	//in case that G.Modify was invoked without new
	if (this === G){
		return new G.Modify();
	}

	Phaser.Group.call(this,game);

	G.Modify.instance = this;

	this.onLevelObjChange = new Phaser.Signal();
	this.onCurrentObjChange = new Phaser.Signal();
	this.onObjDestroy = new Phaser.Signal();

	this.inputBlocker = new G.ModifyInputBlocked();
	this.add(this.inputBlocker);

	game.stage.disableVisibilityChange = true;
	game.paused = false;

	obj = game.state.getCurrentState();

	if (obj === game.state.getCurrentState()) {
		game.state.getCurrentState().children = game.world.children;
	}

	this.objectName = 'WORLD';

	this.currentLevel = [];

	this.currentChildIndex = 0;
	this.currentPropIndex = 0;
	this.mods = [];

	this.gfx = game.add.graphics();
	this.gfx.fixedToCamera = true;
	this.add(this.gfx);
	this.obj = obj;


	this.propGroup = this.add(new G.ModifyPropGroup(this));
	this.childrenPropNames = this.getChildrenPropNames();

	
	this.buttonGroup = new G.ModifyButtonGroup();
	this.add(this.buttonGroup);

	this.childList = new G.ModifyChildList();
	this.add(this.childList);


	this.addKeyboardControlls();

	this.bottomBar = this.add(new G.ModifyBottomBar());

	this.frameSelector = this.add(new G.ModifyFrameSelector());

	this.frameSelector.onFrameClicked.add(this.changeFrame,this);

	this.animationEditor = new G.ModifyAnimationEditor(this);
	this.add(this.animationEditor);

	this.removeCash = {};


	this.codeGenerator = new G.ModifyCodeGenerator(this);

	this.defaultNewObjectsNames = true;
	this.hideGroupTxt = false;


	if (!game.state.states.MODIFYEMPTYSTATE){
		game.state.add('MODIFYEMPTYSTATE',{
			create: function(){
				new G.Modify();
			}
		});
	};

	this.domLayer = new G.ModifyDOMLayer(this);

	game.input.onDown.add(this.processClick,this);
	
};

G.Modify.prototype = Object.create(Phaser.Group.prototype);

G.Modify.prototype.removeCashObjToString = function(levelObjTxt) {

	if (!this.removeCash[levelObjTxt]) return '';
	
	var str = '\tREMOVED:'
	for (var i = 0; i < this.removeCash[levelObjTxt].length; i++) {
		str += '\t\t'+this.removeCash[levelObjTxt][i]+'\n'
	}
	return str;

};

G.Modify.prototype.removeObject = function() {

	console.log('removeObject');

	var obj = this.getCurrentObject();
	console.log(obj);
	if (!obj) return;

	var lvlObjName = this.currentLevel.join('/') || (this.currentLevel[0] || game.state.current);
	var objName = this.childrenPropNames[this.currentChildIndex].toString();

	//check if object was at start of Modify
	//if not it means that it was created and removed after init
	//so there is no point of keeping record of that object

	if (!obj.___NEWOBJECT) {

	}
	if (!this.removeCash[lvlObjName]) this.removeCash[lvlObjName] = [];
	this.removeCash[lvlObjName].push(objName);
	
	obj.destroy();
	this.refreshLevel();

};

G.Modify.prototype.refreshLevel = function() {

	this.currentLevel = this.currentLevel;
	this.childrenPropNames = this.getChildrenPropNames();
	this.onLevelObjChange.dispatch();
	//this.currentChildIndex = 0;
	//this.makeTexts();
};

G.Modify.prototype.addToGroup = function(parent,obj) {

	if (parent == game.world || parent == game.state.getCurrentState()) {
		parent = game.world;
		obj.x = game.camera.x+game.width*0.5;
		obj.y = game.camera.y+game.height*0.5;
	}
	if (parent.add) {
		parent.add(obj);
	}else if (parent.addChild) {
		parent.addChild(obj);
	}

	var name;

	var lvlObj = this.getCurrentLevelObject();

	if (this.defaultNewObjectsNames){
		name = 'child_'+lvlObj.children.length;
	}else {
		name = prompt('Enter object name');
	}

	

	if (name) {

		obj.___LABEL = name;

		if (parent == game.world) {
			game.state.getCurrentState()[name] = obj;
		}else {
			parent[name] = obj;
		}
	}

};

G.Modify.prototype.addGroup = function() {

	var obj = this.getCurrentLevelObject();
	var group = game.make.group();
	group.___NEWOBJECT = true;
	this.addToGroup(obj,group);

	this.refreshLevel();

};

G.Modify.prototype.addImage = function() {

	var obj = this.getCurrentLevelObject();
	var image = new G.Image(0,0,'__missing',0.5,null);
	image.___NEWOBJECT = true;
	this.addToGroup(obj,image);

	this.refreshLevel();

	return image;

};


G.Modify.prototype.addButton = function(){

	var obj = this.getCurrentLevelObject();
	var image = new G.Button(0,0,'__missing',function(){},this);
	image.___NEWOBJECT = true;
	this.addToGroup(obj,image);

	this.refreshLevel();

};

G.Modify.prototype.addOneLineText = function() {

	var obj = this.getCurrentLevelObject();

	var fonts = Object.keys(game.cache._cache.bitmapFont);
	var txt = new G.OneLineText(0,0,fonts[0],'TEXT',50,300,0.5,0.5);
	txt.cacheAsBitmap= false;
	this.addToGroup(obj,txt);

	this.refreshLevel();
};

G.Modify.prototype.addMultiLineText = function() {

	var obj = this.getCurrentLevelObject();

	var fonts = Object.keys(game.cache._cache.bitmapFont);
	var txt = new G.MultiLineText(0,0,fonts[0],'TEXT',50,300,300,'center',0.5,0.5);
	txt.cacheAsBitmap= false;
	this.addToGroup(obj,txt);

	this.refreshLevel();

};

G.Modify.prototype.update = function() {

	this.updateKeyboard();

	this.redrawGfx();
	this.propGroup.update();

	if (this.hideGroupTxt) {
		//this.groupTxt.visible = false;
		this.childList.hideList();
		this.propGroup.cameraOffset.y = this.childList.cameraOffset.y+50;
	}else {
		this.childList.showList();
		//this.groupTxt.visible = true;
		this.propGroup.cameraOffset.y = this.childList.cameraOffset.y+this.childList.height+30;
	}

	this.frameSelector.update();

	this.bottomBar.x = game.world.bounds.x;
	this.bottomBar.y = game.world.bounds.y + game.height - this.bottomBar.height;

	for (var i = 0; i < this.children.length; i++){
		this.children[i].update();
	}

};

G.Modify.prototype.getChildrenPropNames = function() {

	game.world.bringToTop(this);

	var result = [];

	var obj = this.getCurrentLevelObject();
	var nameObj = obj;
	if (obj === game.world) {
		nameObj = game.state.getCurrentState();
	}

	var foundObjList = [];

	for (var i = 0; i < obj.children.length; i++) {

		var found = false;
		var child = obj.children[i];

		if (child === this) {
			result.push(['G.MODIFY-EDITOR']);
			continue;
		}

		if (child.___LABEL){
			result.push([child.___LABEL]);
			continue;
		}

		for (var prop in nameObj) {
		
			if (prop == 'children' || prop == 'cursor') {
				continue;
			}
			
			if (!found && child === nameObj[prop]) {
				found = true;
				child.___LABEL = prop;
				result.push([prop]);
			}



			if (Array.isArray(nameObj[prop]) && prop !== 'children') {

				for (var j = 0; j < nameObj[prop].length; j++) {
					if (!found && child === nameObj[prop][j]) {
						found = true;
						result.push([prop,j]);
					}
				}

			}

		}

		if (!found) {
			result.push(['children',i]);
		}

	}

	return result;

};

G.Modify.prototype.getCurrentObject = function() {
	return this.getCurrentLevelObject().children[this.currentChildIndex];
};

G.Modify.prototype.changeFrame = function(newFrame) {

	console.log(newFrame);

	var obj = this.getCurrentObject();

	this.saveInitPropValue('frameName',newFrame);

	if (obj.loadTexture) {
		G.changeTexture(obj,newFrame);
	}

};

G.Modify.prototype.getCurrentLevelObject = function() {

	var obj = this.obj;

	for (var i = 0; i < this.currentLevel.length; i++) {
		obj = obj[this.currentLevel[i]];
	}

	return obj;


};

G.Modify.prototype.redrawGfx = function() {

	this.gfx.clear();


	//whole group

	var obj = this.getCurrentLevelObject();

	if (obj !== game.state.getCurrentState()) {

		var bounds = obj.getLocalBounds();
		this.gfx.lineStyle(3, 0xff0000, 0.2);
		this.gfx.drawRect(
			obj.worldPosition.x+bounds.x,
			obj.worldPosition.y+bounds.y,
			bounds.width,
			bounds.height);

		this.gfx.beginFill(0x000000,0.5);
		this.gfx.drawRect(obj.worldPosition.x-10,obj.worldPosition.y-10,20,20);
		
	}

	
	this.gfx.beginFill(0x000000,0);


	//childrens

	this.childrenPropNames.forEach(function(key,index) {

		var activeObj = index == this.currentChildIndex;
		this.gfx.lineStyle(activeObj ? 3 : 1, 0x0000ff, activeObj ? 1 : 0.2);
		var obj = this.getCurrentLevelObject().children[index];
		if (!obj) return;
		var bounds = obj.getBounds();
		var localBounds = obj.getLocalBounds();
		this.gfx.drawRect(
			obj.worldPosition.x+localBounds.x*obj.scale.x,
			obj.worldPosition.y+localBounds.y*obj.scale.y,
			bounds.width*obj.scale.x,
			bounds.height*obj.scale.y
		);

		if (activeObj && obj.maxUserWidth && !obj.maxUserHeight) {

			this.gfx.lineStyle(2,0x00ff00,0.5);
			this.gfx.drawRect(
				obj.worldPosition.x - (obj.anchor.x*obj.maxUserWidth),
				obj.worldPosition.y - (obj.anchor.y*obj.height),
				obj.maxUserWidth,
				obj.height
			);
		}else if (activeObj && obj.maxUserWidth && obj.maxUserHeight) {

			this.gfx.lineStyle(2,0x00ff00,0.5);
			this.gfx.drawRect(
				obj.worldPosition.x - (obj.anchor.x*obj.maxUserWidth),
				obj.worldPosition.y - (obj.anchor.y*obj.maxUserHeight),
				obj.maxUserWidth,
				obj.maxUserHeight
			);
		}

	},this);

	var currentObj = this.getCurrentObject();
	if (!currentObj) return;

};


G.Modify.prototype.addKeyboardControlls = function() {

	this.keys = game.input.keyboard.addKeys({
		'Q':Phaser.Keyboard.Q,
		'A':Phaser.Keyboard.A,
		'E':Phaser.Keyboard.E,
		'UP':Phaser.Keyboard.UP,
		'ONE':Phaser.Keyboard.ONE,
		'TWO':Phaser.Keyboard.TWO,
		'DOWN':Phaser.Keyboard.DOWN,
		'RIGHT':Phaser.Keyboard.RIGHT,
		'LEFT':Phaser.Keyboard.LEFT,
		'ALT':Phaser.Keyboard.ALT,
		'Z':Phaser.Keyboard.Z,
		'X':Phaser.Keyboard.X,
		'C':Phaser.Keyboard.C,
		'U':Phaser.Keyboard.U,
		'PLUS': 107,
		'MINUS': 109,
		'ESC': Phaser.Keyboard.ESC,
		'NUM8': 104,
		'NUM5': 101,
		'NUM4': 100,
		'NUM6': 102,
		'NUM2': 98,
		'NUM7': 103,
		'NUM9': 105,
		'NUMSTAR': 106,
		'SPACE' : Phaser.Keyboard.SPACEBAR,
		'V': Phaser.Keyboard.V,
		'L': Phaser.Keyboard.L,
		'I': Phaser.Keyboard.I,
		'P': Phaser.Keyboard.P,
		'O': Phaser.Keyboard.O,
		'M': Phaser.Keyboard.M,
		'DEL': Phaser.Keyboard.DELETE,
		'sqBracketOpen': 219,
		'sqBracketClose': 221,
		'SHIFT': Phaser.Keyboard.SHIFT

	});


	this.keys.sqBracketOpen.onDown.add(function(){
		if (this.keys.SHIFT.isDown) {
			this.objToBottom();
		}else {
			this.objMoveDown();
		}
	},this);

	this.keys.sqBracketClose.onDown.add(function(){
		if (this.keys.SHIFT.isDown) {
			this.objToTop();
		}else {
			this.objMoveUp();
		}
	},this);



	this.keys.frameCounter = 0; 

	this.keys.L.onDown.add(function(){
		var lvlObj = this.getCurrentLevelObject();
		var obj = this.getCurrentObject();

		this.domLayer.openInputDiv(
		(obj.___LABEL || 'obj')+' | label',
		obj.___LABEL || '',
		function(value){
			if (lvlObj[value] === undefined) {

				if (obj.___LABEL){
					delete lvlObj[obj.___LABEL];
				}

				lvlObj[value] = obj;
				obj.___LABEL = value;
				this.refreshLevel();
			}
		},
		this,'string');

	},this);


	//change children +1
	this.keys.Q.onDown.add(function() {
		this.changeCurrentChildrenIndex(this.currentChildIndex+1);
	},this);

	//change children -1
	this.keys.A.onDown.add(function() {
		console.log('children -1');
		this.changeCurrentChildrenIndex(this.currentChildIndex-1);
	},this);

	this.keys.E.onDown.add(function() {
		this.exportChanges();
	},this);

	//restar to initial position
	this.keys.NUM5.onDown.add(function() {

		var obj = this.getCurrentObject();

		if (!obj) return;

		obj.scale.setTo(1);
		obj.angle = 0;
		obj.alpha = 1;
		obj.visible = true;
		obj.anchor.setTo(0.5);

	},this);

	//enter child
	this.keys.TWO.onDown.add(function() {
		var obj = this.getCurrentObject();
		if (obj.children.length > 0) {
			this.currentLevel = this.currentLevel.concat(this.childrenPropNames[this.currentChildIndex]);
			this.childrenPropNames = this.getChildrenPropNames();
			this.currentChildIndex = 0;
			this.makeTexts();
		}
	},this);

	//exit child
	this.keys.ONE.onDown.add(function() {

		if (this.currentLevel.length == 0) return;	
		//for arrays - children,1 -> splice 2
		this.currentLevel = typeof this.currentLevel[this.currentLevel.length-1] === 'number' ? this.currentLevel.splice(0,this.currentLevel.length-2) : this.currentLevel.splice(0,this.currentLevel.length-1);
		this.childrenPropNames = this.getChildrenPropNames();
		this.currentChildIndex = 0;
		this.makeTexts();

	},this);

	//kill modify
	this.keys.ESC.onDown.add(this.turnOff,this);

	//change alpha settings
	this.keys.V.onDown.add(function(){
		this.alpha = this.alpha == 1 ? 0.1 : 1;
	},this);

	//mark obj as constructor
	this.keys.O.onDown.add(function(){
		var obj = this.getCurrentObject();
		if (obj instanceof Phaser.Group) {
			obj.___CONSTRUCTOR = true;
		}
	},this);

	//generate code
	this.keys.P.onDown.add(function(){
		var obj = this.getCurrentObject();
		var str = this.codeGenerator.start(obj);
	},this);


	this.keys.C.onDown.add(function(){
		var pointer = game.input.activePointer;
		var newObj = this.addImage();
		this.setNewCurrentChildren(newObj);
		this.moveCurrentObjectToWorldPos(pointer.x,pointer.y);

	},this);

	//go to modify empty state
	this.keys.I.onDown.add(function(){
		if (this.pressCounterI === undefined) {
			this.pressCounterI = 0;
		}

		this.pressCounterI++;

		if (this.pressCounterI == 3){
			game.state.start('MODIFYEMPTYSTATE');
		}

		game.time.events.add(1000,function(){
			this.pressCounterI = 0;
		},this);
	},this);

	this.keys.DEL.onDown.add(this.removeObject,this);

	this.keys.NUMSTAR.onDown.add(function(){

		console.log('numstar');

		if (this.frameSelector.opened) {
			this.frameSelector.close();
		}else{
			this.frameSelector.open();
		}

	},this);

	this.keys.U.onDown.add(function(){
		this.hideGroupTxt = !this.hideGroupTxt;
	},this);

};

G.Modify.prototype.turnOff = function() {

	if (this.escPressed === undefined){
		this.escPressed = 0;
	}

	this.escPressed++;
	game.time.events.add(2000,function(){
		this.escPressed = 0;
	},this)

	if (this.escPressed < 5) return;


	for (key in this.keys) {

			if (this.keys[key].onDown) {
				this.keys[key].onDown.removeAll();
			}

		}	

		this.gfx.destroy();
		this.levelTxt.destroy();
		this.propGroup.destroy();
		this.groupTxt.destroy();

		this.destroy();

};


G.Modify.prototype.modifyCurrentObjProp = function(prop,value){

	var obj = this.getCurrentObject();
	this.saveInitPropValue(prop,value);
	G.Utils.setObjProp(obj,prop,value);

};

G.Modify.prototype.saveInitPropValue = function(prop,newVal){

	var obj = this.getCurrentObject();

	if (Array.isArray(prop)) prop = prop.join('.');

	var val = G.Utils.getObjProp(obj,prop);

	//exit if nothing changes
	if (val === newVal) return;

	if (!obj.___initState) obj.___initState = {};

	//if there was init value before, dont overwrite it
	if (typeof obj.___initState[prop] !== 'undefined'){
		return;
	}

	obj.___initState[prop] = G.Utils.getObjProp(obj,prop);

};

G.Modify.prototype.updateKeyboard = function() {

	var obj = this.getCurrentObject();

	if(!obj) return;

	this.keys.frameCounter++;


	
	var val = 1;
	var proc = true;
	if (this.keys.Z.isDown){
		if (this.keys.frameCounter % 5 != 0) {
			proc = false;
		}
	}


	//position
	
	if (this.keys.X.isDown) {
		val = 5;
	}
	if (this.keys.C.isDown) {
		val = 20;
	}

	if (proc && this.keys.UP.isDown) {
		this.modifyCurrentObjProp('y',obj.y-val);
		//obj.position.y-=val;
	}
	if (proc && this.keys.DOWN.isDown) {
		this.modifyCurrentObjProp('y',obj.y+val);
		//obj.position.y+= val;
	}
	if (proc && this.keys.LEFT.isDown) {
		this.modifyCurrentObjProp('x',obj.x-val);
		//obj.position.x-=val;
	}
	if (proc && this.keys.RIGHT.isDown) {
		this.modifyCurrentObjProp('x',obj.x+val);
		//obj.position.x+= val;
	}

	

	val = 0.025;

	if (this.keys.X.isDown) {
		val = 0.05;
	}
	if (this.keys.C.isDown) {
		val = 0.1;
	}

	if (proc && this.keys.NUM8.isDown) {
		this.modifyCurrentObjProp('scale.y',obj.scale.y+val);
		//obj.scale.y+=val;
	}
	if (proc && this.keys.NUM2.isDown) {
		this.modifyCurrentObjProp('scale.y',obj.scale.y-val);
		obj.scale.y-= val;
	}
	if (proc && this.keys.NUM4.isDown) {
		this.modifyCurrentObjProp('scale.x',obj.scale.x-val);
		//obj.scale.x-=val;
	}
	if (proc && this.keys.NUM6.isDown) {
		this.modifyCurrentObjProp('scale.x',obj.scale.x+val);
		//obj.scale.x+= val;
	}

	if (proc && this.keys.PLUS.isDown) {
		this.modifyCurrentObjProp('scale.x',obj.scale.x+val);
		this.modifyCurrentObjProp('scale.y',obj.scale.y+val);
		//obj.scale.x += val;
		//obj.scale.y += val;
	}
	if (proc && this.keys.MINUS.isDown) {
		this.modifyCurrentObjProp('scale.x',obj.scale.x-val);
		this.modifyCurrentObjProp('scale.y',obj.scale.y-val);
		//obj.scale.x -= val;
		//obj.scale.y -= val;
	}

	//obj.scale.x = parseFloat(obj.scale.x.toFixed(3));
	//obj.scale.y = parseFloat(obj.scale.y.toFixed(3));
	


	//angle


	val = 1;

	if (this.keys.X.isDown) {
		val = 2;
	}
	if (this.keys.C.isDown) {
		val = 5;
	}

	if (proc && this.keys.NUM7.isDown) {
		this.modifyCurrentObjProp('angle',obj.angle-val);
		//obj.angle+=val;
	}
	if (proc && this.keys.NUM9.isDown) {
		this.modifyCurrentObjProp('angle',obj.angle+val);
		//obj.angle-= val;
	}


	if (this.keys.SPACE.isDown) {

		this.modifyCurrentObjProp('x',Math.floor(obj.x/5)*5);
		this.modifyCurrentObjProp('y',Math.floor(obj.y/5)*5);

		this.modifyCurrentObjProp('scale.x',Math.floor(obj.scale.x/0.025)*0.025);
		this.modifyCurrentObjProp('scale.y',Math.floor(obj.scale.y/0.025)*0.025);

		this.modifyCurrentObjProp('angle',Math.floor(obj.angle));

	}


};

G.Modify.prototype.currentLevelGoUp = function(){
	if (this.currentLevel.length == 0) return;	
		//for arrays - children,1 -> splice 2
	this.currentLevel = typeof this.currentLevel[this.currentLevel.length-1] === 'number' ? 
	this.currentLevel.splice(0,this.currentLevel.length-2) : 
	this.currentLevel.splice(0,this.currentLevel.length-1);
	this.childrenPropNames = this.getChildrenPropNames();
	this.currentChildIndex = 0;

	this.onLevelObjChange.dispatch();

};

G.Modify.prototype.currentLevelGoDown = function(childIndex){

	console.log(arguments);
		
	console.log(this.childrenPropNames[childIndex]);

	this.currentLevel = this.currentLevel.concat(this.childrenPropNames[childIndex]);
	this.childrenPropNames = this.getChildrenPropNames();
	this.currentChildIndex = 0;
	this.onLevelObjChange.dispatch();

};

G.Modify.prototype.changeCurrentChildrenIndex = function(newIndex) {

	this.currentChildIndex = newIndex;

	if (this.currentChildIndex < 0) {
		this.currentChildIndex = this.childrenPropNames.length-1;
	}

	if (this.currentChildIndex >= this.childrenPropNames.length) {
		this.currentChildIndex = 0;
	}

	this.onCurrentObjChange.dispatch();

	//this.refreshTexts();

};


G.Modify.prototype.setNewCurrentChildren = function(obj){

	var currentLevel = this.getCurrentLevelObject();

	var index = currentLevel.children.indexOf(obj);

	if (index == -1) return;

	this.changeCurrentChildrenIndex(index);

};

G.Modify.prototype.childPropChange = function(currentLevel) {

	var orgLevel = this.currentLevel;
	var orgIndex = this.currentChildIndex;

	this.currentLevel = currentLevel || [];

	var currentLevelTxt = this.currentLevel.join('/') || (this.currentLevel[0] || game.state.current);

	var removeStr = this.removeCashObjToString(currentLevelTxt);

	var exportStr = '';

	var childrenPropNames = this.getChildrenPropNames();

	for (var i = 0; i < childrenPropNames.length; i++) {
		this.currentChildIndex = i;
		var obj = this.getCurrentObject();

		if (obj === this) continue;

		var currentChildPropTxt = childrenPropNames[i].toString();

		var fresh = obj.___NEWOBJECT;
		var isText = obj.constructor === G.OneLineText || obj.constructor === G.MultiLineText;

		if (fresh) {
			exportStr += 'NEW OBJECT \n';
			/*if (obj.___IMAGE) {
				exportStr += this.generateImageCode(currentChildPropTxt,obj);
			}*/
		}

		if (obj.___initState) {

			exportStr += '\t'+childrenPropNames[i]+'\n';

			var keys = Object.keys(obj.___initState);

			keys.forEach(function(key){
				exportStr += '\t'+key+':  '+G.Utils.getObjProp(obj,key)+'\n';
			},this);

			obj.___initState = undefined;

		}

		if (!isText && (fresh || obj.children && obj.children.length > 0)) {
			this.childPropChange(this.currentLevel.concat(childrenPropNames[i]));
		}


	};

	if (exportStr.length > 0 || removeStr.length > 0) {

		if (removeStr.length > 0) removeStr+'\n'
		if (exportStr.length > 0) exportStr+'\n'
		this.export += currentLevelTxt+'\n'+removeStr+exportStr;

	}

	this.currentChildIndex = orgIndex;
	this.currentLevel = orgLevel;

};

G.Modify.prototype.exportChanges = function() {

	this.export = '';;
	this.childPropChange();

	if (this.export) {

		this.export = this.objectName+'\n'+this.export;
		G.Utils.copyToClipboard(this.export);
		console.log(this.export);
	}else{
		console.log('NO CHANGES TO EXPORT');
	}

};

G.Modify.prototype.processClick = function(){

	var pointer = game.input.activePointer;

	if (this.keys.M.isDown) {

		this.moveCurrentObjectToWorldPos(pointer.x,pointer.y);
	
	}

};


G.Modify.prototype.moveCurrentObjectToWorldPos = function(x,y){

		var obj = this.getCurrentObject(); 
		if (!obj) return;

		obj.updateTransform();

		var offsetX = x - obj.worldPosition.x;
		var offsetY = y - obj.worldPosition.y;

		var offset = new Phaser.Point(offsetX,offsetY);
		var pointer = new Phaser.Point(x,y);
		offset.normalize();

		var dist = obj.worldPosition.distance(pointer);

		while (true){

			var prev = dist;

			obj.x += offset.x;
			obj.y += offset.y;
			obj.updateTransform();

			var dist = obj.worldPosition.distance(pointer);

			if (dist > prev) break;

		}

		obj.x = Math.round(obj.x);
		obj.y = Math.round(obj.y);

};


G.Modify.prototype.addMouseWheel = function(){

	function mouseWheel(event) { 
			
		var lvlObj = this.getCurrentLevelObject();
		if (lvlObj && lvlObj !== game.world) {
			lvlObj.y += game.input.mouse.wheelDelta * 150;
		}
			
	}

	game.input.mouse.mouseWheelCallback = mouseWheel.bind(this);

};


G.Modify.prototype.exportLvlAsString = function(){

	var exportObj = [];

	var lvl = this.getCurrentLevelObject();

	for (var i = 0; i < lvl.children.length; i++) {

		var child = lvl.children[i];

		if (!(child instanceof Phaser.Image)) continue;

		var frameName = null;
		if (typeof child.frameName === 'string') {
			if (child.frameName.indexOf('/') == -1) {
				frameName = child.frameName;
			}else {
				frameName = child.key;
			}
		}


		var childObj = {
			x: child.x,
			y: child.y,
			frame: frameName,
			anchor: [child.anchor.x,child.anchor.y],
			scale: [child.scale.x,child.scale.y],
			angle: child.angle
		};

		if (child.___LABEL) {
			childObj.label = child.___LABEL;
		}

		if (child.___DATA) {
			childObj.data = child.___DATA;
		}

		exportObj.push(childObj);

	};

	console.log(JSON.stringify(exportObj));

	G.Utils.copyToClipboard(JSON.stringify(exportObj));

};

G.Modify.prototype.objToTop = function(){

	var obj = this.getCurrentObject();
	if (!obj) return;
	var lvl = this.getCurrentLevelObject();
	lvl.bringToTop(obj);
	this.refreshLevel();
	this.setNewCurrentChildren(obj);

}; 

G.Modify.prototype.objMoveUp = function(){

	var obj = this.getCurrentObject();
	if (!obj) return;
	var lvl = this.getCurrentLevelObject();
	lvl.moveUp(obj);
	this.refreshLevel();
	this.setNewCurrentChildren(obj);

};

G.Modify.prototype.objMoveDown = function(){

	var obj = this.getCurrentObject();
	if (!obj) return;
	var lvl = this.getCurrentLevelObject();
	lvl.moveDown(obj);
	this.refreshLevel();
	this.setNewCurrentChildren(obj);

};

G.Modify.prototype.objToBottom = function(){

	var obj = this.getCurrentObject();
	if (!obj) return;
	var lvl = this.getCurrentLevelObject();
	lvl.sendToBack(obj);
	this.refreshLevel();
	this.setNewCurrentChildren(obj);

};
G.ModifyAnimationEditor = function(modify){

	Phaser.Group.call(this,game);

	this.modify = G.Modify.instance;

	this.tl = new G.ModifyAnimationTL();
	this.tl.x = 100;
	this.add(this.tl);
	
	this.fw = new G.ModifyAnimationFrameWindow();
	this.fw.x = -250;
	this.add(this.fw);

	this.tl.onFrameSelected.add(this.fw.refresh,this.fw);

	this.fw.onChange.add(function(obj,frameNr){
		console.log('fw onchange');
		this.tl.redrawTl();
		obj.updateAnimation(frameNr);
	},this);
	this.tl.changeTlPxWidth(800);

	this.visible = false;

	this.modify.onLevelObjChange.add(function(){

		var obj = this.modify.getCurrentLevelObject();

		if (obj.ANIMATIONELEMENT){
			this.open(obj);
		}else{
			this.close();
		}

	},this);

};

G.ModifyAnimationEditor.prototype = Object.create(Phaser.Group.prototype);

G.ModifyAnimationEditor.prototype.open = function(o){
	this.visible = true;
	this.tl.open(o);
	this.fw.refresh(o,0);

};

G.ModifyAnimationEditor.prototype.close = function(){

	this.visible = false;

}
G.ModifyAnimationFrameGroup = function(x,y){

	Phaser.Group.call(this,game);

	this.x = x;
	this.y = y;

	this.active = false;

	this.currentObj = null;
	this.currentKeyFrame = null;
	this.currentFrameNr = 0;

	this.style = {
		font: 'Verdana',
		fontSize: 13,
		fontWeight: 'bold'
	};

	this.onOffBtn = game.add.text(0,0,'off',this.style);
	this.onOffBtn.inputEnabled = true;
	this.onOffBtn.hitArea = new Phaser.Rectangle(0,0,this.onOffBtn.width,this.onOffBtn.height);
	this.onOffBtn.events.onInputDown.add(this.onOff,this);

	this.propValue = game.add.text(280,0,'---',this.style);
	this.propValue.anchor.x = 1;

	this.addMultiple([this.onOffBtn,this.propValue]);

	this.onChange = new Phaser.Signal();

};

G.ModifyAnimationFrameGroup.prototype = Object.create(Phaser.Group.prototype);

G.ModifyAnimationFrameGroup.prototype.onOff = function(){
		
		if (this.currentFrameNr == 0) return;

		if (this.active){

			this.active = false;
			this.alpha = 0.5;
			this.onOffBtn.setText('off');

			var index = this.currentObj.frameTL.indexOf(this.currentKeyFrame);
			this.currentObj.frameTL.splice(index,1);	

		}else{

			this.active = true;
			this.alpha = 1;
			this.onOffBtn.setText('on');

			var newKeyFrame = {
				f: this.currentFrameNr,
				v: G.Utils.getObjProp(this.currentObj.SPR,'frameName')
			};

			var f = this.currentFrameNr;
			var timeline = this.currentObj.frameTL;

			var indexToPut = 0;
			for (var i = 0; i < timeline.length; i++){
				if (timeline[i].f < f){
					indexToPut++;
				}
			}


			timeline.splice(indexToPut,0,newKeyFrame);

		}

		this.refresh(this.currentObj,this.currentFrameNr);
		//this.onChange.dispatch(this.currentObj,this.frameNr);

};

G.ModifyAnimationFrameGroup.prototype.update = function(){

	if (this.currentObj.playing){
		this.refresh(this.currentObj,this.currentObj.frameCounter);
		return;
	}


	if (this.currentObj){
		var val = G.Utils.getObjProp(this.currentObj.SPR,'frameName') || G.Utils.getObjProp(this.currentObj.SPR,'key');

		if (val.indexOf('/')){
			val = val.slice(val.lastIndexOf('/')+1);
			//*val = val.slice(val.lastIndexOf('.'));
		}

		//show unsaved changes
		if (this.currentKeyFrame == null){
			if ( val != this.valAtRefresh){
				this.propValue.fill = 'red';
				this.alpha = 1;
			}else{
				this.alpha = 0.5;
				this.propValue.fill = 'black';
			}	
		}

		if (!this.currentObj.playing 
			&& this.currentKeyFrame && this.currentKeyFrame.v !== val){
			this.currentKeyFrame.v = val;
		}

		this.propValue.setText(val);

	}else{
		this.propValue.setText('---');
	}

};



G.ModifyAnimationFrameGroup.prototype.refresh = function(obj,frameNr){

	this.currentObj = obj;

	if (!this.currentObj.currentAnimationName) return;


	this.currentKeyFrame = obj.getKeyFrameAt(obj.frameTL,frameNr);
	this.currentFrameNr = frameNr;

	this.propValue.fill = 'black';
	
	this.valAtRefresh = G.Utils.getObjProp(this.currentObj.SPR,'frameName');

	if (this.currentKeyFrame){
		this.active = true;
		this.alpha = 1;

		this.onOffBtn.setText('on');

		console.log('frameGroup refresh');
		console.log(this.currentObj.getTextureFrameValue(obj.frameTL,frameNr));

		this.propValue.setText(this.currentObj.getTextureFrameValue(obj.frameTL,frameNr) || '---');

	}else {
		this.onOffBtn.setText('off');
		this.active = false;
		this.alpha = 0.5;
		this.propValue.setText('---');
	}

};
G.ModifyAnimationFrameWindow = function(){

	Phaser.Group.call(this,game);

	this.onChange = new Phaser.Signal();

	this.gfx =  game.add.graphics();
	this.gfx.inputEnabled = true;
	this.add(this.gfx);

	this.gfx.beginFill(0xdddddd);
	this.gfx.drawRect(0,0,300,500);

	this.style = {
		font: 'Verdana',
		fontSize: 13,
		fontWeight: 'bold'
	};

	this.currentAnimationTxt = game.add.text(10,10,'',this.style);
	this.add(this.currentAnimationTxt);
	this.currentAnimationTxt.inputEnabled = true;
	this.currentAnimationTxt.events.onInputDown.add(function(){
		this.changeAnimation();
	},this);

	this.addAnimationBtn = game.add.text(170,10,'+',this.style);
	this.add(this.addAnimationBtn);
	this.addAnimationBtn.inputEnabled = true;
	this.addAnimationBtn.events.onInputDown.add(this.addNewAnimation,this);

	this.renameAnimationBtn = game.add.text(200,10,'R',this.style);
	this.add(this.renameAnimationBtn);
	this.renameAnimationBtn.inputEnabled = true;
	this.renameAnimationBtn.events.onInputDown.add(this.renameAnimation,this);

	this.removeAnimationBtn = game.add.text(230,10,'-',this.style);
	this.add(this.removeAnimationBtn);
	this.removeAnimationBtn.inputEnabled = true;
	this.removeAnimationBtn.events.onInputDown.add(this.removeAnimation,this);

	this.frameNr = game.add.text(290,10,'',this.style);
	this.frameNr.anchor.x = 1;
	this.add(this.frameNr);

	this.frameGroup = new G.ModifyAnimationFrameGroup(10,50);
	this.add(this.frameGroup);

	this.propGroups = [
		new G.ModifyAnimationPropGroup(10,70,'alpha','#43c9e7'),
		new G.ModifyAnimationPropGroup(10,90,'x','#e08040'),
		new G.ModifyAnimationPropGroup(10,110,'y','#d8ff30'),
		new G.ModifyAnimationPropGroup(10,130,'angle','#072ba0'),
		new G.ModifyAnimationPropGroup(10,150,'scale.x','#6c0674'),
		new G.ModifyAnimationPropGroup(10,170,'scale.y','#d34ed9'),
		new G.ModifyAnimationPropGroup(10,190,'anchor.x'),
		new G.ModifyAnimationPropGroup(10,210,'anchor.y')
	]

	this.propGroups.forEach(function(pg){
		pg.onChange.add(this.onChange.dispatch,this.onChange);
	},this);

	this.addMultiple(this.propGroups);

};

G.ModifyAnimationFrameWindow.prototype = Object.create(Phaser.Group.prototype);

G.ModifyAnimationFrameWindow.prototype.update = function(){

	if (!this.currentObj) return;

	this.propGroups.forEach(function(g){
		g.update();
	},this);

	this.frameGroup.update();

};

G.ModifyAnimationFrameWindow.prototype.loadFrame = function(obj,frameNr){

	this.currentObj = obj;
	this.labelObjTxt.setText(obj.LABEL || 'obj');
	this.frameNr.setText(frameNr);

};

G.ModifyAnimationFrameWindow.prototype.refresh = function(obj,frameNr){

	this.propGroups.forEach(function(pg){
		pg.refresh(obj,frameNr);
	});

	this.frameGroup.refresh(obj,frameNr);

	this.frameNr.setText(frameNr);

	this.currentFrameNr = frameNr;
	this.currentObj = obj;

	this.currentAnimationTxt.setText(this.currentObj.currentAnimationName || '------');

};

G.ModifyAnimationFrameWindow.prototype.changeAnimation = function(name){

	if (!this.currentObj) return;

	var animations = Object.keys(this.currentObj.dataAnimation);
	console.log(JSON.stringify(animations));

	if (name){

		this.currentObj.changeAnimationData(name);

	}else{

		if (this.currentObj.currentAnimationName){
			var index = animations.indexOf(this.currentObj.currentAnimationName);
			var newIndex = (index+1)%animations.length;
			console.log(index,newIndex);
			this.currentObj.changeAnimationData(animations[newIndex]);
		}else{
			this.currentObj.changeAnimationData(animations[0]);
		}

	}

	this.refresh(this.currentObj,this.currentFrameNr);
	this.onChange.dispatch(this.currentObj,0);

};

G.ModifyAnimationFrameWindow.prototype.addNewAnimation = function(){

	if (!this.currentObj) return;

	var animations = Object.keys(this.currentObj.dataAnimation);

	var name = 'newAnimation';
	var number = 0;

	while(animations.indexOf(name+number) !== -1){
		number++;
	}

	this.currentObj.dataAnimation[name+number] = {
		eventTL: [],
		frameTL: [{f:0, v:null}],
		propTLS: {
			alpha: [{f:0,v:1}],
			x: [{f:0,v:0}],
			y: [{f:0,v:0}],
			angle: [{f:0,v:0}],
			'scale.x': [{f:0,v:1}],
			'scale.y': [{f:0,v:1}],
			'anchor.x':  [{f:0,v:0.5}],
			'anchor.y':  [{f:0,v:0.5}]
		}
	}

	this.changeAnimation(name+number);

};

G.ModifyAnimationFrameWindow.prototype.removeAnimation = function(){

	if (!this.currentObj) return;
	if (!this.currentObj.currentAnimationName) return;

	if (Object.keys(this.currentObj.dataAnimation).length == 1) return;

	if (confirm('delete '+this.currentObj.currentAnimationName+'?')){
		delete this.currentObj.dataAnimation[this.currentObj.currentAnimationName];
		this.changeAnimation();
	}

};

G.ModifyAnimationFrameWindow.prototype.renameAnimation = function(){

	if (!this.currentObj) return;
	if (!this.currentObj.currentAnimationName) return;

	G.Modify.instance.domLayer.openInputDiv(
		this.currentObj.currentAnimationName,
		this.currentObj.currentAnimationName,
		function(value){
			var oldName = this.currentObj.currentAnimationName;
			var dataAnimation = this.currentObj.currentAnimationData;

			delete this.currentObj.dataAnimation[oldName];

			this.currentObj.dataAnimation[value] = dataAnimation;
			this.changeAnimation(value);

		},
		this,
		'string'
	);

};
G.ModifyAnimationPropGroup = function(x,y,prop,color){

	Phaser.Group.call(this,game);

	this.x = x;
	this.y = y;

	this.propKey = prop;
	this.active = false;

	this.currentObj = null;
	this.currentKeyFrame = null;
	this.currentFrameNr = 0;

	this.style = {
		font: 'Verdana',
		fontSize: 13,
		fontWeight: 'bold'
	};

	this.easings = [
		'Back','Bounce','Circular','Cubic','Elastic','Exponential','Linear','Quadratic','Quartic','Quintic','Sinusoidal'
	];


	this.onOffBtn = game.add.text(0,0,'off',this.style);
	this.onOffBtn.inputEnabled = true;
	this.onOffBtn.hitArea = new Phaser.Rectangle(0,0,this.onOffBtn.width,this.onOffBtn.height);
	this.onOffBtn.events.onInputDown.add(this.onOff,this);

	this.label = game.add.text(30,0,prop,this.style);
	if (color) this.label.addColor(color,0);

	this.easingLabel0 = game.add.text(120,0,'',this.style);
	this.easingLabel0.inputEnabled = true;
	this.easingLabel0.hitArea = new Phaser.Rectangle(0,0,80,this.easingLabel0.height);
	this.easingLabel0.events.onInputDown.add(this.changeEasing0,this);

	this.easingLabel1 = game.add.text(200,0,'',this.style);
	this.easingLabel1.inputEnabled = true;
	this.easingLabel1.hitArea = new Phaser.Rectangle(0,0,50,this.easingLabel1.height);
	this.easingLabel1.events.onInputDown.add(this.changeEasing1,this);

	this.propValue = game.add.text(280,0,'',this.style);
	this.propValue.anchor.x = 1;

	this.addMultiple([this.label,this.onOffBtn,this.easingLabel0,this.easingLabel1,this.propValue]);

	this.onChange = new Phaser.Signal();

};

G.ModifyAnimationPropGroup.prototype = Object.create(Phaser.Group.prototype);

G.ModifyAnimationPropGroup.prototype.onOff = function(){
		
		if (this.currentFrameNr == 0) return;

		if (this.active){

			this.active = false;
			this.alpha = 0.5;
			this.onOffBtn.setText('off');

			var index = this.currentObj.propTLS[this.propKey].indexOf(this.currentKeyFrame);
			this.currentObj.propTLS[this.propKey].splice(index,1);	

		}else{

			this.active = true;
			this.alpha = 1;
			this.onOffBtn.setText('on');

			var newKeyFrame = {
				f: this.currentFrameNr,
				v: G.Utils.getObjProp(this.currentObj.SPR,this.propKey)
			};

			var f = this.currentFrameNr;
			var timeline = this.currentObj.propTLS[this.propKey];

			var indexToPut = 0;
			for (var i = 0; i < timeline.length; i++){
				if (timeline[i].f < f){
					indexToPut++;
				}
			}
			
			timeline.splice(indexToPut,0,newKeyFrame);

		}

		this.refresh(this.currentObj,this.currentFrameNr);
		//this.onChange.dispatch(this.currentObj,this.frameNr);

};

G.ModifyAnimationPropGroup.prototype.update = function(){

	if (this.currentObj.playing){
		this.refresh(this.currentObj,this.currentObj.frameCounter);
		return;
	}


	if (this.currentObj){
		var val = G.Utils.getObjProp(this.currentObj.SPR,this.propKey);

		//show unsaved changes
		if (this.currentKeyFrame == null){
			if ( val != this.valAtRefresh){
				this.propValue.fill = 'red';
				this.alpha = 1;
			}else{
				this.alpha = 0.5;
				this.propValue.fill = 'black';
			}	
		}

		if (!this.currentObj.playing 
			//&& this.currentObj.frameCounter == this.currentFrameNr 
			&& this.currentKeyFrame && this.currentKeyFrame.v !== val){
			this.currentKeyFrame.v = val;
		}

		this.propValue.setText(val.toFixed(1));

	}else{
		this.propValue.setText('---');
	}

};

G.ModifyAnimationPropGroup.prototype.changeEasing0 = function(){
	
	if (!this.currentKeyFrame) return;

	if (this.currentKeyFrame.e){
		var index = this.easings.indexOf(this.currentKeyFrame.e[0]);

		if (index+1 == this.easings.length){
			this.currentKeyFrame.e = false;
			this.easingLabel0.setText('--');
			this.easingLabel1.setText('--');
		}else{
			this.currentKeyFrame.e[0] = this.easings[index+1];
			this.easingLabel0.setText(this.easings[index+1]);

			var currentE1 = this.currentKeyFrame.e[1];

			if (!Phaser.Easing[this.easings[index+1]][currentE1]){
				if (Phaser.Easing[this.easings[index+1]]['None']){
					this.currentKeyFrame.e[1] = 'None';
				}else if (Phaser.Easing[this.easings[index+1]]['In']){
					this.currentKeyFrame.e[1] = 'In';
				}
			}

			this.easingLabel1.setText(this.currentKeyFrame.e[1]);

		}

	}else {

		this.currentKeyFrame.e = ['Back','In'];
		this.easingLabel0.setText('Back');
		this.easingLabel1.setText('In');

	}

	this.onChange.dispatch(this.currentObj,this.currentFrameNr);

};

G.ModifyAnimationPropGroup.prototype.changeEasing1 = function(){

	if (!this.currentKeyFrame) return;
	if (!this.currentKeyFrame.e) return;

	var currentE1 = this.currentKeyFrame.e[1];
	var keys = Object.keys(Phaser.Easing[this.currentKeyFrame.e[0]]);

	var index = keys.indexOf(currentE1);

	this.currentKeyFrame.e[1] = keys[(index+1)%keys.length];
	this.easingLabel1.setText(this.currentKeyFrame.e[1]);

	this.onChange.dispatch(this.currentObj,this.currentFrameNr);

};



G.ModifyAnimationPropGroup.prototype.refresh = function(obj,frameNr){

	this.currentObj = obj;

	if (!this.currentObj.currentAnimationName) return;


	this.currentKeyFrame = obj.getKeyFrameAt(obj.propTLS[this.propKey],frameNr);
	this.currentFrameNr = frameNr;

	this.propValue.fill = 'black';

	this.valAtRefresh = G.Utils.getObjProp(this.currentObj.SPR,this.propKey);

	if (this.currentKeyFrame){
		this.active = true;
		this.alpha = 1;

		this.onOffBtn.setText('on');

		if (this.currentKeyFrame.e){
			this.easingLabel0.setText(this.currentKeyFrame.e[0]);
			this.easingLabel1.setText(this.currentKeyFrame.e[1]);
		}else{
			this.easingLabel0.setText('---');
			this.easingLabel1.setText('---');
		}

	}else {
		this.onOffBtn.setText('off');
		this.active = false;
		this.alpha = 0.5;
		this.easingLabel0.setText('---');
		this.easingLabel1.setText('---');
	}

};
G.ModifyAnimationTL = function(){

	Phaser.Group.call(this,game);

	this.gfx = game.add.graphics();
	this.add(this.gfx);

	this.tlGfx = game.add.graphics();
	this.tlGfx.inputEnabled = true;

	this.pointerPressed = false;
	this.pointerStartFrame = 0;
	this.tlGfx.events.onInputDown.add(this.onDown,this);
	this.tlGfx.events.onInputUp.add(this.onUp,this);

	this.add(this.tlGfx);

	this.visible = false;
	this.currentObj = null;

	this.frameWidth = 10;
	this.frameHeight = 50;
	this.tlPxWidth = 400;
	this.tlFrameLength = this.tlPxWidth/this.frameWidth;

	this.selectedFrame = null;


	this.frameOffset = 0;

	this.cursors = game.input.keyboard.createCursorKeys();

	this.cursors.left.onDown.add(function(){
		this.frameOffset--;
		this.redrawTl();
	},this);

	this.cursors.right.onDown.add(function(){
		this.frameOffset++;
		this.redrawTl();
	},this);

	this.onFrameSelected = new Phaser.Signal();


};

G.ModifyAnimationTL.prototype = Object.create(Phaser.Group.prototype);

G.ModifyAnimationTL.prototype.colors = [0x972234,0x008b50,0x43c9e7,0xe08040,0xd8ff30,0x072ba0,0x6c0674,0xd34ed9];

G.ModifyAnimationTL.prototype.update = function(){

	if (this.pointerPressed){
		var p = game.input.activePointer;
		var frameNr = Math.floor((p.x - this.tlGfx.worldPosition.x)/this.frameWidth);
		if (frameNr !== this.pointerStartFrame){
			var diff = this.pointerStartFrame-frameNr;
			this.frameOffset += diff;
			this.pointerStartFrame = frameNr;
			this.frameOffset = Math.max(0,this.frameOffset);
			this.redrawTl();

		}
	}


};


G.ModifyAnimationTL.prototype.changeFrameWidth = function(newWidth){
	this.frameWidth = newWidth;
	this.tlFrameLength = Math.floor(this.tlPxWidth/this.frameWidth);
	this.redrawTl();
};

G.ModifyAnimationTL.prototype.changeTlPxWidth = function(newWidth){
	this.tlPxWidth = newWidth;
	this.tlFrameLength = Math.floor(this.tlPxWidth/this.frameWidth);
	this.redrawTl();
};

G.ModifyAnimationTL.prototype.open = function(obj){

	this.currentObj = obj;
	this.visible = true;
	this.redrawTl();
	this.currentObj.stop();

};

G.ModifyAnimationTL.prototype.onDown = function(obj,p){

	this.currentObj.pause();
	var frameNr = Math.floor((p.x - this.tlGfx.worldPosition.x)/this.frameWidth);
	this.pointerStartFrame = frameNr;
	this.pointerPressed = true;
};

G.ModifyAnimationTL.prototype.onUp = function(obj,p){

	var frameNr = Math.floor((p.x - this.tlGfx.worldPosition.x)/this.frameWidth);
	if (this.pointerStartFrame == frameNr){
		this.selectFrame(frameNr);
		this.pointerStar
	}
	this.pointerPressed = false;

};

G.ModifyAnimationTL.prototype.selectFrame = function(frameNr){

	this.selectedFrame = frameNr+this.frameOffset;
	this.currentObj.updateAnimation(this.selectedFrame);
	this.redrawTl();
	this.onFrameSelected.dispatch(this.currentObj,this.selectedFrame);

};

G.ModifyAnimationTL.prototype.redrawTl = function(){
	
	this.tlGfx.clear();

	if (!this.currentObj) return;
	if (!this.currentObj.currentAnimationName) return;

	this.tlGfx.beginFill(0xdddddd,1);
	this.tlGfx.drawRect(0,0,this.tlFrameLength*this.frameWidth,this.frameHeight);

	this.tlGfx.beginFill(0x999999,1);



	for (var i = this.frameOffset; i < this.frameOffset+this.tlFrameLength; i++){

		if (this.currentObj.isAnyKeyFrameAt(i)){
			this.tlGfx.lineStyle(1,0x000000,1);
			this.tlGfx.drawRect(this.frameWidth*i-(this.frameOffset*this.frameWidth),0,this.frameWidth,this.frameHeight);
		}

		if (i % 60 == 0){
			this.tlGfx.lineStyle(1,0x000000,0.25);
			this.tlGfx.moveTo(this.frameWidth*i-(this.frameOffset*this.frameWidth),0);
			this.tlGfx.lineTo(this.frameWidth*i-(this.frameOffset*this.frameWidth),this.frameHeight);
		}
	}



	this.tlGfx.lineStyle(0,0x000000,0);
	//event tl
	for (var i = 0; i < this.currentObj.eventTL.length; i++){
		var key = this.currentObj.eventTL[i];
		this.tlGfx.beginFill(this.colors[0],1);
		if (key.f >= this.frameOffset && key.f < this.frameOffset+this.tlFrameLength){
			this.tlGfx.drawRect(this.frameWidth*key.f-(this.frameOffset*this.frameWidth),0,this.frameWidth,5);
		}
	};

	for (var i = 0; i < this.currentObj.frameTL.length; i++){
		var key = this.currentObj.frameTL[i];
		this.tlGfx.beginFill(this.colors[1],1);
		if (key.f >= this.frameOffset && key.f < this.frameOffset+this.tlFrameLength){
			this.tlGfx.drawRect(this.frameWidth*key.f-(this.frameOffset*this.frameWidth),5,this.frameWidth,5);
		}
	}

	for (var i = 0; i < this.currentObj.propKeys.length; i++){
		this.drawPropLine(this.currentObj.propTLS[this.currentObj.propKeys[i]],15+i*5,this.colors[2+i]);
	}

	if (this.selectedFrame !== null && this.selectedFrame >= this.frameOffset && this.selectedFrame < this.frameOffset+this.tlFrameLength){
		this.tlGfx.beginFill(0x0000ff,0.5);
		this.tlGfx.drawRect(this.frameWidth*this.selectedFrame-(this.frameOffset*this.frameWidth),0,this.frameWidth,this.frameHeight);
	}

};

G.ModifyAnimationTL.prototype.drawPropLine = function(tl, y, color){

	var x;
	var w = this.frameWidth*0.5;

	for (var i = 0; i < tl.length; i++){
		var kf = tl[i];


		x = (kf.f*this.frameWidth+(this.frameWidth*0.5))-(this.frameOffset*this.frameWidth);
		
		this.tlGfx.lineStyle(0,0,0);

		if (kf.f < this.frameOffset) continue;
		

		//check if there was easing in prev key

		var pkf = tl[i-1];
		if (pkf && pkf.e){
			this.tlGfx.lineStyle(2,color,1);
			this.tlGfx.moveTo(0,y);
			this.tlGfx.lineTo(
				Math.min(
					this.tlFrameLength*this.frameWidth,
					kf.f*this.frameWidth-(this.frameOffset*this.frameWidth)
				),y);
		};

		if (kf.f >= this.frameOffset+this.tlFrameLength) continue;

		if (kf.e){
			this.tlGfx.beginFill(color,1);
			this.tlGfx.drawCircle(x,y,w);

			if (tl[i+1]){
				this.tlGfx.lineStyle(2,color,1);
				this.tlGfx.moveTo(x,y);
				var lineToX = tl[i+1].f*this.frameWidth-(this.frameOffset*this.frameWidth);
				lineToX = Math.min(this.tlFrameLength*this.frameWidth,lineToX);
				this.tlGfx.lineTo(lineToX,y);
			}

		}else{
			this.tlGfx.endFill();
			this.tlGfx.lineStyle(2,color,1);
			this.tlGfx.drawCircle(x,y,w-2);
		}

	}

};
G.ModifyBottomBar = function(){

	Phaser.Group.call(this,game);

	this.modify = G.Modify.instance;

	this.gfx = game.add.graphics();

	this.gfx.beginFill(0xcccccc,1);
	this.gfx.drawRect(0,0,3000,30);
	this.gfx.inputEnabled = true;
	this.gfx.events.onInputDown.add(function() {});
	this.add(this.gfx);

	var style = {
		font: 'Verdana',
		fontSize: 15,
		fontWeight: 'bold'
	}

	this.buttons = [
		G.Utils.makeTextButton(10,5,'+GROUP',this.modify.addGroup,this.modify,style),
		G.Utils.makeTextButton(90,5,'+IMG',this.modify.addImage,this.modify,style),
		G.Utils.makeTextButton(160,5,'+OneLine',this.modify.addOneLineText,this.modify,style),
		G.Utils.makeTextButton(260,5,'+MultiLine',this.modify.addMultiLineText,this.modify,style),
		G.Utils.makeTextButton(360,5,'+BTN',this.modify.addButton,this.modify,style),
		G.Utils.makeTextButton(450,5,'REMOVE',this.modify.removeObject,this.modify,style),
		G.Utils.makeTextButton(600,5,'EXPORT LVL STR',this.modify.exportLvlAsString,this.modify,style)
	];

	this.addMultiple(this.buttons);


};

G.ModifyBottomBar.prototype = Object.create(Phaser.Group.prototype);
G.ModifyButtonGroup = function() {

    Phaser.Group.call(this, game);

    this.modify = G.Modify.instance;

    this.fixedToCamera = true;

    this.gfx = this.add(game.add.graphics());

    this.transformButtons = this.add(game.add.group());
    this.changeObjButtons = this.add(game.add.group());

    this.mode = 0;

    this.tabKey = game.input.keyboard.addKey(Phaser.Keyboard.TAB);
    this.tabKey.onDown.add(function() {
        this.gfx.clear();
        this.mode = (this.mode + 1) % 2;
        this.transformButtons.visible = this.mode == 0;
        this.changeObjButtons.visible = this.mode == 1;
    }, this);

    this.keys = {
        ALT: game.input.keyboard.addKey(Phaser.Keyboard.ALT)
    }



    this.clickedButton = null;
    this.clickedPos = null;



    this.posButton = game.add.button(0, 0, null);
    this.posButton.onInputDown.add(function() {
        this.clickedButton = this.posButton;
        this.clickedPos = { x: game.input.activePointer.x, y: game.input.activePointer.y };
    }, this);
    this.posButton.anchor.setTo(0.5, 0.5);
    this.posButton.tint = 0xff0000;
    this.transformButtons.add(this.posButton);

    this.scaleButton = game.add.button(0, 0, null);
    this.scaleButton.onInputDown.add(function() {
        this.clickedButton = this.scaleButton;
        this.clickedPos = { x: game.input.activePointer.x, y: game.input.activePointer.y };
    }, this);
    this.scaleButton.anchor.setTo(0.5, 0.5);
    this.scaleButton.tint = 0x00ff00;
    this.transformButtons.add(this.scaleButton);


    this.rotateButton = game.add.button(0, 0, null);
    this.rotateButton.onInputDown.add(function() {
        this.clickedButton = this.rotateButton;
        this.clickedPos = { x: game.input.activePointer.x, y: game.input.activePointer.y };
    }, this);
    this.rotateButton.anchor.setTo(0.5, 0.5);
    this.rotateButton.tint = 0x00ff00;
    this.transformButtons.add(this.rotateButton);

    this.refreshChangeObjButtons();

    this.modify.onLevelObjChange.add(this.refreshChangeObjButtons, this);
    this.modify.onObjDestroy.add(this.refreshChangeObjButtons, this);

};

G.ModifyButtonGroup.prototype = Object.create(Phaser.Group.prototype);

G.ModifyButtonGroup.prototype.update = function() {

    if (this.mode == 0) {
        this.updateTransformButtons();
   		this.transformButtons.ignoreChildInput = false;
        this.changeObjButtons.ignoreChildInput = true;
    } else {
    	this.transformButtons.ignoreChildInput = true;
        this.changeObjButtons.ignoreChildInput = false;
        this.updateChangeObjButtons();
    };

};

G.ModifyButtonGroup.prototype.updateTransformButtons = function() {

    var obj = this.modify.getCurrentObject();
    if (!obj) {
        this.posButton.position.setTo(-9999, -9999);
        this.scaleButton.position.setTo(-9999, -9999);
        this.rotateButton.position.setTo(-9999, -9999);
        return;
    };
    var bounds = obj.getBounds();
    var localBounds = obj.getLocalBounds();
    var pointer = game.input.activePointer

    this.posButton.x = obj.worldPosition.x;
    this.posButton.y = obj.worldPosition.y;

    this.scaleButton.x = obj.worldPosition.x + localBounds.x * obj.scale.x + bounds.width * obj.scale.x + 20,
        this.scaleButton.y = obj.worldPosition.y + localBounds.y * obj.scale.y + bounds.height * obj.scale.y + 20;

    this.rotateButton.x = obj.worldPosition.x + localBounds.x * obj.scale.x - 20;
    this.rotateButton.y = obj.worldPosition.y + localBounds.y * obj.scale.y - 20;



    this.gfx.clear();

    this.gfx.lineStyle(1, 0x000000, 1);
    this.gfx.beginFill(0xff0000, 1);
    this.gfx.drawCircle(this.posButton.worldPosition.x, this.posButton.worldPosition.y, 10);
    this.gfx.endFill();

    this.gfx.beginFill(0x00ff00, 1);
    this.gfx.drawCircle(this.scaleButton.worldPosition.x, this.scaleButton.worldPosition.y, 10);
    this.gfx.endFill();

    this.gfx.beginFill(0x0000ff, 1);
    this.gfx.drawCircle(this.rotateButton.worldPosition.x, this.rotateButton.worldPosition.y, 10);
    this.gfx.endFill();


    if (!this.clickedButton) return;

    if (pointer.isDown) {
        var offsetX = pointer.x - this.clickedPos.x;
        var offsetY = pointer.y - this.clickedPos.y;

        if (this.clickedButton === this.posButton) {
            this.modify.modifyCurrentObjProp('x', obj.x + offsetX);
            this.modify.modifyCurrentObjProp('y', obj.y + offsetY);
        }

        if (this.clickedButton === this.scaleButton) {
            this.modify.modifyCurrentObjProp('width', obj.width + offsetX);
            this.modify.modifyCurrentObjProp('height', obj.height + offsetY);
            if (this.keys.ALT.isDown) {
                //obj.scale.y = obj.scale.x;
                this.modify.modifyCurrentObjProp('scale.y', obj.scale.x);
            }
        }

        if (this.clickedButton === this.rotateButton) {
            this.modify.modifyCurrentObjProp('angle', obj.angle + offsetX * 0.25);
            //obj.angle += offsetX*0.25;

        }

        this.clickedPos = { x: game.input.activePointer.x, y: game.input.activePointer.y };
    } else {
        this.modify.modifyCurrentObjProp('x', Math.floor(obj.x / 5) * 5);
        this.modify.modifyCurrentObjProp('y', Math.floor(obj.y / 5) * 5);
        this.modify.modifyCurrentObjProp('scale.x', Math.floor(obj.scale.x / 0.025) * 0.025);
        this.modify.modifyCurrentObjProp('scale.y', Math.floor(obj.scale.y / 0.025) * 0.025);
        this.modify.modifyCurrentObjProp('angle', Math.floor(obj.angle));
        this.clickedButton = null;
    }



};

G.ModifyButtonGroup.prototype.updateChangeObjButtons = function() {

    this.gfx.clear();
    this.gfx.beginFill(0x00ff00, 1);
    this.gfx.lineStyle(3, 0xff0000, 1)

    for (var i = 0; i < this.changeObjButtons.length; i++) {
        var child = this.changeObjButtons.children[i];
        this.gfx.drawCircle(child.worldPosition.x, child.worldPosition.y, 10);
    }

};

G.ModifyButtonGroup.prototype.refreshChangeObjButtons = function() {

    this.changeObjButtons.removeAll(true);

    var currentLevel = this.modify.getCurrentLevelObject();

    for (var i = 0; i < currentLevel.children.length; i++) {

        if (currentLevel.children[i] == this.modify) continue;

        var child = currentLevel.children[i];
        var btn = game.make.button(0, 0, null);
        this.changeObjButtons.add(btn);
        btn.attachement = child;
        btn.modify = this.modify;
        btn.position = child.worldPosition;
        btn.hitArea = new Phaser.Circle(0, 0, 10);
        btn.onInputDown.add(function() {
            this.modify.setNewCurrentChildren(this.attachement);
        }, btn);

    }

};

G.ModifyChildList = function(){

	Phaser.Group.call(this,game);

	this.fixedToCamera = true;

	this.modify = G.Modify.instance;

	this.levelTxt = game.add.text(20,0,'',{
		font: 'Verdana',
		fontSize: 20
	});
	this.levelTxtBack = game.add.text(0,0,'<',{
		font: 'Verdana',
		backgroundColor: 'rgba(0,255,0,0.5)',
		fontSize: 20,
		fontWeight: 'bold'
	});
	this.levelTxtBack.visible = false;
	this.levelTxtBack.inputEnabled = true;
	this.levelTxtBack.input.useHandCursor = true;
	this.levelTxtBack.events.onInputDown.add(function() {
		this.modify.currentLevelGoUp();
	},this);
	this.add(this.levelTxtBack);
	this.add(this.levelTxt);

	this.listGroup = this.add(game.add.group());
	this.listGroup.y = 40;

	this.makeList();

	this.currentLevelObj = this.modify.getCurrentLevelObject();
	this.currentObj = this.modify.getCurrentObject();	

	this.modify.onLevelObjChange.add(this.makeList,this);
	this.modify.onCurrentObjChange.add(this.refreshTexts,this);
	this.modify.onObjDestroy.add(this.makeList);

};

G.ModifyChildList.prototype = Object.create(Phaser.Group.prototype);


G.ModifyChildList.prototype.hideList = function(){

	this.listGroup.visible = false;

};

G.ModifyChildList.prototype.showList = function(){

	this.listGroup.visible = true;
};

G.ModifyChildList.prototype.makeList = function(){

	var obj = this.modify.getCurrentLevelObject();
	this.listGroup.removeAll();

	for (var i = 0; i < this.modify.childrenPropNames.length; i++) {

		var hasChildren = (obj.children[i].children && obj.children[i].children.length > 0) || obj.children[i].constructor === Phaser.Group;

		var isTextObj = obj.children[i].constructor == G.OneLineText || obj.children[i].constructor == G.MultiLineText;

		var txt = game.make.text(0, i*20, this.modify.childrenPropNames[i].join('.'),{
			font: 'Verdana',
			fontSize: 15,
			backgroundColor: 'rgba(221,221,221,0.5)',
			fontWeight: 'bold'
		});

		
		var self = this.modify.childrenPropNames[i].join('.') == 'G.MODIFY-EDITOR'

		if (!isTextObj && !self && hasChildren) {

			var levelText = game.make.text(txt.width+10,0,'+',{
				font: 'Verdana',
				fontSize: 15,
				backgroundColor: 'rgba(200,255,200,0.75)',
				fontWeight: 'bold'
			});
			txt.addChild(levelText);

			levelText.txtBtn = txt;
			levelText.modify = this.modify;
			levelText.childList = this;
			levelText.indexChild = i;
			levelText.inputEnabled = true;
			levelText.input.useHandCursor = true;
			levelText.hitArea = new Phaser.Rectangle(0,0,levelText.width,levelText.height);
			levelText.events.onInputDown.add(function() {
					this.modify.currentLevelGoDown(this.indexChild);
			},levelText);

		}

		this.listGroup.add(txt);

		if (!self) {

			txt.inputEnabled = true;
			txt.indexChild = i;
			txt.childList = this;
			txt.modify = this.modify;
			txt.hitArea = new Phaser.Rectangle(0,0,txt.width,txt.height);
			txt.input.useHandCursor = true;
			txt.events.onInputDown.add(function() {
				this.modify.changeCurrentChildrenIndex(this.indexChild);
			},txt);

		}
	}


	this.refreshTexts();

};


G.ModifyChildList.prototype.refreshTexts = function() {

	this.levelTxt.setText(this.modify.currentLevel.join('/') || (this.modify.currentLevel[0] || game.state.current));

	this.levelTxtBack.visible = this.levelTxt.text !== game.state.current;

	for (var i = 0; i < this.listGroup.length; i++) {

		var txt = this.listGroup.children[i];

		if (this.modify.currentChildIndex == i) {
			txt.x = 10;
			if (txt.style.backgroundColor === 'rgba(221,221,221,0.5)') {
				txt.style.backgroundColor = 'rgba(180,180,255,1)';
				txt.updateText();
			}

		}else {
			txt.x = 0;
			if (txt.style.backgroundColor === 'rgba(180,180,255,1)'){
				txt.style.backgroundColor = 'rgba(221,221,221,0.5)';
				txt.updateText();
			}
		}

	}

};

G.ModifyCodeGenerator = function(modify){

	this.modify = modify;

};


G.ModifyCodeGenerator.prototype.start = function(obj){

	this.constStr = '';
	var exeStr = this.generateCode(obj);

	var endStr = this.constStr+'\n\n'+exeStr;

	G.Utils.copyToClipboard(endStr);
	console.log(endStr);

};


G.ModifyCodeGenerator.prototype.generateCode = function(obj,prefix){

	if (G.OneLineText) {
		if (obj instanceof G.OneLineText) {
			return this.generateCodeOneLineText(obj,prefix);
		}
	}

	if (G.MultiLineText){
		if (obj instanceof G.MultiLineText) {
			return this.generateCodeMultiLineText(obj,prefix);
		}
	}

	if (G.Button){
		if (obj instanceof G.Button){
			return this.generateCodeButton(obj,prefix);
		}
	}

	if ((obj instanceof Phaser.Group) && !(obj instanceof Phaser.BitmapText)){
		if (obj.___CONSTRUCTOR) {
			return this.generateConstructorCode(obj,prefix);
		}else {
			return this.generateGroupCode(obj,prefix);
		}
	}

	
	return this.generateCodeImage(obj,prefix);
		
};

G.ModifyCodeGenerator.prototype.generateConstructorCode = function(obj,prefix,inside){

	var name = this.getObjName(obj);

	var capName = G.capitalize(name);

	var constStr = '';

	constStr += 'G.'+capName+' = function(x,y){\n';
	constStr +=	'\tPhaser.Group.call(this,game);\n';
	constStr += '\tthis.position.setTo(x,y);\n';
	constStr += this.generateCodeUniProp(obj,'this');
	constStr += '\n';

	for (var i = 0; i < obj.children.length; i++){
		constStr += '\t'+this.generateCode(obj.children[i],'this');
		constStr += '\n';
	}

	constStr += '};\n';
	constStr += 'G.'+capName+'.prototype = Object.create(Phaser.Group.prototype);\n\n';

	this.constStr += constStr;

	var exeStr = (prefix ? prefix+'.' : 'var ') +'%NAME% = new G.'+capName+'(^x^,^y^);\n';
	if (prefix) {
		exeStr += prefix+'.add('+prefix+'.%NAME%);\n';
	}
	exeStr = G.Utils.replaceAll(exeStr,'%NAME%',name);
	exeStr = this.injectObjPropToString(obj,exeStr);

	return exeStr;

};

G.ModifyCodeGenerator.prototype.generateGroupCode = function(obj,prefix) {

	var name = this.getObjName(obj);

	var str = (prefix ? prefix+'.' : 'var ') +'%NAME% = game.add.group();\n';
	str += (prefix ? prefix+'.' : '')+'%NAME%.position.setTo(^x^,^y^);\n';
	str += this.generateCodeUniProp(obj,prefix);

	if (prefix) {
		str += prefix+'.add('+prefix+'.%NAME%);\n';
	}

	for (var i = 0; i < obj.children.length; i++){
		var childStr = this.generateCode(obj.children[i],(prefix ? prefix+'.' : '')+name,true);
		str += G.Utils.replaceAll(childStr,'this','%NAME%');
	}

	str = G.Utils.replaceAll(str,'%NAME%',name);
	return this.injectObjPropToString(obj,str);
}

G.ModifyCodeGenerator.prototype.generateGroupConstructor = function(obj){



};

G.ModifyCodeGenerator.prototype.generateChildrensCode = function(obj){


};

G.ModifyCodeGenerator.prototype.generateCodeButton = function(obj,prefix){

	prefix = prefix || '';

	var str = '';
	str += (prefix ? prefix+'.' : 'var ') +"%NAME% = new G.Button(^x^,^y^,'^frameName^',function(){},this);\n"; 
	str += (prefix ? prefix+'.' : '')+'add('+(prefix ? prefix+'.' : 'var ')+'%NAME%);\n';
	str += this.generateCodeUniProp(obj,prefix);
	str = G.Utils.replaceAll(str,'%NAME%',this.getObjName(obj));
	return this.injectObjPropToString(obj,str);

};

G.ModifyCodeGenerator.prototype.generateCodeImage = function(obj,prefix){

	var str = '';
	str += (prefix ? prefix+'.' : 'var ') +"%NAME% = G.makeImage(^x^,^y^,'^frameName^',[^anchor.x^,^anchor.y^],"+prefix+");\n";
	str += this.generateCodeUniProp(obj,prefix);
	str = G.Utils.replaceAll(str,'%NAME%',this.getObjName(obj));
	return this.injectObjPropToString(obj,str);

};

G.ModifyCodeGenerator.prototype.generateCodeOneLineText = function(obj,prefix){

	var str = '';
	str += (prefix ? prefix+'.' : 'var ') + "%NAME% = new G.OneLineText(^x^,^y^,'^font^','^text^',^fontSize^,^maxUserWidth^,^anchor.x^,^anchor.y^);\n";
	str += (prefix ? prefix+'.' : '')+'add('+(prefix ? prefix+'.' : 'var ')+'%NAME%);\n';
	str += this.generateCodeUniProp(obj,prefix);
	str = G.Utils.replaceAll(str,'%NAME%',this.getObjName(obj));
	return this.injectObjPropToString(obj,str);

};

G.ModifyCodeGenerator.prototype.generateCodeMultiLineText = function(obj,prefix){

	var str = '';	
	str +=  (prefix ? prefix+'.' : 'var ') + "%NAME% = new G.MultiLineText(^x^,^y^,'^font^','^text^',^fontSize^,^maxUserWidth^,^maxUserHeight^,'^align^',^anchor.x^,^anchor.y^);\n";
	str += (prefix ? prefix+'.' : '')+'add('+(prefix ? prefix+'.' : 'var ')+'%NAME%);\n';
	str += this.generateCodeUniProp(obj,prefix);
	str = G.Utils.replaceAll(str,'%NAME%',this.getObjName(obj));
	return this.injectObjPropToString(obj,str);

};


G.ModifyCodeGenerator.prototype.getObjName = function(obj){

	if (obj.___LABEL){
		return obj.___LABEL;
	}else{
		var name = prompt('enter name');
		obj.___LABEL = name;
		return name;
	}

};

G.ModifyCodeGenerator.prototype.generateCodeUniProp = function(obj,prefix){

	var str = '';
	prefix = prefix ? prefix+'.' : '';

	if (obj.scale.x !== 1 || obj.scale.y !== 1){
		str += prefix+'%NAME%.scale.setTo(^scale.x^, ^scale.y^);\n';
	}

	if (obj.angle !== 0){
		str += prefix+'%NAME%.angle = ^angle^;\n';
	}

	if (obj.alpha !== 1){
		str += prefix+'%NAME%.alpha = ^alpha^;\n';
	}

	if (obj.fixedToCamera){
		str += prefix+'%NAME%.fixedToCamera = true;\n';
		str += prefix+'%NAME%.cameraOffset.setTo(^cameraOffset.x^,^cameraOffset.y^);\n';
	}

	return str;

};


G.ModifyCodeGenerator.prototype.injectObjPropToString = function(obj,str){

	while (true){

		var firstIndex = str.indexOf('^');
		var secondIndex = str.indexOf('^',firstIndex+1);

		if (firstIndex == -1){
			break;
		}

		var toReplace = str.slice(firstIndex,secondIndex+1);
		var propToGet = str.slice(firstIndex+1,secondIndex);

		str = str.replace(toReplace,G.Utils.getObjProp(obj,propToGet));


	};

	return str;

};
G.ModifyDOMLayer = function(modify){

	this.modify = modify;

	this.openElement = null;

	this.extraDataDiv = this.initExtraDataDiv();
	this.inputDataDiv = this.initInputDiv();

};

G.ModifyDOMLayer.prototype.closeCurrent = function(){

	game.time.events.add(1,function(){
		game.input.enabled = true;
	});
	this.openElement.style.display = 'none';
	game.canvas.focus();

};

G.ModifyDOMLayer.prototype.initExtraDataDiv = function(){

	var dataInputDiv = document.createElement('DIV');
	dataInputDiv.style.backgroundColor = 'green';
	dataInputDiv.style.left = '10%';
	dataInputDiv.style.top = '10%';
	dataInputDiv.style.position = 'fixed';
	dataInputDiv.style.width = '80%';
	dataInputDiv.style.height = '80%';

	var input = document.createElement('TEXTAREA');
	input.style.marginTop = '2%';
	input.style.marginLeft = '2%';
	input.style.width = '95%';
	input.style.height = '94%';
	input.style.resize = 'none';

	input.onkeydown = (function(e){

		var textarea = e.target;
		var div = dataInputDiv;

		//check if data is correct
	    game.time.events.add(1, function(){
	    	try {
				eval('var tmp = '+textarea.value);
				if (typeof tmp === 'object'){
					div.style.backgroundColor = 'green';
					div.proper = true;
				}else {
					div.style.backgroundColor = 'red';
					div.proper = false;
				}
			}catch(e){
				div.style.backgroundColor = 'red';
				div.proper = false;
			}
	    });


	    if(e.keyCode==9 || e.which==9){
	        e.preventDefault();
	        var s = textarea.selectionStart;
	        textarea.value = textarea.value.substring(0,textarea.selectionStart) + "\t" + textarea.value.substring(textarea.selectionEnd);
	        textarea.selectionEnd = s+1; 
	    }

	    if(e.keyCode == 83 && e.ctrlKey) {
	    	e.preventDefault();
	    	if (div.proper){
	    		this.closeCurrent();
	    		div.callback.call(div.context,textarea.value);
	    	}
	    	return false;

	    }

	    if (e.keyCode == 27) {
			this.closeCurrent();
	    } 

	}).bind(this);

	dataInputDiv.textarea = input;

	dataInputDiv.appendChild(input);
	document.body.appendChild(dataInputDiv);
	
	dataInputDiv.style.display = 'none';
	dataInputDiv.style.position = 'fixed';


	return dataInputDiv;

};

G.ModifyDOMLayer.prototype.openExtraData = function(label,data,callback,context){

	console.log('openExtraData');

	this.openElement = this.extraDataDiv;

	this.extraDataDiv.style.backgroundColor = 'green';
	this.extraDataDiv.callback = callback || function(){};
	this.extraDataDiv.context = context || this;

	this.extraDataDiv.style.display = 'block';
	game.input.enabled = false;

	if (data) {
		if (typeof data === 'object'){
			data = JSON.stringify(data,null,"\t");
		}
	}else {
		data = '';
	}

	this.extraDataDiv.textarea.value = data;

	game.time.events.add(1,function(){
		this.extraDataDiv.textarea.focus();
	},this);

};


G.ModifyDOMLayer.prototype.initInputDiv = function(){

	var inputDiv = document.createElement('DIV');
	inputDiv.style.backgroundColor = 'gray';
	inputDiv.style.left = '30%';
	inputDiv.style.top = '10%';
	inputDiv.style.position = 'fixed';
	inputDiv.style.width = '40%';
	inputDiv.style.textAlign = 'center';
	inputDiv.style.padding = '10px';
	inputDiv.style.fontFamily = 'Verdana';

	var span = document.createElement('h3');

	var filterLabel = document.createElement('SPAN');
	filterLabel.style.float = 'right';

	var initValue = document.createElement('SPAN');
	initValue.style.float = 'left';

	span.innerHTML = '';

	var input = document.createElement('INPUT');
	input.style.width = '90%';
	input.style.fontSize = '25px';

	input.onkeydown = (function(e){

		var textarea = e.target;
		var div = inputDiv;

	    if((e.keyCode == 83 && e.ctrlKey) || (e.keyCode == 13)) {
	    	e.preventDefault();

	    	var filteredValue = div.filter(textarea.value);

	    	if (filteredValue === undefined){

	    		div.style.backgroundColor = 'red';
	    		game.time.events.add(50,function(){
	    			div.style.backgroundColor = 'gray';
	    		});


	    	}else{

	    		this.closeCurrent();
    			div.callback.call(div.context,filteredValue);

	    	}
	    	return false;
	    }

	    if (e.keyCode == 27) {
			this.closeCurrent();
	    } 

	}).bind(this);

	inputDiv.appendChild(span);
	inputDiv.appendChild(input);
	inputDiv.appendChild(filterLabel);
	inputDiv.appendChild(initValue);
	document.body.appendChild(inputDiv);

	inputDiv.span = span;
	inputDiv.textarea = input;
	inputDiv.input = input;
	inputDiv.filterLabel = filterLabel;
	inputDiv.initValue = initValue;

	inputDiv.filters = {
		number: function(value){
			var parsed = parseFloat(value);
			if (isNaN(parsed)){
				return undefined;
			}else{
				return parsed;
			}
		},
		string: function(value){

			if (value.length == 0) return undefined;

			return value;
		},
		none: function(value){
			return value;
		}
	}

	inputDiv.style.display = 'none';
	inputDiv.style.position = 'fixed';

	return inputDiv;

};

G.ModifyDOMLayer.prototype.openInputDiv = function(label,initValue,callback,context,filter){

	if (!this.inputDataDiv){
		this.initInputArea();
	}

	this.openElement = this.inputDataDiv;

	this.inputDataDiv.style.display = 'block';
	game.input.enabled = false;

	this.inputDataDiv.span.innerHTML = label || '';

	this.inputDataDiv.input.value = initValue;

	this.inputDataDiv.callback = callback || function(){};
	this.inputDataDiv.context = context || this;

	filter = filter || 'none';
	this.inputDataDiv.filter = this.inputDataDiv.filters[filter];
	this.inputDataDiv.filterLabel.innerHTML = filter;

	this.inputDataDiv.initValue.innerHTML = 'init val: '+initValue;

	game.time.events.add(1,function(){
		this.inputDataDiv.input.focus();
		this.inputDataDiv.input.select();
	},this);

};


G.ModifyFrameSelector = function() {

	Phaser.Group.call(this,game);

	this.panelWidth = 300;

	this.gfx = game.make.graphics();
	this.add(this.gfx);
	this.gfx.beginFill(0xdddddd,1);
	this.gfx.drawRect(0,0,this.panelWidth,game.height);
	this.gfx.inputEnabled=true;
	this.gfx.events.onInputDown.add(function(){});
	this.framesBtns = [];
	this.framesGroup = this.add(game.add.group());
	this.framesGroup.y = 50;

	this.topGroup = this.add(this.createTopBar());
	this.bottomGroup = this.add(this.createBottomBar());

	this.opened = false;

	this.onFrameClicked = new Phaser.Signal();

	
};

G.ModifyFrameSelector.prototype = Object.create(Phaser.Group.prototype);

G.ModifyFrameSelector.prototype.open = function() {

	this.opened = true;

};

G.ModifyFrameSelector.prototype.close = function() {

	this.opened = false;

};

G.ModifyFrameSelector.prototype.update = function() {

	if (this.opened) {
		this.x = game.world.bounds.x+game.width-this.panelWidth;
	}else {
		this.x = game.world.bounds.x+game.width;
	}

	this.bottomGroup.y = game.world.bounds.y+game.height-this.bottomGroup.height;


};

G.ModifyFrameSelector.prototype.loadAtlas = function(atlasName) {

	var columnsNr = 5;
	var collWidth = this.panelWidth/columnsNr;

	this.framesGroup.removeAll();

	var arrayToIterate = atlasName == '__singleImages' ? this.__singleImages : game.cache.getFrameData(atlasName)._frames;


	for (var i = 0; i < arrayToIterate.length; i++) {

		var col = i % columnsNr;
		var row = Math.floor(i/columnsNr);
		var name = arrayToIterate[i].name

		this.createFrameButton(col*collWidth,row*collWidth,name,collWidth,atlasName ==  '__singleImages')

	}


};

G.ModifyFrameSelector.prototype.createBottomBar = function() {

	var bottomGroup = game.add.group();
	bottomGroup.gfx = game.add.graphics();
	bottomGroup.gfx.beginFill(0xcccccc,1);
	bottomGroup.gfx.drawRect(0,0,this.panelWidth,20);
	bottomGroup.gfx.inputEnabled = true;
	bottomGroup.gfx.events.onInputDown.add(function() {});
	bottomGroup.add(bottomGroup.gfx);

	var style = {
		font: 'Verdana',
		fontSize: 15,
		fontWeight: 'bold'
	}

	var buttons = [
		game.make.text(10, 2, 'UP', style),
		game.make.text(10+this.panelWidth*0.3, 2, 'DOWN',style),
		game.make.text(10+this.panelWidth*0.6, 2, 'CLOSE',style)
	];

	buttons.forEach(function(b) {
		bottomGroup.add(b);
		b.inputEnabled = true;
		b.hitArea = new Phaser.Rectangle(0,0,b.width,b.height);
		b.input.useHandCursor = true;
	}); 

	buttons[0].events.onInputDown.add(function() {
		this.framesGroup.y += 300;
		this.framesGroup.y = Math.min(50,this.framesGroup.y);
		//this.framesGroup.y = Math.min(this.framesGroup.y,this.framesGroup.height-game.height);
	},this);

	buttons[1].events.onInputDown.add(function() {
		this.framesGroup.y -= 300;
		this.framesGroup.y = Math.min(this.framesGroup.y,-(this.framesGroup.height-game.height));
	},this);

	buttons[2].events.onInputDown.add(function() {
		this.opened = false;
	},this);	

	return bottomGroup;

};

G.ModifyFrameSelector.prototype.createTopBar = function() {

	var topGroup = game.add.group();
	this.topGroup = topGroup;
	topGroup.gfx = game.add.graphics();
	topGroup.gfx.beginFill(0xcccccc,1);
	topGroup.gfx.drawRect(0,0,this.panelWidth,25);
	topGroup.gfx.inputEnabled = true;
	topGroup.gfx.events.onInputDown.add(function() {});
	topGroup.add(topGroup.gfx);

	var imgCache = game.cache._cache.image
	this.__singleImages = [];

	var i = 0;

	for (prop in imgCache) {

		if (prop[0] == '_' && prop[1] == '_') continue;

		//singleImg
		if (imgCache[prop].frame) {

			this.__singleImages.push({name:imgCache[prop].key});

		}else {

			this.createAtlasButton(5+(i*25),2,(i+1),prop);
			i++;

		}

	}

	this.createAtlasButton(5+(i*25)+10,2,'img','__singleImages');

	return topGroup;

};

G.ModifyFrameSelector.prototype.createAtlasButton = function(x,y,label,atlas) {

	var txt = game.make.text(x, y, label,{
		font: 'Verdana',
		fontSize: 15,
		fontWeight: 'bold'
	});
	
	this.topGroup.add(txt);
	txt.inputEnabled = true;
	txt.atlas = atlas;
	txt.hitArea = new Phaser.Rectangle(0,0,txt.width,txt.height);
	txt.input.useHandCursor = true;
	txt.frameSelector = this;
	txt.events.onInputDown.add(function() {
		this.frameSelector.framesGroup.y = 50;
		this.frameSelector.loadAtlas(this.atlas);
	},txt);

};


G.ModifyFrameSelector.prototype.createFrameButton = function(x,y,frame,tileSize,singleImgs) {

	var img = G.makeImage(x,y,frame,0,this.framesGroup);
	img.inputEnabled = true;
	img.FS = this;
	img.singleImgs = singleImgs;
	img.events.onInputDown.add(function() {
		console.log(this.key);
		this.FS.onFrameClicked.dispatch(this.singleImgs ? this.key : this.frameName);
	},img);
	img.input.useHandCursor = true;
	if (img.width > img.height) {
		img.width = tileSize*0.95;
		img.scale.y = img.scale.x;
	}else {
		img.height = tileSize*0.95;
		img.scale.x = img.scale.y;
	}

}
G.ModifyInputBlocked = function(){

	Phaser.Graphics.call(this,game,0,0);

	this.beginFill(0xff0000,0.0001);
	this.drawRect(0,0,5000,4000);
	this.inputEnabled=true;
	this.events.onInputDown.add(function(){});
	this.fixedToCamera = true;

};

G.ModifyInputBlocked.prototype = Object.create(Phaser.Graphics.prototype);
G.ModifyPropButton = function(modify, x,y,label,refreshFunc,setFunc,postSet){
	
	Phaser.Text.call(this,game,x,y,label+': ',{
		font: 'Verdana',
		backgroundColor: 'rgba(255,255,255,0.5)',
		fontSize: 15
	});

	this.label = label;

	this.modify = modify;

	if (typeof refreshFunc === 'string') {
		this.refreshProp = refreshFunc.split('.');
	}else {
		this.refreshFunc = refreshFunc;
	}

	if (typeof setFunc === 'string'){
		this.filterProperty = setFunc.slice(0,setFunc.indexOf(':'));
		this.setProp =	setFunc.slice(setFunc.indexOf(':')+1).split('.');
		this.setFunc = this.openInput;
	}else{
		this.setFunc = setFunc;
	}

	this.postSet = postSet;

	this.inputEnabled = true;
	this.input.useHandCursor = true;

	this.events.onInputDown.add(this.setFunc,this);

};

G.ModifyPropButton.prototype = Object.create(Phaser.Text.prototype);

G.ModifyPropButton.prototype.setFunc = function(){

	var obj = this.modify.getCurrentObject();

	if (!obj) return;

	var value = this[this.askFunc]();

	if (value === null) return;

	this.modify.modifyCurrentObjProp(this.refreshProp,value);

	if (this.postSet){
		this.postSet(obj,value);
	}

};

G.ModifyPropButton.prototype.openInput = function(){

	var obj = this.modify.getCurrentObject();

	this.modify.domLayer.openInputDiv(
		(obj.___LABEL || 'obj')+' | '+this.setProp,
		G.Utils.getObjProp(obj,this.setProp),
		function(value){
			this.modify.modifyCurrentObjProp(this.refreshProp,value);
			if (this.postSet){
				this.postSet(obj,value);
			}
		},
		this,
		this.filterProperty);

};

G.ModifyPropButton.prototype.refreshFunc = function(obj){

	this.setText(this.label+': ---');

	var obj = this.modify.getCurrentObject();

	if (!obj) return;

	this.visible = true;
	var currentObj = obj;

	var val = G.Utils.getObjProp(obj,this.refreshProp);

	if (val === undefined){
		this.visible = false;
	}else{
		if (typeof val === 'number'){
			val = val.toFixed(2);
		}

		this.setText(this.label+': '+val);
	}

};

G.ModifyPropButton.prototype.int = function() {
	var input = prompt(this.label || 'int');
	var parsedInput = parseInt(input);
	if (isNaN(parsedInput)) return null;

	return parsedInput;
};

G.ModifyPropButton.prototype.float = function() {
	var input = prompt(this.label || 'float');
	var parsedInput = parseFloat(input);
	if (isNaN(parsedInput)) return null;
	return parseFloat(parsedInput.toFixed(2));
};

G.ModifyPropButton.prototype.string = function(){
	return prompt(this.label || 'string');
};
G.ModifyPropGroup = function(modify){

	Phaser.Group.call(this,game);
	this.fixedToCamera = true;

	var x = new G.ModifyPropButton(modify,10,10,'x','x','number:x');
	this.add(x);

	var y = new G.ModifyPropButton(modify,10,30,'y','y','number:y');
	this.add(y); 

	var width = new G.ModifyPropButton(modify,10,50,'width','width','number:width');
	this.add(width); 

	var height = new G.ModifyPropButton(modify,10,70,'height','height','number:height');
	this.add(height); 

	var scaleX = new G.ModifyPropButton(modify,10,90,'scale.x','scale.x','number:scale.x');
	this.add(scaleX); 

	var scaleY = new G.ModifyPropButton(modify,10,110,'scale.y','scale.y','number:scale.y');
	this.add(scaleY); 

	var angle = new G.ModifyPropButton(modify,10,130,'angle','angle','number:angle');
	this.add(angle); 

	var alpha = new G.ModifyPropButton(modify,10,150,'alpha','alpha','number:alpha');
	this.add(alpha);

	var visible = new G.ModifyPropButton(modify,10,170,'visible','visible',function(){
		var obj = this.modify.getCurrentObject();
		this.modify.modifyCurrentObjProp('visible',!obj.visible);
	});
	this.add(visible);

	var anchorX = new G.ModifyPropButton(modify,10,190,'anchor.x','anchor.x','number:anchor.x');
	this.add(anchorX); 

	var anchorY = new G.ModifyPropButton(modify,10,210,'anchor.y','anchor.y','number:anchor.y');
	this.add(anchorY); 

	var frame = new G.ModifyPropButton(modify,10,230,'frame','frameName',function(){
		modify.frameSelector.open();
	});
	this.add(frame);

	var fontSize = new G.ModifyPropButton(modify,10,250,'fontSize','fontSize','number:fontSize',function(obj,value){

		if (obj.cacheAsBitmap){
			obj.orgFontSize = value;
			if (obj.setText) obj.setText(obj.text);
		}

		//in case of labelgroup
		if (obj.refresh) obj.refresh();
	});
	this.add(fontSize);

	var font = new G.ModifyPropButton(modify,10,270,'font','font',function(){

		var obj = this.modify.getCurrentObject();

		var keys = Object.keys(game.cache._cache.bitmapFont);
		var fontIndex = keys.indexOf(obj.font);
		this.modify.modifyCurrentObjProp('font',keys[(fontIndex+1)%keys.length]);
		if (obj.cacheAsBitmap){
			if (obj.setText) obj.setText(obj.text);
		}

		//in case of labelgroup
		if (obj.refresh) obj.refresh();
	});
	this.add(font);

	var text = new G.ModifyPropButton(modify,10,290,'text','text','string:text',function(obj){
		if (obj.cacheAsBitmap){
			if (obj.setText) obj.setText(obj.text);
		}
	});
	this.add(text);


	var maxUserWidth = new G.ModifyPropButton(modify,10,310,'maxUserWidth','maxUserWidth','number:maxUserWidth',function(obj,value){
		if (obj.cacheAsBitmap){
			obj.setText(obj.text);
		}
	});
	this.add(maxUserWidth);

	var maxUserHeight = new G.ModifyPropButton(modify,10,330,'maxUserHeight','maxUserHeight','number:maxUserHeight',function(obj,value){
		if (obj.cacheAsBitmap){
			obj.setText(obj.text);
		}
	});
	this.add(maxUserHeight);


	var fixedToCamera = new G.ModifyPropButton(modify,10,350,'fixedToCamera','fixedToCamera',function(){
		var obj = this.modify.getCurrentObject();
		this.modify.modifyCurrentObjProp('fixedToCamera',!obj.fixedToCamera);
	});
	this.add(fixedToCamera);

	var cameraOffsetX = new G.ModifyPropButton(modify,10,370,'cameraOffset.x','cameraOffset.x','number:cameraOffset.x');
	this.add(cameraOffsetX);

	var cameraOffsetY = new G.ModifyPropButton(modify,10,390,'cameraOffset.y','cameraOffset.y','number:cameraOffset.y');
	this.add(cameraOffsetY);

	//(modify, x,y,label,refreshFunc,setFunc,postSet)

	var data = new G.ModifyPropButton(modify,10,420,'EXTRA_DATA',function(){

			var obj = this.modify.getCurrentObject();

			if (!obj) return;

			if (obj && obj.___DATA) {
				this.setText(this.label+': YES');
			}else {
				this.setText(this.label+': ---');
			}	

	},function(){

		var obj = this.modify.getCurrentObject();

		this.modify.domLayer.openExtraData(obj.label, obj.___DATA || {},function(newData){

			//means empty string
			if (!newData) {
				delete obj.___DATA;
			}else {

				try {
					eval('var tmp = '+newData);

					if (typeof tmp === 'object'){
						obj.___DATA = tmp;
						//obj.___DATAPARSED = tmp;
					}else {
						console.warn('extra data cannot be a string');
					}

				}catch(e){
					console.warn('something went wrong with parsing value');
				}

			}

		});

	});
	this.add(data);


};

G.ModifyPropGroup.prototype = Object.create(Phaser.Group.prototype);

G.ModifyPropGroup.prototype.update = function(){

	var yy = 10;

	this.forEach(function(child,index){
		child.refreshFunc()
		if (child.visible) {
			child.y = yy;
			yy += 20;
		}
	});
	//this.cameraOffset.y = this.groupTxt.cameraOffset.y+this.groupTxt.height+50;

};
if (typeof G == 'undefined') G = {};

G.Utils = {
	
	lerp: function(valCurrent,valTarget,lerp,snapRange) {
	  if (snapRange && Math.abs(valCurrent-valTarget) <= snapRange) {
	    return valTarget;
	  }
	  return valCurrent+lerp*(valTarget-valCurrent);
	},
	
	copyToClipboard: function(text){

		if (!this.copyArea) {
			this.copyArea = document.createElement("textarea");
			this.copyArea.style.positon = 'fixed';
			this.copyArea.style.opacity = 0;
			document.body.appendChild(this.copyArea);

		}

		this.copyArea.value = text;
		this.copyArea.select();
		document.execCommand('copy');

	},

	getObjProp: function(obj,prop){

		var current = obj;
		if (typeof prop == 'string') {
			prop = prop.split('.');
		}

		try {
			for (var i = 0; i < prop.length; i++){
				current = current[prop[i]];
			}
		}	catch(e){
			return undefined;
		}

		return current;

	},

	setObjProp: function(obj,prop,val){

		var currentObj = obj;
		if (typeof prop == 'string') {
			prop = prop.split('.');
		}

		try {
			for (var i = 0; i < prop.length-1; i++){
				currentObj = currentObj[prop[i]];
			}	
			currentObj[prop[prop.length-1]] = val;
		}catch(e){
			return null;
		}

	},

	replaceAll: function(string,search,replacement){
    return string.split(search).join(replacement);
	},

	makeTextButton: function(x,y,label,func,context,style) {

		var txt = game.add.text(x,y,label,style);
		txt.inputEnabled = true;
		txt.input.useHandCursor = true;
		txt.hitArea = new Phaser.Rectangle(0,0,txt.width,txt.height);
		txt.events.onInputDown.add(func,context);
		return txt;

	}

};
if (typeof G == 'undefined') G = {};

G.Mover = function(groupToMove) {
 
 Phaser.Group.call(this,game);

 this.groupToMove = groupToMove;

 this.currentIndex = 0;

 this.keys = game.input.keyboard.addKeys({z: Phaser.Keyboard.Z, x: Phaser.Keyboard.X, c: Phaser.Keyboard.C, minus: Phaser.Keyboard.MINUS, plus: Phaser.Keyboard.PLUS});
 
 this.keys.plus.onDown.add(function() {
  if (!this.grouptoMove) return;
  this.currentIndex++;
  this.currentIndex = this.currentIndex % this.groupToMove.length;
 },this);

 this.keys.minus.onDown.add(function() {
  if (!this.grouptoMove) return;
  this.currentIndex--;
  if (this.currentIndex == -1) this.currentIndex = this.groupToMove.length-1;
 },this);

 this.cursors = game.input.keyboard.createCursorKeys();


};

G.Mover.prototype = Object.create(Phaser.Group.prototype);


G.Mover.prototype.update = function() {

  if (!this.groupToMove) return;

  var val = 1;

  if (this.keys.z.isDown) {
    val = 5;
  }
  if (this.keys.x.isDown) {
    val = 10;
  }
  if (this.keys.c.isDown) {
    val = 20;
  }


  if (this.cursors.up.isDown) {
    this.groupToMove.children[this.currentIndex].y -= val;
  }

  if (this.cursors.down.isDown) {
    this.groupToMove.children[this.currentIndex].y += val;
  }

  if (this.cursors.left.isDown) {
    this.groupToMove.children[this.currentIndex].x -= val;
  }

  if (this.cursors.left.isDown) {
    this.groupToMove.children[this.currentIndex].x += val;
  }

};
G.MultiLineText = function(x,y,font,text,size,max_width,max_height,align,hAnchor,vAnchor) {  
  
  x = G.l(x);
  y = G.l(y);
  size = G.l(size);
  max_width = G.l(max_width);
  max_height = G.l(max_height);

  Phaser.BitmapText.call(this, game, x, y, font,'',size);
    



  //this.maxWidth = max_width;
  this.splitText(text,max_width);

  this.align = align || 'center';
  
  if (max_height) {
      while (this.height > max_height) {
        this.fontSize -= 2;
        this.splitText(text,max_width);
        this.updateText();
      }
  }

  this.hAnchor = typeof hAnchor == 'number' ? hAnchor : 0.5;
  this.vAnchor = typeof vAnchor == 'number' ? vAnchor : 0;

  this.cacheAsBitmap = true; 
  this._cachedSprite.anchor.setTo(this.hAnchor,this.vAnchor);

};

G.MultiLineText.prototype = Object.create(Phaser.BitmapText.prototype);

G.MultiLineText.prototype.splitText = function(text,max_width) {

  var txt = text;
  var txtArray = [];
  var prevIndexOfSpace = 0;
  var indexOfSpace = 0;
  var widthOverMax = false;

  while (txt.length > 0) {

    prevIndexOfSpace = indexOfSpace;
    indexOfSpace = txt.indexOf(' ',indexOfSpace+1);

    
    if (indexOfSpace == -1) this.setText(txt);
    else this.setText(txt.substring(0,indexOfSpace));
    this.updateText();

    if (this.width > max_width) {

      if (prevIndexOfSpace == 0 && indexOfSpace == -1) {
        txtArray.push(txt);
        txt = '';
        indexOfSpace = 0;
        continue;
      }

      if (prevIndexOfSpace == 0) {
        txtArray.push(txt.substring(0,indexOfSpace));
        txt = txt.substring(indexOfSpace+1);
        indexOfSpace = 0;
        continue;
      }

      txtArray.push(txt.substring(0,prevIndexOfSpace));
      txt = txt.substring(prevIndexOfSpace+1);
      indexOfSpace = 0;


    }else {
      //ostatnia linijka nie za dluga
      if (indexOfSpace == -1) {
        txtArray.push(txt);
        txt = '';
      } 

    }
  
  }


  this.setText(txtArray.join('\n'));


};



G.MultiLineText.prototype.popUpAnimation = function() {
  
  this.cacheAsBitmap = false;

  var char_numb = this.children.length;
 
  //
  var delay_array = [];
  for (var i = 0; i < char_numb; i++) {
    delay_array[i] = i;
  }
 
  delay_array = Phaser.ArrayUtils.shuffle(delay_array);
  delay_index = 0;
  this.activeTweens = 0;

  this.children.forEach(function(letter) {
 
      if (letter.anchor.x == 0) {
        letter.x = letter.x + (letter.width*0.5);
        letter.y = letter.y + letter.height;
        letter.anchor.setTo(0.5,1);
      }
      var target_scale = letter.scale.x;
      letter.scale.setTo(0,0);
      this.activeTweens++;
      var tween = game.add.tween(letter.scale)
        .to({x:target_scale*1.5,y:target_scale*1.5},200,Phaser.Easing.Quadratic.In,false,delay_array[delay_index]*25)
        .to({x:target_scale,y:target_scale},200,Phaser.Easing.Sinusoidal.In);
      tween.onComplete.add(function() {this.activeTweens--; if (this.activeTweens == 0) {if (this.alive) this.cacheAsBitmap = true;}},this);
      tween.start();
      delay_index++; 
    },this)
};


G.OneLineText = function(x,y,font,text,size,width,hAnchor,vAnchor) {


  Phaser.BitmapText.call(this, game, G.l(x), G.l(y), font, text, G.l(size), G.l(width));

  if (width) {
      while (this.width > G.l(width)) {
        this.fontSize -= 2;
        this.updateText();
      }
  }


  this.hitArea = new Phaser.Rectangle(0,0,0,0);

  this.orgFontSize = G.l(size);

  this.maxUserWidth = G.l(width);

  

  this.hAnchor = hAnchor;
  this.vAnchor = vAnchor;

  this.anchor.setTo(this.hAnchor,this.vAnchor);
  this.updateText();


  this.insertCoin(this.fontSize);

  this.cacheAsBitmap = true;

  this.updateCache();

  //this._cachedSprite.anchor.setTo(typeof this.hAnchor == 'undefined' ? 0.5 : this.hAnchor,this.vAnchor || 0);

  //this.x -= Math.floor(this.width*0.5);


};

G.OneLineText.prototype = Object.create(Phaser.BitmapText.prototype);

G.OneLineText.prototype.insertCoin = function(size) {


  if (this.text.indexOf('$$') == -1) return;


  this.children.forEach(function(element,index,array) {

    if (!element.name) return;

    if (element.name == "$" && element.visible) {
      if (index+1 <= array.length-1 && array[index].name == '$') {

        var el = element;
        var el2 = array[index+1];

        el.visible = false;
        el2.visible = false;
        coin = G.makeImage(el.x+(size*0.05),el.y-(size*0.05),'coin');
        coin.width = size;
        coin.height = size;
        el.parent.addChild(coin);


      }
    }


  });

} 


G.OneLineText.prototype.setText = function(text) {

  Phaser.BitmapText.prototype.setText.call(this,text.toString());

  var oldScaleX = this.scale.x;
  var oldScaleY = this.scale.y;
  var oldAlpha = this.alpha;
  var oldAngle = this.angle;

  this.alpha = 1;
  this.scale.setTo(1);


  if (this.maxUserWidth) {
    this.fontSize = this.orgFontSize;
    this.updateText();
    var i = 0;
    while (this.width > this.maxUserWidth) {
      this.fontSize -= 1;
      this.updateText();
      if (i++ > 30) break;
    }
  }

  if (this.cacheAsBitmap) this.updateCache();

  this.scale.setTo(oldScaleX,oldScaleY);
  this.alpha = oldAlpha;
  this.angle = oldAngle;
  //this._cachedSprite.anchor.setTo(this.hAnchor || 0.5,1);

};


G.OneLineText.prototype.popUpAnimation = function() {
  
  this.cacheAsBitmap = false;

  var char_numb = this.children.length;
 
  //
  var delay_array = [];
  for (var i = 0; i < char_numb; i++) {
    delay_array[i] = i;
  }
 
  delay_array = Phaser.ArrayUtils.shuffle(delay_array);
  delay_index = 0;
  this.activeTweens = 0;

  this.children.forEach(function(letter) {
 
      if (letter.anchor.x == 0) {
        letter.x = letter.x + (letter.width*0.5);
        letter.y = letter.y + letter.height;
        letter.anchor.setTo(0.5,1);
      }
      var target_scale = letter.scale.x;
      letter.scale.setTo(0,0);
      this.activeTweens++;
      var tween = game.add.tween(letter.scale)
        .to({x:target_scale*1.5,y:target_scale*1.5},200,Phaser.Easing.Quadratic.In,false,delay_array[delay_index]*25)
        .to({x:target_scale,y:target_scale},200,Phaser.Easing.Sinusoidal.In);
      tween.onComplete.add(function() {this.activeTweens--; if (this.activeTweens == 0) {if (this.alive) this.cacheAsBitmap = true;}},this);
      tween.start();
      delay_index++; 
    },this)
};

G.OneLineText.prototype.scaleOut = function(onComplete,context) {
  this.cacheAsBitmap = false;

  this.activeTweens = 0;


  this.children.forEach(function(letter,index) {

      if (letter.anchor.x == 0) {
        letter.x = letter.x + letter.width*0.5;
        letter.y = letter.y + letter.height*0.5;
        letter.anchor.setTo(0.5,0.5);
      }
      this.activeTweens++;
      letter.scale.setTo(letter.scale.x,letter.scale.y);

      var tween = game.add.tween(letter.scale)
        .to({x:0,y:0},400,Phaser.Easing.Cubic.In,false,index*20);
      tween.onComplete.add(function() {
        this.activeTweens--;
        if (this.activeTweens == 0) {this.destroy()}
       },this);
      tween.start();
    },this)

}





G.OneLineCounter = function(x,y,font,amount,size,width,hAnchor,vAnchor,preText,postText) {
  
  G.OneLineText.call(this,x,y,font,amount.toString(),size,width,hAnchor,vAnchor);

  this.amount = amount;
  this.amountDisplayed = amount;
  this.amountMaxInterval = 5;
  this.amountMaxNegInterval = -5;

  this.absoluteDisplay = false;
  this.fixedToDecimal = 0;

  this.stepCurrent = 0;
  this.step = 0;

  this.preText = preText || '';
  this.postText = postText || '';

};

G.OneLineCounter.prototype = Object.create(G.OneLineText.prototype);

G.OneLineCounter.prototype.update = function() {
  
  if (this.amountDisplayed != this.amount && this.stepCurrent-- <= 0) {
    this.stepCurrent = this.step;
  
    if (this.amountDisplayed != this.amount) {

      var diff = this.amount - this.amountDisplayed;

      this.amountDisplayed += game.math.clamp(diff,this.amountMaxNegInterval,this.amountMaxInterval);


      var valueToDisplay = this.amountDisplayed;

      if (this.absoluteDisplay) {valueToDisplay = Math.abs(valueToDisplay)};
      if (this.fixedTo != 0) {valueToDisplay = valueToDisplay.toFixed(this.fixedToDecimal)};

      this.setText(this.preText+valueToDisplay+this.postText);

    } 

  }

};

G.OneLineCounter.prototype.changeAmount = function(amount) {
  this.amount = amount;
};

G.OneLineCounter.prototype.increaseAmount = function(change) {
  this.amount += change;
};

G.OneLineCounter.prototype.changeIntervals = function(max,maxNeg) {

  if (typeof maxNeg == 'undefined') {
    this.amountMaxInterval = max;
    this.amountMaxNegInterval = -max;
  }else {
    this.amountMaxInterval = max;
    this.amountMaxNegInterval = maxNeg;
  }

} 

G.PartCacher = function() {

	Phaser.Group.call(this,game);
	
	this.active = false;	
	
	this.every = 1;

	this.rt = game.add.renderTexture(10,10);

	this.frameCounter = 0;

};

G.PartCacher.prototype = Object.create(Phaser.Group.prototype);

G.PartCacher.prototype.update = function() {

	if (!this.active) return;

	this.stepForward();

	if (!this.checkChildren()) {
		this.active = false;
		this.removeAll(true,true);
		return;
	}

	if (this.frameCounter % this.frameRate === 0) {
		this.saveFrame();
		this.frameNr++;
	}
	this.frameCounter++;

};

G.PartCacher.prototype.stepForward = function() {
	
	for (var i = this.children.length; i--; ) {
		this.children[i].update();
	}

};

G.PartCacher.prototype.start = function(fileName,frameRate){ 

	this.fileName = fileName;
	this.frameNr = 0;
	this.frameRate = 60/frameRate;
	this.active = true;
	this.frameCounter = 0;

};

G.PartCacher.prototype.saveFrame = function() {

	var bounds = this.getBounds();

  var widthFromCenter = Math.max(this.x-bounds.x,bounds.x+bounds.width-this.x)+100;
  var heightFromCenter = Math.max(this.y-bounds.y,bounds.y+bounds.height-this.y)+100;
  this.rt.resize(widthFromCenter*2, heightFromCenter*2, true);
  this.rt.renderXY(this, widthFromCenter, heightFromCenter, true);

  var c = this.rt.getCanvas();
  var fileName = this.fileName+'_'+this.frameNr;

  c.toBlob(function(blob) {
    saveAs(blob, fileName);
	});

};

G.PartCacher.prototype.checkChildren = function() {

	var inactive = this.children.filter(function(child) {
		return !child.alive || child.alpha === 0 || child.scale.x == 0 || child.scale.y == 0; 
	});

	return this.children.length !== inactive.length;

};
G.PoolGroup = function(elementConstructor,argumentsArray,signal) {
	
	Phaser.Group.call(this,game);

	this._deadArray = [];
	this._elementConstructor = elementConstructor;
	this._argumentsArray = argumentsArray || [];
	this._argumentsArray.unshift(null);

	if (signal) {
		G.sb(signal).add(this.init,this);
	}

}

G.PoolGroup.prototype = Object.create(Phaser.Group.prototype);

G.PoolGroup.prototype.getFreeElement = function() {
	
	var element;

	if (this._deadArray.length > 0) {
		 element = this._deadArray.pop()
	}else {
		element = new (Function.prototype.bind.apply(this._elementConstructor, this._argumentsArray));
		element.events.onKilled.add(this._onElementKilled,this);
	}

	this.add(element);
	return element;

};

G.PoolGroup.prototype._onElementKilled = function(elem) {
	if (this !== elem.parent) return;
	this._deadArray.push(elem);
	this.removeChild(elem)

};

G.PoolGroup.prototype.init = function(fx) {

	var elem = this.getFreeElement();
	elem.init.apply(elem,arguments);

	return elem;

};

G.PoolGroup.prototype.initBatch = function(nr) {

	for (var i = 0; i < nr; i++) {
		this.init.apply(this,[].slice.call(arguments,1));
	}

};
if (typeof G == 'undefined') G = {};


G.sb = {

	clearOnStageChange: false,

	add: function() { 

		var list = Array.isArray(arguments[0]) ? arguments[0] : arguments;
		
		for (var i = 0, len = list.length; i < len; i++) {
			if (this[list[i]]) continue;
			this[list[i]] = new Phaser.Signal();
		}

		if (!this.clearOnStageChange) {
			game.state.onStateChange.add(this.clear,this);
		}

	},
	
	clear: function() {
        var keys = Object.keys(this);
        keys.forEach(function(child) {
            if (this[child].removeNonPermanent) {
                this[child].removeNonPermanent();
            }
        },this)
  }

};



Phaser.Signal.prototype.addPermanent = function() {
	var signalBinding = this.add.apply(this,arguments);
	signalBinding._PERMANENT = true;
	return signalBinding;
};

Phaser.Signal.prototype.removeNonPermanent = function () {

    if (!this._bindings)
    {
        return;
    }

    var n = this._bindings.length;

    while (n--)
    {
            if (!this._bindings[n]._PERMANENT)
            {
                this._bindings[n]._destroy();
                this._bindings.splice(n, 1);
            }
    }

};

//
//	config:
//	vertical: 
//	verticalLerp
//	horizontal
//	horizontalLerp
//

G.SliderPanel = function(x,y,width,height,content,config) {

	Phaser.Group.call(this,game);

	this.sliderWidth = G.l(width);
	this.sliderHeight = G.l(height);

	this.x = x + (this.sliderWidth*-0.5);
	this.y = y + (this.sliderHeight*-0.5);

	//slider mask
	this.gfxMask = game.add.graphics();
	
	this.gfxMask.beginFill(0x000000,1);
	this.gfxMask.drawRect(0,0,width,height);
	
	this.clickableObjects = [];

	this.config = config;
	this.applyConfig(this.config);

	this.addContent(content);
	this.add(this.gfxMask);
	//this.contentGroup.add(this.gfxMask);
	this.contentGroup.mask = this.gfxMask;

	this.slideY = 0;

	

	this.inputSprite = G.makeImage(0,0,null,0,this);
	this.inputSprite.inputEnabled = true;
	this.inputSprite.hitArea = new Phaser.Rectangle(0,0,width,height);

	this.inputSpriteDown = false;

	this.inputData = {
		x: null,
		y: null,
		velX: 0,
		velY: 0,
		xStart: null,
		yStart: null,
		startFrameStamp: null,
		clickDistanceWindow: 10,
		clickTimeWindow: 10,

	};

	//blocks input from buttons bellow
	this.inputSprite.events.onInputDown.add(function(pointer) {
		var p = game.input.activePointer;
		this.inputSpriteDown = true;
		this.inputData.x = this.inputData.xStart = p.worldX;
		this.inputData.y = this.inputData.yStart = p.worldY;
		this.inputData.startFrameStamp = this.frameCounter;
	},this);

	this.inputSprite.events.onInputUp.add(function() {
		var p = game.input.activePointer;
		this.inputSpriteDown = false;
		
		var distance = game.math.distance(this.inputData.xStart,this.inputData.yStart,p.worldX,p.worldY);
		var timeDelta = this.frameCounter - this.inputData.startFrameStamp;

		if (distance <= this.inputData.clickDistanceWindow && timeDelta <= this.inputData.clickTimeWindow) {
			this.propagateClick(p.x,p.y);
			this.inputData.velX = 0;
			this.inputData.velY = 0;
		}

	},this);

	//frameCounter for measuring click window
	//if I would use timestamps during low fps buttons could not work
	this.frameCounter = 0;

};

G.SliderPanel.prototype = Object.create(Phaser.Group.prototype);

G.SliderPanel.prototype.applyConfig = function(config) {

	this.horizontal = config.horizontal || false;
	this.horizontalLerp = config.horizontalLerp || false;
	this.vertical = config.vertical || true;
	this.verticalLerp = config.verticalLerp;

};

//group is at 0,0;
G.SliderPanel.prototype.addContent = function(group) {

	this.changeInputSettings(group);

	this.contentGroup = group;
	this.add(group);
	this.contentGroup.x = 0;

	this.contentGroupMinY = -this.contentGroup.height+this.sliderHeight;
	this.contentGroupMaxY = 0;
	this.contentGroupMinX = this.sliderWidth-this.contentGroup.width;
	this.contentGroupMaxX = 0;


};

//we have to change input settings, because buttons that are not visible
//are not covered by input sprite and they would be clickable
G.SliderPanel.prototype.changeInputSettings = function(group) {

	for (var i = group.children.length; i--; ) {
		var child = group.children[i];
		if (child.inputEnabled) {
			this.clickableObjects.push(child);
			child.inputEnabled = false;
		}
		if (child.children.length > 0) {
				this.changeInputSettings(child);
		}
	}

};

G.SliderPanel.prototype.update = function() {

	this.frameCounter++;

	if (this.inputSpriteDown && game.input.activePointer.isDown) {

		var difX = this.inputData.x - game.input.activePointer.worldX;
		var difY = this.inputData.y - game.input.activePointer.worldY;

		this.inputData.x = game.input.activePointer.worldX;
		this.inputData.y = game.input.activePointer.worldY;

		this.inputData.velX = 0.8 * (difX) + 0.2 * this.inputData.velX;
		this.inputData.velY = 0.8 * (difY) + 0.2 * this.inputData.velY;

		if (this.horizontal) {
			this.contentGroup.x -= this.inputData.velX;
		}

		if (this.vertical) {
			this.contentGroup.y -= this.inputData.velY;
		}

	}else {

		if (this.horizontal) {
			this.contentGroup.x -= this.inputData.velX;
			this.inputData.velX *= 0.95;
			if (Math.abs(this.inputData.velX) < 1) {
				this.inputData.velX = 0;
			}
		}

		if (this.vertical) {
			this.contentGroup.y -= this.inputData.velY;
			this.inputData.velY *= 0.95;
			if (Math.abs(this.inputData.velY) < 1) {
				this.inputData.velY = 0;
			}
		}
		
	}

	if (this.vertical) {
		this.boundRestrict('y',this.verticalLerp,this.contentGroupMinY,this.contentGroupMaxY);
	}

	if (this.horizontal) {
		this.boundRestrict('x',this.horizontalLerp,this.contentGroupMinX,this.contentGroupMaxX);
	}

	this.boundRestrict();
	

};

G.SliderPanel.prototype.propagateClick = function(pX,pY) {

	for (var i = 0; i < this.clickableObjects.length; i++) {
		if (this.clickableObjects[i].getBounds().contains(pX,pY)) {
			this.clickableObjects[i].onInputDown.dispatch();
			break;
		}
	}

};


G.SliderPanel.prototype.boundRestrict = function(prop,lerp,min,max) {

	if (lerp) {
		
		if (this.contentGroup[prop] > max) {
			this.contentGroup[prop] = G.lerp(this.contentGroup[prop],max,0.5);
			if (this.contentGroup[prop] < max+1 ) {
				this.contentGroup[prop] = max;
			}
		}

		if (this.contentGroup[prop] < min) {
			this.contentGroup[prop] = G.lerp(this.contentGroup[prop],min,0.2);
			if (this.contentGroup[prop] > min-1) {
				this.contentGroup[prop] = min;
			}
		}

	}else {

		this.contentGroup[prop] = game.math.clamp(this.contentGroup[prop],min,max);

	}

};
G.StrObjGroup = function(x,y,importObj){
	
	Phaser.Group.call(this,game);

	this.x = x || 0;
	this.y = y || 0;

	this.importObj = typeof importObj === 'string' ? JSON.parse(importObj) : importObj;

	this.parseImportObj(this.importObj);

};

G.StrObjGroup.prototype = Object.create(Phaser.Group.prototype);

G.StrObjGroup.prototype.parseImportObj = function(importObj){

	for (var i = 0; i < importObj.length; i++){

		var chunk = importObj[i];

		var img = G.makeImage(chunk.x,chunk.y,chunk.frame,chunk.anchor,this);
		img.scale.setTo(chunk.scale[0],chunk.scale[1]);
		img.angle = chunk.angle;
		if (chunk.label) {
			this[chunk.label] = img;
		}
		if (chunk.data) {
			//make copy of data
			img.___DATA = JSON.parse(JSON.stringify(chunk.data));
		}

	}	

};
G.Timer = function(x,y,font,fontSize,maxWidth,anchorX,anchorY,secLeft) {
	
	G.OneLineText.call(this,x,y,font,
		secLeft ? G.changeSecToTimerFormat(secLeft) : '???',
		fontSize,maxWidth,anchorX,anchorY);

	this.secLeft = secLeft || 0;
	this.dhms = false;
	this.active = false;

	this.timerBinding = G.sb.onWallClockTimeUpdate.add(this.updateTimer,this);

	this.events.onDestroy.add(function() {
		this.timerBinding.detach();
	},this);

}

G.Timer.prototype = Object.create(G.OneLineText.prototype);


G.Timer.prototype.updateTimer = function() {

	if (!this.active) return;

	this.secLeft = Math.max(0,this.secLeft-1);
	this.setText(G.changeSecToTimerFormat(this.secLeft,this.dhms));

};

G.Timer.prototype.setSecLeft = function(secLeft) {

	this.secLeft = secLeft;
	this.setText(G.changeSecToTimerFormat(this.secLeft,this.dhms));

};

G.Timer.prototype.start = function(secLeft) {

	this.setText(G.changeSecToTimerFormat(this.secLeft,this.dhms));
	this.active = true;

};


G.UITargetParticles = function(minNrOfPart,maxNrOfPart) {
	
	G.PoolGroup.call(this,G.UITargetParticle);
	this.minNrOfPart = minNrOfPart || 3;
	this.maxNrOfPart = maxNrOfPart || 100;

}

G.UITargetParticles.prototype = Object.create(G.PoolGroup.prototype);


G.UITargetParticles.prototype.createDividedBatch = function(x,y,sprite,targetObj,amount,interval,maxPartNr) {

	var batchObj = new G.UITargetParticles.BatchObj();

	var maxPartNr = maxPartNr || 25;
	var partNr = (amount/interval);
	if (partNr > maxPartNr){
		interval = Math.ceil(amount/maxPartNr);
	}

	var nrOfPartsInBatch = Math.floor(amount/interval)+Math.sign(amount % interval);

	for (var i = 0; i < nrOfPartsInBatch; i++) {
		var part = this.init(x,y,sprite,targetObj,Math.min(interval,amount));
		amount -= interval;
		batchObj.add(part);
	}

	return batchObj;

};


G.UITargetParticles.prototype.createBatch = function(x,y,sprite,targetObj,carriedValue,nrOfParts) {

	var batchObj = new G.UITargetParticles.BatchObj();

	for (var i = 0; i < nrOfParts; i++) {
		var part = this.init(x,y,sprite,targetObj,carriedValue);
		batchObj.add(part);
	}

	return batchObj;

};

G.UITargetParticles.prototype.createCoinBatch = function(x,y,targetObj,amount){

	var state = game.state.getCurrentState();

	var batch = this.createDividedBatch(
		x,
		y,
		'coin_1',
		targetObj, 
		amount,
		5);

	batch.addOnPartStart(function() {
		this.scale.setTo(0.75);
		this.vel.setTo(game.rnd.realInRange(-12,12),game.rnd.realInRange(-12,12));
	});

	batch.addOnPartFinish(function() {
		G.sfx.pop.play();
		G.saveState.changeCoins(this.carriedValue);
	});

	batch.start();

};

G.UITargetParticles.BatchObj = function() {

	this.parts = [];
	this.nrOfParts = 0;
	this.nrOfFinished = 0;
	this.onFinish = new Phaser.Signal();

};

G.UITargetParticles.BatchObj.prototype.add = function(part) {

	this.parts.push(part);
	part.onFinish.addOnce(this.onPartFinish,this);
	this.nrOfParts++;

};

G.UITargetParticles.BatchObj.prototype.onPartFinish = function() {
	this.nrOfFinished++;
	if (this.nrOfFinished == this.nrOfParts) {
		this.onFinish.dispatch();
	}
};

G.UITargetParticles.BatchObj.prototype.addOnPartStart = function(func,context) {

	this.parts.forEach(function(part) {
		part.onStart.addOnce(func,context || part,1);
	});
	
};

G.UITargetParticles.BatchObj.prototype.addOnPartFinish = function(func,context) {
	
	this.parts.forEach(function(part) {
		part.onFinish.addOnce(func,context || part,1);
	});

};

G.UITargetParticles.BatchObj.prototype.start = function(delayBetween) {

	var delay = 0;
	this.parts.forEach(function(part) {
		part.start(delay);
		delay += delayBetween || 0;
	})

};





G.UITargetParticle = function() {

	G.Image.call(this,0,0,null,0.5);
	this.onStart = new Phaser.Signal();
	this.onFinish = new Phaser.Signal();
	
	this.speed = 0;
	this.speedMax = 30;
	this.speedDelta = 0.75;

	

	this.vel = new Phaser.Point(0,0);
	this.velInit = new Phaser.Point(0,0);

	this.kill();

};

G.UITargetParticle.prototype = Object.create(G.Image.prototype);

G.UITargetParticle.prototype.init = function(x,y,sprite,targetObj,carriedValue) {

	this.position.setTo(x,y);
	
	this.changeTexture(sprite);

	this.onStart.removeAll();
	this.onFinish.removeAll();

	this.carriedValue = carriedValue || 1;

	this.targetObj = targetObj;


	this.stopTweens(this);
	this.scale.setTo(1);
	this.alpha = 1;

	this.speed = 0;
	this.speedMax = 30;
	this.speedDelta = 0.75;

	this.vel.setTo(0,0);

};

G.UITargetParticle.prototype.start = function(delay) {

	if (delay) {
		game.time.events.add(delay,this.start,this);
		return;
	}
	
	this.revive();

	//because updateTransform will happen after update :/
	this.worldPosition.x = 9999;
	this.worldPosition.y = 9999;
	
	this.onStart.dispatch(this,this.carriedValue);

};

G.UITargetParticle.prototype.update = function() {

	if (!this.alive) return;

	this.position.add(this.vel.x,this.vel.y);
	this.vel.x *= 0.95;
	this.vel.y *= 0.95;

	this.speed += this.speedDelta;
	this.speed = Math.min(this.speed,this.speedMax);

	var distanceToTarget = Phaser.Point.distance(this.worldPosition,this.targetObj.worldPosition);
	var angleToTarget = Phaser.Point.angle(this.targetObj.worldPosition,this.worldPosition);
	this.position.add( 
		G.lengthDirX(angleToTarget,Math.min(distanceToTarget,this.speed),true),
		G.lengthDirY(angleToTarget,Math.min(distanceToTarget,this.speed),true)
	);

	if (distanceToTarget < this.speedMax) {
		this.onFinish.dispatch(this,this.carriedValue);
		this.kill();
	};

};
if (typeof G == 'undefined') G = {};

Math.sign = Math.sign || function(x) {
  x = +x; // convert to a number
  if (x === 0 || isNaN(x)) {
    return x;
  }
  return x > 0 ? 1 : -1;
}


if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     'use strict';
     if (this == null) {
       throw new TypeError('Array.prototype.find called on null or undefined');
     }
     if (typeof predicate !== 'function') {
       throw new TypeError('predicate must be a function');
     }
     var list = Object(this);
     var length = list.length >>> 0;
     var thisArg = arguments[1];
     var value;

     for (var i = 0; i < length; i++) {
       value = list[i];
       if (predicate.call(thisArg, value, i, list)) {
         return value;
       }
     }
     return undefined;
    }
  });
}


if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    }
  });
}

G.spritesheetList = [];

G.isImageInCache = function(frameName) {

  var spritesheet = this.checkSheet(frameName)
  if (spritesheet != '') {
    return true;
  }else {
    return game.cache.checkImageKey(frameName);
  }

};


G.checkSheet = function(frame) {
  for (var i = 0, len = this.spritesheetList.length; i < len; i++) {
      if (game.cache.checkImageKey(this.spritesheetList[i]) && game.cache.getFrameData(this.spritesheetList[i]).getFrameByName(frame)) {
          return this.spritesheetList[i];
      }
  } 
  return '';
};

G.lerp = function(a,b,t) {
  return a+t*(b-a);
};

G.l = function(value) {
  return Math.floor(value*G.Loader.currentConfigMulti); 
};

G.lnf = function(value) {
  return value*G.Loader.currentConfigMulti; 
};

G.changeTexture = function(obj,image) {
	var ssheet = this.checkSheet(image);

	if (ssheet == '') {
		obj.loadTexture(image);
	}else {
		obj.loadTexture(ssheet,image);
	};

};

G.txt = function(textIndex) {

  if (!G.lang) G.lang = 'en';
  if (!G.json.languages[G.lang]) G.lang = 'en';
  return G.json.languages[G.lang][textIndex] || 'not found in JSON';

};

G.delta = function() {

  G.deltaTime = Math.min(1.5,game.time.elapsedMS/16);
  if (game.time.elapsedMS == 17) G.deltaTime = 1;
};

G.rotatePositions = function(positions) {

  var result = [];

  for (var i = 0, len = positions.length; i < len; i+=2) {
    result.push(
      positions[i+1]*-1,
      positions[i]
    )
  }

  return result;

};

G.loadTexture = G.changeTexture;

G.makeImage = function(x,y,frame,anchor,groupToAdd) {
    
  var ssheet = this.checkSheet(frame);
  var image;

  if (ssheet == '') {
    image = game.make.image(this.l(x),this.l(y),frame);
  } else {
    image = game.make.image(this.l(x),this.l(y),ssheet,frame);
  }

  if (anchor) {
    if (typeof anchor == 'number') {
        image.anchor.setTo(anchor);
    }else {
        image.anchor.setTo(anchor[0],anchor[1]);
    }
  }

  if (groupToAdd) {
  	(groupToAdd.add || groupToAdd.addChild).call(groupToAdd,image);
  }else if (groupToAdd !== null) {
  	game.world.add(image);
  }

  return image;
};

G.capitalize = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

G.lengthDirX =  function(angle, length, rads) {
  var rads = rads || false;
  if (rads) {
    return Math.cos(angle) * length;
  }else {
    return Math.cos(game.math.degToRad(angle)) * length;
  }
};

G.lengthDirY = function(angle, length, rads) {
  var rads = rads || false;
  if (rads) {
    return Math.sin(angle) * length;
  }else {
    return Math.sin(game.math.degToRad(angle)) * length;
  }
};


G.stopTweens = function(obj) {
    game.tweens._tweens.forEach(function(tween) {
        if (obj.scale && tween.target == obj.scale) tween.stop();
        if (tween.target == obj) tween.stop();
    });
};


G.makeExtImage = function(x,y,url,waitImg,anchor,groupToAdd,tmp,func) {

  if (!G.extLoader) G.extLoader = new G.ExtLoader(game);

  var img;

  if (G.extLoader.loadedUrls[url]) {
    img = G.makeImage(x,y,G.extLoader.loadedUrls[url],anchor,groupToAdd);
    func.call(img);
    return img;
  }

  img = G.makeImage(x,y,waitImg,anchor,groupToAdd);
  img.onImgLoaded = new Phaser.Signal();
  
  if (!G.extImagesKeys) G.extImagesKeys = [];
  var name = 'extImgBlankName'+G.extImagesKeys.length;

  G.extImagesKeys.push(name);

  var binding = G.extLoader.onFileComplete.add(function(progress,key,success) {

    if (key == name && success) {

      G.extLoader.loadedUrls[url] = name;

      G.changeTexture(img,name);
      if (func) func.call(img);
      binding.detach();
    }
    
  });
  game.load.start();

  G.extLoader.image(name, url, true);

  /*if (tmp) {
    G.extLoader.imagesToRemoveOnStateChange.push(name);
  }*/

  return img;

};

G.drawCircleSegment = function(gfx,x,y,radius,angleStart,angleFinish,segments) {

  if (angleStart === angleFinish)
  {
      return gfx;
  }

  if (segments === undefined) {segments = 10};

  var angleDiff = angleFinish-angleStart;
  var segDiff = angleDiff/segments;

  gfx.moveTo(x,y);
  var points = gfx.currentPath.shape.points;

  for ( ; angleStart <= angleFinish; angleStart+=segDiff) {
    points.push(
      Math.floor(x + G.lengthDirX(angleStart,radius,false)),
      Math.floor(y + G.lengthDirY(angleStart,radius,false))
    )
  };

  points.push(
      Math.floor(x + G.lengthDirX(angleFinish,radius,false)),
      Math.floor(y + G.lengthDirY(angleFinish,radius,false))
    )


  gfx.dirty = true;
  gfx._boundsDirty = true;

  return gfx;


};

G.centerElements = function(list,distanceList,center) {

  if (center === undefined) center = 0;
  if (distanceList === undefined) distanceList=[];

  var wholeWidth = 0;

  list.forEach(function(e,i) {
    wholeWidth += e.width;
    console.log("list"+i+" : "+e.width);
    if (distanceList[i-1] !== undefined) {
      console.log("adding distance: "+distanceList[i-1]);
      wholeWidth+=G.l(distanceList[i-1]);
    }
  });

  console.log('whole Width : '+wholeWidth);

  var currentX = center + (wholeWidth*-0.5);
  console.log('currentX: '+currentX);

  list.forEach(function(e,i,a) {
    e.x = currentX;

    console.log(i +': '+e.x);

    e.x += e.width*e.anchor.x;    

    console.log(i +': '+e.x);

    currentX += e.width;
    if (distanceList[i] !== undefined) {
      currentX += G.l(distanceList[i]);
    }
  });

};


G.makeMover = function(obj) {

  if (G.activeMover !== undefined) {
    G.activeMover.destroy();
      G.activeMover.eKey.onDown.removeAll();
  }

  G.activeMover = game.add.image();
  G.activeMover.obj = obj;
  G.activeMover.cursors = game.input.keyboard.createCursorKeys();
  G.activeMover.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);
  G.activeMover.eKey = game.input.keyboard.addKey(Phaser.Keyboard.E);
  G.activeMover.eKey.onDown.add(function() {
      console.log("MOVER: "+this.obj.x+'x'+this.obj.y);
  },G.activeMover)

  G.activeMover.update= function() {

      var moveVal = this.shiftKey.isDown ? 10 : 2;

      if (this.cursors.down.isDown) {
        obj.y += moveVal;
      }   

       if (this.cursors.up.isDown) {
        obj.y -= moveVal;
      }

       if (this.cursors.left.isDown) {
        obj.x -= moveVal;
      }

       if (this.cursors.right.isDown) {
        obj.x += moveVal;
      }

  };

};


G.makeLineEditor = function(interpolation) {

  var be = game.add.group();

  be.interpolation = interpolation || 'linear';
  be.pointsX = [0];
  be.pointsY = [0];



  be.gfx = be.add(game.make.graphics());

  be.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

  be.wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
  be.wKey.onDown.add(function(){

    var xx,yy;

    if (this.children.length > 2) {
      xx = this.children[this.children.length-1].x;
      yy = this.children[this.children.length-1].y;
    }else {
      xx = 0;
      yy = 0;
    }

    var newPoint  = G.makeImage(xx,yy,'candy_1');
    newPoint.anchor.setTo(0.5);
    newPoint.scale.setTo(0.1);
    this.add(newPoint);
    this.activeObject = newPoint;
    this.changed = true;
  },be);

  be.qKey = game.input.keyboard.addKey(Phaser.Keyboard.Q);
  be.qKey.onDown.add(function() {
    if (this.children.length <= 2) return;
    this.removeChildAt(this.children.length-1);
    if (this.children.length > 3) {
      this.activeObject = this.children[this.children.length-1];
    }else {
      this.activeObject = null;
    }
    this.changed = true;
  },be);


  be.aKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
  be.aKey.onDown.add(function() {
    if (!this.activeObject) return;
    var index = this.getChildIndex(this.activeObject);
    if (index == 2) return;
    this.activeObject = this.getChildAt(index-1);
  },be);

  be.sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
  be.sKey.onDown.add(function() {
    if (!this.activeObject) return;
    var index = this.getChildIndex(this.activeObject);
    if (index == this.children.length-1) return;
    this.activeObject = this.getChildAt(index+1);
  },be);

  be.eKey = game.input.keyboard.addKey(Phaser.Keyboard.E);
  be.eKey.onDown.add(function() {
    console.log(JSON.stringify([this.pointsX,this.pointsY]));
  },be);


  be.cursors = game.input.keyboard.createCursorKeys();

  be.activeObject = null;

  be.preview = G.makeImage(0,0,'candy_2',0.5,be);
  be.preview.width = 8;
  be.preview.height = 8;
  be.preview.progress = 0;

  be.update = function() {

    if (this.activeObject === null) return;

    this.forEach(function(e) {
      if (e == this.activeObject) {
        e.alpha = 1;
      }else {
        e.alpha = 0.5;
      }
    },this)

    if (this.children.length == 0) return;

    var moveVal = this.shiftKey.isDown ? 3 : 1;

    if (this.cursors.down.isDown) {
      this.activeObject.y += moveVal;
      this.changed = true;
    }
    if (this.cursors.up.isDown) {
      this.activeObject.y -= moveVal;
      this.changed = true;
    }
    if (this.cursors.left.isDown) {
      this.activeObject.x -= moveVal;
      this.changed = true;
    }
    if (this.cursors.right.isDown) {
      this.activeObject.x += moveVal;
      this.changed = true;
    }


    be.preview.progress += 0.01;
    if (be.preview.progress > 1) be.preview.progress = 0;
    be.preview.x = game.math[this.interpolation+'Interpolation'](this.pointsX,be.preview.progress);
    be.preview.y = game.math[this.interpolation+'Interpolation'](this.pointsY,be.preview.progress);


    if (this.changed) {
      var pointsX = [];
      var pointsY = [];
      this.pointsX = pointsX;
      this.pointsY = pointsY;
      this.children.forEach(function(e,index) {
        if (index <= 1) return;
        pointsX.push(e.x);
        pointsY.push(e.y);
      });

      this.gfx.clear();
      this.gfx.beginFill(0xff0000,1);
      for (var i = 0; i < 200; i++) {
        this.gfx.drawRect(
          game.math[this.interpolation+'Interpolation'](pointsX,i/200),
          game.math[this.interpolation+'Interpolation'](pointsY,i/200),
          3,3
        );
      }
    }
  }


  return be;

};


G.lineUtils = {

  getWholeDistance: function(pointsX,pointsY){

    var wholeDistance = 0;
    for (var i  = 1; i < pointsX.length; i++) {
      wholeDistance += game.math.distance(pointsX[i-1],pointsY[i-1],pointsX[i],pointsY[i]);
    }
    return wholeDistance;

  },

  findPointAtDitance: function(pointsX,pointsY,dist) {

    var soFar = 0;
    for (var i = 1; i < pointsX.length; i++) {
      var currentDistance = game.math.distance(pointsX[i-1],pointsY[i-1],pointsX[i],pointsY[i]);
      if (currentDistance+soFar > dist) {
        var angle = game.math.angleBetween(pointsX[i-1],pointsY[i-1],pointsX[i],pointsY[i]);
        return [
          pointsX[i-1]+G.lengthDirX(angle,dist-soFar,true),
          pointsY[i-1]+G.lengthDirY(angle,dist-soFar,true)
        ]
      }else {
        soFar += currentDistance;
      } 

    }
    return [pointsX[pointsX.length-1],pointsY[pointsY.length-1]];

  },

  spreadAcrossLine: function(pointsX,pointsY,elementsList,propName1,propName2) {

     console.log("spreadAcrossLine");

    var wholeDistance = this.getWholeDistance(pointsX,pointsY);
    var every = wholeDistance/(elementsList.length-1);

    for (var i = 0; i < elementsList.length; i++) {
      var point = this.findPointAtDitance(pointsX,pointsY,every*i);
      elementsList[i][propName1 || 'x'] = point[0];
      elementsList[i][propName2 || 'y'] = point[1];   
    }
 
  },

  spreadOnNodes: function(pointsX,pointsY,elementsList,propName1,propName2) {

    console.log("SPREAD ON NODES");
    console.log(arguments);

    for (var i = 0; i < pointsX.length; i++) {
      console.log(i);
      if (typeof elementsList[i] === 'undefined') return;
      elementsList[i][propName1 || 'x'] = pointsX[i];
      elementsList[i][propName2 || 'y'] = pointsY[i]; 
      console.log(i + ' pos: '+pointsX[i]+'x'+pointsY[i]);     
    }

  }
};



G.changeSecToTimerFormat = function(sec,dhms) {

  var sec_num = parseInt(sec, 10); // don't forget the second param
   // var days = Math.floor(sec_num/86400);
    //sec_num -= days*86400;
    var hours   = Math.floor(sec_num/3600);
    sec_num -= hours*3600;
    var minutes = Math.floor(sec_num / 60);
    sec_num -= minutes*60;
    var seconds = sec_num;


    /*var daysTxt = '';
    if (days > 0) {
      daysTxt = (days < 10 ? '0'+days : days)+(dhms ? 'd ' : ':'); 
    }*/

    var hoursTxt = '';
    if (hours > 0 /*|| days > 0*/) {
      hoursTxt = (hours < 10 ? '0'+hours : hours)+(dhms ? 'h ' : ':'); 
    }

    var minutesTxt = '00:';
    if (minutes > 0 || hours > 0) {
      minutesTxt = (minutes < 10 ? '0'+minutes : minutes)+(dhms ? 'm ' : ':');
    }

    var secondsTxt = '00';
    if (seconds > 0) {
      secondsTxt = (seconds < 10 ? '0'+seconds : seconds)+(dhms ? 's' : '');
    }

    return /*daysTxt+*/hoursTxt+minutesTxt+secondsTxt;

};
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
    "use strict";
    // IE <10 is explicitly unsupported
    if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
        return;
    }
    var
    doc = view.document
    // only get URL when necessary in case Blob.js hasn't overridden it yet
        ,
        get_URL = function() {
            return view.URL || view.webkitURL || view;
        }, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a"),
        can_use_save_link = "download" in save_link,
        click = function(node) {
            var event = new MouseEvent("click");
            node.dispatchEvent(event);
        }, is_safari = /constructor/i.test(view.HTMLElement),
        is_chrome_ios = /CriOS\/[\d]+/.test(navigator.userAgent),
        throw_outside = function(ex) {
            (view.setImmediate || view.setTimeout)(function() {
                throw ex;
            }, 0);
        }, force_saveable_type = "application/octet-stream"
        // the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
        ,
        arbitrary_revoke_timeout = 1000 * 40 // in ms
        ,
        revoke = function(file) {
            var revoker = function() {
                if (typeof file === "string") { // file is an object URL
                    get_URL().revokeObjectURL(file);
                } else { // file is a File
                    file.remove();
                }
            };
            setTimeout(revoker, arbitrary_revoke_timeout);
        }, dispatch = function(filesaver, event_types, event) {
            event_types = [].concat(event_types);
            var i = event_types.length;
            while (i--) {
                var listener = filesaver["on" + event_types[i]];
                if (typeof listener === "function") {
                    try {
                        listener.call(filesaver, event || filesaver);
                    } catch (ex) {
                        throw_outside(ex);
                    }
                }
            }
        }, auto_bom = function(blob) {
            // prepend BOM for UTF-8 XML and text/* types (including HTML)
            // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
            if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
                return new Blob([String.fromCharCode(0xFEFF), blob], {
                    type: blob.type
                });
            }
            return blob;
        }, FileSaver = function(blob, name, no_auto_bom) {
            if (!no_auto_bom) {
                blob = auto_bom(blob);
            }
            // First try a.download, then web filesystem, then object URLs
            var
            filesaver = this,
                type = blob.type,
                force = type === force_saveable_type,
                object_url, dispatch_all = function() {
                    dispatch(filesaver, "writestart progress write writeend".split(" "));
                }
                // on any filesys errors revert to saving with object URLs
                , fs_error = function() {
                    if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
                        // Safari doesn't allow downloading of blob urls
                        var reader = new FileReader();
                        reader.onloadend = function() {
                            var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
                            var popup = view.open(url, '_blank');
                            if (!popup) view.location.href = url;
                            url = undefined; // release reference before dispatching
                            filesaver.readyState = filesaver.DONE;
                            dispatch_all();
                        };
                        reader.readAsDataURL(blob);
                        filesaver.readyState = filesaver.INIT;
                        return;
                    }
                    // don't create more object URLs than needed
                    if (!object_url) {
                        object_url = get_URL().createObjectURL(blob);
                    }
                    if (force) {
                        view.location.href = object_url;
                    } else {
                        var opened = view.open(object_url, "_blank");
                        if (!opened) {
                            // Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
                            view.location.href = object_url;
                        }
                    }
                    filesaver.readyState = filesaver.DONE;
                    dispatch_all();
                    revoke(object_url);
                };
            filesaver.readyState = filesaver.INIT;

            if (can_use_save_link) {
                object_url = get_URL().createObjectURL(blob);
                setTimeout(function() {
                    save_link.href = object_url;
                    save_link.download = name;
                    click(save_link);
                    dispatch_all();
                    revoke(object_url);
                    filesaver.readyState = filesaver.DONE;
                });
                return;
            }

            fs_error();
        }, FS_proto = FileSaver.prototype,
        saveAs = function(blob, name, no_auto_bom) {
            return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
        };
    // IE 10+ (native saveAs)
    if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
        return function(blob, name, no_auto_bom) {
            name = name || blob.name || "download";

            if (!no_auto_bom) {
                blob = auto_bom(blob);
            }
            return navigator.msSaveOrOpenBlob(blob, name);
        };
    }

    FS_proto.abort = function() {};
    FS_proto.readyState = FS_proto.INIT = 0;
    FS_proto.WRITING = 1;
    FS_proto.DONE = 2;

    FS_proto.error =
        FS_proto.onwritestart =
        FS_proto.onprogress =
        FS_proto.onwrite =
        FS_proto.onabort =
        FS_proto.onerror =
        FS_proto.onwriteend =
        null;

    return saveAs;
}(
    typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
    module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
    define([], function() {
        return saveAs;
    });
}
if (typeof G === 'undefined') G={};

//
//	Params:
//	[{
//		propName: string
//		label: string,
//		type: string[bool,int,float,rangeInt,rangeFloat,string],
//		(if range) range: [min,max],
//		+default: --,	
//		+(if string) maxLength: int
//	},
//	{
//		type: 'button',
//		label: string,
//		func: function(){},
//		context: context
//	},
//	{
//		type: 'empty'
//	},
//	{
//		type: info,
//		propName: string,
//			example of multiple: 'obj1%obj2%prop'
//		label: string
//	}
//	...]
//
//	Functions:
//	export - return config object
//	
//	Signals:
//	onChange -  dispatched with every change
//

G.Configurator = function(x,y,config,fontSize,maxLabelWidth) {
	
	Phaser.Group.call(this,game);

	this.x = x;
	this.y = y;

	this.fontSize = fontSize || 20;
	this.maxLabelWidth = maxLabelWidth || 1000;

	this.config = config;
	this.configObj = {};

	this.fontStyle = {font: 'bold '+this.fontSize+'px Arial', fill: '#000000'};
	this.fontStyleBtn = {font: 'bold '+this.fontSize+'px Arial', fill: '#27274d'};

	this.options = [];
	this.infos = [];

	this.onChange = new Phaser.Signal();

	this.init(config);

};

G.Configurator.prototype = Object.create(Phaser.Group.prototype);

G.Configurator.prototype.init = function(config) {

	for (var i = 0; i < config.length; i++) {

		var y = (this.fontSize*1.5)*i;
		if (config[i].type == 'button') {
			this.options.push(this.makeDetachedButton(y,config[i]));
		}else if (config[i].type == 'empty') {
			continue;
		}else if (config[i].type == 'info') {
			this.infos.push([config[i].propName,this.makeInfo(y,config[i])])
		}else {
			this.options.push(this.makeOption(y,config[i]));
		}
		
	}

};


G.Configurator.prototype.makeInfo = function(y,optionObj) {

	var info = {};

	info.label = game.add.text(0,y,(optionObj.label || 'NO LABEL')+':',this.fontStyle);
	info.label.width = Math.min(info.label.width,this.maxLabelWidth);
	
	info.dataTxt = game.add.text(info.label.width,y,'--',this.fontStyle);

	this.add(info.label);
	this.add(info.dataTxt);

	return info;

};


G.Configurator.prototype.updateInfo = function(obj) {

	if (!obj) obj = {};

	this.infos.forEach(function(info) {

		var path = info[0].split('%');
		var currentObj = obj;

		for (var i = 0; i < path.length; i++) {
			if (typeof currentObj[path[i]] !== 'undefined') {
				currentObj = currentObj[path[i]];
			}else {
				return info[1].dataTxt.setText('--');
			}
		}

		info[1].dataTxt.setText(currentObj.toString());

	});

};

G.Configurator.prototype.export = function() {
	return this.configObj;	
};

G.Configurator.prototype.makeDetachedButton = function(y,optionObj) {

	var btn = new G.SimpleTextButton(0,y,optionObj.label,this.fontStyleBtn,optionObj.func,optionObj.context)

	this.add(btn);

	return btn;

};

G.Configurator.prototype.makeOption = function(y,optionObj) {

	var option = {};
		
	option.label = this.makeLabel(optionObj);

	switch (optionObj.type) {
		case 'bool':
			option.btn = this.makeOnOffSwitch(optionObj);
			break;
		case 'int':
			option.btn = this.makeIntInput(optionObj);
			break;
		case 'float':
			option.btn = this.makeFloatInput(optionObj);
			break;
		case 'intRanged':
			option.btn = this.makeIntRangedInput(optionObj);
			break;
		case 'floatRanged':
			option.btn = this.makeFloatRangedInput(optionObj);
			break;
		case 'string':
			option.btn = this.makeStringInput(optionObj);
			break;
		case 'rangeInt': 
			option.btn = this.makeRangeIntInput(optionObj);
			break;
		case 'rangeFloat':
			option.btn = this.makeRangeFloatInput(optionObj);
			break;
	}	

	option.btn.x = option.label.width;
	option.btn.y = option.label.y = y;	

	this.add(option.label);
	this.add(option.btn);

	return option;

};

G.Configurator.prototype.makeLabel = function(optionObj) {
	var label = game.add.text(0,0,(optionObj.label || 'NO LABEL')+':',this.fontStyle);
	label.width = Math.min(label.width,this.maxLabelWidth);
	return this.add(label);
};

G.Configurator.prototype.makeOnOffSwitch = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? true : optionObj.default;

	return this.makeBtn(

		optionObj,

		function() {
			this.setText(this.configObj[this.optionObj.propName] ? 'ON' : 'OFF');
			this.addColor(this.configObj[this.optionObj.propName] ? "#005555" : "#FF0000", 0);
		},

		function() {
			this.configObj[this.optionObj.propName] = !this.configObj[this.optionObj.propName];
		}

	);

};

G.Configurator.prototype.makeIntInput = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? 10 : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var newVal = parseInt(prompt('New INT for '+this.optionObj.label));
			if (isNaN(newVal)) return;
			this.configObj[this.optionObj.propName] = newVal;
		}

	);
};

G.Configurator.prototype.makeFloatInput = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? 10 : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var newVal = parseFloat(prompt('New FLOAT for '+this.optionObj.label));
			if (isNaN(newVal)) return;
			this.configObj[this.optionObj.propName] = newVal;
		}

	);


};

G.Configurator.prototype.makeIntRangedInput = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? optionObj.range[0] : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var newVal = parseInt(prompt('New INT in range ['+optionObj.range[0]+','+optionObj.range[1]+'] for '+this.optionObj.label));
			if (isNaN(newVal)) return;
			this.configObj[this.optionObj.propName] = game.math.clamp(newVal,(this.optionObj.range[0] || 1),(this.optionObj.range[1] || 10));
		}

	)
};

G.Configurator.prototype.makeFloatRangedInput = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? (optionObj.range[0]) : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var newVal = parseFloat(prompt('New FLOAT in range ['+optionObj.range[0]+','+optionObj.range[1]+'] for '+this.optionObj.label));
			if (isNaN(newVal)) return;
			console.log(newVal);
			this.configObj[this.optionObj.propName] = game.math.clamp(newVal,this.optionObj.range[0],this.optionObj.range[1]);
			console.log(this.configObj[this.optionObj.propName]);
		}

	)
};


G.Configurator.prototype.makeRangeIntInput = function(optionObj) {

	console.log("MAKE RANGE INT INPUT");

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? [0,10] : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var firstVal = parseInt(prompt('First Int for '+this.optionObj.label));
			var secondVal = parseInt(prompt('Second Int for '+this.optionObj.label));
			if (isNaN(firstVal)) return;
			if (isNaN(secondVal)) return;

			if (this.optionObj.range) {
				firstVal = game.math.clamp(firstVal,this.optionObj.range[0],this.optionObj.range[1]);
				secondVal = game.math.clamp(secondVal,this.optionObj.range[0],this.optionObj.range[1]);
			}

			this.configObj[this.optionObj.propName] = [firstVal,secondVal];
		}

	)

};


G.Configurator.prototype.makeRangeFloatInput = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? [0,10] : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var firstVal = parseFloat(prompt('First Int for '+this.optionObj.label));
			var secondVal = parseFloat(prompt('Second Int for '+this.optionObj.label));
			if (isNaN(firstVal)) return;
			if (isNaN(secondVal)) return;
			if (this.optionObj.range) {
				firstVal = game.math.clamp(firstVal,this.optionObj.range[0],this.optionObj.range[1]);
				secondVal = game.math.clamp(secondVal,this.optionObj.range[0],this.optionObj.range[1]);
			}
			this.configObj[this.optionObj.propName] = [firstVal,secondVal];
		}

	)

};


G.Configurator.prototype.makeStringInput = function(optionObj) {

	this.configObj[optionObj.propName] = typeof optionObj.default === 'undefined' ? 'String' : optionObj.default;

	return this.makeBtn(

		optionObj,

		false,

		function() {
			var newVal = prompt('Enter new STRING for '+this.optionObj.label);
			if (newVal == null) return;
			this.configObj[this.optionObj.propName] = this.optionObj.maxLength ? newVal.slice(0,this.optionObj.maxLength) : newVal;
		}

	);
};


G.Configurator.prototype.makeBtn = function(optionObj,refreshFunc,pressFunc) {

	var btn = game.add.text(0,0,'',this.fontStyleBtn);
	btn.configObj = this.configObj;
	btn.optionObj = optionObj;
	btn.refresh = refreshFunc || function() {this.setText((this.configObj[this.optionObj.propName]).toString())};
	btn.refresh();

	btn.inputEnabled = true;
	btn.input.useHandCursor = true;
	btn.events.onInputDown.add(pressFunc,btn);
	btn.events.onInputDown.add(btn.refresh,btn);

	btn.events.onInputDown.add(function() {
		this.onChange.dispatch(this.configObj);
	},this);

	return btn;

};
G.SimpleTextButton = function(x,y,label,fontStyle,func,context) {
	Phaser.Text.call(this,game,x,y,label,fontStyle || 'bold 20pt Arial');
	this.inputEnabled = true;
	this.input.useHandCursor = true;
	this.events.onInputDown.add(func,context || this);
};
G.SimpleTextButton.prototype = Object.create(Phaser.Text.prototype);
G.openEditor = function(lvlNr) {

	game.state.start("Editor",true,false,lvlNr);

};

G.getLevelConfig = function() {
	

	return [
		{
			propName: 'movesNr',
			label: 'Moves nr',
			type: 'intRanged',
			range: [10,99],
			default: 40
		},
		{
			propName: 'bgImg',
			label: 'Bg image',
			type: 'string',
			default: 'bg_1.jpg'
		},
		{
			propName: 'concrete',
			label: 'Concrete',
			type: 'rangeInt',
			range: [0,16],
			default: [0,0]
		},
		{
			propName: 'ice',
			label: 'Ice',
			type: 'rangeInt',
			range: [0,16],
			default: [0,0]
		},
		{
			propName: 'chain',
			label: 'Chain',
			type: 'rangeInt',
			range: [0,24],
			default: [0,0]
		},
		{
			propName: 'dirt',
			label: 'Dirt',
			type: 'rangeInt',
			range: [0,64],
			default: [0,0]
		},
		{
			propName: 'infection',
			label: 'Infection',
			type: 'rangeInt',
			range: [0,10],
			default: [0,0]
		},
		{
			propName: 'typesOfCandy',
			label: 'Candy types',
			type: 'intRanged',
			range: [4,6]
		},
		{
			propName: 'chestDrop',
			label: 'Chest drop',
			type: 'intRanged',
			range: [0,50]
		},
		{
			propName: 'chainDrop',
			label: 'Chain chance',
			type: 'intRanged',
			range: [0,50]
		},
		{
			propName: 'infectionDrop',
			label: 'Infection chance',
			type: 'intRanged',
			range: [0,50]
		},
		{
			propName: 'blockersTypes',
			label: 'Blockers types',
			type: 'rangeInt',
			default: [0,2]
		},
		{
			propName: 'goalRange',
			label: 'Goal range',
			type: 'rangeInt',
			range: [1,4],
			default: [2,4]
		},
		{
			propName: 'normReq',
			label: 'Norm req',
			type: 'rangeInt',
			default: [10,40]
		}
	]


};


G.getLevelInfoConfig = function() {

	return [
		{
			propName: 'moves',
			label: 'Moves',
			type: 'info'
		},
		{
			propName: 'drops%chest',
			label: 'Chest %',
			type: 'info'
		},
		{
			propName: 'drops%infection',
			label: 'Infection %',
			type: 'info'
		},
		{
			propName: 'drops%chain',
			label: 'Chain %',
			type: 'info'
		},
		{
			propName: 'nrOfTypes',
			label: 'Types of candies',
			type: 'info'
		},
		{
			propName: 'difficulty',
			label: 'Difficulty',
			type: 'info'
		},
		{
			propName: 'goal%1%0%0',
			label: 'Collect 1',
			type: 'info'

		},
		{
			propName: 'goal%1%1%0',
			label: 'Collect 2',
			type: 'info'

		},
		{
			propName: 'goal%1%2%0',
			label: 'Collect 3',
			type: 'info'

		},
		{
			propName: 'goal%1%3%0',
			label: 'Collect 4',
			type: 'info'

		}
	]

};

G.generateLevels = function(config) {

	var numOfLevels = config.numOfLvls;

	var result = [];

	statsBot = [];

	for (var i = 0; i < numOfLevels; i++) {

		var lvl = G.LevelGenerator.generate(config);

		lvl.moves = 40;

		result.push(lvl);
		result[i].difficulty = parseFloat((config.minDiff+(Math.random()*(config.maxDiff-config.minDiff))).toFixed(2));

	}

	return result;

};


G.makeLvlPreview = function(lvl,bitmapData) {
	
	var sprite = game.make.image(0,0,null);
	bitmapData.clear();
	bitmapData.fill(0,0,0,1);

	var boardWidth = lvl.levelData.length;
	var boardHeight = lvl.levelData[0].length;

	var cellWidthPx = bitmapData.width/boardWidth;
	var cellHeightPx = bitmapData.height/boardHeight;
	var cellSize = Math.min(cellWidthPx,cellHeightPx);


	var lookUpObject = {
		"1" : 'candy_1',
		'2' : 'candy_2',
		'3' : 'candy_3',
		'4' : 'candy_4',
		'5' : 'candy_5',
		'6' : 'candy_6',
		'r' : 'candy_r',
		"cn1" : 'concrete_1',
		"cn2" : 'concrete_2',
		"cn3" : 'concrete_3',
		'dirt1' : 'dirt_1',
		'dirt2' : 'dirt_2',
		'dirt3' : 'dirt_3',
		'ice' : 'ice_front',
		'chest' : 'candy_chest',
		'infection' : 'candy_infection'
 	}
	

	for (var coll = 0; coll < boardWidth; coll++) {
		for (var row = 0; row < boardHeight; row++) {

			var cell = lvl.levelData[coll][row];

			if (cell[0] == 'X') {
				G.changeTexture(sprite,'dark_screen');
				sprite.tint = 0x000000;
				bitmapData.draw(sprite, coll*cellSize, row*cellSize, cellSize, cellSize);
				sprite.tint = 0xffffff;
				continue
			}else {

				for (var elemI = 0; elemI < cell.length; elemI++) {
				var elem = cell[elemI];

					if (elem[0] == 'W') {
						G.changeTexture(sprite,lookUpObject[elem[1]]);
						bitmapData.draw(sprite, coll*cellSize, row*cellSize, cellSize, cellSize);
						G.changeTexture(sprite,'blocker_chain_wrapped');
						sprite.alpha = 0.5;
						bitmapData.draw(sprite, coll*cellSize, row*cellSize, cellSize, cellSize);
						sprite.alpha = 1;
					}else if (lookUpObject[elem]) {
						G.changeTexture(sprite,lookUpObject[elem]);
						bitmapData.draw(sprite, coll*cellSize, row*cellSize, cellSize, cellSize);
					}

				}

			}

		}
	}
	



};

G.openLevelMgr = function(levels) {

	if (!game.state.states['LvlMgrState']) {
		game.state.add('LvlMgrState',G.LvlMgrState);
	}
	game.state.start('LvlMgrState',true,false,levels);

}


G.LvlMgrState = function (game) {

};

G.LvlMgrState.prototype = {

	init: function (levels) {

		G.LEVELS = levels;

	},

	create: function () {

		this.gfx = game.add.graphics();
		this.gfx.beginFill(0xeeeeee,1);
		this.gfx.drawRect(0,0,1980,1080);
		game.world.setBounds(0,0,1980,1080);

		this.NOSCALABLE = true;

		game.scale.setGameSize(1980,1080);
		game.world.bounds
		mgr = new G.LvlMgrSorter(G.LEVELS,10,650,1700,600);
		mgr.view.drawGraph();


		
		if (G.sb) G.sb.onScreenResize.add(function() {
			game.scale.setGameSize(1980,1080);
			game.world.setBounds(0,0,1980,1080);
		});

	},

	update: function() {
		mgr.update();
	}



};

var testLevels = [];

for (var i = 0; i < 200; i++) {
	testLevels.push({
		difficulty: i+(Math.random()*10),
		group: Math.floor(i/30)
	});

	if (Math.random() < 0.1) {
		testLevels[i].SPECIAL = true;
	}
}


G.LvlMgrSorter = function(levels,x,y,width,height) {
	
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;

	this.view = new G.LvlMgrSorterView(this,x,y,width,height);

	this.mapBtn = game.add.button(x,y-height,null,this.processClick,this);
	this.mapBtn.hitArea = new Phaser.Rectangle(0,0,width,height);

	this.lvlIndexTxt = game.add.text(x+20,y-height,'Lvl Index: --');
	this.diffTxt = game.add.text(x+20,y-height+30,'Diff: --');

	this.genSettingsTxt = game.add.text(1740,height-380,'GEN SETTINGS:');

	this.selectedGroup = null;
	this.selectedGroupTxt = game.add.text(250,height+60,'SELECTED GROUP: '+this.selectedGroup);
	this.selectedLevel = null;
	this.selectedLevelTxt = game.add.text(600,height+60,'SELECTED LEVEL: '+this.selectedLevel);

	this.previewBitmap = game.add.bitmapData(400,400);
	this.levelPreview = this.previewBitmap.addToWorld(930,height+65);

	this.cursors = game.input.keyboard.createCursorKeys();

	this.cursors.left.onDown.add(function() {
		if (this.selectedLevel === null) return;
		this.changeSelectedLevel(this.selectedLevel-1);
	},this);

	this.cursors.right.onDown.add(function() {
		if (this.selectedLevel === null) return;
		this.changeSelectedLevel(this.selectedLevel+1);
	},this);

	
	this.sinEvery = Math.PI/10;
	this.sinMulti = 10;

	this.levelInfoConfigurator = new G.Configurator(1400,height+100,G.getLevelInfoConfig());

	this.initLevels(levels);


	this.sinConfigurator = new G.Configurator(width+50,50,[
		{
			propName: 'sinEvery',
			label: 'Sin cycle',
			type: 'float',
			default: 10,	
		},
		{
			propName: 'sinMulti',
			label: 'Sin amplitude multi',
			type: 'float',
			default: this.sinMulti,	
		},
		{
			label: 'SORT',
			type: 'button',
			func: this.sortToExpectedDiff,
			context: this
		},
		{
			type: 'empty'
		},
		{
			label: 'EXPORT',
			type: 'button',
			func: this.export,
			context: this
		}
	]);
	this.sinConfigurator.onChange.add(function(configObj) {
		this.setSin(configObj.sinEvery,configObj.sinMulti);
	},this);

	var genConf = G.getLevelConfig()
	genConf.push(
		{
			propName: 'numOfLvls',
			label: 'Num of lvl',
			type: 'intRanged',
			range: [1,50],
			default: 5
		},
		{
			propName: 'minDiff',
			label: 'Min. diff',
			type: 'float',
			default: 2.5
		},
		{
			propName: 'maxDiff',
			label: 'Max. diff',
			type: 'float',
			default: 5
		}
	);
	this.genConfigurator = new G.Configurator(1750,height-350,genConf);


	this.groupConfigurator = new G.Configurator(250,height+100,[

		{
			label: 'Change With Other',
			type: 'button',
			func: this.changeWithGroup,
			context: this
		},
		{
			label: 'Expand Group',
			type: 'button',
			func: this.expandGroup,
			context: this
		},
		{
			label: 'Move +1',
			type: 'button',
			func: function() {

				var groups = this.splitLevelsIntoGroups();
				if (this.selectedGroup === null || this.selectedGroup == groups.length-1) return;
				this.changeWithGroup(this.selectedGroup+1);
			},
			context: this
		},
		{
			label: 'Move -1',
			type: 'button',
			func: function() {
				if (this.selectedGroup === null || this.selectedGroup == 0) return;
				this.changeWithGroup(this.selectedGroup-1);
			},
			context: this
		},
		{
			type: 'empty'
		},
		{
			label: 'Create New Group',
			type: 'button',
			func: this.createGroup,
			context: this
		},
		{
			type: 'empty'
		},
		{
			label: 'REMOVE',
			type: 'button',
			func: this.removeGroup,
			context: this
		}

	]);


	this.levelConfigurator = new G.Configurator(600,height+100,[

		{
			label: 'Change Lvls Group',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null) return;
				var newVal = parseInt(prompt("Enter new group for lvl "+this.selectedLevel+':',this.data[this.selectedLevel].group));
				if (isNaN(newVal)) return;
				this.data[this.selectedLevel].group = newVal;
				this.view.drawGraph();
			},
			context: this
		},
		{
			label: 'Move +1',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null || this.selectedLevel == this.data.length-1) return;

				var tmp = this.data[this.selectedLevel];
				this.data[this.selectedLevel] = this.data[this.selectedLevel+1];
				this.data[this.selectedLevel+1] = tmp;

				this.changeSelectedLevel(this.selectedLevel+1);
				this.view.drawGraph();

			},
			context: this
		},
		{
			label: 'Move -1',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null || this.selectedLevel == 0) return;

				var tmp = this.data[this.selectedLevel];
				this.data[this.selectedLevel] = this.data[this.selectedLevel-1];
				this.data[this.selectedLevel-1] = tmp;

				this.changeSelectedLevel(this.selectedLevel-1);
				this.view.drawGraph();

			},
			context: this
		},
		{
			label: 'Change Lvl Index',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null) return;
				var newVal = parseInt(prompt("Enter new index for lvl "+this.selectedLevel+':',this.data[this.selectedLevel].group));
				if (isNaN(newVal)) return;
				newVal = game.math.clamp(newVal,0,this.data.length);
				lvl = this.data[this.selectedLevel];
				this.data.splice(this.selectedLevel,1);
				this.data.splice(newVal,0,lvl);
				this.changeSelectedLevel(newVal);
				this.view.drawGraph();

			},
			context: this
		},
		{
			label: 'PLAY LEVEL',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null)return;
				G.json.levels = this.data;
				game.state.start("Game",true,false,this.selectedLevel,true);
				G.IMMEDIATE = false;
			},
			context: this
		},
		{
			label: 'EDIT LEVEL',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null) return;
				G.json.levels = this.data;
				if (G.openEditor) G.openEditor(this.selectedLevel);
				G.IMMEDIATE = false;
			},
			context: this
		},
		{
			type: 'empty'
		},
		{
			label: 'REMOVE',
			type: 'button',
			func: function() {
				if (this.selectedLevel === null) return;

				this.data.splice(this.selectedLevel,1);
				this.changeSelectedLevel(null);
				this.view.drawGraph();
			},
			context: this
		},
		{
			type: 'empty'
		},
		{
			label: 'OPEN WORLD MAP',
			type: 'button',
			func: function() {
				game.state.start("EditorWorld");
			},
			context: this
		}

	]);


	

};



G.LvlMgrSorter.prototype.update = function() {

	var p = game.input.activePointer;

	if (p.x > this.x && p.x < this.x+this.width
		&& p.y < this.y && p.y > this.y-this.height) {

		var xx = p.worldX-this.x;
		var i = Math.floor(xx/this.width*this.data.length);

		this.lvlIndexTxt.setText('Lvl Index: '+i.toString());

		var yy = (p.worldY-this.y)*-1;

		var diff = yy/this.height*this.maxDifficulty;

		this.diffTxt.setText('Diff: '+diff.toFixed(2).toString());

	}



};

G.LvlMgrSorter.prototype.processClick = function(button,pointer) {

	var xx = pointer.worldX-button.x;
	//console.log(xx);

	var i = Math.min(this.data.length-1,Math.floor(xx/this.width*this.data.length));

	this.changeSelectedGroup(this.data[i].group);
	this.changeSelectedLevel(i);
	this.view.drawGraph();

};

G.LvlMgrSorter.prototype.export = function() {
	var blob = new Blob([JSON.stringify(this.data)],{type: "text/plain;charset=utf-8"});
    saveAs(blob, "levels.json");
};


G.LvlMgrSorter.prototype.initLevels = function(levels) {

	this.data = levels;
	this.maxDifficulty = -Infinity;
	this.data.forEach(function(elem) {
		if (elem.difficulty > this.maxDifficulty) this.maxDifficulty = elem.difficulty;
	},this);
	//this.makeGroupBtns();
	//this.makeLevelBtns();
	this.changeSelectedGroup(null);
	this.changeSelectedLevel(null);
};


G.LvlMgrSorter.prototype.expandGroup = function() {

	if (this.selectedGroup === null) return;

	var groups = this.splitLevelsIntoGroups();
	var conf = this.genConfigurator.export();

	var newLevels = G.generateLevels(conf);

	//console.log(newLevels);

	newLevels.forEach(function(elem) {
		elem.group = this.selectedGroup;
	},this);

	groups[this.selectedGroup] = groups[this.selectedGroup].concat(newLevels);

	this.data = Array.prototype.concat.apply([],groups);
	this.initLevels(this.data);
	this.view.drawGraph();

};

G.LvlMgrSorter.prototype.createGroup = function() {

	var groups = this.splitLevelsIntoGroups();
	var conf = this.genConfigurator.export();

	var newLevels = G.generateLevels(conf);

	//console.log(newLevels);

	newLevels.forEach(function(elem) {
		elem.group = groups.length;
	});

	groups.push(newLevels);

	//var groups = this.splitLevelsIntoGroups();
	this.data = Array.prototype.concat.apply([],groups);
	this.initLevels(this.data);
	this.view.drawGraph();

};

G.LvlMgrSorter.prototype.changeSelectedGroup = function(groupNr) {

	this.selectedGroup = groupNr;
	this.selectedGroupTxt.setText('SELECTED GROUP: '+this.selectedGroup);

};

G.LvlMgrSorter.prototype.changeSelectedLevel = function(lvlNr) {

	this.levelPreview.alpha = lvlNr === null ? 0 : 1;

	lvlNr = game.math.clamp(lvlNr,0,this.data.length-1);

	this.selectedLevel = lvlNr;
	this.selectedLevelTxt.setText('SELECTED LEVEL: '+(this.selectedLevel+1));



	if (lvlNr !== null) {
		G.makeLvlPreview(this.data[lvlNr],this.previewBitmap);
		this.levelInfoConfigurator.updateInfo(this.data[lvlNr]);
		this.changeSelectedGroup(this.data[lvlNr].group);
		this.view.drawGraph();

	}else {
		this.levelInfoConfigurator.updateInfo(null);
	}

	

};


G.LvlMgrSorter.prototype.changeWithGroup = function(nr) {

	var groupToSwapWith;

	if (typeof nr === undefined) {
		groupToSwapWith = parseInt(prompt("Swap with:"));
	}else {
		groupToSwapWith = nr;
	}

	if (isNaN(groupToSwapWith)) return;
	if (this.selectedGroup === null) return;
	if (groupToSwapWith == this.selectedGroup) return;

	//console.log(groupToSwapWith);

	var groups = this.splitLevelsIntoGroups();

	for (var i = 0; i < groups.length; i++) {
		if (groups[i][0].group == this.selectedGroup) {
			groups[i].forEach(function(lvl) {
				//console.log('changing from: '+lvl.group+' to: '+groupToSwapWith);
				lvl.group = groupToSwapWith;
				//console.log("post: "+lvl.group);
			})
			continue;
		}
		if (groups[i][0].group == groupToSwapWith) {
			groups[i].forEach(function(lvl) {
				console.log('changing from: '+lvl.group+' to: '+this.selectedGroup);
				lvl.group = this.selectedGroup;
				console.log("post: "+lvl.group);
			},this);
		}
	}

	groups.sort(function(a,b) {
		return a[0].group - b[0].group;
	});
	this.data = Array.prototype.concat.apply([],groups);
	this.initLevels(this.data);
	this.view.drawGraph();

};


G.LvlMgrSorter.prototype.removeGroup = function(groupNr) {

	//console.log(groupNr);

	var groups = this.splitLevelsIntoGroups();

	var groupIndex = false;

	for (var i = 0; i < groups.length; i++) {
		if (groups[i][0].group == this.selectedGroup) {
			groupIndex = i;
			continue;
		}
		if (typeof groupIndex === 'number') {
			groups[i].forEach(function(lvl) {
				lvl.group--;
			})
		}
	}

	//console.log(groupIndex);

	if (typeof groupIndex !== 'number') {

		//console.log('groupIndex not a number: '+(typeof groupIndex));
		return;
	}

	groups.splice(groupIndex,1);
	this.data = Array.prototype.concat.apply([],groups);
	this.initLevels(this.data);
	this.view.drawGraph();

};


G.LvlMgrSorter.prototype.swapLevels = function(i,j) {
	var tmp = this.data[i];
	this.data[i] = this.data[j];
	this.data[j] = tmp;
	this.view.drawGraph();
}


G.LvlMgrSorter.prototype.setSin = function(every,multi) {

	this.sinEvery = Math.PI/(every || 1);
	this.sinMulti = multi || 1;
	this.view.drawGraph();

};

G.LvlMgrSorter.prototype.getSinForLevel = function(lvlNr) {
	return Math.sin(this.sinEvery*lvlNr)*this.sinMulti;
};


G.LvlMgrSorter.prototype.getExpectedDiff = function(lvlNr) {

	return Math.max(0,(this.maxDifficulty*(lvlNr/this.data.length))+this.getSinForLevel(lvlNr));

};


G.LvlMgrSorter.prototype.splitLevelsIntoGroups = function() {

	var splitedArrays = [];

	var prevGroup = this.data[0].group;
	var indexFrom = 0;

	for (var i = 0; i < this.data.length; i++) {
		if (i == this.data.length-1) {
			splitedArrays.push(this.data.slice(indexFrom,i+1));
		}else if (this.data[i].group != prevGroup) {
			splitedArrays.push(this.data.slice(indexFrom,i));
			indexFrom = i;
			prevGroup = this.data[i].group;
		}
	}

	return splitedArrays;
};


G.LvlMgrSorter.prototype.sortToExpectedDiff = function() {

	if (this.data.length == 0) return;

	var splitedArrays = this.splitLevelsIntoGroups();
	var lvlOffset = 0;
	for (var j = 0; j < splitedArrays.length; j++) {
		splitedArrays[j] = this.sortGroupToExpected(splitedArrays[j],lvlOffset);
		lvlOffset += splitedArrays[j].length;
	}
	this.data = Array.prototype.concat.apply([],splitedArrays);

	this.changeSelectedLevel(null);
	this.view.drawGraph();
	
};

G.LvlMgrSorter.prototype.getWholeDiffOfGroup = function(array,lvlStart) {

	var wholeDiff = 0;

	array.forEach(function(elem,index) {
		wholeDiff += this.getLevelExpectedDiff(elem,index+(lvlStart || 0));
	},this);

	return wholeDiff;

};



G.LvlMgrSorter.prototype.sortGroupToExpected = function(array,lvlStart) {


	var wholeDiff = this.getWholeDiffOfGroup(this.data,lvlStart);

	//console.log("beginDiff: "+wholeDiff);


	var allIterations = 0;

	for (var time = 0; time < 5; time++) {

		for (var i = 0; i < array.length; i++) {

			var expectedDiffI = this.getExpectedDiff(i+lvlStart);

			allIterations++;
			if (allIterations > 500000) return array;
			

			for (var j = 0; j < array.length; j++) {

				if (array[i] === array[j]) continue;

				if (array[i].SPECIAL || array[j].SPECIAL) continue;

				var levelI = array[i];
				var levelJ = array[j];


				var expectedDiffJ = this.getExpectedDiff(j+lvlStart);

				var newWholeDiff = wholeDiff;
				//remove current diff
				newWholeDiff -= this.getLevelExpectedDiff(levelI,i+lvlStart);
				newWholeDiff -= this.getLevelExpectedDiff(levelJ,j+lvlStart);
				//add new diff
				newWholeDiff += this.getLevelExpectedDiff(levelI,j+lvlStart);
				newWholeDiff += this.getLevelExpectedDiff(levelJ,i+lvlStart);


				if (newWholeDiff < wholeDiff) {
					array[i] = levelJ;
					array[j] = levelI;
					wholeDiff = newWholeDiff;
					//i = 0;
				}
			}
		}

	}

	//console.log('newWholeDiff: '+this.getWholeDiffOfGroup(array,lvlStart));

	return array;

};

G.LvlMgrSorter.prototype.getLevelExpectedDiff = function(level,nr) {
	//include neighbours check
	return Math.pow(Math.abs(level.difficulty-this.getExpectedDiff(nr)),3);

};


G.LvlMgrSorter.prototype.getClosestDiffIndex = function(targetDiff,beginFrom,array) {

	var diff = Infinity;
	var index = 0;
	var beginFrom = beginFrom || 0;

	var array = array || this.data;

	array.forEach(function(elem,i) {

		if (i < beginFrom) return;
		if (Math.abs(elem.difficulty-targetDiff) < diff) {
			diff = Math.abs(elem.difficulty-targetDiff);
			index = i;
		}
	});

	return index;

};


G.LvlMgrSorterView = function(mgr,x,y,width,height) {
		
	Phaser.Image.call(this,game,0,0);

	this.mgr = mgr;

	this.gWidth = width || 400;
	this.gHeight = height || 400;

	this.gfx = game.add.graphics();
	this.gfx.x = x;
	this.gfx.y = y;

	this.data = mgr.data;

	this.initGraphPropObj();

	this.colors = [
		0xff0000,
		0x005555,
		0x0000ff,
		0x888800,
		0x008888,
		0x880088
	]

};

G.LvlMgrSorterView.prototype = Object.create(Phaser.Image.prototype);


G.LvlMgrSorterView.prototype.clear = function() {
	this.gfx.clear();
};

G.LvlMgrSorterView.prototype.initGraphPropObj = function() {

	this.graphProp = {};
	this.graphProp.mgr = this.mgr;
	this.graphProp.view = this;

	Object.defineProperty(this.graphProp, 'lvlWidth', {
	    get: function() {
	        return (this.view.gWidth*0.9)/this.mgr.data.length;
	    }
	});

	Object.defineProperty(this.graphProp, 'lvlPadding', {
	    get: function() {
	        return (this.view.gWidth*0.1)/this.mgr.data.length;
	    }
	});

	Object.defineProperty(this.graphProp, 'lvlNum', {
	    get: function() {
	        return this.mgr.data.length;
	    }
	});

};

G.LvlMgrSorterView.prototype.drawGraph = function() {

	this.data = this.mgr.data;

	this.gfx.clear();
	this.drawLevels();
	this.drawGraphLines();
	this.drawExpectedDifficultiesLevels();

};


G.LvlMgrSorterView.prototype.drawGraphLines = function() {
	
	this.gfx.lineStyle(3, 0x00, 1);
	this.gfx.lineTo(0,-this.gHeight);
	this.gfx.moveTo(0,0);
	this.gfx.lineTo(this.gWidth,0);
	this.gfx.lineStyle(3, 0x0000ff,0.3);
	this.gfx.moveTo(0,0);
	this.gfx.lineTo(this.gWidth,-this.gHeight);

};

G.LvlMgrSorterView.prototype.drawExpectedDifficultiesLevels = function() {


	this.gfx.lineStyle(0);
	this.gfx.beginFill(0x00ff00,0.5);

	for (var i = 0; i < this.data.length; i++) {

		this.gfx.drawCircle(
			Math.floor(i*(this.graphProp.lvlWidth+this.graphProp.lvlPadding)+(this.graphProp.lvlWidth*0.5)),
			Math.floor((this.mgr.getExpectedDiff(i)/this.mgr.maxDifficulty)*-this.gHeight),
			Math.max(2,this.graphProp.lvlWidth),
			Math.max(2,this.graphProp.lvlWidth)
		);

	}
};


G.LvlMgrSorterView.prototype.getColorForGroup = function(nr) {

	if (nr >= this.colors.length) {
		var r = Math.floor(Math.random()*128+64); 
		var g = Math.floor(Math.random()*128+64);
		var b = Math.floor(Math.random()*128+64);
		//console.log("new color: "+'0x'+r.toString(16)+g.toString(16)+b.toString(16));
		this.colors.push(parseInt('0x'+r.toString(16)+g.toString(16)+b.toString(16),16));
	}
	return this.colors[nr];

};


G.LvlMgrSorterView.prototype.drawLevels = function() {
	
	//console.log('drawLevels');
	
	this.gfx.lineStyle(0);
	

	for (var i = 0; i < this.data.length; i++) {

		var lvlHeight = this.gHeight * (this.data[i].difficulty/this.mgr.maxDifficulty);

		var alpha;
		if (i == this.mgr.selectedLevel) {
			//console.log('drawLevels selected');
			alpha = 1;
		}else {
			alpha = this.data[i].group == this.mgr.selectedGroup ? 0.6 : 0.2;
		}

		this.gfx.beginFill(this.getColorForGroup(this.data[i].group),alpha);

		this.gfx.drawRect(
			i*(this.graphProp.lvlWidth+this.graphProp.lvlPadding),
			-lvlHeight,
			this.graphProp.lvlWidth,
			lvlHeight
		);

		if (this.data[i].SPECIAL) {
			this.gfx.beginFill(0xff0000,1);
			this.gfx.drawCircle(
				i*(this.graphProp.lvlWidth+this.graphProp.lvlPadding)+(this.graphProp.lvlWidth*0.5),
				-10,
				this.graphProp.lvlWidth,
				this.graphProp.lvlWidth
			)
		}

	}

};
G.Assets = {

	order: ['TitleScreen','World','Game'],
	jsons: ['languages','levels','settings','specialCandies','tutorials'],

	'TitleScreen' : {
		spritesheets: ['titleScreen','buttons'],
		sfx: ['music','pop','transition']
	},

	'World' : {
		spritesheets: ['mapsheet','ssheet'],
		fonts: ['font-white','font-pink'],
		images: ['bg_road.png'],
	},

	'Game' : {
		spritesheets: ['board','gems','bursteffects'],
		images: ['bg_1.png','bg_2.png','bg_3.png','bg_4.png'],
		'sfx': [
			'boom',
			'exchange',
			'lightning',
			'line',
			'match_1',
			'match_2',
			'match_3',
			'match_4',
			'match_5',
			'xylophone_positive',
			'xylophone_positive2',
			'xylophone_positive6',
			'explosion_subtle'
		]
	}


}
G.Boot = function (game) {
};

G.Boot.prototype = {

    init: function () {

        G.lang = 'en';
        
        var getAndroidVersion = function(ua) {
            ua = (ua || navigator.userAgent).toLowerCase(); 
            var match = ua.match(/android\s([0-9\.]*)/);
            return match ? match[1] : false;
        };

        G.ga = new G.GAWrapper();
         
        var android_version = getAndroidVersion();
        
        if (game.device.desktop) {
            G.Loader.currentConfig = 'hd';
            G.Loader.currentConfigMulti = 1;
        }else if (android_version && parseFloat(android_version) < 4.4) {
            G.Loader.currentConfig = 'ssd';
            G.Loader.currentConfigMulti = 0.4;
        }else {
            G.Loader.currentConfig = 'sd';
            G.Loader.currentConfigMulti = 0.6;
        }

        G.Loader.currentConfig = 'hd';
            G.Loader.currentConfigMulti = 1;

        this.input.maxPointers = 1;
        this.stage.disableVisibilityChange = false;

        this.stage.backgroundColor = 0xffffff;
        game.tweens.frameBased = false;
        game.time.advancedTiming = true;

        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        G.sb.add(

            'onWallClockTimeUpdate',

            'onLifeTimerUpdate',

            'onActionFinish',

            'onLevelFinished',

            'onChestOpen',

            'onCandyToUIAnim',
            'onCandyAnimationStart',
            'onCandyAnimationFinish',
            'onCandyFallStart',
            'onCandyFallFinish',
            'onCellHit',
            'onCandyMatch',
            'onCandyChangedIntoSpecial',
            'displayPoints',
            'onPointsChange',
            'onPointsAdded',
            'onCollectableRemove',

            'madeMove',
            'userMadeMove',
            'actionMatchEnd',
            'actionFallEnd',
            'actionQueueEmpty',
            'onGoalAchieved',

            'onWinLevelPopUp',

            'changeMoveNumber',

            'girlWideSmile',

            'onSoundSettingsChange',
            'onStateChange',
            'onScreenResize', 
            'onWindowOpened',
            'onWindowClosed',
            'pushWindow',
            'closeAndOpenWindow',
            'onAllWindowsClosed',
            'onCoinsChange',
            'refreshBoosterAmount',


            'onBoosterUse',
            'onBoosterUsed',
            'onStartBoosterUsed',
            'onBoosterBought',
            'onBoosterActionFinished',
            'onBoosterSelect',
            'onBoosterDeselect',
            'onExtraMovesUsed',
            'onOutOfMovesWatch',
            'onOutOfMovesBuy',

            'onBoosterSwapCandySelect',


            'fx',
            'fxTop',
            'UIfx',
            'fxMap',

            'onGlobalGoalRemove',
            'onGoalCreated',

            'onMapToUIPart',
            'onMapToUIPartFinished',
            'newPopOutMoney',
            'onGlobalGoalOutOfTime',

            'onCandyInfect',
            'onCandyInfectionRemove',

            'closeOverlay',
            'startOverlay',

            'onTutorialFinish',

            'onLevelMoneyGain',

            'onComboIncrease',
            'onComboBreak',

            'onDailyFreeSpinGain',

            'refreshItemAmount',

            'sentLife',

            'onStarterPackBought',

            'onMapGiftRemoved',

            'onLifeAdded'
            
        );



        this.scaleGameSizeUpdate = function() {

            var world = game.state.current === 'World';

            var ratio = window.innerWidth/window.innerHeight;
            var state = game.state.getCurrentState();
            var standardWidth = G.l(640) //* (world ? 1.3 : 1);
            var maxMobileWidth = 1000;
            var standardHeight = G.l(960) //* (world ? 1.3 : 1);
            var standardRatio = standardWidth/standardHeight;
            
            if (state.NOTRESIZABLE || state.NOSCALABLE) {
                return;
            }

            G.horizontal = ratio > 1.2;
            if (G.horizontal && game.state.current === 'Game') {
                standardHeight = /*G.l(770)*/G.l(864) //* (world ? 1.3 : 1); 
            }
 
            if (ratio > standardRatio) {
                game.scale.setGameSize( Math.ceil(standardHeight*ratio) ,standardHeight);
                standardWidth = G.l(640)
                game.world.setBounds( Math.ceil((game.width-standardWidth)*-0.5),0,game.width,game.height);
            }else {
                game.scale.setGameSize( standardWidth, Math.ceil(standardWidth*(window.innerHeight/window.innerWidth)));
                 standardWidth = G.l(640);
                game.world.setBounds(Math.ceil((game.width-standardWidth)*-0.5),0,Math.ceil((game.height-standardHeight)*-0.5),game.height);
            }


            
            if (G.sb) {
                G.sb.onScreenResize.dispatch(game.width,game.height);
            }   

        };


        // SG_Hooks.setOrientationHandler(this.scaleGameSizeUpdate);
        // SG_Hooks.setResizeHandler(this.scaleGameSizeUpdate);
        // SG_Hooks.setPauseHandler(function(){game.paused = true});
        // SG_Hooks.setUnpauseHandler(function(){game.paused = false});


        game.resizeGame = this.scaleGameSizeUpdate;
        //this.scale.onSizeChange.add(this.scaleGameSizeUpdate);
         
        this.scale.setResizeCallback(function() {
            if (G.old_w != window.innerWidth || G.old_h != window.innerHeight) {
                G.old_w = window.innerWidth;
                G.old_h = window.innerHeight;
                game.resizeGame();
            }
        });

        // SG_Hooks.setOrientationHandler(this.scaleGameSizeUpdate);
        // SG_Hooks.setResizeHandler(this.scaleGameSizeUpdate);
        // SG_Hooks.setPauseHandler(function() {
        //     game.paused = true;
        // });
        // SG_Hooks.setUnpauseHandler(function() {
        //     game.paused = false;
        // });

        // game.incentivised = SG_Hooks.isEnabledIncentiviseButton();

        game.resizeGame();

    },

    preload: function () {

        game.load.image('background_1',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/background_1.jpg'); 
        game.load.image('whell_1',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/whell_1.png'); 
        game.load.image('whell_2',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/whell_2.png');
        game.load.image('loading_bar',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/loading_bar.png');
        game.load.image('loading_bar_full',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/loading_bar_full.png');
        game.load.image('logo',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/logo.png'); 
        game.load.image('donut_title',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/donut_title.png'); 
        game.load.image('shine_title',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/shine_title.png');
        game.load.image('logo_game_loader',imagePrefix+'assets/'+G.Loader.currentConfig+'/bootAssets/logo_game_loader.png'); 
        G.Loader.loadLists();
    },

    create: function () { 
        game.resizeGame();
        G.overlayBitmap = game.make.bitmapData(256,256);
        G.overlayBitmap.fill(255,0,0,1);
        game.state.start('Preloader');
        
    },

    enterIncorrectOrientation: function () {

        G.orientated = false;
        document.getElementById('orientation').style.display = 'block';

    },

    leaveIncorrectOrientation: function () {

        G.orientated = true;
        document.getElementById('orientation').style.display = 'none';

    }

};


(function() {       
    function observer(command){     
        if(!command) return;             
                
        switch(command.action) {        
            case 'pauseGame':
                game.paused = true;
                break;
            case 'unpauseGame':
                game.paused = false;
                break;
            case 'runGame':
                if (G.ANOTHERTABLOCK) return;

                if (!G.sfx.music.isPlaying) G.sfx.music.play('',0,1,true);
                if (game.sound.mute) G.sfx.music.pause();

                console.log('runGame');

                G.sb.onStateChange.dispatch('TitleScreen');

                break;
        }       
    }       
    // SG_Hooks.registerObserver(observer);        
})();
/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,i=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=/constructor/i.test(e.HTMLElement),f=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},u="application/octet-stream",s=1e3*40,d=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,s)},c=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(i){f(i)}}}},l=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},p=function(t,f,s){if(!s){t=l(t)}var p=this,v=t.type,w=v===u,m,y=function(){c(p,"writestart progress write writeend".split(" "))},h=function(){if(w&&a&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=r.result;e.location.href="data:attachment/file"+t.slice(t.search(/[,;]/));p.readyState=p.DONE;y()};r.readAsDataURL(t);p.readyState=p.INIT;return}if(!m){m=n().createObjectURL(t)}if(w){e.location.href=m}else{var o=e.open(m,"_blank");if(!o){e.location.href=m}}p.readyState=p.DONE;y();d(m)};p.readyState=p.INIT;if(o){m=n().createObjectURL(t);setTimeout(function(){r.href=m;r.download=f;i(r);y();d(m);p.readyState=p.DONE});return}h()},v=p.prototype,w=function(e,t,n){return new p(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=l(e)}return navigator.msSaveOrOpenBlob(e,t)}}v.abort=function(){};v.readyState=v.INIT=0;v.WRITING=1;v.DONE=2;v.error=v.onwritestart=v.onprogress=v.onwrite=v.onabort=v.onerror=v.onwriteend=null;return w}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define([],function(){return saveAs})}

G.Editor = function (game) {

    //  When a State is added to Phaser it automatically has the following properties set on it, even if they already exist:

    this.game;      //  a reference to the currently running game (Phaser.Game)
    this.add;       //  used to add sprites, text, groups, etc (Phaser.GameObjectFactory)
    this.camera;    //  a reference to the game camera (Phaser.Camera)
    this.cache;     //  the game cache (Phaser.Cache)
    this.input;     //  the global input manager. You can access this.input.keyboard, this.input.mouse, as well from it. (Phaser.Input)
    this.load;      //  for preloading assets (Phaser.Loader)
    this.math;      //  lots of useful common math operations (Phaser.Math)
    this.sound;     //  the sound manager - add a sound, play one, set-up markers, etc (Phaser.SoundManager)
    this.stage;     //  the game stage (Phaser.Stage)
    this.time;      //  the clock (Phaser.Time)
    this.tweens;    //  the tween manager (Phaser.TweenManager)
    this.state;     //  the state manager (Phaser.StateManager)
    this.world;     //  the game world (Phaser.World)
    this.particles; //  the particle manager (Phaser.Particles)
    this.physics;   //  the physics manager (Phaser.Physics)
    this.rnd;       //  the repeatable random number generator (Phaser.RandomDataGenerator)

    //  You can use any of these from any function within this State.
    //  But do consider them as being 'reserved words', i.e. don't create a property for your own game called "world" or you'll over-write the world reference.

};
G.Editor.prototype = { 

    init: function(lvlNr) {
        s = game.state.getCurrentState();
        this.EDITOR = true;
        this.NOTRESIZABLE = true;
        G.lvl = {};
        G.lvlNr = lvlNr;
        G.lvl.data = G.json.levels[lvlNr];
        G.lvlData = G.json.levels[lvlNr];
        G.lvl = new G.LvlObject(); 
        
    },

    create: function () {
        game.world.setBounds(0,0,game.width,game.height);
        game.scale.setGameSize(2000,1500); 

        this.txt = game.add.existing(new G.OneLineText(0,0,'font-white','LEVEL '+(G.lvlNr+1),30,300,0,0));

        this.board = new G.Board(G.lvlData,G.l(72),true);
        this.board.update = function(){};
        this.board.actionManager.glowPossibleMoves = function(){};
        this.board.moveTo(50,50);

        this.board.boardIce.alpha = 0.7;

        this.board.inputController.destroy();



        this.sidePanel = new G.EditorSidePanel(900);


        this.keys = game.input.keyboard.addKeys({
            'one':Phaser.Keyboard.ONE,
            'two':Phaser.Keyboard.TWO,
            'three':Phaser.Keyboard.THREE,
            'four':Phaser.Keyboard.FOUR,
            'five':Phaser.Keyboard.FIVE,
            'six':Phaser.Keyboard.SIX,
            'seven' :Phaser.Keyboard.SEVEN,
            'eight' :Phaser.Keyboard.EIGHT,
            'nine' :Phaser.Keyboard.NINE,
            'zero' :Phaser.Keyboard.ZERO,

            'z':Phaser.Keyboard.Z,
            'x':Phaser.Keyboard.X,
            'c':Phaser.Keyboard.C,
            'v':Phaser.Keyboard.V,
            'b':Phaser.Keyboard.B,
            'n':Phaser.Keyboard.N,
            'm':Phaser.Keyboard.M,
            'l':Phaser.Keyboard.L,
            
            'Q':Phaser.Keyboard.Q,
            'W':Phaser.Keyboard.W,
            'E':Phaser.Keyboard.E,
            'R':Phaser.Keyboard.R,
            'T':Phaser.Keyboard.T,
            'Y':Phaser.Keyboard.Y,
            'U':Phaser.Keyboard.U,

            'P':Phaser.Keyboard.P,

            'A': Phaser.Keyboard.A,
            'S': Phaser.Keyboard.S,
            'SPACE' : Phaser.Keyboard.SPACEBAR
        });

        this.keys.one.onDown.add(function() { this.dbgChangeCandy('1')},this);
        this.keys.two.onDown.add(function() { this.dbgChangeCandy('2')},this);
        this.keys.three.onDown.add(function() { this.dbgChangeCandy('3')},this);
        this.keys.four.onDown.add(function() { this.dbgChangeCandy('4')},this);
        this.keys.five.onDown.add(function() { this.dbgChangeCandy('5')},this);
        this.keys.six.onDown.add(function() { this.dbgChangeCandy('6')},this);
        this.keys.seven.onDown.add(function() { this.dbgChangeCandy('r')},this);
        this.keys.eight.onDown.add(function() { this.dbgChangeCandy('chest')},this);
        this.keys.nine.onDown.add(function() { this.dbgChangeCandy('goalCandy')},this);
        this.keys.S.onDown.add(function() { this.dbgChangeCandy('infection')},this);

        this.keys.SPACE.onDown.add(function() {
            for (var xx = 0; xx<8; xx++) {
                for (var yy = 0; yy<8; yy++) {

                    if (this.board.isCellOnBoard(xx,yy)) {
                        var candy = this.board.getCandy(xx,yy);
                        if (candy) candy.destroy();
                        this.board.boardCandies.newCandy(xx,yy,this.board.getRandomThatDoesntMatch(xx,yy));
                    }
                   
                }
            }

        },this);

        this.keys.zero.onDown.add(function() {
            for (var xx = 0; xx<8; xx++) {
                for (var yy = 0; yy<8; yy++) {

                    if (this.board.isCellOnBoard(xx,yy)) {
                        var candy = this.board.getCandy(xx,yy);
                        if (candy) candy.destroy();
                        this.board.boardCandies.newCandy(xx,yy,'r');
                    }
                   
                }
            }

        },this);


        this.keys.P.onDown.add(function() {
             var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;
            if (this.board.isCellOnBoard(pos)) {
                
                var candy = this.board.getCandy(pos[0],pos[1]);
                if (candy && candy.candyType !== 'infection') {

                    candy.infected ? candy.infect() : candy.removeInfection();
                    
                }

            };

        },this);



        this.keys.A.onDown.add(function() {
             var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;
            if (this.board.isCellOnBoard(pos)) {
                
                var candy = this.board.getCandy(pos[0],pos[1]);
                if (candy && candy.candyType !== 'infection') {

                    candy.wrapped ? candy.unwrap() : candy.wrap();
                    
                }

            };

        },this);


        this.keys.W.onDown.add(function() { 


            var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;
            if (this.board.isCellOnBoard(pos)) {
                var elem = this.board.boardIce.grid.get(pos[0],pos[1]);
                if (elem) {

                    if (elem.hp == 4) {
                        this.board.boardIce.destroyCell(pos[0],pos[1]);
                        this.board.boardIce.setIce(pos[0],pos[1],3);
                    }else if (elem.hp == 3) {
                        this.board.boardIce.destroyCell(pos[0],pos[1]);
                        this.board.boardIce.setIce(pos[0],pos[1],2); 
                    }else if (elem.hp == 2) {
                        this.board.boardIce.destroyCell(pos[0],pos[1]);
                        this.board.boardIce.setIce(pos[0],pos[1],1); 
                    }else {
                        this.board.boardIce.destroyCell(pos[0],pos[1]);
                    }

                }else {
                    this.board.boardIce.setIce(pos[0],pos[1]);
                }
            }
        },this);


        this.keys.Y.onDown.add(function() {


            
            var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;

            if (this.board.boardData.get(pos[0],pos[1]) == 'X') {
                this.board.boardData.set(pos[0],pos[1],null);
                this.board.boardBackground.redraw();
                return;
            };

            //if (this.board.boardData.get(pos[0],pos[1])) {
            this.board.boardData.set(pos[0],pos[1],'X');
            this.board.boardBackground.redraw();
            if (this.board.boardCandies.grid.get(pos[0],pos[1])) {
                this.board.removeCandy(pos[0],pos[1]);
            }
            if (this.board.boardIce.grid.get(pos[0],pos[1])) {
                this.board.boardIce.destroyCell(pos[0],pos[1]);
            }
            if (this.board.boardCage.grid.get(pos[0],pos[1])) {
                this.board.boardCage.destroyCell(pos[0],pos[1]);
            }
            if (this.board.boardDirt.grid.get(pos[0],pos[1])) {
                this.board.boardDirt.destroyCell(pos[0],pos[1]);
            }



        },this);

        this.keys.U.onDown.add(function() { 

            var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;
            if (this.board.isCellOnBoard(pos)) {

                if (this.board.boardIce.grid.get(pos[0],pos[1])) {

                    if (this.board.boardIce.grid.get(pos[0],pos[1]).hp == 1) {
                        this.board.boardIce.destroyCell(pos[0],pos[1]);
                        this.board.boardIce.setChocolate(pos[0],pos[1],2,false,true);
                    }else {
                        this.board.boardIce.destroyCell(pos[0],pos[1]);
                    }

                }else {
                    this.board.boardIce.setChocolate(pos[0],pos[1],1,false,true);
                }
            }

        },this);

        this.keys.E.onDown.add(function() {
            var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;
            if (this.board.isCellOnBoard(pos)) {

                var elem = this.board.boardCage.grid.get(pos[0],pos[1]);
                if (elem) {

                    if (elem.hp == 3) {
                        this.board.boardCage.destroyCell(pos[0],pos[1]);
                        this.board.boardCage.setCage(pos[0],pos[1],2);
                    }else if (elem.hp == 2) {
                        this.board.boardCage.destroyCell(pos[0],pos[1]);
                        this.board.boardCage.setCage(pos[0],pos[1],1); 
                    }else {
                        this.board.boardCage.destroyCell(pos[0],pos[1]);
                    }

                }else {
                    this.board.boardCage.setCage(pos[0],pos[1]);
                }
            }
        },this);

        this.keys.R.onDown.add(function() {
            var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (!pos) return;
            if (this.board.isCellOnBoard(pos)) {

                if (this.board.boardDirt.grid.get(pos[0],pos[1])) {

                    if (this.board.boardDirt.grid.get(pos[0],pos[1]).hp == 1) {
                        this.board.boardDirt.destroyCell(pos[0],pos[1]);
                        this.board.boardDirt.setDirt(pos[0],pos[1],2);
                    }else if (this.board.boardDirt.grid.get(pos[0],pos[1]).hp == 2) {
                        this.board.boardDirt.destroyCell(pos[0],pos[1]);
                        this.board.boardDirt.setDirt(pos[0],pos[1],3); 
                    }else {
                        this.board.boardDirt.destroyCell(pos[0],pos[1]);
                    }

                }else {
                    this.board.boardDirt.setDirt(pos[0],pos[1],1);
                }
            }
        },this);

          this.keys.T.onDown.add(function() {
            var pos = this.board.inputController.pointerToCell(game.input.activePointer);
            if (pos && this.board.getCandy(pos[0],pos[1])) {
                 this.board.removeCandy(pos[0],pos[1]);
            }
           
        },this);


        this.keys.z.onDown.add(function() {

            this.sidePanel.exportLevel();

            var width = G.lvlData.levelData.length;
            var levelData = G.lvlData.levelData;
            var newLevelData = JSON.parse(JSON.stringify(levelData));

            var toCol = (width % 2 == 0) ? (width*0.5) : Math.floor(width*0.5);
            for (var col = 0; col < toCol; col++) {
                
                newLevelData[col] = JSON.parse(JSON.stringify(levelData[col]));
                newLevelData[width-(col+1)] = JSON.parse(JSON.stringify(levelData[col]));
            }

            G.lvlData.levelData = newLevelData;

            game.state.start("Editor",true,false,G.lvlNr);

        },this);


        this.keys.x.onDown.add(function() {

            this.sidePanel.exportLevel();

            var height = G.lvlData.levelData[0].length;
            var levelData = G.lvlData.levelData;
            var newLevelData = JSON.parse(JSON.stringify(levelData));

            var toRow = (height % 2 == 0) ? (height*0.5) : Math.floor(height*0.5);

            for (var col = 0; col < levelData.length; col++) {
                for (var row = 0; row < toRow; row++) {

                    newLevelData[col][height-(row+1)] = JSON.parse(JSON.stringify(newLevelData[col][row]));

                }
            }

            G.lvlData.levelData = newLevelData;

            game.state.start("Editor",true,false,G.lvlNr);


        },this);

    },

    update: function() {

    },


    changeBoardSize: function(width,height) {

        var width = game.math.clamp(width,4,8);
        var height = game.math.clamp(height,4,8);

        var oldBoardData = this.board.boardData;
        this.board.boardData = new G.GridArray(width,height,null);
        oldBoardData.loop(function(elem,x,y,data) {
            if (this.board.boardData.isInGrid(x,y)) {
                if (elem == 'X') {
                    this.board.boardData.set(x,y,'X');
                }
            }
        },this);

        this.board.boardBackground.redraw();

        var oldCandyData = this.board.boardCandies.grid;
        this.board.boardCandies.grid = new G.GridArray(width,height,false);
        oldCandyData.loop(function(elem,x,y) {
            if (this.board.boardCandies.grid.isInGrid(x,y)) {
                this.board.boardCandies.grid.set(x,y,elem);
            }else {
                if (elem && elem.destroy) {
                    elem.destroy();
                }
            } 

        },this);

        var oldIceData = this.board.boardIce.grid;
        this.board.boardIce.grid = new G.GridArray(width,height,false);
        console.log("w&h: "+width+'x'+height);
        oldIceData.loop(function(elem,x,y) {
            if (this.board.boardIce.grid.isInGrid(x,y)) {
                this.board.boardIce.grid.set(x,y,elem);
            }else {
                if (elem && elem.destroy) {
                    elem.destroy();
                }
            }
        },this);

        var oldCageData = this.board.boardCage.grid;
        this.board.boardCage.grid = new G.GridArray(width,height,false);
        oldCageData.loop(function(elem,x,y) {
            if (this.board.boardCage.grid.isInGrid(x,y)) {
                this.board.boardCage.grid.set(x,y,elem);
            }else {
                if (elem && elem.destroy) {
                    elem.destroy();
                }
            }
        },this);

        var oldBoardDirt = this.board.boardDirt.grid;
        this.board.boardDirt.grid = new G.GridArray(width,height,false);
        oldBoardDirt.loop(function(elem,x,y) {
            if (this.board.boardDirt.grid.isInGrid(x,y)) {
                this.board.boardDirt.grid.set(x,y,elem);
            }else {
                if (elem && elem.destroy) {
                    elem.destroy();
                }
            }
        },this);


    },

    dbgChangeCandy: function(type) {

        var pos = this.board.inputController.pointerToCell(game.input.activePointer);
        if (!pos) return;
        if (this.board.isCellOnBoard(pos)) {
            
            var candy = this.board.getCandy(pos[0],pos[1]);
            if (candy) candy.destroy();

            this.board.boardCandies.newCandy(pos[0],pos[1],type);

        };
        
    },

    render: function() {
        game.debug.text(game.time.fps,300,10,'#ff0000');

        var pos = this.board.inputController.pointerToCell(game.input.activePointer);

        game.debug.text(this.board.inputController.isPointerInRange(game.input.activePointer),10,10,'#ff0000');
        game.debug.text(pos,10,40,'#ff0000');
        
        game.debug.text(this.board.isCellOnBoard(this.board.inputController.pointerToCell(game.input.activePointer)),10,80,'#ff0000');


        if (pos) {
            var candy = this.board.getCandy(pos[0],pos[1]);
            if (candy) game.debug.text(candy.candyType,10,150,'#ff0000');
        }
    }
};

G.EditorWorld = function (game) {
  

};

G.EditorWorld.prototype = {

	init: function() {

		s = game.state.getCurrentState();
		this.NOTRESIZABLE = true;
		this.EDITOR = true;

		this.fillSaveState3Stars();

	},

	create: function () {
		game.world.setBounds(0,0,game.width,game.height);
		game.scale.setGameSize(2300,1300);
		this.map = new G.WorldMap(G.json.settings.mapTiles,
			[], 
			G.json.levels,true);


	this.sidePanel = new G.EditorWorldSidePanel(1400,10); 


	this.selectedLevel = null;

	this.keys = game.input.keyboard.addKeys({C: Phaser.Keyboard.C,M: Phaser.Keyboard.M});

	this.cursors = game.input.keyboard.createCursorKeys();

	game.input.onDown.add(function(pointer) {

		var xx = Math.floor((pointer.worldX-this.map.x)*(1/G.Loader.currentConfigMulti))
		var yy = Math.floor((pointer.worldY-this.map.y)*(1/G.Loader.currentConfigMulti))

		if (this.keys.C.isDown) {
			this.map.lvlBtnGroup.add(G.makeImage(xx,yy,'map_point',0.5));
			G.json.levels.push({
				mapX:xx,
				mapY:yy,
				moves: 30,
				rainbowChance: 2,
				nrOfTypes: 5,
				goal: ['collect',[['1',5],['2',5],['3',5],['4',5]]],
        starsReq: [5000,7500,10000],
        drops: [],
				levelData: [[["1"],["3"],["1"],["4"],["1"]],[["2"],["3"],["2"],["3"],["4"]],[["4"],["1"],["2"],["1"],["2"]],[["1"],["4"],["4"],["3"],["1"]],[["2"],["1"],["3"],["2"],["4"]],[["3"],["4"],["1"],["4"],["3"]]]
			});
			this.fillSaveState3Stars();
			this.map.refreshButtons();
		}

		if (this.keys.M.isDown) {

			if (this.selectedLevel === null) return;

			G.json.levels[this.selectedLevel].mapX = xx;
			G.json.levels[this.selectedLevel].mapY = yy;
			this.map.refreshButtons();

		}

	},this);
	

		 var toolBtn = game.add.bitmapText(150,0,'font-white','TOOL',30);
        toolBtn.inputEnabled = true;
        toolBtn.input.useHandCursor = true;
        toolBtn.events.onInputDown.add(function() { 
             G.openLevelMgr(G.json.levels)
        },this);
        game.add.existing(toolBtn);


	},

	selectLevel: function(lvlNr) {

		this.selectedLevel = lvlNr;
		this.sidePanel.refresh();

	},

	fillSaveState3Stars: function() {

		G.saveState.data.levels = [];
		for (var i = 0; i < G.json.levels.length; i++) {
        	G.saveState.data.levels.push(3);
    	} 
    	G.saveState.save();


	},

	update: function () {

		if (this.selectedLevel === null) return;

		if (this.cursors.up.isDown) {
			G.json.levels[this.selectedLevel].mapY--;
			this.map.refreshButtons();
		}
		if (this.cursors.down.isDown) {
			G.json.levels[this.selectedLevel].mapY++;
			this.map.refreshButtons();
		}

		if (this.cursors.left.isDown) {
			G.json.levels[this.selectedLevel].mapX--;
			this.map.refreshButtons();
		}
		if (this.cursors.right.isDown) {
			G.json.levels[this.selectedLevel].mapX++;
			this.map.refreshButtons();
		}

	},

	render: function() {
        game.debug.text(game.time.fps,10,10,'#ff0000');
  }

};


G.ErrorState = function () {

};

G.ErrorState.prototype = {

	preload: function(){


	},

	create: function(){

		this.bg = new G.LevelBg();
		new G.AnotherTabWindow();

	}

};
G.Game = function (game) {};

G.Game.prototype = { 

    init: function(lvlNr,debugMode,startBoosters) {

        G.giftStatusIndex = 0;

        s = game.state.getCurrentState();
        this.lvlNr = Math.min(G.json.levels.length-1,lvlNr);

        //GA.getInstance().setCustomDimension(1,(this.lvlNr+1).toString());

        G.lvlData = JSON.parse(JSON.stringify(G.json.levels[lvlNr]));

        this.debugMode = debugMode || false; 
        G.debugMode = this.debugMode;
 
        // SG_Hooks.levelStarted(this.lvlNr+1);
        console.log("SG_Hooks.levelStarted(this.lvlNr+1)");

        this.startBoosters = startBoosters || false;

        this.doubleMoney = false;

    },

    preload: function() {

 
    },

    create: function () {

        game.resizeGame();

        //lose life to prevent cheating
        G.saveState.loseLife();

        G.ga.event('Start:Gate' + G.saveState.checkGateNr(this.lvlNr) + ':Level' + (this.lvlNr+1));

        this.tracker = new G.TrackData(this.lvlNr);

        G.lvl = new G.LvlObject(); 
        
        if (this.debugMode) game.resizeGame();

        this.bg = new G.LevelBg();

        this.board = new G.Board(G.lvl.data,G.l(72)); 

        this.topBar = new G.UI_TopBar();
        this.boosterPanel = new G.UI_BoosterPanel();

        this.collectableAnimLayer = new G.CollectableAnimLayer(this.board,this.topBar);

        this.chestLayer = new G.ChestLayer();

        this.UIFxLayer = new G.UIFxLayer();

        this.fxTopLayer = new G.TopFxLayer(this.board,'fxTop');
        this.fxTopLayer.position = this.board.boardCandies.position;

        this.pointsLayer = new G.PointsLayer(this.topBar);

        this.popOutMoneyLayer = new G.PopOutMoneyLayer();

        //this.comboIndicator = new G.UI_ComboIndicator();

        this.shoutOuts = new G.UI_ShoutOuts();

        this.overlay = new G.Overlay();


        this.windowLayer = new G.WindowLayer();


        this.fadeLayer = new G.FadeLayer();

        //new G.Window('level');
        this.windowLayer.pushWindow('taskSlider');

        if (G.json.tutorials[(this.lvlNr+1)] && G.saveState.data.finishedTutorials.indexOf(this.lvlNr+1) == -1) {

            G.sb.onAllWindowsClosed.addOnce(function() {
                new G.Tutorial(this.lvlNr+1);
            },this);

            
            G.sb.onTutorialFinish.addOnce(function() {
                G.sb.actionQueueEmpty.addOnce(function() {
                this.board.actionManager.newAction('startBoosterInit');
                },this);
            },this);

        }else {

            G.sb.onAllWindowsClosed.addOnce(function() {
                this.board.actionManager.newAction('startBoosterInit');
            },this);

        }


        if (this.debugMode) {
            this.debugInit();
        }

        game.resizeGame();

        didstartGame();
    },

    update: function() {

        G.delta();

        if (G.DEBUG) {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
        }
 
    },

    render: function() {

        return;

        game.debug.text(s.board.boardCandies.infectionToMake,300,10,'#ff0000');

        game.debug.text(game.time.fps,300,50,'#ff0000');

        game.debug.text(G.deltaTime,300,100,'#ff0000');

        game.debug.text(game.time.fps,300,10,'#ff0000');

        game.debug.text(game.load.isLoading,500,30);
        game.debug.text(game.load.progressFloat,500,60);

        game.debug.text('time: '+game.time.elapsedMS,300,30,'#ff0000');
        game.debug.text('p time: '+game.time.physicsElapsedMS,300,50,'#ff0000');

        game.debug.text('G.deltaTime: '+G.deltaTime,300,80,'#ff0000');

        game.debug.text(G.lvl.points,300,120,'#ff0000');

        var pos = this.board.inputController.pointerToCell(game.input.activePointer);

        game.debug.text(this.board.inputController.isPointerInRange(game.input.activePointer),10,10,'#ff0000');
        game.debug.text(pos,10,40,'#ff0000');

        game.debug.text(this.board.isCellOnBoard(this.board.inputController.pointerToCell(game.input.activePointer)),10,80,'#ff0000');

        game.debug.text(this.board.boardCandies.rabbitTimer,10,120,'#ff0000');

        if (pos) {
            var candy = this.board.getCandy(pos[0],pos[1]);
            if (candy) {
                game.debug.text(candy.candyType,10,150,'#ff0000');
                game.debug.text(candy.scale.x,10,400,'#ff0000');
            }
        }
    },

    initDebugTools: function() {

        var keys = game.input.keyboard.addKeys({one: Phaser.Keyboard.ONE, two: Phaser.Keyboard.TWO, three: Phaser.Keyboard.THREE, four: Phaser.Keyboard.FOUR, five: Phaser.Keyboard.FIVE, six: Phaser.Keyboard.SIX, r: Phaser.Keyboard.R})
        keys.one.onDown.add(function() {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
            s.board.getCandy(this.dbgPos[0],this.dbgPos[1]).changeInto('1');
        },this);
         keys.two.onDown.add(function() {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
            s.board.getCandy(this.dbgPos[0],this.dbgPos[1]).changeInto('2');
        },this);
          keys.three.onDown.add(function() {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
            s.board.getCandy(this.dbgPos[0],this.dbgPos[1]).changeInto('3');
        },this);
           keys.four.onDown.add(function() {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
            s.board.getCandy(this.dbgPos[0],this.dbgPos[1]).changeInto('4');
        },this);
            keys.five.onDown.add(function() {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
            s.board.getCandy(this.dbgPos[0],this.dbgPos[1]).changeInto('5');
        },this);
            keys.six.onDown.add(function() {
            this.dbgPos = this.board.inputController.pointerToCell(game.input.activePointer);
            s.board.getCandy(this.dbgPos[0],this.dbgPos[1]).changeInto('6');
        },this);
        



    },


    debugInit: function() {
       

            this.initDebugTools();

            var levelNr = game.add.bitmapText(0,0,'font-white','LEVEL '+(this.lvlNr+1),30);
            game.add.existing(levelNr);

            var toolBtn = game.add.bitmapText(150,0,'font-white','TOOL',30);
            toolBtn.inputEnabled = true;
            toolBtn.input.useHandCursor = true;
            toolBtn.events.onInputDown.add(function() { 
                 G.openLevelMgr(G.json.levels)
            },this);
            game.add.existing(toolBtn);

            var mapBtn = game.add.bitmapText(250,0,'font-white','MAP',30);
            mapBtn.inputEnabled = true;
            mapBtn.input.useHandCursor = true;
            mapBtn.events.onInputDown.add(function() { 
                 game.state.start("EditorWorld");
            },this);
            game.add.existing(mapBtn);

            var editBtn = game.add.bitmapText(350,0,'font-white','LVL EDIT',30);
            editBtn.inputEnabled = true;3
            editBtn.input.useHandCursor = true;
            editBtn.events.onInputDown.add(function() { 
                 game.state.start("Editor",true,false,this.lvlNr);
            },this);
            game.add.existing(editBtn);

            var prevBtn = game.add.bitmapText(500,0,'font-white','PREV',30);
            prevBtn.inputEnabled = true;
            prevBtn.input.useHandCursor = true;
            prevBtn.events.onInputDown.add(function() { 
                console.log("current: "+G.lvlNr);
                console.log("prev: "+Math.max(0,this.lvlNr-1));
                 game.state.start("Game",true,false,Math.max(0,this.lvlNr-1),true);
            },this);
            game.add.existing(prevBtn);

            var nextBtn = game.add.bitmapText(600,0,'font-white','NEXT',30);
            nextBtn.inputEnabled = true;
            nextBtn.input.useHandCursor = true;
            nextBtn.events.onInputDown.add(function() { 
                console.log("current: "+G.lvlNr);
                console.log("nextL "+Math.min(G.json.levels.length-1,this.lvlNr+1));
                 game.state.start("Game",true,false,Math.min(G.json.levels.length-1,this.lvlNr+1),true);
            },this);
            game.add.existing(nextBtn);

        

    }
};

G.debugGoToLevel = function(nr) {

    G.saveState.data.levels = [];
    G.saveState.data.finishedTutorials = [];

    G.saveState.data.boosters = [null,30,30,30,30,30,30,30,30];

    for (var i = 0; i < nr; i++) {
        G.saveState.data.levels.push(3);
    } 

    game.state.start("Game",true,false,nr-1,true);

};

G.MapEditor = function (game) {
  

};

G.MapEditor.prototype = {

	init: function() {

		s = game.state.getCurrentState();

	},

	create: function () {
		
		this.mapGroup = new G.StrObjGroup(game.width*0.5,game.height*0.5,G.json.map);

		this.gfxHelpLayer = game.add.graphics();
		this.gfxHelpLayer.lineStyle(1,0xff0000,0.5);
		this.gfxHelpLayer.moveTo(0,0);
		this.gfxHelpLayer.lineTo(0,2000);
		this.gfxHelpLayer.moveTo(-600,0);
		this.gfxHelpLayer.lineTo(-600,2000);
		this.gfxHelpLayer.moveTo(600,0);
		this.gfxHelpLayer.lineTo(600,2000);

		this.modify = new G.Modify();
		this.modify.addMouseWheel();

	},

	update: function () {

		this.mapGroup.x = game.world.bounds.x+game.width*0.5;
		this.gfxHelpLayer.x = this.mapGroup.x;
		
	},

	render: function() {
        //game.debug.text(game.time.fps,10,10,'#ff0000');
  }

};

G.MidLoader = function (game) {};

G.MidLoader.prototype = {

    init: function(goTo,args) {

        console.log("mid state loader init");

        this.transitionCandy = G.makeImage(480,0,'transition',0.5);
        this.transitionCandy.angle = G.fadeTransitionAngle || 0;
        this.transitionCandy.scale.setTo(7);
        this.transitionCandy.y = game.height*0.5;

        this.softGamesLogo = new G.Button(480,0,'softgames_logo',function() {
            // if (SG) SG.redirectToPortal();
        });
        game.add.existing(this.softGamesLogo);
        this.softGamesLogo.y = game.height*0.5;
        this.softGamesLogo.width = G.l(800);
        this.softGamesLogo.scale.y = this.softGamesLogo.scale.x;
        this.softGamesLogo.addTerm(function(){return this.alpha == 1});
        this.softGamesLogo.input.useHandCursor = false;
        this.softGamesLogo.alpha = 0;
        
        

        this.goTo = goTo;
        this.neededAssets = G.Assets[goTo];
        this.args = args || [];



    },

    create: function() {

       

    },

    update: function() {

        G.delta();

        this.transitionCandy.angle += 1*G.deltaTime;
        G.fadeTransitionAngle = this.transitionCandy.angle;

        if (G.Loader.checkAssets(this.neededAssets)) {
            this.softGamesLogo.alpha = game.math.clamp(this.softGamesLogo.alpha-0.05,0,1);
            if (this.softGamesLogo.alpha == 0) {
                this.args.splice(0,0,this.goTo,true,false);
                game.state.start.apply(game.state,this.args);
            }
        }else {
            this.softGamesLogo.alpha = game.math.clamp(this.softGamesLogo.alpha+0.05,0,1);
        }

    }

};

    

G.Preloader = function () {

};

G.Preloader.prototype = {

	preload: function() { 

        didStartPreLoad();
        this.removeSpinner();
    
        this.bg = new G.LevelBg();

        this.logo = new G.Logo(320,360);

        this.loadingBar = game.add.image(320,650,'loading_bar');
        this.loadingBar.x -= this.loadingBar.width*0.5;
        this.loadingBar.y -= this.loadingBar.height*0.5;
        this.loadingBarFull = game.add.image(320,650,'loading_bar_full');
        this.loadingBarFull.x -= this.loadingBarFull.width*0.5;
        this.loadingBarFull.y -= this.loadingBarFull.height*0.5;
        this.load.setPreloadSprite(this.loadingBarFull,0);        
        G.Loader.loadAssets();

        //lang dependent
        var supportedShoutouts = ['en','ru','de','es','fr','it','nl','pl','tr','pt'];
        if (supportedShoutouts.indexOf(G.lang)!== -1){
            game.load.atlasJSONHash('shoutouts', imagePrefix+'assets/hd/langdependent/shoutouts-'+G.lang+'.png',resourcePrefix+'assets/hd/langdependent/shoutouts-'+G.lang+'.json');
        }else{
            //pick english as fallback
            game.load.atlasJSONHash('shoutouts', imagePrefix+'assets/hd/langdependent/shoutouts-en.png',resourcePrefix+'assets/hd/langdependent/shoutouts-en.json');
        }
        G.spritesheetList.push('shoutouts');

        this.fadeLayer = new G.FadeLayer();

	},

	create: function () { 

        // if (softgames && softgames.gameOpenedInAnotherTab) {

        //     G.sb.clear();
        //     G.ANOTHERTABLOCK = true;

        //     this.fadeLayer.destroy();

        //     this.logo.destroy();
        //     this.loadingBar.destroy();
        //     this.loadingBarFull.destroy();

        //     new G.AnotherTabWindow();

        //     return;

        // }
        didLoadCompleted();
        G.json.settings.boostersUnlock = [null,0,0,0,0];

        Object.keys(G.json.tutorials).forEach(function(key) {
           if (G.json.tutorials[key].boosterNr) {
                G.json.settings.boostersUnlock[G.json.tutorials[key].boosterNr] = parseInt(key);
           }
        });

        G.saveState.init(); 
        G.platform = new G.Platform();
		
        G.globalGoalMgr = new G.GlobalGoalMgr();
        
        this.processSpecialCandiesJson();

        new G.MapTilesRenderer();

        // if (SG_Hooks.loaded) {
        //     SG_Hooks.loaded();
        // }else {
            if (!G.sfx.music.isPlaying) G.sfx.music.play('',0,1,true);
            if (game.sound.mute) G.sfx.music.pause();
            G.sb.onStateChange.dispatch('TitleScreen');
        // }
    
        game.resizeGame();

	},

    processSpecialCandiesJson: function() {

        G.specialCandies = {
            names: [],
            patterns: [],
            lookUp: {},
            combos: G.json.specialCandies.combos,

            isTypeSpecial: function(type) {
                return this.names.indexOf(type) != -1;
            },

            getSpecialData: function(type) {
                return this.lookUp[type];
            }

        };

        G.json.specialCandies.candies.forEach(function(elem,index,array) {

            G.specialCandies.names.push(elem.name);

            if (elem.patterns) {
                G.specialCandies.patterns.push([elem.name,elem.patterns]);
            }
            

            G.specialCandies.lookUp[elem.name] = elem;

        });

    },

    removeSpinner: function() {

        document.body.style.backgroundColor = '#699519';
        document.body.style.backgroundImage = 'url('+resourcePrefix+'img/bg_tile.png)';
        document.body.style.backgroundRepeat = 'repeat';
        document.body.style.backgroundSize = '300px 300px';

        var spinner = document.getElementsByClassName('spinner')[0]
        if (spinner) {
            if (!('remove' in Element.prototype)) {
                Element.prototype.remove = function() {
                   if (this.parentNode) {
                        this.parentNode.removeChild(this);
    
                    }
                };
            }
            spinner.remove();
        }


    }

};

G.TestState = function (game) {

    //  When a State is added to Phaser it automatically has the following properties set on it, even if they already exist:

    this.game;      //  a reference to the currently running game (Phaser.Game)
    this.add;       //  used to add sprites, text, groups, etc (Phaser.GameObjectFactory)
    this.camera;    //  a reference to the game camera (Phaser.Camera)
    this.cache;     //  the game cache (Phaser.Cache)
    this.input;     //  the global input manager. You can access this.input.keyboard, this.input.mouse, as well from it. (Phaser.Input)
    this.load;      //  for preloading assets (Phaser.Loader)
    this.math;      //  lots of useful common math operations (Phaser.Math)
    this.sound;     //  the sound manager - add a sound, play one, set-up markers, etc (Phaser.SoundManager)
    this.stage;     //  the game stage (Phaser.Stage)
    this.time;      //  the clock (Phaser.Time)
    this.tweens;    //  the tween manager (Phaser.TweenManager)
    this.state;     //  the state manager (Phaser.StateManager)
    this.world;     //  the game world (Phaser.World)
    this.particles; //  the particle manager (Phaser.Particles)
    this.physics;   //  the physics manager (Phaser.Physics)
    this.rnd;       //  the repeatable random number generator (Phaser.RandomDataGenerator)

    //  You can use any of these from any function within this State.
    //  But do consider them as being 'reserved words', i.e. don't create a property for your own game called "world" or you'll over-write the world reference.

};
G.TestState.prototype = { 

    init: function() {
        

    },

    create: function () {

        this.testGroup = game.add.group();

        this.testGroup2 = game.add.group();
        this.testGroup2.x = 10;
        this.testGroup2.add(this.testGroup);
        this.testGroup3 = game.add.group();
        this.testGroup3.y = 50;
        this.testGroup3.add(this.testGroup2);
        this.testGroup4 = game.add.group();
        this.testGroup4.angle = 30;
        this.testGroup4.add(this.testGroup3);
        



        
        
        for (var i = 0; i < 200; i++) {

            var candy = G.makeImage(0,0,'b_play_big_1',0.5);
            
            candy.scale.x = 2;
            candy.dirX = (Math.random()*20)-10;
            candy.dirY = (Math.random()*20)-10;
            candy.update = function() {
                this.x += this.dirX;
                this.y += this.dirY;

                if (this.x < 0) {
                    this.x = 0;
                    this.dirX *= -1;
                }
                if (this.y < 0) {
                    this.y = 0;
                    this.dirY *= -1;
                }

                if (this.x > game.width) {
                    this.x = game.width;
                    this.dirX *= -1;
                }

                if (this.y > game.height) {
                    this.y = game.height;
                    this.dirY *= -1;
                }

            };

        };


    },

    update: function() {

    },

    render: function() {
        game.debug.text(game.time.fps,300,10,'#ff0000');

    }
};
G.TitleScreen = function (game) {};

G.TitleScreen.prototype = { 
    
    init: function() {

        G.giftStatusIndex = 0;
        
        this.stage.backgroundColor = 0xffdddd;

        s = game.state.getCurrentState();
        
        if (game.world.children[0]) game.world.children[0].destroy();
    
 
    },

    create: function () {


        this.bg = new G.LevelBg();

        this.gemThrower = new G.TitleScreenGemsThrower();
        this.gemThrower.alpha = 0.7;

        this.mainGroup = game.add.group();

        this.logo = new G.Logo(320,360);

        //game.add.existing(new G.Button(100,100,'b_play_big_1',function() {game.state.start("TestState")}));

        this.playBtn = new G.Button(320,650,'btn_play',
            function() {
                G.ga.event('FTUE:MainMenu:PlayButton');
                G.sb.onStateChange.dispatch('World');

                didClickedPlay();
            }
        );
        game.add.existing(this.playBtn);

        //this.soundBtn = new G.SoundBtn(100,850); 
        //this.moreGamesBtn = new G.MoreGamesBtn(540,850);

        this.mainGroup.addMultiple([this.logo,this.playBtn]);

        this.fadeLayer = new G.FadeLayer();

        this.editorString = '';
        this.EDITORKEY = game.input.keyboard.addKeys({ 'Q': Phaser.KeyCode.Q, 'W': Phaser.KeyCode.W, 'E': Phaser.KeyCode.E});
        this.EDITORKEY.Q.onDown.add(function() {
            this.onEditorKey('Q');
        },this);
        this.EDITORKEY.W.onDown.add(function() {
            this.onEditorKey('W');
        },this);
        this.EDITORKEY.E.onDown.add(function() {
            this.onEditorKey('E');
        },this);


        G.sb.onScreenResize.add(this.onScreenResize,this);
        this.onScreenResize();

        game.resizeGame();

        G.ga.event('FTUE:MainMenu:Visible');

    },

    onScreenResize: function() {

        if (G.horizontal) {

            this.logo.y = G.l(360);
            //this.soundBtn.x = G.l(50);
            //this.moreGamesBtn.x = G.l(590);
            //this.soundBtn.y = this.moreGamesBtn.y = G.l(850)
            this.playBtn.y = G.l(800);
            this.mainGroup.y = 0;

        }else {

            this.logo.y = G.l(260);
            //this.soundBtn.x = G.l(100);
            //this.moreGamesBtn.x = G.l(540);
            //this.soundBtn.y = this.moreGamesBtn.y = G.l(850)
            this.playBtn.y = G.l(650);
            this.mainGroup.y = (game.height-G.l(960))*0.5;
        }


    },

    update: function() {
        
        G.delta(); 

    },

    onEditorKey: function(letter) {

        this.editorString += letter;

        if (this.editorString.slice(-5) === 'QWEWQ') {
            G.openLevelMgr(G.json.levels);
        }

    },

    render: function() {
          return;
        game.debug.text(Math.floor(game.input.activePointer.x)+'x'+Math.floor(game.input.activePointer.y),10,10,'#ff0000');
        game.debug.text(game.time.fps,10,50,'#ff0000');

      
        
        game.debug.text(game.time.fps,300,10,'#ff0000');

        game.debug.text(game.load.isLoading,300,30,'#ff0000');

        game.debug.text(game.width+'x'+game.height,10,10,'#ff0000');    

    }
};
G.World = function (game) {
  

};

G.World.prototype = {

	init: function(lastLevelData) {

		G.giftStatusIndex = 0;

        s = game.state.getCurrentState();
        this.lastLevelData = lastLevelData;
        this.startBoosterConfig = new G.StartBoosterConfig();

	},

	create: function () {

		//GA.getInstance().setCustomDimension(1);

		game.resizeGame();

		G.saveState.increaseMapVisibleCounter();

		//G.winsInRow = 0;

		G.globalGoalMgr.saveGoals();

		this.map = new G.WorldMap(
			G.json.settings.mapTiles, 
			G.json.settings.mapAnimatedElements,
			G.json.levels
		);

		//2nd level hand tut
		/*
		if (G.saveState.getLastPassedLevelNr() == 1) {
			var hand = G.makeImage(G.json.levels[1].mapX,G.json.levels[1].mapY,'tut_hand',0);
			hand.map = this.map;
			this.lvlTutHand = hand;
			hand.tweenOffset = {x:0,y:0};
			game.add.tween(hand.tweenOffset).to({x:20,y:20},400,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
			hand.update = function(){
				this.x = this.map.x + G.json.levels[1].mapX + this.tweenOffset.x;
				this.y = this.map.y + G.json.levels[1].mapY + this.tweenOffset.y;
			};
		}
		*/


		this.panel = new G.UI_MapPanel();
		this.mapGift = new G.MapGift();

		//this.highscoreGeneralPanel = new G.HighscoreGeneralPanel();

	  	if (G.saveState.getLastPassedLevelNr() >= (G.platform.dailyAfterLvl || 1)) {
	  		this.dailyIcon = new G.UI_DailyIcon(855,145,!G.saveState.data.sawDailyTut);
	  	}
	

		this.uiTargetParticlesBW = new G.UITargetParticles();
	    
		this.windowLayer = new G.WindowLayer(0,50);
		//this.highscorePanel = new G.HighscorePanel();

		this.fxMapLayer = new G.FxMapLayer();

		this.uiTargetParticles = new G.UITargetParticles();
		this.fadeLayer = new G.FadeLayer();
		//G.dailyCheck();

		//open next lvlPopup
		/*if (G.lvlNr+1 == G.saveState.data.levels.length && G.saveState.data.levels.length !== G.json.levels.length){
			G.lvlNr++;
			G.sb.pushWindow.dispatch('level');
		}*/

	},

	update: function () {

		G.delta();
		
	},

	makeBlackOverlay: function() {
		/*var gfx = game.add.graphics();
		gfx.inputEnabled = true;
		gfx.fixedToCamera = true;
		gfx.beginFill(0x000000,0.6);
		gfx.drawRect(0,0,3000,2000);
		G.sb.pushWindow.addOnce(function(){
		  game.add.tween(gfx).to({alpha:0},400,Phaser.Easing.Sinusoidal.In,true);
		  game.time.events.add(500,gfx.destroy,gfx);
		});*/
	},

	render: function() {
		
		return;
        game.debug.text(game.time.fps,10,10,'#ff0000');
        game.debug.text(this.map.y-game.height,10,50,'#ff0000');
        game.debug.text(game.load.isLoading,10,30);
        game.debug.text(game.load.progressFloat,10,60);
        game.debug.text('BOOT',10,100);
  }
  
};

if (typeof G == 'undefined') G = {};

G.Board = function(lvl,tilesize,editor) {

	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.MAX_NUMBER_OF_REGULAR_CANDY = G.lvlData.nrOfTypes;

	this.tilesize = tilesize; 
	this.offsetX = 0;
	this.offsetY = 0;
	this.editorMode = editor;

	this.borderSize = G.l(8);

	this.tweenObj = {a:0.6};
	game.add.tween(this.tweenObj).to({a:1},500,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

	this.levelData = new G.GridArray(lvl.levelData);


	this.boardData = new G.GridArray(this.levelData.width,this.levelData.height);

	this.checkMatchList = [];
	this.checkSpecialMatchList = [];
	this.checkAfterFall = [];
	this.fallCheckList = [];

	this.duringAnimation = 0;
	this.duringFall = 0;
	G.sb.onCandyFallStart.add(function() {this.duringFall++},this);
	G.sb.onCandyFallFinish.add(function(candy) {
		this.duringFall--
		if (this.fallCheckList.indexOf(candy) == -1) this.fallCheckList.push(candy);
		/*if (this.matcher.quickMatchCheck(candy)) {

			console.log(candy);
			this.checkMatchList.push(candy);
		}*/
	},this);
	G.sb.onCandyAnimationStart.add(function() {this.duringAnimation++},this);
	G.sb.onCandyAnimationFinish.add(function() {this.duringAnimation--},this);
	G.sb.onScreenResize.add(this.onResize,this);


	this.matcher = new G.BoardMatcher(this);

	this.boardBackground = new G.BoardBackground(this);

	this.background = game.make.image(0,0,this.boardBackground.renderTexture);
	/*this.background.width = this.levelData.width*tilesize;
	this.background.height = this.levelData.height*tilesize;
	*/
	this.background.x = -this.borderSize;
	this.background.y = -this.borderSize;
	//this.background.width += this.borderSize;
	//this.background.height += this.borderSize;
	this.add(this.background);


	this.tileShade = G.makeImage(0,0,'tile_shade',0.5,this);
	this.tileShade.visible = false;


	this.boardDirt = new G.BoardDirt(this);
	this.add(this.boardDirt);

	this.boardCandies = new G.BoardCandies(this,this.boardData);
	this.boardCage = this.boardCandies.boardCage;
	this.boardIce = this.boardCandies.boardIce;

	

	this.inputController = new G.InputController(this);
	this.actionManager = new G.BoardActionManager(this);

	this.refiller = new G.Refiller(lvl,this);

	this.goalCandies = G.json.specialCandies.goalCandies;

	this.import(this.levelData);

	this.lastRowInCollumn = this.getLastRowInCollumn();

	this.boardBackground.redraw();

	this.onResize();

	G.sb.onActionFinish.add(function() {

		if (this.actionManager.actionList.length > 1) return;

		var removed = false;

		for (var i = 0; i < this.boardData.width; i++) {


			var candy = this.getCandy(i,this.boardData.height-1);
			if (candy && this.goalCandies.indexOf(candy.candyType) !== -1) {
				this.boardCandies.removeCandy(i,this.boardData.height-1);
				G.sfx.xylophone_positive6.play();
				removed = true;
			}

		}


		if (removed) {
			this.actionManager.newAction('processFall');
		}


	},this);
 
};



G.Board.prototype = Object.create(Phaser.Group.prototype);


G.Board.prototype.getLastRowInCollumn = function() {

	var result = [];

	for (var i = 0; i < this.boardData.width; i++) {
		result.push(this.getLastCellInCollumn(i));
	}

	return result;

};


G.Board.prototype.pushToFallCheckList = function(candy) {

	if (candy === false) return;

	if (this.fallCheckList.indexOf(candy) == -1) this.fallCheckList.push(candy);
}

G.Board.prototype.onResize = function() {
	if (G.horizontal) {
		this.moveTo(175,(game.height-G.l(100)-(this.tilesize*this.boardData.height))*0.5);
	}else {
		this.center();
	}
};


G.Board.prototype.destroyBoard = function() {

	this.boardDirt.destroy();
	this.boardCandies.destroy();
	this.boardCage.destroy();
	this.boardIce.destroy();
	this.destroy();

};

G.Board.prototype.clearBoard = function() {

	this.boardData.loop(function(elem,x,y) {
			this.boardCandies.goalCandies = [];
			this.boardCandies.rabbitCandy = false;
			var candy = this.boardCandies.getCandy(x,y)
			if (candy) this.boardCandies.removeCandy(candy);
			this.boardIce.removeChocolate(x,y);
			if (this.boardDirt.isDirt(x,y)) this.boardDirt.destroyCell(x,y);
	},this);

};

G.Board.prototype.center = function() {

	this.x = G.l(320)-(this.tilesize*this.boardData.width*0.5);
	this.y = G.l(234) + (game.height-G.l(234)-G.l(150)-(this.tilesize*this.boardData.height))*0.5;
	this.boardCandies.moveTo(this.x,this.y);
	this.boardCage.x=this.boardIce.x=this.x;
	this.boardCage.y=this.boardIce.y=this.y;

};


G.Board.prototype.moveTo = function(x,y) {
	this.x = G.l(x);
	this.y = G.l(y);
	this.boardCandies.moveTo(this.x,this.y);
	this.boardCage.x=this.boardIce.x=this.x;
	this.boardCage.y=this.boardIce.y=this.y;
}

G.Board.prototype.changeScale = function(val) {
	this.scale.setTo(val);
	this.boardCandies.firstFloor.scale.setTo(val);
	this.boardCandies.boardIce.scale.setTo(val);
	this.boardCandies.boardCage.scale.setTo(val);
	this.boardCandies.secondFloor.scale.setTo(val);
	this.boardCandies.fxGroup.scale.setTo(val);
	this.boardCandies.boosterFxGroup.scale.setTo(val);
	this.boardCandies.thirdFloor.scale.setTo(val);
	this.boardCandies.fxTopGroup.scale.setTo(val);
}

G.Board.prototype.update = function() {
	
	this.actionManager.update();
	this.checkGoalCandy();

};


G.Board.prototype.checkGoalCandy = function() {

	if (this.actionManager.actionList.length > 0) return;

	var removed = false;

	for (var i = 0; i < this.boardData.width; i++) {


		var candy = this.getCandy(i,this.lastRowInCollumn[i]);
		if (candy && this.goalCandies.indexOf(candy.candyType) !== -1) {
			this.boardCandies.removeCandy(i,this.lastRowInCollumn[i]);
			G.sfx.xylophone_positive6.play();
			removed = true;
		}

	}


	if (removed) {
		this.actionManager.newAction('processFall');
	}

};

G.Board.prototype.makeMove = function(candy1,candy2,force) {

	this.actionManager.newAction('move',candy1,candy2,force);

};

G.Board.prototype.hitCell = function(cellX,cellY) {

	this.boardIce.hitCell(cellX,cellY);
	this.boardCandies.hitCell(cellX,cellY);

};

G.Board.prototype.isMoveable = function(x,y,noCandy) {

	if (typeof x != 'number') {
		y = x[1];
		x = x[0];
	}

	if (!this.isCellOnBoard(x,y)) return false;
	if (!this.boardIce.isCellFree(x,y)) return false;
	if (!this.boardCage.isCellFree(x,y)) return false;

	var candy = this.getCandy(x,y);
	if (!candy) return false;
	//if (candy.infected) return false;

	return true;
};


G.Board.prototype.matchCellExceptCandy = function(cellX,cellY) {

	if (this.boardCage.isCage(cellX,cellY)) {
		this.boardCage.onMatch(cellX,cellY);
	}

	if (!this.boardDirt.isCellFree(cellX,cellY)) {
		this.boardDirt.matchCell(cellX,cellY);
	}

};

G.Board.prototype.getLastCellInCollumn = function(cellX) {

	for (var i = this.boardData.height-1; i >= 0; i--) {

		if (this.isCellOnBoard(cellX,i)) return i;

	};

};

G.Board.prototype.matchCell = function(cellX,cellY,delay,moveCellX,moveCellY) {

	if (this.boardCage.isCage(cellX,cellY)) {
		return this.boardCage.onMatch(cellX,cellY);
	}

	if (!this.boardDirt.isCellFree(cellX,cellY)) {
		this.boardDirt.matchCell(cellX,cellY);
	}

	var candy = this.getCandy(cellX,cellY);

	if (candy) {candy.match(delay,moveCellX,moveCellY)};

	this.matchMade = true;

};

G.Board.prototype.isCellInBoardArea = function(cellX,cellY) {
	return cellX < this.boardData.width && cellX >= 0 && cellY >= 0 && cellY < this.boardData.height;

};

G.Board.prototype.isCellMatchable = function(x,y,type) {
	if (typeof x != 'number') {
		y = x[1];
		x = x[0];
	}

	if (!this.isCellOnBoard(x,y)) return false;
	if (this.boardIce.isChocolate(x,y)) return false;

	var candy = this.getCandy(x,y);
	if (!candy) return false;
	if (!candy.matchable) return false;
	if (candy.falling) return false;
	if (candy.goalCandy) return false;
	if (candy.chocolate) return false;

	if (type) {
		return this.getCandy(x,y).candyType == type;
	}else {
		return true;
	}

};

G.Board.prototype.isCellOnBoard = function(x,y) {

	if (typeof x == 'boolean') return false;

	if (typeof x != 'number') {
		y = x[1];
		x = x[0];
	}
	if (x < 0 || x >= this.boardData.width || y < 0 || y >= this.boardData.height) return false;
	return this.boardData.get(x,y) != 'X';
};

G.Board.prototype.getCandy = function(cellX,cellY) {

	if (typeof cellX != 'number') {
		return this.boardCandies.getCandy(cellX[0],cellX[1]);
	}

	return this.boardCandies.getCandy(cellX,cellY);
};

G.Board.prototype.cellToPxOut = function(cell) {

	return [
		this.x+this.offsetX+(this.tilesize*(cell[0]))+(this.tilesize*0.5),
		this.y+this.offsetY+(this.tilesize*(cell[1]))+(this.tilesize*0.5)
	]

};

G.Board.prototype.pxInToCellX = function(px) {
	return Math.floor(px/this.tilesize);
};

G.Board.prototype.pxInToCellY = function(px) {
	return Math.floor(px/this.tilesize);
};

G.Board.prototype.cellXToPxIn = function(cellX) {
	return cellX*this.tilesize+(this.tilesize*0.5)
};

G.Board.prototype.cellYToPxIn = function(cellY) {
	return cellY*this.tilesize+(this.tilesize*0.5)
};

G.Board.prototype.cellToPxIn = function(cell) {
	return [
		this.cellXToPxIn(cell[0]),
		this.cellYToPxIn(cell[1])
	]

};

G.Board.prototype.swapCandies = function(c1,c2) {
	this.boardCandies.swapCandies(c1,c2);
};

G.Board.prototype.removeCandy = function(x,y) {
	this.boardCandies.removeCandy(x,y);
};

G.Board.prototype.newFallingCandy = function(cellX,cellY,type,fromCellY) {

	var newCandy = this.boardCandies.newCandy(cellX,cellY,type);
	newCandy.y = this.cellYToPxIn(fromCellY);
	newCandy.fallTo(cellX,cellY);
	newCandy.alpha = 0;

};


G.Board.prototype.allCollumsFall = function() {

	this.refillData = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];

	for (var i = 0; i < this.boardData.width; i++) {
		this.collumnFall(i);
	}
	
	/*
	while(true) {
		if (!this.crossCollumnFall()) break;
	}*/


};



G.Board.prototype.collumnFall = function(coll) {

	

	//start from bottom
	for (var row = this.boardData.height-1; row >= 0; row--) {

		//check if this cell is in board
		if (this.boardData.get(coll,row) == 'X') continue;

		//if there is no candy on cell
		if (!this.getCandy(coll,row)) { 
			var candyToFall = false;
			//try to find candy above
			for (var rowCheck = row; rowCheck >= 0; rowCheck--) {
				var candyToFall = this.getCandy(coll,rowCheck);

				if (!this.boardCage.isCellFree(coll,rowCheck)) break;
				if (!this.boardIce.isCellFree(coll,rowCheck)) break;

				if (candyToFall && this.isMoveable(coll,rowCheck)) {
					candyToFall.fallTo(coll,row);
					break; 
				}
			}


			//if any candy above was not found make refill
			if (!candyToFall) {
				this.newFallingCandy(coll,row,this.refiller.getTypeToDrop(coll),this.refillData[coll]--);
			}
			
		
		}

	};

};


G.Board.prototype.isCellSolid = function(cellX,cellY) {

	if (cellY == this.boardData.height || this.boardData.get(cellX,cellY) == 'X') return true; 
	return this.getCandy(cellX,cellY);
};

G.Board.prototype.crossCollumnFall = function() {

	var wasMoved = false;
	var val = 1;
	var candy1 = false;
	var candy2 = false;

	for (var row = this.boardData.height-1; row >= 0; row--) {
		for (var coll = 0; coll < this.boardData.width; coll++) {

			//current cell is NOT solid but cell below is
			if (this.isCellOnBoard(coll,row) && !this.isCellSolid(coll,row) && this.isCellSolid(coll,row+1)) {

				if (this.isMoveable(coll+val,row-1)) {

					this.getCandy(coll+val,row-1).fallTo(coll,row);
					this.collumnFall(coll+val);
					wasMoved = true;
					continue;

				}else if (this.isMoveable(coll-val,row-1)) {

					this.getCandy(coll-val,row-1).fallTo(coll,row);
					this.collumnFall(coll-val);
					wasMoved = true;
					continue;

				}

				val *= -1;				

			}


		}
	}

	return wasMoved;

};

G.Board.prototype.export = function() {

    var result = new G.GridArray(this.boardData.width,this.boardData.height);

    result.loop(function(elem,x,y,data) {
        var cell = [];

        if (this.boardData.get(x,y) == 'X') {
            cell.push('X');
        }

        if (this.boardCandies.grid.get(x,y)) {
            var candy = this.boardCandies.grid.get(x,y);
            if (candy.wrapped) {
                cell.push('W'+candy.candyType);
            }else if (candy.chocolate) {
                cell.push('c'+candy.hp);
            }else {
                cell.push(candy.candyType);
            }
        }

        if (this.boardDirt.grid.get(x,y)) {
            cell.push('ice'+this.boardDirt.grid.get(x,y).hp);
        };

        if (this.boardCage.grid.get(x,y)) {
            cell.push('cg');
        };

        data[x][y] = cell;
        
    },this);

    return JSON.stringify(result.data);

};

G.Board.prototype.import = function(levelData) {


	levelData.loop(function(elem,x,y) {

		for (var i = 0, len = elem.length; i < len; i++) {

			elem[i] = elem[i].toString();

			//old version
			if (elem[i][0] == 'W') {
				elem[i] = elem[i][1] +':'+ elem[i][0];
			}




			if (elem[i][0] === 'r' && !this.editorMode) {
				elem[i] = this.getRandomThatDoesntMatch(x,y)+elem[i].substr(1);
			}

			if (elem[i] == 'X') {
				this.boardData.set(x,y,'X');
			} else if (elem[i].indexOf('cn') != -1) {
				this.boardCage.setCage(x,y,elem[i][2]);
			} else if (elem[i].indexOf('dirt') !== -1) {
				this.boardDirt.setDirt(x,y,elem[i][4]);
			}  else if (elem[i].indexOf('ice') !== -1) {
				this.boardIce.setIce(x,y,elem[i][3]);
			} else {

				var colonIndex = elem[i].indexOf(':');
				colonIndex = colonIndex == -1 ? elem[i].length : colonIndex;

				var candy = this.boardCandies.newCandy(x,y,elem[i].slice(0,colonIndex));

				elem[i] = elem[i].slice(colonIndex);

				if (elem[i].indexOf('W') !== -1) {
					candy.wrap();
				}

				if (elem[i].indexOf('I') !== -1) {
					candy.infect();
				}

			}

		};
	},this);

	//
	// check if there is a match (in case whole board was random generated or something like that
	//
	if (this.matcher.checkPossibleMoves().length == 0) {
		this.shuffleCandies(true);
	}

	this.possibleMoves = this.matcher.checkPossibleMoves();

};


G.Board.prototype.makePossibleMatch = function() {

	var x;
	var y;
	var w = this.boardData.width;
	var h = this.boardData.height;
	var off;
	//possible coords for making match
	//first two are coords that need to be move to make match
	var offsetsCoords = [
		//right middle move
		[1,0,1,-1,1,1],
		//left middle move
		[-1,0,-1,-1,-1,1],
		//up middle move
		[0,-1,-1,-1,1,-1],
		//down middle move
		[0,1,-1,1,1,1]

	];

	

	var i = 0;

	while(true) {

		

		x = Math.floor(Math.random()*w);
		y = Math.floor(Math.random()*h);

		off = offsetsCoords[Math.floor(Math.random()*offsetsCoords.length)];

		if (this.isMoveable(x,y) 
			&& this.isCellMatchable(x,y)
			&& this.isMoveable(x+off[0],y+off[1]) 
			&& this.isCellMatchable(x+off[2],y+off[3]) 
			&& this.isCellMatchable(x+off[4],y+off[5])) { 

			var candy1 = this.getCandy(x,y);
			var candy2 = this.getCandy(x+off[2],y+off[3]);
			var candy2OrgType = candy2.candyType;
			var candy3 = this.getCandy(x+off[4],y+off[5]);
			var candy3OrgType = candy3.candyType;

			if (!candy1.goalCandy 
				&& !candy2.goalCandy
				&& !candy3.goalCandy) {

				//change type of candies
				candy2.candyType = candy1.candyType;
				candy3.candyType = candy1.candyType;

				//check if c2 and c2 doesnt make a match now
				if (!this.matcher.quickMatchCheck(candy2) && !this.matcher.quickMatchCheck(candy3)) {
					//if dont, our job is done
					G.changeTexture(candy2,candy1.frameName);
					G.changeTexture(candy3,candy1.frameName);
					break;
				}else {
					//if do, we need to find something else, so change types to their originals
					candy2.candyType = candy2OrgType;
					candy3.candyType = candy3OrgType;
				}

				

			}

		}

	};


};



//
//we dont want to have matches on start of level
//they would be not process, so it would be a bit weird
//
G.Board.prototype.getRandomThatDoesntMatch = function(x,y) {

	var rnd = game.rnd.between(1,this.MAX_NUMBER_OF_REGULAR_CANDY);

	for (var i = 0; i < this.MAX_NUMBER_OF_REGULAR_CANDY; i++) {

		if ((this.isCellMatchable(x-2,y,rnd) && this.isCellMatchable(x-1,y,rnd)) 
		|| (this.isCellMatchable(x,y-2,rnd) && this.isCellMatchable(x,y-1,rnd))
		|| (this.isCellMatchable(x-1,y,rnd) && this.isCellMatchable(x-1,y-1,rnd) && this.isCellMatchable(x,y-1,rnd))) {
			
			rnd = (rnd+1)%this.MAX_NUMBER_OF_REGULAR_CANDY;
		}else {
			return rnd;
		}

	}

	return rnd;

};




G.Board.prototype.shuffleFailure = function() {

	for (var i = 0; i < 24; i++) {
		this.removeCandy(i%8,Math.floor(i/8));
	}

	for (i = 0; i < 24; i++) {
		this.boardCandies.newCandy(i%8,Math.floor(i/8),game.rnd.between(1,3).toString());
	}


};


G.Board.prototype.shuffleCandies = function(immediate) {

	var w = this.boardData.width;
	var h = this.boardData.height;

	var attempts = 0;

	do {	

		attempts++;

		if (attempts > 20) {
			this.shuffleFailure();
		}

		this.boardCandies.grid.loop(function(elem,x,y,data) {

			if (!elem || !this.isMoveable(x,y) || elem.goalCandy) return;

			var x2;
			var y2;
			var elem2;

			//get coorinates that can be swapped
			while (true) {
				x2 = game.rnd.between(0,w-1);
				y2 = game.rnd.between(0,h-1);
				if (x == x2 && y2 == y) continue;
				elem2 = data[x2][y2];
				if (this.isMoveable(x2,y2) && !elem2.goalCandy) break;
			}

			if (immediate) {
				this.swapCandiesWithPosition(elem,elem2);
			}else {
				this.swapCandies(elem,elem2);
			}
			
		},this);

	}while(this.matcher.checkPossibleMoves().length == 0);

	G.sfx.whoosh_short_1.play();

	this.boardCandies.grid.loop(function(elem,x,y) {

		if (!elem) return;

		if (!immediate && this.isMoveable(x,y)) {
			elem.shuffleMoveToOwnCell();
		}

		if (!this.isCellMatchable(x,y)) return;

		if (this.matcher.quickMatchCheck(elem)) {
			this.checkMatchList.push(elem);
		}
	},this);

	if (this.checkMatchList.length > 0) {
		this.actionManager.newAction('processMatch');
	}

};

G.Board.prototype.swapCandiesWithPosition = function(c1,c2) {

	this.boardCandies.grid.set(c1.cellX,c1.cellY,c2);
	this.boardCandies.grid.set(c2.cellX,c2.cellY,c1);

	var tmpCellX = c1.cellX;
	var tmpCellY = c1.cellY;
	var tmpX = c1.x;
	var tmpY = c1.y;

	c1.x = c2.x;
	c1.y = c2.y;
	c1.cellX = c2.cellX;
	c1.cellY = c2.cellY;

	c2.x = tmpX;
	c2.y = tmpY;
	c2.cellX = tmpCellX;
	c2.cellY = tmpCellY;

};

G.Board.prototype.deconstruct = function() {	

	this.deconstructing = true;


	this.background.x += this.background.width*0.5;
	this.background.y += this.background.height*0.5;
	this.background.anchor.setTo(0.5);


	this.glowImg = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glowImg.x = this.background.x;
	this.glowImg.y = this.background.y;
	this.glowImg.blendMode = 1;
	game.add.tween(this.glowImg).to({angle:360},6000,Phaser.Easing.Linear.None,true);
	this.glowImg.alpha = 0;
	this.wellDoneTxt = G.makeImage(0,0,'well_done',0.5,this);;
	this.wellDoneTxt.x = this.background.x;
	this.wellDoneTxt.y = this.background.y;
	this.wellDoneTxt.visible = false;


	game.add.tween(this.boardDirt).to({alpha:0},200,Phaser.Easing.Sinusoidal.In,true);
	game.add.tween(this.boardIce).to({alpha:0},200,Phaser.Easing.Sinusoidal.In,true);
	game.add.tween(this.boardCage).to({alpha:0},200,Phaser.Easing.Sinusoidal.In,true);

	game.time.events.add(200,this.boardCandies.deconstruct, this.boardCandies);

	game.time.events.add(900,function() {
		
		game.add.tween(this.background.scale).to({x:0,y:0},500,Phaser.Easing.Sinusoidal.InOut,true);
		game.add.tween(this.background).to({angle:70},500,Phaser.Easing.Sinusoidal.InOut,true);  
	},this) 

	game.time.events.add(900,function(){
		game.add.tween(this.glowImg).to({alpha:0.2},300,Phaser.Easing.Sinusoidal.Out,true);
		this.wellDoneTxt.visible = true;
		this.wellDoneTxt.scale.setTo(0);
		game.add.tween(this.wellDoneTxt.scale).to({x:1,y:1},500,Phaser.Easing.Elastic.Out,true);
	},this);

	game.time.events.add(2200,function() {
		game.add.tween(this.glowImg).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
		game.add.tween(this.wellDoneTxt).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
		G.lvl.state.windowLayer.pushWindow('win');
	},this);

}
G.BoardActionManager = function(board) {

	this.board = board;

	this.actionList = [];

	this.noAction = true;

	this.availableActions = {
		'move' : G.ActionMove,
		'processMatch' : G.ActionProcessMatch,
		'processFall' : G.ActionProcessFall,
		'boosterMatch' : G.ActionBoosterMatch,
		'boosterSwap' : G.ActionBoosterSwap,
		'shuffle' : G.ActionShuffle,
		'startBoosterInit' : G.ActionStartBoosters,
	};

	G.sb.onBoosterSelect.add(function(nr) {
		if (nr == 1) {
			this.newAction('boosterSwap');
		}	else {
			this.newAction('boosterMatch',nr);
		}
	},this);

	G.sb.onBoosterDeselect.add(function(){

		if (this.actionList.length == 1) {
			this.actionList[0].finish();
		}

	},this);

	this.noActionFrames = 0;

	this.shakingCandies = [];

};

G.BoardActionManager.prototype.update = function() {

	if (this.actionList.length == 0) {
		this.noAction = true;
		this.noActionFrames++;
		if (this.noActionFrames > 160) {
			this.noActionFrames = 0;
			this.glowPossibleMoves();
		}
		this.updateShakes();
	}else {
		this.noActionFrames = 0;
		this.noAction = false;
		this.actionList[0].update();
	}
};

G.BoardActionManager.prototype.normalCandies = ['0','1','2','3','4','5','6'];

G.BoardActionManager.prototype.updateShakes = function() {

	for (var i = this.shakingCandies.length; i--; ) {

		var shakeObj = this.shakingCandies[i];
		var candy = shakeObj.candy;

		shakeObj.dt += 0.04;

		candy.x = shakeObj.orgX + Math.sin(shakeObj.dt * (Math.PI*4))*shakeObj.wave;

		if (shakeObj.dt >= 1) {
			candy.x = shakeObj.orgX;
			candy.y = shakeObj.orgY;
			this.shakingCandies.pop();
		}

	}

};

G.BoardActionManager.prototype.breakShakes = function() {

	this.shakingCandies.forEach(function(shakeObj) {
		shakeObj.candy.x = shakeObj.orgX;
		shakeObj.candy.y = shakeObj.orgY;
	});

	this.shakingCandies = [];


};

G.BoardActionManager.prototype.glowPossibleMoves = function() {

	if (G.tutorialOpened) return;

	var possibleMoves = this.board.matcher.checkPossibleMoves();
	Phaser.ArrayUtils.shuffle(possibleMoves);

	if (possibleMoves.length == 0) return;

	var moveToShow = possibleMoves[0];

	this.shakeCandy(this.board.getCandy(moveToShow[0],moveToShow[1]));
	this.shakeCandy(this.board.getCandy(moveToShow[2],moveToShow[3]));

};

G.BoardActionManager.prototype.shakeCandy = function(candy) {

	this.shakingCandies.push({
		candy: candy,
		orgX: candy.x,
		orgY: candy.y,
		dt: 0,
		wave: G.l(5)
	});

};

G.BoardActionManager.prototype.newAction = function(type) {

	this.breakShakes();

	var args = [].slice.call(arguments,1);  

	this.actionList.push(new this.availableActions[type](this.board,this,args));

};

G.BoardActionManager.prototype.removeAction = function(action) {

	var index = this.actionList.indexOf(action);
	if (index != -1) {
		this.actionList.splice(index,1)
	}else {
		this.actionList.splice(0,1)
	}


	//no more
	if (this.actionList.length == 0)  {

		G.lvl.endCombo();

		
		if (G.lvl.goalAchieved) {

			if (G.lvl.moves > 0) {



				var normals = this.board.boardCandies.getNormalCandies();
				Phaser.ArrayUtils.shuffle(normals);


				var len = Math.min(G.lvl.moves,normals.length,15);

				for (var i = 0; i < len; i++) {

					var candy = normals[i];
					candy.changeInto(Math.random() < 0.5 ? 'horizontal' : 'vertical'); 
					candy.activatedByMove = true;
					G.lvl.changePointsNumber(G.json.settings.pointsForMoveLeft);
					var pxOut = G.lvl.state.board.cellToPxOut([candy.cellX,candy.cellY]);
					G.sb.displayPoints.dispatch(pxOut[0],pxOut[1],G.json.settings.pointsForMoveLeft);
					G.lvl.madeMove();
					this.board.checkSpecialMatchList.push(candy);

				}


				/*
				
				for (var i = 0; i < 5; i++) {

					if (G.lvl.moves == 0) break;

					var candy = this.board.boardCandies.getRandomNormal();
					if (candy) {
						candy.changeInto(Math.random() < 0.5 ? 'horizontal' : 'vertical'); 
						candy.activatedByMove = true;
						G.lvl.changePointsNumber(G.json.settings.pointsForMoveLeft);
						var pxOut = G.lvl.state.board.cellToPxOut([candy.cellX,candy.cellY]);
						G.sb.displayPoints.dispatch(pxOut[0],pxOut[1],G.json.settings.pointsForMoveLeft);
						
						G.lvl.madeMove();
						this.board.checkSpecialMatchList.push(candy);
					}
				}
				*/

				G.sfx.booster.play();
				game.time.events.add(800,function() {
					this.newAction('processMatch');
				},this);

				return;

			}else {

				var specialCandies = this.board.boardCandies.getAllSpecialCandies();
				if (specialCandies.length > 0) {
					specialCandies.forEach(function(candy) {
						candy.activatedByMove = true;
						this.board.checkSpecialMatchList.push(candy);
					},this);

					if (G.IMMEDIATE) {
						this.newAction('processMatch');
					}else {
						game.time.events.add(G.IMMEDIATE ? 1 : 300,function() {
							this.newAction('processMatch');
						},this);
					}
					
				}else {
						G.sb.onWinLevelPopUp.dispatch();
						if (!G.IMMEDIATE) {
							// SG_Hooks.levelFinished(G.lvl.lvlNr+1, G.lvl.points);
                            console.log("SG_Hooks.levelFinished(G.lvl.lvlNr+1, G.lvl.points)");
							return this.board.deconstruct();
						}
				}	
			
			}
		}


		this.board.possibleMoves = this.possibleMoves = this.board.matcher.checkPossibleMoves()
		if (this.possibleMoves.length == 0) {
			return this.newAction('shuffle');
		}



		if (G.lvl.moves == 0) {
			if (!G.lvl.isGoalAchieved()) {

				if (game.incentivised) {
            G.lvl.state.windowLayer.pushWindow('outOfMoves');
        }else {
            if (G.saveState.getCoins() >= G.lvl.getPriceOfExtraMoves()*2) {
                G.lvl.state.windowLayer.pushWindow('outOfMoves');
            }else {
                G.lvl.state.windowLayer.pushWindow('levelFailed');
            }
        }

       }
		
		}
		

		G.sb.actionQueueEmpty.dispatch();

	}

};
G.BoardBackground = function(boardObj) {
		
	Phaser.Group.call(this,game);

	this.board = boardObj;
	this.borderSize = G.l(8);

	this.renderTexture = game.add.renderTexture(
		(this.board.boardData.width)*this.board.tilesize+(this.borderSize*2),
		(this.board.boardData.height)*this.board.tilesize+(this.borderSize*2)
	);

	this.tile = game.make.image();

	//this.redraw();

};

G.BoardBackground.prototype = Object.create(Phaser.Group.prototype);

G.BoardBackground.prototype.redraw = function() {
	this.renderTexture.resize(
		(this.board.boardData.width)*this.board.tilesize+(this.borderSize*2),
		(this.board.boardData.height)*this.board.tilesize+(this.borderSize*2),
		true
	);
	this.renderTexture.clear();
	this.drawBg();
	this.drawBoarder();


};

G.BoardBackground.prototype.drawBg = function() {
	
	this.board.boardData.loop(function(val,x,y) {
		if (val != 'X') {

			if (y % 2 == 0) {
				G.changeTexture(this.tile,x%2==0? 'tile_1' : 'tile_2');
			}else {
				G.changeTexture(this.tile,x%2==0? 'tile_2' : 'tile_1'); 
			}

			this.tile.anchor.setTo(0,0);
      		this.renderTexture.renderRawXY(this.tile,x*this.board.tilesize+this.borderSize,y*this.board.tilesize+this.borderSize);
    	}
	},this);

	//this.drawBoarder();

};

G.BoardBackground.prototype.drawBoarder = function() {

	var boardData = this.board.boardData;
	var tilesize = this.board.tilesize

	this.board.boardData.loop(function(val,x,y,data) {
		
		//sides

		//null means tile
		//false out of bounds
		// 'X' hole

		if (val !== null) return;

		//left
		if (boardData.get(x-1,y) === false || boardData.get(x-1,y) === 'X') {
			G.changeTexture(this.tile,'tile_side');
			this.tile.anchor.setTo(0.5,1);
			this.tile.angle = -90;
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,x*tilesize+this.borderSize,y*tilesize+this.borderSize+(tilesize*0.5));
		}

		//right
		if (boardData.get(x+1,y) === false || boardData.get(x+1,y) === 'X') {
			G.changeTexture(this.tile,'tile_side');
			this.tile.anchor.setTo(0.5,1);
			this.tile.angle = 90;
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,x*tilesize+this.borderSize+tilesize,y*tilesize+this.borderSize+(tilesize*0.5));
		}


		//up
		if (boardData.get(x,y-1) === false || boardData.get(x,y-1) === 'X') {
			G.changeTexture(this.tile,'tile_side');
			this.tile.angle = 0;
			this.tile.anchor.setTo(0.5,1);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,x*tilesize+this.borderSize+(tilesize*0.5),y*tilesize+this.borderSize);
		}

		//down
		if (boardData.get(x,y+1) === false || boardData.get(x,y+1) === 'X') {
			G.changeTexture(this.tile,'tile_side');
			this.tile.angle = 180;
			this.tile.anchor.setTo(0.5,1);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,x*tilesize+this.borderSize+(tilesize*0.5),y*tilesize+this.borderSize+tilesize);
		}



		//outer corners
		
		if (this.checkIfHoles(x,y,[-1,0,-1,-1,0,-1])) {
			G.changeTexture(this.tile,'tile_corner_outer');
			this.tile.angle = 0;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize,
				y*tilesize
			);
		}


		if (this.checkIfHoles(x,y,[1,0,1,-1,0,-1])) {
			G.changeTexture(this.tile,'tile_corner_outer');
			this.tile.angle = 90;
			this.tile.anchor.setTo(0,0);

			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+tilesize+this.borderSize+this.borderSize,
				y*tilesize
			);
		}



		if (this.checkIfHoles(x,y,[-1,0,-1,1,0,1])) {
			G.changeTexture(this.tile,'tile_corner_outer');
			this.tile.angle = -90;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize,
				y*tilesize+tilesize+this.borderSize+this.borderSize
			);
		}


		if (this.checkIfHoles(x,y,[1,0,1,1,0,1])) {
			G.changeTexture(this.tile,'tile_corner_outer');
			this.tile.angle = 180;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+tilesize+this.borderSize+this.borderSize,
				y*tilesize+tilesize+this.borderSize+this.borderSize
			);
		}

	},this);


	//second pass for holes 

	this.board.boardData.loop(function(val,x,y,data) {

		if (val === null) return;


		if (this.checkIfTiles(x,y,[-1,0,-1,-1,0,-1])) {
			G.changeTexture(this.tile,'tile_corner_inner');
			this.tile.angle = 0;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+this.borderSize,
				y*tilesize+this.borderSize
			);
		}


		if (this.checkIfTiles(x,y,[1,0,1,-1,0,-1])) {
			G.changeTexture(this.tile,'tile_corner_inner');
			this.tile.angle = 90;
			this.tile.anchor.setTo(0,0);

			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+tilesize+this.borderSize,
				y*tilesize+this.borderSize
			);
		}



		if (this.checkIfTiles(x,y,[-1,0,-1,1,0,1])) {
			G.changeTexture(this.tile,'tile_corner_inner');
			this.tile.angle = -90;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+this.borderSize,
				y*tilesize+tilesize+this.borderSize
			);
		}


		if (this.checkIfTiles(x,y,[1,0,1,1,0,1])) {
			G.changeTexture(this.tile,'tile_corner_inner');
			this.tile.angle = 180;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+tilesize+this.borderSize,
				y*tilesize+tilesize+this.borderSize
			);
		}


		//
		// xg
		// gx
		//

		if (this.checkIfTiles(x,y,[1,0,0,1]) && this.checkIfHoles(x,y,[1,1])) {


			G.changeTexture(this.tile,'tile_corner_inner');
			this.tile.angle = 180;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+tilesize+this.borderSize,
				y*tilesize+tilesize+this.borderSize
			);

			this.tile.angle = 0;
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+tilesize+this.borderSize,
				y*tilesize+tilesize+this.borderSize
			);
		}

		//
		// gx
		// xg
		//

		if (this.checkIfTiles(x,y,[-1,0,0,1]) && this.checkIfHoles(x,y,[-1,1])) {


			G.changeTexture(this.tile,'tile_corner_inner');
			this.tile.angle = 90;
			this.tile.anchor.setTo(0,0);
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+this.borderSize,
				y*tilesize+tilesize+this.borderSize
			);

			this.tile.angle = -90;
			this.tile.updateTransform();
			this.renderTexture.renderXY(this.tile,
				x*tilesize+this.borderSize,
				y*tilesize+tilesize+this.borderSize
			);
		}


	},this);

};

G.BoardBackground.prototype.checkIfHoles = function(x,y,array) {

	for (var i = 0; i < array.length; i+=2) {

		if (this.board.boardData.get(x+array[i],y+array[i+1]) === null) {
			return false;
		}

	}

	return true;

};


G.BoardBackground.prototype.checkIfTiles = function(x,y,array) {

	for (var i = 0; i < array.length; i+=2) {

		if (this.board.boardData.get(x+array[i],y+array[i+1]) !== null) {
			return false;
		}

	}

	return true;

};
G.BoardCage = function(board) {
		
	Phaser.Group.call(this,game);

	this.board = board;
	this.boardData = this.board.boardData;

	this.grid = new G.GridArray(this.boardData.width,this.boardData.height,false);

	//G.sb.onCandyMatch.add(this.onMatch,this);
 

};

G.BoardCage.prototype = Object.create(Phaser.Group.prototype);

G.BoardCage.prototype.setCage = function(cellX,cellY,hp) {
	var cage = new G.Cage(cellX,cellY,this.board,hp);
	this.grid.set(cellX,cellY,this.add(cage));
	cage.grid = this.grid;
};

G.BoardCage.prototype.getRandom = function() {

	var len = this.children.length;
	var rnd = game.rnd.between(0,len);
	var piece;

	if (this.children.length == 0) return false;

	for (var i = 0; i < len; i++) {
		piece = this.children[(i+rnd)%len];
		if (piece && this.grid.get(piece.cellX,piece.cellY) == piece) {
			return piece;
		}
	}

	return false;

};

G.BoardCage.prototype.destroyCell = function(cellX,cellY) {
	this.grid.get(cellX,cellY).destroy();
	this.grid.set(cellX,cellY,false);
};

G.BoardCage.prototype.onMatch = function(cellX,cellY) {

	var cage = this.grid.get(cellX,cellY);

	if (!cage) return;

	cage.hit();

	if (cage.hp == 0) {
		this.board.pushToFallCheckList(this.board.getCandy(cellX,cellY));
	}

};

G.BoardCage.prototype.removeCage = function(cellX,cellY) {
	var cage = this.grid.get(cellX,cellY)

	if (cage) {
		cage.remove();
	}
	
};

G.BoardCage.prototype.isCellFree = function(cellX,cellY) {
	return !this.grid.get(cellX,cellY);
};

G.BoardCage.prototype.isCage = function(cellX,cellY) {
	return this.grid.get(cellX,cellY);
};
G.BoardCandies = function(boardObj,data) {
		
	Phaser.Group.call(this,game);

	this.board = boardObj;
	this.boardData = data;

	this.grid = new G.GridArray(this.boardData.width,this.boardData.height,false);

	this.rabbitTimer = G.json.settings.rabbitWaitSeconds;
	G.sb.madeMove.add(function(){this.rabbitTimer=G.json.settings.rabbitWaitSeconds},this);

	this.deadGroup = game.add.group();
	this.deadGroup.visible = false;

	//this.attachementsBelow = new G.AttachementsGroup();

	this.firstFloor = game.add.group();

	
	
	this.boardIce = new G.BoardIce(boardObj);
	this.boardCage = new G.BoardCage(boardObj);

	this.secondFloor = game.add.group();

	//this.attachementsAbove = new G.AttachementsGroup();

	this.fxGroup = new G.TopFxLayer(this.board);

	this.boosterFxGroup = game.add.group();

	this.thirdFloor = game.add.group();

	this.fxTopGroup = this.fxGroup.aboveThirdFloorLayer = game.add.group();

	if (G.IMMEDIATE) {
		this.deadGroup.visible = this.firstFloor.visible = this.secondFloor.visible = this.fxGroup.visible = this.thirdFloor.visible = this.fxTopGroup.visible = false;
	}

	this.firstFloor.position = this.secondFloor.position = this.fxGroup.position = this.fxTopGroup.position = this.boosterFxGroup.position = this.thirdFloor.position = this.position;


	//this.addMultiple([this.firstFloor,this.secondFloor,this.fxGroup,this.thirdFloor]);

	this.goalCandies = [];
	this.infectionSources = [];
	this.infectionSuperSources = [];
	this.infectionCoords = [
	[-1,0],
	[1,0],
	[0,-1],
	[0,-1],
	[-1,-1],
	[-1,-1],
	[1,-1],
	[1,1]
	];

	G.sb.onCandyInfect.add(function(candy) {
		this.addInfectionSource(candy,this.infectionSources);
	},this);
	G.sb.onCandyInfectionRemove.add(function(candy) {
		this.removeInfectionSource(candy,this.infectionSources);
	},this);


	G.sb.actionFallEnd.add(function() {
		
		this.goalCandies.forEach(function(child) {
			if (child.cellY == this.board.getLastCellInCollumn(child.cellX) && !child.fallData.active) {
				G.sfx.xylophone_positive6.play();
				child.remove();
				if (this.board.actionManager.actionList.length == 1) {
					this.board.actionManager.newAction('processFall');
				}
			}
		},this);
		
	},this);


	this.removedInfectionSource = false;
	this.infectionToMakeStep = 0;
	this.madeValidMove = false;
	//this.spreadStep = 0;
	G.sb.madeMove.add(function() {
		this.madeValidMove = true;
	},this)

	G.sb.actionQueueEmpty.add(function() {
		
		if (!this.madeValidMove) return;

		if (!this.removedInfectionSource) {

			if (this.infectionSuperSources.length > 0) {
				var spreaded = this.spreadInfection(this.infectionSuperSources);
				if (!spreaded) {
					this.spreadInfection(this.infectionSources);
				}
			}

		}
		
		this.removedInfectionSource = false;
		this.madeValidMove = false;

	},this);
	/*
	this.boardData.loop(function(val,x,y) {
		if (val != 'X') {
      this.newCandy(x,y,game.rnd.between(1,this.board.MAX_NUMBER_OF_REGULAR_CANDY));
    }
	},this);
	*/
};


G.BoardCandies.prototype = Object.create(Phaser.Group.prototype);



G.BoardCandies.prototype.spreadInfection = function(sourcesArray) {

	if (sourcesArray.length == 0) return; 

	Phaser.ArrayUtils.shuffle(sourcesArray);
	var source = game.rnd.pick(sourcesArray);
	for (var i = 0, len = this.infectionCoords.length; i < len; i++) {
		var coords = this.infectionCoords[i];
		var xx = source.cellX+coords[0];
		var yy = source.cellY+coords[1];
		var candyToInfect = this.getCandy(xx,yy);

		if (!candyToInfect) continue;
		if (!this.board.isMoveable(xx,yy)) continue;
		if (!this.board.isCellMatchable(xx,yy)) continue;
		if (candyToInfect.wrapped) continue;
		if (candyToInfect.infected) continue;
		if (candyToInfect.special) continue;

		candyToInfect.infect();
		return true;
	}

	return false;

}; 


G.BoardCandies.prototype.getRandom = function() {

	var children = this.firstFloor.children.concat(this.secondFloor.children);

	var len = children.length;
	var rnd = game.rnd.between(0,len);
	var piece;

	if (len == 0) return false;

	for (var i = 0; i < len; i++) {
		piece = children[(i+rnd)%len];
		if (this.grid.get(piece.cellX,piece.cellY) == piece) {

			if (piece && piece.alive && !piece.goalCandy && this.board.isCellMatchable(piece.cellX,piece.cellY)) {
				return piece;
			}

		}
	}

	return false;

};

/*
G.BoardCandies.prototype.update = function() {

	for (var i = 0, len = this.children.length; i < len; i++) {
		this.children[i].update();
	}

};*/


G.BoardCandies.prototype.getRandomNormal = function() {

	var children = this.firstFloor.children.concat(this.secondFloor.children);

	var len = children.length;
	var rnd = game.rnd.between(0,len);
	var piece;

	if (len == 0) return false;

	for (var i = 0; i < len; i++) {
		piece = children[(i+rnd)%len];
		if (this.grid.get(piece.cellX,piece.cellY) == piece) {

			if (piece && !piece.special && !piece.chocolate && !piece.wrapped && piece.alive && !piece.goalCandy && this.board.isCellMatchable(piece.cellX,piece.cellY) && this.board.isMoveable(piece.cellX,piece.cellY)) {
				return piece;
			}

		}
	}

	return false;

};


G.BoardCandies.prototype.getNormalCandies = function() {

	var children = this.firstFloor.children.concat(this.secondFloor.children);

	var len = children.length;
	var rnd = game.rnd.between(0,len);
	var piece;

	var result = [];

	if (len == 0) return false;

	for (var i = 0; i < len; i++) {

		piece = children[(i+rnd)%len];
		if (this.grid.get(piece.cellX,piece.cellY) == piece) {

			if (piece && !piece.special && !piece.chocolate && !piece.wrapped && piece.alive && !piece.goalCandy && this.board.isCellMatchable(piece.cellX,piece.cellY) && this.board.isMoveable(piece.cellX,piece.cellY)) {
				result.push(piece);
			}

		}
	}

	return result;



};



G.BoardCandies.prototype.moveTo = function(x,y) {

	this.x = x;
	this.y = y;

	//this.firstFloor.x = this.secondFloor.x = this.fxGroup.x = this.fxTopGroup.x = this.boosterFxGroup.x = this.thirdFloor.x = x;
	//this.firstFloor.y = this.secondFloor.y = this.fxGroup.y = this.fxTopGroup.y = this.boosterFxGroup.y = this.thirdFloor.y = y;
};

G.BoardCandies.prototype.isSpaceFree = function(cellX,cellY) {
	return !this.grid.get(cellX,cellY);
};

G.BoardCandies.prototype.gridMoveFromTo = function(cellX,cellY,newCellX,newCellY) {

	this.grid.set(newCellX,newCellY,this.grid.get(cellX,cellY));
	this.grid.set(cellX,cellY,null);

};


G.BoardCandies.prototype.newCandy = function(x,y,type) {

	var candy = (this.deadGroup.children[0] ? this.deadGroup.children[0] : new G.Candy(this.board,this.grid));
	this.firstFloor.add(candy);

	if (typeof type !== 'undefined' && type.indexOf && type.indexOf('CHAIN') !== -1) {
		candy.init(x,y,type.slice(-1));
		candy.wrap();
	}else {
		candy.init(x,y,type || game.rnd.between(1,this.board.MAX_NUMBER_OF_REGULAR_CANDY));
	}

	
	this.grid.set(x,y,candy);
	

	if (type == "infection") {
		candy.matchable = false;
		//this.infectionSources.push(candy);
		this.addInfectionSource(candy,this.infectionSuperSources);
	}

	if (type == "chest") {
		candy.matchable = false;
	}

	return candy;

};

G.BoardCandies.prototype.getCandy = function(cellX,cellY) {
	return this.grid.get(cellX,cellY);
};

G.BoardCandies.prototype.swapCandies = function(c1,c2) {

	this.grid.set(c1.cellX,c1.cellY,c2);
	this.grid.set(c2.cellX,c2.cellY,c1);

	var tmpX = c1.cellX;
	var tmpY = c1.cellY;
	c1.cellX = c2.cellX;
	c1.cellY = c2.cellY;
	c2.cellX = tmpX;
	c2.cellY = tmpY;

};

G.BoardCandies.prototype.removeCandy = function() {

	var candy;

	if (arguments.length == 1) {
		if (typeof arguments[0] == 'object') {
			candy = arguments[0];
			this.grid.set(arguments[0].cellX,arguments[0].cellY,null);
		}else {
			candy = this.getCandy(arguments[0][0],arguments[0][1]);
			this.grid.set(arguments[0][0],arguments[0][1],null);
		}
	}else {
		candy = this.getCandy(arguments[0],arguments[1]);
		this.grid.set(arguments[0],arguments[1],null);
	}

	if (candy) {
		if (this.goalCandies.indexOf(candy) != -1) {
			this.goalCandies.splice(this.goalCandies.indexOf(candy),1);
		}

		this.removeInfectionSource(candy,this.infectionSuperSources);

		G.sb.onCollectableRemove.dispatch(candy.candyType,candy.specialType ? false : candy);
		

		candy.kill();
		this.deadGroup.add(candy);
	}

};


G.BoardCandies.prototype.addInfectionSource = function(candy,sourcesArray) {

	if (sourcesArray.indexOf(candy) === -1) {
		sourcesArray.push(candy);
	}


};

G.BoardCandies.prototype.removeInfectionSource = function(candy,sourcesArray) {

	var index = sourcesArray.indexOf(candy);
	if (index !== -1) {
		sourcesArray.splice(index,1);
		this.removedInfectionSource = true;
	}

};

G.BoardCandies.prototype.consoleInfectionSources = function() {

	for (var i = 0; i < this.infectionSources.length; i++) {
		console.log("INFECTION SOURCE: "+this.infectionSources[i].cellX+'x'+this.infectionSources[i].cellY);
	}

};


G.BoardCandies.prototype.hitCell = function(cellX,cellY) {

	var candy = this.grid.get(cellX,cellY);
	if (candy) candy.hit();

};


G.BoardCandies.prototype.getAllSpecialCandies = function() {

	var result = [];

	this.grid.loop(function(elem,x,y) {
		if (elem && elem.special) result.push(elem);
	});

	return result;

};


G.BoardCandies.prototype.deconstruct = function() {

	var delay = 0;

	for (var i = 0; i <= 14; i++) {
		var xx = 0;
		for (var yy = i; yy >= 0; yy--) {
			if (this.grid.get(xx,yy)) {
				t1 = game.add.tween(this.grid.get(xx,yy).scale).to({x:0,y:0},300,Phaser.Easing.Sinusoidal.InOut,true,delay);
			}
			xx++;
			
		}
		delay += 40;
		//delay += 70;
	}

};

G.BoardDirt = function(board) {
		
	Phaser.Group.call(this,game);

	this.board = board;
	this.boardData = this.board.boardData;

	this.iceNumber = 0;

	this.grid = new G.GridArray(this.boardData.width,this.boardData.height,false);

	//G.sb.onCandyMatch.add(this.onMatch,this);
 

};

G.BoardDirt.prototype = Object.create(Phaser.Group.prototype);


G.BoardDirt.prototype.getRandom = function() {

	var len = this.children.length;
	var rnd = game.rnd.between(0,len);
	var piece;

	if (this.children.length == 0) return false;

	for (var i = 0; i < len; i++) {
		piece = this.children[(i+rnd)%len];
		if (piece && this.grid.get(piece.cellX,piece.cellY) == piece) {
			return piece;
		}
	}

	return false;

};


G.BoardDirt.prototype.setDirt = function(cellX,cellY,hp) {

	this.grid.set(cellX,cellY,this.add(new G.Dirt(cellX,cellY,hp,this.board)));
	this.iceNumber++;
 
};

G.BoardDirt.prototype.destroyCell = function(cellX,cellY) {
	this.grid.get(cellX,cellY).destroy();
	this.grid.set(cellX,cellY,false);
};

G.BoardDirt.prototype.matchCell = function(cellX,cellY) {

	var ice = this.grid.get(cellX,cellY)

	if (ice) {
		ice.onMatch();
		G.sfx.dirt_break.play();
		if (ice.hp == 0) {
			this.grid.set(cellX,cellY,false);
			this.iceNumber--;
		}
	}

};

G.BoardDirt.prototype.isCellFree = function(cellX,cellY) {
	return !this.grid.get(cellX,cellY);
};

G.BoardDirt.prototype.isDirt = function(cellX,cellY) {
	return this.grid.get(cellX,cellY);
};
G.BoardIce = function(board) {
		
	Phaser.Group.call(this,game);

	this.board = board;
	this.boardData = this.board.boardData;

	this.cellWidth = this.boardData.width;
	this.cellHeight = this.boardData.height;
	this.maxNumberOfChocolates = Math.floor(this.cellWidth*this.cellHeight*0.4)

	this.grid = new G.GridArray(this.boardData.width,this.boardData.height,false);

	this.wasHit = false;
	this.madeMove = false;

	

	//G.sb.madeMove.add(function(){this.madeMove = true; this.wasHit = false},this);

	/*G.sb.actionQueueEmpty.add(function() {
		//console.log('actionQueueEmpty '+this.wasHit);
		if (this.madeMove && !this.wasHit && this.children.length > 0 && this.children.length < this.maxNumberOfChocolates) this.grow();
		this.madeMove = false;
	},this);*/

	//G.sb.onCandyMatch.add(this.onMatch,this);
 

};


G.BoardIce.prototype = Object.create(Phaser.Group.prototype);

G.BoardIce.prototype.getRandom = function() {

	var len = this.children.length;
	var rnd = game.rnd.between(0,len);
	var piece;

	if (this.children.length == 0) return false;

	for (var i = 0; i < len; i++) {
		piece = this.children[(i+rnd)%len];
		if (piece && this.grid.get(piece.cellX,piece.cellY) == piece) {
			return piece;
		}
	}

	return false;

};


G.BoardIce.prototype.setIce = function(cellX,cellY,hp) {

	var ice = this.add(new G.Ice(cellX,cellY,this.board,hp));

	this.grid.set(cellX,cellY,ice);

};

G.BoardIce.prototype.destroyCell = function(cellX,cellY) {
	this.grid.get(cellX,cellY).destroy();
	this.grid.set(cellX,cellY,false);
};

G.BoardIce.prototype.hitCell = function(cellX,cellY) {

	var ice = this.grid.get(cellX,cellY)

	if (ice) {
		this.wasHit = true;
		ice.onHit();
		if (ice.hp == 0) {

			this.grid.set(cellX,cellY,false);

			this.board.pushToFallCheckList(this.board.getCandy(cellX,cellY));
			
			G.sfx.ice_break_0.play();

		}else {

			G.sfx.ice_break_1.play();

		}
	}

};

G.BoardIce.prototype.removeIce = function(cellX,cellY) {
	var chocolate = this.grid.get(cellX,cellY)

	if (chocolate) {
		chocolate.remove();
		this.grid.set(cellX,cellY,false);
	}
	
};

G.BoardIce.prototype.isCellFree = function(cellX,cellY) {
	return !this.grid.get(cellX,cellY);
};

G.BoardIce.prototype.isChocolate = function(cellX,cellY) {
	return this.grid.get(cellX,cellY);
};
G.BoardMatcher = function(board) {

	this.board = board;
	this.specialsCoordinates = G.specialCandies.patterns;

	this.grid = new G.GridArray(this.board.boardData.width,this.board.boardData.height,false);
	this.grid.set = function(x,y,val) {
		if (this.isInGrid(x,y)) {

			if (!this.data[x][y]) {
				return this.data[x][y] = val;
			}

			if (this.data[x][y] == 'm' && val != 'm') {
				return this.data[x][y] = val;
			}

		}else {
			return false;
		}
	};

	this.tempGrid = new G.GridArray(this.board.boardData.width,this.board.boardData.height,false);

	this.hitGrid = new G.GridArray(this.board.boardData.width,this.board.boardData.height,false);


	this.toCheck = [];

};



G.BoardMatcher.prototype.isMoveValid = function(candy) {

	var cellX = candy.cellX;
	var cellY = candy.cellY;

	if (!this.board.isCellMatchable(cellX,cellY)) return false;
	if (candy.special && candy.activatedByMove) return true;
	if (this.quickCheckCoords(candy,this.horCoords,false)) return true;
	if (this.quickCheckCoords(candy,this.verCoords,false)) return true;
	//if (this.quickCheckCoords(candy,this.birdCoords,false)) return true;

	return false;

};

G.BoardMatcher.prototype.quickMatchCheck = function(candy) {

	var cellX = candy.cellX;
	var cellY = candy.cellY;

	if (!this.board.isCellMatchable(cellX,cellY)) return false;
	if (this.quickCheckCoords(candy,this.horCoords,false)) return true;
	if (this.quickCheckCoords(candy,this.verCoords,false)) return true;
	//if (this.quickCheckCoords(candy,this.birdCoords,false)) return true;

	return false;

};


G.BoardMatcher.prototype.checkPossibleMoves = function() {

	var result = [];

	
	this.board.boardCandies.grid.loop(function(elem,x,y) {

		if (!elem) return;

		if (!this.board.isMoveable(elem.cellX,elem.cellY) || !this.board.isCellMatchable(elem.cellX,elem.cellY)) return;

		if (elem && this.board.isMoveable(x+1,y) && this.quickCheckCoords(elem,this.possibleRightMoves,false)) {
			result.push([x,y,x+1,y]);
		}

		if (elem && this.board.isMoveable(x-1,y) && this.quickCheckCoords(elem,this.possibleLeftMoves,false)) {
			result.push([x,y,x-1,y]);
		}

		if (elem && this.board.isMoveable(x,y-1) && this.quickCheckCoords(elem,this.possibleUpMoves,false)) {
			result.push([x,y,x,y-1]);
		}

		if (elem && this.board.isMoveable(x,y+1) && this.quickCheckCoords(elem,this.possibleDownMoves,false)) {
			result.push([x,y,x,y+1]);
		}

	},this); 
 
	return result;

};


//
// checks if candies in given coordinates are matchable with given candy
// IF THEY MAKE A MATCH
// 
// 3rd parameter - if all coordinates on list have to pass
//
// RETURN bool;
//
G.BoardMatcher.prototype.quickCheckCoords = function(candy,data,all) {


	var cellX = candy.cellX;
	var cellY = candy.cellY;
	var type = candy.candyType;
	var coords;
	var test;

	for (var i = 0, len = data.length; i < len; i++) {

		coords = data[i];
		test = true;

		for (var j = 0, len2 = coords.length; j < len2; j+=2) {
			if (!this.board.isCellMatchable(cellX+coords[j],cellY+coords[j+1],type)) {
				test = false;
				break;
			}
		}

		if (all && !test) {
			return false;
		}
		if (!all && test) {
			return true;
		}

	}

	return all ? true : false;

};


//main function - checks matches for candies list
//first fills matchGird with 'm'
//then fills and process hit grid
G.BoardMatcher.prototype.processMatchList = function() {

	if (this.board.checkMatchList.length == 0 && this.board.checkSpecialMatchList.length == 0) return;

	G.lvl.increaseCombo();

	G.sfx['match_'+game.math.clamp((G.lvl.combo || 1),1,5)].play();

	//clear change grid
	this.candiesToProcess = this.board.checkMatchList;
	this.specialCandiesToProcess = this.board.checkSpecialMatchList;


	for (var i = 0, len = this.candiesToProcess.length; i < len; i++) {

		if (this.grid.get(this.candiesToProcess[i].cellX,this.candiesToProcess[i].cellY)) continue;

		if (this.candiesToProcess[i].special && this.candiesToProcess[i].activatedByMove) {
			this.specialCandiesToProcess.push(this.candiesToProcess[i]);
		}else {
			this.processTemp(this.candiesToProcess[i]);
		}
	}

	//infate before specials process
	this.inflateHitGrid();


	for (var j = 0; j < this.specialCandiesToProcess.length; j++) {
		
		//this.processSpecial(this.specialCandiesToProcess[j]);
		this.processTempSpecial(this.specialCandiesToProcess[j]);

	};


	this.processGrid();
	this.processHitGrid();

	this.board.checkMatchList = [];
	this.board.checkSpecialMatchList = [];

	this.grid.clear();
	this.hitGrid.clear();

};

G.BoardMatcher.prototype.inflateHitGrid = function() {

	this.grid.loop(function(elem,x,y) {
		if (elem) {
			this.hitGrid.set(x-1,y,'h');
			this.hitGrid.set(x+1,y,'h');
			this.hitGrid.set(x,y-1,'h');
			this.hitGrid.set(x,y+1,'h');
		}
	},this);

};


G.BoardMatcher.prototype.processHitGrid = function() {

	this.hitGrid.loop(function(elem,x,y) {
		if (elem) {
			this.board.hitCell(x,y);
		}
	},this);

};


G.BoardMatcher.prototype.processGrid = function() {

	this.grid.loop(function(elem,x,y) {



		if (elem) {
			if (elem == 'm') {
				/*var candy = this.board.getCandy(x,y);
				if (candy) candy.match();*/
				this.board.matchCell(x,y);
			}else {
				if (elem[0] == 'change') {
					if (this.board.getCandy(x,y)) {this.board.getCandy(x,y).changeInto(elem[1])};
					//without that, if change is in cage, cage will be intact
					this.board.matchCellExceptCandy(x,y);
				}
				if (elem[0] == 'match-move') this.board.matchCell(x,y,elem[1],elem[2],elem[3]);
			}	
		}
	},this);

};


G.BoardMatcher.prototype.processTempSpecial = function(candy) {

	//if (!candy.special) return;

	var currentExe;

	G.sb.girlWideSmile.dispatch();

	for (var i = 0, len = candy.exe.length; i < len; i++) {

		currentExe = candy.exe[i];

		if (currentExe[0] == 'loop') {this.processSpecialExeLoop(candy,currentExe[1])};
		if (currentExe[0] == 'specific') {this.processSpecialExeSpecific(candy,currentExe[1])};
		if (currentExe[0] == 'matchType') {this.processSpecialExeMatchType(candy,currentExe[1])};
		if (currentExe[0] == 'changeTypeInto') {this.processSpecialExeChangeTypeInto(candy,currentExe[1],currentExe[2])};
		if (currentExe[0] == 'perform') {this.processSpecialExePerform(candy,currentExe[1])};
		if (currentExe[0] == 'superSpiral') {this.processSpecialExeSuperSpiral(candy,currentExe[1])};

	};

	this.copyTempGridToMatchGrid();

};

G.BoardMatcher.prototype.processSpecialExeLoop = function(candy,posObj) {

	G.sfx.line.play();

	var xx = candy.cellX;
	var yy = candy.cellY;
	var candy;

	while(true) {
		//if pos is out of board, break
		if (!this.board.isCellInBoardArea(xx,yy)) break;

		//check if cell is matchable and not marked for match on matchgrid
		this.tempCheckAndMark(xx,yy);		

		//change coords
		xx += posObj.x;
		yy += posObj.y;

	}

}; 

G.BoardMatcher.prototype.processSpecialExePerform = function(candy,name) {
	candy[name]();
};

G.BoardMatcher.prototype.processSpecialExeSpecific = function(candy,posArray) {

	G.sfx.boom.play();	
	var cellX = candy.cellX;
	var cellY = candy.cellY;
	G.sb.fx.dispatch('explosion',candy);
	var xx, yy;
	for (var i = 0, len = posArray.length; i < len; i+=2) {
		xx = cellX + posArray[i];
		yy = cellY + posArray[i+1];
		this.tempCheckAndMark(xx,yy);
	}
};

G.BoardMatcher.prototype.processSpecialExeMatchType = function(candy,exeType) {

	G.sfx.lightning.play();	 
	//if LASTMOVEDWITH get type of last candy that was moved with
	//if not pick random type
	if (exeType == 'LASTMOVEDWITH') {
		if (candy.lastMovedWith) {
			exeType = candy.lastMovedWith.candyType;
		}else {
			exeType = game.rnd.between(1,this.board.MAX_NUMBER_OF_REGULAR_CANDY);
		}
	};

	if (exeType == "CANDYTYPE") {
		exeType = candy.candyType;
	}

	//if candy is still on board, match it cell (it can be out if it is daleyed, that why there is if)
	if (this.board.getCandy(candy.cellX,candy.cellY) == candy) {
		this.tempGrid.set(candy.cellX,candy.cellY,'m');
	}

	this.board.boardCandies.grid.loop(function(elem,x,y) {
		if (elem && elem.candyType == exeType) {
			if (this.tempCheckAndMark(x,y,true)) {
				G.sb.fx.dispatch('lightning',candy,[x,y]);
			};
		}
	},this);

};

G.BoardMatcher.prototype.processSpecialExeChangeTypeInto = function(candy,changeTarget,changeInto) {


	//if LASTMOVEDWITH get type of last candy that was moved with
	//if not pick random type
	
	if (changeTarget == "CANDYTYPE") {
		changeTarget = candy.candyType;
	};

	if (changeInto == 'SPECIALLASTMOVED') {
		changeInto = candy.lastMovedWith.specialType;
	};

	//if candy is still on board, match it cell (it can be out if it is daleyed, that why there is if)
	if (this.board.getCandy(candy.cellX,candy.cellY) == candy) {
		this.tempGrid.set(candy.cellX,candy.cellY,'m');
	}

	this.board.boardCandies.grid.loop(function(elem,x,y) {
		if (elem && elem.candyType == changeTarget && !elem.special && elem !== candy) {
			if (this.board.isCellMatchable(x,y) && this.board.isMoveable(x,y)) {
				this.board.checkAfterFall.push(elem);
				elem.changeInto(changeInto);
				G.sb.fx.dispatch('lightning',candy,[x,y]);
			}
		}
	},this);

};

G.BoardMatcher.prototype.processSpecialExeSuperSpiral = function(candy) {

	//alert("processSuperSpiral");

	var toChange = [];

	if (this.board.getCandy(candy.cellX,candy.cellY) == candy) {
		this.tempGrid.set(candy.cellX,candy.cellY,'m');
	}

	for (var i = 0; i < G.lvl.data.nrOfTypes; i++) {
		toChange.push(i+1);
	}

	var i = 0;

	while (toChange.length > 0) {

		i++;
		if (i >= 70) return;

		var candy2 = this.board.boardCandies.getRandomNormal();
		if (!candy2) return;

		var index = toChange.indexOf(candy2.candyType);

		if (index != -1) {
			toChange.splice(index,1);
			this.board.checkAfterFall.push(candy2);
			candy2.changeInto('spiral');
			G.sb.fx.dispatch('lightning',candy,[candy2.cellX,candy2.cellY]);
		}

	};
	

};

G.BoardMatcher.prototype.tempCheckAndMark = function(xx,yy,hitOnlyIfMAtch) {

	if (!hitOnlyIfMAtch) this.hitGrid.set(xx,yy,true);

	if (this.board.isCellMatchable(xx,yy) && !this.grid.get(xx,yy)) {
		candy = this.board.getCandy(xx,yy);
		if (candy.special) {
			this.specialCandiesToProcess.push(candy);
			this.tempGrid.set(xx,yy,'mSpecial');
			this.hitGrid.set(xx,yy,true);
			return true;
		}else {
			this.tempGrid.set(xx,yy,'m');
			this.hitGrid.set(xx,yy,true);
			return true;
		}
	}

	return false;
};




G.BoardMatcher.prototype.processTemp = function(candy) {

	var candiesInMatch = [candy];

	var currentCandy;
	var currentMatchCandy;
	var horPos;
	var vertPos;
	var birdPos;
	var allPos;


	//check candies that makes matches, and push them to candies in match
	for (var i = 0; i < candiesInMatch.length; i++) {

		currentCandy = candiesInMatch[i];

		//get all matches position to one array
		allPos = [];

		horPos = this.getHorizontalMatchPos(currentCandy,this.quickCheckCoords(currentCandy,this.horCoords,false));
		vertPos = this.getVerticalMatchPos(currentCandy,this.quickCheckCoords(currentCandy,this.verCoords,false));
		//birdPos = this.getBirdMatchPos(currentCandy); 
		//birdPos = [];
		allPos = [].concat(horPos,vertPos);

		//check if candy form position is already in candiesInMatch. if not - push it.
		for (var j = 0, len = allPos.length; j < len; j += 2) {
			currentMatchCandy = this.board.getCandy(allPos[j],allPos[j+1]);
			if (candiesInMatch.indexOf(currentMatchCandy) == -1) {
				candiesInMatch.push(currentMatchCandy);
			}
		}

	};

	//use temp grid to mark all matches
	// in case of special use mSpecial, so specials are not part of new specials
	candiesInMatch.forEach(function(elem) {
		if (elem.special) {
			//appearance test
			// this.tempGrid.set(elem.cellX,elem.cellY,'mSpecial');
			this.tempGrid.set(elem.cellX,elem.cellY,'m');
			this.specialCandiesToProcess.push(elem);
		}else {
			this.tempGrid.set(elem.cellX,elem.cellY,'m');
		}
	},this);


	//check if marks on tempGrid creates any special candy. S
	//special candies have priorities, so we dont block more powerfull with less powerfull
	this.searchAndProcessSpecialsInTemp(candiesInMatch[0]);


	this.copyTempGridToMatchGrid();

};


G.BoardMatcher.prototype.copyTempGridToMatchGrid = function() {

	var nrOfElements = 0;

	var totalX = 0;
	var totalY = 0;

	var colors = [];
	var expColor = false;

	this.tempGrid.loop(function(elem,x,y) {
		if (elem) {
			nrOfElements++;
			totalX += x;
			totalY += y;

			var candy = this.board.getCandy(x,y);

			if (candy && colors.indexOf(candy.candyType.toString()) === -1) colors.push(candy.candyType.toString());

			if (elem == 'mSpecial') {
				this.grid.set(x,y,'m');
			}else {
				this.grid.set(x,y,elem);
			}
		}
	},this);

	if (colors.length == 1) {
		expColor = colors[0];
	}

	if (nrOfElements > 0) {
		G.lvl.processMatch(nrOfElements,totalX/nrOfElements,totalY/nrOfElements,expColor);
	}

	this.tempGrid.clear();


};

G.BoardMatcher.prototype.searchAndProcessSpecialsInTemp = function(priorityCandy) {
	mainLoop:
	while(true) {

		for (var specialIndex = 0, len = this.specialsCoordinates.length; specialIndex < len; specialIndex++) {
			for (var specialCoordIndex = 0, len2 = this.specialsCoordinates[specialIndex][1].length; specialCoordIndex < len2; specialCoordIndex++) {

				var pattern = this.tempGrid.findPattern(this.specialsCoordinates[specialIndex][1][specialCoordIndex],'m');
				if (pattern) {
					if (this.pushSpecialToTempGrid(pattern,this.specialsCoordinates[specialIndex][0],priorityCandy)) {
						G.sb.girlWideSmile.dispatch();
						specialCoordIndex--;
					}

					//continue mainLoop;
				}
			}
		}
		break;
	};

};

G.BoardMatcher.prototype.pushSpecialToTempGrid = function(coords,special,priorityCandy) {

	var markedChange = false;
	var i;
	var len = coords.length;

	//to make if later
	var changeArray = ['change',special];
	//args to match-move
	var moveToX = coords[0];
	var moveToY =	coords[1];

	var anyChanges = false;

	//to special appears at position of moved candy
	if (priorityCandy) {
		for (i = 0; i <len; i+=2) {

			var candyAtPosition = this.board.getCandy(coords[i],coords[i+1]);

			if (coords[i] == priorityCandy.cellX && coords[i+1] == priorityCandy.cellY 
				&& !candyAtPosition.special 
				&& !candyAtPosition.wrapped
				&& !candyAtPosition.infected
				&& !this.board.boardCage.isCage(coords[i],coords[i+1])
				) {
				markedChange = true;
				moveToX = coords[i];
				moveToY = coords[i+1];
				this.tempGrid.set(coords[i],coords[i+1],changeArray);
				anyChanges = true;
				break;
			}
		}
	}


	//
	for (i = 0; i < len; i+=2) {
		//change candy into special one
		if (i == 0 && !markedChange && !this.board.getCandy(coords[i],coords[i+1]).wrapped && !this.board.getCandy(coords[i],coords[i+1]).infected && !this.board.boardCage.isCage(coords[i],coords[i+1]) && !this.board.getCandy(coords[i],coords[i+1]).special) {
			this.tempGrid.set(coords[i],coords[i+1],changeArray);
			anyChanges = true;
		}else {
			//mark animation for merging candies
			if (this.tempGrid.get(coords[i],coords[i+1]) != changeArray && !this.board.getCandy(coords[i],coords[i+1]).wrapped && !this.board.boardCage.isCage(coords[i],coords[i+1])) {
				this.tempGrid.set(coords[i],coords[i+1],['match-move',0,moveToX,moveToY]);
				anyChanges = true;
			}
		}
	}

	return anyChanges;

};


//
// Simple loop that returns candies that are matching in horizontal
// (checkQuickCoords only checks candies that are required to make match,
//  but it doesnt check 4th, 5th candy etc)
//	
// RETURN candiesThatMakesMatch
//
G.BoardMatcher.prototype.getHorizontalMatchPos = function(candy,match) {
	var result = [];
	var cellX = candy.cellX;
	var cellY = candy.cellY;


	if (!match) return result;

	var left = candy.cellX;
	var right = candy.cellX;

	result.push(candy.cellX,candy.cellY);

	while (true) {
		if (this.board.isCellMatchable(--left,cellY,candy.candyType) && !this.grid.get(left,cellY)) {
			result.push(left,cellY);
		}else break;
	}

	while (true) {
		if (this.board.isCellMatchable(++right,cellY,candy.candyType) && !this.grid.get(right,cellY)) {
			result.push(right,cellY);
		}else break;
	}

	return result;

};

//
// same shit as above
//
G.BoardMatcher.prototype.getVerticalMatchPos = function(candy,match) {
	var result = [];
	var cellX = candy.cellX;
	var cellY = candy.cellY;

	if (!match) return result;

	var up = cellY;
	var down = cellY;

	result.push(candy.cellX,candy.cellY);

	while (true) {
		if (this.board.isCellMatchable(cellX,--up,candy.candyType) && !this.grid.get(cellX,up)) {
			result.push(cellX,up);
		}else break;
	}
	
	while (true) {
		if (this.board.isCellMatchable(cellX,++down,candy.candyType) && !this.grid.get(cellX,down)) {
			result.push(cellX,down);
		} else break;
	}

	return result;

};

G.BoardMatcher.prototype.getBirdMatchPos = function(candy) {

	var result = [];

	var cellX = candy.cellX;
	var cellY = candy.cellY;
	var len;

	for (var i = 0; i < 4; i++) {
			if (	this.board.isCellMatchable(cellX+this.birdCoords[i][0],cellY+this.birdCoords[i][1],candy.candyType)
				&& 	this.board.isCellMatchable(cellX+this.birdCoords[i][2],cellY+this.birdCoords[i][3],candy.candyType)
				&&  this.board.isCellMatchable(cellX+this.birdCoords[i][4],cellY+this.birdCoords[i][5],candy.candyType)
				) {
				result.push(cellX+this.birdCoords[i][0],cellY+this.birdCoords[i][1],
										cellX+this.birdCoords[i][2],cellY+this.birdCoords[i][3],
										cellX+this.birdCoords[i][4],cellY+this.birdCoords[i][5]);
			}
		}

	return result;

};


G.BoardMatcher.prototype.possibleDownMoves = [
	//hor
	[-1,1,1,1],
	[1,1,2,1],
	//vert
	[-2,1,-1,1],
	[0,2,0,3],
];

G.BoardMatcher.prototype.possibleRightMoves = [
	//hor
	[2,0,3,0],
	//vert
	[1,1,1,2],
	[1,-1,1,1],
	[1,-2,1,-1],

];

G.BoardMatcher.prototype.possibleLeftMoves = [
	//hor
	[-3,0,-2,0],
	//vert
	[-1,-2,-1,-1],
	[-1,-1,-1,1],
	[-1,1,-1,2],

];

G.BoardMatcher.prototype.possibleUpMoves = [
	//hor
	[-1,-1,1,-1],
	[1,-1,2,-1],
	[-2,-1,-1,-1],
	//vert
	[0,-3,0,-2],

]

G.BoardMatcher.prototype.horCoords = [
	//hor center
	[-1,0,1,0],
	//hor left
	[-2,0,-1,0],
	//hor right
	[1,0,2,0]
];

G.BoardMatcher.prototype.verCoords = [
	//ver center
	[0,-1,0,1],
	//ver top
	[0,-1,0,-2],
	//ver bottom
	[0,1,0,2] 
];

G.BoardMatcher.prototype.birdCoords = [
	[-1,-1,-1,0,0,-1],
	[1,0,0,-1,1,-1],
	[-1,0,-1,1,0,1],
	[1,0,0,1,1,1]
];

G.Cage = function(cellX,cellY,board,hp) {

	this.board = board;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(cellX),
		this.board.cellYToPxIn(cellY));

	this.hp = hp || 3;

	G.changeTexture(this,'concrete_'+this.hp);

	this.cellX = cellX;
	this.cellY = cellY;

	this.anchor.setTo(0.5,0.5);

	

};

G.Cage.prototype = Object.create(Phaser.Image.prototype);


G.Cage.prototype.hit = function() {

	G.sb.fx.dispatch('burstConcrete',this,this.hp);
	G.sfx.explosion_subtle.play();
	this.hp--;



	/*pg = game.add.group();
	pg.x = game.world.bounds.x + this.worldPosition.x;
	pg.y = this.worldPosition.y;

	var partNr = 40

	for (var i = 0; i < partNr; i++) {
		
		part = G.makeImage(game.rnd.between(-30,30),game.rnd.between(-30,30),'tile_concrete',0.5,pg);
		
		var angle = (i+(Math.random()-0.5))*(360/partNr)
		var spd = 8+Math.random()*5

		part.scale.setTo(1.2);
		part.timer = game.rnd.between(0,4);
		part.grav = 0.25;
		part.angle = Math.random()*180;
		part.velAlpha = 0.07+Math.random()*0.1;

		part.velX = G.lengthDirX(angle,spd);
		part.velY = G.lengthDirY(angle,spd);
		part.update = function() {

			this.x += this.velX;
			this.y += this.velY;
			this.velY += this.grav;
			this.velX *= 0.9;
			this.velY *= 0.9;
			this.y += this.grav;
			this.angle += this.velX*5;

			this.scale.setTo(this.scale.x-0.05)

			if (this.timer-- < 0) {
				this.alpha -= this.velAlpha;
				if (this.alpha <= 0) {
					this.destroy();
				}

			}

		};

	}*/


	G.sb.fxTop.dispatch('burstConcreteAnim',this,this);


	G.sfx.brick_break.play();

	if (this.hp == 0) {

		G.sb.onCollectableRemove.dispatch('concrete',this,'concrete_1');
		this.remove();
	}else {
		G.changeTexture(this,'concrete_'+this.hp);
	}
}

G.Cage.prototype.remove = function() {
	
	this.grid.set(this.cellX,this.cellY,false);
	this.destroy();

};


G.Cage.prototype.editor_changeHp = function(newHp) {

	this.hp = newHp;
	G.changeTexture(this,'concrete_'+this.hp)

};
G.Candy = function(board,grid) {

	this.grid = grid;
	this.board = board;
	this.boardCandies = board.boardCandies;


	Phaser.Image.call(this,game,0,0);
	this.anchor.setTo(0.5);

	this.wrapperImg = G.makeImage(0,0,'blocker_chain_wrapped',0.5,null);

	this.anchor.setTo(0.5,0.5);


	this.animationData = { 
		active: false
	};

	this.fallData = {
		alpha0: this.board.cellYToPxIn(-1),
		alpha1: this.board.cellYToPxIn(0),
		alphaDistance: Math.abs(this.board.cellYToPxIn(-1) - this.board.cellYToPxIn(0)),
		active: false,
		delay: 0,
		targetY: 0,
		targetX: 0,
		velY: 0,
		grav: G.lnf(2.5),
	};



	this.kill();

	//this.init(cellX,cellY,type);

};

G.Candy.prototype = Object.create(Phaser.Image.prototype);


G.Candy.prototype.init = function(cellX,cellY,type) {


	this.loadTexture(null);
	this.scale.setTo(1);

	this.candyType = false;
	this.special = false;
	this.specialType = false;
	this.animationData.active = false;
	this.fallData.active = false;
	this.alpha = 1;
	this.angle = 0;
	this.scale.setTo(1);
	this.revive();
	this.onMatchFx = false;
	this.activatedByMove = false;
	this.exe = [];
	this.matchable = true;
	this.goalCandy = false;

	//
  
	this.wrapped = false;
	this.infected = false;
	this.chocolate = false;
	this.cellX = cellX;
	this.cellY = cellY;
	this.x = this.board.cellXToPxIn(cellX);
	this.y = this.board.cellYToPxIn(cellY);
	this.changeInto(type,true);

};




G.Candy.prototype.fallTo = function(cellX,cellY,delay) {

	this.setCell(cellX,cellY);
 
	if (!this.fallData.active) G.sb.onCandyFallStart.dispatch(this);
		
	this.fallData.active = true;
	this.fallData.delay = delay || 0;
	this.fallData.velY = 0;
	this.fallData.targetY = this.board.cellYToPxIn(cellY);
	this.fallData.targetX = this.board.cellXToPxIn(cellX);


};

G.Candy.prototype.fallFrom = function(cellY,delay) {

		G.sb.onCandyFallStart.dispatch(this);
		this.y = this.board.cellYToPxIn(cellY);
		this.fallData.active = true;
		this.fallData.delay = delay || 0;
		this.fallData.velY = 0;
		this.fallData.targetX = this.board.cellXToPxIn(this.cellX);
		this.fallData.targetY = this.board.cellYToPxIn(this.cellY);
	
};

G.Candy.prototype.movedWith = function(candy) {
	this.lastMovedWith = candy;	
};

G.Candy.prototype.changeInto = function(type,skipAnim) {

	this.bringToTop();

	if (G.specialCandies.isTypeSpecial(type)) {



		if (!skipAnim) {
			G.sb.fx.dispatch('changeCircle',this);
		}

		var data = G.specialCandies.getSpecialData(type);
		this.special = true;
		//TEXTURE
		
		if (data.texture) {	
			//this.loadTexture(null);
			this.boardCandies.secondFloor.add(this);
			G.changeTexture(this,data.texture.replace('%CANDYTYPE%',this.candyType));
		}
		//CANDY TYPE
		
		if (data.candyType) {
			if (data.candyType == 'RANDOM') {
				this.candyType = Math.random();
			}else {
				this.candyType = data.candyType;
			}
		}

		
		if (data.onMatchFx) this.onMatchFx = data.onMatchFx.slice();

		//SPECIAL TYPE
		if (data.specialType) this.specialType = data.specialType;

		G.sb.onCandyChangedIntoSpecial.dispatch(this.specialType);

		//ACTIVATED BY MOVE
		if (data.activatedByMove) this.activatedByMove = true;
		

		//EXE
		if (data.exe) this.exe = data.exe.slice();

		
		if (data.specialInit) {
			this['changeInto'+G.capitalize(type)]();
		}
		

	}else {

		G.changeTexture(this,'candy_'+type);
		this.candyType = type;
		this.boardCandies.firstFloor.add(this);

	}

	if (G.json.specialCandies.goalCandies.indexOf(this.candyType) !== -1) {
		this.matchable = false;
		this.goalCandy = true;
	}

};

G.Candy.prototype.prepareToProcess = function() {
	this.startAnimation('biggerAndExplode');
};

G.Candy.prototype.wrap = function() {

	this.wrapped = true;
	this.wrapperImg.alpha = 1;
	this.wrapperImg.scale.setTo(1);
	G.changeTexture(this.wrapperImg,'blocker_chain_wrapped');
	this.addChild(this.wrapperImg);

};

G.Candy.prototype.unwrap = function() {


	/*pg = game.add.group();

	var partNr = 10;
	pg.y = 400;
	pg.x = 400;
	var partImg = ['rope_particle','rope_particle2','rope_particle3','rope_particle4'];

	for (var i = 0; i < partNr; i++) {

		
		part = G.makeImage(game.rnd.between(-20,20),game.rnd.between(-20,20),game.rnd.pick(partImg),0.5,pg);
		
		var angle = (i+(Math.random()-0.5))*(360/partNr)
		var spd = 8+Math.random()*5

		part.scale.setTo(1.5);
		part.timer = game.rnd.between(0,4);
		part.grav = 0.25;
		part.angle = Math.random()*180;
		part.velAlpha = 0.07+Math.random()*0.1;

		part.velX = G.lengthDirX(angle,spd);
		part.velY = G.lengthDirY(angle,spd);
		part.update = function() {

			this.x += this.velX;
			this.y += this.velY;
			this.velY += this.grav;
			this.velX *= 0.9;
			this.velY *= 0.9;
			this.y += this.grav;
			this.angle += this.velX*5;

			this.scale.setTo(this.scale.x-0.05)

			if (this.timer-- < 0) {
				this.alpha -= this.velAlpha;
				if (this.alpha <= 0) {
					this.destroy();
				}

			}

		};

	}*/ 

	


	G.sfx.brick_break.play();



	G.sb.onCollectableRemove.dispatch('chain',this);

	game.add.tween(this.wrapperImg).to({
		width: this.wrapperImg.width*1.5,
		height: this.wrapperImg.height*1.5,
		alpha: 0
	}, 1000, Phaser.Easing.Cubic.Out,true).onComplete.add(function() {
		this.removeChild(this.wrapperImg);
	},this)

	

	//G.sb.fx.dispatch('dummyFadeOut',this,this.candyImg.frameName);
	G.sb.fx.dispatch('changeCircle',this);
	G.sb.fxTop.dispatch('burstChainAnim',this,this);
	G.sfx.chain_rattle.play();
	this.wrapped = false; 

	this.board.pushToFallCheckList(this);

};

G.Candy.prototype.coverWithChocolate = function() {
	this.chocolateHp = 2;
	this.chocolate = true;
	
};

G.Candy.prototype.hitChocolate = function() {
	
	G.sb.fx.dispatch('changeCircle',this);
	G.sb.fx.dispatch('chocolatePart',this);
	G.sb.fx.dispatch('chocolatePart',this);
	G.sb.fx.dispatch('chocolatePart',this);
	G.sb.fx.dispatch('chocolatePart',this);

	G.sfx.explosion_subtle.play();
	
	if (--this.chocolateHp == 1) {
	}else {
		this.chocolate = false;
		this.board.fallCheckList.push(this);
	}

};


G.Candy.prototype.detachFromGrid = function() {
	this.boardCandies.grid.set(this.cellX,this.cellY,null);
};

G.Candy.prototype.hit = function() {

	if (this.candyType == 'infection') {

		/*pg = game.add.group();
		pg.x = game.world.bounds.x + this.worldPosition.x;
		pg.y = this.worldPosition.y;

		var partNr = 30


		for (var i = 0; i < partNr; i++) {
			
			part = G.makeImage(game.rnd.between(-30,30),game.rnd.between(-30,30),'tile_infection',0.5,pg);
			
			var angle = (i+(Math.random()-0.5))*(-180/partNr)
			var spd = 4+Math.random()*5

			part.scale.setTo(1.5+Math.random());
			part.timer = game.rnd.between(0,4);
			part.grav = 0.5;
			part.angle = Math.random()*180;
			part.velAlpha = 0.07+Math.random()*0.1;

			part.velX = G.lengthDirX(angle,spd);
			part.velY = G.lengthDirY(angle,spd);
			part.update = function() {

				this.x += this.velX;
				this.y += this.velY;
				this.velY += this.grav;
				this.velX *= 0.9;
				this.velY *= 0.9;
				this.y += this.grav;
				this.angle += this.velX;

				this.scale.setTo(this.scale.x-0.05)

				if (this.timer-- < 0) {
					this.alpha -= this.velAlpha;
					if (this.alpha <= 0) {
						this.destroy();
					}

				}

			};

		}*/

		G.sb.fxTop.dispatch('burstInfectionAnim',this,this);


		this.remove();
	}

	if (this.candyType == 'chest') {
		G.sb.onChestOpen.dispatch(this);
		this.remove();
	}

	if (this.chocolate) this.hitChocolate();

};

G.Candy.prototype.update = function() {

	this.updateFall();
	this.updateAnimation();

	if (this.chainAttachement) {
		this.chainAttachement.x = this.x;
		this.chainAttachement.y = this.y;
	}

};

G.Candy.prototype.updateFall = function() {

	if (this.fallData.active) { 
		if (this.fallData.delay > 0) return this.fallData.delay -= 1 * G.deltaTime;
		
		this.fallData.velY += this.fallData.grav*G.deltaTime;
		this.y += this.fallData.velY*G.deltaTime;


		//alpha during falling
		if (this.y < this.fallData.alpha1) {
			
			if (this.y < this.fallData.alpha0) {
				this.alpha = 0;
			}else { 
				this.alpha = Math.abs(this.fallData.alpha0-this.y)/this.fallData.alphaDistance;
			}

		}else {
			this.alpha = 1;
		}

		var xDif = this.fallData.targetX-this.x;
		var yDif = this.fallData.targetY-this.y;

		//changing collumn
		if (Math.abs(xDif) > yDif) {
			this.x = this.fallData.targetX - yDif*game.math.sign(xDif);
		}

		if (this.y > this.fallData.targetY) {
			this.y = this.fallData.targetY;
			this.x = this.fallData.targetX;
			this.fallData.active = false; 
			this.startAnimation('bounce');
			G.sfx['stone_impact_'+game.rnd.between(1,3)].play();
			G.sb.onCandyFallFinish.dispatch(this);
		}


	}

};

G.Candy.prototype.setCell = function(cellX,cellY) {

	if (this.grid.get(this.cellX,this.cellY) == this) {
		this.grid.set(this.cellX,this.cellY,null);
	}

	this.cellX = cellX;
	this.cellY = cellY;
	this.grid.set(cellX,cellY,this);

};

G.Candy.prototype.isGoalCandy = function() {
	return this.boardCandies.goalCandies.indexOf(this) != -1;
};

G.Candy.prototype.infect = function() {

	this.infected = true;
	G.stopTweens(this.wrapperImg);
	this.wrapperImg.alpha = 1;
	this.wrapperImg.scale.setTo(1);
	G.changeTexture(this.wrapperImg,'infection_front');
	game.add.tween(this.wrapperImg).from({alpha: 0, width: 0, height:0},250,Phaser.Easing.Sinusoidal.Out,true);
	this.addChild(this.wrapperImg);

	G.sb.onCandyInfect.dispatch(this);


};

G.Candy.prototype.removeInfection = function() {


	/*pg = game.add.group();
	pg.x = game.world.bounds.x + this.worldPosition.x;
	pg.y = this.worldPosition.y;

	var partNr = 15

	/*var part = G.makeImage(0,0,'circle',0.5,pg)
	part.alpha = 1;
	part.scale.setTo(0);
	part.update = function(){
		this.scale.setTo(this.scale.x+0.15);
		this.alpha -= 0.1;
		if (this.alpha <= 0) {
					this.destroy();
				}
	}*/
/*
	for (var i = 0; i < partNr; i++) {
		
		part = G.makeImage(game.rnd.between(-20,20),game.rnd.between(-20,20),'tile_infection',0.5,pg);
		
		var angle = (i+(Math.random()-0.5))*(-180/partNr)
		var spd = 4+Math.random()*5

		part.scale.setTo(1+Math.random());
		part.timer = game.rnd.between(0,4);
		part.grav = 0.5;
		part.angle = Math.random()*180;
		part.velAlpha = 0.07+Math.random()*0.1;

		part.velX = G.lengthDirX(angle,spd);
		part.velY = G.lengthDirY(angle,spd);
		part.update = function() {

			this.x += this.velX;
			this.y += this.velY;
			this.velY += this.grav;
			this.velX *= 0.9;
			this.velY *= 0.9;
			this.y += this.grav;
			this.angle += this.velX;

			this.scale.setTo(this.scale.x-0.05)

			if (this.timer-- < 0) {
				this.alpha -= this.velAlpha;
				if (this.alpha <= 0) {
					this.destroy();
				}

			}

		};

	}*/

	G.sb.fxTop.dispatch('burstInfectionAnim',this,this);



	this.infected = false;
	G.stopTweens(this.wrapperImg);
	this.board.pushToFallCheckList(this);
	game.add.tween(this.wrapperImg).to({alpha: 0},250,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		this.removeChild(this.wrapperImg);
	},this)
	
	G.sb.onCandyInfectionRemove.dispatch(this);

};


G.Candy.prototype.match = function(delay,cellX,cellY) {

	if (!this.matchable) return;
	if (this.wrapped) return this.unwrap();
	if (this.infected) return this.removeInfection();
	if (this.animationData.active) return;

	this.detachFromGrid();

	G.sb.onCandyMatch.dispatch(this); 

	if (this.special) {
		if (this.onMatchFx) {
			this.onMatchFx.forEach(function(child) {
				G.sb.fx.dispatch(child[0],this,child[1],this);
			},this);
		}
		game.camera.shake(0.0075,250);
		this.boardCandies.thirdFloor.add(this);
		return this.startAnimation('growAndFade',delay);
	};


	if (G.lvl.isGoal(this.candyType)) {
		return this.remove();
	};


	if (typeof cellX == 'undefined') {
		this.startAnimation('vanishAlphaBurst',delay);
	}else {
		this.startAnimation('moveTo',[delay,cellX,cellY]);
	}

};

G.Candy.prototype.remove = function() {

	this.boardCandies.removeCandy(this);

};


G.Candy.prototype.updateAnimation = function() {

	if (this.animationData.active) {
		if (this.animationData.func) {
			this.animationData.func.call(this);
		}
		if (!this.animationData.active) G.sb.onCandyAnimationFinish();
	}

};

G.Candy.prototype.startAnimation = function(type,args) {

	if (this.animationData.active) return alert("during another animation");

	if (this['animation-init-'+type]) {

		G.sb.onCandyAnimationStart.dispatch();
		this.animationData.active = true;

		this['animation-init-'+type](args);
		
	}

};

G.Candy.prototype['animation-init-bounce'] = function() {
	
	/*
	this.animationData.orgY = this.y;
	this.candyImg.y += (this.candyImg.height*0.5)
	this.candyImg.anchor.setTo(0.5,1);

	game.add.tween(this.candyImg).to({width: this.candyImg.width*1.05,height: this.candyImg.height*0.95,y: this.candyImg.y+G.l(5)},150,Phaser.Easing.Cubic.Out,true,0,0,true).onComplete.add(function() {
		this.candyImg.anchor.setTo(0.5);
		this.candyImg.y = 0;
		this.candyImg.scale.setTo(1);
		this.animationData.active = false;
		G.sb.onCandyAnimationFinish.dispatch(this);
	},this);
	*/
	if (G.IMMEDIATE) {
		this.animationData.active = false;
		G.sb.onCandyAnimationFinish.dispatch(this);
		return;
	}

	game.add.tween(this).to({y : this.y-G.l(5)},100,Phaser.Easing.Sinusoidal.Out,true,0,0,true).onComplete.add(function() {
	//game.add.tween(this).to({y: this.y-G.l(5)},100,Phaser.Easing.Sinusoidal.InOut,true,0,0,true).onComplete.add(function() {
		this.animationData.active = false;
		G.sb.onCandyAnimationFinish.dispatch(this);
	//},this);
	},this);
	
	
	
};

G.Candy.prototype['animation-init-vanishAlphaBurst'] = function(delay) {

	G.sb.fx.dispatch('burstCandy',this,this);
	G.sb.onCandyAnimationFinish.dispatch(this);
	this.remove();

};




G.Candy.prototype['animation-init-vanish'] = function(delay) {

	if (G.IMMEDIATE) {

		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
		this.scale.setTo(1);
		return

	}

	game.add.tween(this.scale).to({x:0,y:0},200,Phaser.Easing.Sinusoidal.In,true,delay || 0).onComplete.add(function() {
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
		this.scale.setTo(1);
	},this);

};

G.Candy.prototype['animation-init-scaleEndlessly'] = function() {
	if (G.IMMEDIATE) {
		return;
	}
	game.add.tween(this.scale).to({x:0.5,y:0.5},300,Phaser.Easing.Sinusoidal.In,true,0,-1,true);

};


G.Candy.prototype['animation-init-shrink'] = function() {

	this.boardCandies.thirdFloor.add(this);
	this.bringToTop();
	var scaleTween = game.add.tween(this.scale).to({x:0,y:0},200,Phaser.Easing.Sinusoidal.In,true).onComplete.add(function() {
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
	},this);

};




G.Candy.prototype['animation-init-growAndFade'] = function() {

	if (G.IMMEDIATE) {
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
		return;
	}


	this.boardCandies.thirdFloor.add(this);
	this.bringToTop();
	var scaleTween = game.add.tween(this.scale).to({x:2.5,y:2.5},200,Phaser.Easing.Sinusoidal.In,true);
	game.add.tween(this).to({alpha:0},100,Phaser.Easing.Sinusoidal.In,true,100).onComplete.add(function() {
		scaleTween.stop();
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
	},this);

};


G.Candy.prototype['animation-init-biggerAndExplode'] = function(delay) {

	if (G.IMMEDIATE) {
		this.board.checkSpecialMatchList.push(this);
		this.burst = true;
		this.readyToProcess = true;
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
		return;
	}


	if (delay) {
		game.time.events.add(delay,function() {

			this.bringToTop();

			game.add.tween(this.scale).to({x:1.5,y:1.5},300,Phaser.Easing.Sinusoidal.In,true).onComplete.add(function() {
				this.board.checkSpecialMatchList.push(this);
				this.burst = true;
				this.readyToProcess = true;
				G.sb.onCandyAnimationFinish.dispatch(this);
				this.remove();
				this.scale.setTo(1);
			},this);



		},this);

	}else {

		this.bringToTop();

		game.add.tween(this.scale).to({x:1.5,y:1.5},300,Phaser.Easing.Sinusoidal.In,true).onComplete.add(function() {
			this.board.checkSpecialMatchList.push(this);
			this.burst = true;
			this.readyToProcess = true;
			G.sb.onCandyAnimationFinish.dispatch(this);
			this.remove();
			this.scale.setTo(1);
		},this);

	}

};


G.Candy.prototype['animation-init-moveTo'] = function(args) {

	if (G.IMMEDIATE) {
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.remove();
		return;
	}


	if (args[0]) {

		game.time.events.add(args[0],function() {
			var moveTween = game.add.tween(this).to({x:this.board.cellXToPxIn(args[1]),y:this.board.cellYToPxIn(args[2])},300,Phaser.Easing.Sinusoidal.In,true);
			game.add.tween(this).to({alpha: 0},200,Phaser.Easing.Sinusoidal.In,true,100).onComplete.add(function() {
				moveTween.stop();
				G.sb.onCandyAnimationFinish.dispatch(this);
				this.remove();
			},this);
			

		},this);

	}else {

		var moveTween = game.add.tween(this).to({x:this.board.cellXToPxIn(args[1]),y:this.board.cellYToPxIn(args[2])},300,Phaser.Easing.Sinusoidal.In,true);
			game.add.tween(this).to({alpha: 0},200,Phaser.Easing.Sinusoidal.In,true,100).onComplete.add(function() {
				moveTween.stop();
				G.sb.onCandyAnimationFinish.dispatch(this);
				this.remove();
			},this);

	}
	
};


G.Candy.prototype['animation-init-moveToCombo'] = function(args) {

		if (G.IMMEDIATE) {
			G.sb.onCandyAnimationFinish.dispatch(this);
			//game.time.events.add(1,this.remove,this);
			this.remove();
			return;
		}



		if (args[3] !== 0) {
			var rotateTween = game.add.tween(this).to({angle: args[3]},300,Phaser.Easing.Sinusoidal.InOut,true);

		}

		var moveTween = game.add.tween(this).to({x:this.board.cellXToPxIn(args[1]),y:this.board.cellYToPxIn(args[2])},300,Phaser.Easing.Sinusoidal.InOut,true);
			game.add.tween(this).to({alpha: 0.8},200,Phaser.Easing.Sinusoidal.In,true,200).onComplete.add(function() {
				moveTween.stop();
				if (rotateTween) rotateTween.stop();

				G.sb.onCandyAnimationFinish.dispatch(this);
				game.time.events.add(1,this.remove,this);

			},this);
};


G.Candy.prototype.moveTo = function(cellX,cellY,scale) {

	if (G.IMMEDIATE) {
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.cellX = newCell[0];
		this.cellY = newCell[1];
		this.animationData.active = false;
		this.boardCandies.grid.set(this.cellX,this.cellY,this);
		return;
	}


	var candy = this.board.getCandy(cellX,cellY);
	var newCell = [cellX,cellY];

	this.bringToTop();

	G.sb.onCandyAnimationStart.dispatch();
	this.animationData.active = true;

	if (scale) {
		game.add.tween(this.scale).to({x:this.scale.x*2,y:this.scale.y*2},250,Phaser.Easing.Sinusoidal.InOut,true,0,0,true);
	}

	game.add.tween(this).to({x:this.board.cellXToPxIn(cellX),y:this.board.cellYToPxIn(cellY)},500,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.cellX = newCell[0];
		this.cellY = newCell[1];
		this.animationData.active = false;
		this.boardCandies.grid.set(this.cellX,this.cellY,this);
	},this);

};

G.Candy.prototype.shuffleMoveToOwnCell = function() { 

	var orgParent = this.parent;

	if (this.special) {
		this.boardCandies.thirdFloor.add(this);
	}else {
		this.boardCandies.secondFloor.add(this);
	}

	G.sb.onCandyAnimationStart.dispatch();
	this.animationData.active = true;

	game.add.tween(this).to({x:this.board.cellXToPxIn(this.cellX),y:this.board.cellYToPxIn(this.cellY)},500,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
		orgParent.add(this);
		G.sb.onCandyAnimationFinish.dispatch(this);
		this.animationData.active = false;
	},this);

};





G.Dirt = function(cellX,cellY,hp,board) {

	this.board = board;
	this.hp = hp;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(cellX),
		this.board.cellYToPxIn(cellY)
		);

	this.cellX = cellX;
	this.cellY = cellY;

	G.changeTexture(this,'dirt_'+hp)

	this.anchor.setTo(0.5,0.5);

};

G.Dirt.prototype = Object.create(Phaser.Image.prototype);

G.Dirt.prototype.onMatch = function() {
	

	/*pg = game.add.group();
	pg.x = game.world.bounds.x + this.worldPosition.x;
	pg.y = this.worldPosition.y;

	var partNr = 20

	for (var i = 0; i < partNr; i++) {
		
		part = G.makeImage(game.rnd.between(-30,30),game.rnd.between(-30,30),'tile_dirt',0.5,pg);
		
		var angle = (i+(Math.random()-0.5))*(360/partNr)
		var spd = 8+Math.random()*5

		part.scale.setTo(2);
		part.timer = game.rnd.between(0,4);
		part.grav = 0.25;
		part.angle = Math.random()*180;
		part.velAlpha = 0.07+Math.random()*0.1;

		part.velX = G.lengthDirX(angle,spd);
		part.velY = G.lengthDirY(angle,spd);
		part.update = function() {

			this.x += this.velX;
			this.y += this.velY;
			this.velY += this.grav;
			this.velX *= 0.9;
			this.velY *= 0.9;
			this.y += this.grav;
			this.angle += this.velX*5;

			this.scale.setTo(this.scale.x-0.05)

			if (this.timer-- < 0) {
				this.alpha -= this.velAlpha;
				if (this.alpha <= 0) {
					this.destroy();
				}

			}

		};

	}*/

	G.sb.fxTop.dispatch('burstDirtAnim',this,this);




	this.hp--;

	if (this.hp > 0) {

		G.changeTexture(this,'dirt_'+this.hp);

	}else {


		//G.sb.onCandyToUIAnim.dispatch('dirt',this); 

		G.sb.onCollectableRemove.dispatch('dirt',this);

		game.add.tween(this).to({alpha:0},200,Phaser.Easing.Cubic.In,true).onComplete.add(function(){
			this.destroy();
		},this);
	}

};
G.AttachementsGroup = function() {
	
	Phaser.Group.call(this,game);

	this.deadArray = [];

};

G.AttachementsGroup.prototype = Object.create(Phaser.Group.prototype);

G.AttachementsGroup.prototype.attach = function(type,obj) {

	var part;

	if (this.deadArray.length > 0) {
		part = this.deadArray.pop();
	}else {
		part = new G.AttachementPart();
	}

	part.init(type,obj);
	this.add(part);

	return part;
};





G.AttachementPart = function() {
	
	Phaser.Image.call(this,game,0,0,null);
	this.anchor.setTo(0.5);
	this.kill();

};

G.AttachementPart.prototype = Object.create(Phaser.Image.prototype);

G.AttachementPart.prototype.init = function(type,obj) {

	this.attachement = obj;
	this.position = obj.position;
	this.scale = obj.scale;
	this.position
	
	this['init'+G.capitalize(type)](obj);

	this.revive();
};

G.AttachementPart.prototype.postUpdate = function() {
	if (!this.alive) return;
	this.rotation = this.attachement.rotation;
}

G.AttachementPart.prototype.remove = function() {
	this.kill();
	this.parent.deadArray.push(this);
	this.parent.removeChild(this);
};

G.AttachementPart.prototype.detach = function() {
	this.position = new Phaser.Point(this.x,this.y);
};

G.AttachementPart.prototype.initChain = function(obj) {
	G.changeTexture(this,'blocker_chain_wrapped');
};



G.Ice = function(cellX,cellY,board,hp) {

	this.board = board;
	this.hp = hp || 4;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(cellX),
		this.board.cellYToPxIn(cellY)
		);

	
	this.breakImg = G.makeImage(0,0,null,0.5,this);

	this.cellX = cellX;
	this.cellY = cellY;


	if (this.hp < 4) {
		G.changeTexture(this.breakImg,'ice_crack_'+this.hp);
	}

	G.changeTexture(this,'ice_front');

	this.anchor.setTo(0.5,0.5);

};

G.Ice.prototype = Object.create(Phaser.Image.prototype);

G.Ice.prototype.onHit = function() {
	
	G.sfx.explosion_subtle.play();

/*
	pg = game.add.group();
	pg.x = game.world.bounds.x + this.worldPosition.x;
	pg.y = this.worldPosition.y;

	var partNr = 30


	for (var i = 0; i < partNr; i++) {
		
		part = G.makeImage(game.rnd.between(-30,30),game.rnd.between(-30,30),'tile_ice',0.5,pg);
		
		var angle = (i+(Math.random()-0.5))*(360/partNr)
		var spd = 8+Math.random()*5

		part.scale.setTo(1.2);
		part.timer = game.rnd.between(0,4);
		part.grav = 0.25;
		part.angle = Math.random()*180;
		part.velAlpha = 0.07+Math.random()*0.1;

		part.velX = G.lengthDirX(angle,spd);
		part.velY = G.lengthDirY(angle,spd);
		part.update = function() {

			this.x += this.velX;
			this.y += this.velY;
			this.velY += this.grav;
			this.velX *= 0.9;
			this.velY *= 0.9;
			this.y += this.grav;
			this.angle += this.velX*5;

			this.scale.setTo(this.scale.x-0.05)

			if (this.timer-- < 0) {
				this.alpha -= this.velAlpha;
				if (this.alpha <= 0) {
					this.destroy();
				}

			}

		};

	}*/

	

	G.sb.fxTop.dispatch('burstIce',this,this);

	
	this.hp--;

	//G.sb.fx.dispatch('burstIce',this,this);

	if (this.hp > 0) {
		G.changeTexture(this.breakImg,'ice_crack_'+this.hp);
	}else {
		G.sb.onCollectableRemove.dispatch('ice',this);
		G.sb.fx.dispatch('smallCircle',this);
		game.add.tween(this).to({alpha:0},200,Phaser.Easing.Sinusoidal.In,true).onComplete.add(function() {
			this.destroy();
		},this);
		
	}

};
G.InputController = function(boardObj) {
	
	Phaser.Group.call(this,game);

	this.board = boardObj;

	this.booster = null;

	this.clicked = false;
	this.clickedCell = false;

	this.anyWindowOpen = false;

	this.possibleCandies = [];


	G.sb.onWindowOpened.add(function() {
		this.anyWindowOpen = true;
	},this);

	G.sb.onAllWindowsClosed.add(function() {
		this.anyWindowOpen = false;
	},this);

	game.input.onDown.add(this.onClick,this);



	game.input.onUp.add(function() {
		this.clicked = false;
	},this);

	this.locked = false;

	
};

G.InputController.prototype = Object.create(Phaser.Group.prototype);

G.InputController.prototype.update = function() {

	this.board.tileShade.visible = false;

	var over = this.pointerToCell2(game.input.activePointer);

	if (game.device.desktop && !G.lvl.goalAchieved && this.board.isCellOnBoard(over[0],over[1])) {
		this.board.tileShade.visible = true;
		this.board.tileShade.x = this.board.cellXToPxIn(over[0]);	
		this.board.tileShade.y = this.board.cellYToPxIn(over[1]);
	}


	if (!this.canMakeMove()) return;

	if (this.clicked) {

		//for tutorial purposes
		if (this.possibleCandies.length > 0) {
			if (this.possibleCandies.indexOf(this.board.getCandy(this.clickedCell)) == -1 
				|| this.possibleCandies.indexOf(this.board.getCandy(over)) == -1) {
				return;
			}
		}

		if (over && this.board.isMoveable(over) && this.areNeighbours(this.clickedCell,over) && this.board.getCandy(over)) {

			this.board.makeMove(this.board.getCandy(this.clickedCell),this.board.getCandy(over));
			this.clicked = false;
			this.clickedCell = null;
		}

	}

};


G.InputController.prototype.canMakeMove = function() {

	if (this.locked) return false;
	if (!this.board.actionManager.noAction) return false;
	if (G.lvl.goalAchieved) return false;
	if (this.anyWindowOpen) return false;
	
	return true;

};


G.InputController.prototype.onClick = function(pointer) {

	if (!this.canMakeMove()) return;

	var cell = this.pointerToCell(pointer);

	if (!cell || !this.board.isMoveable(cell[0],cell[1])) return;

	if (this.board.getCandy(cell)) {

		G.sfx.pop.play()

		if (G.lvlNr+1 === 1) {
			G.ga.event('FTUE:Level1:InGame:TapOnGrid');
		}

		if (this.clickedCell) {
			if (Math.abs(this.clickedCell[0]-cell[0])+Math.abs(this.clickedCell[1]-cell[1]) == 1) {

				if (this.possibleCandies.length > 0) { 
					if (this.possibleCandies.indexOf(this.board.getCandy(this.clickedCell)) > -1 
						&& this.possibleCandies.indexOf(this.board.getCandy(cell)) > -1) {

						this.board.makeMove(this.board.getCandy(this.clickedCell),this.board.getCandy(cell));
						this.clickedCell = null;
						this.clicked = false;
						return;
					}
				}else{
					this.board.makeMove(this.board.getCandy(this.clickedCell),this.board.getCandy(cell));
					this.clickedCell = null;
					this.clicked = false;
					return;
				}

			}
		}
		
		this.clicked = true;
		this.clickedCell = cell;
		
	}

};


G.InputController.prototype.pointerToCell = function(pointer) {

	if (this.anyWindowOpen) return false;

	var xx = pointer.worldX;
	var yy = pointer.worldY;

	if (this.isPointerInRange(pointer)) {
		return [Math.floor((xx-(this.board.x+this.board.offsetX)*this.board.scale.x)/(this.board.tilesize*this.board.scale.x)),
						Math.floor((yy-(this.board.y+this.board.offsetY)*this.board.scale.y)/(this.board.tilesize*this.board.scale.y))];

	}
	return false;

};


G.InputController.prototype.pointerToCell2 = function(pointer){

	var xx = pointer.worldX;
	var yy = pointer.worldY;

	return [
		Math.floor((xx-(this.board.x+this.board.offsetX)*this.board.scale.x)/(this.board.tilesize*this.board.scale.x)),
		Math.floor((yy-(this.board.y+this.board.offsetY)*this.board.scale.y)/(this.board.tilesize*this.board.scale.y))
	];


};


G.InputController.prototype.isPointerInRange = function(pointer) {

	var x = pointer.worldX;
	var y = pointer.worldY;

		return !(x < this.board.x+this.board.offsetX || x > this.board.x+this.board.offsetX+this.board.width ||
				y < this.board.y+this.board.offsetY || y > this.board.y+this.board.offsetY+this.board.height)
};

G.InputController.prototype.areNeighbours = function(cell1,cell2) {

	if (cell1[0] == cell2[0]) {
		return Math.abs(cell1[1]-cell2[1]) == 1;
	}

	if (cell1[1] == cell2[1]) {
		return Math.abs(cell1[0]-cell2[0]) == 1;
	}

};
G.MatchList = function() {

	this.list = [];

};

G.MatchList.prototype.push = function(array) {
	
	for (var i = 0, len = this.list.length; i < len; i++) {
		if (this.list[i][0] == array[0] && this.list[i][1] == array[1]) return;
	}	
	this.list.push(array);

};

G.MatchList.prototype.remove = function(array) {

	for (var i = 0, len = this.list.length; i < len; i++) {
		if (this.list[i][0] == array[0] && this.list[i][1] == array[1]) {
			this.list.splice(i,1);
			return;
		}
	}	

};

G.MatchList.prototype.addHorizontal = function(cellFrom,cellTo,cellY) {
	for ( ; cellFrom <= cellTo; cellFrom++) {
		this.push([cellFrom,cellY]);
	}
};

G.MatchList.prototype.addVertical = function(cellX,cellFrom,cellTo) {
	for ( ; cellFrom >= cellTo; cellFrom--) {
		this.push([cellX,cellFrom]);
	}
};

G.MatchList.prototype.loop = function(func,context) {

	for (var i = 0, len = this.list.length; i < len; i++) {
		func.call(context || this, this.list[i]);
	}	

};
G.Refiller = function(lvl,board) {

	this.board = board;
	this.drops = lvl.drops;
	this.goalDrops = lvl.goalDrops ? JSON.parse(JSON.stringify(lvl.goalDrops)) : [];

	if (typeof this.drops.chest === 'undefined') this.drops.chest = 0;
	if (typeof this.drops.infection === 'undefined') this.drops.infection = 0;
	if (typeof this.drops.chain === 'undefined') this.drops.chain = 0;
	if (typeof this.drops.goalCandy === 'undefined') this.drops.goalCandy = 0;

	this.drops.chest *= G.lvl.coinChanceProb;

};

G.Refiller.prototype.getTypeToDrop = function(collumn) {

	this.substractGoalDropCounter();

	var goalDrop = this.checkGoalDropList();
	if (goalDrop) return goalDrop;

	var goalCandy = Math.random() < this.drops.goalCandy/100;
	var chest = Math.random() < this.drops.chest/100;
	var chain = Math.random() < this.drops.chain/100;
	var infection = Math.random() < this.drops.infection/100;

	if (goalCandy) return 'goalCandy';
	if (chest) return 'chest';
	if (infection) return 'infection';

	var rndType = game.rnd.between(1,this.board.MAX_NUMBER_OF_REGULAR_CANDY);

	if (chain) {
		rndType = 'CHAIN'+rndType
		if (rndType == 0) alert(rndType);
	}

	return rndType;

};

G.Refiller.prototype.checkGoalDropList = function() {

	for (var i = 0, len = this.goalDrops.length; i < len; i++) {
		if (this.goalDrops[i][1] <= 0) {
			var result = this.goalDrops[i][0];
			this.goalDrops.splice(i,1);
			return result;
		}
	};

	return false;

};

G.Refiller.prototype.substractGoalDropCounter = function() {

	for (var i = 0, len = this.goalDrops.length; i < len; i++) {
		this.goalDrops[i][1] = this.goalDrops[i][1]-1;
	};

};
G.Action = function(board,am,args) {
	
	this.state = game.state.getCurrentState();
	this.board = board;
	this.am = am;
	this.args = args;

};

G.Action.prototype.finish = function() {
	this.am.removeAction(this);
};


G.ActionBoosterMatch = function(board,am,args) {

	G.Action.call(this,board,am,args);

	this.clickedCandy = false;
	this.availableCandies = [];

	this.inputController = this.board.inputController;

	this.signalBinding = game.input.onDown.add(function(pointer) {

		var cell = this.inputController.pointerToCell(pointer);
		if (cell) {
			var candy = this.board.getCandy(cell[0],cell[1]);
			if (candy && !candy.goalCandy && (this.availableCandies.length == 0 || this.availableCandies.indexOf(candy) != -1)) {
				G.sfx.pop.play()
				this.clickedCandy = candy;
				G.saveState.useBooster(this.args[0]);
			}
		}

	},this);

	this.boosterInit = false;

   
};

G.ActionBoosterMatch.prototype = Object.create(G.Action.prototype);

G.ActionBoosterMatch.prototype.update = function() {

	if (!this.clickedCandy) return;
 
	if (this.boosterInit) return;


	if (!this.board.duringAnimation && !this.board.duringFall) {
			
			this.boosterInit = true;
			//G.sb.onBoosterUsed.dispatch(this.args[0]);
			this.signalBinding.detach();
			if (this.args[0] == 3) {
				this.board.boardCandies.boosterFxGroup.add(new G.BoosterHorizontal(this.clickedCandy.cellX,this.clickedCandy.cellY,this.args[0]));
			}else if (this.args[0] == 4) {
				this.board.boardCandies.boosterFxGroup.add(new G.BoosterVertical(this.clickedCandy.cellX,this.clickedCandy.cellY,this.args[0]));
			}else {
				this.board.boardCandies.boosterFxGroup.add(new G.Booster(this.clickedCandy.cellX,this.clickedCandy.cellY,this.args[0]));
			}
			
	
	}

};


G.ActionBoosterMatch.prototype.finish = function() {

	this.signalBinding.detach();
	this.am.removeAction(this);

};





G.ActionBoosterSwap = function(board,am,args) {

	G.Action.call(this,board,am,args);

	
	//this.boosterTutorialText = game.state.getCurrentState().boosterTutorialText;

	this.availableCandies = [];

	this.clickedCandy = false;
	this.clickedCandy2 = false;
	this.madeMove = false;

	this.inputController = this.board.inputController;

	this.signalBinding = game.input.onDown.add(function(pointer) {

		var cell = this.inputController.pointerToCell(pointer);
		if (cell) {
			if (this.board.isMoveable(cell[0],cell[1])) {
				
				var candy = this.board.getCandy(cell[0],cell[1]);
				if (candy.goalCandy) return;

				if (!this.clickedCandy && (this.availableCandies.length == 0 || this.availableCandies.indexOf(candy) != -1)) {
					this.selection = this.board.boardCandies.boosterFxGroup.add(new G.BoosterSelection(candy.cellX,candy.cellY,candy));
					G.sb.onBoosterSwapCandySelect.dispatch(candy);
					return this.clickedCandy = candy; 
				}

				if (this.clickedCandy != candy && (this.availableCandies.length == 0 || this.availableCandies.indexOf(candy) != -1)) {
					if (G.lvl.tutOpen) {
						var tut = game.state.getCurrentState().tut;
						game.add.tween(tut.hand).to({alpha:0},300,Phaser.Easing.Sinusoidal.In,true);
					}
					this.clickedCandy2 = candy;
					G.saveState.useBooster(1);

				}
			}
		}

	},this);
   
};

G.ActionBoosterSwap.prototype = Object.create(G.Action.prototype);

G.ActionBoosterSwap.prototype.update = function() {

	if (!this.clickedCandy || !this.clickedCandy2) return;


	if (!this.madeMove) {
		this.madeMove = true;
		this.signalBinding.detach();
		this.selection.hide();
		this.clickedCandy2.moveTo(this.clickedCandy.cellX,this.clickedCandy.cellY);
		this.clickedCandy.moveTo(this.clickedCandy2.cellX,this.clickedCandy2.cellY,true);
	}


	if (!this.board.duringAnimation && !this.board.duringFall) {


			if (this.board.matcher.isMoveValid(this.clickedCandy)) this.board.checkMatchList.push(this.clickedCandy);
			if (this.board.matcher.isMoveValid(this.clickedCandy2)) this.board.checkMatchList.push(this.clickedCandy2);
			if (this.board.checkMatchList.length > 0) {
				this.am.newAction('processMatch');
			}


			G.sb.onBoosterActionFinished.dispatch();
			this.finish();

			//G.sb.onBoosterUsed.dispatch(1);


	}


};


G.ActionBoosterSwap.prototype.finish = function() {

	if (this.selection && this.selection.alive) {
		this.selection.hide();
	}

	this.signalBinding.detach();
	this.am.removeAction(this);

};

G.ActionMove = function(board,am,args) {

	G.Action.call(this,board,am,args);

	this.candy1 = args[0];
	this.candy1orgParent = this.candy1.parent;
	this.candy2 = args[1];
	this.candy2orgParent = this.candy2.parent;
	this.forceMove = args[2];
	this.back = false;

	this.startAnimation();
   
};

G.ActionMove.prototype = Object.create(G.Action.prototype);

G.ActionMove.prototype.update = function() {

	this.updateAnimation();
	this.progress += 0.075*G.deltaTime; 

	if (this.progress >= 1) {

		this.finishAnimation();

		if (this.back) {return this.finish()};


		this.candy1.movedWith(this.candy2);
		this.candy2.movedWith(this.candy1);


		//COMBO
		if (this.candy1.special && this.candy2.special) {


			//check combo also process CANDY!!!!
			if (this.checkCombo(this.candy1,this.candy2)) {
				G.lvl.madeMove();
				this.am.newAction('processMatch');
				return this.finish();

			}else if (this.candy1.specialType == 'spiral' || this.candy2.specialType == 'spiral') {
				//check spiral matches
				var spiral = this.candy1.specialType == 'spiral' ? this.candy1 : this.candy2;  
				var other = this.candy1.specialType != 'spiral' ? this.candy1 : this.candy2;

				other.startAnimation('moveTo',[0,spiral.cellX,spiral.cellY]);
				spiral.exe = [["changeTypeInto",other.candyType >= 1 ? other.candyType : game.rnd.between(1,this.board.MAX_NUMBER_OF_REGULAR_CANDY),other.specialType]];
				this.board.checkMatchList.push(spiral);

				G.lvl.madeMove();
				this.am.newAction('processMatch');
				return this.finish();

			}else {
				//if there is no combo, just activate both candies
				this.candy1.activatedByMove = true;
				this.candy2.activatedByMove = true;
				this.board.checkMatchList.push(this.candy1);
				this.board.checkMatchList.push(this.candy2);
				G.lvl.madeMove();
				this.am.newAction('processMatch');
				return this.finish();
			}
		}


		//NORMAL
		if (this.board.matcher.isMoveValid(this.candy1)) this.board.checkMatchList.push(this.candy1);
		if (this.board.matcher.isMoveValid(this.candy2)) this.board.checkMatchList.push(this.candy2);


		if (this.board.checkMatchList != false) {
			this.candy1.movedWith(this.candy2);
			this.candy2.movedWith(this.candy1);
			if (!this.forceMove) G.lvl.madeMove();
			this.am.newAction('processMatch');
			return this.finish();
		}

		//if allreadyback or rabbit
		if (this.back || this.forceMove) {
			this.finish();
		}else {
			this.back = true;
			this.startAnimation();
		}
		

	}//this.finish();

};


G.ActionMove.prototype.startAnimation = function() {

	G.sfx.exchange.play();

	this.candy1anim = {
		startX: this.candy1.x,
		deltaX: this.candy2.x - this.candy1.x,
		startY: this.candy1.y,
		deltaY: this.candy2.y - this.candy1.y
	};

	this.board.boardCandies.secondFloor.add(this.candy1);

	this.candy2anim = {
		startX: this.candy2.x,
		deltaX: this.candy1.x - this.candy2.x,
		startY: this.candy2.y,
		deltaY: this.candy1.y - this.candy2.y
	};

	this.board.boardCandies.secondFloor.add(this.candy2);

	this.candy1.bringToTop();

	
	this.progress = 0;

	if (G.IMMEDIATE) this.progress = 1;

};

G.ActionMove.prototype.finishAnimation = function() {

	this.board.swapCandies(this.candy1,this.candy2);
	this.candy1.x = this.board.cellXToPxIn(this.candy1.cellX);
	this.candy1.y = this.board.cellYToPxIn(this.candy1.cellY);
	this.candy1.scale.setTo(1);
	this.candy1orgParent.add(this.candy1);
	this.candy2.x = this.board.cellXToPxIn(this.candy2.cellX);
	this.candy2.y = this.board.cellYToPxIn(this.candy2.cellY);
	this.candy2orgParent.add(this.candy2);

};

G.ActionMove.prototype.updateAnimation = function() {

	var animProgress = Phaser.Easing.Sinusoidal.InOut(this.progress);

	this.candy1.x = this.candy1anim.startX+(animProgress*this.candy1anim.deltaX);
	this.candy1.y = this.candy1anim.startY+(animProgress*this.candy1anim.deltaY);

	this.candy1.scale.setTo(2-(Math.abs(0.5-animProgress)*2));


	this.candy2.x = this.candy2anim.startX+(animProgress*this.candy2anim.deltaX);
	this.candy2.y = this.candy2anim.startY+(animProgress*this.candy2anim.deltaY);
	

};

G.ActionMove.prototype.checkCombo = function(candy1,candy2) {

	var combo;

	for (var i = 0, len = G.specialCandies.combos.length; i < len; i++) {
		combo = G.specialCandies.combos[i];

		if ((candy1.specialType == combo[0] && candy2.specialType == combo[1])
			|| (candy1.specialType == combo[1] && candy2.specialType == combo[0])) {

			var moveRot = combo[3];

			//special case - order of candies (rotation of candy that doesnt move might be needed)
			if ((combo[0] == "vertical" || combo[0] == "horizontal") && combo[1] == "cross") {
				if (candy1.specialType == "vertical" || candy1.specialType == "horizontal") {
					game.add.tween(candy1).to({angle: combo[3]},300,Phaser.Easing.Sinusoidal.InOut,true);
					moveRot = 0;
				}
			}


			candy1.changeInto(combo[2]);
			candy2.detachFromGrid();
			candy2.startAnimation('moveToCombo',[0,candy1.cellX,candy1.cellY,moveRot]);
			
			if (!candy1.onMatchFx) candy1.onMatchFx = [];
			candy1.onMatchFx.push(['dummyComboGrowAndFade',[candy2.frameName,moveRot]]);
			
			candy2.bringToTop();
			candy2.candyType = Math.random();
			candy1.activatedByMove = true;
			this.board.checkMatchList.push(this.candy1);
			return true;

		}
	};

	return false;

};
G.ActionProcessFall = function(board,am,args) {

	G.Action.call(this,board,am,args);

	this.madeCrossCollumn = false;

	this.board.allCollumsFall();
   
};

G.ActionProcessFall.prototype = Object.create(G.Action.prototype);

G.ActionProcessFall.prototype.update = function() {

	if (!this.board.duringAnimation && !this.board.duringFall) {

		
			if (!this.madeCrossCollumn) {
				while(true) {
					if (!this.board.crossCollumnFall()) break;
				}
				this.madeCrossCollumn = true;
				return;
			}

			//check if candies that have fallen are making match
			this.board.fallCheckList.forEach(function(candy) {
				if (this.board.matcher.quickMatchCheck(candy)) {
					this.board.checkMatchList.push(candy);
				}
			},this);
			this.board.fallCheckList = [];


			if (this.board.checkMatchList != false || this.board.checkAfterFall.length > 0) {

				//check after fall to checkmatchlist
				for (var i = 0, len = this.board.checkAfterFall.length; i < len; i++) {
					this.board.checkMatchList.push(this.board.checkAfterFall[i]);
				}
				this.board.checkAfterFall = [];

				this.am.newAction('processMatch');
			}

			G.sb.actionFallEnd.dispatch();

			this.finish();



	}

};
G.ActionProcessMatch = function(board,am,args) {

	G.Action.call(this,board,am,args);
	this.preFall = true;
	this.processed = false;

};

G.ActionProcessMatch.prototype = Object.create(G.Action.prototype);

G.ActionProcessMatch.prototype.update = function() {

	//if (!this.board.duringAnimation && !this.board.duringFall && (this.board.checkMatchList != false || this.board.checkSpecialMatchList != false)) {
	if (!this.board.duringAnimation && !this.board.duringFall) {
		this.board.matcher.processMatchList();
		//G.lvl.increaseCombo();
	};

	if (!this.board.duringAnimation && !this.board.duringFall && this.board.checkMatchList == false && this.board.checkSpecialMatchList == false) {
		
		this.am.newAction('processFall');
		this.finish();
		//
	}	

};
G.ActionShuffle = function(board,am,args) {

	G.Action.call(this,board,am,args);

	this.state = game.state.getCurrentState();

	this.shuffleText = new G.OneLineText(0,0,'font-blue',G.txt(25),70,620,0.5,0.5);
	this.shuffleText.x = this.state.board.x+this.state.board.width*0.5;
	this.shuffleText.y = this.state.board.y+this.state.board.height*0.47;
	game.state.getCurrentState().UIFxLayer.add(this.shuffleText);
	this.shuffleText.popUpAnimation();

	this.updateActive = false;

	game.add.tween(this.shuffleText).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true,2000).onComplete.add(function() {
		this.board.shuffleCandies();
		this.updateActive = true;
		this.shuffleText.destroy();
	},this);
	

	

};

G.ActionShuffle.prototype = Object.create(G.Action.prototype);

G.ActionShuffle.prototype.update = function() {

	if (this.updateActive) {

		if (!this.board.duringAnimation && !this.board.duringFall) {
			
			this.updateActive = false;

			if (this.board.checkMatchList.length == 0) {
				this.finish()
			}else {
				if (G.IMMEDIATE) {
					this.finish();
				}else {
					game.time.events.add(300,this.finish,this);
				}
			}
			

		};

	}

};
G.ActionStartBoosters = function(board,am,args) {

	G.Action.call(this,board,am,args);

	this.state = game.state.getCurrentState();

	this.boosters = [];
	this.popCounter = 0;
	this.positions = this.generatePositions();
	this.positionIndex = 0;

	var bubble = null;
	var delay = 500;
	var delayIncrease = 200;

	var startBoosters = this.state.startBoosters;



	this.normals = this.board.boardCandies.getNormalCandies();
	Phaser.ArrayUtils.shuffle(this.normals);
	this.normalsIndex = 0;


    if (startBoosters[5]) {

    	G.saveState.useStartBooster(5);
    	bubble = new G.StartBoosterBubble(this.positions[this.positionIndex++],5,this.state.topBar.movesTxt,function() {
    		G.lvl.changeMoveNumber(5);
    	});
 		bubble.goToTarget(delay);
 		delay+=delayIncrease;
    	this.boosters.push(bubble);

    }

    if (startBoosters[6]) {

    	G.saveState.useStartBooster(6);
    	bubble = new G.StartBoosterBubble(this.positions[this.positionIndex++],6,null,function() {
    		this.state.doubleMoney = true;
    	},this);
    	bubble.goToTarget(delay);
 		delay+=delayIncrease;
    	this.boosters.push(bubble);
        
    }

    if (startBoosters[7]) {

        for (var i = 0; i < 3; i++) {
            var normal = this.board.boardCandies.getRandomNormal();
            if (this.normals[this.normalsIndex+1]) {

            	bubble = new G.StartBoosterBubble(this.positions[this.positionIndex++],7,this.normals[this.normalsIndex++],function() {
		  			this.target.changeInto(Math.random()<0.5?'vertical':'horizontal');
		    	});
		    	bubble.goToTarget(delay);
	 			delay+=delayIncrease;
		    	this.boosters.push(bubble);

            }
        }
        G.saveState.useStartBooster(7);

    }

    if (startBoosters[8]) {

        if (this.normals[this.normalsIndex+1]) {

        	G.saveState.useStartBooster(8);
	    	bubble = new G.StartBoosterBubble(this.positions[this.positionIndex++],8,this.normals[this.normalsIndex++],function() {
	  			this.target.changeInto('spiral');
	    	});
	    	bubble.goToTarget(delay);
 			delay+=delayIncrease;
	    	this.boosters.push(bubble);

        }
        
    }


	this.state.UIFxLayer.addMultiple(this.boosters);

	this.boosters.forEach(function(booster) {
		booster.events.onDestroy.add(function(){
			this.popCounter++;
		},this)
	},this);

};

G.ActionStartBoosters.prototype = Object.create(G.Action.prototype);

G.ActionStartBoosters.prototype.update = function() {

	if (this.popCounter == this.boosters.length) {
		this.finish();
	}

};


G.ActionStartBoosters.prototype.generatePositions = function() {

	var result = [];

	for (var xx = 0.15; xx <= 0.85; xx += 0.14) {
		for (var yy = 0.15; yy <= 0.85; yy += 0.14) {

			result.push([
				xx+game.rnd.realInRange(-0.02,0.02),
				yy+game.rnd.realInRange(-0.02,0.02)
			]);

		}
	}

	return Phaser.ArrayUtils.shuffle(result);

};
G.EditorDropPanel = function(x,y) {

	Phaser.Group.call(this,game);
	this.x = G.l(x);
	this.y = G.l(y);
 

	this.goalTxt = new G.OneLineText(0,0,'font-white',"% DROPS:",60,400,0,0.5);
	this.add(this.goalTxt);

	this.drops = G.lvlData.drops;

	this.makeField(100,'candy_chest','chest');
	this.makeField(200,'blocker_chain_wrapped','chain');
	this.makeField(300,'candy_infection','infection'); 
	this.makeField(400,'candy_goalCandy','goalCandy'); 

};

G.EditorDropPanel.prototype = Object.create(Phaser.Group.prototype);

G.EditorDropPanel.prototype.makeField = function(y,spriteName,propName) {

	var ico = G.makeImage(0,y,spriteName,[0,0.5],this);

	var txt = game.make.bitmapText(100,y-30,'font-white',this.drops[propName] || '0', 50);
	txt.inputEnabled = true;
	txt.input.useHandCursor = true;
	txt.events.onInputDown.add(function() {
		var answer = prompt("Enter % of getting "+propName);
		var parsedAnswer = parseFloat(answer);
		if (isNaN(parsedAnswer)) return;
		if (parsedAnswer < 0 || parsedAnswer >= 100) return;
		G.lvlData.drops[propName] = parsedAnswer;
		this.setText(parsedAnswer.toString());
	},txt);

	this.add(txt);

}
G.EditorGoalDropPanel = function(x,y) {

	Phaser.Group.call(this,game);
	this.x = G.l(x);
	this.y = G.l(y);

	if (!G.lvlData.goalDrops)  G.lvlData.goalDrops = [];
 

	this.goalTxt = new G.OneLineText(0,0,'font-white',"DROPS:",60,400,0,0.5);

	this.plusBtn = new G.Button(200,0,'plus_ico',function() {
		this.makeGoalItem(this.goals.length);
	},this);

	this.minusBtn = new G.Button(240,0,'minus_ico',function() {
		if (this.goals.length == 0) return;
		this.removeGoal();
	},this);

	this.addMultiple([this.goalTxt,this.plusBtn,this.minusBtn]);

	this.goals = [];

	this.loadLvlDrops();

};

G.EditorGoalDropPanel.prototype = Object.create(Phaser.Group.prototype);

G.EditorGoalDropPanel.prototype.loadLvlDrops = function() {

	G.lvlData.goalDrops.forEach(function(elem,index) {
		this.makeGoalItem(index,elem[0],elem[1]);
	},this);

};

G.EditorGoalDropPanel.prototype.removeGoal = function() {
	var goalToRemove = this.goals.pop();
	goalToRemove.destroy();
	G.lvlData.goalDrops.pop();
};

G.EditorGoalDropPanel.prototype.makeGoalItem = function(index,name,nr) {

	var goalItem = game.make.group();
	var gfxName;

	
	goalItem.goalIndex = index;
	goalItem.x = G.l(100)
	goalItem.y = G.l(80+(80*index));
	
	goalItem.allGoals = ['goalCandy'];
	goalItem.goalName = name || goalItem.allGoals[0];
	goalItem.goalNr = nr || 5;

	goalItem.img = G.makeImage(-50,0,null,0.5,goalItem);
	goalItem.img.scale.setTo(0.6);
	goalItem.img.refreshGraphics = function() {
		G.changeTexture(this,G.json.settings.goals[this.parent.goalName].sprite);

	};
	goalItem.img.refreshGraphics();

	
	goalItem.img.inputEnabled = true;
	goalItem.img.input.useHandCursor = true;
	goalItem.img.events.onInputDown.add(function() {

		var index = goalItem.allGoals.indexOf(goalItem.goalName);
		goalItem.goalName = goalItem.allGoals[(index+1)%goalItem.allGoals.length];
		G.lvlData.goalDrops[goalItem.goalIndex][0] = goalItem.goalName;
		goalItem.img.refreshGraphics();

	});

	
	goalItem.nr = game.make.bitmapText(G.l(50),0,'font-white',goalItem.goalNr.toString(),G.l(70));
	goalItem.add(goalItem.nr);
	goalItem.nr.anchor.setTo(0,0.5);
	goalItem.nr.inputEnabled = true;
	goalItem.nr.input.useHandCursor = true;
	goalItem.nr.events.onInputDown.add(function() {

		var answer = prompt("Enter moves number");

		if (isNaN(parseInt(answer))) return;

		G.lvlData.goalDrops[goalItem.goalIndex][1] = parseInt(answer);
		goalItem.goalNr = answer;
		goalItem.nr.setText(goalItem.goalNr.toString());

	});


	this.add(goalItem);
	this.goals.push(goalItem);

	if (index >= G.lvlData.goalDrops.length) {
		G.lvlData.goalDrops.push([goalItem.goalName,goalItem.goalNr]);
	}
	
}; 
G.EditorGoalPanel = function(x,y) {

	Phaser.Group.call(this,game);
	this.x = G.l(x);
	this.y = G.l(y);

	this.state = game.state.getCurrentState();


	this.goalTxt = new G.OneLineText(0,0,'font-white',"GOAL:",60,400,0,0.5);

	this.plusBtn = new G.Button(160,0,'plus_ico',function() {
		if (G.lvlData.goal[0] === 'points') return;
		if (this.goals.length >= 4) return;
		this.makeGoalItem(this.goals.length);
	},this);

	this.minusBtn = new G.Button(200,0,'minus_ico',function() {
		if (G.lvlData.goal[0] === 'points') return;
		if (this.goals.length == 1) return;
		this.removeGoal();
	},this);

	this.changeGoalType = new G.Button(270,0,'minus_ico',function() {
		if (G.lvlData.goal[0] === 'points') {
			G.lvlData.goal = ['collect',[['1',5],['2',5]]];
		}else {
			G.lvlData.goal = ['points',5000];
		}

		this.loadLvlGoals();
	},this);
	this.changeGoalType.angle = 90;


	this.addMultiple([this.goalTxt,this.plusBtn,this.minusBtn,this.changeGoalType]);

	this.goals = [];

	this.normals = ["1","2","3","4","5","6"];


	

	var pointsTarget = G.lvlData.goal[0] === 'points' ? G.lvlData.goal[1] : 1000;

	this.pointTxt = game.make.bitmapText(G.l(50),100,'font-white',
		pointsTarget
	,G.l(70));
	this.add(this.pointTxt);
	this.pointTxt.anchor.setTo(0,0.5);
	this.pointTxt.inputEnabled = true;
	this.pointTxt.input.useHandCursor = true;
	this.pointTxt.events.onInputDown.add(function() {
		var answer = prompt("Enter points target");
		if (isNaN(parseInt(answer))) return;
		G.lvlData.goal[1] = parseInt(answer);
		this.setText(parseInt(answer));
	},this.pointTxt);

	this.loadLvlGoals();

};

G.EditorGoalPanel.prototype = Object.create(Phaser.Group.prototype);

G.EditorGoalPanel.prototype.update = function() {

	if (G.lvlData.goal[0] === 'points') return;

	for (var i = 0; i < this.goals.length; i++) {
		this.updateGoal(this.goals[i]);

	}

};

G.EditorGoalPanel.prototype.loadLvlGoals = function() {

	this.goals.forEach(function(g){g.destroy()});
	this.goals = [];

	if (G.lvlData.goal[0] == 'points') {
		this.pointTxt.visible = true;
		this.pointTxt.setText(G.lvlData.goal[1]);

		return;
	}else {

		console.log(JSON.stringify(G.lvlData.goal[1]));

		this.pointTxt.visible = false;
		G.lvlData.goal[1].forEach(function(elem,index) {
			this.makeGoalItem(index,elem[0],elem[1]);
		},this);
	}

};

G.EditorGoalPanel.prototype.removeGoal = function() {
	var goalToRemove = this.goals.pop();
	goalToRemove.destroy();
	G.lvlData.goal[1].pop();
};

G.EditorGoalPanel.prototype.makeGoalItem = function(index,name,nr) {

	var goalItem = game.make.group();
	var gfxName;

	
	goalItem.goalIndex = index;
	goalItem.x = G.l(100)
	goalItem.y = G.l(80+(80*index));
	
	goalItem.allGoals = Object.keys(G.json.settings.goals);
	goalItem.goalName = name || goalItem.allGoals[0];
	goalItem.goalNr = nr || 5;

	goalItem.img = G.makeImage(-50,0,null,0.5,goalItem);
	goalItem.img.scale.setTo(0.6);
	goalItem.img.refreshGraphics = function() {
		var name = this.parent.goalName;
		G.changeTexture(this,G.json.settings.goals[this.parent.goalName].sprite);
	};
	goalItem.img.refreshGraphics();

	
	goalItem.img.inputEnabled = true;
	goalItem.img.input.useHandCursor = true;
	goalItem.img.events.onInputDown.add(function() {

		var index = goalItem.allGoals.indexOf(goalItem.goalName);
		goalItem.goalName = goalItem.allGoals[(index+1)%goalItem.allGoals.length];
		G.lvlData.goal[1][goalItem.goalIndex][0] = goalItem.goalName;
		goalItem.img.refreshGraphics();

	});

	goalItem.alert = game.make.bitmapText(G.l(250),0,'font-white','ALERT!',G.l(70));
	goalItem.alert.anchor.setTo(0,0.5);
	goalItem.alert.tint = 0xff0000;
	goalItem.alert.visible = false;
	goalItem.add(goalItem.alert);
	
	goalItem.nr = game.make.bitmapText(G.l(50),0,'font-white',goalItem.goalNr.toString(),G.l(70));
	goalItem.add(goalItem.nr);
	goalItem.nr.anchor.setTo(0,0.5);
	goalItem.nr.inputEnabled = true;
	goalItem.nr.input.useHandCursor = true;
	goalItem.nr.events.onInputDown.add(function() {

		var answer = prompt("Enter moves number");

		if (isNaN(parseInt(answer))) return;

		G.lvlData.goal[1][goalItem.goalIndex][1] = parseInt(answer);
		goalItem.goalNr = answer;
		goalItem.nr.setText(goalItem.goalNr.toString());

	});

	this.add(goalItem);
	this.goals.push(goalItem);

	if (index >= G.lvlData.goal[1].length) {
		G.lvlData.goal[1].push([goalItem.goalName,goalItem.goalNr]);
	}

}; 

G.EditorGoalPanel.prototype.updateGoal = function(goalItem) {

	//["1","2","3","4","5","6","concrete","dirt","chain","ice","infection"]

	var txt = goalItem.goalNr.toString();
	


	if (this.normals.indexOf(goalItem.goalName) !== -1) {

		goalItem.nr.setText(txt);
		goalItem.alert.visible = parseInt(goalItem.goalName) > G.lvlData.nrOfTypes;
		goalItem.alert.tint = 0xff0000;

	}else {

		var currentAmount;
		var goodAnyway = false;

		if (goalItem.goalName === 'concrete') {
			currentAmount = this.countConcrete();
		}

		if (goalItem.goalName === 'goalCandy') {
			currentAmount = this.countGoalCandies();
		}


		else if (goalItem.goalName === 'ice') {
			currentAmount = this.countIce();
		}
		else if (goalItem.goalName === 'dirt') {
			currentAmount = this.countDirt();
		}
		else if (goalItem.goalName === 'chain') {
			currentAmount = this.countChains();
			goodAnyway = G.lvlData.drops.chain > 0;
		}else if (goalItem.goalName === 'infection') {
			currentAmount = this.countInfections();
			goodAnyway = G.lvlData.drops.infection > 0;
		}


		txt += ' ('+currentAmount+')';

		goalItem.nr.setText(' ');
		goalItem.nr.setText(txt);

		goalItem.alert.visible = goalItem.goalNr > currentAmount;
		goalItem.alert.tint = goodAnyway ? 0xffa500 : 0xff0000;

	}


};


//["concrete","dirt","chain","ice","infection"]

G.EditorGoalPanel.prototype.countConcrete = function() {

	var result = 0;
	this.state.board.boardCage.grid.loop(function(e) {
		if (e !== null && e !== false) {
			result++;			
		}
	});
	return result;

};

G.EditorGoalPanel.prototype.countGoalCandies = function() {

	var result = 0;

	this.state.board.boardCandies.grid.loop(function(e) {
		if (e !== null && e !== false) {
			if (e.candyType == 'goalCandy') result++;			
		}
	});

	G.lvlData.goalDrops.forEach(function(g) {
		if (g[0] === 'goalCandy') result++;
	})


	return result;

};

G.EditorGoalPanel.prototype.countDirt = function() {

	var result = 0;
	this.state.board.boardDirt.grid.loop(function(e) {
		if (e !== null && e !== false) {
			result++;			
		}
	});
	return result;

};


G.EditorGoalPanel.prototype.countChains = function() {

	var result = 0;
	this.state.board.boardCandies.grid.loop(function(e) {
		if (e !== null && e !== false) {
			if (e.wrapped) result++;			
		}
	});

	return result;

};


G.EditorGoalPanel.prototype.countIce = function() {

	var result = 0;
	this.state.board.boardIce.grid.loop(function(e) {
		if (e !== null && e !== false) {
			result++;			
		}
	});
	return result;

};

G.EditorGoalPanel.prototype.countInfections = function() {

	var result = 0;
	this.state.board.boardCandies.grid.loop(function(e) {
		if (e !== null && e !== false) {
			if (e.candyType === 'infection') result++;			
		}
	});

	return result;

};

if (typeof G == 'undefined') G = {};

G.EditorSidePanel = function(x) {

	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.x = x;


	this.makeText(0,10,'BOARD SIZE:');

	this.widthMinus = new G.Button(20,80,'minus_ico',function() {
		this.state.changeBoardSize(Math.max(4,this.state.board.boardData.width-1),Math.max(4,this.state.board.boardData.height));
		this.widthText.setText(this.state.board.boardData.width);
	},this);

	this.widthText = this.makeText(40,60,this.state.board.boardData.width.toString());

	this.widthPlus = new G.Button(90,80,'plus_ico',function() {
		this.state.changeBoardSize(Math.max(4,this.state.board.boardData.width+1),Math.max(4,this.state.board.boardData.height));
		this.widthText.setText(this.state.board.boardData.width);
	},this);

	this.heightMinus = new G.Button(140,80,'minus_ico',function() {
		this.state.changeBoardSize(Math.max(4,this.state.board.boardData.width),Math.max(4,this.state.board.boardData.height-1));
		this.heightText.setText(this.state.board.boardData.height);
	},this);

	this.heightText = this.makeText(160,60,this.state.board.boardData.height.toString());

	this.heightPlus = new G.Button(210,80,'plus_ico',function() {
		this.state.changeBoardSize(Math.max(4,this.state.board.boardData.width),Math.max(4,this.state.board.boardData.height+1));
		this.heightText.setText(this.state.board.boardData.height);
	},this);

	this.addMultiple([this.widthMinus,this.widthPlus,this.heightPlus,this.heightMinus]);



	this.makeKeyLabels(0,100);

	this.makeMoveController(0,720);

	this.makeStarsReqController(0,770);

	this.goalPanel = new G.EditorGoalPanel(0,970);
	this.add(this.goalPanel);

	this.dropPanel = new G.EditorDropPanel(400,40);
	this.add(this.dropPanel);

	this.dropGoalPanel = new G.EditorGoalDropPanel(650,40);
	this.add(this.dropGoalPanel);

	this.makeMaxNumberController(-800,1350); 

	this.makeBgSet(-800,1250); 

	this.makeExportButton(0,1350);

	this.makeNextPrevExport(0,1450);
	
};

G.EditorSidePanel.prototype = Object.create(Phaser.Group.prototype);


G.EditorSidePanel.prototype.makeNextPrevExport = function(x,y) {

	var btn = this.makeText(x,y,'Prev');
	btn.inputEnabled = true;
	btn.input.useHandCursor = true;
	btn.events.onInputDown.add(function() {	
		this.exportLevel();
		game.state.start("Editor",true,false,Math.max(0,G.lvlNr-1)
		);	
	},this);

	var btn = this.makeText(x-200,y,'Play');
	btn.inputEnabled = true;
	btn.input.useHandCursor = true;
	btn.events.onInputDown.add(function() {	
		this.exportLevel();
		game.state.start("Game",true,false,G.lvlNr,true);
	},this);

	var btn = this.makeText(x+150,y,'Next');
	btn.inputEnabled = true;
	btn.input.useHandCursor = true;
	btn.events.onInputDown.add(function() {	
		this.exportLevel();
		game.state.start("Editor",true,false,Math.min(G.json.levels.length-1,G.lvlNr+1));
	},this);



	var btn = this.makeText(x+300,y,'EXPORT');
	btn.inputEnabled = true;
	btn.input.useHandCursor = true;
	btn.events.onInputDown.add(function() {	
		this.exportLevel();
		var blob = new Blob([JSON.stringify(G.json.levels)],{type: "text/plain;charset=utf-8"});
    	saveAs(blob, "levels.json");
	},this);


};

G.EditorSidePanel.prototype.makeText = function(x,y,text) {

	var text = game.make.bitmapText(G.l(x),G.l(y),'font-white',text,G.l(50)); 
	this.add(text); 
	return text;

};

G.EditorSidePanel.prototype.makeBgSet = function(x,y) {

	this.bgSetGroup = this.add(game.make.group());
	this.bgSetGroup.x = G.l(x);
	this.bgSetGroup.y = G.l(y);

	this.bgSetLabel = this.makeText(0,0,'BG Img:');
	this.bgSetGroup.add(this.bgSetLabel);

	this.bgSetBtn = this.makeText(400,0,(G.lvlData.bgImg || 'NO BG').toString());
	this.bgSetGroup.add(this.bgSetBtn);
	this.bgSetBtn.inputEnabled = true;
	this.bgSetBtn.input.useHandCursor = true;
	this.bgSetBtn.events.onInputDown.add(function() {
		var answer = prompt("Name of file in hd/assets/imagePOST/");
		if (answer === '') return;
		G.lvlData.bgImg = answer;
		this.bgSetBtn.setText(answer.toString());
	},this);

};

G.EditorSidePanel.prototype.makeMaxNumberController = function(x,y) {

	this.maxNrGroup = this.add(game.make.group());
	this.maxNrGroup.x = G.l(x);
	this.maxNrGroup.y = G.l(y);

	this.maxNrLabel = this.makeText(0,0,'Types of candies:');
	this.maxNrGroup.add(this.maxNrLabel);

	this.maxNrBtn = this.makeText(400,0,G.lvlData.nrOfTypes.toString());
	this.maxNrGroup.add(this.maxNrBtn);
	this.maxNrBtn.inputEnabled = true;
	this.maxNrBtn.input.useHandCursor = true;
	this.maxNrBtn.events.onInputDown.add(function() {
		var answer = prompt("Enter max candy number (4 or 5)");
		var parsedAnswer = parseInt(answer);
		if (isNaN(parsedAnswer)) return;
		G.lvlData.nrOfTypes = parseInt(answer);
		this.maxNrBtn.setText(parseInt(answer).toString());
	},this);

};

G.EditorSidePanel.prototype.makeRainbowChanceController = function(x,y) {

	this.rainbowGroup = this.add(game.make.group());
	this.rainbowGroup.x = G.l(x);
	this.rainbowGroup.y = G.l(y);

	this.chanceLabel = this.makeText(0,0,'Rainbow chance: ');
	this.rainbowGroup.add(this.chanceLabel);

	this.chanceBtn = this.makeText(400,0,G.lvlData.rainbowChance.toString());
	this.rainbowGroup.add(this.chanceBtn);
	this.chanceBtn.inputEnabled = true;
	this.chanceBtn.input.useHandCursor = true;
	this.chanceBtn.events.onInputDown.add(function() {
		var answer = prompt("Enter % of getting candy");
		var parsedAnswer = parseFloat(answer);
		if (isNaN(parsedAnswer)) return;
		if (parsedAnswer < 0 || parsedAnswer >= 100) return;

		G.lvlData.rainbowChance = parsedAnswer;
		this.chanceBtn.setText(parsedAnswer.toString());
	},this);

};

G.EditorSidePanel.prototype.makeExportButton = function(x,y) {

	var btn = this.makeText(x,y,'BACK TO WORLD MAP');
	btn.inputEnabled = true;
	btn.input.useHandCursor = true;
	btn.events.onInputDown.add(function() {	
		this.exportLevel();
		game.state.start("EditorWorld");
	},this);

};

G.EditorSidePanel.prototype.makeMoveController = function(x,y) {

	this.moveControllerGroup = this.add(game.make.group());
	this.moveControllerGroup.x = G.l(x);
	this.moveControllerGroup.y = G.l(y);

	this.moveLabel = this.makeText(0,0,'MOVES:');
	this.movesNr = game.make.bitmapText(G.l(200),0,'font-white',G.lvlData.moves.toString(),30);
	this.movesNr.inputEnabled = true;
	this.movesNr.input.useHandCursor = true;
	this.movesNr.events.onInputDown.add(function() {
		var answer = prompt("Enter moves number");

		if (isNaN(parseInt(answer))) return;

		G.lvlData.moves = parseInt(answer);
		this.movesNr.setText(parseInt(answer).toString());

	},this);
	
	this.moveControllerGroup.addMultiple([this.moveLabel,this.movesNr]);

};

G.EditorSidePanel.prototype.makeStarsReqController = function(x,y) {

	this.starsReqGroup = this.add(game.make.group());
	this.starsReqGroup.x = G.l(x);
	this.starsReqGroup.y = G.l(y);

	this.labels = [];
	this.btns = [];

	for (var i = 0; i < 3; i++) {

		this.labels[i] = this.makeText(0,i*50,'STAR '+(i+1)+':');

		this.btns[i] = game.make.bitmapText(G.l(200),G.l(i*50),'font-white',G.lvlData.starsReq[i].toString(),30);
		this.btns[i].index = i;
		this.btns[i].inputEnabled = true;
		this.btns[i].input.useHandCursor = true;
		this.btns[i].events.onInputDown.add(function() {
			var answer = prompt("Enter requirement for "+(this.index+1)+" stars:");
			var parsedAnswer = parseInt(answer);
			if (isNaN(parsedAnswer)) return;
			G.lvlData.starsReq[this.index] = parsedAnswer;
			this.setText(parsedAnswer.toString());

		},this.btns[i]);

	}

	this.starsReqGroup.addMultiple(this.labels);
	this.starsReqGroup.addMultiple(this.btns);


};

G.EditorSidePanel.prototype.makeKeyPreview = function(x,y,letter,image) {

	this.makeText(x,y,letter);

	var img = G.makeImage(x+80,y,image);
	img.width = G.l(60);
	img.height = G.l(60);
	this.add(img);


};

G.EditorSidePanel.prototype.makeKeyLabels = function(x,y) {

	this.makeText(x,y,'Keys:');
	this.makeKeyPreview(x,y+60,'1','candy_1');
	this.makeKeyPreview(x,y+120,'2','candy_2');
	this.makeKeyPreview(x,y+180,'3','candy_3');
	this.makeKeyPreview(x,y+240,'4','candy_4');
	this.makeKeyPreview(x,y+300,'5','candy_5');
	this.makeKeyPreview(x,y+360,'6','candy_6');
	this.makeKeyPreview(x,y+420,'7','candy_r');
	this.makeKeyPreview(x,y+480,'8','candy_chest');
	this.makeKeyPreview(x,y+540,'9','candy_goalCandy');
	

	this.makeKeyPreview(x+180,y+60,'E','concrete_3');
	this.makeKeyPreview(x+180,y+120,'R','dirt_2');
	this.makeKeyPreview(x+180,y+180,'T','eraser');
	this.makeKeyPreview(x+180,y+240,'Y','tile_1');
	this.makeKeyPreview(x+180,y+300,'W','ice_front');
	this.makeKeyPreview(x+180,y+360,'A','blocker_chain_wrapped');
	this.makeKeyPreview(x+180,y+420,'S','candy_infection');
	this.makeKeyPreview(x+180,y+500,'0','candy_r');
};


G.EditorSidePanel.prototype.exportLevel = function() {

	var tempArray = new G.GridArray(this.state.board.boardData.width,this.state.board.boardData.height);

	tempArray.loop(function(elem,x,y,data) {
		data[x][y] = [];

		if (s.board.boardData.data[x][y] == 'X') {
			data[x][y].push('X');
		}

		var dirt = s.board.boardDirt.grid.data[x][y];
		if (dirt) {
			data[x][y].push('dirt'+dirt.hp);
		}

		var ice = s.board.boardIce.grid.data[x][y];
		if (ice) {
			data[x][y].push('ice'+ice.hp);
		}

		var cage = s.board.boardCage.grid.data[x][y];
		if (cage) {
			data[x][y].push('cn'+cage.hp);
		}

		var candy = s.board.boardCandies.grid.data[x][y];
		if (candy) {

			var expStr = candy.candyType;
			if (candy.wrapped) {
				expStr += ':W';
			}
			if (candy.infected) {
				expStr += ':I';
			}
			data[x][y].push(expStr);
		}

	},this);

	G.lvlData.levelData = tempArray.data;

};
G.EditorWorldSidePanel = function(x,y) {

	Phaser.Group.call(this,game);
	this.x = G.l(x);
	this.y = G.l(y);

	this.levelNr = this.makeText(0,0,'LEVEL: --');
	this.add(this.levelNr);

	this.starsReq = this.makeText(0,50,'--');
	this.add(this.starsReq);

	this.previewBitmap = game.add.bitmapData(400,400);
	this.previewBitmapImg = this.add(this.previewBitmap.addToWorld(0,100));

	this.swapUp = this.makeText(0,500,'SWAP UP');
	this.swapUp.inputEnabled = true;
	this.swapUp.input.useHandCursor = true;
	this.swapUp.events.onInputDown.add(function() {
		if (s.selectedLevel !== null && s.selectedLevel != G.json.levels.length-1) {
			var tmp = G.json.levels[s.selectedLevel];
			G.json.levels[s.selectedLevel] = G.json.levels[s.selectedLevel+1];
			G.json.levels[s.selectedLevel+1] = tmp;
			s.selectLevel(s.selectedLevel+1);
			s.map.refreshButtons();
		}
	},this);
	this.add(this.swapUp);

	this.swapDown = this.makeText(0,550,'SWAP DOWN');
	this.swapDown.inputEnabled = true;
	this.swapDown.input.useHandCursor = true;
	this.swapDown.events.onInputDown.add(function() {
		if (s.selectedLevel !== null && s.selectedLevel != 0) {
			var tmp = G.json.levels[s.selectedLevel];
			G.json.levels[s.selectedLevel] = G.json.levels[s.selectedLevel-1];
			G.json.levels[s.selectedLevel-1] = tmp;
			s.selectLevel(s.selectedLevel-1);
			s.map.refreshButtons();
		}
	},this);
	this.add(this.swapDown);

	this.removeLevel = this.makeText(0,650,'REMOVE LEVEL');
	this.removeLevel.inputEnabled = true;
	this.removeLevel.input.useHandCursor = true;
	this.removeLevel.events.onInputDown.add(function() {
		if (s.selectedLevel === null) return;
		G.json.levels.splice(s.selectedLevel,1);
		s.map.refreshButtons();
		s.selectLevel(null);
	},this);
	this.add(this.removeLevel);

	this.editLevel = this.makeText(0,750,'EDIT LEVEL');
	this.editLevel.inputEnabled = true;
	this.editLevel.input.useHandCursor = true;
	this.editLevel.events.onInputDown.add(function() {
		if (s.selectedLevel === null) return;
		game.state.start("Editor",true,false,s.selectedLevel);
	},this);
	this.add(this.editLevel);


	this.copyLevel = this.makeText(0,800,'COPY LEVEL');
	this.copyLevel.inputEnabled = true;
	this.copyLevel.input.useHandCursor = true;
	this.copyLevel.events.onInputDown.add(function() {
		if (s.selectedLevel === null) return;

		var copy = JSON.parse(JSON.stringify(G.json.levels[s.selectedLevel]));
		copy.mapX += 100;
		G.json.levels.splice(s.selectedLevel+1,0,copy);

		s.fillSaveState3Stars();

		s.map.refreshButtons();
		s.selectLevel(s.selectedLevel+1);

	},this);
	this.add(this.copyLevel);


	this.editLevel = this.makeText(0,900,'PLAY LEVEL');
	this.editLevel.inputEnabled = true;
	this.editLevel.input.useHandCursor = true;
	this.editLevel.events.onInputDown.add(function() {
		if (s.selectedLevel === null) return;
		game.state.start("Game",true,false,s.selectedLevel,true);
	},this);
	this.add(this.editLevel);

	this.exportJSON = this.makeText(0,950,'EXPORT JSON');
	this.exportJSON.inputEnabled = true;
	this.exportJSON.input.useHandCursor = true;
	this.exportJSON.events.onInputDown.add(function() {
		var blob = new Blob([JSON.stringify(G.json.levels)],{type: "text/plain;charset=utf-8"});
    saveAs(blob, "levels.json");
	},this);
	this.add(this.exportJSON);

	



	//LVL LINE FUNCTION

	this.line = this.makeText(0,1050,'LVL LINE:\nZ-clearLine\nX-add node\nC-remove last node\nV-spread\nB-improt from lvls\nN-spread on nodes',25);
	this.lvlLineX = [];
	this.lvlLineY = [];
	

	gfx = game.add.graphics();
	gfx.sidePanel = this;
	gfx.update = function() {

		this.x = s.map.x;
		this.y = s.map.y;

		this.clear();
		this.beginFill(0xff0000,1);
		if (this.sidePanel.lvlLineX.length < 2) return;

		for (var i = 0; i < 10000; i++) {
			this.drawRect(
				game.math.linearInterpolation(this.sidePanel.lvlLineX, i/10000),
				game.math.linearInterpolation(this.sidePanel.lvlLineY, i/10000),
				1,
				1
			);
		}

	}

	this.keys = game.input.keyboard.addKeys({Z: Phaser.Keyboard.Z, X: Phaser.Keyboard.X, C: Phaser.Keyboard.C, V: Phaser.Keyboard.V, B: Phaser.Keyboard.B, N: Phaser.Keyboard.N});

	this.keys.Z.onDown.add(function() {
		this.lvlLineX = [];
		this.lvlLineY = [];
	},this);

	this.keys.X.onDown.add(function() {
		var pointer = game.input.activePointer;
		var xx = Math.floor((pointer.worldX-s.map.x)*(1/G.Loader.currentConfigMulti))
		var yy = Math.floor((pointer.worldY-s.map.y)*(1/G.Loader.currentConfigMulti))

		this.lvlLineX.push(xx);
		this.lvlLineY.push(yy);

	},this);

	this.keys.C.onDown.add(function() {
		this.lvlLineX.pop();
		this.lvlLineY.pop();   
	},this);

	this.keys.V.onDown.add(function() {
		
		var from = parseInt(prompt("FROM: ")); 
		var to = parseInt(prompt("TO: "));
		if (isNaN(from) && isNaN(to)) {
			G.lineUtils.spreadAcrossLine(this.lvlLineX,this.lvlLineY,G.json.levels,'mapX','mapY');
		}else {
			if (isNaN(from) && !isNaN(to)) from = 0;
			if (!isNaN(from) && isNaN(to)) to = G.json.levels.length;

			from--;

			var array = G.json.levels.slice(from,to);
			G.lineUtils.spreadAcrossLine(this.lvlLineX,this.lvlLineY,array,'mapX','mapY');
		}
		s.map.refreshButtons();

	},this);


	this.keys.N.onDown.add(function() {

		console.log("N key");
		
		var from = parseInt(prompt("FROM: "));
		var to = parseInt(prompt("TO: "));
		if (isNaN(from) && isNaN(to)) {
			G.lineUtils.spreadAcrossLine(this.lvlLineX,this.lvlLineY,G.json.levels,'mapX','mapY');
		}else {
			if (isNaN(from) && !isNaN(to)) from = 0;
			if (!isNaN(from) && isNaN(to)) to = G.json.levels.length;

			from--;
			var array = G.json.levels.slice(from,to);

			console.log("from to: " + from + 'x' + to);

			G.lineUtils.spreadOnNodes(this.lvlLineX,this.lvlLineY,array,'mapX','mapY');
		}
		s.map.refreshButtons();

	},this);


	this.keys.B.onDown.add(function() {

		this.lvlLineX = [];
		this.lvlLineY = [];

		G.json.levels.forEach(function(lvl) {
			this.lvlLineX.push(lvl.mapX);
			this.lvlLineY.push(lvl.mapY);
		},this)

	},this);


};

G.EditorWorldSidePanel.prototype = Object.create(Phaser.Group.prototype);

G.EditorWorldSidePanel.prototype.makeText = function(x,y,text,size) {

	var text = game.make.bitmapText(G.l(x),G.l(y),'font-white',text,G.l(size || 50)); 
	this.add(text); 
	return text;

};

G.EditorWorldSidePanel.prototype.refresh = function() {
	
	if (s.selectedLevel === null) {
		this.levelNr.setText('LEVEL: --');
		this.starsReq.setText('--');
		this.previewBitmapImg.alpha = 0; 
	}else {
		this.previewBitmapImg.alpha = 1;
		G.makeLvlPreview(G.json.levels[s.selectedLevel],this.previewBitmap);
		this.levelNr.setText('LEVEL: '+(s.selectedLevel+1));
		this.starsReq.setText(G.json.levels[s.selectedLevel].starsReq.toString());
	}

};
G.BoosterTutorialText = function() {

	Phaser.Group.call(this,game);

	this.x = G.l(480);
	this.y = game.height*0.8;

	this.alpha = 0;

	this.bg = G.makeImage(0,0,'text_shade_bg',0.5,this);
	this.bg.alpha = 0;

	G.sb.onBoosterUse.add(function(nr) {
		if (G.lvl.tutOpen) return;
		this.alpha = 1;

		if (nr == 1) {
			this.makeNewText("CANDY SWIPER CHANGES THE PLACE OF TWO CANDIES");		
		}
		if (nr == 2) {
			this.makeNewText("SWEET APPLE CRUSHES ONE CANDY. TAP ON CANDY YOU WANT TO CRUSH");
		}
		if (nr == 3 || nr == 4) {
			this.makeNewText("THE ROLLING PIN CAN CLEAR WHOLE ROW OR COLUMN");
		}

	},this);


	G.sb.onBoosterUsed.add(function() {
		if (G.lvl.tutOpen) return;
		game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(this.hide,this);
	},this);


};

G.BoosterTutorialText.prototype = Object.create(Phaser.Group.prototype);

G.BoosterTutorialText.prototype.makeNewText = function(txt) {

	this.txt = new G.MultiLineText(0,0,'font-white',G.txt(txt),50,G.l(940),G.l(400),'center',0.5,0.5);
	this.txt.alpha = 0;
	this.add(this.txt);
	game.add.tween(this.txt).to({alpha: 1}, 500, Phaser.Easing.Sinusoidal.Out,true);
	this.bg.width = this.txt.width+G.l(100);
	this.bg.height = this.txt.height+G.l(100);
	game.add.tween(this.bg).to({alpha:0.7},500,Phaser.Easing.Sinusoidal.Out,true);

};


G.BoosterTutorialText.prototype.changeText = function(txt) {

	var currentTxt = this.txt;
	game.add.tween(currentTxt).to({alpha:0},500,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(currentTxt.destroy,currentTxt);
	this.makeNewText(txt);

};

G.BoosterTutorialText.prototype.hide = function() {

	if (!this.txt) return;

	var currentTxt = this.txt; 

	game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		this.bg.alpha = 0;
		currentTxt.destroy();
	},this);

};
G.CollectableAnimLayer = function(board,topBar) {

	Phaser.Group.call(this,game);

	this.board = board;
	this.goalPanel = topBar.goalPanel;

	if (G.IMMEDIATE) return;
		
	G.sb.onCandyToUIAnim.add(function(type,elem,sprite) {

		if (!elem) return;
		var goalPanel = this.goalPanel.getGoalPanel(type);
		if (!goalPanel) return;
		if (!goalPanel.nr.alive) return;
		this.getFreeParticle().init(type,elem,goalPanel,sprite);

	},this);

};

G.CollectableAnimLayer.prototype = Object.create(Phaser.Group.prototype);

G.CollectableAnimLayer.prototype.getFreeParticle = function() {
	return this.getFirstDead() || this.add(new G.CollectableAnimPart(this.board,this.goalPanel));
};


G.CollectableAnimLayer.prototype.initNofly = function(panel) {

		this.getFreeParticle().initNofly(panel);

};
G.CollectableAnimPart = function(board,goalPanel) {

	Phaser.Image.call(this,game);
	this.kill();
	this.anchor.setTo(0.5);
	this.board = board;
	this.goalPanel = goalPanel;

}

G.CollectableAnimPart.prototype = Object.create(Phaser.Image.prototype);

G.CollectableAnimPart.prototype.init = function(type,candy,target,sprite) {

	this.revive();

	var pxOut = this.board.cellToPxOut([candy.cellX,candy.cellY]);
	
	this.x = pxOut[0];
	this.y = pxOut[1];
	this.scale.setTo(1);
	this.alpha = 1;

	G.changeTexture(this, sprite || G.json.settings.goals[type].sprite);

	var target = target;

	var targetX = target.img.worldPosition.x+game.world.bounds.x;
	var targetY = target.img.worldPosition.y;

	game.add.tween(this.scale).to({x:1.2,y:1.2},250,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {

		game.add.tween(this).to({x:targetX,y:targetY,width:target.img.width*target.scale.x,height:target.img.height*target.scale.y},500,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
			this.goalPanel.updateDisplay(target);

			game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
			game.add.tween(this.scale).to({x:2,y:2},300,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
				this.kill();
			},this);
			
		},this);
	},this);
	

};


G.CollectableAnimPart.prototype.initNofly = function(panel){

	this.revive();

	this.x = game.world.bounds.x+panel.img.worldPosition.x;
	this.y = panel.img.worldPosition.y;
	this.alpha = 1;

	G.changeTexture(this,G.json.settings.goals[panel.goalName].sprite);
	this.width = panel.img.width*panel.scale.x;
	this.height = panel.img.height*panel.scale.y;


	game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this.scale).to({x:1.5,y:1.5},300,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		this.kill();
	},this);

};
G.FadeLayer = function() {
	
	Phaser.Image.call(this, game,0,0);
	game.camera.flash(0xffffff,600,true);

	G.sb.onStateChange.add(this.setupChange,this);
	this.game.add.existing(this);

}

G.FadeLayer.prototype = Object.create(Phaser.Image.prototype);
G.FadeLayer.constructor = G.FadeLayer;


G.FadeLayer.prototype.setupChange = function(changeLevel, arg1, arg2, arg3) {
	
	G.sfx.transition.play();

	if (game.camera.onFadeComplete.getNumListeners() > 0) return;

	game.camera.onFadeComplete.addOnce(function() {
		game.state.start(changeLevel,true,false,arg1,arg2,arg3);
	})

	game.camera.fade(0xffffff,300,true);

};
G.FxParticle = function(board,fxGroup) {
	
	Phaser.Image.call(this,game);
	this.board = board;
	this.fxGroup = fxGroup;
	this.anchor.setTo(0.5);
	this.kill();

	this.id = Math.random();

	this.animationData = {
		currentIndex: 0,
		currentTimer: 0,
		timer: 3,
		loop: 0,
		maxFrame: 0,
		gfxName: ''
	}

};

G.FxParticle.prototype = Object.create(Phaser.Image.prototype);

G.FxParticle.prototype.getOther = function() {
	return this.parent.getFreeParticle();
};

G.FxParticle.prototype.update = function() {
	if (!this.alive) return;

	this.updateFunc();

};

G.FxParticle.prototype.updateAnimation = function() {

	this.animationData.currentTimer+=G.deltaTime;

	if (this.animationData.currentTimer >= this.animationData.timer) {
		this.animationData.currentIndex++;
		this.animationData.currentTimer -= this.animationData.timer;

		if (this.animationData.currentIndex > this.animationData.maxFrame) {
			if (this.animationData.loop == 0) {
				return this.kill();
			}else {
				this.animationData.loop--;
				this.animationData.currentIndex = 0;
			}
		}

		G.changeTexture(this,this.animationData.gfxName+this.animationData.currentIndex);


	}

};

G.FxParticle.prototype.initAnimation = function(gfxName,maxFrame,timer,loop,startingIndex) {

	this.animationData.currentIndex = startingIndex || 0;
	this.animationData.currentTimer = 0;
	this.animationData.timer = timer;
	this.animationData.gfxName = gfxName;
	this.animationData.maxFrame = maxFrame;
	this.animationData.loop = loop || 0;
	G.changeTexture(this,gfxName+this.animationData.currentIndex);
	this.updateFunc = this.updateAnimation;

};

G.FxParticle.prototype.emptyFunc = function() {};

G.FxParticle.prototype.init = function(x,y) {
	this.x = x;
	this.y = y;
	this.blendMode = 0;
	this.alpha = 1;
	this.angle = 0;
	this.scale.setTo(1);
	this.updateFunc = this.emptyFunc;
	this.anchor.setTo(0.5);
	this.revive();
};

G.FxParticle.prototype.explosion = function(x,y,args) {

	this.init(x,y);
	this.initAnimation('cookie_match_',10,2,0,1);

};

G.FxParticle.prototype.spiral = function(x,y,args) {

	this.init(x,y);
	this.initAnimation('candy_spiral_explode_',13,2);
  
};

G.FxParticle.prototype.dummyFadeOut = function(x,y,args) {

	this.init(x,y);
	G.changeTexture(this,args);
	game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.In,true).onComplete.add(this.kill,this);

};

G.FxParticle.prototype.dummyFadeOutScaleIn = function(x,y,args) {

	this.init(x,y);
	G.changeTexture(this,args);
	game.add.tween(this.scale).to({x:0,y:0},300,Phaser.Easing.Sinusoidal.In,true).onComplete.add(this.kill,this);

};

G.FxParticle.prototype.dummyComboGrowAndFade = function(x,y,args) {


	this.fxGroup.aboveThirdFloorLayer.add(this);
	this.init(x,y);
	G.changeTexture(this,args[0]);
	this.angle = args[1];
	this.alpha = 0.8;

	var scaleTween = game.add.tween(this.scale).to({x:2.5,y:2.5},200,Phaser.Easing.Sinusoidal.In,true);
	game.add.tween(this).to({alpha:0},100,Phaser.Easing.Sinusoidal.In,true,100).onComplete.add(function() {
		scaleTween.stop();
		this.fxGroup.add(this);
		this.kill();
	},this);

};

G.FxParticle.prototype.electricCircle = function(x,y) {

	
	this.init(x,y);
	this.blendMode = 1;
	G.loadTexture(this,'circle');
	game.add.tween(this).to({alpha:0},200,Phaser.Easing.Sinusoidal.Out,true,300).onComplete.add(this.kill,this);
	this.updateFunc = this.electricCircleUpdate;

	this.other = this.getOther();
	this.other.blendMode = 1;
	G.loadTexture(this.other,'circle');
	this.other.updateFunc = this.other.electricCircleUpdate;
	game.add.tween(this.other).to({alpha:0},200,Phaser.Easing.Sinusoidal.Out,true,300).onComplete.add(this.other.kill,this.other);


};

G.FxParticle.prototype.electricCircleUpdate = function() {

	this.scale.setTo(1+Math.random()*0.5);

};



G.FxParticle.prototype.smallCircle = function(x,y) {

	this.init(x,y);
	this.blendMode = 1;
	G.loadTexture(this,'circle');
	this.scale.setTo(0);
	this.alpha = 0.5;
	game.add.tween(this.scale).to({x:0.5,y:0.5},150,Phaser.Easing.Cubic.Out,true);
	game.add.tween(this).to({alpha: 0},150,Phaser.Easing.Cubic.Out,true,200).onComplete.add(this.kill,this);
};

G.FxParticle.prototype.lightCircle = function(x,y) {

	this.init(x,y);
	this.blendMode = 1;
	G.loadTexture(this,'circle');
	this.scale.setTo(0);
	game.add.tween(this.scale).to({x:1.5,y:1.5},500,Phaser.Easing.Cubic.Out,true);
	game.add.tween(this).to({alpha: 0},300,Phaser.Easing.Cubic.Out,true,200).onComplete.add(this.kill,this);
};


G.FxParticle.prototype.lightCircleFast = function(x,y) {

	this.init(x,y);
	this.blendMode = 1;
	G.loadTexture(this,'circle');
	this.scale.setTo(0);
	game.add.tween(this.scale).to({x:1.5,y:1.5},300,Phaser.Easing.Cubic.Out,true);
	game.add.tween(this).to({alpha: 0},200,Phaser.Easing.Cubic.Out,true,100).onComplete.add(this.kill,this);
};


G.FxParticle.prototype.changeCircle = function(x,y) {

	this.init(x,y);
	this.blendMode = 1;
	G.loadTexture(this,'circle');
	this.scale.setTo(0.6);
	game.add.tween(this.scale).to({x:1.5,y:1.5},600,Phaser.Easing.Cubic.Out,true);
	game.add.tween(this).to({alpha: 0},600,Phaser.Easing.Cubic.Out,true).onComplete.add(this.kill,this);
};


/*
G.FxParticle.prototype.strokeHead = function(x,y,angle,speed) {

	this.init(x,y);
	G.loadTexture(this,'stroke_head2'); 

	//this.blendMode = 1;

	game.add.tween(this.scale).to({x:2,y:2},200,Phaser.Easing.Cubic.In,true);

	this.angle = angle+180;
	this.dirX = G.lengthDirX(angle,G.lnf(speed*0.85),false);
	this.dirY = G.lengthDirY(angle,G.lnf(speed*0.85),false);
	this.speed = speed*0.85;

	this.updateFunc = this.strokeHeadUpdate;

	//tail
	this.tail = this.getOther();
	//this.tail.blendMode =1;
	G.loadTexture(this.tail,'stroke_line');
	this.tail.init(x,y);
	this.tail.anchor.setTo(0,0.5);
	this.tail.scale.setTo(2,1);
	this.tail.angle = this.angle;


};

G.FxParticle.prototype.strokeHeadUpdate = function() {

	this.x += this.dirX*G.deltaTime;
	this.y += this.dirY*G.deltaTime;
	this.dirX *= 0.99;
	this.dirY *= 0.99;
	this.tail.x = this.x;
	this.tail.y = this.y;
	this.tail.width += this.speed;
	this.tail.alpha -= 0.03;
	
	if (this.x < 0 || this.x > this.board.width || this.y < 0 || this.y > this.board.height) {
		this.tail.alpha -= 0.1;
	}
	this.tail.alpha = Math.max(0,this.tail.alpha);

	this.alpha = this.tail.alpha;

	if (this.alpha == 0) {
		this.tail.kill();
		this.kill();
	}

};


G.FxParticle.prototype.strokeH = function(x,y,args) {
	this.strokeHead(x,y,0,25);
	this.getOther().strokeHead(x,y,180,30);
};

G.FxParticle.prototype.strokeV = function(x,y,args) {
	this.strokeHead(x,y,-90,25);
	this.getOther().strokeHead(x,y,90,30);
};



G.FxParticle.prototype.strokeDR = function(x,y,args) {
	this.strokeHead(x,y,135,25);
	this.getOther().strokeHead(x,y,-45,30);
};

G.FxParticle.prototype.strokeDF = function(x,y,args) {
	this.strokeHead(x,y,225,25);
	this.getOther().strokeHead(x,y,45,30);
};
*/


G.FxParticle.prototype.initStroke = function(x,y,candy,angle){

	this.init(x,y);

	var parsetType = parseInt(candy.candyType);
	var sprite = 'line_effect_'+game.rnd.between(1,6);

	if (parsetType >= 1 && parsetType <= 6) {
		sprite = 'line_effect_'+parsetType;
	}

	G.changeTexture(this,sprite);
	this.angle = angle || 0;
	game.add.tween(this.scale).to({y:15},500,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this).to({alpha:0},100,Phaser.Easing.Cubic.In,true,400).onComplete.add(function(){
		this.kill();
	},this);
};


G.FxParticle.prototype.strokeH = function(x,y,args,candy) {
	this.initStroke(x,y,candy,90);
};

G.FxParticle.prototype.strokeV = function(x,y,args,candy){
	this.initStroke(x,y,candy,0);
};

G.FxParticle.prototype.strokeDR = function(x,y,args,candy) {
	this.initStroke(x,y,candy,-45);
};

G.FxParticle.prototype.strokeDF = function(x,y,args,candy) {
	this.initStroke(x,y,candy,45);
};




G.FxParticle.prototype.lightning = function(x,y,args) {

	this.init(x,y);

	G.changeTexture(this,'lightning');
	this.anchor.setTo(0.5,0);

	//this.blendMode = 1;

	var x2 = this.board.cellXToPxIn(args[0]);
	var y2 = this.board.cellYToPxIn(args[1]);

	
	

	this.height = game.math.distance(x,y,x2,y2);
	this.rotation = game.math.angleBetween(x,y,x2,y2);
	this.angle -= 90;
	this.timer = 0;

	this.updateFunc = this.lightningUpdate;

	game.add.tween(this).to({alpha:0},500,Phaser.Easing.Cubic.In,true).onComplete.add(function() {
		this.kill();
	},this);
	
};

G.FxParticle.prototype.lightningUpdate = function() {
	this.timer += 1 *G.deltaTime;
	if (this.timer > 2) {
		this.scale.x *= -1;
		this.timer = 0;
	}

};


G.FxParticle.prototype.chocolatePart = function(x,y) {

	this.init(x,y);
	this.x += G.l((Math.random()*40)-20);
	this.y += G.l((Math.random()*40)-20)
	G.changeTexture(this,'chocolatePiece');
	this.scale.setTo(0.8);
	this.angle = Math.random()*360;
	this.velX = Math.random()*G.lnf(-12) + G.lnf(6);
	this.velY = Math.random()*G.lnf(-6)-G.lnf(4);
	this.gravity = G.lnf(0.6);
	this.updateFunc = this.fallingPartUpdate;

};

G.FxParticle.prototype.chocolatePartW = function(x,y) {

	this.init(x,y);
	this.x += G.l((Math.random()*40)-20);
	this.y += G.l((Math.random()*40)-20)
	G.changeTexture(this,'chocolatePieceW');
	this.scale.setTo(0.8);
	this.angle = Math.random()*360;
	this.velX = Math.random()*G.lnf(-12) + G.lnf(6);
	this.velY = Math.random()*G.lnf(-6)-G.lnf(4);
	this.gravity = G.lnf(0.6);
	this.updateFunc = this.fallingPartUpdate;

};


G.FxParticle.prototype.burstConcrete = function(x,y,offsetX,offsetY,gfx) {

	this.init(x+G.l(offsetX),y+G.l(offsetY));

	G.changeTexture(this,gfx);

	this.burstConcreteVelX = Math.sign(offsetX)*(G.lnf(2+Math.random()*3));
	this.burstConcreteVelY = G.lnf(-3+(Math.random()*-3));
	this.burstConcreteGrav = G.lnf(0.6);
	this.updateFunc = this.burstConcreteUpdate;

};

G.FxParticle.prototype.burstConcreteUpdate = function() {

	this.x += this.burstConcreteVelX;
	this.y += this.burstConcreteVelY;

	this.angle += this.burstConcreteVelX*2;

	this.burstConcreteVelX *= 0.98;
	this.burstConcreteVelY += this.burstConcreteGrav;

	this.alpha -= 0.03;
	this.scale.setTo(this.scale.x+0.01);
	if (this.alpha <= 0) {
		this.kill();
	}

};


G.FxParticle.prototype.burstLookup = {
 1: 17,
 2: 15,
 3: 16,
 4: 16,
 5: 16,
 6: 17
}


G.FxParticle.prototype.burstCandy = function(x,y,candy) {
	//return; 
	this.init(x,y);

	this.alpha = 1;
	this.scale.setTo(1.5);

	this.initAnimation('cookie_match_',10,2,0,1);


};


G.FxParticle.prototype.burstIce = function(x,y,candy) {
	//return; 
	this.init(x,y);

	this.alpha = 1;
	this.scale.setTo(1);	

	//(gfxName,maxFrame,timer,loop,startingIndex)

	this.initAnimation('ice_part_',13,2,0,1);


};

G.FxParticle.prototype.burstConcreteAnim = function(x,y,candy) {
	//return; 
	this.init(x,y);

	this.alpha = 1;
	this.scale.setTo(1);	

	//(gfxName,maxFrame,timer,loop,startingIndex)

	this.initAnimation('concrete_part_',17,2,0,0);


};

G.FxParticle.prototype.burstDirtAnim = function(x,y,candy) {
	//return; 
	this.init(x,y);

	this.alpha = 1;
	this.scale.setTo(1);	

	//(gfxName,maxFrame,timer,loop,startingIndex)

	this.initAnimation('dirt_part_',16,2,0,0); 


};

G.FxParticle.prototype.burstInfectionAnim = function(x,y,candy) {
	//return; 
	this.init(x,y);

	this.alpha = 1;
	this.scale.setTo(1);	

	//(gfxName,maxFrame,timer,loop,startingIndex)

	this.initAnimation('infection_part_',18,2,0,0);


};

G.FxParticle.prototype.burstChainAnim = function(x,y,candy) {
	//return; 
	this.init(x,y);

	this.alpha = 1;
	this.scale.setTo(1);	

	//(gfxName,maxFrame,timer,loop,startingIndex)

	this.initAnimation('unwrap_part_',14,2,0,0);


};

G.FxParticle.prototype.glowLookup = {
 1: 8,
 2: 12,
 3: 5,
 4: 6,
 5: 11,
 6: 8
}


G.FxParticle.prototype.whiteStarPart = function(x,y) {

	this.init(x,y);
	G.changeTexture(this,'starPart');
	this.blendMode = 1;

	this.angle = Math.random()*360;
	this.velX = Math.random(20)*G.lnf(-20)+G.lnf(10);
	this.velY = Math.random()*G.lnf(-9)-G.lnf(3);
	this.gravity = G.lnf(0.5);
	this.updateFunc = this.fallingPartUpdate;

};



G.FxParticle.prototype.fallingPartUpdate = function() {

	this.x += this.velX*G.deltaTime;
	this.y += this.velY*G.deltaTime;
	this.angle += this.velX * 0.1;
	this.velX *= 0.99;
	this.velY += this.gravity*G.deltaTime;
	this.alpha -= 0.02;

	if (this.alpha <= 0) this.kill();

};

G.FxParticle.prototype.whiteStarPartFast = function(x,y) {

	this.init(x,y);
	G.changeTexture(this,'starPart');
	this.blendMode = 1;

	this.angle = Math.random()*360;
	this.velX = Math.random(20)*G.lnf(-20)+G.lnf(10);
	this.velY = Math.random()*G.lnf(-9)-G.lnf(3);
	this.gravity = G.lnf(0.25);
	this.updateFunc = this.fallingPartUpdate;

};

G.AnotherTabWindow = function(){

	Phaser.Group.call(this,game);

	this.bg = G.makeImage(0,0,'popup_background_2',0.5,this);

	this.failed = G.makeImage(0,-25,'failed_dimond',[0.5,1],this);

	this.txt = new G.MultiLineText(0,0,'font-blue',G.txt(103),50,500,190,'center',0.5,0);
	this.add(this.txt);

	this.btn = new G.Button(0,240,'btn_orange',function(){
		location.reload();
	});
	this.btn.scale.x = 1.5;
	this.add(this.btn);

	this.reload = new G.OneLineText(-5,240,'font-white',G.txt(104),50,220,0.5,0.5);
	this.add(this.reload);
	


};

G.AnotherTabWindow.prototype = Object.create(Phaser.Group.prototype);

G.AnotherTabWindow.prototype.update = function(){

	this.x = game.world.bounds.x+game.width*0.5;
	this.y = game.height*0.5;

};
G.ChestLayer = function() {
	
	Phaser.Group.call(this,game);	
	this.deadElems = [];

	this.state = game.state.getCurrentState();
	this.board = this.state.board;

	this.deadArray = [];

	G.sb.onChestOpen.add(function(elem) {
		var pxOut = this.board.cellToPxOut([elem.cellX,elem.cellY]);
		this.getFreeParticle().init(pxOut[0],pxOut[1]);

		this.sort('orgY',Phaser.Group.SORT_ASCENDING);
	},this)


};

G.ChestLayer.prototype = Object.create(Phaser.Group.prototype);

G.ChestLayer.prototype.onElemKilled = function(elem) {
	if (this !== elem.parent) return;
	this.deadArray.push(elem);
	this.removeChild(elem)

};

G.ChestLayer.prototype.getFreeParticle = function() {

	if (this.deadArray.length > 0) {
		part = this.deadArray.pop();
	}else {
		part = new G.Chest(this.board,this); 
		part.events.onKilled.add(this.onElemKilled,this);
	}

	this.add(part);
	return part;

};

G.Chest = function() {

	Phaser.Image.call(this,game,0,0);
	G.changeTexture(this,'chest_bottom');
	this.anchor.setTo(0.5);

	this.state = game.state.getCurrentState();

	this.cover = G.makeImage(-33,0,null,[0,1],this);
	this.light = G.makeImage(0,-20,'popup_lighht',0.5,this);
	this.light.scale.setTo(0.5);
	this.light.cacheAsBitmap = true;
	this.light.blendMode = 1;
	this.addChild(this.light);

	this.gift = G.makeImage(0,-10,null,0.5,this);

	this.animTimer = 0;
	this.animEvery = 3;
	this.animIndex = 0;

	this.coverCoords = [
		[G.l(-33),0],
		[G.l(-33),G.l(-8)],
		[G.l(-33),G.l(-8)],
		[G.l(-35),G.l(-8)]
	];

	this.kill();
};

G.Chest.prototype = Object.create(Phaser.Image.prototype);

G.Chest.prototype.init = function(x,y) {

	G.stopTweens(this);
	G.changeTexture(this.cover,'chest_top_00');
	this.cover.y = 0;

	this.orgX = x;
	this.orgY = y;

	//this.giftNr = game.math.between(0,2);

	this.alpha = 1;
	this.scale.setTo(1);
	this.animTimer = 0;
	this.animIndex = 0;
	this.x = x;
	this.y = y+G.l(5);
	this.light.alpha = 0;

	game.add.tween(this).to({y: y-G.l(30)},1500,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this.scale).to({x:1.2,y:1.2},400,Phaser.Easing.Sinusoidal.Out,true);

	G.stopTweens(this.gift);

	this.giftData = G.gift.getGift('ingamechests'); 
	
	G.changeTexture(this.gift, G.gift.getIcon(this.giftData));

	//special case so icon is different based on money amount
		if (this.giftData[0] == 'coin'){
			if (this.giftData[1] == 1){	
				G.changeTexture(this.gift,'coin_package_icon_0');
			}else if (this.giftData[1] == 2){
				G.changeTexture(this.gift,'coin_package_icon_1');
			}else if (this.giftData[1] == 3){
				G.changeTexture(this.gift,'coin_package_icon_2');
			}else{
				G.changeTexture(this.gift,'coin_package_icon_4');
			}
		}
	//

	this.gift.scale.setTo(0);
	this.gift.angle = -10;
	this.gift.y = G.l(-10);

	this.update = this.updatePreOpen;

	this.revive(); 

	G.sfx.chest_open_louder.play();

};


G.Chest.prototype.updatePreOpen = function() {

	if (!this.alive) return;

	if (this.animIndex < 3 && this.animTimer++ % this.animEvery == 0) {
		this.animIndex++;
		this.cover.x = this.coverCoords[this.animIndex][0];
		this.cover.y = this.coverCoords[this.animIndex][1];
		G.changeTexture(this.cover, 'chest_top_0'+this.animIndex);
		if (this.animIndex == 3) {
			var scaleTo = 1;
			game.add.tween(this.gift.scale).to({x:scaleTo,y:scaleTo},600,Phaser.Easing.Bounce.Out,true);
			var moveTween = game.add.tween(this.gift).to({y:G.l(-40)},400,Phaser.Easing.Sinusoidal.InOut).to({y:G.l(-30)},1100,Phaser.Easing.Sinusoidal.Out);
			moveTween.start();
			game.add.tween(this.gift).to({angle: 10},1500,Phaser.Easing.Sinusoidal.InOut,true);

			game.time.events.add(1000,function() {

				G.gift.applyGift(this.giftData);

				/*if (this.giftData[0] == 'coin') {
					G.sb.onLevelMoneyGain.dispatch(this.giftData[1]);
					G.lvl.moneyGainedChest += this.giftData[1];
				}

				//G.gift.applyGift(this.giftData);

				/*if (!G.lvl.items[this.giftNr]) G.lvl.items[this.giftNr] = 0;
				G.lvl.items[this.giftNr]++;*/

				game.add.tween(this).to({alpha: 0},500,Phaser.Easing.Sinusoidal.In,true).onComplete.add(function() {
					this.kill();
				},this)
			},this)

		}
	}

	this.light.angle++; 
	this.light.alpha = game.math.clamp(this.light.alpha+0.03,0,0.5);
 
};


G.DotBg = function(lvl_gfx) {

	this.texture = game.add.renderTexture(game.width,game.height);

	this.marker = G.makeImage(0,0,'background_star_tile',0,null);
	this.marker.alpha = 0.4;

	this.img = game.add.image(0,0,this.texture);

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

};

G.DotBg.prototype = Object.create(Phaser.Image.prototype);

G.DotBg.prototype.onScreenResize = function() {

	this.texture.resize(game.width,game.height);
	this.texture.clear();

	this.img.x = game.world.bounds.x;

	for (var xx = 0; xx < game.width; xx += this.marker.width) {
		for (var yy = 0; yy < game.height; yy += this.marker.height) {

			this.texture.renderXY(this.marker,xx,yy); 


		}
	}

};
G.FxMapLayer = function(){
	G.PoolGroup.call(this,G.FxMapPart);
	this.fixedToCamera = true;

	G.sb.fxMap.add(this.init,this);
};

G.FxMapLayer.prototype = Object.create(G.PoolGroup.prototype);


G.FxMapPart = function() {
	
	G.Image.call(this);
	this.state = game.state.getCurrentState();

};

G.FxMapPart.prototype = Object.create(G.Image.prototype);

G.FxMapPart.prototype.emptyUpdate = function(){};

G.FxMapPart.prototype.reset = function(obj){

	this.x = obj.position ? obj.position.x : obj.x;
	this.y = obj.position ? obj.position.y : obj.y;

	this.anchor.setTo(0.5);
	this.scale.setTo(1);
	this.alpha = 1;
	this.angle = 0;
	this.blendMode = 0;
	this.changeTexture(null);
	this.visible = true;
	this.update = this.emptyUpdate;
	this.revive();

};

G.FxMapPart.prototype.init = function(effect,obj){

	this.reset(obj);

	if (this[effect]) {
		this[effect].apply(this,arguments);
	}else {
		console.warn('There is no ' + effect + ' in G.FxPart');
	}
	
};

G.FxMapPart.prototype.star = function(fx,obj) {

	this.changeTexture('starPart');

	this.blendMode = 1;

	this.alpha = obj.alpha || 1;

	this.grav =  typeof obj.grav === 'undefined' ? 0 : obj.grav;
	this.timer = obj.timer || game.rnd.between(20,40);
	this.blendMode = 0;
	this.scale.setTo(obj.scale || 0.7);
	this.velX =  obj.velX || game.rnd.realInRange(-10,10);
	this.velY = obj.velY || game.rnd.realInRange(-20,-8);
	this.velAngle = game.rnd.realInRange(-5,5);
	this.angle = game.rnd.realInRange(0,360);

	this.update = this.starUpdate;

};

G.FxMapPart.prototype.starUpdate = function(){

	this.x += this.velX;
	this.y += this.velY;

	this.velX *= 0.95;
	this.velY *= 0.95;

	this.angle += this.velAngle;

	if (this.timer-- < 0) {
		this.alpha -= 0.05;
		if (this.alpha <= 0) {
			this.kill();
		}
	}

};
G.GAWrapper = function() {

	return;
		
	this.instance = GA.getInstance();

	var sessionStart = Date.now();

	window.addEventListener("beforeunload", function(e){

		var sessionDuration = (Date.now() - sessionStart) / 1000;

		try {

			var basic = GA.Utils.getDefaultAnnotations(G.ga.instance.user,G.ga.instance.sessionId,G.ga.instance.build,0)

			localStorage.setItem('CC2VKendOfSession',JSON.stringify({
				annotationsObj: basic,
				sessionDuration: sessionDuration
			}));

		}catch(e){

		}

		var event = new GA.Events.SessionEnd(
		    sessionDuration
		);
		GA.getInstance().addEvent(event);
		GA.getInstance().sendData();
	}, false);


	
	this.checkLastSessionEnd();


    G.businessEventCounter = 0;

	this.catMap = {
		Start: 'Progression', 
		Fail: 'Progression',
		Complete: 'Progression',
		Source: 'Resource',
		Sink: 'Resource',
		SpecialPacks: 'Business',
		MovePack: 'Business',
		CoinPacks: 'Business',
		Recurring: 'Design',
		FTUE: 'Design',
		DailyReward: 'Business'

		};



};

G.GAWrapper.prototype.event = function() {

	return;

	if (typeof arguments[0] !== 'string') return;

	var splited = arguments[0].split(':');
	
	var cat  = this.catMap[splited[0]];

	if (!cat) return;

	console.log(arguments[0]);

	try{

	    if (arguments[0].indexOf('Sink') !== -1) {
	    	if (arguments[1] > 0) arguments[1]*=-1;
	    }


		var event = new GA.Events[cat](arguments[0],arguments[1],arguments[2],arguments[3]);

		if (cat === 'Business'){
			G.businessEventCounter++;
			if (!G.saveState.data.payingUser){
				G.saveState.data.payingUser = true;
				G.saveState.save();
			}
		}

		this.instance.addEvent(event);

	}catch(e){
		console.log('ga failed');
	}

};


G.GAWrapper.prototype.checkLastSessionEnd = function(){

	return;

	//check if there is session end in localStorage
	try {
		var data = localStorage.getItem('CC2VKendOfSession')
		if (data !== null) {

			console.log('SENDING LAST SESSION END');

			localStorage.removeItem('CC2VKendOfSession');
			var dataObj = JSON.parse(data);
			var annotationsObj = dataObj.annotationsObj;
			var sessionDuration = dataObj.sessionDuration;

			annotationsObj.category = 'session_end';
			annotationsObj.length = sessionDuration;

			G.ga.instance.sendEvent(JSON.stringify([annotationsObj]),'events',function(){});
		}

	}catch(e){

	}

};

G.GAWrapper.prototype.processLevelIndex = function(lvlIndex){

	return;

	var lvlNr = (lvlIndex+1).toString();

	if (lvlNr.length >= 3) return lvlNr;
	if (lvlNr.length == 2) return '0'+lvlNr;
	if (lvlNr.length == 1) return '00'+lvlNr;

};



//static
G.GAWrapper.init = function(){

	return;

	gi = GA.getInstance();

	var item = window.localStorage.getItem('gmdatastring');
    if (item) {
        var data = JSON.parse(item);
        /*if (data.custom_1){
        	gi.setCustomDimension(1,data.custom_1);
        }*/

        //pre test dimension
        //if (data.custom_2){
        	//gi.setCustomDimension(2,data.custom_2);
        //}
        /*if (data.custom_3){
        	gi.setCustomDimension(3,data.custom_3);
        }*/
    }else {
        //new player
       // gi.setCustomDimension(2,'preTest');
    }

    var event = new GA.Events.User();
	GA.getInstance().addEvent(event);


};
G.GiftBox = function(x,y,clickable,gift) {
	
	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.giftData = gift || G.gift.getGift('normals');

	this.giftData = G.gift.processRandomBoosters(this.giftData);

	this.x = x;
	this.y = y;

	this.light = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.light.update = function() {
		this.angle++;
	};
	this.light.alpha = 0;
	this.light.blendMode = 1;

	this.inside =  new G.LabelGroup(
			G.gift.getLabelString(this.giftData),
			0,0,'font-blue',100,0.5,0.5,180);
		this.add(this.inside);
	this.inside.alpha = 0;

	this.gift = G.makeImage(0,0,'gift',0.5,this);

	if (clickable) {
		this.gift.inputEnabled = true;
		this.gift.events.onInputDown.add(function() {
			this.gift.inputEnabled = false;
			this.unpack();
		},this);
		this.hand = G.makeImage(30,40,'tut_hand',0,this);
		this.hand.scale.setTo(0.6);
		game.add.tween(this.hand).to({x:G.l(50),y:G.l(60)},600,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	}


};

G.GiftBox.prototype = Object.create(Phaser.Group.prototype);

G.GiftBox.prototype.unpack = function(dontApply) {

	if (this.giftData[0] == 'coin' && game.state.current == 'World'){

		this.state.uiTargetParticles.createCoinBatch(
			game.world.bounds.x+this.worldPosition.x,
			this.worldPosition.y,
			this.state.panel.coinsTxt,
			this.giftData[1])

		var batch = this.state.uiTargetParticles.createDividedBatch(
						this.worldPosition.y,
			'coin_1',
			this.state.panel.coinsTxt, 
			this.giftData[1],
			5);

	}else{
		G.gift.applyGift(this.giftData);
	}
	
	G.sfx.xylophone_positive_12.play();
	game.add.tween(this.gift).to({alpha:0, width:this.gift.width*1.2, height: this.gift.height*1.2},500,Phaser.Easing.Sinusoidal.InOut,true);
	game.add.tween(this.light).to({alpha:0.5},500,Phaser.Easing.Sinusoidal.InOut,true);
	game.add.tween(this.inside).to({alpha:1},500,Phaser.Easing.Sinusoidal.InOut,true);
	if (this.hand) game.add.tween(this.hand).to({alpha:0},200,Phaser.Easing.Sinusoidal.InOut,true);


};


G.GiftStatus = function(gift,user){

	Phaser.Group.call(this,game);

	if (typeof G.giftStatusIndex === 'undefined') {
		G.giftStatusIndex = 0;
	};

	this.index = G.giftStatusIndex;

	G.giftStatusIndex++;

	this.bg = G.makeImage(0,0,'text_shade_bg',0,this);
	this.bg.height = 60;
	this.bg.alpha = 0.25;

	var name = user.username.split(' ')[0];
	var mark = gift.giftName === 'life' ? '  @*1.5*heart@' : '  @*1.5*gate@';

	var txt = G.txt(89).replace('%NAME%',name).replace('%ICON%',mark);


	//new G.LabelGroup(txt,0,30,'font-white',30,0,0.5,300);

	//(x,y,font,text,size,width,hAnchor,vAnchor)
	//this.info = new G.OneLineText(0,30,'font-white',user.username.split(' ')[0],30,200,0,0.5);
	this.info = new G.LabelGroup(txt,20,30,'font-white',30,0,0.5,300);
	this.add(this.info);

	//this.info.x = this.mark.x + this.mark.width + G.l(10);

	this.bg.width = this.info.width+G.l(40);

	game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true,3000).onComplete.add(function() {
		G.giftStatusIndex--;
		this.destroy();
	},this);

	this.update();

};

G.GiftStatus.prototype = Object.create(Phaser.Group.prototype);

G.GiftStatus.prototype.update = function() {

	this.x = game.world.bounds.x+G.l(20);
	this.y = game.world.bounds.y+G.l(20)+(this.index*70);
};
G.GlobalGoalButton = function(x,y) {
	
	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);

	this.state = game.state.getCurrentState();

	this.glow = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glow.blendMode = 1;
	this.glow.scale.setTo(0.65);
	this.glow.alpha = 0;


	this.importantStuff = G.globalGoalMgr.isAnyToUserAttention()

	this.goalBtn = new G.Button(0,0,'btn_task_info',function() {
		new G.Window('globalGoals');
	});
	this.add(this.goalBtn);

	this.amount = G.makeImage(20,15,'booster_ammount',0.5,this);
	this.amount.scale.setTo(0.75);
	this.amountTxt = this.amount.addChild(game.add.bitmapText(0,0,'font-blue',this.importantStuff.toString(),G.l(30)));
	this.amountTxt.anchor.setTo(0.5);

	this.reasons = [];

	if (G.globalGoalMgr.isAnyToUserAttention()) {
		this.reasons = G.globalGoalMgr.getAttentionReason();
	}

	G.sb.onGlobalGoalOutOfTime.add(function(goal) {
		this.reasons.push(goal.status);
	},this);

	this.duringMessage = false;
	this.txtLookUp = {
		'inactive' : 52,
		'achieved' : 51,
		'failed' : 50
	}

	this.initDelay = 30;

};

G.GlobalGoalButton.prototype = Object.create(Phaser.Group.prototype);

G.GlobalGoalButton.prototype.update = function() {
	
	var prevImportantStuff = this.importantStuff;

	this.importantStuff = G.globalGoalMgr.isAnyToUserAttention();

	if (prevImportantStuff !== this.importantStuff) {
		this.amountTxt.setText(this.importantStuff.toString());
	}

	this.amount.alpha = this.importantStuff == 0 ? 0 : 1;

	this.glow.angle++;
	if (this.importantStuff > 0) {
		this.glow.alpha = Math.min(this.glow.alpha+0.05,0.4); 
	}else {
		this.glow.alpha = Math.max(this.glow.alpha-0.05,0);
	};


	this.updateMsg();

};


G.GlobalGoalButton.prototype.updateMsg = function() {

	if (this.state.windowLayer.children.length > 0) return;

	var txtLookUp = {}

	if (this.initDelay-- < 0 && this.reasons[0] && !this.duringMessage) {

		var txt = this.txtLookUp[this.reasons[0]];
		this.reasons.splice(0,1);

		var msg = new G.OneLineText(60,0,'font-white',G.txt(txt),45,300,0,0.5);
		msg.popUpAnimation();
		this.add(msg);
		this.duringMessage = true;

		game.add.tween(msg).to({alpha: 0},500,Phaser.Easing.Sinusoidal.In,true,2000).onComplete.add(function(){
			this.duringMessage = false;
			msg.destroy();
		},this);

	}

};

G.GlobalGoalMgr = function() {
	
	this.globalGoalsTemplates = G.json.settings.globalGoals;

	this.loadGoals();

	this.lastSave = 15;
	
	setInterval(function() {
		G.sb.onWallClockTimeUpdate.dispatch(Date.now());
	},1000);

	G.sb.onGlobalGoalOutOfTime.addPermanent(this.saveGoals,this);

	G.sb.onWallClockTimeUpdate.addPermanent(this.updateTimers,this);

	/*G.sb.onWallClockTimeUpdate.addPermament(function() {
		if (this.lastSave-- <= 0) {
			this.saveGoals();
			this.lastSave = 15;
		}
	},this)*/
};


G.GlobalGoalMgr.prototype.saveGoals = function() {

	var parsedGoals = [];

	this.goals.forEach(function(goal) {
		parsedGoals.push(goal.stringify());
	})

	G.saveState.data.globalGoals = parsedGoals;
	G.saveState.save();

};

G.GlobalGoalMgr.prototype.loadGoals = function() {


	this.goals = [];

	G.saveState.data.globalGoals.forEach(function(goalStr) {
		this.goals.push(this.parseGoal(goalStr));
	},this);

	while(this.goals.length < 4) {
		this.createNewGoal();
	}

};

G.GlobalGoalMgr.prototype.updateTimers = function(d) {

	for (var i = 0; i < this.goals.length; i++) {
		this.goals[i].updateTimer(d);
	}

};


G.GlobalGoalMgr.prototype.isAnyToUserAttention = function() {

	var result = 0;

	for (var i = 0; i < this.goals.length; i++) {
		if (this.goals[i].status != 'active') result++;
	}

	return result;

};

G.GlobalGoalMgr.prototype.getAttentionReason = function() {

	var result = [];
	for (var i = 0; i < this.goals.length; i++) {
		if (this.goals[i].status != 'active' && result.indexOf(this.goals[i].status) == -1) {
			result.push(this.goals[i].status);
		}
	}

	return result;

};

G.GlobalGoalMgr.prototype.parseGoal = function(str) {

	var obj = JSON.parse(str);
	//(id,description,listener,terms,processArray,target,timeDuration,afterIncrease)
	var goal = new G.GlobalGoal(obj.id,obj.description,obj.listener,obj.terms,obj.increaser,obj.target,obj.timeDuration,obj.afterIncreaseCallbackName,obj.reward,obj.rewardHidden,obj.cancelationPrice);
	goal.status = obj.status;
	goal.current = obj.current;

	if (obj.timeBeginingDate) {
		goal.timeBinding = G.sb.onWallClockTimeUpdate.addPermanent(goal.updateTimer,this);
		goal.timeBeginingDate = obj.timeBeginingDate;
		goal.updateTimer(Date.now());
	}

	return goal;

};



G.GlobalGoalMgr.prototype.removeAndPushNew = function(goal) {

	var goalId = goal.id;
	var goalIndex = this.goals.indexOf(goal);

	
	this.goals.splice(goalIndex,1);
	goal.destroy();
	G.sb.onGlobalGoalRemove.dispatch(goal,goalIndex);

	var newGoal = this.createNewGoal(goalId);
	
	this.saveGoals();
	
	return newGoal;
};

G.GlobalGoalMgr.prototype.createNewGoal = function(avoidId) {

	var currentId = [];

	if (typeof avoidId !== 'undefined') {
		currentId.push(avoidId);
	}

	for (var i = 0; i < this.goals.length; i++) {
		currentId.push(this.goals[i].id);
	}

	while(true) {
		var goalIndex = Math.floor(Math.random()*this.globalGoalsTemplates.length);
		if (currentId.indexOf(this.globalGoalsTemplates[goalIndex].id) == -1) {
			break;
		}
	} 

	var goalData = this.globalGoalsTemplates[goalIndex];

	var playerProgress = G.saveState.getLastPassedLevelNr()/G.json.levels.length;

	var argumentsArray = this.prepareArgumentsArray(goalData,playerProgress);

	var newGoal = new (Function.prototype.bind.apply(G.GlobalGoal, [null].concat(argumentsArray)));

	if (!newGoal.timeRestriction) newGoal.start();

	this.goals.push(newGoal);

	G.sb.onGoalCreated.dispatch(newGoal,this.goals.indexOf(newGoal));

	return newGoal;

};


G.GlobalGoalMgr.prototype.prepareArgumentsArray = function(goalData,playerProgress) {

	var target = goalData.targetRange[0]+(Math.floor(((goalData.targetRange[1]-goalData.targetRange[0])*playerProgress)/5)*5);

	var terms = false;
	if (typeof goalData.terms !== 'undefined') {
		terms = JSON.parse(JSON.stringify(goalData.terms));
	}

	var timeDuration = false;
	if (typeof goalData.timeRange!== 'undefined' && Math.random()<0.3) {
		timeDuration = goalData.timeRange[0]+(Math.floor(((goalData.timeRange[1]-goalData.timeRange[0])*playerProgress)/5)*5);
	}

	var reward = G.gift.getGift('missions');

	return [
		goalData.id,
		goalData.description.replace('%TARGET%',target.toString()),
		goalData.listener,
		terms,
		goalData.increaser,
		target,
		timeDuration,
		goalData.afterIncrease,
		reward,
		Math.random() < 0.4
	];


};


//onCollectableRemove(type,candy),
//onLevelFinished(lvl_nr,new_stars,new_points)


/*G.GlobalGoalMgr.prototype.readyGoals = [
	[0,'Collect 30 @candy_1@','onCollectableRemove',["1"],1,30],
	[1,'Collect 55 @candy_2@','onCollectableRemove',["2"],1,55,2],
	[2,'Collect 150 @candy_4@','onCollectableRemove',["4"],1,150],
	[3,'Collect 5@map_star_1@','onLevelFinished',[[]],[false,true],5,1,'pushPassedLevelToTerms'],
	[4,'Collect 3@map_star_3@','onLevelFinished',[[],3],1,3,1,'pushPassedLevelToTerms'],
	[5,'Make 15 moves','userMadeMove',false,1,15]
];*/




G.GlobalGoal = function(id,description,listener,terms,processArray,target,timeDuration,afterIncrease,reward,rewardHidden,cancelationPrice) {

	//inactive active failed achieved

	this.id = id;

	this.reward = reward;
	this.rewardHidden = rewardHidden || false;

	this.description = description;

	this.status = 'inactive';
	this.listenerBinding = G.sb[listener].addPermanent(this.onListener,this);
	this.listener = listener;

	this.current= 0;
	this.target = target;

	this.timeRestriction = timeDuration || false;
	this.timeDuration = timeDuration || 0; //in minutes
	this.timeBeginingDate = false;

	this.cancelationPrice = cancelationPrice || game.rnd.between(G.json.settings.priceOfGoalRemove[0]/5,G.json.settings.priceOfGoalRemove[1]/5)*5;

	this.terms = terms; // array with terms
	this.increaser = processArray; //array with terms
								// or number 
	this.afterIncreaseCallback = this.customAfterIncrease[afterIncrease] || false;
	this.afterIncreaseCallbackName = afterIncrease || '';


	this.onFinish = new Phaser.Signal();

};



G.GlobalGoal.prototype.customAfterIncrease = {
	pushPassedLevelToTerms : function(lvlNr) {

		if (!this.terms) {
			this.terms = [[]]
		};
		this.terms[0].push('!'+lvlNr);
	}
};



G.GlobalGoal.prototype.stringify = function() {

	var obj = {
		id : this.id,
		reward: this.reward,
		rewardHidden: this.rewardHidden,
		description: this.description,
		status: this.status,
		current: this.current,
		target: this.target,
		listener: this.listener,
		terms: this.terms,
		increaser: this.increaser,
		timeRestriction: this.timeRestriction,
		timeDuration: this.timeDuration,
		timeBeginingDate: this.timeBeginingDate,
		afterIncreaseCallbackName: this.afterIncreaseCallbackName,
		cancelationPrice: this.cancelationPrice
	}

	return JSON.stringify(obj);

};

G.GlobalGoal.prototype.getProgress = function(){
	return Math.min(this.current,this.target)/this.target;
};

G.GlobalGoal.prototype.getLeft = function() {
	return Math.max(0,this.target-this.current);
};

G.GlobalGoal.prototype.start = function() {

	if (this.status !== 'inactive') return;

	this.status = 'active';

	if (this.timeRestriction) {
		this.timeBeginingDate = Date.now();
		this.timeBinding = G.sb.onWallClockTimeUpdate.addPermanent(this.updateTimer,this);
	}

};

G.GlobalGoal.prototype.finish = function() {


	if (this.status !== 'active') return;

	this.listenerBinding.detach();
	if (this.timeRestriction) this.timeBinding.detach();

	if (this.current >= this.target) {
		this.status = 'achieved';
	}else {
		this.status = 'failed';
	}

	this.onFinish.dispatch(this.status);

};


G.GlobalGoal.prototype.updateTimer = function(date) {
	
	if (this.status !== 'active' || !this.timeRestriction) return;

	if (date - this.timeBeginingDate > this.timeDuration*60*1000) {
		this.finish();
		G.sb.onGlobalGoalOutOfTime.dispatch(this);
	}

};

G.GlobalGoal.prototype.checkTerms = function(args) {
	if (this.terms) {
		for (var i = 0, len = this.terms.length; i < len; i++) {
			var term = this.terms[i];

			if (Array.isArray(term)) {
				if (!this.checkArrayTerm(args[i],term)) return false;
			}else {
				if (!this.checkTerm(args[i],term)) return false;
			}

		}		
	}

	return true;
};

G.GlobalGoal.prototype.checkArrayTerm = function(arg,term) {

	for (var j = 0; j < term.length; j++) {
		if (!this.checkTerm(arg,term[j])) return false;
	}

	return true;

};

G.GlobalGoal.prototype.checkTerm = function(arg,term) {

	if (term === false) return true;

	if (typeof term === 'string' && term[0] === '!') {
			return arg != term.slice(1);
	}else {
		return arg == term;
	}

};

G.GlobalGoal.prototype.processIncrease = function(args) {

	if (typeof this.increaser === 'number') {
			this.current += this.increaser;
		}else if (Array.isArray(this.increaser)) {
			for (var j = 0, len = this.increaser.length; j<len; j++) {
				if (this.increaser[j]) {
					this.current += args[j];
				}
			}			
		}


};

G.GlobalGoal.prototype.getEndtime = function() {

	this.timeBeginingDate + (this.timeDuration*60*1000)

};

G.GlobalGoal.prototype.destroy = function() {

	this.listenerBinding.detach();
	if (this.timeBinding) this.timeBinding.detach();
};


G.GlobalGoal.prototype.getRemainingSeconds = function() {

	if (this.status == 'inactive') {
		return this.timeDuration*60;
	}

	return Math.max(0,Math.floor(((this.timeDuration*60*1000)-(Date.now()-this.timeBeginingDate))/1000));

}

G.GlobalGoal.prototype.onListener = function() {

	if (this.status !== 'active') return;

	if (this.checkTerms(arguments)) {
		this.processIncrease(arguments);
		if (this.afterIncreaseCallback) this.afterIncreaseCallback.apply(this,arguments);
	}

	if (this.current >= this.target) {
		this.finish();
	}

};



G.GlobalGoalPanel = function(x,y,goalObj,goalIndex) {

	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.x = x;
	this.y = y;

	this.bg = G.makeImage(-35,8,'goal_bar_empty',0.5,this);

	this.goalObj = goalObj;
	this.goalIndex = goalIndex; 

	//(str,x,y,font,fontSize,distanceBetween,anchorX,maxWidth)
	this.label = this.add(new G.LabelGroup(this.goalObj.description,-210,-5,'font-white',30,0,0.5,200));

	this.prize = this.add(new G.LabelGroup(
		this.goalObj.rewardHidden ? '@*1.3*gift_small@' : G.gift.getLabelString(this.goalObj.reward),
		140,-5,'font-white',30,1,0.5)); 

	this.bar = G.makeImage(-216,24,'goal_bar_full',0,this);
	this.bar.cropRect = new Phaser.Rectangle(0,0,this.bar.width*this.goalObj.getProgress(),this.bar.height);
	this.bar.updateCrop();
	//this.barGreen.scale.x = this.goalObj.getProgress();

	if (this.goalObj.timeRestriction) {

		if (this.goalObj.status == 'active' || this.goalObj.status =='inactive') {
			this.timer = new G.Timer(142,22,'font-white',25,300,1,0)
			this.add(this.timer);
			this.timer.setSecLeft(this.goalObj.getRemainingSeconds());
			this.onFinishBinding = this.goalObj.onFinish.add(this.onGoalFinish,this);
			this.timer.events.onDestroy.add(this.onFinishBinding.detach,this.onFinishBinding);
		}
		
		if (this.goalObj.status == 'active') {

			this.timer.start();
			
		}else if (this.goalObj.status == 'inactive') {

			this.startBtn = new G.Button(200,10,'btn_start_goal',function() {
				this.goalObj.start();
				this.timer.start();
				this.startBtn.destroy();
				this.addGoalRemoveBtn();

			},this);
			this.startBtn.pulse();
			this.add(this.startBtn);

		}
	}

	if (this.goalObj.status == 'failed') {
		this.addGoalFailedBtn();
	}

	if (this.goalObj.status == 'achieved') {
		this.addGoalAchievedBtn();
	}

	if (this.goalObj.status == 'active') {
		this.addGoalRemoveBtn();
	}


};

G.GlobalGoalPanel.prototype = Object.create(Phaser.Group.prototype);


G.GlobalGoalPanel.prototype.replaceSelfWithNewGoal = function() {

	var newGoal = G.globalGoalMgr.removeAndPushNew(this.goalObj);

};

G.GlobalGoalPanel.prototype.addGoalFailedBtn = function() {

	if (this.timer) this.timer.destroy();

	this.failedIcon =  G.makeImage(this.label.x+this.label.width,this.label.y,'task_fail',[0,0.5],this);
	this.replaceBtn = new G.Button(200,10,'btn_trash',function() {
		this.replaceSelfWithNewGoal();
	},this);
	this.replaceBtn.pulse();
	this.add(this.replaceBtn);
 
};

G.GlobalGoalPanel.prototype.addGoalAchievedBtn = function() {

	if (this.timer) this.timer.destroy();

	this.successIcon = G.makeImage(this.label.x+this.label.width,this.label.y,'task_complete',[0,0.5],this);
	
	var gift = this.goalObj.rewardHidden;

	this.replaceBtn = new G.Button(200,10,gift ? 'btn_present' : 'btn_buy',function() {

		this.replaceSelfWithNewGoal();

		G.ga.event('Recurring:Progression:'+this.goalObj.id+':Completed');
		G.ga.event('Source:Coins:Mission:MissionReward',gift[1]);


		if (gift) {

			G.sb.closeAndOpenWindow.dispatch('gift',false,this.goalObj.reward);
			G.sb.pushWindow.dispatch('globalGoals');

		}else {
			
			G.sfx.match_4.play(); 

			if (this.goalObj.reward[0] == 'coin'){

				this.state.uiTargetParticles.createCoinBatch(
					game.world.bounds.x+this.replaceBtn.worldPosition.x,
					this.replaceBtn.worldPosition.y,
					this.state.panel.coinsTxt, 
					this.goalObj.reward[1]
				);

			}else{
				G.gift.applyGift(this.goalObj.reward);
			}

		}		

	},this);
	this.replaceBtn.pulse();
	this.add(this.replaceBtn);

};


G.GlobalGoalPanel.prototype.addGoalRemoveBtn = function() {

	this.goalRemoveBtn = new G.Button(200,10,'btn_trash_buy',function() {

		G.sfx.cash_register.play();

		if (G.saveState.getCoins() >= this.goalObj.cancelationPrice) {

			G.ga.event('Sink:Coins:Purchase:SkipMission',this.goalObj.cancelationPrice);
			G.ga.event('Recurring:Progression:'+this.goalObj.id+':Skipped');

			G.saveState.changeCoins(-this.goalObj.cancelationPrice);
			this.replaceSelfWithNewGoal();
		}else {

			if (game.incentivised){

				G.sb.closeAndOpenWindow.dispatch('moreMoney','globalGoals');

			}else if (G.saveState.getCoins() < this.goalObj.cancelationPrice){
				
				if (this.goalRemoveBtn.price.tint !== 0xff0000){
					this.goalRemoveBtn.price.tint = 0xff0000;
					this.goalRemoveBtn.price.updateCache();
				}
				this.goalRemoveBtn.alpha = 0.5;

			}

		}

	},this); 

	this.goalRemoveBtn.price = new G.OneLineText(-7,18,'font-white',this.goalObj.cancelationPrice.toString(),30,40,0,0.5);
	this.goalRemoveBtn.addChild(this.goalRemoveBtn.price);
	this.add(this.goalRemoveBtn);

	if (!game.incentivised && G.saveState.getCoins() < this.goalObj.cancelationPrice){
		this.goalRemoveBtn.price.tint = 0xff0000;
		this.goalRemoveBtn.price.updateCache();
		this.goalRemoveBtn.alpha = 0.5;
	}

};

G.GlobalGoalPanel.prototype.onGoalFinish = function(newStatus) {

	if (this.goalRemoveBtn) {
		this.goalRemoveBtn.destroy();
	}

	if (newStatus == 'achieved') {
		this.addGoalAchievedBtn();
	}else {
		this.addGoalFailedBtn();
	}


}
G.GlobalGoalPanelGroup = function(x,y,maxHeight) {
	
	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);
	this.maxHeight = G.l(maxHeight);
	this.panelDistance = this.maxHeight/3;

	this.panels = [];

	G.globalGoalMgr.goals.forEach(function(goal,index) {
		this.createGoalPanel(goal,index);
	},this);

	G.sb.onGoalCreated.add(this.onGoalCreated,this);
	G.sb.onGlobalGoalRemove.add(this.onGoalRemove,this);


};

G.GlobalGoalPanelGroup.prototype = Object.create(Phaser.Group.prototype);

G.GlobalGoalPanelGroup.prototype.createGoalPanel = function(goalObj, goalIndex) {

	var goalPanel = new G.GlobalGoalPanel(0,goalIndex*this.panelDistance,goalObj,goalIndex);

	this.panels.push(goalPanel);
	this.add(goalPanel);

};

G.GlobalGoalPanelGroup.prototype.onGoalRemove = function(goalToRemove,goalToRemoveIndex) {

	var panelToRemove = this.panels.splice(goalToRemoveIndex,1)[0];
	panelToRemove.igonreChildInput = false;
	this.bringToTop(panelToRemove);
	game.add.tween(panelToRemove).to({alpha:0},400,Phaser.Easing.Sinusoidal.In,true).onComplete.add(panelToRemove.destroy,panelToRemove);
	game.add.tween(panelToRemove.scale).to({x: 1.1, y:1.1},400,Phaser.Easing.Sinusoidal.In,true).onComplete.add(panelToRemove.destroy,panelToRemove);

	this.refreshPanelsPosition();
};

G.GlobalGoalPanelGroup.prototype.refreshPanelsPosition = function() {

	this.panels.forEach(function(panel,index) {

		var newIndex = G.globalGoalMgr.goals.indexOf(panel.goalObj);
		if (newIndex == panel.goalIndex) return;
		G.stopTweens(panel);
		panel.alpha = 1;
		game.add.tween(panel).to({
			y: newIndex*this.panelDistance
		},400,Phaser.Easing.Linear.None,true);

	},this);

};

G.GlobalGoalPanelGroup.prototype.onGoalCreated = function(goalObj,goalIndex) {

	var newPanel = new G.GlobalGoalPanel(0,goalIndex*this.panelDistance,goalObj,goalIndex);
	newPanel.igonreChildInput = false;
	this.panels.push(newPanel); 
	this.add(newPanel);
	game.add.tween(newPanel).from({y: newPanel.y+G.l(100), alpha:0},400,Phaser.Easing.Linear.None,true).onComplete.add(function() {
		newPanel.igonreChildInput = true;
	})

};
G.HighscoreGeneralPanel = function(lvlNr) {
	
	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.x = game.width*0.5;
	this.y = game.height;
	this.opened = true;
	this.openedOffset = 1;

	this.bg = G.makeImage(0,0,'bottom_ui_long',[0.5,0],this);
	this.bg.inputEnabled = true;

	this.bg.events.onInputDown.add(function() {
		this.clicked = true;
	},this);

	this.clicked = false;
	//this.highscoreTxt = this.add(new G.OneLineText(0,45,'font-white','Leaderboard',60,300,0.5,0.5));

	this.initCheck = false;

	this.responseData = false;

	this.prevY = this.y;

	this.inputPrevX = null;


	this.loggedGroup = this.add(game.add.group());
	this.loggedGroup.x = G.l(-480);
	this.loggedGroupMask = this.add(game.add.graphics());
	this.loggedGroupMask.beginFill(0x000000,1);
	var maskWidth = this.bg.width*0.98;
	this.loggedGroupMask.drawRect(maskWidth*-0.5,G.l(30),maskWidth,G.l(180));
	this.loggedGroup.mask = this.loggedGroupMask;


	this.inviteBtn = new G.Button(320,110,'btn_invite',function() {
		G.ga.event('Recurrring:Social:General:Invite');
		// SG_Hooks.social.friends.displayInvite(null, function(){});
        console.log("SG_Hooks.social.friends.displayInvite(null, function(){})");
	},this);
	//ask friends txt

	//(x,y,font,text,size,width,hAnchor,vAnchor)

	this.inviteBtn.label1 = this.inviteBtn.addChild(new G.OneLineText(0,-35,'font-white','+',80,110,0.5,0.5));
	this.inviteBtn.label2 = this.inviteBtn.addChild(new G.OneLineText(0,15,'font-white',G.txt(77),50,110,0.5,0.5));


	//this.inviteBtn.addTextLabel('font-white',G.txt(77));
	this.add(this.inviteBtn);

	this.panels = [];
	
	if (G.platform.generalHighscore) {
		this.injectData(G.platform.generalHighscore);
		this.initInjection = true;
	}else {
		this.makeUserPanels(5);
	}
	
	this.updateLoggedGroupOffset();

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

};

G.HighscoreGeneralPanel.prototype = Object.create(Phaser.Group.prototype);


G.HighscoreGeneralPanel.prototype.onScreenResize = function() {

	this.inviteBtn.x = (Math.min(this.bg.width,game.width)-this.inviteBtn.width)*0.5;	

	var maskWidth = Math.min(game.width,this.bg.width*0.98);

	if (this.loggedGroupMask) {
		this.loggedGroupMask.clear();
		this.loggedGroupMask.beginFill(0x000000);
		this.loggedGroupMask.drawRect(maskWidth*-0.5,G.l(30),maskWidth-(this.inviteBtn.width*0.5),G.l(180));
	}

};


G.HighscoreGeneralPanel.prototype.update = function() {

	if (!this.initInjection && G.platform.generalHighscore) {
		this.initInjection = true;
		this.injectData(G.platform.generalHighscore);
	}


	this.prevY = this.y;

	this.openedOffset = game.math.clamp(this.openedOffset+(!this.state.highscorePanel.opened ? 0.1 : -0.1),0,1);

	this.visible = this.openedOffset > 0;

	this.x = game.world.bounds.x+game.width*0.5;
	this.y = game.height-(this.openedOffset*this.bg.height*0.92);

	this.updateInput();
	this.updateLoggedGroupOffset();
	this.updateBtnLock();	

	if (this.loggedGroup && this.loggedGroup.highlight) {
		this.loggedGroup.highlight.update();
	}

};


G.HighscoreGeneralPanel.prototype.updateInput = function() {



	if (this.clicked && this.loggedGroup && this.opened && game.input.activePointer.isDown) {

		if (this.inputPrevX !== null) {
			
			var diff = game.input.activePointer.x - this.inputPrevX;

			this.loggedGroup.x += diff;		

		}

		this.inputPrevX = game.input.activePointer.x;

	}else {
		this.inputPrevX = null;
		this.clicked = false;
	}

};

G.HighscoreGeneralPanel.prototype.updateLoggedGroupOffset = function() {

	var loggedGroupW = G.l(140)*this.panels.length+1;
	var min = -loggedGroupW+(Math.min(game.width,this.bg.width)*0.5)-this.inviteBtn.width;
	var max = Math.min(game.width,this.bg.width)*-0.5;
	min = Math.min(min,max);

	this.loggedGroup.x = game.math.clamp(
				this.loggedGroup.x,
				min,
				max
				//-G.l(1000),
				//-G.l(300)
	);
};

G.HighscoreGeneralPanel.prototype.open = function(immediate) {
	this.opened = true;
	/*if (immediate) {
		this.openedOffset = 0;
	}*/
};

G.HighscoreGeneralPanel.prototype.close = function(immediate) {
	this.opened = false;
	/*if (immediate) {
		this.openedOffset = 1;
	}*/
};


G.HighscoreGeneralPanel.prototype.makeUserPanels = function(nr) {

	this.panels = [];
	this.bars = [];

	for (var i = 0; i < nr; i++) {
		this.panels.push(new G.HighscoreGeneralPersonPanel(i*140,85,320));
		//this.bars.push(G.makeImage((i+1)*450+10,150,'fb_border',0.5,this.loggedGroup))
	}

	this.loggedGroup.addMultiple(this.panels);
	this.loggedGroup.addMultiple(this.bars); 

};

G.HighscoreGeneralPanel.prototype.injectData = function(userArray) {

   if (!userArray) return;

   var userArray = JSON.parse(JSON.stringify(userArray));

   //take current level from saveState


   var current = userArray.find(function(elem){return elem.currentUser});

   if (current) {
   		
   		current.score = Math.max(current.score,G.saveState.data.levels.length);

   		userArray.sort(function(a,b) {
       		return b.score-a.score
    	});

   }




	var wasCurrent = false;

	if (this.panels.length < userArray.length+1) {
		this.panels.forEach(function(panel){panel.destroy()});
		this.makeUserPanels(userArray.length+1 || 5);
	}

	for (var i = 0, j = 0; i < userArray.length; i++) {
		this.panels[i].setUser(userArray[i],i+1);
	}

	if (!wasCurrent) {
		this.loggedGroup.x = (Math.min(game.width,this.bg.width)*0.5)-this.inviteBtn.width-G.l(20);
	}
	
};


G.HighscoreGeneralPanel.prototype.updateBtnLock = function() {

		var bgBounds = this.bg.getBounds();

		for (var i = 0; i < this.panels.length; i++) {

			var panel = this.panels[i];
			if (panel.addBtn.visible) {
				var bounds = panel.addBtn.getBounds();

				if (Phaser.Rectangle.intersects(bounds,bgBounds)) {
					panel.addBtn.inputEnabled = true;
					panel.addBtn.input.useHandCursor = true;
				}else {
					panel.addBtn.inputEnabled = false;
				}

			}

			if (panel.lifeBtn.visible) {
				var bounds = panel.lifeBtn.getBounds();

				if (Phaser.Rectangle.intersects(bounds,bgBounds)) {
					panel.lifeBtn.inputEnabled = true;
					panel.lifeBtn.input.useHandCursor = true;
				}else {
					panel.lifeBtn.inputEnabled = false;
				}

			}

		};
};


G.HighscoreGeneralPersonPanel = function(x,y) {

	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);


	this.fallbackImg = G.makeImage(80,0,Math.random() < 0.5 ? 'avatar_m_big' : 'avatar_f_big',0.5,this);

	//this.avatar = G.makeImage(60,0,Math.random() < 0.5 ? 'avatar_m' : 'avatar_f',0.5,this);	

	this.frame = G.makeImage(80,15,'frame_avatar_bar',0.5,this);

	this.frameCurrent = G.makeImage(80,15,'frame_avatar_bar',0.5,this);
	this.frameCurrent.blendMode = 1;
	this.frameCurrent.alpha = 0;
	game.add.tween(this.frameCurrent).to({alpha:0.25},400,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	this.frameCurrent.visible = false;

	this.levelBg = G.makeImage(80,80,'lvl_back',0.5,this);
	this.placeBg = G.makeImage(115,32,'bg_rank',0.5,this);

	this.placeTxt = new G.OneLineText(115,30,'font-white','-',20,35,0.5,0.5);
	this.placeTxt.tint = 0x673c11;
	this.add(this.placeTxt);
	
	this.nameTxt = new G.OneLineText(80,50,'font-white','-',25,86,0.5,0.5);
	this.nameTxt.tint = 0x673c11;
	this.add(this.nameTxt);

	this.scoreTxt = new G.OneLineText(80,79,'font-white','-',30,100,0.5,0.5);
	this.add(this.scoreTxt);

	this.addBtn = new G.Button(80,65,'leaderboard_plus',function() {
		G.ga.event('Recurrring:Social:General:Invite');
		// SG_Hooks.social.friends.displayInvite(null, function(){});
        console.log("SG_Hooks.social.friends.displayInvite(null, function(){})");
	},this);
	this.add(this.addBtn);

	this.lifeBtn = new G.Button(115,-35,'send_heart_button',function() {
		this.lifeBtn.inputEnabled = false;
		this.lifeBtn.visible = false;
		G.saveState.sendLife(this.extUserId);
		
	},this);


	this.lifeBtnBinding = G.sb.sentLife.add(function(extUserId) {
		if (this.extUserId === extUserId) {
			this.lifeBtn.visible = false;
		}
	},this);

	this.onDestroy.add(function() {
		if (this.lifeBtnBinding) this.lifeBtnBinding.detach();
	},this);

	this.add(this.lifeBtn);
	this.lifeBtn.visible = false;


	this.resetPanel();


};

G.HighscoreGeneralPersonPanel.prototype = Object.create(Phaser.Group.prototype);

G.HighscoreGeneralPersonPanel.prototype.resetPanel = function() {

	this.levelBg.visible = false;
	this.scoreTxt.visible = false;
	this.placeBg.visible = false;
	this.placeTxt.visible = false;
	this.addBtn.visible = true;
	this.lifeBtn.visible = false;
	this.frameCurrent.visible = false;

	if (this.avatar) {
		this.avatar.destroy(); 
	}
	this.frameCurrent.visible = false;

};

G.HighscoreGeneralPersonPanel.prototype.setUser = function(userObj, place) {
	
	this.resetPanel();

	if (userObj === undefined) {
		userObj = {};
		return;
	}

	this.userObj = userObj;

	var currentUser = userObj.currentUser
	var name = userObj.username;
	var score = userObj.score;
	var img = userObj.avatar;

	if (G.saveState.checkIfCanSendLifeTo(userObj.extUserId)) {
		this.lifeBtn.visible = true;
		this.lifeBtn.inputEnabled = true;
		this.lifeBtn.alpha = 1;
	}

	
	this.extUserId = userObj.extUserId;

	if (currentUser) {
		this.frameCurrent.visible = true;
		this.lifeBtn.visible = false;
	}

	this.addBtn.visible = false;

	if (img) {

		if (this.avatar) {
			this.avatar.destroy();
		}

		this.avatar = G.makeExtImage(80,0,img,null,0.5,this,true,function() {
			this.width = G.l(80);
			this.height = G.l(80);
		});
		this.sendToBack(this.avatar);
		this.sendToBack(this.fallbackImg);

	}else {
		if (this.avatar) this.avatar.destroy();
	}

	if (name) {
		this.placeBg.visible = true;
		this.placeTxt.visible = true;
		this.placeTxt.setText('#'+place)
	}

	if (name) {

		var indexOfSpace = name.indexOf(' ');
		if (indexOfSpace !== -1) {
			name = name.slice(0,indexOfSpace);
		}

		this.nameTxt.setText(name)

	};
	if (score) {
		this.levelBg.visible = true;
		this.scoreTxt.visible = true;
		this.scoreTxt.setText(G.txt(82)+' '+score);
	};

	this.bringToTop(this.placeTxt);

};

G.HighscorePanel = function(lvlNr) {
	
	Phaser.Group.call(this,game);

	this.x = game.width*0.5;
	this.y = game.height;
	this.opened = false;
	this.openedOffset = 0;

	this.bg = G.makeImage(0,0,'bottom_ui_long',[0.5,0],this);
	this.bg.inputEnabled = true;
	//this.highscoreTxt = this.add(new G.OneLineText(0,45,'font-white','Leaderboard',60,300,0.5,0.5));
	this.bg.events.onInputDown.add(function() {
		this.clicked = true;
	},this);
	this.clicked = false;

	this.initCheck = false;

	this.responseData = false;

	this.prevY = this.y;

	this.inputPrevX = null;

	this.makeUserPanels();

	this.inviteBtn = new G.Button(320,70,'btn_blue',function() {
		G.ga.event('Recurrring:Social:General:Invite');
		SG_Hooks.social.friends.displayInvite(null, function(){});
        console.log("SG_Hooks.social.friends.displayInvite(null, function(){})");
	},this);
	//ask friends txt
	this.inviteBtn.addTextLabel('font-white',G.txt(77));
	this.add(this.inviteBtn);

	G.sb.onWindowClosed.add(this.close,this);

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

};

G.HighscorePanel.prototype = Object.create(Phaser.Group.prototype);


G.HighscorePanel.prototype.onScreenResize = function() {

	this.inviteBtn.x = (Math.min(this.bg.width,game.width)-this.inviteBtn.width)*0.5;	

	var maskWidth = Math.min(game.width,this.bg.width*0.98);

	this.loggedGroupMask.clear();
	this.loggedGroupMask.beginFill(0x000000);

	this.loggedGroupMask.drawRect(maskWidth*-0.5,G.l(30),maskWidth-(this.inviteBtn.width*0.5),G.l(180));

};


G.HighscorePanel.prototype.update = function() {

	this.prevY = this.y;

	this.openedOffset = game.math.clamp(this.openedOffset+(this.opened ? 0.1 : -0.1),0,1);

	this.visible = this.openedOffset > 0;

	this.x = game.world.bounds.x+game.width*0.5;
	this.y = game.height-(this.openedOffset*this.bg.height*0.6);

	this.updateInput();
	this.updateLoggedGroupOffset();

	if (this.loggedGroup && this.loggedGroup.highlight) {
		this.loggedGroup.highlight.update();
	}

};


G.HighscorePanel.prototype.updateInput = function() {

	if (this.clicked && this.loggedGroup && this.opened && game.input.activePointer.isDown) {

		if (this.inputPrevX !== null) {
			
			var diff = game.input.activePointer.x - this.inputPrevX;
			this.loggedGroup.x += diff;
			
		}

		this.inputPrevX = game.input.activePointer.x;

	}else {
		this.clicked = false;
		this.inputPrevX = null;
	}

};

G.HighscorePanel.prototype.updateLoggedGroupOffset = function(){

	var loggedGroupW = G.l(230)*5;
	var min = -loggedGroupW+(Math.min(game.width,this.bg.width)*0.5)-this.inviteBtn.width;
	var max = Math.min(game.width,this.bg.width)*-0.5;
	this.loggedGroup.x = game.math.clamp(
		this.loggedGroup.x,
		min,
		max
		//-G.l(1000),
		//-G.l(300)
	);
};

G.HighscorePanel.prototype.open = function(immediate) {
	this.opened = true;
	/*if (immediate) {
		this.openedOffset = 0;
	}*/
};

G.HighscorePanel.prototype.close = function(immediate) {
	this.opened = false;
	/*if (immediate) {
		this.openedOffset = 1;
	}*/
};


G.HighscorePanel.prototype.makeUserPanels = function() {

	this.loggedGroup = this.add(game.add.group());

	

	this.loggedGroup.x = G.l(-480);

	this.loggedGroupMask = this.add(game.add.graphics());

	this.loggedGroupMask.beginFill(0x000000,1);
	var maskWidth = this.bg.width*0.98;

	this.loggedGroupMask.drawRect(maskWidth*-0.5,G.l(30),maskWidth,G.l(180));

	this.loggedGroup.mask = this.loggedGroupMask;

	this.panels = [];
	this.bars = [];

	for (var i = 0; i < 5; i++) {
		this.panels.push(new G.HighscorePersonPanel(i*230,80,320));
		//this.bars.push(G.makeImage((i+1)*450+10,150,'fb_border',0.5,this.loggedGroup))
	}

	this.loggedGroup.addMultiple(this.panels);
	this.loggedGroup.addMultiple(this.bars); 

};

G.HighscorePanel.prototype.injectData = function(userArray) {

	this.panels.forEach(function(panel){
		panel.resetPanel();
	});


	var loggedGroupW = G.l(230)*5;
	var min = -loggedGroupW+(Math.min(game.width,this.bg.width)*0.5)-this.inviteBtn.width;
	var max = Math.min(game.width,this.bg.width)*-0.5;


    if (!userArray) return;

	var wasCurrent = false;

	for (var i = 0; i < this.panels.length; i++) {

		/*if (userArray[i] && userArray[i].currentUser) {
			wasCurrent = true;
			
            this.inputPrevX = null;
            this.loggedGroup.x = game.math.clamp(
                -this.panels[i].x-G.l(150),
                min,
                max
            );
		}*/

		this.panels[i].setUser(userArray[i],i+1);
	}

	if (!wasCurrent) {
		this.loggedGroup.x = max;
	}
	
};

G.HighscorePersonPanel = function(x,y) {

	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);


	this.fallbackImg = G.makeImage(80,0,Math.random() < 0.5 ? 'avatar_m_big' : 'avatar_f_big',0.5,this);

	//this.avatar = G.makeImage(60,0,Math.random() < 0.5 ? 'avatar_m' : 'avatar_f',0.5,this);	

	this.frame = G.makeImage(80,-1,'avatar_frame_big',0.5,this);

	this.frameCurrent = G.makeImage(80,-1,'avatar_frame_big',0.5,this);
	this.frameCurrent.blendMode = 1;
	this.frameCurrent.alpha = 0;
	game.add.tween(this.frameCurrent).to({alpha:0.25},400,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	this.frameCurrent.visible = false;

	this.placeTxt = new G.OneLineText(35,-35,'font-white','-',40,200,0.5,0.5);
	this.add(this.placeTxt);
	
	this.nameTxt = new G.OneLineText(125,-25,'font-white','---',30,100,0,0.5);
	this.add(this.nameTxt);

	this.scoreTxt = new G.OneLineText(125,10,'font-white','-',30,100,0,0.5);
	this.add(this.scoreTxt);

};

G.HighscorePersonPanel.prototype = Object.create(Phaser.Group.prototype);

G.HighscorePersonPanel.prototype.resetPanel = function() {

	this.nameTxt.setText('---');
	this.scoreTxt.setText('---');

	if (this.avatar) {
		this.avatar.destroy(); 
	}
	this.frameCurrent.visible = false;

};

G.HighscorePersonPanel.prototype.setUser = function(userObj, place) {
	
	if (userObj === undefined) {
		userObj = {};
	}

	this.userObj = userObj;

	var currentUser = userObj.currentUser
	var name = userObj.username;
	var score = userObj.score;
	var img = userObj.avatar;

	if (currentUser) {
		this.frameCurrent.visible = true;
	}


	if (img) {

		if (this.avatar) {
			this.avatar.destroy();
		}

		this.avatar = G.makeExtImage(80,0,img,null,0.5,this,true,function() {
			this.width = G.l(80);
			this.height = G.l(80);
		});
		this.bringToTop(this.frame);
		this.bringToTop(this.frameCurrent);

	}else {
		if (this.avatar) this.avatar.destroy();
	}

	G.changeTexture(this.frame,'avatar_frame_big');
	if (place) {this.placeTxt.setText(place)};
	if (name) {

		var indexOfSpace = name.indexOf(' ');
		if (indexOfSpace !== -1) {
			name = name.slice(0,indexOfSpace);
		}

		this.nameTxt.setText(name)

	};
	if (score) {this.scoreTxt.setText(score)};

	this.bringToTop(this.placeTxt);

};

G.JewelsBlitzMoneyCounter = function() {
		
	Phaser.Group.call(this,game);
	this.x = 0;
	this.y = 0;

	this.amountTxt = new G.OneLineText(0,0,'font-blue',G.lvl.moneyGained,30,100,0,0.5);
	this.add(this.amountTxt);
	this.coinIcon = G.makeImage(0,0,'coin_1',[0,0.5],this);
	this.coinIcon.scale.setTo(0.4);
	this.amountTxt.cacheAsBitmap = false;

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

	this.alpha = 0;
	this.levelFinished = false;

	G.sb.onLevelFinished.add(function() {
		this.levelFinished = true;
	},this);

};

G.JewelsBlitzMoneyCounter.prototype = Object.create(Phaser.Group.prototype);

G.JewelsBlitzMoneyCounter.prototype.update = function() {

	if (this.levelFinished) {

		this.alpha = Math.max(0,this.alpha-0.05);

	}else {

		this.alpha = Math.min(1,this.alpha+0.05);
		if (this.amountDisplayed !== G.lvl.moneyGained) {
			this.updateCoinsAmount(G.lvl.moneyGained);
		}

	}

};

G.JewelsBlitzMoneyCounter.prototype.updateCoinsAmount = function(newAmount) {
	G.stopTweens(this);
	this.scale.setTo(1);
	game.add.tween(this.scale).to({x:1.3,y:1.3},200,Phaser.Easing.Sinusoidal.InOut,true,0,0,true); 
	this.amountTxt.setText(newAmount.toString());
	var xx = (this.amountTxt.width+this.coinIcon.width)*-0.5;
	this.amountTxt.x = xx;
	this.coinIcon.x = this.amountTxt.x+this.amountTxt.width+G.l(5);
	this.amountDisplayed = newAmount;

};

G.JewelsBlitzMoneyCounter.prototype.onScreenResize = function() {

	if (G.horizontal) {
		this.x = 0;
		this.y = G.l(440);
	}else {
		this.x = G.l(415);
		this.y = G.l(74);
    }

};
G.LevelGenerator = {};

G.LevelGenerator.generate = function(config) {

	var lvl = {
		mapX : -200+(Math.random()*400),
		mapY : Math.random()*-400,
		moves: config.movesNr,
		nrOfTypes: config.typesOfCandy,
		goal: ['collect',[]],
		bgImg: config.bgImg,
		starsReq : [3000,5000,7000],
		drops: {
			chest: config.chestDrop,
			chain: config.chainDrop,
			infection: config.infectionDrop
		},


	};

	var width = 8;
	var height = 8;

	var board = new G.GridArray(width,height);
	board.loop(function(elem,coll,row,array) {
		array[coll][row] = [];
	});


	var pickedBlockers = this.pickBlockers(lvl,config);

	this.putBlockers(board,config,pickedBlockers);

	lvl.levelData = board.data;

	lvl.goal[1] = this.makeGoal(board,config,lvl,pickedBlockers);

	/*
	//cages
	//this.putInLines(board,config.maxCage,'cg',['X','cg']);
	this.putSymmetrical(board,'cg',this.getRandomEvenInRange(config.cage[0],config.cage[1]),['X','cg','ice1','ice2'],2);

	//chocolate
	//this.putInLines(board,config.maxChocolate,Math.random() < 0.2 ? 'cho2' : 'cho1',['X','cg','cho2','cho1'])
	this.putSymmetrical(board,[true,'cho1','cho2'],this.getRandomEvenInRange(config.chocolate[0],config.chocolate[1]),['X','cg','cho2','cho1'],3);

	//wrapped
	this.putWrapped(board,config);

	*/

	this.fillWithRandom(board,config);

	return lvl;

};

G.LevelGenerator.putBlockers = function(board,config,pickedBlockers) {


	//['concrete','ice','chain','dirt','infection']

	for (var i = 0; i < pickedBlockers.length; i++) {
		switch (pickedBlockers[i]) {
			case 'concrete':
				this.putSymmetrical(board,[false,'cn3','cn2','cn1'],this.getRandomEvenInRange(config.concrete[0],config.concrete[1]),['dirt3','dirt2','dirt1','cn3','cn2','cn1','infection'],2);
				break;
			case 'ice':
				this.putSymmetrical(board,'ice',this.getRandomEvenInRange(config.ice[0],config.ice[1]),['ice','dirt3','dirt2','dirt1','infection'],3);
				break;
			case 'chain':
				this.putWrapped(board,config);
				break;
			case 'dirt':
				this.putSymmetrical(board,['dirt3','dirt2','dirt1'],this.getRandomEvenInRange(config.dirt[0],config.dirt[1]),['ice','dirt3','dirt2','dirt1','cn3','cn2','cn1'],0);
				break;
			case 'infection':
				this.putSymmetrical(board,'infection',this.getRandomEvenInRange(config.infection[0],config.infection[1]),['infection','cn3','cn2','cn1','ice','W1','W2','W3','W4','W5','W6'],0);
				break;
		}
	}

};


G.LevelGenerator.pickBlockers = function(lvl,config) {

	var blockersAvailable = [];

	var allBlockers = ['concrete','ice','chain','dirt','infection'].forEach(function(blocker) {
		if (config[blocker][1] > 0) {
			blockersAvailable.push(blocker);
		}
	});

	Phaser.ArrayUtils.shuffle(blockersAvailable);

 	var picked = [];
 	var nrToPick = game.rnd.between(config.blockersTypes[0],config.blockersTypes[1]);

 	for (var i = 0; i < Math.min(blockersAvailable.length,nrToPick); i++) {
 		picked.push(blockersAvailable[i]);
 	}

 	return picked;

};


G.LevelGenerator.putWrapped = function(board,config) {

	var markList = [false];
	for (var i = 1; i <= config.typesOfCandy;i++) {
		markList.push('W'+i.toString());
	}
	this.putSymmetrical(board,markList,this.getRandomEvenInRange(config.chain[0],config.chain[1]),['infection','W1','W2','W3','W4','W5','W6']);

};

G.LevelGenerator.fillWithRandom = function(board,config) {

	var avoid = ['W1','W2','W3','W4','W5','W6','infection'];

	board.loop(function(elem,x,y) {

		if (!this.shouldAvoidCell(board,x,y,avoid)) {
			elem.unshift('r');
		}

	},this);

};

G.LevelGenerator.getRandomEven = function(maxNr) {

	var result = game.rnd.between(0,maxNr);
	if (result % 2 == 1) {
		if (result < maxNr) {
			result++;
		}else {
			result--;
		} 
	}

	return result;
};

G.LevelGenerator.getRandomEvenInRange = function(minNr,maxNr) {

	var result = game.rnd.between(minNr,maxNr);
	if (result % 2 == 1) {
		if (result < maxNr) {
			result++;
		}else {
			result--;
		} 
	}
	return result;

};



G.LevelGenerator.makeGoal = function(board,config,lvl,pickedBlockers) {

	var possibleGoals = [];

	for (var i = 1; i <= config.typesOfCandy; i++) {
		possibleGoals.push([
			i.toString(), Math.ceil(game.rnd.between(config.normReq[0],config.normReq[1])/5)*5
		]);
	}

	var lookUpMarks = {
		'concrete' : ['cn3','cn2','cn1'],
		'ice' : ['ice'],
		'chain' : ['W1','W2','W3','W4','W5','W6'],
		'dirt' : ['dirt3','dirt2','dirt1'],
		'infection' : ['infection']
	}

	for (var i = 0; i < pickedBlockers.length; i++) {
		possibleGoals.push([pickedBlockers[i],this.countOnBoard(board,lookUpMarks[pickedBlockers[i]])]);
	}

	var goalNr = game.rnd.between(config.goalRange[0],config.goalRange[1]);

	Phaser.ArrayUtils.shuffle(possibleGoals);

	return possibleGoals.splice(0,goalNr);


};


G.LevelGenerator.countEmptySpaces = function(board) {

	return this.countOnBoard(board,'X');

};

G.LevelGenerator.countOnBoard= function(board,lookFor) {

	var result = 0;

	if (!Array.isArray(lookFor)) lookFor = Array.prototype.slice.call(arguments).splice(1);

	for (var i = 0; i <lookFor.length;i++) {
		var currentLookFor = lookFor[i];
		board.loop(function(elem,x,y) {
			if (elem.indexOf(currentLookFor) !== -1) result++;
		});
	}

	return result;

};


//
// mark - string or array [keepSymetry, elems...]
// startFrom Y CELL - some blockers should not be placed on very top
//
G.LevelGenerator.putSymmetrical = function(board,mark,nrOfElements,avoid,startFrom) {

	startFrom = startFrom || 0;

	if (Array.isArray(mark)) {
		var markList = mark;
		var keepMarkSymmetry = markList.shift();
	}

	console.log("PUT SYMETRIC: "+mark+' x '+nrOfElements);

	if (nrOfElements == 0) return;

	var twoLines = Math.random() < 0.5;

	console.log(twoLines);

	var maxWidthIndex = Math.ceil(board.width*0.5);
	var maxHeightIndex = twoLines ? Math.ceil(board.height*0.5) : board.height;
	var pairs = [];
		
	var attempts = 0;

	while (nrOfElements > 0) {

		if (attempts++ == 400) return;

		if (markList && keepMarkSymmetry) mark = markList[Math.floor(Math.random()*markList.length)];

		pairs = [];

		var xx = Math.floor(Math.random()*maxWidthIndex);
		var yy = Math.floor(Math.random()*maxHeightIndex);
		var xxR = (board.width-1)-xx;
		var yyR = (board.height-1)-yy;


		if (!this.shouldAvoidCell(board,xx,yy,avoid) && nrOfElements > 0 && yy >= startFrom) {
			console.log("PUT: "+xx+'x'+yy);
			if (markList && !keepMarkSymmetry) mark = markList[Math.floor(Math.random()*markList.length)];
			board.data[xx][yy].push(mark);
			nrOfElements--;
			pairs.push(true);
			//remove extra element if it is in the middle (so there will be symetry)
		}


		if (!this.shouldAvoidCell(board,xxR,yy,avoid) && nrOfElements > 0 && yy >= startFrom) {
			console.log("PUT XR: "+xxR+'x'+yy);
			if (markList && !keepMarkSymmetry) mark = markList[Math.floor(Math.random()*markList.length)];
			board.data[xxR][yy].push(mark);
			nrOfElements--;
			pairs.push(true);
		}

		if (twoLines) {

			if (!this.shouldAvoidCell(board,xx,yyR,avoid) && nrOfElements > 0&& yyR >= startFrom) {
				if (markList && !keepMarkSymmetry) mark = markList[Math.floor(Math.random()*markList.length)];
				board.data[xx][yyR].push(mark);
				console.log("PUT YR: "+xx+'x'+yyR);
				nrOfElements--
				pairs.push(true);
			}

			if (!this.shouldAvoidCell(board,xxR,yyR,avoid) && nrOfElements > 0&& yyR >= startFrom) {
				if (markList && !keepMarkSymmetry) mark = markList[Math.floor(Math.random()*markList.length)];
				board.data[xxR][yyR].push(mark);
				console.log("PUT XR YR: "+xxR+'x'+yyR);
				nrOfElements--;
				pairs.push(true);

			}

		}

		if (pairs.length % 2 == 1) {
			nrOfElements--;
		}

	}	

};



G.LevelGenerator.shouldAvoidCell = function(board,x,y,avoid) {

	var cell = board.data[x][y];

	for (var i = 0; i < avoid.length; i++) {
		if (cell.indexOf(avoid[i]) !== -1) {
			return true;
		}

	}

	return false;

};


G.LvlObject = function() {
	
	this.state = game.state.getCurrentState();
    this.lvlNr = this.state.lvlNr;
    this.coinChanceProb = G.saveState.getStars(this.lvlNr) == 0 ? 1 : G.json.settings.completedLevelCoinsProb;
    this.stars = 0;
    this.combo = 0;
    this.data = G.lvlData;
    this.goalAchieved = false;
    this.moves = G.lvlData.moves;
    this.points = 0;
    this.boosterInUse = false;
    this.movesMade = 0;

    this.items = [];

    this.firstMoveMade = false;

    this.extraMovesBoughtNr = 0;
    this.outOfMovesPopUp = 0;

    this.moneyGained = 0;

    this.comboBonus = G.json.settings.comboBonus;

    this.moneyGainedChest = 0;

    //collect list
    if (G.lvlData.goal[0] == 'collect') {
        G.lvlData.collectList = [];
        G.lvlData.goal[1].forEach(function(child) {
            G.lvlData.collectList.push(child[0]);
        });
         this.pointsGoal = false;
    }else {

        this.pointsGoal = true;
        this.pointsTarget = G.lvlData.goal[1];
    }

    //in case that goal is impossible to achieve (goal for drop is too high)
    //this.checkIfEnoughDrops(G.lvlData);
    this.goal = JSON.parse(JSON.stringify(G.lvlData.goal[1]));


    G.sb.onCollectableRemove.add(function(type,elem,sprite) {
        var goalIndex = this.getGoalIndex(type);
        if (goalIndex !== -1) {

            if (G.json.settings.goals[type].toUIAnimation) {
                G.sb.onCandyToUIAnim.dispatch(type,elem,sprite);
            }

            this.goal[goalIndex][1]--;
            if (this.goal[goalIndex][1] <= 0) {
                this.goal.splice(goalIndex,1);
                if (this.goal.length == 0) {
                    this.goalAchieved = true;
                    G.sb.onGoalAchieved.dispatch();
                    G.ga.event('Recurring:Progression:Gate'+G.saveState.checkGateNr(this.lvlNr)+':Level'+(this.lvlNr+1)+':CompleteMoves',this.moves);                  
                }
            }  
        }
    },this);


    G.sb.onLevelMoneyGain.add(function(change) {
        this.moneyGained += change;
    },this);

};

G.LvlObject.prototype = {

    getPriceOfExtraMoves: function() {

        return G.json.settings.priceOfExtraMoves*(this.extraMovesBoughtNr+1)

    },

    buyExtraMoves: function(double,forcePrice) {

        G.saveState.data.coins -= forcePrice || G.json.settings.priceOfExtraMoves*(double?2:1);
        G.saveState.save();

        G.ga.event('Sink:Coins:Purchase:Moves',forcePrice || G.json.settings.priceOfExtraMoves*(double?2:1));

        this.extraMovesBoughtNr++;
        this.changeMoveNumber(5);
        G.sb.onExtraMovesUsed.dispatch();


    },

	isGoalAchieved: function() {
        return this.goalAchieved;
    },
    madeMove: function() {
        this.changeMoveNumber(-1);
        if (!this.goalAchieved) {
            this.movesMade++;
            G.sb.userMadeMove.dispatch();
        }
        G.sb.madeMove.dispatch();
    },
    changeMoveNumber: function(change) {
        this.moves += change;
        G.sb.changeMoveNumber.dispatch();
    },
    changePointsNumber: function(change) {
        this.points += change;

        G.sb.onPointsAdded.dispatch(change);
        G.sb.onPointsChange.dispatch(this.points);

         if (!this.goalAchieved && this.pointsGoal && this.points >= this.pointsTarget) {
            this.goalAchieved = true;
            G.sb.onGoalAchieved.dispatch();
            G.ga.event('Recurring:Progression:Gate'+G.saveState.checkGateNr(this.lvlNr)+':Level'+(this.lvlNr+1)+':CompleteMoves',this.moves);
        }
    },
    increaseCombo: function() {
        this.combo++;
        G.sb.onComboIncrease.dispatch(this.combo);
    },
    endCombo: function() {
        this.combo = 0;
        G.sb.onComboBreak.dispatch();
    },
    processMatch: function(amount,meanX,meanY,color) {

        var pointsToAdd = amount*(10+this.getComboBonus());
        this.changePointsNumber(pointsToAdd);
        var pxOut = this.state.board.cellToPxOut([meanX,meanY]);
        G.sb.displayPoints.dispatch(pxOut[0],pxOut[1],pointsToAdd,color);
        
        //turn off match on level end
        /*if (this.goalAchieved && Math.random() < this.coinChanceProb) {
            G.sfx.coin_collect.play();
            G.sb.newPopOutMoney.dispatch(pxOut[0],pxOut[1]);
        }*/

        if (!this.firstMoveMade && this.lvlNr+1 === 1) {
            this.firstMoveMade = true;
            G.ga.event('FTUE:Level1:InGame:FirstMatch');
        }

    },

    getComboBonus: function(){

        return this.comboBonus[Math.min(this.combo,this.comboBonus.length-1)];

    },

    checkIfEnoughDrops: function(lvlData) {

        var normals = ['1','2','3','4','5','6','dirt','ice','chain','concrete'];

        for (var goalNr = 0; goalNr < lvlData.goal[1].length; goalNr++) {

            var goal = lvlData.goal[1][goalNr];


            if (normals.indexOf(goal[0]) === -1) {

               

                goal[1] = Math.min(goal[1],this.countDrops(goal[0],lvlData));

            }

        }

    },

    countDrops: function(dropName,lvlData) {

        var result = 0;

        var boardData = lvlData.levelData;


        //count how many is on board allready
        for (var row = 0; row < boardData.length; row++) {
            for (var collumn = 0; collumn < boardData[row].length; collumn++) {
                for (var cellElem = 0; cellElem < boardData[row][collumn].length; cellElem++) {

                    if (boardData[row][collumn][cellElem] === dropName) result++;

                }
            }
        }

       

        //count how many will be dropped later
        for (var dropIndex = 0; dropIndex < lvlData.drops.length; dropIndex++) {
            
            if (lvlData.drops[dropIndex][0] === dropName) result++;
        }

       

        return result;

    },

    getGoalIndex: function(name) {

        for (var i = 0; i < this.goal.length; i++) {
            if (this.goal[i][0] == name && this.goal[i][1] > 0) {
                return i;
            } 
        }
        return -1;

    },

    isGoal: function(name) {
        return this.getGoalIndex(name) !== -1;
    }

}
G.MapGift = function(){

	//first time
	// flag - watch/no watch
	if (G.saveState.data.mapGifts === undefined) G.saveState.data.mapGifts = [G.json.settings.firstMapGift];

	//add new gift at random
	if (G.saveState.data.mapGifts.length == 0){
		if (Math.random() < G.json.settings.mapGiftChance){
			G.saveState.data.mapGifts.push(game.rnd.pick(G.json.settings.mapGifts));
			G.saveState.save();
		}else{
			return undefined;
		}
	}

	Phaser.Group.call(this,game);

	this.position.setTo(0,230);

	this.btn = new G.Button(0,0,'btn_x',this.open,this);
	this.add(this.btn);

	this.btn.giftIco = G.makeImage(0,0,'gift_small',0.5,this.btn);
	this.btn.amountBg = G.makeImage(29,26,'booster_ammount',0.5,this.btn);

	this.btn.amountTxt = new G.OneLineText(29,26,'font-blue',G.saveState.data.mapGifts.length,25,100,0.5,0.5);
	this.btn.addChild(this.btn.amountTxt);

	G.sb.onScreenResize.add(this.onResize,this);
	this.onResize();

	G.sb.onWindowOpened.add(function(){
		this.ignoreChildInput = true;
	},this);

	G.sb.onWindowClosed.add(function(){
		this.ignoreChildInput = false;
	},this);

	G.sb.onMapGiftRemoved.add(function(){

		if (G.saveState.data.mapGifts.length == 0){
			this.btn.inputEnabled	= false;
			game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function(){
				this.visible = false;
			},this);
		}else{
			this.btn.amountTxt.setText(G.saveState.data.mapGifts.length);
		}

	},this);

};

G.MapGift.prototype = Object.create(Phaser.Group.prototype);

G.MapGift.prototype.onResize = function(){

	if (G.horizontal){
		this.x = -213;
	}else{
		this.x = 56;
	}

};

G.MapGift.prototype.open = function(){

	G.sb.pushWindow.dispatch('mapGift');

};
G.MapTilesRenderer = function(){
	
	Phaser.Group.call(this,game);

	this.marker = G.makeImage(0,0,null);

	this.rts = [];
	this.imgs = [];

	var totalHeight = this.getMapTotalHeight();
	var heightToCover = totalHeight;
	var tileHeight = 600;
	var nrOfTiles = Math.ceil(heightToCover/tileHeight);

	var mapTiles = {
		totalHeight: totalHeight,
		tiles: []
	};

	for (var i = 0; i < nrOfTiles; i++){

		var height = Math.min(tileHeight,heightToCover);
		this.rts[i] = game.make.renderTexture(1200, tileHeight, 'map-tile-'+i,true);
		this.drawMap(this.rts[i],G.json.map,tileHeight*i);
		heightToCover -= tileHeight;

		mapTiles.tiles.push({
			rt: 'map-tile-'+i,
			y: -i*tileHeight
		});

	}

	G.json.settings.mapTiles = mapTiles;

	this.marker.destroy();

};

G.MapTilesRenderer.prototype = Object.create(Phaser.Group.prototype);


G.MapTilesRenderer.prototype.getMapTotalHeight = function(){

	for (var i = 0; i < G.json.map.length; i++){
		if (G.json.map[i].label && G.json.map[i].label === 'ENDMARKER') {
			return Math.floor(G.json.map[i].y*-1);
		}
	}


};

G.MapTilesRenderer.prototype.drawMap = function(rt,list,offsetY){

	var xOffset = rt.width*0.5;

	var yOffset = rt.height+offsetY;

	for (var i = 0; i < list.length; i++){

		var elem = list[i];

		if (elem.label && elem.label === 'ENDMARKER') continue;
		this.drawElementXY(elem.x+xOffset,elem.y+yOffset,elem,rt);

	}



};

G.MapTilesRenderer.prototype.drawElementXY = function(x,y,elem,rt){

	this.marker.position.setTo(x,y);
	this.marker.anchor.setTo(elem.anchor[0],elem.anchor[1]);
	this.marker.angle = elem.angle;
	this.marker.scale.setTo(elem.scale[0],elem.scale[1]);
	G.changeTexture(this.marker,elem.frame);
	this.marker.updateTransform();
	rt.renderXY(this.marker, x, y);


};
G.NoMoreAds = function() {

	Phaser.Image.call(this,game);

	this.bg = G.makeImage(0,0,'text_shade_bg',0.5,this);
	this.txt = new G.MultiLineText(0,0,'font-white',G.txt(35),70,600,300,'center',0.5,0.5);
	this.addChild(this.txt);
	this.bg.width = this.txt.width+G.l(100);
	this.bg.height = this.txt.height+G.l(100);

	this.fixedToCamera = true;

	this.cameraOffset.x = game.width*0.5;
	this.cameraOffset.y = game.height*0.5;



	game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.InOut,true,2500).onComplete.add(function() {
		this.destroy();
	},this);

	game.add.tween(this).from({alpha:0},500,Phaser.Easing.Sinusoidal.InOut,true);

	game.add.existing(this);

};

G.NoMoreAds.prototype = Object.create(Phaser.Image.prototype);

G.NoMoreAds.prototype.update = function() {
	
	this.cameraOffset.x = game.width*0.5;
	this.cameraOffset.y = game.height*0.5; 

}
G.PaymentStatus = function(success){

	Phaser.Group.call(this,game);

	this.bg = G.makeImage(0,0,'text_shade_bg',0.5,this);

	this.mark = G.makeImage(0,0,success ? 'task_complete' : 'task_fail',[0,0.5],this);

	//(x,y,font,text,size,width,hAnchor,vAnchor)
	this.info = new G.OneLineText(0,0,'font-white',success ? G.txt(73) : G.txt(74), 50,450,0,0.5);
	this.add(this.info);

	if (!success) {
		this.info.tint = 0xff0000;
		this.info.updateCache();
	}

	this.mark.x = Math.floor((this.mark.width+G.l(10)+this.info.width)*-0.5)
	this.info.x = this.mark.x + this.mark.width + G.l(10);

	this.bg.width = this.info.width+this.mark.width+G.l(10)+G.l(100);

	game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true,2000).onComplete.add(function() {
		this.destroy();
	},this);

	this.update();

};

G.PaymentStatus.prototype = Object.create(Phaser.Group.prototype);

G.PaymentStatus.prototype.update = function() {

	this.x = Math.floor(game.world.bounds.x+(game.width*0.5))
	this.y = Math.floor(game.height*0.5);

};
G.Platform = function(){

        return;


        if (typeof softgames !== 'undefined' && softgames.user) {
            this.userId = softgames.user.userId;
            this.gameId = softgames.gid;
            this.authToken = softgames.user.authToken;
        }else {
            this.userId = 156631515;
            this.gameId = 274;
            this.authToken = 'uKUfKXEHTBEQnnDZKx5j';
        }

        
        this.dailyAfterLvl = 1; 
        this.ABpaidMoves = false;

        try {

            gi = GA.getInstance();

            var config = JSON.parse(window.atob(SG_Hooks.getGameConfig()));


            if (config.abTesting){

                if (config.abTesting.direct_payment){
                    this.ABpaidMoves = (config.abTesting.direct_payment).toString().indexOf('variant') > -1 ? true : false;
                    gi.setCustomDimension(2,config.abTesting.direct_payment);
                }

            }

            
        }catch(e){

        }



        this.giftSumUp = true;
        this.giftsDuringAbsence = [];

        this.friendsList = [];
        this.getFriendsList();

        this.highscoresPerLvl = [];
        for (var i = 0; i < G.json.levels.length; i++) {
            this.highscoresPerLvl.push([]);
        }
        this.currentUser = null;

        this.generalHighscore = null;

        this.friendsWithLevelsList = [];
        //this.updateHighscoreAndGifts();



        //setInterval((this.updateHighscoreAndGifts).bind(this),30000);

};

G.Platform.prototype.getFriendsList = function() {

    return;

    try {
        SG_Hooks.social.friends.getList((function (response) {

            this.friendsList = response.friends || [];

        }).bind(this));
    } catch(err) {
        console.log('failed to getFriendsList', err);
        this.friendsList = []
    }

};

G.Platform.prototype.updateGeneralHighscore = function(users,currentUser) {

    this.generalHighscore = [];

    users.forEach(function(user) {
        if (user.levelOnMap) {
            this.generalHighscore.push({
                username: user.username,
                avatar: user.avatar,
                extUserId: user.extUserId,
                score: user.levelOnMap,
            });
        }
    },this);

    if (currentUser) {
         currentUser.levelOnMap = currentUser.highscores.reduce(function(a,b) {return Math.max(a,b.level)},0);
         this.generalHighscore.push({
             username: currentUser.username,
                extUserId: currentUser.extUserId,
                avatar: currentUser.avatar,
                score: currentUser.levelOnMap,
                currentUser: true
         });
    }

    this.generalHighscore.sort(function(a,b) {
        return b.score-a.score
    });

};

G.Platform.prototype.updateHighscoreAndGifts = function() {

        SG_Hooks.social.highscores.getList({}, (function(response) {

            if (response.status === 'error') return;

            var parsed = response;

            if (parsed.friendsHighscore) {
                this.friendsWithLevelsList = parsed.friendsHighscore;
                this.friendsWithLevelsList.forEach(function(user) {
                    if (user.highscores && user.highscores.length !== 0) {
                        user.levelOnMap = user.highscores.reduce(function(a,b) {return Math.max(a,b.level)},0);;
                    }
                });

                this.updateHighscorePerLevel(parsed.friendsHighscore,parsed.currentUser);

                this.updateGeneralHighscore(parsed.friendsHighscore,parsed.currentUser);

                this.processGifts(parsed.friendsHighscore);
            }

        }).bind(this));

        //this.updateHighscorePerLevel(this.friendsWithLevelsList);

};

G.Platform.prototype.updateHighscorePerLevel = function(users,currentUser) {

    this.highscoresPerLvl = [];

    var livesNr = 0;
    var gatesNr = 0;

    for (var i = 0; i < G.json.levels.length; i++) {

        var lvl = [];
        for (userIndex = 0; userIndex < users.length; userIndex++) {
            var user = users[userIndex];

            if (user.highscores.length > 0) {
                var filtered = user.highscores.filter(function(hsEntry) {
                    return hsEntry.level == i+1;
                });

                if (filtered.length > 0) {
                    lvl.push({
                        username: user.username,
                        avatar: user.avatar,
                        score: filtered[0].score
                    });
                }

            }

        }

        if (currentUser) {

            this.currentUser = currentUser;

            var filtered = currentUser.highscores.filter(function(hsEntry){
                return hsEntry.level == i+1;
            });

            if (filtered.length > 0) {
                lvl.push({
                    username: currentUser.username,
                    avatar: currentUser.avatar,
                    score: filtered[0].score,
                    currentUser: true
                });
            }
        }



        lvl.sort(function(a,b) {
            return b.score-a.score
        });

        this.highscoresPerLvl[i] = lvl;

    };

};

G.Platform.prototype.passLevel = function(lvlIndex,points){

    return;

    var highscoreLvl = this.highscoresPerLvl[lvlIndex];


    //get current index of current user in that level
    var prevIndex = highscoreLvl.findIndex(function(entry){
        return entry.currentUser;
    });

    //get current user obj and update it or push new obj to lvl highscore
    var current = highscoreLvl.filter(function(entry){
        return entry.currentUser;
    });

    if (current.length > 0) {
        current[0].score = Math.max(points,current[0].score);
    }else {

        if (this.currentUser) {

            highscoreLvl.push({
                username: this.currentUser.username,
                avatar: this.currentUser.avatar,
                score: points,
                currentUser: true
            });

        }
    }


    highscoreLvl.sort(function(a,b) {
        return b.score-a.score
    });


    var newIndex = highscoreLvl.findIndex(function(entry){
        return entry.currentUser;
    });


    //if user is not on highscore list, if my position is the same, or there is no other person behind
    if (newIndex == -1 || newIndex == prevIndex || !highscoreLvl[newIndex+1]){
        return false;
    }

    if (prevIndex != -1){
        if (newIndex < prevIndex) {
            return {
                playerPosition: newIndex+1,
                user: highscoreLvl[newIndex+1]
            };
        }
    }else {
        return {
                playerPosition: newIndex+1,
                user: highscoreLvl[newIndex+1]
            }
    }

};

G.Platform.prototype.processGifts = function(users) {

    this.giftsDuringAbsence = [];

    var latestTime = G.saveState.data.lastGiftCheck;

    for (var i = 0; i < users.length; i++) {
        var user = users[i];

        user.acceptedGiftRequests = user.sentGifts.concat(user.giftRequests);

        if (user.acceptedGiftRequests && user.acceptedGiftRequests.length > 0){
            for (var giftIndex = 0; giftIndex < user.acceptedGiftRequests.length; giftIndex++) {

                var gift = user.acceptedGiftRequests[giftIndex];

                if (!gift) continue

                if (!gift.giftAcceptedAt) continue;

                var giftTime = new Date(gift.giftAcceptedAt).getTime();
                //console.log('diff: '+(giftTime - G.saveState.data.lastGiftCheck));
                if (giftTime <= G.saveState.data.lastGiftCheck) {
                    //console.log('skipping gift: ' + gift.giftAcceptedAt +'\n last gift check: '+G.saveState.data.lastGiftCheck);
                    continue;
                }

                //console.log('accepting gift: ' + gift.giftAcceptedAt +'\n last gift check: '+G.saveState.data.lastGiftCheck);

                latestTime = Math.max(giftTime,latestTime);

                if (gift.giftName === 'life') {

                    G.saveState.addLife();
                    G.ga.event('Source:Lives:Gift:Friend',1);
                    if (!this.giftSumUp) {
                        new G.GiftStatus(gift,user);
                    }else {
                        if (giftIndex === 0) {
                            this.giftsDuringAbsence.push({gift:gift,user:user});
                        }
                    }

                }else if (gift.giftName === 'gate') {

                    var firstClosedGate = G.saveState.data.gates.find(function(gate){
                        if (gate) {
                            return !gate.open;
                        }
                    });

                    if (firstClosedGate && firstClosedGate.timerStartedAt) {

                        firstClosedGate.invites++;
                        if (!this.giftSumUp) {
                            new G.GiftStatus(gift,user);
                        }else {
                            if (giftIndex === 0) {
                                this.giftsDuringAbsence.push({gift:gift,user:user});
                            }
                        }

                    };

                }
            }
        }

    }

    if (G.saveState.data.lastGiftCheck != latestTime) {
        G.saveState.data.lastGiftCheck = latestTime;
        G.saveState.save();
    }


    if (this.giftSumUp){
        this.giftSumUp = false;
    }

};

G.Platform.prototype.markInvitedFriends = function(invitesArray) {
    this.friendsList.forEach(function(user) {

        if (invitesArray.indexOf(user.userExternalId) !== -1) {
            user.invited = true;
        }
    });
};


G.Platform.prototype.getFriendsForAsk = function() {

    var filteredList = this.friendsList.filter(function(user){return !user.asked});

    Phaser.ArrayUtils.shuffle(filteredList);

    return filteredList.splice(0,10);

};
G.PopOutMoneyLayer = function(topBar) {

	Phaser.Group.call(this,game);

	G.sb.newPopOutMoney.add(this.onPopOutMoney,this);

	this.deadArray = [];



};

G.PopOutMoneyLayer.prototype = Object.create(Phaser.Group.prototype);

G.PopOutMoneyLayer.prototype.getFreePart = function() {
	var part;

	if (this.deadArray.length > 0) {
		part = this.deadArray.pop();
	}else {
		part = new G.UI_PopOutMoney(); 
		part.events.onKilled.add(this.onElemKilled,this);
	}

	this.add(part);
	return part;

};


G.PopOutMoneyLayer.prototype.onElemKilled = function(elem) {
	if (this !== elem.parent) return;
	this.deadArray.push(elem);
	this.removeChild(elem)

};

G.PopOutMoneyLayer.prototype.onPopOutMoney = function(x,y) {

	var part = this.getFreePart();
	
	part.init(x,y);
	
};
G.StartBoosterBubble = function(position,boosterNr,target,onPop,context) {
	
	Phaser.Image.call(this,game,0,0);

	G.sb.onStartBoosterUsed.dispatch(boosterNr);

	this.anchor.setTo(0.5);

	this.state = game.state.getCurrentState();

	this.board = this.state.board;

	this.x = this.board.x + (this.board.width*position[0]);
	this.y = this.board.y + (this.board.height*position[1]);

	this.tweenFloating = game.add.tween(this).to({y:this.y+G.l(30)},1000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

	game.add.tween(this.scale).from({x:0,y:0},1000,Phaser.Easing.Elastic.Out,true);

	G.changeTexture(this,'ui_booster_'+boosterNr);


	this.target = target || null;

	this.onPop = onPop || function(){};
	this.onPopContext = context || this;

	this.goingToTarget = false;

};


G.StartBoosterBubble.prototype = Object.create(Phaser.Image.prototype);


G.StartBoosterBubble.prototype.update = function() {

	/*if (this.goingToTarget) {

		this.x = G.lerp(this.x,this.target.worldPosition.x,0.1);
		this.y = G.lerp(this.y,this.target.worldPosition.y,0.1);

		var distance = game.math.distance(this.x,this.y,this.target.worldPosition.x,this.target.worldPosition.y);

		if (distance < 5) {

			this.pop();

		}

	}*/

};


G.StartBoosterBubble.prototype.goToTarget = function(delay) {


	if (this.target == null) {

		game.time.events.add(delay+500,function() {
			this.tweenFloating.stop();
			this.pop();
		},this);

	}else {

		game.time.events.add(delay,function() {

			this.tweenFloating.stop(); 
			game.add.tween(this).to({
				x:game.world.bounds.x + this.target.worldPosition.x,
				y:game.world.bounds.y + this.target.worldPosition.y},
			300,Phaser.Easing.Sinusoidal.In,true).onComplete.add(this.pop,this);

			game.add.tween(this.scale).to({
				x: 0.6,
				y: 0.6
			},300,Phaser.Easing.Sinusoidal.In,true); 
			
		},this);

	}

};


G.StartBoosterBubble.prototype.pop = function() {

	G.sfx['match_'+game.rnd.between(1,5)].play();
	this.onPop.call(this.onPopContext);
	G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
 	G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
 	G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
 	G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
	this.destroy();

};
G.StartBoosterConfig = function() {
	
	this.data = [];

};

G.StartBoosterConfig.prototype.select = function(lvlNr,boosterNr) {
	
	if (!this.data[lvlNr]) {
		this.data[lvlNr] = [];
	}
	this.data[lvlNr][boosterNr] = true;

};

G.StartBoosterConfig.prototype.deselect = function(lvlNr,boosterNr) {
	
	if (!this.data[lvlNr]) {
		this.data[lvlNr] = [];
	}
	this.data[lvlNr][boosterNr] = false;

};

G.StartBoosterConfig.prototype.isSelected = function(lvlNr,boosterNr) {
	
	if (!this.data[lvlNr]) {
		return false;
	}

	return this.data[lvlNr][boosterNr];

};

G.StartBoosterConfig.prototype.getConfigForLevel = function(lvlNr) {

	return this.data[lvlNr] || [];

};
G.TitleScreenGemsThrower = function() {
	
	Phaser.Group.call(this,game);

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

	this.chanceForShoot = 0.1;

	this.horizontal = false;

	for (var i = 0; i < 20; i++) {
		this.addChild(new G.TitleScreenGem());
	}
 
}

G.TitleScreenGemsThrower.prototype = Object.create(Phaser.Group.prototype);

G.TitleScreenGemsThrower.prototype.onScreenResize = function() {
	
	this.x = game.world.bounds.x;
	this.y = 0;

};

G.TitleScreenGemsThrower.prototype.throwGem = function() {
	
	var gem = this.getFreeGem();
	if (gem == null) return;

	var xx, yy, velX, velY;

	if (this.horizontal) {

		xx = Math.random() < 0.5 ? game.world.bounds.x - G.l(50) : -game.world.bounds.x+game.width+G.l(50);
		yy = (game.height * 0.5) + (game.height*0.5*Math.random());
		velX = G.l(3+Math.random()*6)*Math.sign(xx)*-1;
		velY = G.l(-2+Math.random()*-2);

	}else {
		
		xx = Math.random()*game.width;
		yy = game.height+G.l(50);
		velX = G.l(1+Math.random()*-2);
		velY = G.l(-1+Math.random()*-3);

	}

	gem.init(xx,yy,velX,velY); 

};

G.TitleScreenGemsThrower.prototype.getFreeGem = function() {

	return this.getFirstDead();

};


G.TitleScreenGemsThrower.prototype.update = function() {

	if (Math.random() < this.chanceForShoot) {
		this.throwGem();
	}

	for (var i = 0; i < this.children.length; i++) {
		this.children[i].update();
	} 

};

G.TitleScreenGem = function() {
	
	Phaser.Image.call(this,game,0,0);
	this.anchor.setTo(0.5);
	this.grav = G.lnf(0.02);
	this.kill();


};

G.TitleScreenGem.prototype = Object.create(Phaser.Image.prototype);

G.TitleScreenGem.prototype.init = function(x,y,velX,velY) {

	G.changeTexture(this,'candy_'+game.rnd.between(1,6));

	this.x = x;
	this.y = y;
	this.velX = velX;
	this.velX *= 0.99;
	this.velY = velY;
	this.angleSpeed = -1.5+Math.random()*3
	this.revive();


};

G.TitleScreenGem.prototype.update = function() {

	if (!this.alive) return;

	this.x += this.velX;
	this.angle += this.angleSpeed;
	this.y += this.velY;
	this.velY += this.grav;

	if (this.y > game.height+100) {
		this.kill();
	}


};

G.TrackData = function(lvlNr){

	this.data = {
		boosterBought: [0,0,0,0],
		boosterUsed: [0,0,0,0],
		startBoosterUsed: [0,0,0,0],
		lvlNr: lvlNr+1,
		extraMovesBought: 0,
		continues: 0,
		stars: 0,
		passed: false,
		movesLeft: G.json.levels[lvlNr].moves
	};

	G.sb.onBoosterBought.add(function(nr) {
		this.data.boosterBought[nr-1]++;
	},this);

	G.sb.onBoosterUsed.add(function(nr) {
		this.data.boosterUsed[nr-1]++;
	},this);

	G.sb.onStartBoosterUsed.add(function(nr) {
		this.data.startBoosterUsed[nr-5] = 1;
	},this);

	G.sb.onExtraMovesUsed.add(function(){
		this.data.extraMovesBought++;
	},this);

	G.sb.onOutOfMovesWatch.add(function() {
		this.data.continues++;
	},this);

	G.sb.onOutOfMovesBuy.add(function() {
		this.data.continues++;
	},this);

	G.sb.madeMove.add(function() {
		if (this.data.passed) return;
		this.data.movesLeft--;
	},this);

	G.sb.onGoalAchieved.add(function() {
		this.data.passed = true;
	},this);

	G.sb.onLevelFinished.add(function(lvlNr,stars){
		this.data.stars = stars;
	},this);

	game.state.onStateChange.addOnce(this.send,this);

}

G.TrackData.prototype.send = function() {
	

	// if (SG_Hooks.track) {
	// 	//SG_Hooks.track('levelFinished',this.data);
	// }

};
G.UI_BoosterButton = function(x,y,nr) {
	

	Phaser.Group.call(this,game);


	this.x = G.l(x);
	this.y = G.l(y);
	this.orgY = this.y;

	this.state = game.state.getCurrentState();
	this.boosterNr = nr;
	this.overlay = this.state.overlay;

	this.selected = false;

	this.highlighted = false;
	this.hl = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.hl.blendMode = 1;
	this.hl.alpha = 0;
	this.hl.angle2 = 0;

	this.openLock = false;

	G.sb.onTutorialFinish.add(function(){
		this.hideSuggestion();
	},this);


	this.btn = new G.Button(0,0,'ui_booster_'+nr,function() {
		if (this.selected && !G.tutorialOpened) {
			return G.sb.onBoosterDeselect.dispatch(this.boosterNr);
		}
		if (this.state.board.actionManager.actionList.length > 0) return;
		

		if (G.saveState.getBoosterAmount(this.boosterNr) > 0 || G.saveState.isEnoughToBuyBooster(this.boosterNr)) {
			G.sb.onBoosterSelect.dispatch(this.boosterNr);
		}else {
			if (game.incentivised) {
				G.sb.pushWindow.dispatch('moreMoney');
			}else{
				//price label animation
				G.stopTweens(this.priceLabel);
				this.priceLabel.scale.setTo(1);
				game.add.tween(this.priceLabel.scale).to({x:0.6,y:1.4},150,Phaser.Easing.Bounce.InOut,true,0,2,true);
			}
		}

			
		//}
	},this);
	this.add(this.btn);

	this.btn.addTerm(function(){return this.state.board.actionManager.actionList.length == 0 || this.selected},this);


	this.boosterActiveOffset = G.l(20);
	this.tweenObj = {angle: -15,alpha: 1};
	game.add.tween(this.tweenObj).to({angle: 15},2000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	game.add.tween(this.tweenObj).to({alpha: 0},500,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	this.angleMulti = 0;



	this.priceLabel = new G.LabelGroup(G.json.settings['priceOfBooster'+nr]+'@currency@',0,35,'font-white',40,0.5,0.5,85);
	this.add(this.priceLabel);
	this.plus = G.makeImage(40,30,'booster_plus',0.5,this);



	this.amount = new G.OneLineText(40,30,'font-blue',G.saveState.getBoosterAmount(nr).toString(),25,100,0.5,0.5);
	this.add(this.amount);

	this.hand = G.makeImage(0,0,'tut_hand',0,this);
	this.hand.alpha = 0;
	this.alphaTween = false;
	

	this.refreshBoosterAmount();

	//btn.addTerm(function(){return game.state.getCurrentState().board.actionManager.actionList.length == 0});


	G.sb.refreshBoosterAmount.add(function(nr) {
		if (nr != this.boosterNr) return;
		this.refreshBoosterAmount();
	},this);

	G.sb.onBoosterSelect.add(function(nr) {
		if (nr == this.boosterNr) {
			this.select();
		}else {
			this.squeeze();
		}
	},this);

	G.sb.onBoosterUsed.add(function(nr) {

		if (nr == this.boosterNr) {
			this.deselect();
		}else {
			this.unsqueeze();
		}
	},this);
	
	G.sb.onBoosterDeselect.add(function(nr) {
		if (nr == this.boosterNr) {
			this.deselect();
		}else {
			this.unsqueeze();
		}
	},this);
	

};

G.UI_BoosterButton.prototype = Object.create(Phaser.Group.prototype);


G.UI_BoosterButton.prototype.refreshBoosterAmount = function() {

	if (G.saveState.getBoosterAmount(this.boosterNr) == 0) {
		this.plus.visible = false;
		this.amount.visible = false;
		this.priceLabel.visible = true;
	}else {
		G.changeTexture(this.plus,'booster_ammount');
		this.plus.visible = true;
		this.amount.visible = true;
		this.priceLabel.visible = false;
		this.amount.setText(G.saveState.getBoosterAmount(this.boosterNr).toString());
	}

};


G.UI_BoosterButton.prototype.update = function() {
	this.angle = this.angleMulti*this.tweenObj.angle;
	//this.hl.alpha = this.angleMulti*this.tweenObj.alpha;
	this.y = this.orgY - (this.angleMulti*this.boosterActiveOffset);
	this.x = this.orgX;

	this.hl.angle2++;
	this.hl.angle = -this.angle+this.hl.angle2;
	this.hl.alpha = G.lerp(this.hl.alpha,this.selected ? 0.5 : 0,0.1);


	/*
	var targetAlpha = this.selected ? 0 : (this.suggested ? this.suggestedAlpha : 0);
	this.hand.alpha = G.lerp(this.hand.alpha,targetAlpha,0.1);
	*/
};

G.UI_BoosterButton.prototype.select = function() {
	
	G.sb.startOverlay.dispatch([
		['clearBoard'],
		['moveToAboveGroup',this,'boosterGroup']
	]);
	//this.overlay.moveToAboveGroup(this);

	this.selected = true;
	game.add.tween(this).to({angleMulti: 1},300,Phaser.Easing.Sinusoidal.InOut,true);

};

G.UI_BoosterButton.prototype.deselect = function() {
	

	G.sb.closeOverlay.dispatch();

	this.selected = false;
	game.add.tween(this).to({angleMulti: 0},300,Phaser.Easing.Sinusoidal.InOut,true);
};

G.UI_BoosterButton.prototype.squeeze = function() {

	game.add.tween(this.scale).to({x: 0.8, y:0.8},300,Phaser.Easing.Sinusoidal.Out,true);

};

G.UI_BoosterButton.prototype.unsqueeze = function() {
	if (this.scale.x == 1) return;
	game.add.tween(this.scale).to({x:1,y:1},300,Phaser.Easing.Sinusoidal.Out,true);
};


G.UI_BoosterButton.prototype.lock = function() {
	this.ignoreChildInput = true;
};

G.UI_BoosterButton.prototype.unlock = function() {
	this.ignoreChildInput = false;
};

G.UI_BoosterButton.prototype.hideSuggestion = function() {

	if (this.hand.alpha == 0) return;


	if (this.alphaTween) this.alphaTween.stop();
	G.stopTweens(this.hand);
	this.alphaTween = game.add.tween(this.hand).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

};


G.UI_BoosterButton.prototype.showSuggestion = function() {

	if (this.openLock) return;

	if (this.alphaTween) this.alphaTween.stop();
	this.alphaTween = game.add.tween(this.hand).to({alpha:1},300,Phaser.Easing.Sinusoidal.Out,true);
	this.hand.position.setTo(0,0);
	game.add.tween(this.hand).to({x:G.l(20),y:G.l(20)},800,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	this.openLock = true;

	if (!G.tutorialOpened) {
		game.time.events.add(5000,function(){
			this.hideSuggestion();
		},this);
	}

	game.time.events.add(15000,function(){
		this.openLock = false;
	},this);
	
};
G.UI_BoosterLabel = function() {
	
	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.ico = G.makeImage(0,0,null,0.5,this);
	this.txt = game.add.bitmapText(0,0,'font-white','',G.l(30));
	this.txt.align = 'center';
	this.add(this.txt);

	this.topBar = this.state.topBar;

	this.textLookup = {
		'1' : G.txt(20)+' ',
		'2' : G.txt(21)+' ',
		'3' : G.txt(22)+' ',
		'4' : G.txt(23)+' '
	};

	G.sb.onScreenResize.add(this.resize,this);


	this.resize();


	G.sb.onBoosterSelect.add(this.init,this);
	G.sb.closeOverlay.add(this.hide,this);


};

G.UI_BoosterLabel.prototype = Object.create(Phaser.Group.prototype);


G.UI_BoosterLabel.prototype.init = function(boosterNr) {
	
	G.changeTexture(this.ico,'ui_booster_'+boosterNr);
	this.txt.setText(this.textLookup[boosterNr.toString()]);
	
	this.alpha = 0;
	G.stopTweens(this);
	game.add.tween(this).to({alpha:1},500,Phaser.Easing.Sinusoidal.Out,true);
	this.resize();

};

G.UI_BoosterLabel.prototype.hide = function() {
	
	G.stopTweens(this);
	game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.Out,true);

};


G.UI_BoosterLabel.prototype.resize = function() {

	if (G.horizontal) {
		this.x = 0;
		this.y = G.l(280);
		this.txt.maxWidth = G.l(200);
		this.refreshHorizontal();
	}else {
		this.x = G.l(330);
		this.y = G.l(100);
		this.txt.maxWidth = G.l(400);
		this.refreshVertical();
	}


};

G.UI_BoosterLabel.prototype.refreshHorizontal = function() {

	var startY = (this.ico.height + this.txt.height + G.l(10))*-0.5;
	this.ico.y = startY;
	this.ico.x = 0;
	this.txt.y = this.ico.y + this.ico.height + G.l(10);
	this.txt.x = 0;
	this.txt.anchor.setTo(0.5,0);

};

G.UI_BoosterLabel.prototype.refreshVertical = function() {

	var startX = (this.ico.width + this.txt.width + G.l(10))*-0.5;
	this.ico.y = 0;
	this.ico.x = startX;
	this.txt.x = this.ico.x + this.ico.width + G.l(10);
	this.txt.y = 0;
	this.txt.anchor.setTo(0,0.5);

};
G.UI_CoinCounter = function() {

	Phaser.Group.call(this,game);
	this.x = 100;
	this.y = 100;

	this.state = game.state.getCurrentState();

	this.text = new G.OneLineCounter(0,0,'font-white',G.saveState.data.coins,40,200,1,0.5);
	this.text.cacheAsBitmap = false;
	this.add(this.text);
	this.ico = G.makeImage(0,0,'currency',[0,0.5],this);

	this.alpha = 0;

	G.sb.onScreenResize.add(this.resize,this);
	this.resize();

	G.sb.onBoosterSelect.add(this.init,this);
	G.sb.closeOverlay.add(this.hide,this);

	G.sb.onCoinsChange.add(this.text.changeAmount,this.text);

};

G.UI_CoinCounter.prototype = Object.create(Phaser.Group.prototype);


G.UI_CoinCounter.prototype.resize = function() {

	if (G.horizontal) {
		this.x = 0;
		this.y = G.l(700);
	}else {
		this.x = G.l(330);
		this.y = this.state.board.y - G.l(60);
		this.x += Math.floor(this.text.width*0.5);
	}



};


G.UI_CoinCounter.prototype.init = function(boosterNr) {
	
	if (G.saveState.getBoosterAmount(boosterNr) <= 0) {

		this.alpha = 0;
		G.stopTweens(this);
		game.add.tween(this).to({alpha:1},500,Phaser.Easing.Sinusoidal.Out,true);
		this.resize();

	}

};

G.UI_CoinCounter.prototype.hide = function() {
	
	G.stopTweens(this);
	game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.Out,true);

};

G.UI_ComboIndicator = function(){ 

	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();

	this.bg = G.makeImage(0,0,'combo_bg',0.5,this);

	this.coinGroup = this.add(game.add.group());


	//one change

	this.comboTxt = new G.OneLineCounter(0,5,'font-score-4',0,50,100,0.5,0.5,'x'); 
	this.add(this.comboTxt);


	G.sb.onComboIncrease.add(this.increaseCombo,this);

	G.sb.onComboBreak.add(this.breakCombo,this);

	this.lvl = G.lvl;

	this.scale.setTo(0);

	this.breakTimerAmount = 30;
	this.breakTimer = -1;
	
	this.combo = 0;

	this.board = game.state.getCurrentState().board;
	this.x = this.board.x+this.board.width*0.5;
	this.y = this.board.y+this.board.height*0.5;


};

G.UI_ComboIndicator.prototype = Object.create(Phaser.Group.prototype);




G.UI_ComboIndicator.prototype.update = function() {

	this.x = this.board.x+this.board.width*0.9;
	this.y = this.board.y+this.board.height*0.02;

	this.comboTxt.update();

	if (this.breakTimer-- == 0) {
		G.stopTweens(this);

		G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
		G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
		G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
		G.sb.UIfx.dispatch(this.worldPosition.x+game.world.bounds.x,this.worldPosition.y,'whiteStarPart');
		game.add.tween(this.scale).to({x:0,y:0},200,Phaser.Easing.Cubic.In,true);
	}

	this.coinGroup.update();

};



G.UI_ComboIndicator.prototype.increaseCombo = function(newAmount) {


	if (G.lvl.combo < 2) return;

	if (G.lvl.combo == 3) {
			

		this.breakTimer = -1;
		G.stopTweens(this);
		game.add.tween(this.scale).to({x:1,y:1},300,Phaser.Easing.Cubic.In,true);
		//game.add.tween(this).to({alpha:1},500,Phaser.Easing.Sinusoidal.In,true);
	}

	/*var coinAmount = this.state.doubleMoney ? newAmount : Math.floor(newAmount/2);
	for (var i = 0; i < coinAmount; i++) {
		this.coinGroup.add(new G.UI_ComboIndicatorCoin(0,0));			
	}
	G.sfx.coin_collect.play();
	G.saveState.changeCoins(coinAmount);
	G.sb.onLevelMoneyGain.dispatch(coinAmount);
*/
	G.stopTweens(this.comboTxt);
	this.comboTxt.changeAmount(newAmount);
	this.comboTxt.scale.setTo(1);
	game.add.tween(this.comboTxt.scale).to({x:1.3,y:1.3},200,Phaser.Easing.Sinusoidal.InOut,true,0,0,true); 
	this.combo = newAmount;

};

G.UI_ComboIndicator.prototype.breakCombo = function() {

	if (this.combo < 3) return;
	this.combo = 0;
	this.breakTimer = this.breakTimerAmount;
	
};

G.UI_ComboIndicatorCoin = function(x,y) {

	Phaser.Image.call(this,game,x,y,null);

	this.anchor.setTo(0.5);
	this.scale.setTo(0.7);
	G.changeTexture(this,'coin_1');

	this.angle = game.rnd.between(0,360);

	this.velX = game.rnd.realInRange(G.l(-5),G.l(5));
	this.velY = game.rnd.realInRange(G.l(-10),G.l(-5));
	this.grav = G.lnf(0.35);

	this.alphaDelay = 20;
};

G.UI_ComboIndicatorCoin.prototype = Object.create(Phaser.Image.prototype);

G.UI_ComboIndicatorCoin.prototype.update = function() {

	this.x += this.velX;
	this.y += this.velY;
	this.velX *= 0.98;
	this.velY += this.grav;

	this.angle += this.velX*0.5;

	if (this.alphaDelay-- < 0) {
		this.alpha -= 0.03;
		if (this.alpha <= 0) {
			this.destroy();
		}
	}

};
G.UI_DailyIcon = function(x,y,tutorial) {

	this.state = game.state.getCurrentState();

	if (tutorial) {
		this.state.makeBlackOverlay();
		if (this.state.lvlTutHand) this.state.lvlTutHand.alpha = 0;
	}
	
	Phaser.Group.call(this,game);
	
	this.x = G.l(x);
	this.y = G.l(y);

	this.firstTime = tutorial;

	this.glow = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glow.alpha = 0.5;
	this.glow.scale.setTo(0.5);
	this.glow.blendMode = 1;
	this.glow.update = function(){this.angle++};

	this.icon = new G.Button(0,0,'daily_icon',function() {

		if (!game.incentivised && !G.saveState.data.freeSpin) return;

		G.sb.pushWindow.dispatch(['daily2',this.firstTime]);

		if (this.firstTime) {		
			if (this.tutHand) {
				this.tutHand.destroy();
			}
			G.saveState.data.sawDailyTut = true;
			G.saveState.save();
			G.sb.onWindowClosed.addOnce(function(){
				var state = game.state.getCurrentState();
				if (state.lvlTutHand) {
					game.add.tween(state.lvlTutHand).to({alpha:1},500,Phaser.Easing.Sinusoidal.Out,true);
				}
			});
		}

	},this);
	this.add(this.icon);

	this.iconDark = G.makeImage(0,0,'daily_icon_dark',0.5,this.icon);

//(x,y,font,fontSize,maxWidth,anchorX,anchorY,secLeft)
	this.timer = new G.Timer(0,45,'font-num-orange',30,130,0.5,0.5,(G.saveState.data.lastDaily+86400000-Date.now())/1000);
	this.timer.active = true;
	this.add(this.timer);

	G.sb.onDailyFreeSpinGain.add(function() {
		this.timer.setSecLeft((G.saveState.data.lastDaily+86400000-Date.now())/1000);
	},this);

	this.freeText = new G.OneLineText(0,0,'font-white',G.txt(72),30,100,0.5,0.5);
	this.add(this.freeText);

	game.add.tween(this.freeText.scale).to({x:0.9,y:0.9},500,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

	this.update();

	G.sb.onWindowOpened.add(function() {
		this.icon.inputEnabled = false;
	},this); 
	G.sb.onWindowClosed.add(function() {
		this.icon.inputEnabled = true;
		this.icon.input.useHandCursor = true;
	},this);


	if (this.firstTime){
		this.tutHand = G.makeImage(0,20,'tut_hand',0,this);
		game.add.tween(this.tutHand).to({x:G.l(20),y:G.l(50)},300,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	};

	G.sb.onScreenResize.add(this.onResize,this);
	this.onResize();
	
};

G.UI_DailyIcon.prototype = Object.create(Phaser.Group.prototype);

G.UI_DailyIcon.prototype.update = function() {

	this.glow.angle++;

	this.freeText.visible = this.iconDark.visible = this.glow.visible =  G.saveState.data.freeSpin;
	this.timer.visible = !this.freeText.visible;

};

G.UI_DailyIcon.prototype.onResize = function(){

	if (G.horizontal){
		this.x = 840;
	}else{
		this.x = 585;
	}

};
G.UI_ExtraMovesBuyButton = function() {
	
	Phaser.Group.call(this,game);

	this.targetY = 0;

	this.state = game.state.getCurrentState();

	this.hl = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.hl.alpha = 0.2;
	this.hl.scale.setTo(0.6);
	this.hl.blendMode = 1;

	this.floating = {offset: G.l(-10)};
	game.add.tween(this.floating).to({offset: G.l(10)},700,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	
	this.btn = new G.Button(0,0,'ui_booster_5',this.btnClick,this);
	

	this.btn.sfx = G.sfx.cash_register;
	this.btn.addTerm(function(){return G.lvl.moves < 5});
	this.add(this.btn);

	this.labelBg = G.makeImage(0,45,'move_extra_label',0.5,this);

	G.sb.madeMove.add(function() {
		if (G.lvl.goalAchieved) return;
		if (G.saveState.data.coins >= G.lvl.getPriceOfExtraMoves() && G.lvl.moves == 4) {
			this.show();
		}
	},this);


	G.sb.onWindowOpened.add(function() {
		this.hide();
	},this);

	G.sb.onWindowClosed.add(function() {
		if (!this.visible) {
			if (G.saveState.data.coins >= G.lvl.getPriceOfExtraMoves() && G.lvl.moves <= 4 && G.lvl.moves > 0) {
				this.show();
			}
		}
	},this);

	this.scale.setTo(0);
	this.visible = false;

	G.sb.onGoalAchieved.add(this.hide,this);

};

G.UI_ExtraMovesBuyButton.prototype = Object.create(Phaser.Group.prototype);

G.UI_ExtraMovesBuyButton.prototype.update = function() {

	this.y = this.targetY + this.floating.offset;
	this.hl.angle++;

};

G.UI_ExtraMovesBuyButton.prototype.btnClick = function() {

	if (G.saveState.data.coins >= G.lvl.getPriceOfExtraMoves()) {
		
		var wp = this.worldPosition;

		G.sb.UIfx.dispatch(wp.x+game.world.bounds.x,wp.y,'whiteStarPart');
		G.sb.UIfx.dispatch(wp.x+game.world.bounds.x,wp.y,'whiteStarPart');
		G.sb.UIfx.dispatch(wp.x+game.world.bounds.x,wp.y,'whiteStarPart');
		G.sb.UIfx.dispatch(wp.x+game.world.bounds.x,wp.y,'whiteStarPart');

		G.lvl.buyExtraMoves();
		G.ga.event('Recurring:GetMoreMoves:InGame');

		this.hide();

	}else {
		this.state.windowLayer.pushWindow(['moreMoney']);
	}
			
};

G.UI_ExtraMovesBuyButton.prototype.show = function() {

	//dont show when no money and !incentivised
	if (!game.incentivised && G.saveState.getCoins() < G.lvl.getPriceOfExtraMoves()) return;

	if (this.priceTxt) this.priceTxt.destroy();
	
	this.priceTxt = new G.LabelGroup('$81$'+' '+G.lvl.getPriceOfExtraMoves()+'@coin_1@',5,45,'font-white',30,0.5,0.5,180);

	this.add(this.priceTxt);

	this.visible = true;
	G.stopTweens(this);
	this.scale.setTo(0);
	game.add.tween(this.scale).to({x:1,y:1},2000,Phaser.Easing.Elastic.Out,true);

};


G.UI_ExtraMovesBuyButton.prototype.hide = function() {

	G.stopTweens(this);
	game.add.tween(this.scale).to({x:0,y:0},400,Phaser.Easing.Cubic.Out,true).onComplete.add(function() {
		this.visible = false;
	},this)

};


G.UI_Life = function(x,y) {
	
	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);


	this.lifeIcon = new G.Button(0,0,'heart',function() {
		G.sb.pushWindow.dispatch('buyLives');
	},this);
	this.add(this.lifeIcon);


	this.currentLivesNr = G.saveState.getCurrentLivesNr();
	this.livesMax = G.json.settings.livesMax;

	this.livesNrTxt = new G.OneLineText(0,0,'font-white',this.currentLivesNr.toString(),40,150,0.5,0.5);
	this.add(this.livesNrTxt);


	this.timer = new G.Timer(80,0,'font-white',35,100,0.5,0.5,false);

	this.timerMax = new G.OneLineText(80,0,'font-white',G.txt(69),35,100,0.5,0.5);
	this.add(this.timerMax);

	this.add(this.timer);

	this.timer.start();

	G.sb.onLifeTimerUpdate.add(this.timer.setSecLeft,this.timer);
	G.sb.onWallClockTimeUpdate.add(this.onTickUpdate,this);
	G.sb.onLifeAdded.add(this.onTickUpdate,this);

	G.sb.onWindowOpened.add(this.lockInput,this);
	G.sb.onAllWindowsClosed.add(this.unlockInput,this);


};

G.UI_Life.prototype = Object.create(Phaser.Group.prototype);

G.UI_Life.prototype.onTickUpdate = function(){

	var newCurrentLives = G.saveState.getCurrentLivesNr();

	if (this.currentLivesNr !== newCurrentLives) {
		this.currentLivesNr = newCurrentLives;
		this.livesNrTxt.setText(this.currentLivesNr.toString());
	}

};

G.UI_Life.prototype.update = function() {

	if (this.currentLivesNr !== this.livesMax) {
		this.timer.visible = true;
		this.timerMax.visible = false;
	}else {
		this.timer.visible = false;
		this.timerMax.visible = true;
	}

	if (this.currentLivesNr === 0) {
		this.lifeIcon.inputEnabled = true;
	}else {
		this.lifeIcon.inputEnabled = false;
	}

};

G.UI_Life.prototype.lockInput = function() {
	this.ignoreChildInput = true;
};

G.UI_Life.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
}
G.UI_PopOutMoney = function() {
	
	Phaser.Image.call(this,game,0,0,null);

	this.state = game.state.getCurrentState();
	this.double = this.state.doubleMoney;

	G.changeTexture(this,this.double ? 'coin_2' : 'coin_1');
	this.anchor.setTo(0.5);
	this.kill();


};

G.UI_PopOutMoney.prototype = Object.create(Phaser.Image.prototype);

G.UI_PopOutMoney.prototype.init = function(x,y) {

	G.stopTweens(this);
	this.revive();

	G.saveState.changeCoins(this.double ? 2 : 1);
	G.sb.onLevelMoneyGain.dispatch(this.double ? 2 : 1);
	G.sfx.cash_register.play();

	this.x = x;
	this.y = y;

	this.scale.setTo(0);
	this.angle = -10;

	game.add.tween(this).to({y: this.y-G.l((Math.random()*20)+30)},500,Phaser.Easing.Cubic.InOut,true,0,0,true);

	game.add.tween(this.scale).to({x: 1,y:1},500,Phaser.Easing.Cubic.InOut,true,0,0,true).onComplete.add(this.kill,this);


};

G.UI_ShoutOuts = function(){ 

	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();
	this.board = this.state.board;

	this.glowImg = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glowImg.alpha = 0.5;
	this.glowImg.visible = false;

	this.shoutOut = G.makeImage(0,0,null,0.5,this);
	this.shoutOut.visible = false;

	this.combo = 0;
	G.sb.onComboIncrease.add(this.increaseCombo,this);
	G.sb.onComboBreak.add(this.breakCombo,this);

	G.sb.onGoalAchieved.add(this.cookieCrush,this);

	G.sb.madeMove.add(function() {

		if (G.lvl.goalAchieved) return;

		if (G.lvl.moves == 10) {
			this.lockedShoutOut('10_moves_left');
		}
		if (G.lvl.moves == 5) {
			this.lockedShoutOut('5_moves_left');
		}
	},this);

	this.locked = false;

	this.board = game.state.getCurrentState().board;
	this.x = this.board.x+this.board.width*0.5;
	this.y = this.board.y+this.board.height*0.45;


};

G.UI_ShoutOuts.prototype = Object.create(Phaser.Group.prototype);


G.UI_ShoutOuts.prototype.update = function() {

	this.x = this.board.x+this.board.width*0.5;
	this.y = this.board.y+this.board.height*0.45;

	this.glowImg.angle++;

};

G.UI_ShoutOuts.prototype.increaseCombo = function(newAmount) {

	if (this.locked) return;
	if (G.lvl.goalAchieved) return;

	this.combo = newAmount;

	var txt = false;
	if (this.combo == 3) txt = 'good';
	if (this.combo == 5) txt = 'nice';
	if (this.combo >= 7) txt = 'amazing';
	if (this.combo >= 9) txt = 'excellent';
	if (this.combo == 11) txt = 'cookielicious';


	if (!txt) return;

	G.stopTweens(this.shoutOut);

	this.shoutOut.visible = true;
	
	this.shoutOut.alpha = 1;
	G.changeTexture(this.shoutOut,txt);
	this.shoutOut.scale.setTo(0);


	game.add.tween(this.shoutOut.scale).to({x:1,y:1},700,Phaser.Easing.Elastic.Out,true);
	game.add.tween(this.shoutOut).to({alpha: 0}, 300, Phaser.Easing.Sinusoidal.In,true,1000).onComplete.add(function() {
		this.shoutOut.visible = false;
	},this);

};

G.UI_ShoutOuts.prototype.lockedShoutOut = function(sprite) {

	this.locked = true;

	G.stopTweens(this.shoutOut);
	this.shoutOut.visible = true;
	
	this.shoutOut.alpha = 1;
	G.changeTexture(this.shoutOut,sprite);
	this.shoutOut.scale.setTo(0);
	game.add.tween(this.shoutOut.scale).to({x:1,y:1},700,Phaser.Easing.Elastic.Out,true);
	game.add.tween(this.shoutOut).to({alpha: 0}, 300, Phaser.Easing.Sinusoidal.In,true,1500).onComplete.add(function() {
		this.shoutOut.visible = false;
		this.locked = false;
	},this);

};

G.UI_ShoutOuts.prototype.cookieCrush = function() {

	this.glowImg.scale.setTo(0);
	this.glowImg.visible = true;

	game.add.tween(this.glowImg.scale).to({x:1.5,y:1.5},500,Phaser.Easing.Elastic.Out,true);
	game.add.tween(this.glowImg).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true,1500);

	G.stopTweens(this.shoutOut);
	this.shoutOut.visible = true;
	
	this.shoutOut.alpha = 1;
	G.changeTexture(this.shoutOut,'cookie_crush');
	this.shoutOut.scale.setTo(0);
	game.add.tween(this.shoutOut.scale).to({x:1,y:1},700,Phaser.Easing.Elastic.Out,true);
	game.add.tween(this.shoutOut).to({alpha: 0}, 300, Phaser.Easing.Sinusoidal.In,true,1500).onComplete.add(function() {
		this.shoutOut.visible = false;
	},this);

	for (var i = 0; i < 10; i++) {
		G.sb.UIfx.dispatch(this.x-100+(i*20),this.y,'whiteStarPart');
	}

};

G.UI_ShoutOuts.prototype.breakCombo = function() {

	this.combo = 0;
	
};

G.UI_StartBoosterButton = function(x,y,nr,lvlNr) {
	
	Phaser.Group.call(this,game);

	this.unlocked = G.saveState.isBoosterUnlocked(nr);

	this.x = G.l(x);
	this.y = G.l(y);
	this.nr = nr;
	this.lvlNr = lvlNr; 

	if (this.unlocked) {

		this.initUnlocked(nr,lvlNr);

		if (G.saveState.data.startBoosterAnim[nr-5]) {
			G.saveState.data.startBoosterAnim[nr-5] = false;
			G.saveState.save();
			this.initUlockAnimation();
		}


		//this.initUlockAnimation();


	}else {

		this.img = G.makeImage(0,0,'ui_booster_'+nr+'_locked',0.5,this);
	}

};

G.UI_StartBoosterButton.prototype = Object.create(Phaser.Group.prototype);


G.UI_StartBoosterButton.prototype.update = function() {

	if (this.hl) {
		this.hl.angle++;
		this.hl.alpha = game.math.clamp(this.hl.alpha+(this.selected ? 0.05 : -0.05),0,0.6);
		this.priceTxt.alpha = game.math.clamp(this.priceTxt.alpha+(this.amount == 0 && !this.selected ? 0.05 : -0.05),0,1);
	}

	for (var i = this.children.length; i--; ){
		this.children[i].update();
	}

};


G.UI_StartBoosterButton.prototype.select = function() {

	this.startBoosterConfig.select(this.levelNr,this.boosterNr);
	this.selected = true;
	this.amount--;
	this.amountTxt.setText(this.amount.toString());

};

G.UI_StartBoosterButton.prototype.deselect = function() {

	this.startBoosterConfig.deselect(this.levelNr,this.boosterNr);
	this.selected = false;
	this.amount++;
	this.amountTxt.setText(this.amount.toString());

};


G.UI_StartBoosterButton.prototype.initUnlocked = function(nr,lvlNr) {


	this.startBoosterConfig = game.state.getCurrentState().startBoosterConfig;

	this.boosterNr = nr;
	this.levelNr = lvlNr;

	this.hl = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.hl.scale.setTo(0.6);
	this.hl.blendMode = 1;
	this.hl.angle = Math.random()*360;
	this.hl.alpha = 0;

	this.btn = new G.Button(0,0,'ui_booster_'+nr,function() {
		if (this.selected) {
			this.deselect();
		}else {
			if (this.amount > 0) {
				this.select(); 
			}else {

				if (G.saveState.isEnoughToBuyBooster(this.boosterNr)) {
					
					G.saveState.buyBooster(this.boosterNr);
					this.amount++;
					this.amountTxt.setText(this.amount.toString());

				}else {
					if (game.incentivised){

						this.parent.state.windowLayer.pushWindow(['moreMoney','level']);
						this.parent.closeWindow();

					}else{

						this.alpha = 0.5;
						this.btn.inputEnabled = false;

					}
				}
				
			}
		}
	},this);
	this.add(this.btn);


	this.selected = false;

	this.amountBg = G.makeImage(-40,-40,'booster_ammount',0.5,this);

	this.amount = G.saveState.getBoosterAmount(nr);
	this.amountTxt = new G.OneLineText(-40,-40,'font-blue',this.amount.toString(),25,100,0.5,0.5);
	this.add(this.amountTxt);

	this.priceTxt = new G.LabelGroup(G.json.settings['priceOfBooster'+this.boosterNr]+'@coin_1@',10,45,'font-num-blue',30,0.5,0.5,100);
	this.add(this.priceTxt);

	if (this.amount > 0) {
		this.priceTxt.alpha = 0;
	}

	if (this.startBoosterConfig.isSelected(this.levelNr,this.boosterNr)) {
		this.select();
	}


	if (this.amount == 0 && !game.incentivised && G.saveState.getCoins() < G.json.settings['priceOfBooster'+this.boosterNr]){
		this.alpha = 0.5;
		this.btn.inputEnabled = false;
	}

};


G.UI_StartBoosterButton.prototype.initUlockAnimation = function() {

	this.ignoreChildInput = true;
	this.amountTxt.alpha = 0;
	this.amountBg.alpha = 0;

	var delay = 500;
	//this.amountTxt.setText(0);

	var circle = G.makeImage(0,0,'circle',0.5,this);
	var orgW = circle.width;
	var orgH = circle.height;
	circle.scale.setTo(0);
	circle.blendMode = 1;
	game.add.tween(circle).to({
		width: orgW*2,
		height: orgH*2,
		alpha: 0
	},600,Phaser.Easing.Cubic.Out,true,delay);

	game.time.events.add(delay,function() {

		G.sfx.match_1.play();

		for (var i = 0; i < 5; i++) {
			var start = G.makeImage(0,0,'starPart',0.5,this);
			start.angle = Math.random()*360;
			start.velX = Math.random(20)*G.lnf(-20)+G.lnf(10);
			start.velY = Math.random()*G.lnf(-9)-G.lnf(3);
			start.gravity = G.lnf(0.5);
			start.update = function() {
				this.x += this.velX*G.deltaTime;
				this.y += this.velY*G.deltaTime;
				this.angle += this.velX * 0.1;
				this.velX *= 0.99;
				this.velY += this.gravity*G.deltaTime;
				this.alpha -= 0.02;
				if (this.alpha <= 0) this.kill();
			}
		}

		game.add.tween(this.amountTxt).to({alpha:1},300,Phaser.Easing.Sinusoidal.Out,true);
		game.add.tween(this.amountBg).to({alpha:1},300,Phaser.Easing.Sinusoidal.Out,true);
		this.ignoreChildInput = false;

		//this.amountTxt.setText(G.json.settings.boostersOnStart);

	},this)
	

	this.lock = G.makeImage(0,0,'ui_booster_'+this.nr+'_locked',0.5,this);
	game.add.tween(this.lock).to({alpha:0},500,Phaser.Easing.Sinusoidal.InOut,true,delay);

};


G.WorldMapChestLayer = function(map) {
		
	Phaser.Group.call(this,game);

	this.position = map.position;


	G.json.settings.mapChests.forEach(function(chest){

		if (G.saveState.data.mapChests[chest.id]) return;

		this.add(new G.WorldMapChestLayer.Chest(chest));

	},this);

	G.sb.onWindowOpened.add(this.lockInput,this); 
	G.sb.onWindowClosed.add(this.unlockInput,this);

};

G.WorldMapChestLayer.prototype = Object.create(Phaser.Group.prototype);


G.WorldMapChestLayer.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
	this.children.forEach(function(child){child.ignoreChildInput = false});
};

G.WorldMapChestLayer.prototype.lockInput = function() {
	this.ignoreChildInput = true;
	this.children.forEach(function(child){child.ignoreChildInput = true});
};




G.WorldMapChestLayer.Chest = function(chestData) {
	
	Phaser.Group.call(this,game);

	this.chestData = chestData;

	this.state = game.state.getCurrentState();

	this.shadow = G.makeImage(0,40,'chest_shadow',0.5,this);

	this.x = G.l(chestData.mapX);
	this.y = G.l(chestData.mapY);

	this.orgX = this.x;
	this.orgY = this.y;

	this.opened = false;


	this.currentStars = G.saveState.getAllStars();

	var currentStart = Math.min(this.currentStars,this.chestData.req);

	this.unlocked = this.currentStars >= chestData.req;

	this.gift = new G.Button(0,0,'chest',this.onClick,this);

	this.add(this.gift);
	this.gift.scale.x = this.x < 0 ? -1 : 1;
	this.shadow.scale.x = this.gift.scale.x;

	if (this.unlocked) {

		this.gift.tweenScale = {
			x: this.gift.scale.x,
			y: this.gift.scale.y
		};

		this.glow = G.makeImage(10,-20,'popup_lighht',0.5,this);
		this.glow.update = function(){this.angle++};
		this.glow.scale.setTo(0.75);
		this.glow.blendMode = 1;
		this.glow.alpha = 0;

		this.giftGlow = G.makeImage(0,0,'chest',0.5,this.gift);
		this.giftGlow.blendMode = 1;
		this.giftGlow.alpha = 0.4;
		game.add.tween(this.giftGlow).to({alpha:0},500,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

		this.jump();

	}else {

		this.gift.IMMEDIATE = true;

		this.label = new G.LabelGroup(currentStart+'/'+this.chestData.req+'@map_star_1@',0,50,'font-white',40,0.5,0.5,150);
		this.add(this.label);

	}


};

G.WorldMapChestLayer.Chest.prototype = Object.create(Phaser.Group.prototype);

G.WorldMapChestLayer.Chest.prototype.onClick = function() {
	
	if (this.currentStars >= this.chestData.req) {

		G.changeTexture(this.gift,'chest_open');
		G.changeTexture(this.giftGlow,'chest_open');

		this.opened = true;

		G.saveState.data.mapChests[this.chestData.id] = true;
		G.saveState.save();

		this.gift.inputEnabled = false;
		game.add.tween(this.glow).to({alpha:0.2},300,Phaser.Easing.Sinusoidal.InOut,true);

		G.sb.pushWindow.dispatch(['mapChest',this.chestData.gifts]);
		//G.ga.event('Source:Coins:Gift:MapChest',this.chestData.coins);
		
		game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.InOut,true,1000).onComplete.add(function() {
			this.destroy();
		},this);

	}else {

		this.gift.inputEnabled = false;

		var moveTweenA = game.add.tween(this.gift).to({y: -G.l(150)},300,Phaser.Easing.Cubic.Out);
		var moveTweenB = game.add.tween(this.gift).to({y: 0},300,Phaser.Easing.Circular.In);
		moveTweenA.chain(moveTweenB);
		moveTweenA.start();

		var tweenAngleA = game.add.tween(this.gift).to({angle: -15},200,Phaser.Easing.Cubic.InOut);
		var tweenAngleB = game.add.tween(this.gift).to({angle: 15},375,Phaser.Easing.Sinusoidal.In);
		var tweenAngleC = game.add.tween(this.gift).to({angle: 0},50,Phaser.Easing.Cubic.InOut);

		tweenAngleC.onComplete.add(function(){
			this.gift.inputEnabled = true;
			this.gift.input.useHandCursor = true;
		},this);

		tweenAngleA.chain(tweenAngleB,tweenAngleC);
		tweenAngleA.start();

	}

};

G.WorldMapChestLayer.Chest.prototype.update = function() {


	if (this.glow) this.glow.update();
 
	this.shadow.alpha = 1+((this.gift.y/150));


	var scale = (1-((this.gift.y/150)*0.1))*-1;
	this.shadow.scale.x = scale*this.gift.scale.x*-1;
	this.shadow.scale.y = Math.abs(scale);


};

G.WorldMapChestLayer.Chest.prototype.jump = function() {

	if (this.opened) return;

	var moveTweenA = game.add.tween(this.gift).to({y: -G.l(150)},300,Phaser.Easing.Cubic.Out);
	var moveTweenB = game.add.tween(this.gift).to({y: 0},300,Phaser.Easing.Circular.In);
	moveTweenA.chain(moveTweenB);
	moveTweenA.start();

	var tweenAngleA = game.add.tween(this.gift).to({angle: -15},200,Phaser.Easing.Cubic.InOut);
	var tweenAngleB = game.add.tween(this.gift).to({angle: 15},375,Phaser.Easing.Sinusoidal.In);
	var tweenAngleC = game.add.tween(this.gift).to({angle: 0},50,Phaser.Easing.Cubic.InOut);

	tweenAngleA.chain(tweenAngleB,tweenAngleC);
	tweenAngleA.start();

	game.time.events.add(2000,this.jump,this);

}
G.WorldMapCloudLayer = function(map) {
	
	Phaser.Group.call(this,game);

	this.position = map.position;

	this.init();

	this.minGateY = null;



	//G.sb.onWindowOpened.add(this.lockInput,this); 
	//G.sb.onWindowClosed.add(this.unlockInput,this);

};

G.WorldMapCloudLayer.prototype = Object.create(Phaser.Group.prototype);



G.WorldMapCloudLayer.prototype.init = function() {

	G.json.settings.gates.forEach(function(gate){ 
		G.saveState.checkGate(gate);

		if (!G.json.levels[gate.lvlNr-1]) return;

		var savedGateData = G.saveState.getGateData(gate.id);
		if (savedGateData.open) return;

		this.add(new G.WorldMapCloudLayer.CloudWall(gate.lvlNr-1,savedGateData));

	},this); 

};


G.WorldMapCloudLayer.CloudWall = function(lvlIndex,savedGateData){

	Phaser.Group.call(this,game);

	this.savedGateData = savedGateData;

	this.y = G.json.levels[lvlIndex].mapY - 370;

	this.cloud1 = G.makeImage(-450,0,'cloud_1',0.5,this);
	this.cloud1.scale.setTo(2);
	var c1tween = game.add.tween(this.cloud1.scale).to({x:2.1,y:2.1},4000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	c1tween.timeline[0].dt = 2000;

	this.cloud1.alpha = 0.95;

	this.cloud2 = G.makeImage(0,50,'cloud_1',0.5,this);
	this.cloud2.scale.setTo(2);
	var c2tween = game.add.tween(this.cloud2.scale).to({x:2.1,y:2.1},8000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	c2tween.timeline[0].dt = 3000;

	this.cloud2.alpha = 0.95;

	this.cloud3 = G.makeImage(450,0,'cloud_1',0.5,this);
	this.cloud3.scale.setTo(-2,2); 
	var c3tween = game.add.tween(this.cloud3.scale).to({x:-2.1,y:2.1},6000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	c3tween.timeline[0].dt = 1500;

	this.cloud3.alpha = 0.95;

	this.fading = false;
};

G.WorldMapCloudLayer.CloudWall.prototype = Object.create(Phaser.Group.prototype);

G.WorldMapCloudLayer.prototype.update = function(){

	for (var i = 0; i < this.length; i++) {
		this.children.visible = i == 0;
		this.children[i].update();
	}

};

G.WorldMapCloudLayer.CloudWall.prototype.fadeAway = function(){

	if (this.fading) return;

	this.fading = true;

	game.add.tween(this.cloud1).to({x: -900,y:50},3000,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this.cloud3).to({x: 900,y:50},3000,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this.cloud2).to({alpha: 0},3000,Phaser.Easing.Sinusoidal.Out,true);

	game.add.tween(this).to({alpha:0},2000,Phaser.Easing.Sinusoidal.In,true,1000).onComplete.add(function(){
		this.destroy();
	},this);

};

G.WorldMapCloudLayer.CloudWall.prototype.update = function(){

	if (!this.fading && this.savedGateData.open){
		this.fadeAway();
	}

};
G.WorldMapGateLayer = function(map) {
	
	Phaser.Group.call(this,game);

	this.position = map.position;

	this.init();

	this.minGateY = null;



	G.sb.onWindowOpened.add(this.lockInput,this); 
	G.sb.onWindowClosed.add(this.unlockInput,this);

};

G.WorldMapGateLayer.prototype = Object.create(Phaser.Group.prototype);


G.WorldMapGateLayer.prototype.getMinY = function(){

	if (this.children.length == 0) {
		return Infinity;
	}

	var min = -Infinity;

	for (var i = 0; i < this.length; i++){
		if (this.children[i].y > min){
			min = this.children[i].y;
		}	
	};

	return min*-1;


};

G.WorldMapGateLayer.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
	this.children.forEach(function(child){child.ignoreChildInput = false});
};

G.WorldMapGateLayer.prototype.lockInput = function() {
	this.ignoreChildInput = true;
	this.children.forEach(function(child){child.ignoreChildInput = true});
};


G.WorldMapGateLayer.prototype.init = function() {

	G.json.settings.gates.forEach(function(gate){ 
		G.saveState.checkGate(gate);

		if (!G.json.levels[gate.lvlNr-1]) return;

		var savedGateData = G.saveState.getGateData(gate.id);
		if (savedGateData.open) return;

		this.add(new G.WorldMapGateLayer.Gate(gate));

	},this); 

};

G.WorldMapGateLayer.Gate = function(gateData) {

	Phaser.Group.call(this,game);

	this.gate = gateData;
	this.lvlIndex = this.gate.lvlNr-1;

	this.savedData = G.saveState.getGateData(gateData.id);
	var level =  G.json.levels[this.lvlIndex];

	this.x = G.l(level.mapX);
	this.y = G.l(level.mapY);

	this.gateImg = G.makeImage(0,20,'gate',[0.5,1],this);

	this.active = this.lvlIndex <= G.saveState.getLastPassedLevelNr();

	if (this.active) {

		G.saveState.activateGate(gateData);

		this.unlockBtn = new G.Button(10,30,'btn_chest_gate',function() {

			if (this.savedData.readyToOpen){
				console.log('opening readyToOpen');
				G.saveState.openGate(this.gate.id);
			}else { 
				G.sb.pushWindow.dispatch(['gate',this.gate]);
			}
			
		},this);
		this.unlockBtn.addTextLabel('font-white',G.txt(68));
		this.unlockBtn.label.x += G.l(5);
		this.add(this.unlockBtn);

		

		if (this.savedData.readyToOpen){
			this.unlockBtn.x = 0;
			this.unlockBtn.pulse();
		}else {
			this.lockImg = G.makeImage(-65,15,'lock',0.5,this);
			/*game.time.events.add(1,function(){
				G.sb.pushWindow.dispatch(['gate',this.gate]);
			},this);*/
		}
	}

	this.bursedParts = false;

};


G.WorldMapGateLayer.Gate.prototype = Object.create(Phaser.Group.prototype);

G.WorldMapGateLayer.Gate.prototype.update = function() {

	if (this.savedData.open) {

		if (!this.bursedParts) {
			this.bursedParts = true;

			for (var i = 0; i < 10; i++){
				G.sb.fxMap.dispatch('star',{
					x: this.worldPosition.x,
					y: this.worldPosition.y
				});
			}

		}

		this.alpha -= 0.05;
		if (this.alpha <= 0) {
			this.destroy();
		}
	}

};

G.WorldMapPack = function(x,y) {
	
	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);

	var activePack = G.json.settings.packs.find(function(pack){
		return G.saveState.isPackActive(pack);
	});

	if (activePack) {
		this.initPack(activePack);
	}else {
		//there is no active pack
		console.log('there is no pack');
		return;
	}


	G.sb.onWindowOpened.add(this.lockInput,this); 
	G.sb.onWindowClosed.add(this.unlockInput,this);
	G.sb.onStarterPackBought.add(function(){
		game.add.tween(this).to({y:140},400,Phaser.Easing.Sinusoidal.Out,true);
	},this);

	if (!G.saveState.data.sawPackTut) {
		this.tutHand = G.makeImage(0,20,'tut_hand',0,this);
		game.add.tween(this.tutHand).to({x:G.l(20),y:G.l(50)},300,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	}

	G.sb.onScreenResize.add(this.onResize,this);
	this.onResize();

};

G.WorldMapPack.prototype = Object.create(Phaser.Group.prototype);

G.WorldMapPack.prototype.onResize = function(){
	if (G.horizontal){
		this.x = -200;
	}else{
		this.x = 60;
	}
};

G.WorldMapPack.prototype.initPack = function(activePack){

	this.activePack = activePack;

	this.currentStage = G.saveState.getPackStage(activePack);

	this.glow = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glow.update = function(){this.angle++};
	this.glow.scale.setTo(0.5);
	this.glow.alpha = 0.25;
	this.glow.blendMode = 1;

	this.giftBtn = new G.Button(-7,0,'promo_pack',function(){
		G.saveState.data.sawPackTut = true;
		G.saveState.save();
		G.sb.pushWindow.dispatch(['pack',this.activePack]);

		if (this.tutHand) {
			this.tutHand.destroy();
		}
	},this);
	this.add(this.giftBtn);

	var saveData = G.saveState.getPackSaveData(this.activePack.id);
	var secLeft = (this.activePack.timeMinutes*60) - ((Date.now()-saveData.activationTime)/1000);

	//this.timerBg = G.makeImage(0,40,'promo_pack_timerbg',0.5,this);

	var lblSprite = 'lbl_50%';

	if (this.currentStage.promo) {
		if (this.currentStage.promo == 60) lblSprite = 'lbl_60%';
		if (this.currentStage.promo == 70) lblSprite = 'lbl_70%';
	}

	this.lblPromo = G.makeImage(-35,30,lblSprite,0.5,this.giftBtn);

	this.timer = new G.Timer(0,60,'font-num-orange',30,150,0.5,0.5,secLeft);
	this.add(this.timer);
	this.timer.start();

	this.update = function(){
		this.glow.angle++;

		if (!G.saveState.isPackActive(this.activePack)) {
			this.alpha-=0.05;
			if (this.alpha <= 0) {
				this.destroy();
			}
		}
	}

};


G.WorldMapPack.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
};

G.WorldMapPack.prototype.lockInput = function() {
	this.ignoreChildInput = true;
};



G.WorldMapSocialLayer = function(worldMap,userList) {
	
	Phaser.Group.call(this,game);

	this.position = worldMap.position;

	this.initLabels(G.platform.friendsWithLevelsList);

};

G.WorldMapSocialLayer.prototype = Object.create(Phaser.Group.prototype);


G.WorldMapSocialLayer.prototype.initLabels = function(userList) {

	if (!userList) return;

	var usedLvls = [];

	for (var i = 0; i < userList.length; i++) {

		var user = userList[i];

		if (user.levelOnMap !== undefined && usedLvls[user.levelOnMap] !== 3 && user.avatar !== 'http://vk.com/images/camera_50.png') {

			if (usedLvls[user.levelOnMap] === undefined) {
				usedLvls[user.levelOnMap] = 0;
			}

			var extraOffset = usedLvls[user.levelOnMap]*30;
			usedLvls[user.levelOnMap]++;

			var lvlData = G.json.levels[user.levelOnMap-1];

			usedLvls.push(user.levelOnMap);
			
			this.add(new G.WorldMapSocialLayer.MapLabel(lvlData.mapX,lvlData.mapY,user.avatar,extraOffset));


		}
	
	}

};



G.WorldMapSocialLayer.MapLabel = function(x,y,imgUrl,extraOffset) {


	var placeSign = x < 0 ? 1 : -1;
	extraOffset = extraOffset || 0;

	Phaser.Image.call(this,game,G.l(x) + G.l((80+extraOffset)*placeSign),G.l(y-20));
	this.anchor.setTo(0.5,0.5);
	this.orgX = G.l(x)+G.l((80+extraOffset)*placeSign);
	this.tweenOffsetX = 0;

	game.add.tween(this).to({tweenOffsetX: G.l(15)},800,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

	// /(x,y,url,waitImg,anchor,groupToAdd,tmp,func)
	this.avatar = G.makeExtImage(0,0,imgUrl,null,0.5,this,false,function(){
		this.width = 50;
		this.height = 50;
	});

	this.border = G.makeImage(0,0,'avatar_frame',0.5,this);


	//G.changeTexture(this,'map_avatar_label');

};

G.WorldMapSocialLayer.MapLabel.prototype = Object.create(Phaser.Image.prototype);

G.WorldMapSocialLayer.MapLabel.prototype.update = function() {

	this.x = this.orgX + (this.tweenOffsetX*this.scale.x);

};

G.WorldMapStarterPack = function(x,y) {

	this.state = game.state.getCurrentState();		

	if (!G.saveState.data.sawPackTut) {
		this.state.makeBlackOverlay();
	}

	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);


	G.sb.onWindowOpened.add(this.lockInput,this); 
	G.sb.onWindowClosed.add(this.unlockInput,this);
	G.sb.onStarterPackBought.add(function(){
		this.giftBtn.inputEnabled = false;
	},this);

	this.initPack(G.json.settings.starterPack);

	if (!G.saveState.data.sawPackTut) {
		G.saveState.data.sawPackTut = true;
		G.saveState.save();
		this.tutHand = G.makeImage(0,20,'tut_hand',0,this);
		game.add.tween(this.tutHand).to({x:G.l(20),y:G.l(50)},300,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	}

	G.sb.onScreenResize.add(this.onResize,this);
	this.onResize();

};

G.WorldMapStarterPack.prototype = Object.create(Phaser.Group.prototype);


G.WorldMapStarterPack.prototype.onResize = function(){
	if (G.horizontal){
		this.x = -200;
	}else{
		this.x = 60;
	}
};

G.WorldMapStarterPack.prototype.initPack = function(activePack){

	this.activePack = activePack;

	this.glow = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glow.update = function(){this.angle++};
	this.glow.scale.setTo(0.5);
	this.glow.alpha = 0.25;
	this.glow.blendMode = 1;

	this.giftBtn = new G.Button(0,0,'chest_sale',function(){
		G.sb.pushWindow.dispatch(['starterPack',this.activePack]);
		if (this.tutHand) {
			this.tutHand.destroy();
		}
	},this);
	this.add(this.giftBtn);

	var saveData = G.saveState.getPackSaveData(this.activePack.id);
	var secLeft = (this.activePack.timeMinutes*60) - ((Date.now()-saveData.activationTime)/1000);

	this.update = function(){
		this.glow.angle++;

		if (G.saveState.data.starterPackBought) {
			this.alpha-=0.05;
			if (this.alpha <= 0) {
				this.destroy();
			}
		}
	}

};


G.WorldMapStarterPack.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
};

G.WorldMapStarterPack.prototype.lockInput = function() {
	this.ignoreChildInput = true;
};



G.LevelBg = function(lvl_gfx) {

	Phaser.Image.call(this,game,0,0);
	this.anchor.setTo(0.5);

	G.changeTexture(this,'background_1');

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

	game.add.existing(this);

};

G.LevelBg.prototype = Object.create(Phaser.Image.prototype);

G.LevelBg.prototype.onScreenResize = function() {

	this.x = game.world.bounds.x+game.width*0.5; 
	this.y = game.world.bounds.y+game.height*0.5;

	this.scale.setTo(1);

	this.width = Math.max(this.width,game.width);
	this.height = Math.max(this.height,game.height);
	this.width+=10;
	this.height+=10;

	this.updateCache();

};
if (typeof G == 'undefined') G = {};
 
G.Logo = function(x,y) {

	Phaser.Group.call(this,game);
	

	this.shine = G.makeImage(0,0,'shine_title',[0.5,0.5],this);
	this.shine.scale.setTo(2);
	this.shine.update = function(){
		this.angle += 0.17;
	}

	this.donut = G.makeImage(0,0,'donut_title',[0.5,0.5],this);

	this.wheel = G.makeImage(0,0,'whell_1',0.5,this);

	this.wheel.update = function() {
		this.angle+=0.22;
	};

	this.wheel2 = G.makeImage(0,0,'whell_2',0.5,this);
	this.wheel2.update = function() {
		this.angle+=0.12;
	};


	//this.angle = -8;
	//game.add.tween(this).to({angle: 8},10000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	

	this.x = G.l(x);
	this.y = G.l(y);

	this.logo = G.makeImage(0,0,'logo',0.5,this);

	game.add.tween(this.logo.scale).to({x:1.05,y:1.05},3000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);




};

G.Logo.prototype = Object.create(Phaser.Group.prototype);


G.Logo.prototype.startGlow = function() {

	game.add.tween(this.logoGlow).to({alpha: 0.5}, 1000+Math.random()*1000, Phaser.Easing.Sinusoidal.InOut,true,0,0,true).onComplete.add(function() {
		game.time.events.add(1500+Math.floor(Math.random()*1500),this.startGlow,this);
	},this)

};

G.Logo.prototype.startPartGlow = function() {

	this.glows[this.currentGlow++ % this.glows.length].start();

	game.time.events.add(2000+(Math.floor(Math.random()*1000)),this.startPartGlow,this);

};

G.MoreGamesBtn = function(x,y) {

	G.Button.call(this,x,y,'btn_moregames',function() {
		try{
			// SG.redirectToPortal();
		}catch(e){};
	});

	game.add.existing(this);

};

G.MoreGamesBtn.prototype = Object.create(G.Button.prototype);

G.PointsLayer = function(topBar) {

	Phaser.Group.call(this,game);

	this.progressBar = topBar.progressBar;

	G.sb.displayPoints.add(this.onPointMade,this);

	this.deadArray = [];


};

G.PointsLayer.prototype = Object.create(Phaser.Group.prototype);

G.PointsLayer.prototype.getFreeText = function() {
	var part;

	if (this.deadArray.length > 0) {
		part = this.deadArray.pop();
	}else {
		part = new G.OneLineText(0,0,'font-blue','0',50,500,0.5,0.5); 
		part.events.onKilled.add(this.onElemKilled,this);
	}

	this.add(part);
	return part;

};


G.PointsLayer.prototype.onElemKilled = function(elem) {
	if (this !== elem.parent) return;
	this.deadArray.push(elem);
	this.removeChild(elem)

};

G.PointsLayer.prototype.onPointMade = function(x,y,amount,color) {


	var txt = this.getFreeText();

	txt.revive();
	
	txt.target = this.progressBar;


	if (color) {
		txt.font = game.cache.checkBitmapFontKey('font-score-'+color) ? 'font-score-'+color : 'font-score-0';
	}else {
		txt.font = 'font-score-0';
	}

	txt.x = x;
	txt.y = y;
	txt.scale.setTo(1);
	txt.alpha = 1;
	txt.setText('+'+amount.toString());


	game.add.tween(txt.scale).from({x:0,y:0},300,Phaser.Easing.Bounce.InOut,true).onComplete.add(function() {

		var targetX =	this.target.worldPosition.x+game.world.bounds.x;
		var targetY = this.target.worldPosition.y;

		var time = 500;

		game.add.tween(this).to({x:targetX,y:targetY},time,Phaser.Easing.Sinusoidal.InOut,true);
		//game.add.tween(this.scale).to({x:2,y:2},300,Phaser.Easing.Cubic.In,true,1000);
		game.add.tween(this.scale).to({x:0,y:0},300,Phaser.Easing.Cubic.In,true,time).onComplete.add(function() {
			this.kill();
		},this)
	},txt);

	/*txt.scale.setTo(0);
	txt.revive();

	game.add.tween(txt.scale).to({x:1,y:1},500,Phaser.Easing.Bounce.InOut,true);
	game.add.tween(txt).to({alpha:0},200,Phaser.Easing.Sinusoidal.In,true,1000).onComplete.add(function() {
		txt.kill();
	});
	*/

};
G.saveState = {

    makeNewDataObject: function() {
        var obj =  {
            coins: G.json.settings.coinsOnStart,
            lives: G.json.settings.livesOnStart,

            lastRefillDate: Date.now(),

            mapVisibleCounter: 0,
            lastDaily: Date.now(),
            lastGiftCheck: 0,

            firstTimeBtn: [false,false],
            freeSpin: true,
            levels: [],
            points: [],
            gates: [],
            sentLives: {},
            packs: [],
            items: [],
            mapChests: [],
            boosters: [],
            globalGoals: [],
            finishedTutorials: [],
            startBoosterAnim: [true,true,true,true],
            mute: false,
            version: 1,

            whatsNewSaw: []
        }

        for (var i = 0; i < 10; i++) {
            obj.boosters[i] =  G.json.settings.boostersOnStart;
        }

        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(1)+':Gift:FirstTry',G.json.settings.boostersOnStart);
        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(2)+':Gift:FirstTry',G.json.settings.boostersOnStart);
        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(3)+':Gift:FirstTry',G.json.settings.boostersOnStart);
        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(4)+':Gift:FirstTry',G.json.settings.boostersOnStart);
        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(5)+':Gift:FirstTry',G.json.settings.boostersOnStart);
        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(7)+':Gift:FirstTry',G.json.settings.boostersOnStart);
        G.ga.event('Source:booster'+G.saveState.nrToBoosterName(8)+':Gift:FirstTry',G.json.settings.boostersOnStart);

        G.firstTimePlay = true;

        return obj;

    },

    increaseMapVisibleCounter: function() {

        this.data.mapVisibleCounter++;

        if (this.data.mapVisibleCounter == 1) {
            G.ga.event('FTUE:Map:FirstTime:Visible');
        }

        if (this.data.mapVisibleCounter == 2) {
            G.ga.event('FTUE:Map:SecondTime:Visible');
        }

        this.save();

    },

    isPackActive: function(packData) {

        var saveData = this.getPackSaveData(packData.id);

        var payGroup = this.data.payingUser || false;
        //check if pack is only for paying/nonpaying

        if (packData.group){
            if (packData.group == "paying" && !payGroup){
                return false;
            }
            if (packData.group == 'nonPaying' && payGroup){
                return false;
            }
        }

        //if pack was not activated and level req is met- activate it
        if (this.getLastPassedLevelNr() >= packData.afterLvlNr && !saveData.activationTime) {
            saveData.activationTime = Date.now();
            this.save();
        }

        return (this.getLastPassedLevelNr() >= packData.afterLvlNr
            && !saveData.bought
            && (Date.now()-saveData.activationTime) < packData.timeMinutes*60*1000);

    },

    getPackStage: function(packData){

        var saveData = G.saveState.getPackSaveData(packData.id);

        var timeDiffMin = ((Date.now()-saveData.activationTime)/1000)/60;

        var stages = packData.stages[this.data.payingUser ? 'payingUser' : 'nonPayingUser'];
        
        var result;
        var currentTime = 0;


        for (var i = 0; i < stages.length; i++){
            var stage = stages[i];
            currentTime += stage.timeMinutes || Infinity;
            if (timeDiffMin < currentTime){
                return stage; 
            }
        }

        //something was configured wrong, return last stage
        return stages[stages.length-1];

    },

    getPackSaveData: function(id) {

        if (!this.data.packs[id]) {
            this.data.packs[id] = {
                activationTime: false,
                bought: false
            }
        }

        return this.data.packs[id];

    },

    getCurrentLivesNr: function() {

        return this.data.lives;

    },

    sendLife: function(extUserId) {

        var lastTime = this.data.sentLives[extUserId.toString()];

         if (this.checkIfCanSendLifeTo(extUserId)) {
            G.ga.event('Recurring:Social:SendHelp:Life');
            // SG_Hooks.social.gameRequests.sendGameRequest(extUserId, {name: 'life', amount: 1}, function(){});
            console.log("sendLife");
            this.data.sentLives[extUserId.toString()] = Date.now();
            G.sb.sentLife.dispatch(extUserId);
            this.save();
        }   

    },

    checkIfCanSendLifeTo: function(extUserId) {

        var lastTime = this.data.sentLives[extUserId.toString()];
        if (!lastTime) {
            return true;
        }else {
            return Date.now()-lastTime > 86400000;
        }

    },

    checkGateNr: function(lvlIndex) {

        var gatesLvlNr = [0].concat(G.json.settings.gates.map(function(gate){
            return gate.lvlNr;
        }));

        var gateNr = 0;

        for (var i = 0; i < gatesLvlNr.length; i++) {
            if (lvlIndex < gatesLvlNr[i]-1) {
                return i-1;
            }
        }

        return i;

    },

    activateGate: function(gate) {

        var saved = this.getGateData(gate.id);

        if (!saved.timerStartedAt) {
            saved.timerStartedAt = Date.now();
            this.save();
        }

    },

    openGate: function(id) {

        if (!this.data.gates[id]) return;
        this.data.gates[id].open = true;
        this.save();

    },

    tickCheckGate: function() {

        for (var i = 0; i < G.json.settings.gates.length; i++) {
            this.checkGate(G.json.settings.gates[i]);
        }

    },

    checkGate: function(gateData) {

        var savedData = this.getGateData(gateData.id);

        if (savedData.open || savedData.readyToOpen) {
            return savedData;
        }


        var allUserStars = this.getAllStars();

        if (allUserStars >= gateData.req.stars) {
            G.ga.event('Recurring:Gate'+gateData.id+':Unlock:Stars');
            savedData.readyToOpen = true;
        }

        if (savedData.timerStartedAt) {
            if (Date.now()-savedData.timerStartedAt > gateData.req.timeMinutes*60000) {
                savedData.readyToOpen = true;
                G.ga.event('Recurring:Gate'+gateData.id+':Unlock:Time');
            }
        }

        if (savedData.invites >= gateData.req.invites) {
            savedData.readyToOpen = true;
            G.ga.event('Recurring:Gate'+gateData.id+':Unlock:Friends');
        }

        if (savedData.readyToOpen) {
            this.save();
        }

        return savedData;

    },

    getGateData: function(id) {

        if (!this.data.gates[id]) {

            this.data.gates[id] = {
                open: false,
                timerStartedAt: false,
                invites: 0
            }

        }

         return this.data.gates[id];

    },

    getFirstClosedGateLvLIndex: function(){

        for (var i = 0; i < G.json.settings.gates.length; i++){

            if (!this.getGateData(G.json.settings.gates[i].id).opened) {
                return G.json.settings.gates[i].lvlNr-1;
            }
        }

        return null;

    },

    passLevel: function(lvl_nr,new_stars,new_points,skipReward) {

        G.sb.onLevelFinished.dispatch(lvl_nr,new_stars,new_points);

        var state = game.state.getCurrentState();

        var old_stars = this.getStars(lvl_nr);
        var old_points = this.getPoints(lvl_nr);

        var result = {
            highscore: false,
            points: new_points,
            reward: 0,
            stars: new_stars,
            passedFriend: false,
            starImprovement: Math.max(0,new_stars-old_stars)
        };

        if (old_points < new_points) {

            this.data.points[lvl_nr] = new_points;

            result.highscore = true;
        }

        if (old_stars < new_stars) {

            this.data.levels[lvl_nr] = new_stars;
            var reward = G.json.settings.coinsForStar[new_stars-1]-(G.json.settings.coinsForStar[old_stars-1] || 0);
            if (state.doubleMoney) {
                reward *= 2;
            }

            result.reward = reward;

        }

        if (result.highscore) {
            //result.reward += G.json.settings.coinsForImprovingHighscore;
        }

        if (!skipReward) {
            this.data.coins += result.reward;
        }
        
        this.save();

        result.passed = G.platform.passLevel(lvl_nr,new_points);

        return result;

    },

    getPoints: function(lvl_nr) {
        return this.data.points[lvl_nr] ? this.data.points[lvl_nr] : 0;

    },

    isLevelBehindGate: function(levelIndex) {

        for (var i = 0; i < G.json.settings.gates.length; i++) {
            if (G.json.settings.gates[i].lvlNr === levelIndex+1) {

                return !this.getGateData(G.json.settings.gates[i].id).open;
            }
        }

        return false;

    },

    getStars: function(lvl_nr) {
        return this.data.levels[lvl_nr] ? this.data.levels[lvl_nr] : 0;
    },

    getCoins: function() {
        return this.data.coins;
    },

    getItemAmount: function(nr) {

        if (typeof this.data.items[nr] == 'undefined' || this.data.items[nr] == null) {
            this.data.items[nr] = 0;
        }
        return this.data.items[nr];

    },

    changeItemAmount: function(nr,amount) {

        if (this.data.items[nr] === undefined) this.data.items[nr] = 0;

        this.data.items[nr] += amount;

        G.sb.refreshItemAmount.dispatch(nr,this.data.items[nr]);

        this.save();

        return this.data.items[nr];

    },

    getBoosterAmount: function(nr) {

        if (typeof this.data.boosters[nr] == 'undefined' || this.data.boosters[nr] == null) {
            this.data.boosters[nr] = G.json.settings.boostersOnStart;
        }
        return this.data.boosters[nr];

    },

    buyBooster: function(nr) {

        if (this.data.coins >= G.json.settings['priceOfBooster'+nr]) {

            this.changeCoins(-G.json.settings['priceOfBooster'+nr]);
            
            G.ga.event('Sink:Coins:Purchase:Booster',G.json.settings['priceOfBooster'+nr]);

            G.ga.event('Source:booster'+this.nrToBoosterName(nr)+':Purchase:CoinPurchase',1);

            // Design > Recurring > Purchase > ItemType > LevelName
        
            this.changeBoosterAmount(nr,1);


            G.sb.onBoosterBought.dispatch(nr);
            return true;

        }else {

            return false
        
        }

    },

    removeMapGift: function(){

        G.saveState.data.mapGifts = G.saveState.data.mapGifts.slice(1);
        this.save();
        G.sb.onMapGiftRemoved.dispatch();

    },

    isEnoughToBuyBooster: function(nr) {

        if (this.data.coins >= G.json.settings['priceOfBooster'+nr]) {
            return true;
        }else {
            return false
        }

    },

    isEnoughToBuy: function(amount) {

        return this.data.coins >= amount;

    },

    isBoosterUnlocked: function(nr) {

        if (nr == 6) return false;

        var lastPassedLevelNr = this.getLastPassedLevelNr();

        if (nr < 5) {
            return lastPassedLevelNr+1 >= G.json.settings.boostersUnlock[nr];
        }else {
            return lastPassedLevelNr+1 >= G.json.settings.startBoosterUnlock[nr-5]; 
        }

        
    },

    changeBoosterAmount: function(nr,amount) {
        this.data.boosters[nr] += amount;
        this.save();
        G.sb.refreshBoosterAmount.dispatch(nr);
    },

    useBooster: function(nr) {

        if (this.data.boosters[nr] <= 0) {

           G.saveState.buyBooster(nr)
           G.sfx.cash_register.play();

        }

        this.changeBoosterAmount(nr,-1);

        G.ga.event('Sink:booster'+this.nrToBoosterName(nr)+':Level:Use',1);

        G.sb.onBoosterUsed.dispatch(nr);
    },

    useStartBooster: function(nr) {
        if (!this.data.boosters[nr]) return;

        G.ga.event('Sink:booster'+this.nrToBoosterName(nr)+':Level:Use',1);

        this.data.boosters[nr]--;
        this.save();
    },

    nrToBoosterName: function(nr) {

        return [null,'SWAP','REMOVE','HORIZONTAL','VERTICAL','MOVES','DOUBLE','VERHOR','COLOR'][nr];

    },

    nrToWord: function(nr) {

        return ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIVETEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN','TWENTY'][parseInt(nr)];


    },

    changeCoins: function(amount) {

        this.data.coins += amount;
        this.save();

        G.sb.onCoinsChange.dispatch(this.data.coins);

    },

    getAllStars: function() {
        var val = 0;
        for (var i = 0, len = this.data.levels.length; i<len; i++) {
            val += this.data.levels[i] || 0;
        }
        return val;
    },

    getLastPassedLevelNr: function() {

        return this.data.levels.length;

    },

    getAllPossibleStars: function() {
        return G.json.levels.length*3;
    },

    isLevelAvailable: function(lvlNr) {

        return lvlNr <= this.data.levels.length;
    },

    save: function() {

        var platformSave = window.localStorage.getItem('gmdatastring');
        if (platformSave) {
            var platformData = JSON.parse(platformSave);
            
            //platform holds more levels than the game
            //inform user about it

            if (platformData.levels.length > this.data.levels.length) {
                game.state.start('ErrorState');
                return;
            }
        }

        this.data.mute = game.sound.mute;

        /*var customDimensions = GA.getInstance().customDimensions;

        if (customDimensions[0]) this.data.custom_1 = customDimensions[0];
        if (customDimensions[1]) this.data.custom_2 = customDimensions[1];
        if (customDimensions[2]) this.data.custom_3 = customDimensions[2];
*/
        window.localStorage.setItem('gmdatastring',JSON.stringify(this.data));

    },

    init: function() {

        this.refillRate = Math.floor(G.json.settings.refillRateMin*60000);

        var item = window.localStorage.getItem('gmdatastring');
        if (item) {
            this.data = JSON.parse(item);
            game.sound.mute = this.data.mute;

            if (typeof this.data.whatsNewSaw === 'undefined') {
                this.data.whatsNewSaw = [];
            }

            if (this.getLastPassedLevelNr() > 3) {
                this.data.sawDailyTut = true;
            }

            this.versionCheck();

        }else {
            this.data = this.makeNewDataObject();
        }

        G.sb.onWallClockTimeUpdate.addPermanent(this.onTick,this,99);
        G.sb.onWallClockTimeUpdate.addPermanent(this.tickCheckGate,this,99);

    },


    versionCheck: function(){

        if (!this.data.version){

            this.data.version = 1;
            var lastLvl = this.getLastPassedLevelNr();
            G.json.settings.gates.forEach(function(gate){
                var saveData = this.getGateData(gate.id);
                if (gate.lvlNr < lastLvl && !saveData.open){
                    saveData.open = true;
                }
            },this);


        }


    },



    loseLife: function() {

        if (this.data.lives <= 0) return;

        this.data.lives--;

        this.save();

        return this.data.lives;

    },

    addLife: function(nr) {

        if (this.data.lives == G.json.settings.livesMax) return;

        nr = nr || 1;

        this.data.lives = game.math.clamp(this.data.lives+nr,0,G.json.settings.livesMax);

        this.save();

        G.sb.onLifeAdded.dispatch();

        return this.data.lives;

    },

    onTick: function(currentTime) {

        if (Date.now() - this.data.lastDaily >= 86400000) {

            this.data.lastDaily = Date.now();
            this.data.freeSpin = true;
            this.save();

            G.sb.onDailyFreeSpinGain.dispatch();

        }


        if (this.data.lives == G.json.settings.livesMax) {
            this.data.lastRefillDate = Date.now();
        }

        if (this.data.lives < G.json.settings.livesMax) {

            var diff = currentTime-this.data.lastRefillDate;

            var nrOfLivesToAdd = Math.floor(diff/this.refillRate);

            if (nrOfLivesToAdd > 0) {

                this.data.lastRefillDate += nrOfLivesToAdd*this.refillRate;
                G.ga.event('Source:Lives:Automatic:Recharge',Math.min(G.json.settings.livesMax-this.data.lives,nrOfLivesToAdd));
                this.addLife(nrOfLivesToAdd);
                
            }

            var secLeft = Math.round((this.refillRate - (currentTime - this.data.lastRefillDate))/1000);

            G.sb.onLifeTimerUpdate.dispatch(secLeft);

        }

    },

    debugStarsUpTo: function(lvlNr,starNr){
        this.data.levels = [];
        while(lvlNr--) {
            this.data.levels.push(starNr || 3);
        }
        game.state.start("World");
    }

}
G.SoundBtn = function(x,y) {

	G.Button.call(this,x,y,game.sound.mute ? 'btn_sound_off' : 'btn_sound_on',function() {
		game.sound.mute = !game.sound.mute;

		game.sound.mute ? G.sfx.music.pause() : G.sfx.music.resume();

		G.changeTexture(this,game.sound.mute ? 'btn_sound_off' : 'btn_sound_on');

		G.saveState.save();
		G.sb.onSoundSettingsChange.dispatch(game.sound.mute);
	});

	game.add.existing(this);


};

G.SoundBtn.prototype = Object.create(G.Button.prototype);


G.TopFxLayer = function(board,signalName) {

	Phaser.Group.call(this,game);

	this.aboveThirdFloorLayer = false;
	
	this.board = board;

	G.sb[signalName || 'fx'].add(this.initEffect,this);
	
	this.deadArray = [];


}

G.TopFxLayer.prototype = Object.create(Phaser.Group.prototype);
G.TopFxLayer.constructor = G.TopFxLayer;


G.TopFxLayer.prototype.onElemKilled = function(elem) {
	if (this !== elem.parent) return;
	this.removeChild(elem);
	this.deadArray.push(elem);
};

G.TopFxLayer.prototype.getFreeParticle = function() {

	var part;

	if (this.deadArray.length > 0) {
		part = this.deadArray.pop();
	}else {
		part = new G.FxParticle(this.board,this); 
		part.events.onKilled.add(this.onElemKilled,this);
	}

	this.add(part);
	return part;

};

G.TopFxLayer.prototype.initEffect = function(effect,candy,args,args2) {

	if (effect == 'burstConcrete') {
		return this.initConcreteBreak(candy,args);
	}

	var part = this.getFreeParticle();
	part[effect](
		this.board.cellXToPxIn(candy.cellX),
		this.board.cellYToPxIn(candy.cellY),
		args,
		args2
	);

	return part;

};


G.TopFxLayer.prototype.initConcreteBreak = function(candy,hp) {

	var offsetX = 0;
	var offsetY = 0;

	if (hp == 3) {
		this.getFreeParticle().burstConcrete(
			this.board.cellXToPxIn(candy.cellX),
			this.board.cellYToPxIn(candy.cellY),
			-9,
			-1,
			'concrete_3_1'
		);
	}else if (hp == 2) {
		this.getFreeParticle().burstConcrete(
			this.board.cellXToPxIn(candy.cellX),
			this.board.cellYToPxIn(candy.cellY),
			14,
			5,
			'concrete_2_1'
		);
	}else {
		this.getFreeParticle().burstConcrete(
			this.board.cellXToPxIn(candy.cellX),
			this.board.cellYToPxIn(candy.cellY),
			15,
			20,
			'concrete_1_1'
		);

		this.getFreeParticle().burstConcrete(
			this.board.cellXToPxIn(candy.cellX),
			this.board.cellYToPxIn(candy.cellY),
			-15,
			20,
			'concrete_1_2'
		);
	}


}
G.Tutorial = function(tutorialNr) {

	Phaser.Group.call(this,game);

	this.tutorialNr = tutorialNr;

	G.tutorialOpened = true;

	this.boardGroup = game.add.group();
	this.add(this.boardGroup);

	this.state = game.state.getCurrentState();

	this.overlay = this.state.overlay;
	this.board = this.state.board;

	this.boardGroup.x = this.board.x;
	this.boardGroup.y = this.board.y;

	this.tutData = G.json.tutorials[tutorialNr];

	if (this.tutData.booster) {
		this.makeBoosterTutorial(this.tutData);
	}else {
		this.makeStandardTutorial(this.tutData);
	}

	

	game.add.tween(this.boardGroup).from({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);


};

G.Tutorial.prototype = Object.create(Phaser.Group.prototype);


G.Tutorial.prototype.update = function() {

	this.boardGroup.x = this.board.x;
	this.boardGroup.y = this.board.y;
	this.boardGroup.update();

};


G.Tutorial.prototype.makeStandardTutorial = function(tutData){


	if (tutData.overlayTask) {
		this.overlay.start(tutData.overlayTask);
	};

	if (tutData.handCells) {
		this.makeHandAnim(tutData.handCells);
	}

	if (tutData.inputCells) {
		this.setBoardCandyInput(tutData.inputCells);
	}

	if (tutData.msg) {
		this.makeMsg(tutData.msg.text,tutData.msg.position)
	}

	G.sb.madeMove.addOnce(this.finish,this);

	this.state.boosterPanel.lockInput();

};


G.Tutorial.prototype.makeBoosterTutorial = function(tutData){


	/*if (tutData.overlayTask) {
		this.overlay.start(tutData.overlayTask);
	};

	/*if (tutData.handCells) {
		this.makeHandAnim(tutData.handCells);
	}*/

		
	if (tutData.msg) {
		this.makeMsg(tutData.msg.text,tutData.msg.position,true)
	}

	this.lockBoard();

	this.state.boosterPanel.lockInput();
	this.state.boosterPanel.boostersBtn[tutData.boosterNr-1].unlock();
	this.state.boosterPanel.boostersBtn[tutData.boosterNr-1].showSuggestion();

	G.sb.onBoosterSelect.addOnce(function() {

		if (tutData.overlayTask) {
			this.overlay.start(tutData.overlayTask);
		}

		this.makeHandAnim(this.tutData.handCells);

		this.state.boosterPanel.boostersBtn[tutData.boosterNr-1].hideSuggestion();
		this.hideMsg();

		this.state.board.actionManager.actionList[0].availableCandies = this.inputCellsToCandies(this.tutData.inputCells);

		if (this.tutData.boosterNr==1) {
			this.state.board.actionManager.actionList[0].availableCandies = [this.board.getCandy(this.tutData.inputCells[0],this.tutData.inputCells[1])];
			G.sb.onBoosterSwapCandySelect.addOnce(function() {
				this.hand.destroy();
				this.makeHandAnim([this.tutData.inputCells[2],this.tutData.inputCells[3]]);
				//check
				this.state.board.actionManager.actionList[0].availableCandies = [this.board.getCandy(this.tutData.inputCells[2],this.tutData.inputCells[3])];
			},this);
		}
		
	},this);

	G.sb.onBoosterUsed.addOnce(this.finish,this);

};




G.Tutorial.prototype.makeMsg = function(text, position,shade) {
	if (shade) {
		this.msgShade = G.makeImage(0,0,'text_shade_bg',0.5);
		this.msgShade.alpha = 0.7;
	}
	
	this.msg = new G.MultiLineText(0,0,'font-white',G.txt(text),40,580,200,'center',0.5,0.5);
	this.msg.x = this.board.width*0.5;
	this.msg.y = this.board.height*(position || 0.7);

	if (shade) {
		this.msgShade.width = this.msg.width+G.l(80);
		this.msgShade.height = this.msg.height+G.l(60);
		this.msgShade.position = this.msg.position;
		this.boardGroup.add(this.msgShade);
	}

	this.boardGroup.add(this.msg);

};

G.Tutorial.prototype.hideMsg = function() {
	if (this.msgShade)  game.add.tween(this.msgShade).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);
	if (this.msg) game.add.tween(this.msg).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);
	this.msg = false;
	this.msgShade = false;


}


G.Tutorial.prototype.afterMsg = function(text,position) {

	if (!text) return;

	if (this.msg) game.add.tween(this.msg).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);
	if (this.msgShade) game.add.tween(this.msgShade).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);
	if (this.hand) game.add.tween(this.hand).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);

	this.msgShade = G.makeImage(0,0,'text_shade_bg',0.5);
	this.boardGroup.add(this.msgShade);

	this.afterMsg = new G.MultiLineText(0,0,'font-white',G.txt(text),40,580,200,'center',0.5,0.5);
	this.afterMsg.x = this.board.width*0.5;
	this.afterMsg.y = this.board.height*(position || 0.7);
	this.boardGroup.add(this.afterMsg);

	game.add.tween(this.afterMsg).from({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);

	
	this.msgShade.width = this.afterMsg.width+G.l(80);
	this.msgShade.height = this.afterMsg.height+G.l(60);
	this.msgShade.position = this.afterMsg.position;
	this.msgShade.alpha = 0.7;
	
	game.add.tween(this.msgShade).from({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);

	
	game.add.tween(this).to({alpha:0},400,Phaser.Easing.Sinusoidal.Out,true,2500).onComplete.add(function() {
			this.destroy();
	},this);


};


G.Tutorial.prototype.makeHandAnim = function(array) {

	this.hand = G.makeImage(0,0,'tut_hand',0,this);
	this.hand.alpha = 1;
	this.boardGroup.add(this.hand);

	this.hand.x = (this.board.tilesize*array[0])+(this.board.tilesize*0.7);
	this.hand.y = (this.board.tilesize*array[1])+(this.board.tilesize*0.7);

	var toX, toY;

	if (array.length == 2) {
		toX = this.hand.x+G.l(15);
		toY = this.hand.y+G.l(15);
		game.add.tween(this.hand).to({
			x: toX,
			y: toY
		},1000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	}else {
		toX = (this.board.tilesize*array[2])+(this.board.tilesize*0.7)
		toY = (this.board.tilesize*array[3])+(this.board.tilesize*0.7)
		game.add.tween(this.hand).to({
			x: toX,
			y: toY
		},1000,Phaser.Easing.Sinusoidal.InOut,true,0,-1);
	}


	

};



G.Tutorial.prototype.addInputCells = function(inputCells) {

	if (!inputCells) return;

	this.board.inputController.possibleCandies = [];
	for (var i = 0; i < tutData.inputCells.length; i+=2) {
		this.board.inputController.possibleCandies.push(this.board.getCandy(inputCells[i],inputCells[i+1]));
	}

};

G.Tutorial.prototype.finish = function() {

	this.overlay.hideAndClear();
	this.state.boosterPanel.unlockInput();
	G.saveState.data.finishedTutorials.push(this.tutorialNr);
	G.saveState.save();


	if (this.tutData.afterMsg) {

		this.afterMsg(this.tutData.afterMsg,0.85);

	}else {
		game.add.tween(this).to({alpha:0},400,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
			this.destroy();
		},this);

	}
	

	this.clearBoardCandyInput();

	G.sb.onTutorialFinish.dispatch();

	G.tutorialOpened = false;

};


G.Tutorial.prototype.lockBoard = function() {

	this.state.board.inputController.possibleCandies = [{}];

};


G.Tutorial.prototype.setBoardCandyInput = function(cells) {

	this.state.board.inputController.possibleCandies = [];

	for (var i = 0; i < cells.length;i+=2) {
		this.state.board.inputController.possibleCandies.push(this.state.board.getCandy(cells[i],cells[i+1]));
	}


};

G.Tutorial.prototype.clearBoardCandyInput = function(cells) {

	this.state.board.inputController.possibleCandies = [];

};


G.Tutorial.prototype.inputCellsToCandies = function(cells) {

	var result = [];

	for (var i = 0; i < cells.length; i++) {
		result.push(this.board.getCandy(cells[i],cells[i+1]));
	}

	return result;

};
G.Overlay = function() {

	//Phaser.BitmapData.call(this,game,'',game.width,game.height);

	this.bitmap = G.overlayBitmap;

	this.state = game.state.getCurrentState();

	s.tutO = this;

	this.bitmap.resize(game.width,game.height);

	this.board = game.state.getCurrentState().board;

	this.img = this.bitmap.addToWorld();
	this.img.x = game.world.bounds.x;
	this.img.alpha = 0;

	G.sb.onScreenResize.add(this.onResize,this);

	this.topBar = game.add.group();
	this.topBar.position = this.state.topBar.position;

	this.boosterGroup = game.add.group(); 
	this.boosterGroup.position = this.state.boosterPanel.position;

	this.tasks = [];
	this.aboveObjects = [];

	G.sb.closeOverlay.add(this.hideAndClear,this);
	G.sb.startOverlay.add(this.start,this);

	this.alphaValue = 0.7;
	this.boosterLabel = new G.UI_BoosterLabel(this.board);

	this.coinCounter = new G.UI_CoinCounter();


};


//G.Overlay.prototype = Object.create(Phaser.BitmapData.prototype);



G.Overlay.prototype.hideAndClear = function() {

	G.stopTweens(this);
	game.add.tween(this.img).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
		this.tasks = [];
		this.moveAboveObjectsToOriginalParents();
	},this);

};


G.Overlay.prototype.clearCell = function(x,y) {

	var xx = this.board.x+(x*this.board.tilesize);
	var yy = this.board.y+(y*this.board.tilesize);
	//this.tasks.push(['clearCell',x,y]);
	this.bitmap.context.clearRect(-game.world.bounds.x+xx,yy,this.board.tilesize,this.board.tilesize);


};

G.Overlay.prototype.clearCells = function(array) {


	this.clearCellsArray = array;

	for (var i = 0, len = array.length; i < len; i+=2) {
		//console.log('creal cells: '+i);
		this.clearCell(array[i],array[i+1]);
	}

};

G.Overlay.prototype.clearBoard = function(obj) {

	//this.cls();
	//this.rect(0,0,this.width,this.height,'rgba(0,0,0,0.5)');

	//this.tasks = ['clearBoard'];

	this.clearObject = obj; 
	
	/*
	this.bitmap.context.clearRect(
		this.board.background.worldPosition.x,
		this.board.background.worldPosition.y,
		this.board.background.width,
		this.board.background.height);
	*/

	this.board.levelData.loop(function(val,x,y){

		var halfTilesize = this.board.tilesize*0.5;
		var tilesize = this.board.tilesize;

		if (this.board.isCellOnBoard(x,y)) {

			var pxOut = this.board.cellToPxOut([x,y]);

			this.bitmap.context.clearRect(
				-game.world.bounds.x+pxOut[0]-halfTilesize-G.l(6),
				pxOut[1]-halfTilesize-G.l(6),
				tilesize+G.l(12),
				tilesize+G.l(12)
			);

		}

	},this);

};

G.Overlay.prototype.onResize = function() {

	
	this.bitmap.resize(game.width,game.height);
	this.bitmap.fill(0,0,0,this.alphaValue);
	this.img.x = game.world.bounds.x;

	game.time.events.add(5,this.redoTasks,this);
	//this.redoTasks();

	/*if (this.clearCellsArray) {
		this.clearCells(this.clearCellsArray);
	}

	if (this.clearObject) {
		game.time.events.add(10,function() {
		this.clearButton(this.clearObject);
		},this);
	}*/
};



G.Overlay.prototype.redoTasks = function() {

	for (var i = this.tasks.length; i--; ) {
		var task = this.tasks[i];
		
		this[task[0]].apply(this,task.slice(1));
	}

};


G.Overlay.prototype.moveToAboveGroup = function(obj,aboveGroup) {
	//check if it is allready here
	if (obj.parent == this[aboveGroup]) {
		
		return;
	}

	obj._originalParent = obj.parent;
	this[aboveGroup].add(obj);
	this.aboveObjects.push(obj);

};


G.Overlay.prototype.moveAboveObjectsToOriginalParents = function() {

	for (var i = this.aboveObjects.length; i--; ) {
		var obj = this.aboveObjects[i];
		obj._originalParent.add(obj);
	}

};

G.Overlay.prototype.start = function(tasks) {

	G.stopTweens(this);

	this.tasks = tasks;

	this.bitmap.cls();
	this.bitmap.fill(0,0,0,this.alphaValue);
	this.redoTasks();

	if (this.img.alpha == 1) return;

	//this.img.alpha = 0;
	game.add.tween(this.img).to({alpha:1},300,Phaser.Easing.Sinusoidal.Out,true);

};

G.UIFxLayer = function(board) {

	Phaser.Group.call(this,game);

	this.board = board;
	this.state = game.state.getCurrentState();
	
	G.sb.UIfx.add(this.initEffect,this);
	//G.sb.onGoalAchieved.add(this.candyRainText,this);

	/*this.feedbackText = G.makeImage(0,0,null,0.5);
	this.feedbackText.kill();

	 G.sb.displayPoints.add(function(x,y,points,amount) {
	 	if (amount >= 4) {
	 		this.initFeedbackText(amount);
	 	}
	 },this);*/
	

}

G.UIFxLayer.prototype = Object.create(Phaser.Group.prototype);
G.UIFxLayer.constructor = G.TopFxLayer;

G.UIFxLayer.prototype.getFreeParticle = function() {
	return this.getFirstDead() || this.add(new G.FxParticle(this.board));
};

G.UIFxLayer.prototype.initEffect = function(x,y,effect) {

	var part = this.getFreeParticle();

	part[effect](
		x,y
	);

	return part;

};

G.UIFxLayer.prototype.candyRainText = function() {

	G.sfx.xylophone_positive_12.play();

	var glow = G.makeImage(480,-50,'popup_lighht',0.5,this);
	glow.blendMode = 1;
	glow.alpha = 0.5;
	glow.scale.setTo(0);
	glow.update = function(){this.angle+=1};
	game.add.tween(glow.scale).to({x:1.5,y:1.5},1000,Phaser.Easing.Elastic.Out,true);

	var state = game.state.getCurrentState();

	var txt = new G.OneLineText(480,-50,'font-blue',G.txt(26),70,580,0.5,0.5);
	txt.x = glow.x = state.board.x + state.board.width*0.5;
	txt.y = glow.y = state.board.y + state.board.height*0.45;
	txt.popUpAnimation();

	game.add.tween(glow).to({alpha: 0}, 1000,Phaser.Easing.Sinusoidal.In,true,1500);
	game.add.tween(txt).to({alpha: 0}, 1000, Phaser.Easing.Sinusoidal.In,true,1500).onComplete.add(function() {
		txt.destroy();
	})
	this.add(txt);

};

G.UIFxLayer.prototype.initFeedbackText = function(matchNumber) {

	if (this.feedbackText.alive) return;

	G.stopTweens(this.feedbackText);

	var txt; 
	if (matchNumber == 4) txt = 'good';
	if (matchNumber == 5) txt = 'nice';
	if (matchNumber >= 6) txt = 'amazing';
	if (matchNumber >= 7) txt = 'excellent';
	if (matchNumber >= 8) txt = 'cookielicious';

	this.feedbackText.revive();
	this.feedbackText.x = this.state.board.x + this.state.board.width*0.5;
	this.feedbackText.y = this.state.board.y + this.state.board.height*0.5;
	G.changeTexture(this.feedbackText,txt);
	this.feedbackText.alpha = 1;
	this.feedbackText.scale.setTo(0);
	game.add.tween(this.feedbackText.scale).to({x:1,y:1},500,Phaser.Easing.Elastic.Out,true);
	game.add.tween(this.feedbackText).to({alpha: 0}, 300, Phaser.Easing.Sinusoidal.In,true,1000).onComplete.add(this.feedbackText.kill,this.feedbackText);

};
G.UI_BoosterPanel = function() {
	
	Phaser.Group.call(this,game);

	this.state = game.state.getCurrentState();
	this.board = this.state.board;

	this.y = game.height;

	this.tweenObj = {angle: -15,alpha: 1};
	game.add.tween(this.tweenObj).to({angle: 15},2000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);
	game.add.tween(this.tweenObj).to({alpha: 0},500,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

	this.bg = G.makeImage(7,0,'bottom_ui_base',[0,1],this);

	this.shadows = [
		G.makeImage(0,-20,'bottom_ui_shadow',0.5,this.bg),
		G.makeImage(0,-20,'bottom_ui_shadow',0.5,this.bg),
		G.makeImage(0,-20,'bottom_ui_shadow',0.5,this.bg),
		G.makeImage(0,-20,'bottom_ui_shadow',0.5,this.bg),
		G.makeImage(0,-20,'bottom_ui_shadow',0.5,this.bg),
	]


	this.pauseBtn = new G.Button(60,-70,'btn_game_pause',function() {
		//s.board.boardCandies.firstFloor.cacheAsBitmap = !s.board.boardCandies.firstFloor.cacheAsBitmap
		new G.Window('pause');

        didPauseGame();

	},this);
	this.add(this.pauseBtn);

	this.boostersBtn = [
		this.makeBoosterBtn(290,-64,1),
		this.makeBoosterBtn(480,-64,2),
		this.makeBoosterBtn(670,-64,3),
		this.makeBoosterBtn(860,-64,4),
	];

	

	G.sb.onWindowOpened.add(this.lockInput,this);
	G.sb.onAllWindowsClosed.add(this.unlockInput,this);
	G.sb.onStateChange.add(this.lockInput,this);
	G.sb.actionQueueEmpty.add(function() {
		if (G.lvl.goalAchieved) return;
		this.checkSuggestions();
	},this);
	G.sb.onGoalAchieved.add(function() {
		this.boostersBtn.forEach(function(e){e.suggested = false});
	},this);

 
	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize();

};

G.UI_BoosterPanel.prototype = Object.create(Phaser.Group.prototype);

G.UI_BoosterPanel.prototype.onScreenResize = function() {

	this.y = game.height;

	if (G.horizontal) {

		/*G.changeTexture(this.bg,'bottom_ui_base');
		this.pauseBtn.y = G.l(-90);

		this.boostersBtn.forEach(function(e,i){
			e.x = e.orgX = G.l(90);
			e.y = e.orgY = G.l(-1100+(190*i));
		});*/

		this.x = G.l(150);

	}else {



		G.changeTexture(this.bg,'bottom_ui_base');
		

		this.x = 0;

	}

	this.pauseBtn.y = G.l(-58);

	this.boostersBtn.forEach(function(e,i){
			e.y = e.orgY = G.l(-64);
			e.x = e.orgX = G.l(180+(125*i));

			this.shadows[0].x = this.pauseBtn.x-G.l(7);
			this.shadows[i+1].x = e.x-G.l(7);
			

		},this);

};

G.UI_BoosterPanel.prototype.lockInput = function() {
	this.pauseBtn.input.enabled = false;

	this.boostersBtn.forEach(function(child) {
		if (child.lock) child.lock();
	},this);
};

G.UI_BoosterPanel.prototype.unlockInput = function() {

	this.pauseBtn.input.enabled = true;
	this.pauseBtn.input.useHandCursor = true;

	this.boostersBtn.forEach(function(child) {
		if (child.unlock) {
			child.unlock();
		}
	},this);

};

G.UI_BoosterPanel.prototype.makeBoosterBtn = function(x,y,nr) {

	
	if (G.saveState.isBoosterUnlocked(nr)) {
		var btn = new G.UI_BoosterButton(x,y,nr);
		return this.add(btn);
	}else {
		return G.makeImage(x,y,'ui_booster_'+nr+'_locked',0.5,this);
	}

	
};


G.UI_BoosterPanel.prototype.checkSuggestions = function() {

	this.boostersBtn.forEach(function(elem,index) {


		if (!G.lvl.goalAchieved && this['checkBooster'+(index+1)+'Suggestion']()) {
			if (elem.showSuggestion) {
				elem.showSuggestion();
			}
		}else {
			if (elem.hideSuggestion) elem.hideSuggestion();
		}
		
	},this);


};


G.UI_BoosterPanel.prototype.checkBooster1Suggestion = function() {
	return false;
};

G.UI_BoosterPanel.prototype.checkBooster2Suggestion = function() {
	return G.lvl.moves < 10 && G.lvl.goal.length == 1 && G.lvl.goal[0][1] == 1;
};

G.UI_BoosterPanel.prototype.checkBooster3Suggestion = function() {
	return false;
	for (var yy = 0; yy < 8; yy++) {
		var count = 0;
		for (var xx = 0; xx < 8; xx++) {
			if (this.checkIfBlocker(xx,yy)) {
				count++;
			}
		}
		if (count >= 4) {
			return true;
		}
	}

	return false;

};

G.UI_BoosterPanel.prototype.checkBooster4Suggestion = function() {
	return false;
	for (var xx = 0; xx < 8; xx++) {
		var count = 0;
		for (var yy = 0; yy < 8; yy++) {
			if (this.checkIfBlocker(xx,yy)) {
				count++;
			}
		}
		if (count >= 4) {
			return true;
		}
	}

	return false;

};

G.UI_BoosterPanel.prototype.checkIfBlocker = function(x,y) {

	if (this.board.boardIce.isChocolate(x,y)
	|| this.board.boardDirt.isDirt(x,y)
	|| this.board.boardCage.isCage(x,y)) {
		return true
	}

	var candy = this.board.getCandy(x,y);
	return candy && (candy.wrapped || candy.infected);

};
G.UI_GoalPanelCollect = function(x,y) {

	Phaser.Group.call(this,game);
	this.x = G.l(x);
	this.y = G.l(y);

	this.state = game.state.getCurrentState();

	this.objectsToCollect = JSON.parse(JSON.stringify(G.lvlData.goal[1]));

	this.panels = [];

	this.makePanels(this.objectsToCollect);
	
	G.sb.onCollectableRemove.add(function(type, element) {

		var p = this.getGoalPanel(type);
		if (!p) return;

		//	if there is no to UI animation, change displayed value immediately
		if (!G.json.settings.goals[type].toUIAnimation || !element) {
			console.log('change immediately');
			this.updateDisplay(p);

			if (!G.lvl.goalAchieved) {
				this.state.collectableAnimLayer.initNofly(p);
			}
			//p.fadeAnim();
		}

	},this);

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize(); 
	

};

G.UI_GoalPanelCollect.prototype = Object.create(Phaser.Group.prototype);


G.UI_GoalPanelCollect.prototype.onScreenResize = function() {

	if (G.horizontal) {

		this.refreshPanelsHorizontalPositions();

	}else {

		var width = G.l(260);

		if (this.panels.length == 2) {
			width = G.l(130);
		}else if (this.panels.length == 3){
			width = G.l(210);
		}

		var distance = 0;
		if (this.panels.length-1) {
			distance = width/(this.panels.length-1);
		}
		var startX = width*Math.sign(distance)*-0.5;

		this.panels.forEach(function(child,index) {
			child.x = startX+(index*distance);
			child.y = 0;
			child.scale.setTo(0.5);
		});

	}


	this.panels.forEach(function(panel) {

		if (G.horizontal) {
			panel.turnHorizontal();
		}else {
			panel.turnVertical();
		}

	});

};


G.UI_GoalPanelCollect.prototype.getGoalPanel = function(goalName) {
	for (var i = 0, len = this.panels.length; i < len; i++) {
		if (this.panels[i].goalName == goalName) {
			return this.panels[i];
		}
	}
};


G.UI_GoalPanelCollect.prototype.updateDisplay = function(panel) {
		if (!panel.nr.alive) return;
		if (panel.nr.alive) {
			var newValue = parseInt(panel.nr.text)-1;
			panel.nr.setText(newValue);
			if (newValue == 0 && panel.nr.alive) {
				panel.checkmark.visible = true;
				panel.nr.destroy();
			}
		}
};

G.UI_GoalPanelCollect.prototype.makePanel = function(x,y,name,number,scale) {

	var gfxName = G.json.settings.goals[name].sprite;

	var panel = game.make.group();
	panel.x = G.l(x);
	panel.y = G.l(y);


	panel.scale.setTo(scale);
	panel.goalName = name;
	panel.amount = number;

	panel.nr = panel.add(new G.OneLineText(38,0,'font-blue',number.toString(),60,85,0.5,0.5));
	
	panel.img = G.makeImage(-40,0,gfxName,0.5,panel);
	panel.imgFade = G.makeImage(-40,0,gfxName,0.5,this);
	panel.imgFade.alpha = 0;

	panel.checkmark = G.makeImage(panel.nr.x,panel.nr.y,'task_complete',[1,0.5],panel);
	panel.checkmark.position = panel.nr.position;
	panel.checkmark.anchor = panel.nr.anchor;
	panel.checkmark.visible = false;


	panel.turnHorizontal = function() {

		this.img.x = 0;
		this.nr.x = 0;
		this.nr.y = G.l(60);
		this.nr.anchor.setTo(0.5);
		this.nr.cacheAsBitmap = false;
	};

	panel.turnVertical = function() {

		this.img.x = G.l(-40);
		this.nr.x = G.l(38);
		this.nr.y = 0;
		this.nr.anchor.setTo(0.5);
		this.nr.cacheAsBitmap = false;

	};

	panel.fadeAnim = function(){

		G.stopTweens(this.imgFade);
		this.imgFade.scale.setTo(0);
		this.imgFade.alpha = 1;
		game.add.tween(this.imgFade).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
		game.add.tween(this.imgFade.scale).to({x:2,y:2},300,Phaser.Easing.Sinusoidal.Out,true);

	}

	this.add(panel);
	this.panels.push(panel);

};

G.UI_GoalPanelCollect.prototype.makePanels = function(objects) {

	if (objects.length == 1) {
		
		this.makePanel(0,-25,objects[0][0],objects[0][1],0.8);
	}
	if (objects.length == 2) {
		this.makePanel(-30,0,objects[0][0],objects[0][1],0.6);
		this.makePanel(30,0,objects[1][0],objects[1][1],0.6);
	}
	if (objects.length == 3) {
		this.makePanel(-60,0,objects[0][0],objects[0][1],0.6);
		this.makePanel(0,0,objects[1][0],objects[1][1],0.6);
		this.makePanel(60,0,objects[2][0],objects[2][1],0.6);
	}
	if (objects.length == 4) {
		this.makePanel(-120,0,objects[0][0],objects[0][1],0.6);
		this.makePanel(-40,0,objects[1][0],objects[1][1],0.6);
		this.makePanel(40,0,objects[2][0],objects[2][1],0.6);
		this.makePanel(120,0,objects[3][0],objects[3][1],0.6);
	}


};

G.UI_GoalPanelCollect.prototype.refreshPanelsHorizontalPositions = function() {
	
	var coll1 = G.l(-40);
	var coll2 = G.l(40);
	var row1 = G.l(-60);
	var row2 = G.l(30);


	if (this.panels.length == 1) {
		this.panels[0].x = 0;
		this.panels[0].y = -25;
		this.panels[0].scale.setTo(0.8);
	}else if (this.panels.length == 2) {
		this.panels[0].x = 0;
		this.panels[0].y = row1;
		this.panels[0].scale.setTo(0.6);
		this.panels[1].x = 0;
		this.panels[1].y = row2;
		this.panels[1].scale.setTo(0.6);
	}else if (this.panels.length == 3) {
		this.panels[0].x = coll1;
		this.panels[0].y = row1;
		this.panels[0].scale.setTo(0.6);
		this.panels[1].x = coll2;
		this.panels[1].y = row1;
		this.panels[1].scale.setTo(0.6);
		this.panels[2].x = coll1;
		this.panels[2].y = row2;
		this.panels[2].scale.setTo(0.6);
	}else if (this.panels.length == 4) {
		this.panels[0].x = coll1;
		this.panels[0].y = row1;
		this.panels[0].scale.setTo(0.6);
		this.panels[1].x = coll2;
		this.panels[1].y = row1;
		this.panels[1].scale.setTo(0.6);
		this.panels[2].x = coll1;
		this.panels[2].y = row2;
		this.panels[2].scale.setTo(0.6);
		this.panels[3].x = coll2;
		this.panels[3].y = row2;
		this.panels[3].scale.setTo(0.6);
	}
	
};
G.UI_GoalPanelPoints = function(x,y) {

	Phaser.Group.call(this,game);
	this.x = G.l(x);
	this.y = G.l(y);

	this.state = game.state.getCurrentState();

	this.objectsToCollect = JSON.parse(JSON.stringify(G.lvlData.goal[1]));

	this.labelTxt = new G.OneLineText(0,0,'font-blue','/'+G.lvl.pointsTarget,40,150,0,0.5);
	this.pointsCounter = new G.OneLineText(0,0,'font-blue',0,40,150,0.5,0.5);
	//this.pointsCounter.cacheAsBitmap = false;
	this.pointsTarget = G.lvl.pointsTarget;
	this.add(this.labelTxt);
	this.add(this.pointsCounter);

	/*G.sb.onPointsAdded.add(function(change) {

		this.pointsCounter.increaseAmount(change);

	},this);*/

	G.sb.onScreenResize.add(this.onScreenResize,this);
	this.onScreenResize(); 
	

};

G.UI_GoalPanelPoints.prototype = Object.create(Phaser.Group.prototype);

G.UI_GoalPanelPoints.prototype.update = function() {

	this.centerTexts();
	this.pointsCounter.setText(this.state.topBar.pointsCounter.text);

};


G.UI_GoalPanelPoints.prototype.onScreenResize = function() {

	if (G.horizontal) {

		this.labelTxt.y = G.l(20);
		this.pointsCounter.y = G.l(-20);
		this.pointsCounter.anchor.x = 0.5;

	}else {

		this.pointsCounter.anchor.x = 1;
		this.labelTxt.y = this.pointsCounter.y = 0;

	}

	this.pointsCounter.updateText();
	this.pointsCounter.updateCache();

	this.centerTexts();

};

G.UI_GoalPanelPoints.prototype.centerTexts = function() {

	if (G.horizontal) {

		this.labelTxt.x = this.labelTxt.width*-0.5;
		this.pointsCounter.x = 0;

	}else {

		var xx = (this.pointsCounter.width+this.labelTxt.width)*-0.5;
		this.pointsCounter.x = xx+this.pointsCounter.width;
		this.labelTxt.x = xx+this.pointsCounter.width;

	}

};
G.UI_MapPanel = function() {

	Phaser.Group.call(this,game);
	
	this.bg = G.makeImage(320,0,'upper_ui',[0.5,0],this);

	this.bg.inputEnabled = true;

	this.state = game.state.getCurrentState();

	this.soundBtn = new G.SoundBtn(858,37);
	/*this.soundBtn = new G.Button(858,37,'btn_home',function() {
		G.sb.onStateChange.dispatch('TitleScreen');
	});*/
	this.add(this.soundBtn);
	this.soundBtn.scale.setTo(0.35);

	this.starsIco = G.makeImage(-31,34,'map_star_1',[0.5,0.5],this);

	var starsAmount = (G.saveState.getAllStars()-(this.state.lastLevelData ? this.state.lastLevelData.starImprovement : 0));

	this.starsTxt = new G.OneLineText(4,34,'font-white',starsAmount.toString(),35,150,0,0.5);
	this.starsTxt.currentVal = (G.saveState.getAllStars() - (this.state.lastLevelData ? this.state.lastLevelData.starImprovement : 0));
	this.add(this.starsTxt);
	

	this.coinButton = new G.Button(652,41,'btn_map_upper_ui',function() {
		new G.Window('moreMoney');
	});
	this.add(this.coinButton);

	this.coinIco = G.makeImage(569,36,'currency',0.5,this);

	this.coinsTxt = new G.OneLineText(645,37,'font-white',G.saveState.getCoins().toString(),35,110,0.5,0.5);
	this.coinsTxt.currentVal = G.saveState.getCoins() - (this.state.lastLevelData ? this.state.lastLevelData.reward : 0);
	this.add(this.coinsTxt);

	this.plusIcon = G.makeImage(730,39,'btn_plus',0.5,this);
	this.plusIcon.scale.setTo(0.75);

	if (!game.incentivised){
		this.plusIcon.visible = false;
		this.coinButton.inputEnabled = false;
		this.coinButton.visible = false;
	}

	//GLOBAL GOAL

	this.globalGoalBtn = this.add(new G.GlobalGoalButton(-212,125));


	this.lifeUI = new G.UI_Life(-212,36);
	this.add(this.lifeUI);


	this.logo = G.makeImage(317,48,'logo',0.5,this);
	this.logo.scale.setTo(0.8);



	this.fxLayer = new G.UI_MapPanelFxLayer(this);


	G.sb.onScreenResize.add(this.onResize,this);
	G.sb.onWindowOpened.add(this.lockInput,this);
	G.sb.onAllWindowsClosed.add(this.unlockInput,this);
	G.sb.onStateChange.add(this.lockInput,this);
	G.sb.onCoinsChange.add(function(coins) {
		this.coinsTxt.setText(coins.toString());
	},this);

	G.sb.onMapToUIPartFinished.add(function(part) {

		G.sfx.pop.play();

		if (part.rewardType == 'coin') {
			this.coinsTxt.setText(this.coinsTxt.currentVal+part.coinValue);
			this.coinsTxt.currentVal += part.coinValue;
		}else {
			this.starsTxt.setText(++this.starsTxt.currentVal);
		}

	},this);

	this.onResize();

};

G.UI_MapPanel.prototype = Object.create(Phaser.Group.prototype);

G.UI_MapPanel.prototype.lockInput = function() {
	this.ignoreChildInput = true;
	//this.globalGoalBtn.ignoreChildInput = true;
};

G.UI_MapPanel.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
	//this.globalGoalBtn.ignoreChildInput = false;
};


G.UI_MapPanel.prototype.onResize = function(){

	if (G.horizontal){

		this.soundBtn.x = 858;
		this.starsIco.x = -31;
		this.starsTxt.x = 7;
		this.coinButton.x = 682;
		this.coinIco.x = 599;
		this.coinsTxt.x = 675;
		this.plusIcon.x = 760;
		this.lifeUI.x = -212;
		this.globalGoalBtn.x = -212;
		this.logo.visible = true;


	}else{

		this.soundBtn.x = 580;
		this.starsIco.x = 210;
		this.starsTxt.x = 240;
		this.coinButton.x = 420;
		this.coinIco.x = 345;
		this.coinsTxt.x = 425;
		this.plusIcon.x = 500;
		this.lifeUI.x = 55;
		this.globalGoalBtn.x = 55;
		this.logo.visible = false;

	}

};


G.UI_MapPanelFxLayer = function(mapPanel) {

	Phaser.Group.call(this,game);

	this.mapPanel = mapPanel;

	G.sb.onMapToUIPart.add(function(obj) {
		this.getFreeParticle().init(obj);
	},this);

};
G.UI_MapPanelFxLayer.prototype = Object.create(Phaser.Group.prototype);

G.UI_MapPanelFxLayer.prototype.getFreeParticle = function() {
	return this.getFirstDead() || this.add(new G.UI_MapPanelFxPart(this.mapPanel));
};

G.UI_MapPanelFxLayer.prototype.update = function() {
	this.sort('y', Phaser.Group.SORT_ASCENDING);
};


G.UI_MapPanelFxPart = function(mapPanel) {

	Phaser.Image.call(this,game);
	this.kill();
	this.anchor.setTo(0.5);
	this.mapPanel = mapPanel;

}

G.UI_MapPanelFxPart.prototype = Object.create(Phaser.Image.prototype);

G.UI_MapPanelFxPart.prototype.init = function(obj) {
	
	this.revive();

	this.x = obj.worldPosition.x + game.world.bounds.x;
	this.y = obj.worldPosition.y;
	this.coinValue = obj.coinValue;
	this.scale.setTo(obj.scale.x);
	this.rewardType = obj.rewardType;

	G.changeTexture(this, obj.frameName);

	var target = obj.rewardType == 'coin' ? this.mapPanel.coinIco : this.mapPanel.starsIco;
	var targetX = target.worldPosition.x+game.world.bounds.x;
	var targetY = target.worldPosition.y;

	game.add.tween(this.scale).to({width: this.width*1.5,height: this.height*1.5},250,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		game.add.tween(this).to({x:targetX,y:targetY,width:target.width,height:target.height},500,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
			G.sb.onMapToUIPartFinished.dispatch(this);
			this.destroy();
		},this);
	},this);

};
G.UI_PointsCounter = function(x,y) {

	G.OneLineText.call(this,x,y,'font-blue',"0",25,120,0.5,0.5);

	this.points = 0;
	this.pointsTarget = 0;

	G.sb.onPointsChange.add(function(amount) {
		this.pointsTarget = amount;
	},this);

	game.add.existing(this);

};

G.UI_PointsCounter.prototype = Object.create(G.OneLineText.prototype);

G.UI_PointsCounter.prototype.update = function() {

	if (this.points == this.pointsTarget) return;
	
	this.points += (game.math.clamp(Math.ceil((this.pointsTarget-this.points)*0.2),0,this.pointsTarget-this.points));

	this.setText(this.points.toString());

};
G.UI_ProgressBar = function(x,y) {

	Phaser.Group.call(this,game);

	var lvl = G.lvlData;

	this.x = G.l(x);
	this.y = G.l(y);

	this.barBg = G.makeImage(0,0,'score_bar1',0.5,this);

	this.points = 0;
	this.pointsTarget = 0;
	this.barMaxPoints = lvl.starsReq[2]*1.2;

	this.barProgress = G.makeImage(0,0,'score_bar2',0.5,this);

	this.barProgressLine = G.makeImage(0,0,'score_bar2_line',[0,0.5],this);
	this.barProgressLine.visible = false;
	//this.barProgress.cropRect = new Phaser.Rectangle(0,0,0,this.barProgress.height);
	//this.barProgress.updateCrop();

	this.barProgressMask = game.add.graphics();
	this.add(this.barProgressMask);
	this.barProgressMask.position = this.barProgress.position;
	this.barProgress.mask = this.barProgressMask;

	this.barProgressMask.beginFill(0x000000);
	G.drawCircleSegment(this.barProgressMask,0,0,G.l(80),170,171);


	var distance = this.barBg.width*0.5;


	this.rods = [
		G.makeImage(0,0,'goal_rod',[0,0.5],this),
		G.makeImage(0,0,'goal_rod',[0,0.5],this),
		G.makeImage(0,0,'goal_rod',[0,0.5],this), 
	];



	this.rods.forEach(function(e,index) {
		e.angle = this.pointsToAngle(lvl.starsReq[index]);
	},this);


	this.stars = [
		G.makeImage(
			G.lengthDirX(this.pointsToAngle(lvl.starsReq[0]), distance,false),
			5+G.lengthDirY(this.pointsToAngle(lvl.starsReq[0]), distance,false),
			'score_bar_star_blank',0.5,this),
		G.makeImage(
			G.lengthDirX(this.pointsToAngle(lvl.starsReq[1]), distance,false),
			5+G.lengthDirY(this.pointsToAngle(lvl.starsReq[1]), distance,false),
			'score_bar_star_blank',0.5,this),
		G.makeImage(
			G.lengthDirX(this.pointsToAngle(lvl.starsReq[2]), distance,false),
			5+G.lengthDirY(this.pointsToAngle(lvl.starsReq[2]), distance,false),
			'score_bar_star_blank',0.5,this)
	];



	this.stars.forEach(function(elem,index) {
		elem.req = lvl.starsReq[index];
	});


	this.scoreBg = G.makeImage(0,-11,'score_bar_front',[0.5,0],this);

	G.sb.onPointsChange.add(function(amount) {
		this.pointsTarget = amount;
	},this);


};

G.UI_ProgressBar.prototype = Object.create(Phaser.Group.prototype);

G.UI_ProgressBar.prototype.pointsToAngle = function(points) {

	return game.math.clamp(180+(points/this.barMaxPoints)*180,0,380);


};

G.UI_ProgressBar.prototype.update = function() {

	if (this.points == this.pointsTarget) return;

	this.changePoints(game.math.clamp(Math.ceil((this.pointsTarget-this.points)*0.05),0,this.pointsTarget-this.points));


};

G.UI_ProgressBar.prototype.changePoints = function(change) {
		
	var oldPoints = this.points;
	this.points += change;

	this.barProgressMask.clear();
	this.barProgressMask.beginFill(0x000000);
	G.drawCircleSegment(this.barProgressMask,0,0,G.l(80),90,this.pointsToAngle(this.points));

	this.barProgressLine.angle = this.pointsToAngle(this.points);
	this.barProgressLine.height = 6;
	this.barProgressLine.visible = true; 

	var diff = game.math.clamp(Math.abs((Math.abs(this.barProgressLine.angle)-90)/90),0,1);
	
	//this.barProgressLine.width = G.l(77)-diff*G.l(10);


	//this.barProgress.cropRect.width = (this.points/this.barMaxPoints)*this.barBg.width;
	//this.barProgress.updateCrop();

	for (var i = 0; i < 3; i++) {
		 if (oldPoints < this.stars[i].req && this.stars[i].req <= this.points) {
		 	G.changeTexture(this.stars[i],'score_bar_star');
		 	G.lvl.stars++;
		 	
		 	if (i < 2) {
		 		G.sfx.xylophone_positive.play();
		 	}else {
		 		G.sfx.xylophone_positive2.play();
		 	}

		 	game.add.tween(this.stars[i].scale).to({x:1.5,y:1.5},300,Phaser.Easing.Sinusoidal.InOut,true,0,0,true);
		 	G.sb.UIfx.dispatch(this.stars[i].worldPosition.x+game.world.bounds.x,this.stars[i].worldPosition.y,'whiteStarPart');
		 	G.sb.UIfx.dispatch(this.stars[i].worldPosition.x+game.world.bounds.x,this.stars[i].worldPosition.y,'whiteStarPart');
		 	G.sb.UIfx.dispatch(this.stars[i].worldPosition.x+game.world.bounds.x,this.stars[i].worldPosition.y,'whiteStarPart');
		 	G.sb.UIfx.dispatch(this.stars[i].worldPosition.x+game.world.bounds.x,this.stars[i].worldPosition.y,'whiteStarPart');
		 } 
	}

};
G.UI_TopBar = function(lvl) {

	Phaser.Group.call(this,game);
	
	this.bg = G.makeImage(320,0,'top_ui_horizontal',[0.5,0],this);  
	this.goalBg = G.makeImage(410,75,'top_ui_task',0.5,this);
	
	this.progressBar = new G.UI_ProgressBar(40,140);

 	this.movesLeft = G.lvl.moves;
	this.movesTxt = new G.OneLineText(410,75,'font-blue',G.txt(13)+': '+G.lvl.moves,30,160,0.5,0);
	this.add(this.movesTxt);

	if (G.lvlData.goal[0] == 'collect') {
		this.goalPanel = new G.UI_GoalPanelCollect(410,75);
	}else {
		this.goalPanel = new G.UI_GoalPanelPoints(410,75);
	}
	
	this.pointsCounter = new G.UI_PointsCounter(0,0); 


	this.extraMovesBtn = new G.UI_ExtraMovesBuyButton();


	G.sb.changeMoveNumber.add(function() {
		this.movesTxt.setText(G.txt(13)+': '+G.lvl.moves);
	},this);

	G.sb.onScreenResize.add(this.onScreenResize,this);

	this.onScreenResize();
	/*
	G.sb.onGoalAchieved.add(function() {
		this.add(new G.JewelsBlitzMoneyCounter());
		game.add.tween(this.goalPanel).to({alpha:0},1000,Phaser.Easing.Sinusoidal.In,true);
	},this);
	*/

};

G.UI_TopBar.prototype = Object.create(Phaser.Group.prototype);


G.UI_TopBar.prototype.onScreenResize = function() {



	if (G.horizontal) {

		G.changeTexture(this.bg,'top_ui_horizontal');

		this.bg.x = 0;
		this.bg.y = G.l(30);

		this.movesTxt.x = 0;
		//this.movesNrTxt.x = this.movesTxt.x+this.movesTxt.width+G.l(15);
		this.movesTxt.y = G.l(220);

		this.extraMovesBtn.x = 0;
		this.extraMovesBtn.targetY = G.l(310);

		this.progressBar.x = this.pointsCounter.x = 0;
		this.progressBar.y = G.l(145);
		this.pointsCounter.y = G.l(176);

		G.changeTexture(this.goalBg,'top_ui_horizontal_task');
		this.goalBg.x = 0;
		this.goalBg.y = G.l(450);

		this.goalPanel.x = G.l(0);
		this.goalPanel.y = G.l(445);




	}else {

		G.changeTexture(this.bg,'top_ui_base');

		this.bg.x = G.l(320);
		this.bg.y = 0;

		this.movesTxt.x = G.l(434);
		//this.movesNrTxt.x = this.movesTxt.x+this.movesTxt.width+G.l(15);
		this.movesTxt.y = G.l(104);

		this.extraMovesBtn.x = G.l(540);
		this.extraMovesBtn.targetY = G.l(130);


		this.progressBar.x = this.pointsCounter.x = G.l(125);
		this.progressBar.y = G.l(95);
		this.pointsCounter.y = G.l(127);

		G.changeTexture(this.goalBg,'top_ui_task');
		this.goalBg.x = G.l(410);
		this.goalBg.y = G.l(75);

		this.goalPanel.x = G.l(410);
		this.goalPanel.y = G.l(75);

		



	}

};

G.WindowLayer = function(offsetH,offsetV) {
	
	this.fadeImg = game.add.image(0,0);
	G.changeTexture(this.fadeImg,'dark_screen');
	this.fadeImg.fixedToCamera = true;
	this.fadeImg.cameraOffset.x = -5;
	this.fadeImg.width = game.width+10;
	this.fadeImg.height = game.height;
	this.fadeImg.alpha = 0;
	this.fadeImg.visible = false;
	this.fadeImg.cacheAsBitmap = false;

	this.inputLayer = G.makeImage(0,0,null,0.5);
	this.inputLayer.inputEnabled = true;
	this.inputLayer.events.onInputDown.add(function() {},this);
	this.inputLayer.hitArea = new Phaser.Rectangle(-10000,-10000,20000,20000);


	Phaser.Group.call(this, game);
	this.fixedToCamera = true;

	this.prevLength = 0;
	this.dispatch = false;

	this.offsetH = G.l(offsetH || 0);
	this.offsetV = G.l(offsetV || 0);

	this.queue = [];

	G.sb.onScreenResize.add(this.resize,this);
	G.sb.onWindowOpened.add(this.cacheWindow,this);
	G.sb.onWindowClosed.add(this.onWindowClosed,this);
	G.sb.pushWindow.add(this.pushWindow,this);
	G.sb.closeAndOpenWindow.add(function(windowToOpen,windowToGoBack) {
		if (this.children.length > 0) {
			this.children[0].closeWindow();
		}
		this.pushWindow([windowToOpen,windowToGoBack]);
	},this);

	this.resize();

}

G.WindowLayer.prototype = Object.create(Phaser.Group.prototype);
G.WindowLayer.constructor = G.WindowLayer;

G.WindowLayer.prototype.resize = function() {
	this.cameraOffset.x = Math.floor(game.width*0.5)+this.offsetH;
	this.cameraOffset.y = Math.floor(game.height*0.5)+this.offsetV;

	this.fadeImg.width = game.width+10;
	this.fadeImg.height = game.height+10;
	this.fadeImg.updateCache();
}

G.WindowLayer.prototype.update = function() {

	if (this.prevLength > 0 && this.length == 0) {
		this.dispatch = true;
	}

	if (this.length == 0) {
		this.inputLayer.visible = false;
		this.fadeImg.alpha = Math.max(0,this.fadeImg.alpha-0.1);
		if (this.dispatch && this.fadeImg.alpha == 0) {
			G.sb.onWindowClosed.dispatch(this);
			this.dispatch = false;
		}
	}else {
		this.inputLayer.visible = true;
		if (!this.children[0].stopFade) {
			this.fadeImg.alpha = Math.min(1,this.fadeImg.alpha+0.1);
		}
	}

	if (this.length > 0) {
		this.children[0].update();
	}
}

G.WindowLayer.prototype.onWindowClosed = function() {

	if (this.queue.length > 0) {
		var args = this.queue.splice(0,1);
		new G.Window(args[0]);
	}else {
		G.sb.onAllWindowsClosed.dispatch();
	}

};

G.WindowLayer.prototype.cacheWindow = function(win) {

	this.add(win);

};

G.WindowLayer.prototype.pushWindow = function(type,unshift) {

	if (this.queue.length == 0 && this.children.length == 0) {
		new G.Window(type);
	}else {
		if (unshift) {
			this.queue.unshift(type);
		}else {
			this.queue.push(type);
		}
		
	}

};

G.WindowLayer.prototype.push = G.WindowLayer.prototype.pushWindow;

G.WinStarPart = function(x,y,autostart) {

	Phaser.Image.call(this,game,x,y);
	G.changeTexture(this,'starPart');
	this.anchor.setTo(0.5);
	this.visible = false;

	this.scale.setTo(1.5);

	this.grav = G.lnf(0.75);

	if (autostart) {
		this.start();
	}else {
		this.visible = false;
	}

};

G.WinStarPart.prototype = Object.create(Phaser.Image.prototype);

G.WinStarPart.prototype.start = function() {
	this.visible = true;
	this.spdX = G.lnf((Math.random()*25)-12.5) 
	this.spdY = G.lnf((Math.random()*-15)-5);
	this.angle = Math.random()*360;
};

G.WinStarPart.prototype.update = function() {
	
	if (this.visible) {
		this.x += this.spdX;
		this.y += this.spdY;
		this.spdX *= 0.98;
		this.angle += this.spdX;
		this.spdY += this.grav;
		this.alpha -= 0.02;
		if (this.alpha <= 0) {
			this.destroy();
		}
	}


};
G.WorldMap = function(maptiles,animElements,levels,editorMode) {

	Phaser.Group.call(this,game);

	this.inputLayer = G.makeImage(0,0,null);
	this.inputLayer.inputEnabled = true;
	this.inputLayer.events.onInputDown.add(function() {
		this.clicked = true;
	},this);
	this.inputLayer.hitArea = new Phaser.Rectangle(-10000,-10000,20000,20000);
	this.clicked = false;

	this.x = G.l(640)*0.5;
	this.centerX = G.l(640)*0.5;
	this.y = game.height;

	this.editorMode = editorMode;
	this.state = game.state.getCurrentState();


	this.processMaptiles(G.json.settings.mapTiles);


	
	this.btnLayer = new G.WorldMapLvls(this);
	this.chestLayer = new G.WorldMapChestLayer(this);
	this.cloudLayer = new G.WorldMapCloudLayer(this);
	this.gateLayer = new G.WorldMapGateLayer(this);


	if (editorMode) {



		function mouseWheel(event) { 
			if (!this.alive) return game.input.mouse.mouseWheelCallback = null;

			this.y += game.input.mouse.wheelDelta * 150;
		}

		game.input.mouse.mouseWheelCallback = mouseWheel.bind(this);
		
		this.prevX = null;
		this.prevY = null;

		this.update = function() {
			this.x = 700;

			if (game.input.activePointer.middleButton.isDown) {
				if (this.prevX !== null) {
					//this.x -= (this.prevX - game.input.activePointer.x)*3;
					this.y -= (this.prevY - game.input.activePointer.y)*3;
				}
				this.prevX = game.input.activePointer.x;
				this.prevY = game.input.activePointer.y;

			}else {
				this.prevX = null;
				this.prevY = null;
			}

		}

	}

	this.mapWidth = this.width*1.1;
	this.localBounds = this.getLocalBounds();
	this.additionalMargin = G.l(50);
	this.velX = 0;
	this.velY = 0;
	this._x = G.l(320);
	this._y = this.y;

	var lastLvlData = this.state.lastLevelData;
	
	this.lockedInput = false;
	
	this.centerOnLvl(G.saveState.getLastPassedLevelNr());

	var lastLevelData = this.state.lastLevelData;

	//MONEY POP UP ANIMATION
	if (lastLevelData && (lastLevelData.starImprovement > 0 || lastLevelData.reward > 0)){
		this.lockInput();

		game.time.events.add(500, function(){

			this.batchesWaitingForFinish = 0;

			if (lastLevelData.starImprovement > 0){
				this.afterLvlPartBatch(lastLevelData.lvlNr,lastLevelData.starImprovement,'stars')
			}

			if (lastLevelData.reward > 0){
				this.afterLvlPartBatch(lastLevelData.lvlNr,lastLevelData.reward,'coins')
			}

			if (this.batchesWaitingForFinish == 0) {
				this.unlockInput();
			}

		},this);

	}


};

G.WorldMap.prototype = Object.create(Phaser.Group.prototype);


G.WorldMap.prototype.centerOnLvl = function(lvlNr) {

	lvlNr = Math.min(G.json.levels.length-1,lvlNr);

	var mapX = G.l(G.json.levels[lvlNr].mapX)
	var mapY = G.l(G.json.levels[lvlNr].mapY)

	this.x = G.l(320);
	this.y = this._y = game.math.clamp(game.height+(Math.abs(mapY)-game.height*0.5),game.height,Math.max(game.height,this.mapHeight));

	this.updatePosition();

};


G.WorldMap.prototype.update = function() {

	if (this.lockedInput) return;

	if (this.state.windowLayer.children.length > 0) {
		this.velY = 0;
		this.velX = 0;
		return;
	}

	if (this.clicked && game.input.activePointer.isDown) {

			if (this.prevY != null) {
				this.velY = (game.input.activePointer.y - this.prevY);
			}
			this.prevY = game.input.activePointer.y;


			if (this.prevX != null) {
				this.velX = (game.input.activePointer.x - this.prevX);
			}
			this.prevX = game.input.activePointer.x;

	}else {

		this.clicked = false;

		this.prevY = null;
		this.prevX = null;
	}

	this._x += this.velX;
	this._y += this.velY;
	this.velX *= 0.95;
	this.velY *= 0.95; 

	
	this.updatePosition();

};

G.WorldMap.prototype.updatePosition = function() {

	var mapHeight = Math.min(this.mapHeight,this.gateLayer.getMinY()+500);

	this._y = game.math.clamp(this._y,game.height,Math.max(game.height,mapHeight));
	this.y = game.math.clamp(Math.round(this._y),game.height,Math.max(game.height,mapHeight));

	var diff = Math.max(0,(1200-game.width)*0.5);

	this._x = game.math.clamp(this._x,
		320-diff,
		320+diff);
	this.x = this._x;

};

G.WorldMap.prototype.processMaptiles = function(maptiles) {
	
	this.mapHeight = maptiles.totalHeight;

	if (this.editorMode) this.mapHeight *= 2;  

	for (var i = 0; i < maptiles.tiles.length; i++){

		var tile = maptiles.tiles[i];
		var rt = game.cache.getRenderTexture(tile.rt);
		img = game.make.image(0,tile.y,rt.texture);
		img.anchor.setTo(0.5,1);
		img.autoCull = true;
		this.add(img);
	}

};


G.WorldMap.prototype.refreshButtons = function() {

	this.btnLayer.refreshData();

};


G.WorldMap.prototype.processAnimElements = function(animElements) {

	animElements.forEach(function(child) {

		var elem = G.makeImage(child[0],child[1],child[2],0.5,this);
		
		elem.tweenY = game.add.tween(elem).to({y: elem.y-G.l(20)},5000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

		elem.angle = -15;
		elem.tweenAngle = game.add.tween(elem).to({angle: 15},10000,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

		elem.tweenY.timeline[0].dt = Math.random()*elem.tweenY.timeline[0].duration;
		elem.tweenAngle.timeline[0].dt = Math.random()*elem.tweenAngle.timeline[0].duration;

	},this);
	
};


G.WorldMap.prototype.lockInput = function(){

	this.lockedInput = true;
	this.btnLayer.ignoreChildInput = true;
	this.chestLayer.lockInput();
	this.gateLayer.lockInput();

};

G.WorldMap.prototype.unlockInput = function(){

	this.lockedInput = false;
	this.btnLayer.ignoreChildInput = false;
	this.chestLayer.unlockInput();
	this.gateLayer.unlockInput();
	
};

G.WorldMap.prototype.afterLvlPartBatch = function(lvlNr,amount,objType){

	var coins = objType == 'coins';

	var btn = this.btnLayer.getButtonObj(lvlNr);

	if  (!btn) {
		return;
	}

	var batch = this.state.uiTargetParticlesBW.createDividedBatch(
		game.world.bounds.x+btn.worldPosition.x,
		btn.worldPosition.y,
		coins ? 'coin_1' : 'map_star_1',
		coins ? this.state.panel.coinsTxt : this.state.panel.starsIco, 
		amount,
		coins ? 5 : 1);

	batch.addOnPartStart(function() {
		if (coins) this.scale.setTo(0.75);
		//this.vel.setTo(game.rnd.realInRange(-12,12),game.rnd.realInRange(-12,12));

		this.speedDelta = 1.5;
		this.speedMax = 35;

		var verOffsetY = 0; 
		var verVelY = G.lnf((Math.random()*-2)-5);
		var velX = game.rnd.realInRange(-2.5,2.5);
		var yy = this.y;
		var velYY = game.rnd.realInRange(-2.5,2.5);
		var grounded = false;

		this.update = function(){
			
			if (this.grounded) return;

			this.x += velX;
			yy += velYY;

			verOffsetY += verVelY;
			
			if (verOffsetY > 0) {

				if (Math.abs(verVelY) > 4) {
					verVelY *= -0.7;
				}else {
					verVelX = 0;
					velX = 0;
					velYY = 0;
					grounded = true;
					game.time.events.add(game.rnd.between(200,600),function() {
						this.update = G.UITargetParticle.prototype.update;
					},this);
				}

			}else{
				verVelY += 0.5;
			}
			verOffsetY = Math.min(0,verOffsetY);

			this.y = yy + verOffsetY;

		}
	});

	batch.addOnPartFinish(function() {
		if (coins) {
			G.saveState.changeCoins(this.carriedValue);
		}else{
			var starsTxt = this.state.panel.starsTxt;
			starsTxt.setText(parseInt(starsTxt.text)+1);
		}
	});

	this.batchesWaitingForFinish++;

	batch.onFinish.add(function(){
		this.batchesWaitingForFinish--;
		if (this.batchesWaitingForFinish == 0) {
			this.unlockInput();
		}
	},this);
	



	batch.start();

};
G.WorldMapCoinLayer = function(worldMap) {
	
	Phaser.Group.call(this,game);
	this.position = worldMap.position;

	this.inputEnabledChildren = false;

};

G.WorldMapCoinLayer.prototype = Object.create(Phaser.Group.prototype);

G.WorldMapCoinLayer.prototype.update = function() {
	this.sort('y', Phaser.Group.SORT_ASCENDING);

	for(var a=this.children.length;a--;){
		this.children[a].update();
	}

};


G.WorldMapCoinLayer.prototype.rewardOnLvl = function(lvlNr, coins, stars) {

	var xx = G.l(G.json.levels[lvlNr].mapX);
	var yy = G.l(G.json.levels[lvlNr].mapY);
	var reward = coins;

	while(reward > 0) {
		this.add(new G.WorldMapRewardPart(xx,yy,'coin',Math.min(reward,15)));
		reward-=15;
	}

	for (var i = 0; i < stars; i++) {
		this.add(new G.WorldMapRewardPart(xx,yy,'star'));
	}

};


G.WorldMapRewardPart = function(x,y,type,coinValue) {

	Phaser.Image.call(this,game,x,y);

	G.changeTexture(this,type == 'coin' ? 'coin_1' : 'star');

	this.rewardType = type;
	this.coinValue = coinValue || 0;

	this.anchor.setTo(0.5);
	this.scale.setTo(type == 'coin' ? 0.5 : 0.3);

	this.verOffsetY = 0; 
	this.verVelY = G.lnf((Math.random()*-2)-3);
	this.velX = G.lnf((Math.random()*3)-1.5);
	this.yy = y;
	this.velYY = G.lnf((Math.random()*3)-1.5); 

	this.grounded = false;

}


G.WorldMapRewardPart.prototype = Object.create(Phaser.Image.prototype);

G.WorldMapRewardPart.prototype.update = function() {

	if (this.grounded) return;

	this.x += this.velX;
	this.yy += this.velYY;


	this.verOffsetY += this.verVelY;
	this.verVelY += 0.2;
	if (this.verOffsetY > 0) {
		if (Math.abs(this.verVelY) > 2) {
			this.verVelY *= -0.6;
		}else {
			this.verVelX = 0;
			this.velX = 0;
			this.velYY = 0;
			this.grounded = true;
			game.time.events.add(Math.floor(Math.random()*500+200),function() {
				G.sb.onMapToUIPart.dispatch(this);
				this.destroy();
			},this);
		}
		
	}
	this.verOffsetY = Math.min(0,this.verOffsetY);

	this.y = this.yy + this.verOffsetY;

};
G.WorldMapLvlButton = function() {
	
	G.Button.call(this,0,0,null,this.handleClick,this);

	this.state = game.state.getCurrentState();

	this.starsImg = G.makeImage(0,30,null,0.5,this);
	this.lvlNrTxt = this.addChild(new G.OneLineText(-3,-16,'font-white','',50,60,0.5,0.5));
	this.lvlNrTxt.cacheAsBitmap = false;

	this.state = game.state.getCurrentState();

	this.addTerm(function() {
		return !G.saveState.isLevelBehindGate(this.lvlIndex);
	},this);

	this.kill();
};


G.WorldMapLvlButton.prototype = Object.create(G.Button.prototype);


G.WorldMapLvlButton.prototype.handleClick = function() {
	
	if (!this.state.EDITOR && !this.lvlAvailable) return;

	if (this.state.EDITOR) {
		this.state.selectLevel(this.lvlIndex);
		this.IMMEDIATE = true;
	}else {

		if (G.saveState.getCurrentLivesNr() == 0) {

			G.sb.pushWindow.dispatch('buyLives');

		}else {

			if (this.lvlIndex == 0 && !G.saveState.data.firstTimeBtn[this.lvlIndex]) {
				G.ga.event('FTUE:Map:FirstTime:Level1Button');
				G.saveState.data.firstTimeBtn[this.lvlIndex] = true;
				G.saveState.save();
			}else if (this.lvlIndex == 1 && !G.saveState.data.firstTimeBtn[this.lvlIndex]) {
				G.ga.event('FTUE:Map:SecondTime:Level2Button');
				G.saveState.data.firstTimeBtn[this.lvlIndex] = true;
				G.saveState.save();
			}

			G.lvlNr = this.lvlIndex;
			G.lvlData = G.json.levels[this.lvlIndex];
			G.sb.pushWindow.dispatch('level');

		}

	}
 
};

G.WorldMapLvlButton.prototype.revealChange = function() {
	game.add.tween(this.starsImg.scale).to({x:1,y:1},500,Phaser.Easing.Elastic.Out,true,1500).onComplete.add(function(){
		this.inputEnabled = true;
		this.input.useHandCursor = true;
	},this);
	this.state.lastLevelData.lvlNr = -999; 
}

G.WorldMapLvlButton.prototype.init = function(index,lvlData) {

	this.alpha = 1;

	this.stopPulse();
	this.revive();
	G.stopTweens(this);
	G.stopTweens(this.starsImg);
	this.starsImg.scale.setTo(1);
	
	this.x = G.l(lvlData.mapX);
	this.y = G.l(lvlData.mapY);
	this.lvlIndex = index;
	this.lvlAvailable = G.saveState.isLevelAvailable(this.lvlIndex);
	this.lvlStarsNr = G.saveState.getStars(this.lvlIndex);

	if (this.lvlAvailable) {

		this.lvlNrTxt.visible = true;
		this.lvlNrTxt.setText((this.lvlIndex+1).toString());

		if (this.lvlStarsNr == 0) {
			G.changeTexture(this,'map_point_2');
			G.changeTexture(this.starsImg,null);
			this.pulse();
		}else {
			G.changeTexture(this, 'map_point');
			G.changeTexture(this.starsImg,'map_star_'+this.lvlStarsNr);
		}

		this.inputEnabled = true;
		this.input.useHandCursor = true;

	}else {
		G.changeTexture(this,'map_point');
		G.changeTexture(this.starsImg,null);
		this.lvlNrTxt.visible = false;
		this.alpha = 0.5;
		this.inputEnabled = false;
		this.input.useHandCursor = false;
	}

};


G.WorldMapLvls = function(mother) {
	
	G.PoolGroup.call(this,G.WorldMapLvlButton);
	this.position = mother.position;

	this.lvlBtnCoords = G.json.levels.map(function(e,index) {
		return {mapY: G.l(e.mapY), lvlIndex: index, btnObj: null, lvlData: e};
	}).sort(function(a,b){
		return a.mapY - b.mapY;
	});

	G.sb.onWindowOpened.add(this.lockInput,this); 
	G.sb.onWindowClosed.add(this.unlockInput,this);

};

G.WorldMapLvls.prototype = Object.create(G.PoolGroup.prototype);



G.WorldMapLvls.prototype.refreshData = function() {

	this.lvlBtnCoords.forEach(function(e,i) {
		if (e.btnObj) this.detachButton(i);
	},this);

	this.lvlBtnCoords = G.json.levels.map(function(e,index) {
		return {mapY: G.l(e.mapY), lvlIndex: index, btnObj: null, lvlData: e};
	})/*.sort(function(a,b){
		return a.mapY - b.mapY;
	});*/

};

G.WorldMapLvls.prototype.getButtonObj = function(lvlNr) {

	for (var i = 0; i < this.children.length; i++) {
		var btn = this.children[i];
		if (btn.lvlIndex == lvlNr) {
			return btn;
		}
	}

};

G.WorldMapLvls.prototype.update = function() {

	var howDeep = this.y - game.height;

	var result = [];

	//to not loop to the end of array when when btns are showed
	var wasPushed = false;
	var wasPushedAndNoBtns = false;

	for (var i = 0; i < this.lvlBtnCoords.length; i++) {

		if (howDeep - G.l(40) + this.lvlBtnCoords[i].mapY < 0 && howDeep+game.height+G.l(40)+this.lvlBtnCoords[i].mapY > 0) { 
			if (this.lvlBtnCoords[i].btnObj === null) {
				this.attachButton(i);
			}
			wasPushed = true;
		}else {
			
			//if (wasPushedAndNoBtns) break;
				
			if (this.lvlBtnCoords[i].btnObj !== null) {
				this.detachButton(i);
			}else {
				wasPushedAndNoBtns = wasPushed;
			}

		}

	}

};

G.WorldMapLvls.prototype.attachButton = function(index) {

	this.lvlBtnCoords[index].btnObj = this.getFreeElement();
	this.lvlBtnCoords[index].btnObj.init(this.lvlBtnCoords[index].lvlIndex, this.lvlBtnCoords[index].lvlData);

};

G.WorldMapLvls.prototype.detachButton = function(index) {

	this.lvlBtnCoords[index].btnObj.kill();
	this.lvlBtnCoords[index].btnObj = null;

};

G.WorldMapLvls.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
};

G.WorldMapLvls.prototype.lockInput = function() {
	this.ignoreChildInput = true;
};
G.Booster = function(cellX,cellY,nr) {
	
	this.board = G.lvl.state.board;
	this.am = this.board.actionManager;
	this.cellX = cellX;
	this.cellY = cellY;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(cellX),
		this.board.cellYToPxIn(cellY-2)
	);

	this.anchor.setTo(0.5);

	this.boosterNr = nr;

	this.orgY = this.y;
	this.targetY = this.board.cellYToPxIn(cellY);

	G.changeTexture(this,'ui_booster_'+nr);
	this.alpha = 0;
	this.scale.setTo(2);
	
	game.add.tween(this.scale).to({x:1,y:1},700,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this).to({alpha: 1},700,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		game.add.tween(this).to({y: this.targetY},300,Phaser.Easing.Cubic.In,true).onComplete.add(function() {


			var matchCandy = this.getMatchCandy(this.boosterNr);

			if (this.boosterNr == 3) {
				
				G.sb.fx.dispatch('strokeH',matchCandy);
				G.sb.fx.dispatch('lightCircle',matchCandy);
				G.sb.fx.dispatch('explosion',matchCandy); 
			}


			if (this.boosterNr == 4) {
				
				G.sb.fx.dispatch('strokeV',matchCandy);
				G.sb.fx.dispatch('lightCircle',matchCandy);
				G.sb.fx.dispatch('explosion',matchCandy);
			}

			this.board.checkSpecialMatchList.push(matchCandy);
			this.am.newAction('processMatch');
			this.am.removeAction();

			game.add.tween(this).to({y: this.orgY, alpha: 0},600,Phaser.Easing.Cubic.Out,true);
			game.time.events.add(600,this.destroy,this);


		},this);
	},this);

};

G.Booster.prototype = Object.create(Phaser.Image.prototype);

G.Booster.prototype.getMatchCandy = function(nr) {


	if (nr == 2) return {cellX: this.cellX, cellY: this.cellY, exe: [['specific',[0,0]]]};

	if (nr == 3) return {cellX: this.cellX, cellY: this.cellY, exe: [['loop',{x:-1,y:0}],['loop',{x:1,y:0}]]}

	if (nr == 4) return {cellX: this.cellX, cellY: this.cellY, exe: [['loop',{x:0,y:-1}],['loop',{x:0,y:1}]]}


};
G.BoosterHorizontal = function(cellX,cellY,nr) {
	
	this.board = G.lvl.state.board;
	this.am = this.board.actionManager;
	this.cellX = cellX;
	this.cellY = cellY;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(-0.5),
		this.board.cellYToPxIn(cellY)
	);
 
	this.anchor.setTo(0.5);

	this.oldCellX = -1; 
	this.boosterNr = nr;
	this.active = false;

	this.orgY = this.y;
	this.targetX = this.board.cellYToPxIn(this.board.boardData.width)+G.l(30);

	G.changeTexture(this,'ui_booster_'+nr);
	this.alpha = 0; 
	this.scale.setTo(2);
	
	game.add.tween(this.scale).to({x:1,y:1},1000,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this).to({alpha: 1},1000,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {

		this.active = true;
		/*
		game.add.tween(this).to({x: this.targetX},700,Phaser.Easing.Cubic.In,true).onComplete.add(function() {

			var matchCandy = this.getMatchCandy(this.boosterNr);

			if (this.boosterNr == 3) {
				
				G.sb.fx.dispatch('strokeH',matchCandy);
				G.sb.fx.dispatch('lightCircle',matchCandy);
				G.sb.fx.dispatch('explosion',matchCandy);
			}


			if (this.boosterNr == 4) {
				
				G.sb.fx.dispatch('strokeV',matchCandy);
				G.sb.fx.dispatch('lightCircle',matchCandy);
				G.sb.fx.dispatch('explosion',matchCandy);
			}

			this.board.checkSpecialMatchList.push(matchCandy);
			this.am.newAction('processMatch');
			G.sb.onBoosterActionFinished.dispatch();
			this.am.removeAction();

			game.add.tween(this).to({y: this.orgY, alpha: 0},600,Phaser.Easing.Cubic.Out,true);
			game.time.events.add(600,this.destroy,this);

		},this);
		*/


	},this); 

};

G.BoosterHorizontal.prototype = Object.create(Phaser.Image.prototype);

/*
G.BoosterHorizontal.prototype.getMatchCandy = function(nr) {

	if (nr == 2) return {cellX: this.cellX, cellY: this.cellY, exe: [['specific',[0,0]]]};

	if (nr == 3) return {cellX: this.board.boardData.width-1, cellY: this.cellY, exe: [['loop',{x:-1,y:0}],['loop',{x:1,y:0}]]}

	if (nr == 4) return {cellX: this.cellX, cellY: this.cellY, exe: [['loop',{x:0,y:-1}],['loop',{x:0,y:1}]]}


};
*/

G.BoosterHorizontal.prototype.update = function() {

	if (!this.active) return;

	this.x += G.l(10);

	var cellX = this.board.pxInToCellX(this.x);
	var candy;
	

	if (cellX != this.oldCellX) {


		this.oldCellX = cellX;
		candy = this.board.getCandy(cellX-1,this.cellY);

		if (candy && !candy.goalCandy) {
			
			if (this.board.isCellMatchable(cellX-1,this.cellY)) {

				if (this.board.boardDirt.isDirt(cellX-1,this.cellY)) {
					this.board.boardDirt.matchCell(cellX-1,this.cellY);
				}

				if (this.board.boardCage.isCage(cellX-1,this.cellY)) {
					this.board.boardCage.onMatch(cellX-1,this.cellY);
				}else if (candy.special) {
					this.board.checkSpecialMatchList.push(candy);
				}else {
					candy.match();
					G.sfx.boom.play();
					G.lvl.processMatch(1,candy.cellX,candy.cellY);
				}

			}

			this.board.hitCell(cellX-1,this.cellY);
	
		}

	}

	


	if (this.x >= this.targetX && this.board.duringAnimation == 0) {
			this.active = false;
			if (this.board.checkSpecialMatchList.length == 0) {
			this.am.newAction('processFall');
			}else {
			this.am.newAction('processMatch');
			}
			G.sb.onBoosterActionFinished.dispatch();
			this.am.removeAction();
			this.destroy();
	}

};
G.BoosterSelection = function(cellX,cellY,follow) {

	this.board = G.lvl.state.board;
	this.am = this.board.actionManager;
	this.cellX = cellX;
	this.cellY = cellY;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(cellX),
		this.board.cellYToPxIn(cellY)
	);

	//if (G.lvl.tutOpen) this.visible = false;

	this.alpha = 0;

	this.follow = follow;

	this.anchor.setTo(0);

	G.changeTexture(this,'tut_hand');

	this.offsetTween = 0;

	game.add.tween(this).to({offsetTween: G.l(20)},300,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

	this.alphaTween = game.add.tween(this).to({alpha:0.8},300,Phaser.Easing.Sinusoidal.Out,true);

	//game.add.tween(this.scale).to({x:1.2,y:1.2},800,Phaser.Easing.Sinusoidal.InOut,true,0,-1,true);

}

G.BoosterSelection.prototype = Object.create(Phaser.Image.prototype);

G.BoosterSelection.prototype.update = function() {
	this.x = this.follow.x+this.offsetTween;
	this.y = this.follow.y+this.offsetTween;

};

G.BoosterSelection.prototype.hide = function() {
	
	this.alphaTween.stop();

	game.add.tween(this).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true,200).onComplete.add(function() {
		this.destroy();
	},this);

};
G.BoosterVertical = function(cellX,cellY,nr) {
	
	this.board = G.lvl.state.board;
	this.am = this.board.actionManager;
	this.cellX = cellX;
	this.cellY = cellY;

	Phaser.Image.call(this,game,
		this.board.cellXToPxIn(cellX),
		this.board.cellYToPxIn(-0.5)

	);

	this.anchor.setTo(0.5);

	this.boosterNr = nr;

	this.oldCellY = -1;
	
	this.orgY = this.y;
	this.targetY = this.board.cellYToPxIn(this.board.boardData.height)+G.l(30);

	G.changeTexture(this,'ui_booster_'+nr);
	this.alpha = 0;
	this.scale.setTo(2);
	
	game.add.tween(this.scale).to({x:1,y:1},1000,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this).to({alpha: 1},1000,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		
		this.active = true;

		/*game.add.tween(this).to({y: this.targetY},700,Phaser.Easing.Cubic.In,true).onComplete.add(function() {


			var matchCandy = this.getMatchCandy(this.boosterNr);

			if (this.boosterNr == 3) {
				
				G.sb.fx.dispatch('strokeH',matchCandy);
				G.sb.fx.dispatch('lightCircle',matchCandy);
				G.sb.fx.dispatch('explosion',matchCandy);
			}


			if (this.boosterNr == 4) {
				
				G.sb.fx.dispatch('strokeV',matchCandy);
				G.sb.fx.dispatch('lightCircle',matchCandy);
				G.sb.fx.dispatch('explosion',matchCandy);
			}

			this.board.checkSpecialMatchList.push(matchCandy);
			this.am.newAction('processMatch');
			G.sb.onBoosterActionFinished.dispatch();
			this.am.removeAction();

			game.add.tween(this).to({y: this.orgY, alpha: 0},600,Phaser.Easing.Cubic.Out,true);
			game.time.events.add(600,this.destroy,this);

		},this);
		*/
	},this);

};

G.BoosterVertical.prototype = Object.create(Phaser.Image.prototype);

G.BoosterVertical.prototype.getMatchCandy = function(nr) {

	if (nr == 2) return {cellX: this.cellX, cellY: this.cellY, exe: [['specific',[0,0]]]};

	if (nr == 3) return {cellX: this.board.boardData.width-1, cellY: this.cellY, exe: [['loop',{x:-1,y:0}],['loop',{x:1,y:0}]]}

	if (nr == 4) return {cellX: this.cellX, cellY: this.board.boardData.height-1, exe: [['loop',{x:0,y:-1}],['loop',{x:0,y:1}]]}


};

G.BoosterVertical.prototype.update = function() {

	if (!this.active) return;

	this.y += G.l(10);



	var cellY = this.board.pxInToCellY(this.y);
	var candy;
	

	if (cellY != this.oldCellY) {

		this.oldCellY = cellY;
		candy = this.board.getCandy(this.cellX,cellY-1);

		if (candy && !candy.goalCandy) {
			

			if (this.board.isCellMatchable(this.cellX,cellY-1)) {

				if (this.board.boardDirt.isDirt(this.cellX,cellY-1)) {
					this.board.boardDirt.matchCell(this.cellX,cellY-1);
				}

				if (this.board.boardCage.isCage(this.cellX,cellY-1)) {
					this.board.boardCage.onMatch(this.cellX,cellY-1);
				}else if (candy.special) {
					this.board.checkSpecialMatchList.push(candy);
				}else {
					candy.match();
					G.sfx.boom.play();
					G.lvl.processMatch(1,candy.cellX,candy.cellY);
				}

			}

			this.board.hitCell(this.cellX,cellY-1);
	
		}

	}

	


	if (this.y >= this.targetY && this.board.duringAnimation == 0) {

		this.active = false;
		if (this.board.checkSpecialMatchList.length == 0) {
		this.am.newAction('processFall');
		}else {
		this.am.newAction('processMatch');
		}

		G.sb.onBoosterActionFinished.dispatch();
		this.am.removeAction();
		this.destroy();

	}

};
G.dailyCheck = function() {
	
	var openDaily = function() {
		new G.Window('daily2');
		G.saveState.data.lastDaily = [now.getYear(),now.getMonth(),now.getDate()];
		G.saveState.save();
	}


	var now = new Date();
	var lastDaily = G.saveState.data.lastDaily;

	if (!lastDaily) {

		G.saveState.data.spins++;
		G.saveState.save();

		openDaily();		

	}else {

		if (lastDaily[2] != now.getDate() || lastDaily[1] != now.getMonth() || lastDaily[0] != now.getYear()) {
			openDaily();
		}
		
	}

};
G.DailyCoin = function(x,y,value) {
	
	Phaser.Image.call(this,game,G.l(x),G.l(y));
	this.state = game.state.getCurrentState();

	this.anchor.setTo(0.5);
	G.changeTexture(this,'coin_1');

	this.rewardType = 'coin';
	this.coinValue = value;
	this.scale.setTo(0.75);

	this.target = this.state.panel.coinIco;

	/*this.velX = game.rnd.realInRange(G.l(-8),G.l(8));
	this.velY = game.rnd.realInRange(G.l(-18),G.l(1));

	this.movement = 1;
	this.movementChange = game.rnd.realInRange(0.03,0.06);
	this.grav = G.lnf(0.5);*/

	game.add.existing(this);

	var target = this.target;
	game.add.tween(this).to({x:game.world.bounds.x + target.worldPosition.x,y:this.target.worldPosition.y,width:target.width,height:target.height},500,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
		G.saveState.changeCoins(this.coinValue);
		G.sb.onMapToUIPartFinished.dispatch(this);
		this.destroy();
	},this);

};

G.DailyCoin.prototype = Object.create(Phaser.Image.prototype);


G.DailyCoin.prototype.update = function() {

	 this.target;

	//250,500
	//game.add.tween(this.scale).to({width: this.width*1.5,height: this.height*1.5},1000,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
	
	//},this);




	/*if (this.movement <= 0) return;

	this.x  += this.velX*this.movement;
	this.y += this.velY*this.movement;

	this.velY += this.grav;
	this.movement -= this.movementChange;

	var target = this.target;
	

	if (this.movement <= 0) {
		
		game.add.tween(this.scale).to({width: this.width*1.5,height: this.height*1.5},250,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		game.add.tween(this).to({x:game.world.bounds.x + target.worldPosition.x,y:this.target.worldPosition.y,width:target.width,height:target.height},500,Phaser.Easing.Sinusoidal.InOut,true).onComplete.add(function() {
			G.sb.onMapToUIPartFinished.dispatch(this);
			this.destroy();
			},this);
		},this);

	}*/

};
G.DailyWheel = function(x,y) {
	
	Phaser.Group.call(this,game);

	D = this;

	this.state = game.state.getCurrentState();

	this.x = G.l(x);
	this.y = G.l(y);

	this.prizeTable = G.json.settings.wheelPrizes;
	this.prizeTableGold = G.json.settings.wheelPrizesGold 

	this.prizeTable.forEach(function(prize) {
		G.gift.processRandomBoosters(prize.prize);
	});

	this.prizeTableGold.forEach(function(prize){
		G.gift.processRandomBoosters(prize.prize);
	});

	this.angleBetweenFields = 360/this.prizeTable.length;
	this.anglePrizeStartOffset = this.angleBetweenFields/2;
	this.angleDiffSinceLastPin = 0;
	this.angleBetweenPins = 15; 

	this.angleSpeedMulti =  0.985;

	this.wheelGfx = this.add(this.makeWheelGfx(0,0,'prize_wheel_2',this.prizeTable));
	this.wheelGfxGold = this.add(this.makeWheelGfx(0,0,'gold_wheel',this.prizeTableGold));
	//this.wheelGfxGold.visible = false;

	this.wheelPointer = this.add(this.makeWheelPointer(0,-180,'prize_wheel_arrow'));

	WH = this.wheelGfx;
	this.wheelGfx.wheelDistancePassed = 0;
	this.wheelGfx.prevDistancePassed = 0;

	this.wheelGfx.inputEnabled = true;

	this.pointer =null;
	this.pointerStartX = 0;
	this.pointerClickedDate = 0;
	
	this.launched = false;
	this.finished = false;

	this.wheelGfx.events.onInputDown.add(function() {
		var pointer = game.input.activePointer;
		this.pointerStartX.worldX;
		this.pointerClickedDate = Date.now();
		this.pointer = pointer;
	},this);

	this.onFinish = new Phaser.Signal();

	this.gold = false;

};

G.DailyWheel.prototype = Object.create(Phaser.Group.prototype);


G.DailyWheel.prototype.changeToRegular = function(){

	this.gold = false;

};

G.DailyWheel.prototype.changeToGold = function(){

	this.gold = true;

};

G.DailyWheel.prototype.update = function() {

	this.wheelGfxGold.angle = this.wheelGfx.angle;

	if (this.gold) {
		this.wheelGfx.alpha = G.lerp(this.wheelGfx.alpha,0,0.1,0.02);
		this.wheelGfxGold.alpha = G.lerp(this.wheelGfxGold.alpha,1,0.1,0.02);
	}else {
		this.wheelGfx.alpha = G.lerp(this.wheelGfx.alpha,1,0.1,0.02);
		this.wheelGfxGold.alpha = G.lerp(this.wheelGfxGold.alpha,0,0.1,0.02);
	}

	this.wheelPointer.update();

	if (this.finished) return;

	if (this.launched) {

		var updateResult = this.updateLaunched();
		if (updateResult) {
			//this.applyPrize(updateResult.prize);
			this.onFinish.dispatch(updateResult.prize);
			this.finished = true;
		}

	}else if (this.pointer !== null && !this.pointer.isDown) {

/*		var distance = this.pointer.worldX-this.pointerStartX;
		var timeDiff = (Date.now()-this.pointerClickedDate)/1000;
		var speed = (distance/timeDiff)*0.5;
 
		if (distance > G.l(300) && speed > G.l(600)) {
			this.launch(game.math.clamp(speed,600,1400));
		}else {
			this.pointer = null;
		}
*/
	}


	for (var i = this.children.length; i--; ){
		this.children[i].update();
	} 

};




G.DailyWheel.prototype.restart = function() {
	if (!this.finished) return;

	this.launched = false;
	this.pointer = null;
	this.finished = false;
	if (this.giftGfx) {
		game.add.tween(this.giftGfx.scale).to({x:0,y:0},300,Phaser.Easing.Cubic.In,true).onComplete.add(function(){
			this.destroy();
		},this.giftGfx);
	}

	//this.tutHand.visible = false;
	this.wheelGfx.inputEnabled = true;
	//this.spinBtn.visible = true;

};


G.DailyWheel.prototype.launch = function(speed) {
	//this.tutHand.visible = false;
	this.wheelGfx.inputEnabled = false;
	//this.spinBtn.visible = false;	

	while(true) {

		var giftTestSpin  = this.testSpin(speed,this.wheelGfx.prevDistancePassed,this.wheelGfx.wheelDistancePassed);
		if (giftTestSpin.keep) {
			if (Math.random() > giftTestSpin.keep){
				speed += 80;
			}else {
				break;
			}
		}else {
			break;
		}
	}

	this.wheelGfx.angleSpeed = speed*0.025;
	this.launched = true;

};

G.DailyWheel.prototype.updateLaunched = function() {

	return this.updateWheel(this.wheelGfx,true);

};



G.DailyWheel.prototype.applyPrize = function(prize) {

	//(str,x,y,font,fontSize,anchorX,anchorY,maxWidth)


};



G.DailyWheel.prototype.testSpin = function(speed,prevDistancePassed,wheelDistancePassed) {

	var wheelGfx = {angle: 0};

	wheelGfx.angleSpeed = speed*0.025;
	wheelGfx.prevDistancePassed = prevDistancePassed || 0;
	wheelGfx.wheelDistancePassed = wheelDistancePassed || 0;

	while(true) {
		var gift = this.updateWheel(wheelGfx);
		if (gift) return gift;
	}

};


G.DailyWheel.prototype.updateWheel = function(wheel,bouncePointer) {


	wheel.angle += wheel.angleSpeed;

	var prevDistancePassed = wheel.wheelDistancePassed;
	wheel.wheelDistancePassed += wheel.angleSpeed;

	if (Math.floor(prevDistancePassed/this.angleBetweenPins) !== Math.floor(wheel.wheelDistancePassed/this.angleBetweenPins)) {
		if (bouncePointer){
			this.wheelPointer.bounce(Math.sign(wheel.angleSpeed)*-1)
		};
		wheel.angleSpeed = wheel.angleSpeed*0.95;
		if (wheel.angleSpeed < 0.25) {
			wheel.wheelDistancePassed = prevDistancePassed;
			wheel.angle = game.math.wrapAngle(prevDistancePassed);
			wheel.angleSpeed *= -0.5;		
		}
	}

	wheel.angleSpeed *= this.angleSpeedMulti;


	this.wheelGfxGold.angle = wheel.angle;

	if (Math.abs(wheel.angleSpeed) < 0.05) {
		return this.getPrizeFromAngle(wheel.angle);
	}else {
		return false;
	}

};


G.DailyWheel.prototype.getPrizeFromAngle = function(angle){

	var table = this.gold ? this.prizeTableGold : this.prizeTable;

	var angleToDisplay = angle+180;
	if (angle < 0) {
		angleToDisplay = 180+angle //180+(180+angle);
	}

	return table[Math.floor(angleToDisplay/this.angleBetweenFields)];

}


G.DailyWheel.prototype.makeWheelGfx = function(x,y,bg,prizeTable) {

	wheel = G.makeImage(0,0,bg,0.5);
	wheel.labels = wheel.addChild(game.make.group());

	var prizeIndex = prizeTable.length-1;
	for (var i = this.anglePrizeStartOffset; i < 360; i+=this.angleBetweenFields) {

		var currentPrize = prizeTable[prizeIndex];
		var label = new G.LabelGroup(
			G.gift.getLabelString(currentPrize.prize,1.4),
			G.lengthDirX(90+i,160,false),
			G.lengthDirY(90+i,160,false),
			currentPrize.specialField ? 'font-num-orange' : 'font-num-blue',
			30,
			1,
			0.5,
			200
		)
		label.angle = 90+i;
		wheel.labels.add(label);
		prizeIndex--;

	}

	wheel.labels.cacheAsBitmap = true;

	return wheel;

};


G.DailyWheel.prototype.makeWheelPointer = function(x,y,sprite) {

	var pointer = G.makeImage(x,y,sprite,0.5,null);
	pointer.soundTimer = 2;
	pointer.bounce = function(sign) {

		if (this.soundTimer < 0) {
			G.sfx.pop.play();
			this.soundTimer = 2;
		}
		
		this.angle = 10*sign;
	};

	pointer.update = function() {
		this.soundTimer--;
		this.angle = G.lerp(this.angle,0,0.2);
	};

	return pointer;

}
G.GiftUnwrapAnim = function(x,y,gift) {
	

	Phaser.Group.call(this,game);

	this.giftData =gift;

	this.x = G.l(x);
	this.y = G.l(y);

	this.light = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.light.update = function() {
		this.angle++;
	}; 
	this.light.alpha = 0;
	this.light.blendMode = 1;

	game.add.tween(this.light).to({alpha:0.2},1000,Phaser.Easing.Cubic.Out,true);
	game.add.tween(this.light).to({angle:360},3000,Phaser.Easing.Linear.None,true,0,-1,false);

	this.inside =  new G.LabelGroup(
			G.gift.getLabelString(this.giftData),
			0,0,'font-blue',100,0.5,0.5,180);
	this.add(this.inside);
	this.inside.scale.setTo(0.5,0); 

	game.add.tween(this.inside.scale).to({x:1,y:1},800,Phaser.Easing.Elastic.Out,true);

	//game.time.events.add(1200,this.hide,this);

	G.sfx.xylophone_positive_12.play();

	//G.gift.applyGift(this.giftData); 

};

G.GiftUnwrapAnim.prototype = Object.create(Phaser.Group.prototype);

G.GiftUnwrapAnim.prototype.hide = function() {

	game.add.tween(this).to({alpha:0},500,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		this.destroy();
	},this);

};


G.WorldMapWomensDayPack = function(x,y) {

	this.packData = G.json.settings.womensDayPack;
	
	if (!G.saveState.data.wdat) {
		G.saveState.data.wdat = Date.now();
	}

	if ((Date.now()-G.saveState.data.wdat) > this.packData.timeMinutes*60*1000){
		return;
	}



	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);

	this.glow = G.makeImage(0,0,'popup_lighht',0.5,this);
	this.glow.update = function(){this.angle++};
	this.glow.scale.setTo(0.5);
	this.glow.alpha = 0.25;
	this.glow.blendMode = 1;

	this.giftBtn = new G.Button(-7,0,'rose_case',function(){
		G.sb.pushWindow.dispatch('womensDayPack');
	},this);
	this.add(this.giftBtn);

	var secLeft = (this.packData.timeMinutes*60) - ((Date.now()-G.saveState.data.wdat)/1000);

	//this.timerBg = G.makeImage(0,40,'promo_pack_timerbg',0.5,this);

	this.timer = new G.Timer(15,44,'font-num-orange',25,150,0.5,0.5,secLeft);
	this.giftBtn.addChild(this.timer);
	this.timer.start();


	G.sb.onWindowOpened.add(this.lockInput,this); 
	G.sb.onWindowClosed.add(this.unlockInput,this);

	G.sb.onScreenResize.add(this.onResize,this);
	this.onResize();

};

G.WorldMapWomensDayPack.prototype = Object.create(Phaser.Group.prototype);


G.WorldMapWomensDayPack.prototype.update = function(){

	this.glow.angle++;

	if (G.saveState.data.womensDayPackBought || 
		(Date.now()-G.saveState.data.wdat) > this.packData.timeMinutes*60*1000
		) {
		this.alpha-=0.05;
		if (this.alpha <= 0) {
			this.destroy();
		}
	}

};

G.WorldMapWomensDayPack.prototype.onResize = function(){
	if (G.horizontal){
		this.x = -180;
	}else{
		this.x = 80;
	}
};

G.WorldMapWomensDayPack.prototype.unlockInput = function() {
	this.ignoreChildInput = false;
};

G.WorldMapWomensDayPack.prototype.lockInput = function() {
	this.ignoreChildInput = true;
};

G.WorldMapWomensDayPack.isActive = function(){

	return !G.saveState.data.womensDayPackBought && 
		(Date.now()-G.saveState.data.wdat) < G.json.settings.womensDayPack.timeMinutes*60*1000

};

G.Window = function(type) {

	Phaser.Group.call(this, game);
	this.buttonsList = [];
	this.state = game.state.getCurrentState();
	
	if (type.constructor === Array) {
		this[type[0]].apply(this,type.slice(1));
	}else {
		this[type].apply(this,Array.prototype.slice.call(arguments,1));	
	}
	
	if (type != 'taskSlider') {
		game.add.tween(this.scale).from({x:0},300,Phaser.Easing.Elastic.Out,true);
		game.add.tween(this).from({alpha:0},200,Phaser.Easing.Sinusoidal.In,true);
	}


	G.sb.onWindowOpened.dispatch(this);
	G.sb.onStateChange.add(this.lockInput,this);

}

G.Window.prototype = Object.create(Phaser.Group.prototype);
G.Window.constructor = G.Window;

G.Window.prototype.closeWindow = function(callback,context) {

	if (this.closing) return;

	this.lockInput();

	this.closing = true;

	if (this.boosterHighlight) {
		this.boosterHighlight.inputEnabled = false;
		game.add.tween(this.boosterHighlight.shine).to({alpha: 0},800,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
			this.boosterHighlight.destroy();
		},this);
	}

	game.add.tween(this.scale).to({x:1.5},200,Phaser.Easing.Sinusoidal.In,true);
	game.add.tween(this).to({alpha: 0},200,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
		
		G.sb.onWindowClosed.dispatch();
		this.destroy();
		if (callback) {
			callback.call(context||false);
		}

	},this);
};

G.Window.prototype.addBackground = function(image) {
	var image = image || 'popup';
	this.bg = G.makeImage(0,0,image,0.5,this);
};

G.Window.prototype.addCloseButton = function(x,y,callback,context) {

	var callback = callback || false;
	var context = context || this;

	this.closeButton = new G.Button(x || 250,y || -270,'btn_x',function() {
			this.closeWindow(callback,context);
	},this);

	this.registerButtons(this.closeButton);

};

G.Window.prototype.registerButtons = function(obj) {
	for (var i = 0; i < arguments.length; i++) {
		this.buttonsList.push(arguments[i]);
		this.add(arguments[i]);
		arguments[i].addTerm(function() { return this.scale.x == 1 },this);
	}
};

G.Window.prototype.lockInput = function() {
	this.buttonsList.forEach(function(child) {
		child.input.enabled = false;
	})
};

G.Window.prototype.unlockInput = function() {
	this.buttonsList.forEach(function(child) {
		child.input.enabled = true;
		child.input.useHandCursor = true;
	})
};




G.Window.prototype.buyLives = function() {

	if (game.incentivised){
		this.buyLivesIncentivised();
	}else{
		this.buyLivesNotIncentivised();
	}

};
G.Window.prototype.buyLivesIncentivised = function() {


	this.addBackground('popup_background_2');

	this.closeButton = new G.Button(250,-270,'btn_x',function() {
			this.closeWindow();
	},this);
	this.registerButtons(this.closeButton);

	this.titleTxt = new G.OneLineText(0,-275,'font-white',G.txt(109),60,400,0.5,0.5);
	this.add(this.titleTxt);

	this.preGroup = this.add(game.make.group());

	this.heartImg = G.makeImage(0,-100,'icon_video_hearts',[0.5,0.5],this);
	this.preGroup.add(this.heartImg)

	this.watchVideoToGetTxt = new G.OneLineText(0,45,'font-blue',G.txt(3),50,500,0.5,0.5);
	this.preGroup.add(this.watchVideoToGetTxt);

	this.moneyTxt = new G.LabelGroup('+'+G.json.settings.livesForAd+' @heart@',0,115,'font-blue',60,0.5,0.5,500);
	this.preGroup.add(this.moneyTxt);

	this.watchBtn = new G.Button(0,240,'btn_green',function() {
 		
 		//var muteFlag = game.sound.mute; game.sound.mute = true;
        // G.sfx.music.volume = 0;
        // SG_Hooks.triggerIncentivise((function(result) {
        // 		//game.sound.mute = muteFlag;
        //         G.sfx.music.volume = 1;
        //     if (result == true) {
        //     		this.watchBtn.inputEnabled = false;
        //     		if (game.state.current == 'World'){
        //     			this.buyLivesIncentivised_thanks();
        //     		}else{
        //     			G.saveState.addLife(G.json.settings.livesForAd);
        //     		}
        //     }else {
        //         new G.NoMoreAds();
        //         this.watchBtn.inputEnabled = false;
        //         this.watchBtn.alpha = 0.5;
        //     }
        // }).bind(this));

    },this);
    this.watchBtn.addTextLabel('font-white',G.txt(106),70);
    this.registerButtons(this.watchBtn);

};

G.Window.prototype.buyLivesIncentivised_thanks = function(){

	game.add.tween(this.preGroup).to({alpha: 0},300,Phaser.Easing.Sinusoidal.Out,true);
	this.watchBtn.inputEnabled = false;
	game.add.tween(this.watchBtn).to({alpha: 0},300,Phaser.Easing.Sinusoidal.Out,true);

	this.postGroup = this.add(game.make.group());

	this.thanksForWatching = new G.OneLineText(0,-100,'font-blue',G.txt(24),50,500,0.5,0.5);
	this.postGroup.add(this.thanksForWatching);

	this.moneyBg = G.makeImage(0,25,'popup_bigtext_backgr',[0.5,0.5],this.postGroup);

	this.moneyTxt = new G.LabelGroup('+'+G.json.settings.livesForAd+' @heart@',0,25,'font-blue',60,0.5,0.5,500);
	this.postGroup.add(this.moneyTxt);

	this.postGroup.alpha = 0;
	game.add.tween(this.postGroup).to({alpha:1},300,Phaser.Easing.Sinusoidal.Out,true);

	this.claimBtn = new G.Button(0,230,'button_green',function() {

		if (game.state.current == 'World'){

			var batch = this.state.uiTargetParticles.createDividedBatch(
				game.world.bounds.x+this.worldPosition.x,
				this.worldPosition.y,
				'heart',
				this.state.panel.lifeUI.lifeIcon,
				G.json.settings.livesForAd,
				1)
			batch.addOnPartFinish(function() {
				G.saveState.addLife(1);
			});
			batch.start();

		}else{
			G.saveState.addLife(G.json.settings.livesForAd);
		}

		this.closeWindow();
    },this);
    this.claimBtn.addTextLabel('font-white',G.txt(84),50);
    this.registerButtons(this.claimBtn);
    game.add.tween(this.claimBtn).from({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

};

G.Window.prototype.buyLivesNotIncentivised = function() {


	this.addBackground('popup_background_2');

	this.closeButton = new G.Button(250,-270,'btn_x',function() {
			this.closeWindow();
	},this);
	this.registerButtons(this.closeButton);

	this.titleTxt = new G.OneLineText(0,-275,'font-white',G.txt(109),60,400,0.5,0.5);
	this.add(this.titleTxt);

	this.heartImg = G.makeImage(0,-70,'broken_heart',[0.5,0.5],this);
    this.heartImg.scale.setTo(2);

    //this.watchVideoToGetTxt = new G.OneLineText(0,30,'font-blue',G.txt(3),50,500,0.5,0.5);
    //this.add(this.watchVideoToGetTxt);

    this.moneyTxt = new G.LabelGroup('+1 @heart@ = '+G.json.settings.lifePrice+'@coin_1@',0,60,'font-blue',70,0.5,0.5,500);
    this.add(this.moneyTxt);

	this.buyBtn = new G.Button(0,240,'btn_orange',function() {
 				        
		G.saveState.changeCoins(-G.json.settings.lifePrice);

		if (game.state.current == 'World'){
			var batch = this.state.uiTargetParticles.createDividedBatch(
				game.world.bounds.x+this.worldPosition.x,
				this.worldPosition.y,
				'heart',
				this.state.panel.lifeUI.lifeIcon,
				1,
				1)

			batch.addOnPartFinish(function() {
				G.saveState.addLife(1);
			});
			batch.start();

		}else{
			G.saveState.addLife(1);
		}

		this.closeWindow();
            
  },this);


  this.buyBtn.addTextLabel('font-white',G.txt(7),70);
  this.registerButtons(this.buyBtn);

   if (G.saveState.getCoins() < G.json.settings.lifePrice){
  	this.buyBtn.alpha = 0.5;
  	this.buyBtn.inputEnabled = false;
  }

};
G.Window.prototype.daily2 = function() {

	//this.incentivised = game.incentivised;
	
	this.y = G.l(-50);

	G.ga.event('FTUE:DailyReward:Visible');

	this.incentivised = false;


	this.played = 0;

	this.addBackground('popup_background_2');
	this.bg.y = G.l(40);

	this.ribbonImg = G.makeImage(0,-168,'gold_wheel_ribbon',0.5,this);
	this.ribbonTxt = new G.OneLineText(0,-10,'font-white',G.txt(105),50,350,0.5,0.5);
	this.ribbonImg.scale.setTo(0);
	this.ribbonImg.addChild(this.ribbonTxt);



	this.closeButton = new G.Button(260,-230,'btn_x',function() {
			
			//in case someone close popup on win state
			if (this.wonPrize) {

				G.gift.applyGift(this.wonPrize);
				if (this.wonPrize[0] === 'coin') {
					G.ga.event('Source:Coins:Gift:DailyReward',this.wonPrize[1]);
				}else {
					G.ga.event('Source:booster'+G.saveState.nrToBoosterName(this.wonPrize[0][8])+':Gift:DailyReward',this.wonPrize[1]);
				}
				this.wonPrize = false;

			}

			G.ga.event('FTUE:DailyReward:Close');
			this.closeWindow();
	},this);

	this.registerButtons(this.closeButton);


	this.dailyTxt = new G.OneLineText(0,-250,'font-white',G.txt(0),70,400,0.5,0.5);
	this.add(this.dailyTxt);

	this.dailyGame = this.add(new G.DailyWheel(0,60));


	this.giftGroup = this.add(game.make.group()); 
	this.giftGroup.y = 40;


	this.freeSpinBtn = new G.Button(0,305,'button_green',function() {
		this.dailyGame.restart();
		this.dailyGame.launch(game.rnd.between(600,1400));
		this.closeButton.visible = false;

		G.saveState.data.freeSpin = false;
		G.saveState.save();

		this.freeSpinBtn.visible = false;
		this.premiumSpinBtn.visible = false;

	},this);
	this.freeSpinBtn.addTextLabel('font-white',G.txt(70),50);
	this.add(this.freeSpinBtn);


	this.premiumSpinBtn = new G.Button(0,280,'button_play',function() {
		console.log(" this.premiumSpinBtn");
		//var muteFlag = game.sound.mute; game.sound.mute = true;
    //     G.sfx.music.volume = 0;
   	// 	SG_Hooks.triggerIncentivise((function(result) {
    // 		//game.sound.mute = muteFlag;
    //         G.sfx.music.volume = 1;

    // 		if (result === true){
    // 			G.ga.event('Recurring:Purchase:ExtraSpin:'+(G.saveState.getLastPassedLevelNr()+1));
				// 	this.dailyGame.restart();
				// 	this.dailyGame.launch(game.rnd.between(600,1400));
				// 	this.closeButton.visible = false;
				// 	this.freeSpinBtn.visible = false;
				// 	this.premiumSpinBtn.visible = false;
    // 		}else{
    // 			new G.NoMoreAds();
    // 			this.premiumSpinBtn.inputEnabled = false;
    // 			this.premiumSpinBtn.alpha = 0.5;
    // 		}

    // }).bind(this));
			
	},this);

	this.premiumSpinBtn.label = new G.MultiLineText(42,0,'font-white',G.txt(110),40,230,70,'center',0.5,0.5);
	this.premiumSpinBtn.addChild(this.premiumSpinBtn.label);
	this.add(this.premiumSpinBtn);

	if (G.saveState.data.freeSpin) {
		this.changeToRegular();
	}else {
		this.changeToGold();
	}
	
	this.dailyGame.onFinish.add(function(prize) {

		game.add.tween(this.dailyGame).to({alpha:0},300,Phaser.Easing.Sinusoidal.InOut,true);
		this.daily2showPrize(prize);

	},this);

	//post part

	this.plusCoin = new G.LabelGroup('+@coin_1@',100,30,'font-blue',120,0,0.5,200);
	this.plusCoin.visible = false;
	this.add(this.plusCoin);

	this.youWinTxt = new G.OneLineText(0,-40,'font-blue',G.txt(49),60,500,0.5,0.5);
	this.add(this.youWinTxt);
	this.youWinTxt.visible = false;

	this.claimButton = new G.Button(0,260,'button_green',function() {

		if (this.shareCheckbox && this.shareCheckbox.selected && G.platform.currentUser !== null) {

			var txt = G.platform.currentUser.gender === "male" ?  G.txt(91) : G.txt(92);
			// SG_Hooks.social.messages.postOnWall(
   //              txt,
   //              '',
   //              (function(response){
   //                  this.daily2ClaimBtnAction();
   //              }).bind(this)
   //          );

		}else {

			this.daily2ClaimBtnAction();

		}

	},this);
	this.claimButton.addTextLabel('font-white',G.txt(84),50);
	this.registerButtons(this.claimButton);
	this.claimButton.inputEnabled = false;
	this.claimButton.visible = false;



};

G.Window.prototype.daily2ClaimBtnAction = function() {

	this.daily2applyPrize(this.wonPrize,false);
	this.wonPrize = false;
	this.claimButton.inputEnabled = false;


};

G.Window.prototype.daily2showPrize = function(prize) {

	this.youWinTxt.scale.setTo(0);
	this.youWinTxt.visible = true;
	game.add.tween(this.youWinTxt.scale).to({x:1,y:1},600,Phaser.Easing.Elastic.Out,true);

	this.giftGfx = new G.LabelGroup(G.gift.getLabelString(prize),0,30,'font-num-blue',110,0.5,0.5,300);
	this.giftGfx.scale.setTo(0);

	game.add.tween(this.giftGfx.scale).to({x:1,y:1},600,Phaser.Easing.Elastic.Out,true);

	this.giftGroup.add(this.giftGfx);

	this.wonPrize = prize;

	game.time.events.add(1000,function() {

		var ww = this.plusCoin.width+this.giftGfx.width+G.l(10);

		/*this.plusCoin.visible = true;
		this.plusCoin.alpha = 0;
		this.plusCoin.x = this.plusCoin.width*-0.5;
		game.add.tween(this.plusCoin).to({alpha:1,x: ww*-0.5+this.giftGfx.width+G.l(10)},600,Phaser.Easing.Sinusoidal.Out,true);
		game.add.tween(this.giftGfx).to({x: ww*-0.5+this.giftGfx.width*0.5},600,Phaser.Easing.Sinusoidal.Out,true);
		*/
		this.claimButton.alpha = 1;
		this.claimButton.scale.setTo(0); 
		game.add.tween(this.claimButton.scale).to({x:1,y:1},600,Phaser.Easing.Elastic.Out,true).onComplete.add(function() {
			this.claimButton.inputEnabled = true;
			this.claimButton.input.useHandCursor = true;
		},this);
		this.claimButton.visible = true;

		//this.shareCheckbox.selected = true;
		//G.changeTexture(this.shareCheckbox.tellFriendsMark, 'task_complete');
		if (this.shareCheckbox) {
			this.shareCheckbox.visible = true;
			this.shareCheckbox.alpha = 0;
			game.add.tween(this.shareCheckbox).to({alpha:1}, 600, Phaser.Easing.Elastic.Out,true).onComplete.add(function(){ 
				this.shareCheckbox.ignoreChildInput = false;
			},this);
		}

		this.closeButton.visible = true;

	},this);

};

G.Window.prototype.daily2applyPrize = function(prize,additional) {

	this.wonPrize = false;

	if (prize[0] === 'coin') {

		this.state.uiTargetParticles.createCoinBatch(
			game.world.bounds.x+this.giftGfx.worldPosition.x,
			this.giftGfx.worldPosition.y,
			this.state.panel.coinsTxt, 
			prize[1]
		);

		G.ga.event('Source:Coins:Gift:DailyReward',prize[1]+(additional ? G.json.settings.coinsForSharingDaily : 0));


	}else {

		G.gift.applyGift(prize);
		G.ga.event('Source:booster'+G.saveState.nrToBoosterName(prize[0][8])+':Gift:DailyReward',prize[1]);

	}

	game.time.events.add(1000,this.daily2restart,this);

};


G.Window.prototype.changeToRegular = function(){

	this.freeSpinBtn.visible = true;
	this.premiumSpinBtn.visible = false;
	if (this.ribbonImg.scale.x > 0) {
		G.stopTweens(this.ribbonImg);
		game.add.tween(this.ribbonImg.scale).to({x:0,y:0},200,Phaser.Easing.Cubic.In,true);
	}
	this.dailyGame.changeToRegular();

};

G.Window.prototype.changeToGold = function(){

	this.freeSpinBtn.visible = false;
	this.premiumSpinBtn.visible = true;
	if (this.ribbonImg.scale.x < 1) {
		G.stopTweens(this.ribbonImg);
		game.add.tween(this.ribbonImg.scale).to({x:1,y:1},500,Phaser.Easing.Elastic.Out,true);
	}
	this.dailyGame.changeToGold();

};


G.Window.prototype.daily2restart = function() {

	if (!game.incentivised){
		return this.closeWindow();
	}

	if (this.shareCheckbox){
		this.shareCheckbox.ignoreChildInput = true;
		game.add.tween(this.shareCheckbox).to({alpha:0},300,Phaser.Easing.Sinusoidal.In,true);
	}

	this.claimButton.inputEnabled = false;
	game.add.tween(this.claimButton).to({alpha:0},300,Phaser.Easing.Sinusoidal.In,true);

	game.add.tween(this.plusCoin).to({alpha:0},300,Phaser.Easing.Sinusoidal.In,true);

	game.add.tween(this.dailyGame).to({alpha:1},300,Phaser.Easing.Sinusoidal.InOut,true,400).onComplete.add(function(){
		if (G.saveState.data.freeSpin) {
			this.changeToRegular();
		}else {
			this.changeToGold();
		}
	},this);

	game.add.tween(this.youWinTxt.scale).to({x:0,y:0},300,Phaser.Easing.Sinusoidal.InOut,true);

	game.add.tween(this.giftGroup).to({alpha: 0},300,Phaser.Easing.Sinusoidal.In,true).onComplete.add(function(){
		this.giftGroup.destroy();
		this.giftGroup = this.add(game.make.group());
		this.giftGroup.y = 40;
	},this);

};

G.Window.prototype.daily2makeShareCheckbox = function(y) { 

	var group = game.add.group();
	group.y = G.l(y);
	group.selected = true;
	group.disclaimerBg = G.makeImage(0,0,'popup_bigtext_backgr',0.5,group);

	group.tellFriendsMarkBg = G.makeImage(-220,0,'share_square',0.5,group);
	group.tellFriendsMark = G.makeImage(-220,0,'task_complete',0.5,group);

	var txt = G.txt(87).replace('%AMOUNT%',G.json.settings.coinsForSharingDaily);

	group.tellFriendsTxt = new G.MultiLineText(50,0,'font-blue',txt,45,400,80,'center',0.5,0.5);
	group.add(group.tellFriendsTxt);

	group.tellFriendsBtn = new G.Button(-265,-45,null,function(){
		group.selected = !group.selected;
		G.changeTexture(group.tellFriendsMark, !group.selected ? 'task_fail' : 'task_complete');
	},this);
	group.add(group.tellFriendsBtn);

	group.tellFriendsBtn.hitArea = new Phaser.Rectangle(
		0,
		2,
		G.l(530),
		G.l(90)	
	);

	return group;


};


G.Window.prototype.daily2makeFirework = function(x,y) {

	var group = game.add.group();

	this.add(group);
	group.x = G.l(x);
	group.y = G.l(y);

	for (var i = 0; i < 10; i++) {

		var firework = G.makeImage(0,0,'firework',0.5,group);
		var angle = (360/10)*(i+Math.random()*0.5);
		firework.fadeRate = 0.02+(Math.random()*0.02);
		firework.grav = 4;
		firework.scale.setTo(1.5);
		firework.velX = G.lengthDirX(angle,G.l(12),false);
		firework.velY = G.lengthDirY(angle,G.l(12),false);
		firework.update = function() {
			this.x += this.velX;
			this.y += this.velY;
			this.y += this.grav;
			this.velX*=0.97;
			this.velY*=0.97;
			this.alpha -= this.fadeRate;
			if (this.alpha <= 0) {
				this.destroy();
			}

		};

	};

	group.update = function() {

		for (var i = this.children.length; i--; ){
			this.children[i].update();
		}

		if (this.length == 0) {
			this.destroy();
		}

	};

	return group;

};
G.Window.prototype.doubleReward = function() {

	this.addBackground('popup_background_2');
	this.addCloseButton();

	this.moreCoinsTxt = new G.OneLineText(0,-270,'font-pink',G.txt('GET MORE COINS'),60,430,0.5,0.5);
	this.add(this.moreCoinsTxt);

	this.moreCoinsImg = G.makeImage(0,-95,'movie_icon',0.5,this);

	this.watchToReceiveTxt = new G.MultiLineText(0,90,'font-pink',G.txt("WATCH AN AD TO DOUBLE YOUR REWARD!"),45,500,140,'center',0.5,0.5);
	this.add(this.watchToReceiveTxt);


	this.continueBtn = new G.Button(5,250,'btn_orange',function() {
		
		//var muteFlag = game.sound.mute; game.sound.mute = true;
  //       G.sfx.music.volume = 0;
		// SG_Hooks.triggerIncentivise((function(result) {
		// 	//game.sound.mute = muteFlag;
  //           G.sfx.music.volume = 1;
		// 	if (result == true) {
		// 		G.saveState.changeCoins(G.lvl.resultData.reward);
		// 		G.sb.pushWindow.dispatch('thanksForWatching',true);
		// 		this.closeWindow();
		// 	}else {
		// 		new G.NoMoreAds();
		// 		this.continueBtn.inputEnabled = false;
		// 		this.continueBtn.alpha = 0.5;
		// 	}
		// }).bind(this));

	},this);
	this.continueBtn.addTextLabel('font-white',G.txt("CONTINUE"),50);
	this.registerButtons(this.continueBtn);


};
G.Window.prototype.gate = function(gateData) {


	this.addBackground('popup_background_2');

	G.ga.event('Recurring:Gate'+gateData.id+':Visible');

	this.gateData = gateData;

	this.closeButton = new G.Button(250,-270,'btn_x',function() {

			if (!G.saveState.getGateData(gateData.id).open && !G.saveState.isEnoughToBuy(this.gateData.req.coins)) {
				G.ga.event('Recurring:Gate'+gateData.id+':Close:NotEnoughCoins');
			}

			this.closeWindow();
	},this);
	this.registerButtons(this.closeButton);

	var savedData = this.savedData = G.saveState.getGateData(gateData.id);
	var allStars = G.saveState.getAllStars();

	if (savedData.timerStartedAt === false) {
		savedData.timerStartedAt = Date.now();
		G.saveState.save();
	};

	this.timerNewLevelsInTxt = new G.OneLineText(0,-295,'font-white',G.txt(57),40,400,0.5,0.5);
	this.add(this.timerNewLevelsInTxt);
	var secLeft = (gateData.req.timeMinutes*60) - ((Date.now() - savedData.timerStartedAt)/1000);
	
	this.timer = new G.Timer(0,-250,'font-white',40,400,0.5,0.5,secLeft);
	this.timer.start();
	this.add(this.timer);	

	var offsetY = -130;
	//this.starsBg = G.makeImage(0,65+offsetY,'new_life_box',0.5,this);
	this.starsTxt = new G.LabelGroup('@*1.4*star@'+allStars+'/'+gateData.req.stars,-210,60+offsetY,'font-blue',40,0,0.5,250);
	this.add(this.starsTxt);
	//this.starsTxt = new G.OneLineText(0,0,'font-white',allStars+'/'+gateData.req.stars,50,500,0.5,0.5);

	this.collectMoreStarsTxt = new G.MultiLineText(130,65+offsetY,'font-blue',G.txt(60),40,240,80,'center',0.5,0.5);
	this.add(this.collectMoreStarsTxt);
	

	this.or2 = new G.OneLineText(0,30,'font-blue',G.txt(59),50,500,0.5,0.5);
	this.add(this.or2); 

	offsetY = -80;
	//this.priceBg = G.makeImage(0,230+offsetY,'new_life_box',0.5,this);
	this.priceTxt = new G.LabelGroup(gateData.req.coins+' @coin_1@',-120,230+offsetY,'font-blue',50,0.5,0.5,250);
	//this.priceTxt = new G.OneLineText(0,100,'font-white',gateData.req.coins,50,500,0.5,0.5);
	this.add(this.priceTxt);

	this.priceBtn = new G.Button(130,230+offsetY,'btn_orange',function() {

		if (G.saveState.isEnoughToBuy(this.gateData.req.coins)) {

			G.ga.event('Sink:Coins:Purchase:UnlockGate',this.gateData.req.coins);
			G.ga.event('Recurring:Gate'+this.gateData.id+':Unlock:Coins');
			G.saveState.changeCoins(this.gateData.req.coins*-1);
			G.saveState.openGate(this.gateData.id);
		}else {
			if (game.incentivised){
				G.sb.pushWindow.dispatch(['moreMoney',['gate',this.gateData]]);
				this.closeWindow();
			}else{
				this.priceBtn.alpha = 0.5;
				this.priceBtn.inputEnabled = false;
			}
		}

	},this);
	this.priceBtn.addTextLabelMultiline('font-white',G.txt(62));
	this.add(this.priceBtn);

	if (!game.incentivised && G.saveState.getCoins() < this.gateData.req.coins){
		this.priceBtn.alpha = 0.5;
		this.priceBtn.inputEnabled = false;
	}


	this.registerButtons(this.priceBtn);

	this.update = function() {
		if (this.savedData.open) {
			this.closeWindow();
		}
	}

};
G.Window.prototype.getFreeGold = function() {
	

	this.addBackground('popup_background_2');


	//this.pauseTxt = new G.OneLineText(0,-270,'font-white',G.txt(5),60,440,0.5,0.5);
	//this.add(this.pauseTxt);

	this.titleTxt = new G.LabelGroup('@coin_1@ $86$',0,-270,'font-white',80,0.5,0.5,500);
	this.add(this.titleTxt);





	this.claimBtn = new G.Button(0,215,'btn_orange',function() {

			G.saveState.changeCoins(this.amountToAdd);
			this.closeWindow();

	},this); 

	this.claimBtn.addTextLabel('font-white',G.txt(84),45);

	this.registerButtons(this.claimBtn);

};

G.Window.prototype.gift = function(reason,gift) {


	this.addBackground('popup_background_2');

	this.giftMakeTitle(reason);

	if (reason) {
		this.giftMakeExplanation(reason);
	}

	this.gift = this.add(new G.GiftBox(0,reason ? 60 : 0,false,gift));
	//G.changeTexture(this.gift.gift,(reason == '3stars' ? '3xwin_icon' : 'gift'));


	this.continueBtn = new G.Button(5,250,'btn_orange',function() {

		this.continueBtn.inputEnabled = false;
		this.continueBtn.visible = false;
		game.add.tween(this.continueBtn).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

		this.gift.unpack();

		this.getItBtn = new G.Button(5,250,'btn_orange',function() {
			this.closeWindow();
		},this);
		this.getItBtn.addTextLabel('font-white',G.txt(31),50);
		this.registerButtons(this.getItBtn);

	},this);
	this.continueBtn.addTextLabel('font-white',G.txt(30),50);
	this.registerButtons(this.continueBtn);


};


G.Window.prototype.giftMakeTitle = function(reason) {


	if (reason === '3stars') {

		this.stars = [];
		this.starsGroup = game.add.group();

		for (var i = 0; i < 3; i++) {
			this.stars[i] = G.makeImage(i*60,i % 2 == 0 ? 0 : -20,'star',[0,0.5],this.starsGroup);
			this.stars[i].scale.setTo(0.7);
		}

		this.starsGroup.y = G.l(-270);
		this.titleTxt = new G.OneLineText(0,-270,'font-white',G.txt(29),60,300,0,0.5);

		this.starsGroup.x = (this.starsGroup.width+this.titleTxt.width+G.l(10))*-0.5;
		this.titleTxt.x = this.starsGroup.x + this.starsGroup.width+G.l(10);

		this.add(this.starsGroup);
		this.add(this.titleTxt);

	}else {

		this.titleTxt = new G.OneLineText(0,-270,'font-white',reason == 'achievement' ? G.txt(28) : G.txt(29),60,450,0.5,0.5);
		this.add(this.titleTxt);

	}
};


G.Window.prototype.giftMakeExplanation = function(reason) {

	var txt = reason == '3stars' ? G.txt(32) : G.txt(33);
	this.explanationTxt = new G.MultiLineText(0,-130,'font-blue',txt,50,450,140,'center',0.5,0.5);
	this.add(this.explanationTxt);

};
G.Window.prototype.giftsSumUp = function() {

	var gifts = G.platform.giftsDuringAbsence;
	G.platform.giftsDuringAbsence = [];

	if (gifts.length == 0) {
		this.closeWindow();
		return;
	}

	this.addBackground('popup_background_2');
	this.addCloseButton();

	this.titleTxt = new G.OneLineText(0,-270,'font-white',G.txt(88),60,440,0.5,0.5);
	this.add(this.titleTxt);


	


};
G.Window.prototype.giveUp = function(windowToOpen,onGiveUp) {


	if (windowToOpen) this.state.windowLayer.pushWindow(windowToOpen);

	this.addBackground('popup_background_2');  

	this.levelTxt = new G.OneLineText(0,-270,'font-white',G.txt(10)+' '+(this.state.lvlNr+1),60,440,0.5,0.5);
	this.add(this.levelTxt);

	this.loseProgressTxt = new G.MultiLineText(0,-70,'font-blue',G.txt(8),45,500,140,'center',0.5,0.5);
	this.add(this.loseProgressTxt);

	this.continueBtn = new G.Button(0,120,'btn_orange',function() {
		this.closeWindow();
	},this);
	this.continueBtn.addTextLabel('font-white',G.txt(4),50);
	this.registerButtons(this.continueBtn);
	this.continueBtn.pulse();

	
	this.giveUpBtn = new G.Button(0,250,'btn_red',function() {
        console.log("giveUpBtn");
        //var muteFlag = game.sound.mute; game.sound.mute = true;
        // G.sfx.music.volume = 0;

  //       SG_Hooks.levelFinished(G.lvl.lvlNr+1, G.lvl.points);
		// SG_Hooks.gameOver(G.lvl.lvlNr+1, G.lvl.points,function(){
		// 	//game.sound.mute = muteFlag;
  //           G.sfx.music.volume = 1;
		// });
       

		G.winsInRow = 0;
		G.ga.event('Fail:Gate' + G.saveState.checkGateNr(G.lvlNr) + ':Level' + (G.lvlNr+1),0,G.lvl.points);

		//life is lost at begining of level
		//G.saveState.loseLife();
		G.ga.event('Sink:Lives:Automatic:LoseLevel',1);
		if (onGiveUp) onGiveUp();
	},this);
	this.giveUpBtn.addTextLabel('font-white',G.txt(9),50);
	this.registerButtons(this.giveUpBtn);

	this.brokenHeart = G.makeImage(-120,250,'broken_heart',0.5,this);
	this.minusOneTxt = new G.OneLineText(-125,250,'font-white','-1',35,50,0.5,0.5);
	this.add(this.minusOneTxt);

};
G.Window.prototype.globalGoals = function() {

	this.scale.setTo(1.2);
	
	this.addBackground('popup_background_2');
	this.addCloseButton();

	this.closeButton.terms = [];

	this.myMissionTxt = new G.OneLineText(0,-290,'font-white',G.txt(46),50,400,0.5,0.5);
	this.add(this.myMissionTxt);
	this.completeMissionsTxt = new G.OneLineText(0,-250,'font-white',G.txt(47),25,400,0.5,0.5);
	this.add(this.completeMissionsTxt);

	this.add(new G.GlobalGoalPanelGroup(0,-140,340));


};


G.Window.prototype.invite = function(giftType) {

 
	this.addBackground('big_popup_ask_friends');
	this.addCloseButton();

	/*this.globalCheckMarkBg = G.makeImage(-250,-270,'check_box',0.5,this);
	this.globalCheckMarkBtn = new G.Button(-250,-270,'task_complete',function() {
		this.positionsGroup.forEach(function(e) {
			e.select();
		});
	},this);
	this.add(this.globalCheckMarkBtn);*/ 

	this.pauseTxt = new G.OneLineText(0,-270,'font-white',G.txt(61),60,400,0.5,0.5);
	this.add(this.pauseTxt);

	this.positionsGroup = this.add(game.make.group());

	var userList = G.platform.getFriendsForAsk();

	for (var i = 0; i < Math.min(10,userList.length); i++) {
		this.positionsGroup.add(new G.Window.InvitePosition(0,0,userList[i],giftType));
	}

	if (userList.length == 0) {

		this.noMoreFriendsTxt = new G.MultiLineText(0,0,'font-blue',G.txt(90),40,550,400,'center',0.5,0.5);
		this.add(this.noMoreFriendsTxt);

	}


	/*this.func = func;
	this.context = context;
	*/

	this.positionsGroup.align(2,-1,G.l(300),G.l(85));
	this.positionsGroup.x = G.l(-290)
	this.positionsGroup.y = G.l(-200);

	this.inviteBtn = new G.Button(0,280,'btn_orange',function() {
		G.ga.event('Recurrring:Social:General:Invite');
		// SG_Hooks.social.friends.displayInvite(null, function(){});
        console.log("SG_Hooks.social.friends.displayInvite(null, function(){})");
	},this);

	//ask friends txt
	this.inviteBtn.addTextLabel('font-white',G.txt(77)); 

	this.registerButtons(this.inviteBtn);

	/*
	this.update = function() {

		this.checkedNumber = 0;

		for (var i = this.positionsGroup.length; i--; ){
			if (this.positionsGroup.children[i].checked) this.checkedNumber++;
		}

		/*if (this.checkedNumber == 0) {
			this.inviteBtn.alpha = 0.5;
			this.inviteBtn.inputEnabled = false;
		}else {
			this.inviteBtn.alpha = 1;
			this.inviteBtn.inputEnabled = true;
			this.inviteBtn.input.useHandCursor = true;
		}

	};*/
};


G.Window.prototype.getCheckedIds = function() {

	var checkedPositions = this.positionsGroup.children.filter(function(child) {
		return child.checked;
	});

	var ids = checkedPositions.map(function(elem) {
		return elem.user.userExternalId;
	})

	return ids;

};




G.Window.InvitePosition = function(x,y,user,giftType) {

	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);

	this.giftType = giftType;
	this.user = user;

	this.bg = new G.Button(0,0,'btn_ask_friends',function() {

		var msg = this.giftType === 'life' ? G.txt(75) : G.txt(76);

        console.log(this.giftType);

		if (this.giftType === 'life') {
			G.ga.event('Recurring:Social:AskForHelp:Life');
		}else {
			G.ga.event('Recurring:Social:AskForHelp:GateUnlock');
		}

		// SG_Hooks.social.gameRequests.displayGameRequest(msg, {name: this.giftType, amount: 1, extUserId: this.user.userExternalId}, (function(response){

  //           if (response.status === 'success') {

  //               this.user.asked = true;
  //               this.alpha = 0.5;
  //               this.bg.inputEnabled = false;

  //           }

  //       }).bind(this));

	},this);
	this.bg.anchor.setTo(0);
	this.bg.tweenScale = {x:1,y:1};
	this.add(this.bg);


	

	/*this.checked = true;

	this.checkBoxBg = G.makeImage(43,43,'check_box',0.5,this);

	this.checkBox = G.makeImage(43,43,'task_complete',0.5,this);*/

	this.userName = new G.OneLineText(142,43,'font-white',user.name,35,230,0.5,0.5);
	this.add(this.userName);
};

G.Window.InvitePosition.prototype = Object.create(Phaser.Group.prototype);
/*
G.Window.InvitePosition.prototype.select = function() {

	this.checked = true;
	G.changeTexture(this.checkBox,'task_complete');

};

G.Window.InvitePosition.prototype.deselect = function() {

	this.checked = false;
	G.changeTexture(this.checkBox,'task_fail');

}*/






//multiple invites
/*
G.Window.InvitePosition = function(x,y,user) {

	Phaser.Group.call(this,game);

	this.x = G.l(x);
	this.y = G.l(y);

	this.bg = new G.Button(0,0,'btn_ask_friends',function() {
		if (this.checked) {
			this.deselect();
		}else {
			this.select();
		}
	},this);
	this.bg.anchor.setTo(0);
	this.bg.tweenScale = {x:1,y:1};
	this.add(this.bg);


	this.user = user;

	this.checked = true;

	this.checkBoxBg = G.makeImage(43,43,'check_box',0.5,this);

	this.checkBox = G.makeImage(43,43,'task_complete',0.5,this);

	this.userName = new G.OneLineText(80,43,'font-white',user.name,50,170,0,0.5);
	this.add(this.userName);
};

G.Window.InvitePosition.prototype = Object.create(Phaser.Group.prototype);

G.Window.InvitePosition.prototype.select = function() {

	this.checked = true;
	G.changeTexture(this.checkBox,'task_complete');

};

G.Window.InvitePosition.prototype.deselect = function() {

	this.checked = false;
	G.changeTexture(this.checkBox,'task_fail');

};*/

G.Window.prototype.level = function() {

	this.addBackground('popup_background_2');

	if (G.lvlNr+1 === 1) {
		G.ga.event('FTUE:Level1:PreLevelPopup:Visible');
	}

	/*
	this.state.highscorePanel.injectData(G.platform.highscoresPerLvl[G.lvlNr]);
	this.state.highscorePanel.open();
	this.state.highscoreGeneralPanel.close();
	*/

	this.levelBg = G.makeImage(0,-290,'popup_top',0.5,this);

	this.levelTxt = new G.OneLineText(0,-315,'font-white',G.txt(10)+' '+(G.lvlNr+1),60,330,0.5,0.5);
	this.add(this.levelTxt);

	this.closeButton = new G.Button(235,-257,'btn_x',function() {
		this.boosters.forEach(function(btn){
			if (btn.signalBinding) btn.signalBinding.detach();
		});
		this.closeWindow();
		//this.state.highscoreGeneralPanel.open();

	},this);
	this.registerButtons(this.closeButton);
	this.addChild(this.closeButton);

	var starsAchieved = G.saveState.getStars(G.lvlNr);

	this.stars = [
		G.makeImage(-100,-150,starsAchieved >= 1 ? 'star' : 'star_blank',0.5,this),
		G.makeImage(0,-175,starsAchieved >= 2 ? 'star' : 'star_blank',0.5,this),
		G.makeImage(100,-150,starsAchieved >= 3 ? 'star' : 'star_blank',0.5,this),
	]
	this.stars[0].scale.setTo(0.8);
	this.stars[2].scale.setTo(0.8);

	this.taskBg = G.makeImage(0,5,'popup_bigtext_backgr',0.5,this);
	this.taskTxt = new G.OneLineText(0,-70,'font-blue',G.txt(11)+':',45,380,0.5,0.5);
	this.add(this.taskTxt);

	if (G.lvlData.goal[0] == 'collect') {
		this.makeTaskCollectPanels(5);
	}else {
		this.add(new G.OneLineText(0,5,'font-blue',G.txt(55).toUpperCase()+': '+G.lvlData.goal[1],50,380,0.5,0.5));
	}

	this.buyTxt = new G.OneLineText(0,90,'font-blue',G.txt(12)+':',35,680,0.5,0.5);
	this.add(this.buyTxt);

	this.boosterBg = G.makeImage(0,170,'popup_bigtext_backgr',0.5,this);

	this.boosters = [
		new G.UI_StartBoosterButton(-195,170,5,G.lvlNr),
		new G.UI_StartBoosterButton(0,170,7,G.lvlNr),
		new G.UI_StartBoosterButton(195,170,8,G.lvlNr)
	];

	this.addMultiple(this.boosters);

	/*this.boosters.forEach(function(e) {
		e.scale.setTo(0.8);
	});*/


	this.continueBtn = new G.Button(0,300,'btn_orange',function() {
		/*this.boosters.forEach(function(btn){
			if (btn.signalBinding) btn.signalBinding.detach()
		});
		this.closeWindow();*/

		if (G.lvlNr+1 === 1) {
			G.ga.event('FTUE:Level1:PreLevelPopup:ContinueButton');
		}

		G.sb.onStateChange.dispatch("Game",G.lvlNr,false,this.state.startBoosterConfig.getConfigForLevel(G.lvlNr));
	},this);
	this.continueBtn.pulse();
	this.continueBtn.addTextLabel('font-white',G.txt(4),70);
	this.registerButtons(this.continueBtn);
    didClickedLevel();
};

G.Window.prototype.makeTaskCollectPanels = function(y) {
	var posX = [
		[0],
		[-85,85],
		[-170,0,170],
		[-205,-65,65,205]
	];

	for (var i = 0, len = G.lvlData.goal[1].length; i < len; i++) {
		var spriteName = G.json.settings.goals[G.lvlData.goal[1][i][0]].sprite;
		var panel = G.makeImage(posX[len-1][i]-5,y,
			spriteName,
		[1,0.5],this);
		panel.scale.setTo(0.8);

		var nr = new G.OneLineText(posX[len-1][i]+65,y,'font-blue',G.lvlData.goal[1][i][1].toString(),50,85,1,0.5);
		this.add(nr);
	};


};

G.Window.prototype.levelFailed = function() {

    var muteFlag = game.sound.mute; game.sound.mute = true;
 //    SG_Hooks.levelFinished(G.lvl.lvlNr+1, G.lvl.points);
	// SG_Hooks.gameOver(G.lvl.lvlNr+1, G.lvl.points,function(){
	// 	game.sound.mute = muteFlag;
	// });
    console.log("levelFailed");
	G.ga.event('Fail:Gate' + G.saveState.checkGateNr(G.lvlNr) + ':Level' + (G.lvlNr+1),0,G.lvl.points);

	//life is lost at begining of level
	//G.saveState.loseLife();
	G.ga.event('Sink:Lives:Automatic:LoseLevel',1);

	this.addBackground('popup_background_2');


	

	this.closeButton = new G.Button(250,-270,'btn_x',function() {
			G.sb.onStateChange.dispatch("World");
	},this);
	this.registerButtons(this.closeButton);


	this.levelTxt = new G.OneLineText(0,-270,'font-white',G.txt(10)+' '+(this.state.lvlNr+1),60,380,0.5,0.5);
	this.add(this.levelTxt);

	this.diamon = G.makeImage(0,-75,'failed_dimond',0.5,this);

	if (G.lvl.pointsGoal) {
		this.add(new G.OneLineText(0,100,'font-blue',G.txt(55).toUpperCase()+':\n'+G.lvl.points+'/'+G.lvl.pointsTarget,50,380,0.5,0.5));
	}else {
		this.makeLevelFailedTaskCollectPanels(95);
	}
	

	G.ga.event('Recurring:Engagment:RetryBtnVisible');


	this.retryBtn = new G.Button(5,250,'btn_orange',function() {

		G.winsInRow = 0;

		G.ga.event('Recurring:Engagment:RetryBtnPress');

		if (G.saveState.getCurrentLivesNr() > 0){ 
			G.sb.onStateChange.dispatch('Game',G.lvl.lvlNr,G.debugMode);
		}else {
			G.sb.onStateChange.dispatch('World');	
		}

		
	},this);
	this.retryBtn.addTextLabel('font-white',G.txt(6),50);
	this.registerButtons(this.retryBtn);

};

G.Window.prototype.makeLevelFailedTaskCollectPanels = function(y) {
	var posX = [
		[0],
		[-85,85],
		[-170,0,170],
		[-205,-65,65,205]
	];


	this.taskBg = G.makeImage(0,y,'popup_bigtext_backgr',0.5,this);

	this.panels = []

	for (var i = 0, len = G.lvl.goal.length; i < len; i++) {
		if (this.state.topBar.goalPanel.panels[i].amount > 0) {
			var gfxName = G.json.settings.goals[G.lvl.goal[i][0]].sprite;
			var panel = G.makeImage(0,y,
				gfxName,
			0.5,this);
			G.makeImage(70,0,'task_fail',0.5,panel);
			this.panels.push(panel);
		}
	};

	var nrOfPanels = this.panels.length;

	this.panels.forEach(function(panel,index) {

		panel.x = G.l(posX[nrOfPanels-1][index]-25);


	});

};
G.Window.prototype.mapChest = function(gifts) {

	this.addBackground('popup_background_2');

	this.gifts = gifts;

	this.chest = G.makeImage(0,-35,'chest_open',0.5,this);

	this.congratTxt = new G.OneLineText(0,-270,'font-white',G.txt(102),50,550,0.5,0.5);
	this.add(this.congratTxt);

	this.youReceiveTxt = new G.OneLineText(0,-180,'font-blue',G.txt(85)+':',50,550,0.5,0.5);
	this.add(this.youReceiveTxt);

	this.giftsLabelGroup = new G.LabelGroup(G.gift.getLabelPackString(gifts),0,120,'font-blue',45,0.5,0.5,500);
	this.add(this.giftsLabelGroup);

	this.claimBtn = new G.Button(0,245,'btn_orange',function() {

		this.gifts.forEach(function(gift){
			
			if (gift[0] == 'coin'){

				this.state.uiTargetParticles.createCoinBatch(
					game.world.bounds.x+this.chest.worldPosition.x,
					this.chest.worldPosition.y,
					this.state.panel.coinsTxt, 
					gift[1]
				);

			}else{
				G.gift.applyGift(gift);
			}

		},this);

		//G.gift.applyGiftPack(this.gifts,'Gift:MapChest','Gift:MapChest');
		this.closeWindow();
	},this); 

	this.claimBtn.addTextLabel('font-white',G.txt(84),45);

	this.registerButtons(this.claimBtn);

};
G.Window.prototype.mapGift = function(){

	this.giftData = G.saveState.data.mapGifts[0];

	this.addBackground('popup_background_2');
	this.addCloseButton();

	this.titleTxt = new G.OneLineText(0,-285,'font-white',G.txt(29),60,300,0.5,0.5);
	this.add(this.titleTxt);

	//watch
	if (this.giftData[0] && game.incentivised){
		this.mapGift_watch();
	}else{
		this.mapGift_claim();
	}

	/*this.gift = this.add(new G.GiftBox(0,0,false,this.giftData[1]));
	//G.changeTexture(this.gift.gift,(reason == '3stars' ? '3xwin_icon' : 'gift'));

	this.continueBtn = new G.Button(5,250,'btn_orange',this.giftData[0] ? watchAndOpen : openGift,this);
	this.continueBtn.addTextLabel('font-white',this.giftData[0] ? G.txt(106) : G.txt(30),50);
	this.registerButtons(this.continueBtn);

	//watch to get
	if (this.giftData[0]){
		this.watchToGet = new G.OneLineText(0,115,'font-blue',G.txt(3),50,500,0.5,0.5);
		this.add(this.watchToGet);
		this.gift.y = -55;
	}*/




	function openGift(){


		this.continueBtn.inputEnabled = false;
		this.continueBtn.visible = false;
		game.add.tween(this.continueBtn).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

		this.gift.unpack();
		G.saveState.removeMapGift();

		this.getItBtn = new G.Button(5,250,'btn_orange',function() {
			this.closeWindow();
		},this);
		this.getItBtn.addTextLabel('font-white',G.txt(4),50);
		this.registerButtons(this.getItBtn);

	}

	function watchAndOpen(){

		console.log('watch and open');
		//var muteFlag = game.sound.mute; game.sound.mute = true;
        // G.sfx.music.volume = 0;
  //  		SG_Hooks.triggerIncentivise((function(result) {
  //     		//game.sound.mute = muteFlag;
  //           G.sfx.music.volume = 1;
		// 	if (result == true){
		// 		openGift.call(this);
		// 	}else{
		// 		new G.NoMoreAds();
  //       this.continueBtn.inputEnabled = false;
  //       this.continueBtn.alpha = 0.5;
		// 	}
		// }).bind(this))	    

	}

};

G.Window.prototype.mapGift_watch = function(){

	this.preGroup = this.add(game.make.group());
	this.preGroup.y = 40;

	this.watchGiftImg = G.makeImage(0,-100,'icon_video_gift',[0.5,0.5],this.preGroup);

	this.watchVideoToGetTxt = new G.OneLineText(0,46,'font-blue',G.txt(3),50,500,0.5,0.5);
	this.preGroup.add(this.watchVideoToGetTxt);

	this.getGiftTxt = new G.OneLineText(0,46,'font-blue',G.txt(3),50,500,0.5,0.5);
	//this.getGiftTxt = new G.LabelGroup('@coin_1@ '+G.json.settings.coinsForAd,0,115,'font-blue',60,0.5,0.5,500);
	this.preGroup.add(this.getGiftTxt);

	this.watchBtn = new G.Button(0,230,'button_play',function() {
        console.log("this.watchBtn");
        //var muteFlag = game.sound.mute; game.sound.mute = true;
        // G.sfx.music.volume = 0;
        // SG_Hooks.triggerIncentivise((function(result) {
        // 	//game.sound.mute = muteFlag;
        //     G.sfx.music.volume = 1;
        //     if (result == true) {
        //     	this.mapGift_claimAfterWatch();
        //     }else {
        //         new G.NoMoreAds();
        //         this.watchBtn.inputEnabled = false;
        //         this.watchBtn.alpha = 0.5;
        //     }
            
        // }).bind(this));

    },this);
    this.watchBtn.addTextLabel('font-white',G.txt(106),55,30,-4,260);
    this.registerButtons(this.watchBtn);

};

G.Window.prototype.mapGift_claim = function(){

	this.gift = this.add(new G.GiftBox(0,0,false,this.giftData[1]));

	this.claimBtn = new G.Button(0,230,'button_green',function() {

		this.claimBtn.visible = false;

		G.saveState.removeMapGift();

		this.getItBtn = new G.Button(5,230,'btn_orange',function() {
			this.closeWindow();
		},this);
		this.getItBtn.addTextLabel('font-white',G.txt(4),50);
		this.registerButtons(this.getItBtn);

		this.gift.unpack();

    },this);
    this.claimBtn.addTextLabel('font-white',G.txt(84),50);
    this.registerButtons(this.claimBtn);

};

G.Window.prototype.mapGift_claimAfterWatch = function(){

	this.watchBtn.inputEnabled = false
	game.add.tween(this.watchBtn).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this.preGroup).to({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

	this.mapGift_claim();
	game.add.tween(this.claimBtn).from({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);
	game.add.tween(this.gift).from({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

	this.gift.y = 30;

	this.thanksForWatching = new G.OneLineText(0,-155,'font-blue',G.txt(24),50,500,0.5,0.5);
	this.add(this.thanksForWatching);
	game.add.tween(this.thanksForWatching).from({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

};
G.Window.prototype.moreMoney = function(windowToOpen) {


	this.addBackground('popup_background_2');
	this.addCloseButton();

	if (windowToOpen) this.state.windowLayer.pushWindow(windowToOpen);

	this.moreCoinsTxt = new G.OneLineText(0,-270,'font-white',G.txt(2),60,440,0.5,0.5);
	this.add(this.moreCoinsTxt);

	this.preGroup = this.add(game.make.group());

	this.coinImg = G.makeImage(0,-100,'icon_video_coins',[0.5,0.5],this.preGroup);

	this.watchVideoToGetTxt = new G.OneLineText(0,46,'font-blue',G.txt(3),50,500,0.5,0.5);
	this.preGroup.add(this.watchVideoToGetTxt);

	this.moneyTxt = new G.LabelGroup('@coin_1@ '+G.json.settings.coinsForAd,0,115,'font-blue',60,0.5,0.5,500);
	this.preGroup.add(this.moneyTxt);

	this.watchBtn = new G.Button(0,230,'button_play',function() {

        console.log("this.watchBtn");
        //var muteFlag = game.sound.mute; game.sound.mute = true;
        // G.sfx.music.volume = 0;
        // SG_Hooks.triggerIncentivise((function(result) {
        // 		//game.sound.mute = muteFlag;
        //         G.sfx.music.volume = 1;
        //     if (result == true) {
        //     	this.moreMoney_thanks();
        //     }else {
        //         new G.NoMoreAds();
        //         this.watchBtn.inputEnabled = false;
        //         this.watchBtn.alpha = 0.5;
        //     }
            
        // }).bind(this));

    },this);
    this.watchBtn.addTextLabel('font-white',G.txt(106),55,30,-4,260);
    this.registerButtons(this.watchBtn);

};

G.Window.prototype.moreMoney_thanks = function(){

	game.add.tween(this.preGroup).to({alpha: 0},300,Phaser.Easing.Sinusoidal.Out,true);
	this.watchBtn.inputEnabled = false;
	game.add.tween(this.watchBtn).to({alpha: 0},300,Phaser.Easing.Sinusoidal.Out,true);

	this.postGroup = this.add(game.make.group());

	this.thanksForWatching = new G.OneLineText(0,-100,'font-blue',G.txt(24),50,500,0.5,0.5);
	this.postGroup.add(this.thanksForWatching);

	this.moneyBg = G.makeImage(0,25,'popup_bigtext_backgr',[0.5,0.5],this.postGroup);

	this.moneyTxt = new G.LabelGroup('@coin_1@ '+G.json.settings.coinsForAd,0,25,'font-blue',60,0.5,0.5,500);
	this.postGroup.add(this.moneyTxt);

	this.postGroup.alpha = 0;
	game.add.tween(this.postGroup).to({alpha:1},300,Phaser.Easing.Sinusoidal.Out,true);

	this.claimBtn = new G.Button(0,230,'button_green',function() {

		if (game.state.current == 'World'){

			this.state.uiTargetParticles.createCoinBatch(
				game.world.bounds.x+this.moneyTxt.worldPosition.x,
				this.moneyTxt.worldPosition.y,
				this.state.panel.coinsTxt, 
				G.json.settings.coinsForAd
			);

		}else{
			G.saveState.changeCoins(G.json.settings.coinsForAd);
		}

		this.closeWindow();
    },this);
    this.claimBtn.addTextLabel('font-white',G.txt(84),50);
    this.registerButtons(this.claimBtn);
    game.add.tween(this.claimBtn).from({alpha:0},300,Phaser.Easing.Sinusoidal.Out,true);

};

G.Window.prototype.outOfMoves = function() {
    didEndGame();
    showIntersititalAd();
	this.addBackground('popup_background_2');

	this.makeCoinBar(0,-270,'outOfMoves');

	G.sb.onGoalAchieved.add(this.closeWindow,this);

	this.outOfMovesTxt = new G.OneLineText(0,-130,'font-blue',G.txt(14),60,500,0.5,0.5);
	this.add(this.outOfMovesTxt);

	this.diamond = G.makeImage(0,30,'failed_dimond',0.5,this);

	this.timerTxt = new G.OneLineText(100,0,'font-blue',G.json.settings.outOfMovesTimer*60,50,500,0.5,0.5);
	this.timerTxt.cacheAsBitmap = false;
	this.timerTxt.timer = G.json.settings.outOfMovesTimer*60;
	this.timerActivate = true;
	this.add(this.timerTxt);

	this.endGameBtn = new G.Button(-120,230,'end_game_btn',function() {
		G.sb.pushWindow.dispatch('levelFailed');
		this.timerActivate = false;
		this.closeWindow();
	},this);
	this.endGameBtn.addTextLabel('font-white',G.txt(71));

	this.add(this.endGameBtn);

	this.brokenHeart = G.makeImage(-223,226,'broken_heart',0.5,this);
	this.minusOneTxt = new G.OneLineText(-232,226,'font-white','-1',35,50,0.5,0.5);
	this.add(this.minusOneTxt);

	this.promo =  G.lvl.outOfMovesPopUp == 0 || Math.random()<0.25;
	G.lvl.outOfMovesPopUp++;
	this.price = this.promo ? Math.floor((G.lvl.getPriceOfExtraMoves()*2)*0.7) : G.lvl.getPriceOfExtraMoves()*2;

	this.continueBtn = new G.Button(120,230,'btn_orange',function() {
		
		if (G.saveState.data.coins >= this.price) {
			
 			G.lvl.buyExtraMoves(true,this.price);
 			this.timerActivate = false;
			this.closeWindow();
			G.ga.event('Recurring:GetMoreMoves:LevelEnd');

		}else {
			G.sb.pushWindow.dispatch(['moreMoney','outOfMoves']);
			this.timerActivate = false;
			this.closeWindow();
		}	

	},this);
	this.continueBtn.pulse();


	this.continueBtn.extraMoveIcon = G.makeImage(-105,0,'ui_booster_5',[0,0.5],this.continueBtn);
	this.continueBtn.extraMoveIcon.scale.setTo(0.95);

	var labelString = this.price+'@currency@';
	this.continueBtn.label = new G.LabelGroup(labelString,25,0,'font-white',40,0.5,0.5,95);
	this.continueBtn.addChild(this.continueBtn.label);


	this.update = function() {

		if (!this.timerActivate) return;

		if (this.timerTxt.timer-- <= 0) {
			this.timerActivate = false;
			G.sb.pushWindow.dispatch('levelFailed');
			this.closeWindow();
		}

		var timerText = Math.ceil(this.timerTxt.timer/60).toString();

		if (this.timerTxt.text != timerText) {
			this.timerTxt.setText(timerText);
		}

	};


	if (this.promo) {

		this.continueBtn.promoLabel = G.makeImage(115,-7,'off_lable',0.5,this.continueBtn);
		this.continueBtn.promoTxt = this.continueBtn.addChild(new G.OneLineText(117,-7,'font-white','-30%',40,60,0.5,0.5));
		this.continueBtn.promoTxt.angle = -10;

		this.continueBtn.label.y = G.l(10);
		this.continueBtn.label2 = new G.LabelGroup(G.lvl.getPriceOfExtraMoves()*2+'@currency@',25,-30,'font-white',30,0.5,0.5,95);
		this.continueBtn.addChild(this.continueBtn.label2);

		this.continueBtn.crossOut = G.makeImage(25,-30,'coins_lable',0.5,this.continueBtn);
		this.continueBtn.crossOut.cacheAsBitmap = true;
		this.continueBtn.crossOut.width = this.continueBtn.label2.width*1.1;
		this.continueBtn.crossOut.height = 2;
		this.continueBtn.crossOut.angle = -10;
		
		this.continueBtn.bringToTop(this.continueBtn.label);

	}

	this.registerButtons(this.continueBtn);


};

G.Window.prototype.pack = function(packData) {
	
	this.packData = packData;

	var stage = G.saveState.getPackStage(packData);

	this.packData.vkItemName = stage.vkItemName;
	this.packData.vkPrice = stage.vkPrice;

	this.addBackground('popup_background_2');
	this.addCloseButton();

	//this.pauseTxt = new G.OneLineText(0,-270,'font-white',G.txt(5),60,440,0.5,0.5);
	//this.add(this.pauseTxt);

	//this.packIco = G.makeImage(-220,-260,'starter pack',0.5,this);

	this.packNameTxt = new G.OneLineText(0,-270,'font-white',G.txt(packData.titleTxt),50,350,0.5,0.5);
	this.add(this.packNameTxt);

	this.offerEndsInTxt = new G.OneLineText(0,-180,'font-blue',G.txt(67),40,350,0.5,0.5);
	this.add(this.offerEndsInTxt);

	var lblSprite = '50off';
	if (stage.promo) {
		if (stage.promo == 60) lblSprite = '60off';
		if (stage.promo == 70) lblSprite = '70off';
	}
	this.offerImg = G.makeImage(-250,-150,'off',0.5,this);
	this.offerLabelImg = G.makeImage(-255,-155,lblSprite,0.5,this);


	var saveData = G.saveState.getPackSaveData(this.packData.id);
	var secLeft = (this.packData.timeMinutes*60) - ((Date.now()-saveData.activationTime)/1000);
	this.timer = new G.Timer(0,-130,'font-blue',40,150,0.5,0.5,secLeft);
	this.add(this.timer);
	this.timer.start();

	this.chestFull = G.makeImage(0,-5,'chest_full',0.5,this);

	this.giftsLabelGroup = new G.LabelGroup(G.gift.getLabelPackString(packData.gifts),0,130,'font-blue',50,0.5,0.5,500);
	this.add(this.giftsLabelGroup);


	this.buyBtn = new G.Button(0,250,'btn_orange',function() {
 		
		// SG_Hooks.social.payments.triggerPurchase(this.packData.vkItemName, '', this.packData.vkItemName, null,(function(response) {

		// 	if (response.status === 'success') {

		// 		G.saveState.data.packs[this.packData.id].bought = true;
		// 		G.saveState.save();
		// 		G.ga.event('SpecialPacks:'+G.saveState.nrToWord(this.packData.vkItemName[5]),this.packData.vkPrice,'USD',G.businessEventCounter);
                

  //               G.ga.event('Recurring:Purchase:SpecialPack'+G.saveState.nrToWord(this.packData.vkItemName[5])+':'+(G.saveState.getLastPassedLevelNr()+1));

  //               G.gift.applyGiftPack(this.packData.gifts,'CoinPack:PromoPackage','Purchase:PromoPackage');

		// 		this.closeWindow();
				
		// 		new G.PaymentStatus(true);
				
		// 	}	else {
		// 		new G.PaymentStatus(false);
		// 	}
		// }).bind(this));

	},this);

	this.price = new G.LabelGroup(packData.vkPrice+' @socialCurrencyIcon@',0,0,'font-num-blue',50,0.5,0.5,140);
	this.buyBtn.addChild(this.price);

	this.registerButtons(this.buyBtn);

};
G.Window.prototype.passedFriend = function(dataObj) {

	this.addBackground('popup_background_2');

	var passedFriend = dataObj.passed.user;

	this.closeButton = new G.Button(250,-270,'btn_x',function() {
			this.closeWindow();
	},this);
	this.registerButtons(this.closeButton);


	this.congratsTxt = new G.OneLineText(0,-280,'font-white',G.txt(83),45,450,0.5,0.5);
	this.add(this.congratsTxt); 

	this.youPassedFriendTxt = new G.OneLineText(0,-160,'font-blue',G.txt(96).replace("%NR%",G.lvlNr+1),45,500,0.5,0.5);
	this.add(this.youPassedFriendTxt);


	this.arrowUpDown = G.makeImage(0,35,'arrows_up_down',0.5,this);

	var currentUserPosition = dataObj.passed.playerPosition;

	this.currentUserAvatar = this.passedFriendMakeAvatar(-80,-25,G.platform.currentUser,dataObj.points,currentUserPosition);
	this.add(this.currentUserAvatar);

	this.opponentAvatar = this.passedFriendMakeAvatar(76,20,passedFriend,passedFriend.score,currentUserPosition+1);
	this.add(this.opponentAvatar);


	this.continueBtn = new G.Button(5,250,'btn_ask_friends',function() {
        console.log("this.continueBtn");
		if (G.platform.currentUser !== null){

			txt = G.txt(95).replace('%NAME%',passedFriend.username);
			// SG_Hooks.social.messages.postOnWall(txt, '', (function() {
   //              this.closeWindow();
   //          }).bind(this));

		}else {
			this.closeWindow();
		}
	},this);
	this.continueBtn.pulse();
	this.continueBtn.addTextLabel('font-white',G.txt(79),70);
	this.registerButtons(this.continueBtn);

};

G.Window.prototype.passedFriendMakeAvatar = function(x,y,userObj,points,ranking) {

	var group = game.make.group();

	group.x = G.l(x);
	group.y = G.l(y);

	group.avatar = G.makeExtImage(0,0,
		userObj.avatar,
		'avatar_m_big',
		0.5,group,false,function() {
			this.width = G.l(80);
			this.height = G.l(80);
	});
	group.avatarFrame = G.makeImage(0,0,'avatar_frame_big',0.5,group);

	group.placeBg = G.makeImage(35,30,'bg_rank',0.5,group);

	group.placeTxt = new G.OneLineText(35,28,'font-white','#'+ranking,20,35,0.5,0.5);
	group.placeTxt.tint = 0x673c11;
	group.placeTxt.updateCache();
	group.add(group.placeTxt);

	group.name = new G.OneLineText(0,60,'font-white',userObj.username.split(' ')[0],30,130,0.5,0.5);
	group.add(group.name);
	group.score = new G.OneLineText(0,90,'font-white',points,30,130,0.5,0.5);
	group.add(group.score);

	return group;

};
G.Window.prototype.pause = function() {

    showIntersititalAd();
	this.addBackground('popup_background_2');
	this.addCloseButton();

	this.pauseTxt = new G.OneLineText(0,-270,'font-white',G.txt(5),60,440,0.5,0.5);
	this.add(this.pauseTxt);


	this.homeBtn = new G.Button(-180,80,'btn_home',function() {
		this.state.windowLayer.pushWindow(['giveUp','pause',function() {G.sb.onStateChange.dispatch(G.debugMode ? "EditorWorld" : "World")}]);
		this.closeWindow();
	},this);

	this.playBtn = new G.Button(0,0,'btn_play',function() {
		this.closeWindow();
	},this);


	this.soundBtn = new G.SoundBtn(180,80);

	this.registerButtons(this.soundBtn,this.homeBtn,this.playBtn);

};
G.Window.prototype.receivedLives = function(windowToOpen) {

	this.addBackground('big_popup_ask_friends');
	this.addCloseButton();

	if (windowToOpen) this.state.windowLayer.pushWindow(windowToOpen);

	this.moreCoinsTxt = new G.OneLineText(0,-270,'font-white',G.txt(99),60,440,0.5,0.5);
	this.add(this.moreCoinsTxt);

	this.contentGroup = game.make.group();

	for (var i = 0; i < G.platform.giftsDuringAbsence.length; i++) {
		this.contentGroup.add(this.receivedLivesMakeGiftItem(300,50+(120*i),G.platform.giftsDuringAbsence[0]));
	};	

	this.sliderPanel = new G.SliderPanel(0,25,620,400,this.contentGroup,{
		vertical: true,
		verticalLerp: true,
		horizontal: false
	});

	this.add(this.sliderPanel);

	G.platform.giftsDuringAbsence = [];

};

G.Window.prototype.receivedLivesMakeGiftItem = function(x,y,data) {

	var group = game.make.group();
	group.x = G.l(x);
	group.y = G.l(y);

	group.bg = G.makeImage(0,0,'coins_btn',0.5,group);

	group.avatar = G.makeExtImage(-230,0,data.user.avatar,'avatar_m',0.5,group,false,function() {
		this.width = 55;
		this.height = 55;
	});

	group.avatarFrame = G.makeImage(-230,0,'avatar_frame',0.5,group);

	var name = data.user.username.split(' ')[0];
	var mark = data.gift.giftName === 'life' ? '  @*1.5*heart@' : '  @*1.5*gate@';
	var txt = G.txt(89).replace('%NAME%',name).replace('%ICON%',mark);
 	group.info = new G.LabelGroup(txt,-190,0,'font-white',30,0,0.5,300);
  	group.add(group.info);

  //group.make

  group.extUserId = data.user.extUserId;

	if (G.saveState.checkIfCanSendLifeTo(data.user.extUserId)) {

		//group.button = G.makeImage(220,0,'btn_orange',0.5,group);

		group.button = new G.Button(220,0,'btn_orange',function() {

			G.saveState.sendLife(this.extUserId);
			this.button.inputEnabled = false;
			this.button.label.destroy();
			group.button.label = group.button.addChild(new G.OneLineText(0,0,'font-white',G.txt(101),40,136,0.5,0.5));
			G.changeTexture(this.button,'end_game_btn');

		},group);
		group.add(group.button);
		
		group.button.label = group.button.addChild(new G.MultiLineText(0,0,'font-white',G.txt(100),40,136,72,'center',0.5,0.5));

	}else {

		group.button = G.makeImage(220,0,'end_game_btn',0.5,group);
		group.button.label = group.button.addChild(new G.OneLineText(0,0,'font-white',G.txt(101),40,136,0.5,0.5));

	}

	return group;

};




G.Window.prototype.shop = function(boosterNr) {


	this.addBackground('popup_background_2');
	this.addCloseButton();

	var boosters = [0,16,17,18,19];

	this.makeCoinBar(0,-270,'shop'+boosterNr);

	this.boosterNameTxt = new G.OneLineText(0,-160,'font-blue',G.txt(boosters[boosterNr]),60,440,0.5,0.5);
	this.add(this.boosterNameTxt);

	this.boosterImg = G.makeImage(0,-15,'booster_place_bg',0.5,this);
	this.boosterImg.alpha = 0.1;
	this.boosterIco = G.makeImage(0,-15,'ui_booster_'+boosterNr,0.5,this);
	this.boosterIco.scale.setTo(1.2);

	this.coinIco = G.makeImage(0,130,'coin_1',[0,0.5],this);
	this.coinsTxt = new G.OneLineText(0,130,'font-blue',G.json.settings['priceOfBooster'+boosterNr].toString(),60,650,0,0.5);
	this.add(this.coinsTxt);
	var startX = (this.coinIco.width+G.l(10)+this.coinsTxt.width)*-0.5;
	this.coinIco.x = startX;
	this.coinsTxt.x = startX + this.coinIco.width+G.l(10);


	this.continueBtn = new G.Button(5,250,'btn_orange',function() {
		if (G.saveState.buyBooster(boosterNr)) {
			G.sfx.cash_register.play();
			this.closeWindow();
		}else {
			this.state.windowLayer.pushWindow(['moreMoney','shop'+boosterNr]);
			this.closeWindow();
		}
	},this);

	this.continueBtn.pulse();

	if (!game.incentivised && G.saveState.isEnoughToBuyBooster(boosterNr)) {
		this.continueBtn.active = false;
		this.continueBtn.alpha = 0.5;
	}
	
	this.continueBtn.addTextLabel('font-white',G.txt(7),50);
	this.registerButtons(this.continueBtn);

	this.registerButtons(this.continueBtn);

};

G.Window.prototype.makeCoinBar = function(x,y,windowToOpen) {



	this.coinArea = G.makeImage(0,y,'popup_text_backgr',0.5,this);
	this.coinIco = G.makeImage(x-130,y,'coin_1',0.5,this);
	this.coinsTxt = new G.OneLineText(0,y,'font-blue',G.saveState.getCoins().toString(),45,190,0.5,0.5);
	this.add(this.coinsTxt);

		if (game.incentivised) {
			this.plusBtn = new G.Button(x+130,y,'btn_plus',function() {
				this.state.windowLayer.pushWindow(['moreMoney',windowToOpen]);
				this.closeWindow();
			},this);
			this.registerButtons(this.plusBtn);
		}

}


G.Window.prototype.shop1 = function() {
	this.shop(1);
}

G.Window.prototype.shop2 = function() {
	this.shop(2);
}

G.Window.prototype.shop3 = function() {
	this.shop(3);
}

G.Window.prototype.shop4 = function() {
	this.shop(4);
}
G.Window.prototype.starterPack = function(packData) {
	
	this.packData = packData;

	this.addBackground('popup_background_2');
	this.addCloseButton();

	//this.pauseTxt = new G.OneLineText(0,-270,'font-white',G.txt(5),60,440,0.5,0.5);
	//this.add(this.pauseTxt);

	//this.packIco = G.makeImage(-220,-260,'starter pack',0.5,this);

	this.packNameTxt = new G.OneLineText(0,-270,'font-white',G.txt(packData.titleTxt),50,350,0.5,0.5);
	this.add(this.packNameTxt);


	this.offerImg = G.makeImage(-250,-150,'off',0.5,this);
	this.offerLabelImg = G.makeImage(-255,-155,'50off',0.5,this);



	var giftsStr = '';

	packData.gifts.forEach(function(gift) {
		giftsStr += G.gift.getLabelString(gift,2) + '   ';
	});

	this.chestFull = G.makeImage(20,-80,'chest_full',0.5,this);

	this.giftsLabelGroup = new G.LabelGroup(giftsStr,0,80,'font-blue',50,0.5,0.5,500);
	this.add(this.giftsLabelGroup);


	this.buyBtn = new G.Button(0,230,'btn_orange',function() {
 		
		// SG_Hooks.social.payments.triggerPurchase(this.packData.vkItemName, '', this.packData.vkItemName, null,(function(response) {

		// 	if (response.status === 'success') {

		// 		G.saveState.data.starterPackBought = true;
		// 		G.saveState.save();
		// 		G.ga.event('SpecialPacks:StarterPack',this.packData.vkPrice,'USD',G.businessEventCounter);

		// 		G.ga.event('Recurring:Purchase:StarterPack:'+(G.saveState.getLastPassedLevelNr()+1));

		// 		G.gift.applyGiftPack(this.packData.gifts,'CoinPack:StarterPack','Purchase:StarterPack');

		// 		this.closeWindow();

		// 		G.sb.onStarterPackBought.dispatch();
				
		// 		new G.PaymentStatus(true);
				
		// 	}	else {
		// 		new G.PaymentStatus(false);
		// 	}
		// }).bind(this));

	},this);

	this.price = new G.LabelGroup(packData.vkPrice+' @socialCurrencyIcon@',0,0,'font-num-blue',50,0.5,0.5,140);
	this.buyBtn.addChild(this.price);

	this.registerButtons(this.buyBtn);

};
G.Window.prototype.taskSlider = function() {


this.y = game.height*-1.5; 
G.sfx.whoosh_short_1.play();
game.add.tween(this).to({y:G.l(-120)},400,Phaser.Easing.Sinusoidal.Out,true).onComplete.add(function() {
	game.time.events.add(1000,G.sfx.whoosh_short_2.play,G.sfx.whoosh_short_2);
	game.add.tween(this).to({y:game.height*1.5},400,Phaser.Easing.Sinusoidal.Out,true,1000).onComplete.add(function() {
		G.sb.onWindowClosed.dispatch();
		this.destroy();
	},this);
},this);


this.addBackground('task_slider');
this.bg.y = G.l(120); 
 


this.taskTxt = new G.OneLineText(0,45,'font-white',G.txt(11)+':',40,380,0.5,0.5);
this.add(this.taskTxt);	

if (G.lvl.pointsGoal) {
	this.goal = new G.OneLineText(0,112,'font-blue',G.txt(55).toUpperCase()+': '+G.lvl.pointsTarget,50,380,0.5,0.5);
	this.add(this.goal);
}else {
	this.makeTaskCollectPanels(112);
}



};

G.Window.prototype.thanksForWatching = function() {

	this.addBackground('popup_background_2');

	this.closeButton = new G.Button(250,-270,'btn_x',function() {
			this.closeWindow();
	},this);
	this.registerButtons(this.closeButton);


	this.thanksForWatching = new G.MultiLineText(0,0,'font-blue',G.txt(24),45,530,200,'center',0.5,0.5);
	this.add(this.thanksForWatching);


	this.continueBtn = new G.Button(5,250,'btn_orange',function() {

		this.closeWindow();

	},this);
	this.continueBtn.pulse();
	this.continueBtn.addTextLabel('font-white',G.txt(4),70);
	this.registerButtons(this.continueBtn);

};
G.Window.prototype.win = function(skipReward) {
    
    didEndGame();
    showIntersititalAd();
	var lastPassedLevelPre = G.saveState.getLastPassedLevelNr();

	if (!G.winsInRow) G.winsInRow = 0;

	G.winsInRow++;

	G.saveState.addLife();

	if (G.lvlNr+1 === 1) {
		G.ga.event('FTUE:Level1:PostLevelPopup:Visible');
	}

	if (!G.lvl.resultData) {
		G.lvl.oldStars = G.saveState.getStars(G.lvl.lvlNr);
		G.lvl.resultData = G.saveState.passLevel(G.lvl.lvlNr,Math.max(1,G.lvl.stars),G.lvl.points,true);
	}

	var result = G.lvl.resultData;
	var oldStars = G.lvl.oldStars;

	G.ga.event('Complete:Gate' + G.saveState.checkGateNr(G.lvlNr) + ':Level' + (G.lvlNr+1),0,G.lvl.points);
  	G.ga.event('Recurring:Progression:Gate' + G.saveState.checkGateNr(G.lvlNr) + ':Level' + (G.lvlNr+1)+':'+result.stars+'starWon'); 

	//add items for good
	for (var i = 0; i < G.lvl.items.length; i++) {
		if (G.lvl.items[i]) {
			G.saveState.changeItemAmount(i,G.lvl.items[i]);
		}
	}		

	this.result = result;

	this.addBackground('popup_background_2');
	this.levelBg = G.makeImage(0,-275,'popup_top',0.5,this);

	var starsAchieved = result.stars;

	this.levelTxt = new G.OneLineText(0,-300,'font-white',G.txt(10)+' '+(this.state.lvlNr+1),60,330,0.5,0.5);
	this.add(this.levelTxt);
 

	this.youWinTxt = new G.OneLineText(0,-70,'font-blue',G.txt(49),45,530,0.5,0.5);
	this.add(this.youWinTxt); 


	this.scoreBg = G.makeImage(20,20,'popup_text_backgr',0.5,this);
	this.scoreIcon = G.makeImage(-90,20,'score_icon',0.5,this);
	this.scoreIcon.scale.setTo(1.2);


	if (G.lvl.resultData.reward > 0){

		this.coinBg = G.makeImage(20,120,'popup_text_backgr',0.5,this);
		this.coinIco = G.makeImage(-90,120,'coin_1',0.5,this);
		this.amountTxt = new G.OneLineCounter(25,120,'font-blue',0,45,160,0.5,0.5);
		this.add(this.amountTxt);
	
	}

	this.scoreTxt = new G.OneLineText(32,20,'font-blue',G.lvl.points.toString(),45,190,0.5,0.5);
	this.add(this.scoreTxt);	
	
	this.retryBtn = new G.Button(-120,240,'btn_orange',function() {

		G.sb.onAllWindowsClosed.add(function() {
                G.sb.onStateChange.dispatch('Game',G.lvlNr);
		});
		this.closeWindow();
		
	},this);
	this.retryBtn.addTextLabel('font-white',G.txt(6),70);
	this.add(this.retryBtn);


	this.continueBtn = new G.Button(120,240,'btn_green',function() {

		if (G.lvlNr+1 === 1) {
			G.ga.event('FTUE:Level1:PostLevelPopup:ContinueButton');
		}

		if (G.saveState.getLastPassedLevelNr() >= 4 && this.result.passed) {
			G.sb.pushWindow.dispatch(['passedFriend',this.result]);
		}

		
        //var muteFlag = game.sound.mute; game.sound.mute = true;
		// G.sfx.music.volume = 0
  //       SG_Hooks.levelUp(G.lvl.lvlNr+1, G.lvl.points,function(){
		// 	//game.sound.mute = muteFlag;
  //           G.sfx.music.volume = 1;
		// });
        console.log("this.continueBtn");

		G.sb.onAllWindowsClosed.add(function() {
	      G.sb.onStateChange.dispatch(G.debugMode ? "EditorWorld" : "World", {
	          lvlNr: G.lvl.lvlNr,
	          reward: G.lvl.moneyGained,
	          //star: G.lvl.resultData.reward,
	          starImprovement: G.lvl.resultData.starImprovement
	      });
		});

		//gifts popup
		if ( 
        (G.lvl.lvlNr == 2 && oldStars == 0)
        ||
        (G.winsInRow >= 3 && Math.random() < G.json.settings.chancesForAchievementGift)) {

        G.winsInRow = 0;
        G.sb.pushWindow.dispatch(['gift','achievement']);

    }else if (
        (G.lvl.lvlNr == 0 && oldStars == 0)
        ||
        (result.stars == 3 && Math.random() < G.json.settings.chancesFor3StarsGift)) {

        G.sb.pushWindow.dispatch(['gift','3stars']);
        
    }

		this.closeWindow();		
		
	},this);
	this.continueBtn.addTextLabel('font-white',G.txt(4),70);

	this.registerButtons(this.continueBtn);


	this.blankStars = [
		G.makeImage(-100,-150,'star_blank',0.5,this),
		G.makeImage(0,-175,'star_blank',0.5,this),
		G.makeImage(100,-150,'star_blank',0.5,this)
	];
	this.blankStars[0].scale.setTo(0.8);
	this.blankStars[2].scale.setTo(0.8);


	this.stars = [
		G.makeImage(-100,-150,starsAchieved >= 1 ? 'star' : 'star_blank',0.5,this),
		G.makeImage(0,-175,starsAchieved >= 2 ? 'star' : 'star_blank',0.5,this),
		G.makeImage(100,-150,starsAchieved >= 3 ? 'star' : 'star_blank',0.5,this),
	];
	this.stars[0].scale.setTo(0.8);
	this.stars[2].scale.setTo(0.8);

	this.stars.forEach(function(elem,index) {
		if (index+1 <= starsAchieved) {

			var orgScale = elem.scale.x;
			elem.scale.setTo(0);
			var tween = game.add.tween(elem.scale).to({x:orgScale,y:orgScale},300,Phaser.Easing.Bounce.Out,true,800+(index*200));
			tween.onStart.add(function() {
				G.sfx.pop.play();
				G.sfx.explosion_subtle.play();
				this.add(new G.WinStarPart(elem.x,elem.y,true));
				this.add(new G.WinStarPart(elem.x,elem.y,true));
				this.add(new G.WinStarPart(elem.x,elem.y,true));
				this.add(new G.WinStarPart(elem.x,elem.y,true));
				this.add(new G.WinStarPart(elem.x,elem.y,true));
			},this);

		}else {
			elem.visible = false;
		}
	},this);

	game.time.events.add(1000,function() {
		if (result.reward > 0) {
			//dont change now, we will change it on world map
			//G.saveState.changeCoins(result.reward);
			G.ga.event('Source:Coins:Level:LevelComplete',result.reward);
			G.ga.event('Source:Coins:Level:ChestRewards',G.lvl.moneyGainedChest);
			G.sb.onLevelMoneyGain.dispatch(result.reward);
			this.amountTxt.increaseAmount(result.reward);
		}
	},this);


	//check if it is first time level 0
	// hide retry btn 
	if (lastPassedLevelPre == 0){
		this.retryBtn.visible = false;
		this.continueBtn.x = 0;
		this.continueBtn.pulse();
	}

};

function showWelcomeAd(){

    console.log("展示欢迎广告");

};
function showIntersititalAd(){

    console.log("展示全屏广告");
    playAds();

};

function didLoadCompleted(){

   var time= parseInt(((new Date().getTime())-loadGameTime)/1000.0);
   console.log("游戏加载完成了:"+time+"s");
   ga('send', 'event', {
    eventCategory: '主页',
    eventAction: '加载完成',
    eventLabel: time
  });

};
function didClickedPlay(){

    hideAdBannerInGame();
    requestAdByType(1);
    console.log("点击play");
    ga('send', 'event', {
    eventCategory: '主页',
    eventAction: '点击Play'
  });
};
function didClickedLevel(){

    console.log("点击关卡:"+(G.lvlNr+1));

    ga('send', 'event', {
    eventCategory: '关卡',
    eventAction: '点击关卡',
    eventLabel:(G.lvlNr+1)
  });

};

function didstartGame(){

    console.log("游戏开始了:"+(G.lvlNr+1));

     ga('send', 'event', {
    eventCategory: '游戏页',
    eventAction: '开始游戏',
    eventLabel:(G.lvlNr+1)
  });
};
function didEndGame(){
    console.log("游戏结束了:"+(G.lvlNr+1));
   ga('send', 'event', {
    eventCategory: '游戏页',
    eventAction: '结束游戏',
    eventLabel:(G.lvlNr+1)
  });
};

function didPauseGame(){
    console.log("暂停游戏");
    ga('send', 'event', {
        eventCategory: '游戏页',
        eventAction: '暂停游戏',
        eventLabel:(G.lvlNr+1)
    });
};

function didStartPreLoad(){

  showAdBannerInGame();

};


function startGame(){

            loadGameTime = new Date().getTime();
            var game = new Phaser.Game(800, 1100, Phaser.CANVAS, '', null, true);
            window.game = game;

            game.state.add('Boot', G.Boot);
            game.state.add('Preloader', G.Preloader);
            game.state.add('World', G.World);
            game.state.add('Game', G.Game);
            game.state.add('Editor', G.Editor);
            game.state.add('EditorWorld', G.EditorWorld);
            game.state.add('TitleScreen', G.TitleScreen);
            game.state.add('TestState', G.TestState);
            game.state.add('MidLoader', G.MidLoader);
            game.state.add('SOLVESTATE', G.SOLVESTATE);
            game.state.add('ErrorState', G.ErrorState);
            //  Now start the Boot state.
            game.state.start('Boot');

}


