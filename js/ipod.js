// HTML5 Audio powered iPod by JD - jamesduncombe.com
$(function() {

	var jd_audio = {

		// Main config for the iPod
		currentTrack : 0,
		totalTracks : 0,
		tracks : [],
		fileFormat : '',
		audio : '',
		raw: {},
		currentAlbum : 0,
		albumDir : '',
		albumArtwork : '',
		startNum : 0,
		autoplay : true,
		grad : parseInt(localStorage.getItem('grad'), 10) || 1,
		canvas : document.querySelector('canvas'),
		ctx : document.querySelector('canvas').getContext('2d'),

		// Main constructor to kick the whole thing off
		init : function() {

			// Draw the canvas - our background gradient
			jd_audio.drawCanvas();

			// Sort out what browser we're in and switch to that format
		    jd_audio.fileFormat = ($.browser.mozilla || $.browser.chrome || $.browser.opera) ? 'ogg' : 'mp3';

		    //  Grab all out tracks... why are you using Ajax for this?
		    //  Well, basically, I can add tracks on the server in a simple structure and it will just
		    //  scale up and add the tracks onto the iPod		    
			$.getJSON('ajax.php', { albums : '1', format : jd_audio.fileFormat }, function(json) {
				jd_audio.raw = json;
				jd_audio.albums();
		    });

			// Attach a click handler to the menu button, run the nav method on click
		    $('#ipod-controls').delegate('#control-menu', 'click', function(e) {
				e.preventDefault();
				jd_audio.nav();
			});
			
			// BETA : MozOrientation controls for iPod
			// Black MacBook & MacBook pro should have accelerometers that allow this to work
			if ($.browser.mozilla && $.browser.version.substr(0,5) === '1.9.2') {
				window.addEventListener('MozOrientation', function(e) {
					var reset = false, n = 0;
					if (e.x.toFixed(2) > 0.15) {
						reset = true;
						if (reset === true && n === 0) {
							$('#control-next').trigger('click');
						}
						n = 1;
					} else if (e.x.toFixed(2) < -0.15) {
						reset = true;
						if (reset === true && n === 0) {
							$('#control-prev').trigger('click');
						}
						n = 1;
					} else if (e.y.toFixed(2) < -0.3) {
						reset = true;
						if (reset === true && n === 0) {
							$('#control-menu').trigger('click');
						}
						n = 1;
					}
					/*else if (e.y.toFixed(2) > 0.2) {
						reset = true;
						if (reset === true && n === 0) {
							console.log(e.y.toFixed(2));
							$('#control-play').trigger('click');
						}
						n = 1;
						//console.log(e.y.toFixed(2));
					}*/
					else {
						reset = false;
					}
				}, true);
			}
		},

		// Nav method
		// Method to handle all the navigation.
		nav : function() {
			// Using hashes here to determine where we are in the player
			if (window.location.hash === '#player') {
				jd_audio.songs();
			} else if (window.location.hash === '#songs') {
				jd_audio.albums();
			}
		},

		// Albums method
		// Method to list all albums and artists
		albums : function() {

			// Update our hash to reflect where we are on the pod
			window.location.hash = 'albums';

			// First concantonate all our albums into a string then append that to our #ipod-screen div
			var album_listing = '';
			$(jd_audio.raw).each(function(i, node) {
				album_listing += '<a class="album-listing" href="#album-listing-'+i+'" data-album-id="'+i+'"><img class="album-artwork" src="'+node.artwork+'" width="40" height="40" /><span class="album-name">'+node.album+'</span><span class="artist-name">'+node.artist+'</span></a>';
			});
		
			// Set screen title and container contents
			$('#ipod-screen-top').children('p').html('Albums');
			$('#container').html(album_listing);

			// Attach a click handler to watch over all album listings delegate()
			// When it runs grab the id of the album that was clicked
			$('#ipod-screen').undelegate().delegate('.album-listing', 'click', function(e) {
				e.preventDefault();
				jd_audio.currentAlbum = $(this).attr('data-album-id');
				jd_audio.songs();
			});

		},

		// Songs method
		// Handles the listing of the songs
		songs : function() {

			// Again, update the hash to show where we are
			window.location.hash = 'songs';
			
			// If there is audio and it's playing (not paused) then pause it
			(jd_audio.audio) && (!jd_audio.audio.paused) && jd_audio.audio.pause();

			// Concantenate all the songs into a string
			var songs = '';
			$(jd_audio.raw[jd_audio.currentAlbum].songs).each(function(i, node) {
				songs += '<a class="song-listing" href="#song-listing" data-song-id="'+i+'">'+node.slice(0, -4).slice(5);
			});

			// Change screen title, setup song list container and finally inject the song list we just setup
			$('#ipod-screen-top > p').html(jd_audio.raw[jd_audio.currentAlbum].album);
			$('#container').html('<div id="song-list"></div>');
			$('#song-list').html(songs);

			// Attach a click handler to watch over all album listings.
			// On click grab the song id we need and setup other vars.
			// Finally run the player method
			$('#ipod-screen').undelegate().delegate('.song-listing', 'click', function(e) {
				e.preventDefault();
				jd_audio.currentTrack = parseFloat($(this).attr('data-song-id'));
				jd_audio.tracks = jd_audio.raw[jd_audio.currentAlbum].songs;
				jd_audio.albumDir = jd_audio.raw[jd_audio.currentAlbum].album_directory;
				jd_audio.albumArtwork = jd_audio.raw[jd_audio.currentAlbum].artwork;

				jd_audio.player();
			});

		},

	    // Player method
	    // Handles everything to do with the actual player
	    player : function() {

			// Setup the hash first
			window.location.hash = 'player';

			// Setup the main container, all the HTML structure
			$('#container').html('<div id="album-artwork"></div>'+
					'<div id="track-info">'+
						'<span id="song-name"></span>'+
						'<span id="artist-name"></span>'+
						'<span id="album-name"></span>'+
						'<span id="track-number"></span>'+
					'</div>'+
					'<div id="progress-info">'+
					'<span id="time-elapsed"></span>'+
					'<div id="progress-bar">'+
						'<div id="progress-indicator"></div>'+
					'</div>'+
					'<span id="time-remaining">&nbsp;</span></div>');
			
			// Update the screen title to reflect what the iPod would say
			$('#ipod-screen-top').children('p').html('Now Playing');

			// Load up the artwork
			$('#album-artwork').html('<img src="'+jd_audio.albumArtwork+'" width="100" height="100" />');

			// Get our main Audio element and add the source for the first song :)
			jd_audio.loadTrack();

			// Main player controls

			// Play / pause controls
			$('#control-play').unbind().click(function(e) {
				e.preventDefault();
				// With the iPod, when you skip a track if you were playing the last song it will autoplay, if not, it won't
				// Here we are trying to do the same thing.
				// If the player is paused play the song and set auto play to true (as with the iPod)
				// Else, pause the song and set autoplay to false
				if (jd_audio.audio.paused) {
					jd_audio.audio.play();
					jd_audio.autoplay = true;
				} else {
					jd_audio.audio.pause();
					jd_audio.autoplay = false;
				}
			});

		    // Previous song control
		    // Unbind
		    // Attach click handler
		    // Set the current time to 0 and reset the progress indicator to 0%
		    $('#control-prev')
				.unbind()
				.click(function(e) {
					e.preventDefault();
					jd_audio.audio.currentTime = '0';
					$('#progress-indicator').css({ width : '0%' });
				})
				// On double click go to previous track as with the iPod
				.dblclick(function(e) {
					e.preventDefault();
					jd_audio.audio.pause();
					(jd_audio.currentTrack !== 0) && jd_audio.audioSwap(0);
				});

		    // Next control
		    $('#control-next').unbind().click(function(e) {
				e.preventDefault();
				// Pause the song otherwise it get's confused if we add the next track
				// It seems to play both tracks at once!
				jd_audio.audio.pause();
				// If it's not the last track swap to the next track
				if (jd_audio.currentTrack+1 !== jd_audio.totalTracks) {
					jd_audio.audioSwap(1);	
				} else {
					// If it's got no more tracks to play in the current album return to the menu - like the iPod
					$('#control-menu').trigger('click');
				}
		    });

		},

		// Method to swap audio tracks		
		audioSwap : function(control) {

			// Check whether this is previous or next track and change the current track number
			jd_audio.currentTrack = (control) ? jd_audio.currentTrack+1 : jd_audio.currentTrack-1;

			// Remove old audio element and replace with the new one
			jd_audio.loadTrack();

			// Reset progress indicator
			$('#progress-indicator').css({ width : '0%' });

	    },

	    // When a new track is played 
	    loadTrack : function() {

			// Set the total tracks
			jd_audio.totalTracks = jd_audio.tracks.length;
			// Create a new Audio object and feed in the song as the source
			jd_audio.audio = new Audio(jd_audio.albumDir+jd_audio.tracks[jd_audio.currentTrack]);
			// Set whether or not we should auto play a track
			jd_audio.audio.autoplay = jd_audio.autoplay;

			// Audio listeners	
			// Firstly unbind from the Audio object - don't know if we need this here
			// Bind to the loadedmetadata event and update our timings using this
			// Bind to timeupdate event and fire off the timeUpdate method
			// Bind to loadeddata event and allow people to seek through the track by clicking on the progress bar
			// Bind to ended event and trigger the next control to skip to the next track  
			$(jd_audio.audio)
				.unbind() // Do we need this?
				.bind('loadedmetadata', jd_audio.timeUpdate)
				.bind('timeupdate', jd_audio.timeUpdate)
				.bind('loadeddata', function() {
					$('#progress-bar').click(function(e) {
						var offset = ($.browser.opera) ? e.offsetX : e.layerX;
						jd_audio.audio.currentTime = ((offset / 170) * jd_audio.audio.duration);
					});
				})
				.bind('ended', function() {
					$('#control-next').trigger('click'); // Once the tune has stopped we want it to automatically skip
				});

			// If the track is set to autoplay and it audio is paused make the track play
			(jd_audio.audio.autoplay && jd_audio.audio.paused) && jd_audio.audio.play();

			// Update our HTML with all the details of the track
			$('#track-number').html(jd_audio.currentTrack+1 +' of '+jd_audio.totalTracks);
			$('#song-name').html(jd_audio.tracks[jd_audio.currentTrack].slice(0, -4).slice(5));
			$('#artist-name').html(jd_audio.raw[jd_audio.currentAlbum].artist);
			$('#album-name').html(jd_audio.raw[jd_audio.currentAlbum].album);	

	    },

	    // Method to handle what happens when the loadedmetadata and timeupdate event fires
	    timeUpdate : function() {
	    	
	    	// Setup vars for our progress bar and track time details
			var left = (jd_audio.audio.duration / 60).toFixed(2),
				done = (jd_audio.audio.currentTime / 60).toFixed(2),
				prog = (done/left)*100,
				complete = prog.toFixed(2),
				timeRemaining = (jd_audio.audio.duration / 60)-(jd_audio.audio.currentTime / 60);

			// Apply the CSS and HTML reflecting the time details
			$('#progress-indicator').css({ width : complete+'%' });
			$('#time-elapsed').html((jd_audio.audio.currentTime / 60).toFixed(2).replace('.', ':'));
			$('#time-remaining').html('-'+timeRemaining.toFixed(2).replace('.', ':'));

			// Increment our gradient by 1, update the gradient held in localStorage and draw the canvas
			// See the canvas method below
			jd_audio.grad = jd_audio.grad + 1;
			localStorage.setItem('grad', jd_audio.grad);
			jd_audio.drawCanvas();

	    },

	    // Drawing the canvas in the background and changing the colours
	    drawCanvas : function() {

			// Setup vars for the canvas
			var ctx = jd_audio.ctx,
				canvas = jd_audio.canvas,
				halfWidth = (canvas.width / 2) / 1.6;

			// Create a radial gradient
			var radialGradient = ctx.createRadialGradient(halfWidth, canvas.height * 1.2, 1, canvas.width, canvas.height, 2000);
			// Add the colour stops
			radialGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
			radialGradient.addColorStop(0.4, 'hsla('+jd_audio.grad+',75%,40%,.9)'); // Here's where we use the gradient increment
			radialGradient.addColorStop(1, 'hsla('+jd_audio.grad+',75%,51%,.9)'); // And again...

			// Set the fillStyle of the gradient and finally draw it onto the canvas
			ctx.fillStyle = radialGradient;
			ctx.fillRect(0,0,canvas.width, canvas.height);

		}
	};

	// Kick the whole thing off :)
	jd_audio.init();

});