# JTWC Archiver
This runs with `npx`.

Archives [JTWC](https://www.metoc.navy.mil/jtwc/jtwc.html) products `gif`, `web` (text warnings), and `prog` (prognostic reasonings).

## Usage
```
npx jtwc-archiver
```
In the working directory, this will create a `jtwc_products` folder containing the archived products, along with the latest product. It will also create a `jtwc.rss` file used as a reference on whether or not new products will be downloaded.

If you're developing, you'll most likely generate the products in the same folder as the project files. Don't worry. I do that too. Just run `npm run clean` in case you want a clean workspace.

I'm not responsible for blocks to your IP or User Agent after DDoS attempts to the JTWC. Always use caution, don't request too often.

**You are required to have a SOCKS5 proxy on port 51325.** If you do not have a proxy, set the `USE_PROXY` constant to `false` in `index.js`.

## License
Apache 2.0. Have fun.