/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
	publish.conf = {  // trailing slash expected for dirs
		ext:         ".html",
		outDir:      JSDOC.opt.d || SYS.pwd+"../out/jsdoc/",
		templatesDir: JSDOC.opt.t || SYS.pwd+"../templates/jsdoc/",
		symbolsDir:  "symbols/",
		srcDir:      "symbols/src/"
	};
	
	// is source output is suppressed, just display the links to the source file
	if (JSDOC.opt.s && defined(Link) && Link.prototype._makeSrcLink) {
		Link.prototype._makeSrcLink = function(srcFilePath) {
			return "&lt;"+srcFilePath+"&gt;";
		}
	}
	
	// create the folders and subfolders to hold the output
	IO.mkPath((publish.conf.outDir+"symbols/src").split("/"));
		
	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

        //
        // Css
        //
	// create the required templates
	try {
		var cssTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"css.tmpl");
	}
	catch(e) {
		print("Couldn't create the required templates: "+e);
		quit();
	}
	
	var css = "";
        // color1: Section titles, vivisted links
        // color2: types
        // color3: method names, links
	css = cssTemplate.process({ color1: '#145D7B', color2: '#882336', color3: '#0C91C7'});
	IO.saveFile(publish.conf.outDir, 'default.css', css);
	
        //
        // Classes
        //

	// create the required templates
	try {
		var classTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"class.tmpl");
		var contentsTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"contents.tmpl");
	}
	catch(e) {
		print("Couldn't create the required templates: "+e);
		quit();
	}
	
	// some ustility filters
	function hasNoParent($) {return ($.memberOf == "")}
	function isaFile($) {return ($.is("FILE"))}
	function isaClass($) {return $.is("CONSTRUCTOR")}
	function isaPage($) {return ($.isPage)}
	
	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray();
	
	// create the hilited source code files
	var files = JSDOC.opt.srcFiles;
 	for (var i = 0, l = files.length; i < l; i++) {
 		var file = files[i];
 		var srcDir = publish.conf.outDir + "symbols/src/";
		makeSrcFile(file, srcDir);
 	}
 	
 	// get a list of all the classes in the symbolset
 	var classes = symbols.filter(isaClass).sort(makeSortby("alias"));

        // sort classes by namespace
        var namespaces = {};
        for (var i = 0, li = classes.length; i < li; i++) {
            var klass = classes[i];
            var namespace = '';
            var parts = klass.alias.split('.');
            for (var j = 0, lj = parts.length - 1; j < lj ; j++) {
                var charCode = parts[j].charCodeAt(0);
                if (charCode > 64 && charCode < 91) {
                    break;
                }
                if (!namespace) {
                    namespace = parts[j];
                } else {
                    namespace += '_' + parts[j];
                }

            }
            klass.namespace = namespace;
            if (namespaces[klass.namespace]) {
                namespaces[klass.namespace].push(klass);
            } else {
                namespaces[klass.namespace] = [klass];
            }
        }

 	var pages = symbols.filter(isaPage).sort(makeSortby("alias"));
        var classes_pages = { namespaces: namespaces, pages: pages };
	
	// create a class index, displayed in the left-hand column of every class page
	Link.base = "";
 	var contents = contentsTemplate.process(classes_pages); // kept in memory
	IO.saveFile(publish.conf.outDir, "contents"+publish.conf.ext, contents);
	
	// create each of the class pages
	for (var i = 0, l = classes.length; i < l; i++) {
		var symbol = classes[i];
		var output = "";
		output = classTemplate.process(symbol);
		
		IO.saveFile(publish.conf.outDir+"symbols/", symbol.alias+publish.conf.ext, output);
	}
	
	// regenerate the index with different relative links, used in the index pages
//	Link.base = "";
//	publish.classesIndex = classesTemplate.process(classes_pages);

        //
        // Create frame index page
        // 
	try {
		var frameTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"index.tmpl");
	}
	catch(e) {
		print("Couldn't create the required templates: "+e);
		quit();
	}
		
        IO.saveFile(publish.conf.outDir, "index"+publish.conf.ext, frameTemplate.process({}));
	
        //
        // Pages
        //

	// create the required templates
	try {
		var pageTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"page.tmpl");
	}
	catch(e) {
		print("Couldn't create the required templates: "+e);
		quit();
	}
	
	// create each of the pages
	for (var i = 0, l = pages.length; i < l; i++) {
		var page = pages[i];
                page.page = resolveLinks(page.page)
		var output = "";
		output = pageTemplate.process(page);
		
		IO.saveFile(publish.conf.outDir, page.alias+publish.conf.ext, output);
	}
	
        //
	// create the class index page
        //

	try {
		var classesindexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"classindex.tmpl");
	}
	catch(e) { print(e.message); quit(); }
	
	var classesIndex = classesindexTemplate.process(classes);
	IO.saveFile(publish.conf.outDir, "classindex"+publish.conf.ext, classesIndex);
	classesindexTemplate = classesIndex = classes = null;

	//
	// create the file index page
        //

	try {
		var fileindexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"allfiles.tmpl");
	}
	catch(e) { print(e.message); quit(); }
	
	var documentedFiles = symbols.filter(isaFile); // files that have file-level docs
	var allFiles = []; // not all files have file-level docs, but we need to list every one
	
	for (var i = 0; i < files.length; i++) {
		allFiles.push(new JSDOC.Symbol(files[i], [], "FILE", new JSDOC.DocComment("/** */")));
	}
	
	for (var i = 0; i < documentedFiles.length; i++) {
		var offset = files.indexOf(documentedFiles[i].alias);
		allFiles[offset] = documentedFiles[i];
	}
		
	allFiles = allFiles.sort(makeSortby("name"));

	// output the file index page
	var filesIndex = fileindexTemplate.process(allFiles);
	IO.saveFile(publish.conf.outDir, "files"+publish.conf.ext, filesIndex);
	fileindexTemplate = filesIndex = files = null;
}


/** Just the first sentence (up to a full stop). Should not break on dotted variable names. */
function summarize(desc) {
	if (typeof desc != "undefined")
		return desc.match(/([\w\W]+?\.)[^a-z0-9_$]/i)? RegExp.$1 : desc;
}

/** Make a symbol sorter by some attribute. */
function makeSortby(attribute) {
	return function(a, b) {
		if (a[attribute] != undefined && b[attribute] != undefined) {
			a = a[attribute].toLowerCase();
			b = b[attribute].toLowerCase();
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}
	}
}

/** Pull in the contents of an external file at the given path. */
function include(path) {
	var path = publish.conf.templatesDir+path;
	return IO.readFile(path);
}

/** Turn a raw source file into a code-hilited page in the docs. */
function makeSrcFile(path, srcDir, name) {
	if (JSDOC.opt.s) return;
	
	if (!name) {
		name = path.replace(/\.\.?[\\\/]/g, "").replace(/[\\\/]/g, "_");
		name = name.replace(/\:/g, "_");
	}
	
	var src = {path: path, name:name, charset: IO.encoding, hilited: ""};
	
	if (defined(JSDOC.PluginManager)) {
		JSDOC.PluginManager.run("onPublishSrc", src);
	}

	if (src.hilited) {
		IO.saveFile(srcDir, name+publish.conf.ext, src.hilited);
	}
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
	if (!params) return "()";
	var signature = "("
	+
	params.filter(
		function($) {
			return $.name.indexOf(".") == -1; // don't show config params in signature
		}
	).map(
		function($) {
			return $.name;
		}
	).join(", ")
	+
	")";
	return signature;
}

/** Find symbol {@link ...} strings in text and turn into html links */
function resolveLinks(str, from) {
	str = str.replace(/\{@link ([^} ]+) ?\}/gi,
		function(match, symbolName) {
			return new Link().toSymbol(symbolName);
		}
	);
	
	return str;
}


function resolveType(intype) {
    if (intype) {
        var type = intype.replace('<', '&lt;').replace('>', '&gt;');
        return '<span class="light fixedFont">{' + (new Link().toSymbol(type)) + '}</span> ';
    }
    return '';
}
