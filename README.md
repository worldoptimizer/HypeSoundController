# Hype Sound Controller

This is a sound management API for Tumult Hype documents, allowing for instance management, bucketing, persistent muting, and more. This extension simplifies audio handling within your Hype projects, providing a robust layer of control beyond the standard audio actions.

## Setup in Tumult Hype

1.  **Download the JavaScript file:** Obtain the `HypeSoundController.js` file.
2.  **Add to Hype Resources:** In your Hype document, go to the 'Resources' panel. Click the '+' button at the bottom and select 'Add File...' or simply drag and drop the `HypeSoundController.js` file into the Resources library.
3.  **Ensure it's included in the head:** Make sure the checkbox for "Include in document <head>" is checked for the added JavaScript file.

That's it! The Hype Sound Controller API will automatically be available within your Hype document's JavaScript functions and on the `hypeDocument` object.

## Basic Usage

To use the sound controller, you'll first need to load a sound. A good place to do this is in a new JavaScript function that runs `On Scene Load` for your first scene.

**1. Create a new JavaScript function in Hype:**

*   In the 'Resources' panel, click the '+' and select 'Add JavaScript Function'.
*   Give it a descriptive name (e.g., `setupSounds`).

**2. Add the following code to the function:**

```javascript
function setupSounds(hypeDocument, element, event) {
    // Load a sound file from the Resources library
    hypeDocument.loadSound('my-background-music.mp3', { 
        alias: 'backgroundMusic',
        loop: true 
    });

    // Load another sound
    hypeDocument.loadSound('click-sound.wav', { 
        alias: 'click' 
    });
}
```

**3. Trigger this function:**

*   Select your first scene.
*   In the 'Scene Inspector', click 'On Scene Load' and choose 'Run JavaScript...' and select your `setupSounds` function.

**4. Play the sound:**

You can now play this sound from anywhere in your Hype document, for example, on a button click.

*   Select a button element.
*   In the 'Actions Inspector', choose 'On Mouse Click' -> 'Run JavaScript...' -> 'New Function'.
*   In the new function, add:

```javascript
function playMusicOnClick(hypeDocument, element, event) {
    hypeDocument.playSound('backgroundMusic');
}
```

---

## API Reference

Once the script is installed, all functions are available on the `hypeDocument` object.

### `hypeDocument.loadSound(filename, options)`

Prepares a sound for playback.

*   **`filename`** (String): The name of the sound file in the Hype Resources library (e.g., `'my-sound.mp3'`) or a full path to an external sound file.
*   **`options`** (Object): An optional object to configure the sound's behavior.
    *   **`alias`** (String): A unique name to refer to this sound. If not provided, it defaults to the filename without the extension.
    *   **`bucket`** (String): The name of the sound group this belongs to. Defaults to `'default'`.
    *   **`loop`** (Boolean): Whether the sound should loop. Defaults to `false`.
    *   **`volume`** (Number): The volume from `0.0` to `1.0`. Defaults to `1.0`.
    *   **`stopOthers`** (Boolean): Whether to stop other sounds when this one plays. Defaults to `true`.
    *   **`fadeIn`** (Number): Fade-in duration in seconds. Defaults to `0`.
    *   **`fadeOut`** (Number): Fade-out duration in seconds. Defaults to `0`.

### `hypeDocument.playSound(alias, options)`

Plays a loaded sound.

*   **`alias`** (String): The alias of the sound to play.
*   **`options`** (Object): An optional object to override the default or load-time options for this specific playback instance.

### `hypeDocument.pauseSound(alias, options)`

Pauses a playing sound, with an optional fade-out.

*   **`alias`** (String): The alias of the sound to pause.
*   **`options`** (Object):
    *   **`fadeOut`** (Number): Duration in seconds to fade out before pausing.

### `hypeDocument.resumeSound(alias, options)`

Resumes a paused sound, with an optional fade-in.

*   **`alias`** (String): The alias of the sound to resume.
*   **`options`** (Object):
    *   **`fadeIn`** (Number): Duration in seconds to fade in when resuming.

### `hypeDocument.stopSound(alias, options)`

Stops a sound and resets its playback to the beginning.

*   **`alias`** (String): The alias of the sound to stop.
*   **`options`** (Object):
    *   **`fadeOut`** (Number): Duration in seconds to fade out before stopping.

### `hypeDocument.stopAllSounds(bucket)`

Stops all sounds, or all sounds within a specific bucket.

*   **`bucket`** (String, optional): The name of the bucket to stop sounds in. If omitted, all sounds from all buckets will be stopped.

---

## Examples and Use Cases

### Fading Sounds (`fadeIn`/`fadeOut`)

You can create smooth audio transitions by using the `fadeIn` and `fadeOut` options. The duration is specified in seconds.

**Example:** Have background music fade in when a scene loads and fade out when a button is clicked.

1.  **Load the sound in your setup function:**
    ```javascript
    function setupSounds(hypeDocument, element, event) {
        // We can set a default fadeOut time for this sound when we load it.
        hypeDocument.loadSound('ambient-music.mp3', { 
            alias: 'ambient',
            loop: true,
            fadeOut: 2.5 // Default fade-out of 2.5 seconds
        });
    }
    ```

2.  **On Scene Load, play the sound with a fade-in:**
    ```javascript
    function startMusic(hypeDocument, element, event) {
        // This will override any default fadeIn and start playing the music,
        // fading it in from volume 0 to 1 over 4 seconds.
        hypeDocument.playSound('ambient', { fadeIn: 4 });
    }
    ```

3.  **On a button click, stop the sound with a fade-out:**
    ```javascript
    function stopMusic(hypeDocument, element, event) {
        // Since we set a default fadeOut of 2.5 seconds when loading,
        // we don't need to specify it again here.
        // The music will fade to silence over 2.5 seconds before stopping.
        hypeDocument.stopSound('ambient');
    }
    ```

### Sound Buckets

Buckets are a powerful feature for managing groups of sounds. For example, you can have a 'background' bucket and an 'sfx' bucket.

**Example:**

```javascript
// On Scene Load (in your setup function)
hypeDocument.loadSound('ambient-music.mp3', { alias: 'ambient', bucket: 'background', loop: true });
hypeDocument.loadSound('button-hover.wav', { alias: 'hover', bucket: 'sfx', stopOthers: false });
hypeDocument.loadSound('button-click.wav', { alias: 'click', bucket: 'sfx', stopOthers: false });

// Later, to stop only the sound effects:
hypeDocument.stopAllSounds('sfx'); 
```

### Muting

You can mute and unmute sounds globally or on a per-bucket basis. This state is persistent.

*   **`hypeDocument.muteAllSounds(bucket)`**: Mutes all sounds or just a specific bucket.
*   **`hypeDocument.unmuteAllSounds(bucket)`**: Unmutes all sounds or just a specific bucket.
*   **`hypeDocument.isMuted(bucket)`**: Returns `true` if all sounds or a specific bucket is muted.

**Example:** Creating a mute toggle button.

```javascript
function toggleMute(hypeDocument, element, event) {
    if (hypeDocument.isMuted()) {
        hypeDocument.unmuteAllSounds();
        element.innerHTML = 'Mute';
    } else {
        hypeDocument.muteAllSounds();
        element.innerHTML = 'Unmute';
    }
}
```

### Custom Behavior Triggers

The sound controller can trigger Custom Behaviors in Hype, allowing you to chain animations and other actions to audio events without writing extra code.

*   `Audio Started`: Triggered when any sound starts playing.
*   `Audio Started [alias]`: Triggered when a specific sound starts (e.g., `Audio Started ambient`).
*   `Audio Ended`: Triggered when any sound finishes.
*   `Audio Ended [alias]`: Triggered when a specific sound finishes.
*   `Audio Failed`: Triggered if a sound fails to play (e.g., due to browser restrictions).
*   `Audio Failed [alias]`: Triggered when a specific sound fails.

To use these, create a new Custom Behavior in the Scene or Symbol inspector and give it one of the names above. You can then add Hype actions (like starting a timeline) to this behavior.

---

## Advanced API

### `HypeSoundController.setDefault(key, value)` or `HypeSoundController.setDefault({key: value})`

You can change the global default settings for all sounds. This is useful for setting project-wide defaults. You would typically run this in a function on the first scene load. This function is called on the global `HypeSoundController` object, not `hypeDocument`.

**Example:** All sounds should loop by default.

```javascript
function setGlobalSoundDefaults(hypeDocument, element, event) {
    HypeSoundController.setDefault('loop', true);
}
```

### `HypeSoundController.getDefault(key)`

Retrieves a specific default setting or the entire default object.

### `playOnlyInBucket(bucketName, aliasToPlay, options)`

A useful helper function that stops all other sounds in a specified bucket and plays only the desired sound. This is great for managing mutually exclusive sounds, like tracks on a playlist.

**Example:** A playlist where only one song can play at a time.

```javascript
// Load sounds into a 'playlist' bucket
hypeDocument.loadSound('song1.mp3', { alias: 'song1', bucket: 'playlist' });
hypeDocument.loadSound('song2.mp3', { alias: 'song2', bucket: 'playlist' });

// Function for a button to play song 1
function playSong1(hypeDocument, element, event) {
    hypeDocument.playOnlyInBucket('playlist', 'song1', { fadeIn: 1 });
}

// Function for a button to play song 2
function playSong2(hypeDocument, element, event) {
    hypeDocument.playOnlyInBucket('playlist', 'song2', { fadeIn: 1 });
}
```
