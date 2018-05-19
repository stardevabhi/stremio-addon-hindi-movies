const puppeteer = require('puppeteer');
const Stremio = require('stremio-addons');
 

let result;
let href_result;
let imdb_result;
let item_array = [];
let href_item_array = [];
let imdb_item_array = [];
let imdb_ids = [];

const filters = ['New Hindi Movies', 'Bollywood Full Movies', 'Latest Hindi Full Movie', 'Hindi Comedy Movies - 2', 'full movie in hd', 'Deleted video', 'Private video', 'hindi Comedy Movies', 'best hindi Comedy Movie', 'Full Movies', 'Full Movie', 'hindi Comedy Movie', 'full hindi Comedy Movie', 'Latest bollywood Movies', 'With Eng Subtitles', 'with Eng Subs', 'English Subtitles', 'Eng Subs', 'Hindi Movies', 'hindi movie', 'Comedy Film', 'Superhit', 'ft.', 'Movies' , 'Hindi DvdRip', 'Movie', 'HD', 'bollywood', 'blockbuster', ' -', '- ', ' - '];



let scrape = async () => {


	 

	const browser = await puppeteer.launch({headless: true,
	//slowMo: 2000
	 });  
	const page = await browser.newPage();

	const playlists = ['PLSVSKj5sfgxNgi22VtH3CnIibr3-BVsvC' ]

	for(let i=0; i<playlists.length;i++) {

	await page.goto('https://www.youtube.com/playlist?list=' + playlists[i], {waitUntil: 'load'});
	await page.waitFor(1000);

 	//scrape
 	console.log('Preparing data to load, please wait...' + "\n");
	 
	result = await page.evaluate(() => {

			
			let title_array = document.querySelectorAll('ytd-section-list-renderer#primary #contents .ytd-playlist-video-list-renderer #video-title');
			let titles = [];

			title_array.forEach(function(item, index) {
				titles.push(item.innerText);
			});
			
			return titles

		}); //evaluate

	 href_result = await page.evaluate(() => {

			//window.alert('s');
			let href_array = document.querySelectorAll('ytd-section-list-renderer#primary #contents .ytd-playlist-video-list-renderer #content > a');
			let hrefs = [];
			
			href_array.forEach(function(item, index) {
					const href_value =  item.getAttribute('href');
					const splitted_href_value = href_value.split('v=');
					const splitted_2_href_value_array = splitted_href_value[1].split('&');
					const video_id = splitted_2_href_value_array[0];
					hrefs.push(video_id);
			});
			
			return hrefs

		}); //evaluate


	//now search google for imdb titles
	
	for(let i = 0; i < result.length; i++ ) {

		 
	    await page.goto('https://google.com/' , {waitUntil: 'load'});
		 
		//hardcode these patterns
		result[i] = result[i].replace(/\(|\)/g, '');
		result[i] = result[i].replace(/\[|\]/g, '');
		result[i] = result[i].replace(/\|/g, '');
		result[i] = result[i].replace(/\{|\}/g, '');
		
		


		 filters.forEach((item, index)=> {

		 	var regex = item;
		 	var re = new RegExp(regex, "gi");

		 	if( result[i].toLowerCase().indexOf( item.toLowerCase() ) != -1 ) {
		 		//if filter word exists in title
		 		result[i] = result[i].replace(re, '');

		 	}

		 });//forEach

		 if( result[i].trim().length > 0) {

		 result[i] = result[i].replace(/ +/g, ' ');
		 console.log('Retrieving ' + result[i]);

		 await page.type('input[name="q"]',  'imdb ' + result[i] );
		 await page.waitFor(500);
		 await page.keyboard.press('Enter');
		 await page.waitForSelector('.g h3.r a');

		 imdb_result = await page.evaluate(() => {

	 	 const imdb_title = document.querySelectorAll('#rso > div > div > div > div > div > h3 > a');
		 let imdb_id;
		 	 


		 		for(let i=0; i< imdb_title.length; i++) {
		 			const item1 = imdb_title[i];
		 		if(imdb_title[i].toString().indexOf('imdb.com/title/') != -1) {
		 			const imdb_title_splitted = item1.toString().split('/');
		 			imdb_id = imdb_title_splitted[4];
		 			break;
		 		}



		 	}; //foreach

		 	return imdb_id;

		 });//evaluate

		} else {
			imdb_result = '';

		}


		 imdb_ids.push(imdb_result);

	 } //for

	item_array = item_array.concat(result);
	href_item_array = href_item_array.concat(href_result);
	imdb_item_array = imdb_item_array.concat(imdb_ids);
 
	 } //for


	await browser.close();


	return  { item_array, href_item_array, imdb_item_array };

}; //scrape

scrape().then((value) => {

	let json_str = '{';

	value.item_array.forEach(function(item, index) {

	if( value.item_array[index] != "" ) {
		//create json
		
		
		json_str+= '"' + value.imdb_item_array[index] + '" : { "yt_id" : "' + value.href_item_array[index] + '" },';

	}//if

	});//value.item_array


json_str = json_str.substr(0, (json_str.length -1) );

json_str+="}";


stremioFn(json_str);

});//scrape.then


let stremioFn = async (json_str) => {

process.env.STREMIO_LOGGING = true;  


var manifest = { 
    "id": "org.stremio.megahindimovies",
    "version": "1.0.0",

    "name": "Hindi Movies",
    "description": "Addon for hindi movies",
    "icon": "https://raw.githubusercontent.com/stardevabhi/stremio-addon-hindi-movies/master/icons/hindi-movies.png", 
    "logo": "https://raw.githubusercontent.com/stardevabhi/stremio-addon-hindi-movies/master/icons/hindi-movies.png", 
    "background": "https://raw.githubusercontent.com/stardevabhi/stremio-addon-hindi-movies/master/icons/hindi-movies-1920x1080.png",

    // Properties that determine when Stremio picks this add-on
    "types": ["movie"], // your add-on will be preferred for those content types
    "idProperty": "imdb_id", // the property to use as an ID for your add-on; your add-on will be preferred for items with that property; can be an array
    // We need this for pre-4.0 Stremio, it's the obsolete equivalent of types/idProperty
    "filter": { "query.imdb_id": { "$exists": true }, "query.type": { "$in":["movie"] } }
};

var js_string = json_str;

var dataset =  JSON.parse(js_string);
console.log('Data loaded successfully!' + "\n");
 
var methods = { };
var addon = new Stremio.Server(methods, manifest);

if (module.parent) {
    module.exports = addon
} else {
    var server = require("http").createServer(function (req, res) {
        addon.middleware(req, res, function() { res.end() }); // wire the middleware - also compatible with connect / express
    }).on("listening", function()
    {
        console.log("Hindi Movies Addon listening on "+server.address().port);
    }).listen(process.env.PORT || 7100);
}


// Streaming
methods["stream.find"] = function(args, callback) {
    if (! args.query) return callback();

    //callback(null, [dataset[args.query.imdb_id]]); // Works only for movies
    
    var key = [args.query.imdb_id, args.query.season, args.query.episode].filter(function(x) { return x }).join(" ");
    callback(null, [dataset[key]]);
};

// Add sorts to manifest, which will add our own tab in sorts
manifest.sorts = [{prop: "popularities.megahindimovies", name: "Hindi Movies",types:["movie"]}];

// To provide meta for our movies, we'll just proxy the official cinemeta add-on
var client = new Stremio.Client();
client.add("http://cinemeta.strem.io/stremioget/stremio/v1");


methods["meta.find"] = function(args, callback) {
    var ourImdbIds = Object.keys(dataset).map(function(x) { return x.split(" ")[0] });
    args.query = args.query || { };
    args.query.imdb_id = args.query.imdb_id || { $in: ourImdbIds };
    client.meta.find(args, function(err, res) {
    if (err) console.error(err);
        callback(err, res ? res.map(function(r) { 
            r.popularities = { megahindimovies: 10000 }; // we sort by popularities.megahindimovies, so we should have a value
            return r;
        }) : null);
    });
}

}