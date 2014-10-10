/**
*  @module Framework
*  @namespace cloudkid
*/
(function(undefined){

	// Classes to import
	var Application,
		Loader;

	/**
	*  Used for managing the browser cache of loading external elements
	*  can easily load version manifest and apply it to the media loader
	*  supports cache busting all media load requests
	*  uses the query string to bust browser versions.
	*
	*  @class CacheManager
	*/
	var CacheManager = function()
	{
		if(!Application)
		{
			Application = include('cloudkid.Application');
			Loader = include('cloudkid.Loader');
		}
		
		this._applySpecificVersion = this._applySpecificVersion.bind(this);
		this._applyGlobalVersion = this._applyGlobalVersion.bind(this);

		/**
		*  The collection of version numbers
		*  @protected
		*  @property {Dictionary} _versions
		*/
		this._versions = {};
		
		/**
		*  The list of URL preparation functions.
		*  @protected
		*  @property {Array} _preparationCallbacks
		*/
		this._preparationCallbacks = [];
		
		/**
		*  A global version or cache busting string to apply to every url.
		*  @property {String} _globalVersion
		*/
		this._globalVersion = null;
		
		var cb = Application.instance.options.cacheBust;
		this.cacheBust = (cb === "true" || cb === true);
		
		if(DEBUG)
		{
			if (this.cacheBust) Debug.log("CacheBust all files is on.");
		}
	};
	
	/* Easy access to the prototype */
	var p = CacheManager.prototype = {};
	
	/**
	*  If we are suppose to cache bust every file
	*  @property {Boolean} cacheBust
	*  @public
	*  @default false
	*/
	Object.defineProperty(p, "cacheBust",
	{
		get: function()
		{
			return !!(this._globalVersion && this._globalVersion.indexOf("cb=") === 0);
		},
		set: function(value)
		{
			if(value)
			{
				this._globalVersion = "cb=" + Date.now();
				this.unregisterURLPreparation(this._applySpecificVersion);
				this.registerURLPreparation(this._applyGlobalVersion);
			}
			else
			{
				var version = Application.instance.options.version;
				this._globalVersion = version ? "v=" + version : null;
				if(this._globalVersion)
				{
					this.registerURLPreparation(this._applyGlobalVersion);
					this.unregisterURLPreparation(this._applySpecificVersion);
				}
				else
				{
					this.unregisterURLPreparation(this._applyGlobalVersion);
					this.registerURLPreparation(this._applySpecificVersion);
				}
			}
		}
	});
	
	/**
	*  Destroy the cache manager, don't use after this
	*  @public
	*  @method destroy
	*/
	p.destroy = function()
	{
		this._versions = null;
		this._preparationCallbacks = null;
		this._applySpecificVersion = null;
		this._applyGlobalVersion = null;
	};
	
	/**
	*  Add the versions
	*  @public
	*  @method addVersionsFile
	*  @param {String} url The url of the versions file
	*  @param {Function} callback Callback when the url has been laoded
	*  @param {String} baseUrl A base url to prepend all lines of the file
	*/
	p.addVersionsFile = function(url, callback, baseUrl)
	{
		Debug.assert(/^.*\.txt$/.test(url), "The versions file must be a *.txt file");
				
		var loader = Loader.instance;
		
		// If we already cache busting, we can ignore this
		if (this.cacheBust)
		{
			if (callback) callback();
			return;
		}
		
		// Add a random version number to never cache the text file
		this.addVersion(url, Date.now().toString());
		
		//ensure that that cache busting version is applied
		url = this._applySpecificVersion(url);
		
		var cm = this;
		
		// Load the version
		loader.load(url,
			function(result)
			{
				// check for a valid result content
				if (result && result.content)
				{
					// Remove carrage returns and split on newlines
					var lines = result.content.replace(/\r/g, '').split("\n");
					var i, parts;

					// Go line by line
					for(i = 0; i < lines.length; i++)
					{
						// Check for a valid line
						if (!lines[i]) continue;

						// Split lines
						parts = lines[i].split(' ');

						// Add the parts
						if (parts.length != 2) continue;

						// Add the versioning
						cm.addVersion((baseUrl || "") + parts[0], parts[1]);
					}
				}
				if (callback) callback();
			}
		);
	};
	
	/**
	*  Add a version number for a file
	*  @method addVersion
	*  @public
	*  @param {String} url The url of the object
	*  @param {String} version Version number or has of file
	*/
	p.addVersion = function(url, version)
	{
		if (!this._versions[url])
			this._versions[url] = version;
	};
	
	p.registerURLPreparation = function(callback)
	{
		if(this._
	};
	
	p.unregisterURLPreparation = function(callback)
	{
	};
	
	/**
	*  Applies a url specific version to a url from the versions file.
	*  @method _applySpecificVersion
	*  @private
	*  @param {String} url The url to apply versioning to.
	*  @return {String} The modified url.
	*/
	p._applySpecificVersion = function(url)
	{
		var ver = this._versions[url];
		//if a version exists for this url, and the url doesn't already have 'v=' in it
		//then apply the url specific version.
		if(ver && /(\?|\&)v\=[0-9]*/.test(url) === false)
		{
			url = url + (url.indexOf("?") < 0 ? "?" : "&") + "v=" + ver.version;
		}
		return url;
	};
	
	/**
	*  Applies cache busting or a global version to a url.
	*  @method _applyGlobalVersion
	*  @private
	*  @param {String} url The url to apply versioning to.
	*  @return {String} The modified url.
	*/
	p._applyGlobalVersion = function(url)
	{
		if(!this._globalVersion) return url;
		var test = this._globalVersion.indexOf("cb=") === 0 ?
			(/(\?|\&)cb\=[0-9]*/) : (/(\?|\&)v\=/);
		if(test.test(url) === false)
		{
			url = url + (url.indexOf("?") < 0 ? "?" : "&") + this._globalVersion;
		}
		return url;
	};
	
	/**
	*  Prepare a URL with the necessary cache busting and/or versioning
	*  as well as the base directory.
	*  @public
	*  @method prepare
	*  @param {String} url The url to prepare
	*  @param {Boolean} [applyBasePath=false] If the global base path should be applied to the url.
	*		This defaults to false because it can potentially interfere with later regular
	*		expression checks, particularly with PreloadJS
	*  @return {String} The final url with version/cache and basePath added
	*/
	p.prepare = function(url, applyBasePath)
	{
		for(var i = 0; i < this._preparationCallbacks.length; ++i)
		{
			url = this._preparationCallbacks[i](url);
		}
		
		if(applyBasePath)
		{
			var basePath = Application.instance.options.basePath;
			if (/^http(s)?\:/.test(url) === false && basePath && url.search(basePath) == -1)
			{
				url = basePath + url;
			}
		}
		return url;
	};
	
	// Assign to namespace
	namespace('cloudkid').CacheManager = CacheManager;
	
}());