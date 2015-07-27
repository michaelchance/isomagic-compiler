/******************************************************************************
 * @module isomagic-compiler
 *
 * tlc:
 *		none added.
 * 
 * middleware:
 *
 * config
 *		
 *
 *
 *****************************************************************************/

(function(){
	var extname = "compiler";
	
	var extension = function(_app, config){
		if(_app.server()){
			var fs = require('fs');
			var http = require('http');
			var cheerio = require('cheerio');
			var TLC = require('tlc');
			var templates = {};
			var mediaUrl = "";
			var compilerTLC = {
				dump : function(context){console.dir(context.focus()); return true;},
				translate : function(context){
					var templateid = context.args('templateid');
					var data = context.args('data');
					// console.log(data);
					var r = false;
					if(templateid && templates[templateid]){
						var $tag = templates[templateid].clone();
						r = context.tlc.run($tag,data, context.options);
						var html = cheerio.html($tag);
						context.focus(html);
						}
					return r;
					},
				imageurl : function(context){
					var url = mediaUrl;
					
					var w = context.args('w');
					var h = context.args('h');
					var b = context.args('b');
					var name = context.args('name');
					if(!w && !h && !b){ url +="-/"; }
					else{
						if(w){ url+='W'+w+'-'; }
						if(h){ url+='H'+h+'-'; }
						if(b){ url+='B'+b+'-'; }
						}
					if(url.charAt(url.length-1) == '-'){ url = url.slice(0,url.length-1); }
					if(url.charAt(url.length-1) != '/'){ url += '/'; }
					url+=name;
					
					context.focus(url);
					return true;
					}
				}
			var tlc = new TLC();			
			tlc.addModule('compiler',compilerTLC);
			
			var postcss = require('postcss');
			var cssnext = require('cssnext');
			var processor = postcss();
			processor.use(cssnext());
			
			
			for(var i in config.instructions){
				var current = config.instructions[i];
				var vars = current.vars
				switch(current.type){
					case "css":
						var prefix = ":root {";
						for(var j in current.vars){prefix += '--'+j+': '+current.vars[j]+'; ';}
						prefix += "}";
						for(var j in current.files){
							var f = current.files[j];
							var contents = fs.readFileSync(f.in, 'utf-8');
							
							var root = postcss.parse(prefix,{from:'isomagic-compiler-'+i});
							var styles = postcss.parse(contents,{from:f.in});
							var out = root.append(styles).toResult().css;
							//css compilation breaks the synchronous rules, but that's ok since it's just css.
							processor.process(out,{from:f.in,to:f.out}).then(function(out){
								return function(result){
									fs.writeFile(out, result.css);
									}
								}(f.out));
							}
						break;
					case "html":
						templates = {}; //reset templates
						mediaUrl = current.mediaUrl;
						for(var j in current.compilerTemplates){
							var contents = fs.readFileSync(current.compilerTemplates[j], 'utf-8');
							var $ = cheerio.load(contents);
							$('[id]').each(function(i,e){
								templates[$(this).attr('id')] = $(this).removeAttr('id');
								});
							}
						for(var j in current.files){
							var f = current.files[j];
							var contents = fs.readFileSync(f.in, 'utf-8');
							var $ = cheerio.load(contents);
							tlc.run($,current.vars,{tlcAttr:current.tlcAttr || 'data-tlc-compile'});
							fs.writeFileSync(f.out, $.html());
							}
						break;
					case "jquery-ui":
						//compile CSS file
						var prefix = ":root {";
						for(var j in current.vars){prefix += '--'+j+': '+current.vars[j]+'; ';}
						prefix += "}";
						var f = current.cssFile;
						var contents = fs.readFileSync(f.in, 'utf-8');

						var root = postcss.parse(prefix,{from:'isomagic-compiler-'+i});
						var styles = postcss.parse(contents,{from:f.in});
						var out = root.append(styles).toResult().css;
						//css compilation breaks the synchronous rules, but that's ok since it's just css.
						processor.process(out,{from:f.in,to:f.out}).then(function(out){
							return function(result){
								fs.writeFile(out, result.css);
								}
							}(f.out));
						
						//fetch icon files from jquery ui themeroller
						for(var i in current.icons){
							var color = current.vars[current.icons[i].attr].substr(1);
							var cb = function(path){
								return function(response){
									var file = fs.createWriteStream(path);
									response.pipe(file);
									}
								}(current.icons[i].out);
							http.get("http://download.jqueryui.com/themeroller/images/ui-icons_"+color+"_256x240.png", cb);
							}
						
						//fetch bg files from jquery ui themeroller
						for(var i in current.bgs){
							var bg = current.bgs[i];
							var texture = current.vars[bg.texture];
							var opacity = current.vars[bg.opacity];
							var color = current.vars[bg.color].substr(1);
							var size = "";
							switch(texture){
								case "flat":
								case "white-lines":
									size = "40x100";
									break;
								case "highlight-soft":
								case "highlight-hard":
								case "inset-soft":
								case "inset-hard":
									size = "1x100";
									break;
								case "glass":
									size = "1x400";
									break;
								case "diagonals-small":
								case "diagonals-medium":
								case "diagonals-thick":
									size = "40x40";
									break;
								case "dots-small":
									size = "2x2";
									break;
								case "dots-medium":
									size = "4x4";
									break;
								case "gloss-wave":
									size = "500x100";
									break;
								case "diamond":
									size = "10x8";
									break;
								case "loop":
									size = "21x21";
									break;
								case "carbon-fiber":
									size = "8x9";
									break;
								case "diagonal-maze":
									size = "10x10";
									break;
								case "diamond-ripple":
									size = "22x22";
									break;
								case "hexagon":
								case "3d-boxes":
									size = "12x10";
									break;
								case "layered-circles":
									size = "13x13";
									break;
								case "glow-ball":
								case "spotlight":
									size = "600x600";
									break;
								case "fine-grain":
									size = "60x60";
									break;
								default:
									size = "40x100";
									texture = "flat";
									break;
								}
							var cb = function(path){
								return function(response){
									var file = fs.createWriteStream(path);
									response.pipe(file);
									}
								}(bg.out);
							http.get("http://download.jqueryui.com/themeroller/images/ui-bg_"+texture+"_"+opacity+"_"+color+"_"+size+".png", cb);
							}
						
						break;
					default:
						console.error('isomagic-compiler: unknown instruction type encountered '+current.type);
						break;
					}
				}
			} //end if(_app.server())
		var r = {
			tlc : {
				},
			middleware : {
				},
			middlewareBuilders : {
				}
			}
		var mwcache = {};
		return r;
		}
		
	
	// Only Node.JS has a process variable that is of [[Class]] process 
	var isNode = false;
	try {isNode = Object.prototype.toString.call(global.process) === '[object process]';} catch(e) {}
	if(isNode){	root = {};}
	else {root = window;}
	
	if(isNode){
		module.exports = extension;
		}
	else {
		window[extname] = extension;
		}
	
	})()