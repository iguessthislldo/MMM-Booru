/* Magic Mirror
 * Module: MMM-Booru
 *
 * Based on MMM-XKCD by jupadin
 * MIT Licensed.
 */

Module.register('MMM-Booru', {
    // Default module config.
    defaults: {
        header: "Booru",
        updateInterval: 10 * 60,
        grayScale: false,
        invertColors: false,
        limitWidth: 400,
        limitHeight: 0,
        showTitle: true,
        postLog: false,
        debugLog: false,

        weight: 1,
        find: [
            {
                site: "danbooru.donmai.us",
                find: [
                    ["hatsune_miku"],
                ],
            },
        ],
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        this.dailyComic = "";
        this.dailyComicTitle = "";
        this.animationSpeed = 2000;
        this.scrollProgress = 0;
        this.loaded = false;
        this.config.postLog = this.config.postLog || this.config.debugLog;

        this.sendSocketNotification("SET_CONFIG", this.config);
    },

    // Define required styles.
    getStyles: function() {
        return ["MMM-Booru.css"];
    },

    // Define required scripts.
    getScripts: function() {
        return ["moment.js"];
    },

    // Define header.
    getHeader: function() {
        if (this.config.showTitle && !this.dailyComicTitle == "") {
            return this.dailyComicTitle;
        } else {
            return this.config.header;
        }
    },

    // Override dom geneartor.
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.id = "wrapper";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        var comicWrapper = document.createElement("div");
        comicWrapper.id = "comicWrapper";

        console.log(this.dailyComic)
        var comic = document.createElement("img");
        comic.id = "comic"
        comic.src = this.dailyComic;

        var helper = this;
        comic.onclick = function() {
            helper.sendSocketNotification("OPEN_CURRENT_POST");
        };

        if (this.config.grayScale || this.config.invertColors) {
            comic.setAttribute("style", "-webkit-filter: " +
                (this.config.grayScale ? "grayscale(100%) " : "") +
                (this.config.invertColors ? "invert(100%) " : "") +
                ";");
        }

        comic.config = this.config;

        // Limit width or height of comic on load
        comic.onload = function() {
            const width = this.width;
            if (this.config.limitHeight > 0) {
                comic.style.height = this.config.limitHeight + "px";
                comic.style.width = "auto";
            } else if (this.config.limitWidth > 0 && width > this.config.limitWidth) {
                comic.style.width = this.config.limitWidth + "px";
                comic.style.height = "auto";
            }
        };

        comicWrapper.appendChild(comic);
        wrapper.appendChild(comicWrapper);

        return wrapper;
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification === "COMIC") {
            this.loaded = true;
            this.dailyComic = payload.img_src;
            this.dailyComicTitle = payload.title;
            this.updateDom(this.animationSpeed);
        }
    }
});
