/* Magic Mirror
 * Module: MMM-Booru
 *
 * Based on MMM-XKCD by jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const axios = require('axios');
const booru = require('booru');
const { shell } = require("electron");

function is_string(s) {
    return typeof(s) === 'string' || s instanceof String;
}

function set_searches(config, src_obj, extra_tags, parent_default_obj) {
    // Normalize and transform into search object even if it's not a
    // real search (no tags) so recursive calls inherit the properties.
    if (is_string(src_obj)) {
        src_obj = {find: [{tags: [src_obj]}]};
    } else if (Array.isArray(src_obj)) {
        src_obj = {find: [{tags: src_obj}]};
    }
    if ('tag' in src_obj && !('tags' in src_obj)) {
        src_obj.tags = [src_obj.tag];
    }
    var search = {...parent_default_obj};
    const props = [
        "site",
        "weight",
    ];
    for (const prop of props) {
        if (prop in src_obj) {
            search[prop] = src_obj[prop];
        }
    }

    var extra_tags_for_this = [...extra_tags];
    if ('extraTags' in src_obj) {
        extra_tags_for_this.push(...src_obj.extraTags);
    }

    // If it has tags, then it's a real search, so we keep it
    if ('tags' in src_obj) {
        search.tags = [...src_obj.tags, ...extra_tags_for_this];
        if (!('site' in search)) {
            throw new Error(`Search with tags ${search.tags} is missing site`);
        }
        config.searches.push(search);
    }

    // Recursive call on find children
    if ('find' in src_obj) {
        for (const child of src_obj.find) {
            set_searches(config, child, extra_tags_for_this, search);
        }
    }
}

function is_image(url) {
    for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
        if (url.endsWith(ext)) {
            return true;
        }
    }
    return false;
}

function pick_random(array) {
    return array[Math.floor(Math.random() * array.length)]
}

function pick_weighted_random(array) {
    var weights = [array[0].weight];
    var i;
    for (i = 1; i < array.length; i++)
        weights[i] = array[i].weight + weights[i - 1];

    var random = Math.random() * weights[weights.length - 1];
    for (i = 0; i < weights.length; i++)
        if (weights[i] > random)
            break;

    return array[i];
}

async function download(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return {
        type: response.headers['content-type'],
        data: Buffer.from(response.data, 'binary'),
    };
}

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.current_post = null;
    },

    socketNotificationReceived: function(notification, payload) {
        var self = this;
        if (notification === "SET_CONFIG") {
            self.config = payload;
            self.config.searches = [];
            set_searches(self.config, self.config, []);
            if (self.config.debugLog) {
                console.log(self.config.searches);
            }
        } else if (notification === "OPEN_CURRENT_POST") {
            if (self.current_post) {
                shell.openExternal(self.current_post);
            }
            return;
        }

        self.get_next_image();
    },

    try_again: function(what_failed, failure) {
        const self = this;

        var timeout = this.config.updateInterval;
        if (what_failed) {
            const secs = this.config.retryInterval;
            console.error(`ERROR: ${what_failed} ${failure}`);
            console.error(`Trying again in ${secs} seconds`);
            timeout = secs;
        }
        setTimeout(function() { self.get_next_image(); }, timeout * 1000);
    },

    get_next_image: function() {
        const self = this;

        // Pick a random search
        const search = pick_weighted_random(this.config.searches);
        if (self.config.debugLog) {
            console.log(search);
        }

        // Query to get posts
        booru.search(search.site, search.tags, {limit: 10, random: true}).then(posts => {
           // Filter out posts we can't use
           var filtered_posts = [];
            for (const post of posts) {
                if (!is_image(post.fileUrl)) {
                    continue;
                }
                filtered_posts.push({
                    title: `${search.site} - ${post.id}`,
                    file_url: post.fileUrl,
                    post_url: post.postView,
                    img_src: null,
                });
            }

            // Pick the image from the posts
            if (filtered_posts.length == 0) {
                self.try_again("Getting posts", "No valid posts to pick from");
                return;
            }
            var post = pick_random(filtered_posts);
            if (self.config.postLog) {
                console.log(`Got post ${post.post_url}`);
            }
            self.current_post = post.post_url;

            // To avoid CORS issues download the image, convert it to Base64, and
            // embed it in the page.
            download(post.file_url).then(img => {
                post.img_src = "data:" + img.type + ";base64," + img.data.toString("base64");
                self.try_again();
                self.sendSocketNotification("COMIC", post);
            }).catch(error => {
                self.try_again("Downloading image", error);
            });
        }).catch(error => {
            self.try_again("Getting posts", error);
        });
    },
})
