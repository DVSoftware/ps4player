var fs = require('fs');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var child = require('child_process');
var config = require('./config.js');
var net = require('net');
var crypto = require('crypto');
var path = require('path');

var pids = {};

function bufferToString(buffer) {
	var charsetDetector = require("node-icu-charset-detector");
	var charset = charsetDetector.detectCharset(buffer).toString();

	var iconv = require("iconv-lite");

	var str = iconv.decode(buffer, charset);
	return str;
}
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
app.configure(function(){
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express['static'](__dirname + '/frontend'));
	app.use(express.cookieParser('ps4player'));
	app.use(express.cookieSession());
});
if(!fs.existsSync('/tmp/ps4player')) {
	fs.mkdir('/tmp/ps4player',function(e){
		if(e) {
			throw('Could not create the temporary folder')
		}
	}); 
}
server.listen(config.application.port);

app.get('/browse/', function(req, res) {
	var filepath = '/';
	if(req.query.path) {
		filepath = req.query.path;
	}
	console.log(filepath);
	fs.readdir(filepath, function(err, files) {
		if(err) {
			res.send(500, err);
		}
		var response = [];
		files.forEach(function(item) {
			var stat = fs.statSync(filepath + '/' + item);
			var type = stat.isDirectory()?'directory':'file';
			if(type === 'file') {
				if(['avi','mpeg','mpg','mp4','mkv','m4v','divx','mov','ogv','webm'].indexOf(path.extname(item).split('.')[1]) > -1) {
					type = 'video';
				} else if(['srt','ass'].indexOf(path.extname(item).split('.')[1]) > -1) {
					type = 'subtitle';
				}
			}
			response.push(
				{
					name: item,
					type: type,
					fullPath: filepath + '/' + item
				}
			);
		});
		res.send(response);
	});
});
app.get('/play/', function(req, res) {
	if(req.query.path) {
		filepath = req.query.path;
	} else {
		res.send(404);
	}
	var md5sum = crypto.createHash('md5');
	var hash = md5sum.update(filepath).digest("hex");

	if(!fs.existsSync('/tmp/ps4player/'+hash)) {
		fs.mkdirSync('/tmp/ps4player/'+hash);
	} else {
		if(fs.existsSync('/tmp/ps4player/' + hash + '/playlist.m3u8')) {
			fs.unlinkSync('/tmp/ps4player/' + hash + '/playlist.m3u8');
		}
	}
	var subtitlesStr = '';

	var start = 0;
	if(req.query.start) {
		start = req.query.start;
	}
	if(req.query.subtitle) {
		fs.writeFileSync('/tmp/ps4player/'+hash+'/subtitle.srt', bufferToString(fs.readFileSync(req.query.subtitle)));

		subtitlesStr = '-vf subtitles=filename=/tmp/ps4player/'+hash+'/subtitle.srt,setpts=PTS-'+start+'/TB -af asetpts=PTS-'+start+'/TB ';
	}
	var cmd = 'ffmpeg';
	var options = null;
	var args = (subtitlesStr + "-c:v libx264 -preset fast -crf 22 -c:a libfaac -b:a 192k -copyts -c:s mov_text -flags -global_header -map 0 -f segment -segment_time 5 -segment_list /tmp/ps4player/" + hash + "/playlist.m3u8 -segment_format mpegts /tmp/ps4player/" + hash + "/stream%05d.ts").split(' ');
	
	args.unshift(filepath);
	args.unshift("-i");
	//args.unshift("-re");
	args.unshift(''+start.toHHMMSS());
	args.unshift("-ss");
	console.log(args);
	var duration = 0;
	var startTime = 0;
	var tookStartTime = false;
	if(pids[req.sessionID]) {
		child.exec('kill -9 '+pids[req.sessionID]);
	}
	var proc = child.spawn(cmd, args, options);
	pids[req.sessionID] = proc.pid;

	proc.stderr.on('data', function(data) {
		console.log(data.toString());
		var matches = /\s+Duration: ((\d\d):(\d\d):(\d\d)\.(\d+))/.exec(data);
		if(matches) {
			console.log(matches);
			duration = parseInt(matches[4]) + parseInt(matches[3])*60 + parseInt(matches[2])*3600;
		}
	});
	var interval = setInterval(function() {
		if(fs.existsSync('/tmp/ps4player/' + hash + '/playlist.m3u8')) {
			fs.stat('/tmp/ps4player/' + hash + '/playlist.m3u8', function(err, stats) {
				if(stats.size > 0) {
					res.send({
						duration: duration,
						hash: hash,
						name: path.basename(filepath, path.extname(filepath)),
						start: start
					});
					clearInterval(interval);
				}
			});
		}
	}, 4000);
});
app.get('/pause/:hash', function(req, res) {
	if(pids[req.sessionID]) {
		child.exec('kill -9 '+pids[req.sessionID]);
	}
	child.exec('rm -rf /tmp/ps4player/' + req.params.hash + '/');
	res.send(200);
});
app.get('/play/:hash', function(req, res) {
	res.contentType('application/x-mpegurl');
	res.send(fs.readFileSync('/tmp/ps4player/' + req.params.hash + '/playlist.m3u8', 'utf8').replace(/\/tmp\/ps4player\//g, ''));
});
app.get('/play/:hash/:stream', function(req, res) {
	res.contentType('application/x-mpegurl');
	res.sendfile('/tmp/ps4player/' + req.params.hash + '/' + req.params.stream);
});