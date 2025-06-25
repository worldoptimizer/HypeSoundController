/*!
 * Hype Sound Controller v1.4.0
 * Copyright (2025) Max Ziebell, MIT License
 *
 * This extension provides a comprehensive sound management API for Hype documents,
 * allowing for instance management, bucketing, persistent muting, and more.
 */

/*
 * Version History:
 * v1.0.0   Initial release.
 * v1.0.1   Improved path detection and handled play() promise rejection.
 * v1.1.0   Added Custom Behavior triggers for 'Started', 'Ended', and 'Failed'.
 * v1.2.0   Added persistent and bucket-based muting and hypeDocument.isMuted().
 * v1.3.0   stopOthers is now default. Options can be set on load and overridden
 *          on play. Added fadeIn/fadeOut (ms), getSoundsInBucket(), and 
 *          playOnlyInBucket() helper.
 * v1.3.1   Changed fadeIn and fadeOut durations from milliseconds to seconds.
 * v1.3.2   Enhanced resumeSound() to automatically start playback if no instances
 *          exist, making the API more intuitive for users.
 * v1.4.0   Added automatic HypeReactiveContent integration. All state-changing
 *          functions now trigger reactive content refresh automatically.
 */

if ("HypeSoundController" in window === false) {
    window['HypeSoundController'] = (function () {
  
    const _version = "1.4.0";
        let _default = {
        bucket: 'default',
        loop: false,
        volume: 1.0,
        stopOthers: true,
        fadeIn: 0,
        fadeOut: 0
      };

      function setDefault(key, value) {
        if (typeof key === 'object') { _default = Object.assign(_default, key); } 
        else { _default[key] = value; }
      }
      function getDefault(key) { return key ? _default[key] : _default; }

      const _documents = {};
      function getDocRegistry(hypeDocument) {
        const docId = hypeDocument.documentId ? hypeDocument.documentId() : hypeDocument.documentName();
        if (!_documents[docId]) {
          _documents[docId] = {
            sounds: {},
            buckets: {},
            muteState: { global: false, buckets: {} }
          };
        }
        return _documents[docId];
      }
      
      // --- Helper Functions ---
      function _isSoundMuted(doc, key) {
        if (doc.muteState.global) return true;
        const entry = doc.sounds[key];
        return entry && doc.muteState.buckets[entry.bucket];
      }
  
      function _fadeVolume(audio, targetVolume, duration, onComplete) {
        if (audio._fadeInterval) clearInterval(audio._fadeInterval);
        
        // UPDATED: Convert duration from seconds to milliseconds for internal use
        const durationMs = duration * 1000;

        if (!durationMs) {
          audio.volume = targetVolume;
          if (onComplete) onComplete();
          return;
        }
        const startVolume = audio.volume;
        const startTime = Date.now();
        audio._fadeInterval = setInterval(function() {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          audio.volume = startVolume + (targetVolume - startVolume) * progress;
          if (progress >= 1) {
            clearInterval(audio._fadeInterval);
            delete audio._fadeInterval;
            if (onComplete) onComplete();
          }
        }, 16);
      }
      
      function isPath(url) { return /\//.test(url); }
  
      // --- API ---
      function loadSound(hypeDocument, filename, options) {
        const doc = getDocRegistry(hypeDocument);
        const key = (options && options.alias) || filename.replace(/\.[^/.]+$/, "");
        if (doc.sounds[key]) return;
        
        const src = !isPath(filename) ? hypeDocument.resourcesFolderURL() + "/" + filename : filename;
        
        doc.sounds[key] = Object.assign({}, getDefault(), options, {
          alias: key,
          src: src,
          playingInstances: []
        });

        const bucket = doc.sounds[key].bucket;
        if (!doc.buckets[bucket]) doc.buckets[bucket] = [];
        doc.buckets[bucket].push(key);
        _triggerReactiveContentRefresh(hypeDocument);
      }
  
      function playSound(hypeDocument, key, options) {
        const doc = getDocRegistry(hypeDocument);
        const entry = doc.sounds[key];
        if (!entry) return console.warn('HypeSoundController: Sound "' + key + '" not loaded.');
        
        const finalOptions = Object.assign({}, entry, options);

        if (finalOptions.stopOthers) {
          stopSound(hypeDocument, key, { fadeOut: finalOptions.fadeOut });
        }

        const audio = new Audio(entry.src);
        audio.loop = finalOptions.loop;
        audio.muted = _isSoundMuted(doc, key);
        audio.volume = (finalOptions.fadeIn > 0) ? 0 : finalOptions.volume;

        audio.addEventListener('ended', function () {
          hypeDocument.triggerCustomBehaviorNamed('Audio Ended');
          hypeDocument.triggerCustomBehaviorNamed('Audio Ended ' + key);
          const idx = entry.playingInstances.indexOf(audio);
          if (idx !== -1) entry.playingInstances.splice(idx, 1);
        });

        entry.playingInstances.push(audio);

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(function() {
            _fadeVolume(audio, finalOptions.volume, finalOptions.fadeIn);
            hypeDocument.triggerCustomBehaviorNamed('Audio Started');
            hypeDocument.triggerCustomBehaviorNamed('Audio Started ' + key);
          }).catch(function(error) {
            const idx = entry.playingInstances.indexOf(audio);
            if (idx !== -1) entry.playingInstances.splice(idx, 1);
            hypeDocument.triggerCustomBehaviorNamed('Audio Failed');
            hypeDocument.triggerCustomBehaviorNamed('Audio Failed ' + key);
          });
        }
        _triggerReactiveContentRefresh(hypeDocument);
        return audio;
      }
  
      function pauseSound(hypeDocument, key, options) {
        const entry = getDocRegistry(hypeDocument).sounds[key];
        if (!entry) return;
        const finalOptions = Object.assign({}, entry, options);
        
        entry.playingInstances.forEach(function(audio) {
          _fadeVolume(audio, 0, finalOptions.fadeOut, function() {
            audio.pause();
          });
        });
        _triggerReactiveContentRefresh(hypeDocument);
      }
  
      function resumeSound(hypeDocument, key, options) {
        const entry = getDocRegistry(hypeDocument).sounds[key];
        if (!entry) return;
        const finalOptions = Object.assign({}, entry, options);

        // If there are no playing instances, start playing the sound
        if (entry.playingInstances.length === 0) {
          return playSound(hypeDocument, key, options);
        }

        // Resume any paused instances
        entry.playingInstances.forEach(function(audio) {
          if (audio.paused) {
            audio.play().catch(function(){});
            _fadeVolume(audio, finalOptions.volume, finalOptions.fadeIn);
          }
        });
      }
  
      function stopSound(hypeDocument, key, options) {
        const entry = getDocRegistry(hypeDocument).sounds[key];
        if (!entry) return;
        const finalOptions = Object.assign({}, entry, options);
        
        const instancesToStop = entry.playingInstances.slice();
        entry.playingInstances = [];
        
        instancesToStop.forEach(function(audio) {
          _fadeVolume(audio, 0, finalOptions.fadeOut, function() {
            audio.pause();
            audio.currentTime = 0;
          });
        });
        _triggerReactiveContentRefresh(hypeDocument);
      }
  
      function unloadSound(hypeDocument, key) {
        stopSound(hypeDocument, key);
        const doc = getDocRegistry(hypeDocument);
        const entry = doc.sounds[key];
        if (!entry) return;
        const bucket = entry.bucket;
        if (doc.buckets[bucket]) {
          doc.buckets[bucket] = doc.buckets[bucket].filter(function(k) { return k !== key; });
        }
        delete doc.sounds[key];
        _triggerReactiveContentRefresh(hypeDocument);
      }
      
      function isSoundLoaded(hypeDocument, key) {
        return !!getDocRegistry(hypeDocument).sounds[key];
      }
  
      function isSoundPlaying(hypeDocument, key) {
        const entry = getDocRegistry(hypeDocument).sounds[key];
        return entry ? entry.playingInstances.some(function(a) { return !a.paused && !a.ended; }) : false;
      }
  
      function stopAllSounds(hypeDocument, bucket) {
        const doc = getDocRegistry(hypeDocument);
        const keys = bucket ? (doc.buckets[bucket] || []) : Object.keys(doc.sounds);
        keys.forEach(function(key) { stopSound(hypeDocument, key); });
        _triggerReactiveContentRefresh(hypeDocument);
      }
  
      function muteAllSounds(hypeDocument, bucket) {
        const doc = getDocRegistry(hypeDocument);
        let keysToUpdate;
        if (bucket) {
          doc.muteState.buckets[bucket] = true;
          keysToUpdate = doc.buckets[bucket] || [];
        } else {
          doc.muteState.global = true;
          keysToUpdate = Object.keys(doc.sounds);
        }
        _updateMuteOnPlayingInstances(doc, keysToUpdate);
        _triggerReactiveContentRefresh(hypeDocument);
      }
  
      function unmuteAllSounds(hypeDocument, bucket) {
        const doc = getDocRegistry(hypeDocument);
        let keysToUpdate;
        if (bucket) {
          doc.muteState.buckets[bucket] = false;
          keysToUpdate = doc.buckets[bucket] || [];
        } else {
          doc.muteState.global = false;
          keysToUpdate = Object.keys(doc.sounds);
        }
        _updateMuteOnPlayingInstances(doc, keysToUpdate);
        _triggerReactiveContentRefresh(hypeDocument);
      }
  
      function isMuted(hypeDocument, bucket) {
        const doc = getDocRegistry(hypeDocument);
        return bucket ? !!doc.muteState.buckets[bucket] : doc.muteState.global;
      }
  
      function getLoadedSounds(hypeDocument) {
        return Object.keys(getDocRegistry(hypeDocument).sounds);
      }
      
      function getSoundsInBucket(hypeDocument, bucketName) {
        const doc = getDocRegistry(hypeDocument);
        return doc.buckets[bucketName] || [];
      }

      function playOnlyInBucket(hypeDocument, bucketName, aliasToPlay, options) {
        const soundsInBucket = getSoundsInBucket(hypeDocument, bucketName);

        soundsInBucket.forEach(function(alias) {
          if (alias === aliasToPlay) {
            if (!isSoundPlaying(hypeDocument, alias)) {
              playSound(hypeDocument, alias, options);
            }
          } else {
            // Check if it's playing before stopping to avoid redundant calls
            if (isSoundPlaying(hypeDocument, alias)) {
                stopSound(hypeDocument, alias);
            }
          }
        });
      }
  
      function _updateMuteOnPlayingInstances(doc, keysToUpdate) {
        keysToUpdate = keysToUpdate || Object.keys(doc.sounds);
        keysToUpdate.forEach(function(key){
          const e = doc.sounds[key];
          if(!e) return;
          const isMuted = _isSoundMuted(doc, key);
          e.playingInstances.forEach(function(a){ a.muted = isMuted; });
        });
      }

      function _triggerReactiveContentRefresh(hypeDocument) {
        // Check if HypeReactiveContent is available and trigger refresh
        if (typeof hypeDocument.refreshReactiveContentDebounced === 'function') {
          hypeDocument.refreshReactiveContentDebounced();
        }
      }
  
      // --- Hype Integration ---
      function HypeDocumentLoad(hypeDocument, element, event) {
        const api = {
          loadSound, playSound, pauseSound, resumeSound, stopSound, unloadSound,
          isSoundLoaded, isSoundPlaying, stopAllSounds, muteAllSounds,
          unmuteAllSounds, isMuted, getLoadedSounds, getSoundsInBucket,
          playOnlyInBucket
        };
        
        for (const name in api) {
          if (api.hasOwnProperty(name)) {
            hypeDocument[name] = api[name].bind(null, hypeDocument);
          }
        }
      }
  
      if ("HYPE_eventListeners" in window === false) window.HYPE_eventListeners = [];
      window.HYPE_eventListeners.push({ type: "HypeDocumentLoad", callback: HypeDocumentLoad });
  
      return {
        version: _version,
        setDefault: setDefault,
        getDefault: getDefault
      };
  
    })();
  }
