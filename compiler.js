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
			var cheerio = require('cheerio');
			var TLC = require('tlc');
			var templates = {};
			var mediaurl = "";
			var compilerTLC = {
				translate : function(context){
					var templateid = context.args('templateid');
					var data = context.args('data');
					var r = false;
					if(templateid && templates[templateid]){
						var $tag = templates[templateid].clone();
						r = context.tlc.run($tag,data);
						var html = cheerio.html($tag);
						context.focus(html);
						}
					return r;
					},
				imageurl : function(context){
					var url = mediaurl;
					
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
							processor.process(out,{from:f.in,to:f.out}).then(function(result){
								//console.log(result);
								fs.writeFile(f.out, result.css);
								});
							}
						break;
					case "html":
						templates = {}; //reset templates
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