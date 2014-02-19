var Controller = {};

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

Controller.Router = can.Control.extend(
	{},
	{
		items: new can.List(),
		animate: true,
		duration: 0,
		playing: false,
		paused: false,
		timeouts: {},
		dontHide: false,
		currentTime: 0,
		startTime: 0,
		currentHash: '',
		aspect: 0,
		init: function(element, options) {
			element.html('/ejs/layout.ejs', {});
			can.route.ready();
		},
		resetContainer: function() {
			this.element.find('.container').replaceWith('<div class="container"></div>');
			this.element.removeClass('play');
			this.playing = false;
			this.element.css('cursor', 'auto');
			clearInterval(this.timeouts.playTime||null);
			
		},
		'route': function() {
			this.animate = true;
			this.resetContainer();
			can.route.attr({route: 'browse'}, true);
			//for future use, we don't have any settings at the moment
			//this.element.find('.container').html('/ejs/index.ejs', {});
		},
		'browse route': function() {
			this.animate = true;
			var self = this;
			this.resetContainer();
			if(!can.route.attr('path')) {
				can.route.attr('path','')
			}
			$.get('/browse/?path='+(can.route.attr('path').replace(/\&/g,'%26').replace(/\+/g,'%2B')||'/')).then(function(response) {
				self.items = new can.List(response);
				self.element.find('.container').html('/ejs/browse.ejs', {items: self.items, up: can.route.attr('path').substr(0, can.route.attr('path').lastIndexOf('/'))});
			});
			if(this.currentHash) {
				$.get('/pause/'+this.currentHash);
			}
		},
		'.block.directory click': function(element, event) {
			event.preventDefault();
			event.stopPropagation();
			can.route.attr({route: 'browse', path: element.data('path')});
		},
		'.block.video click': function(element, event) {
			event.preventDefault();
			event.stopPropagation();
			var found = '';
			this.items.each(function(item) {
				if(item.attr('type') === 'subtitle') {

					if(element.data('path').substr(0,element.data('path').lastIndexOf('.')) === item.fullPath.substr(0,item.fullPath.lastIndexOf('.'))) {
						found = item.fullPath;

					}
				}
			});
			if(found !== '' && confirm('Subtitle found, do you wish to use it?')) {
				can.route.attr({route: 'play', path: element.data('path'), subtitle: found});
			} else {
				can.route.attr({route: 'play', path: element.data('path')});
			}
			return false;
		},
		'mousemove': function(element, event) {
			var self = this;
			if(this.playing) {
				clearTimeout(this.timeouts.info||null);
				var info = self.element.find('.info');
				self.element.css('cursor', 'auto');
				info.css('display','block');
				setTimeout(
					function() {
						if(!self.dontHide) {
							info.css('display','none');
							self.element.css('cursor', 'none');
						}
					},
					5000
				);
			}
		},
		'.info mouseenter': function() {
			this.dontHide = true;
		},
		'.info mouseleave': function() {
			this.dontHide = false;
		},
		'.info .progress click': function(element, event) {
			var posX = element.offset().left;
			var width = element.width();
			var pct = ((event.pageX - posX)/width);
			var start = Math.floor(this.duration*pct);
			this.play(can.route.attr('path'), can.route.attr('subtitle')||'', start);

		},
		'.fa-pause click': function(element, event) {
			var self = this;
			self.element.find('.container video')[0].pause();
			self.paused = true;
			self.element.find('.fa-play').show();
			$.get('/pause/'+self.currentHash);
			element.hide();
		},
		'.fa-play click': function(element, event) {
			var self = this;
			self.paused = false;
			self.element.find('.fa-pause').show();
			this.play(can.route.attr('path'), can.route.attr('subtitle')||'', self.currentTime);
		},
		'play route': function() {
			this.play(can.route.attr('path'), can.route.attr('subtitle')||'', can.route.attr('start')||0);
		},
		play: function(path, subtitle,start) {
			this.animate = false;
			var self = this;
			this.resetContainer();
			this.playing = true;
			this.element.addClass('play');
			self.element.find('.container').html('/ejs/loading.ejs', {}); 
			$.get('/play/?path='+encodeURIComponent(path)+'&subtitle='+encodeURIComponent(subtitle)+'&start='+(start), function(data) {
				self.currentHash = data.hash;
				self.element.find('.container').html('/ejs/play.ejs', {path: '/play/'+data.hash, name: data.name, duration: data.duration }); 
				self.duration = data.duration;
				self.element.find('.fa-play').hide();
				var vid = self.element.find('.container video')[0];
				vid.play();

				self.startTime = parseInt(data.start);

				vid.addEventListener('timeupdate', function(event) {
					self.currentTime = Math.floor(self.startTime + parseInt(vid.currentTime));
					self.element.find('.currentTime').html((''+self.currentTime).toHHMMSS()+'/'+(''+self.duration).toHHMMSS());
					self.element.find('.current').css('width',((self.currentTime/data.duration)*100)+'%');
					self.element.find('video').width(window.innerWidth);
					if(self.element.find('video').height() > window.innerHeight) {
						self.element.find('video').width('auto');
						self.element.find('video').height(window.innerHeight);
					}
				}, false);
				vid.addEventListener('ended', function(event) {
					$.get('/pause/'+self.currentHash);
					can.route.attr({route: 'browse', path: can.route.attr('path').substr(0, can.route.attr('path').lastIndexOf('/'))}, true);
				});
				
						
					
			});
		},
		'.block.browse click': function() {
			can.route.attr({'route': 'browse'},true);
		}

	}
);



$(document).ready(function() {
	new Controller.Router($('body'));
});
