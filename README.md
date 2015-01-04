PS4Player
=========

Video streamer for Sony PlayStation 4

All of this is possible thanks to HTML5 video support in the PlayStation 4 web browser. Keep in mind that it requires a powerful CPU that can encode H.264 videos in real time.

How to use
----------
##### Mac OS X
- Install node.js from http://nodejs.org/
- Clone/download this repository
- Open the terminal, and enter the folder where you cloned/extracted the files
- Install required applications and libraries using homebrew (http://brew.sh/)
    - `brew install ffmpeg --enable-libx264 --enable-libfaac --enable-libass --with-faac --with-ass`
    - `brew install icu4c`
    - `ln -s /usr/local/Cellar/icu4c/*/bin/icu-config /usr/local/bin/icu-config`
    - `ln -s /usr/local/Cellar/icu4c/*/include/unicode /usr/local/include`
- Run `npm install` to install node.js dependencies
- Run `node server.js` to start the application
- Go to `http://[ip of your computer]:8080/` using PlayStation 4 web browser
- Grab some popcorn and enjoy!

##### Linux/BSD
Will be updated later but should be similar to Mac OS X.

##### Windows
I don't use Windows, patches are welcome.

Basic steps are:

- Install node.js
- Install ffmpeg
- Prepare video files
- Prepare PlayStation 4
- Watch video

FAQ
---
*Q:* I have a 3D (SBS/OU) movie and my subtitles appear stretched, how to fix this?

*A:* Use http://code.google.com/p/sub3dtool/ to convert the subtitle to .ass format which supports 3D subtitles. Built in support for 3D subtitles will be added later.


*Q:* My computer can't keep up with encoding speed, is there anything i can do?

*A:* Get a faster computer or edit server.js and fiddle with ffmpeg parameters (try changing the preset). A configuration option might be added later.


*Q:* Can I buy you a beer?

*A:* Sure, send your donations to the dvsoftware@gmail.com PayPal address. Thanks!
