const axios = require("axios");
const fs = require("fs-jetpack");
const cheerio = require("cheerio");
const path = require("path");
const moment = require("moment");

/**
 * JTWC Product Archiver
 *
 * This is a one-shot script. You're supposed to run it periodically.
 *
 * This creates the following file structure:
 * 
 *   working directory
 *   |
 *   +- jtwc.rss           // Used to check if there was an update
 *   +- jtwc_products      // Where products are saved.
 *      |
 *      +- text            // Text products (*web.txt)
 *      |  |
 *      |  +- 2020-09-29-160000-wp1520web.txt // Example file
 *      |  +- latest-wp1520web.txt            // Latest product file
 *      |  
 *      +- gif             // GIF products (*.gif)
 *         |
 *         +- 2020-09-29-160000-wp1520.gif // Example file
 *         +- latest-wp1520.gif            // Latest product file
 * 
 * Dedicated to the Wikipedia WikiProject Tropical Cyclones.
 * https://en.wikipedia.org/wiki/WP:WPTC
 * 
 * @author Chlod Alejandro
 * @license Apache-2.0
**/
const app = (async () => {
    const JTWC_RSS = "https://www.metoc.navy.mil/jtwc/rss/jtwc.rss";
    const BACKLOG_LENGTH = 15768000000;
    
    const request = await axios(`${JTWC_RSS}?${Date.now()}`);
    const data = request.data
        .replace(/<!\[CDATA\[((?:.|\s)+?)\]\]>/gi, "$1");
    
    const $ = cheerio.load(data);
    
    if (fs.exists("jtwc.rss")) {
        const o$ = cheerio.load(fs.read("jtwc.rss"));
    
        const getItemPair = (c) => {
            const pairs = {};
            c("item title").each((i, title) => {
                pairs[c(title).text()] = c(title).siblings("description").text();
            });
            return pairs;
        }
    
        const checkUpdates = () => {
            const oldPairs = getItemPair(o$);
            const newPairs = getItemPair($);
            let updated = false;
            for (const [title, description] of Object.entries(newPairs)) {
                if (!updated && (oldPairs[title] == null || oldPairs[title] !== description))
                    updated = true;
            };
            return updated;
        };
        
        if (!checkUpdates()) {
            process.exit();
        }
    }
    
    // Updates found. Crawl time.
    
    fs.write("jtwc.rss", data);
    
    fs.dir("jtwc_products");
    
    const saveTime = moment().utc().format("YYYY[-]MM[-]DD[-]HHmm");
    console.log(`Writing for ${saveTime}`);
    
    const textPath = path.join("jtwc_products", "text");
    let textProductRegex = /https:\/\/.+?([^/]+web\.txt)/gi;
    let textProduct = null;
    fs.dir(path.join("jtwc_products", "text"));
    while ((textProduct = textProductRegex.exec(data)) != null) {
        try {
            console.log(`Archiving ${textProduct[0]} to ${textProduct[1]}`);
            const productData = await axios(textProduct[0], {responseType: "arraybuffer"});
            
            const latest = path.join(textPath, `latest-${textProduct[1].replace(/^[.A-Z0-9\-]/g, "_")}`);
            if (fs.exists(latest)) {
                const latestContent = fs.read(latest, "utf8");
                if (latestContent === Buffer.from(productData.data).toString("utf8")) {
                    console.log("Content is identical. Skipping...");
                    continue;
                }
            }
            
            fs.write(
                path.join(textPath, `${saveTime}-${textProduct[1].replace(/^[.A-Z0-9\-]/g, "_")}`), 
                productData.data
            );
            
            fs.write(
                path.join(textPath, `latest-${textProduct[1].replace(/^[.A-Z0-9\-]/g, "_")}`), 
                productData.data
            );
        } catch (e) {
            console.error("Failed to download product.");
        }
    }
    
    const gifPath = path.join("jtwc_products", "gif");
    let gifProductRegex = /https:\/\/.+?([^/]+\.gif)/gi;
    let gifProduct = null;
    fs.dir(path.join("jtwc_products", "gif"));
    while ((gifProduct = gifProductRegex.exec(data)) != null) {
        try {
            console.log(`Archiving ${gifProduct[0]} to ${gifProduct[1]}`);
            const productData = await axios(gifProduct[0], {responseType: "arraybuffer"});
            
            const latest = path.join(gifPath, `latest-${gifProduct[1].replace(/^[.A-Z0-9\-]/g, "_")}`);
            if (fs.exists(latest)) {
                const latestContent = fs.read(latest, "utf8");
                if (latestContent === Buffer.from(productData.data).toString("utf8")) {
                    console.log("Content is identical. Skipping...");
                    continue;
                }
            }
            
            fs.write(
                path.join(gifPath, `${saveTime}-${gifProduct[1].replace(/^[.A-Z0-9\-]/g, "_")}`), 
                productData.data
            );
            
            fs.write(
                path.join(gifPath, `latest-${gifProduct[1].replace(/^[.A-Z0-9\-]/g, "_")}`), 
                productData.data
            );
        } catch (e) {
            console.error("Failed to download product.");
        }
    }
    
    // Purge files older than 6 months
    const purgeDirectory = (givenPath) => {
        const contents = fs.inspectTree(givenPath, {times: true, relativePath: true});
        
        for (const fsobj of contents.children) {
            if (fsobj.type === "dir")
                purgeDirectory(path.join(givenPath, fsobj.name));
            else {
                const age = Date.now() - (new Date(fsobj.modifyTime)).getTime()
                if (age > BACKLOG_LENGTH) {
                    console.log(`Deleting ${fsobj.name} (${moment(fsobj.modifyTime).fromNow()} old)...`);
                    fs.remove(path.join(givenPath, fsobj.name));
                }
            }
        }
    };
    purgeDirectory("jtwc_products");
    
    console.log("Archiving success.");
});

app().catch(e => {console.error("Failed to archive."); console.error(e); });