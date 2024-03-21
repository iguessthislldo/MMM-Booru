# MMM-Booru

<p style="text-align: center">
    <a href="https://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

MMM-Booru is a [MagicMirror](https://github.com/MichMich/MagicMirror) module for showing images from various ["booru"](https://en.wiktionary.org/wiki/booru) imageboard sites using specified tags.
MMM-Booru used [jupadin/MMM-XKCD](https://github.com/jupadin/MMM-XKCD) as a starting point.

This is an example of what MMM-Booru looks like:

![Miku using a mirror](example.png)

(Art is by [Pixiv user saihate](https://www.pixiv.net/en/artworks/101458659), posted to [Danbooru](https://danbooru.donmai.us/posts/5697130))

Features:
- MMM-Booru uses the [booru NPM module](https://www.npmjs.com/package/booru) and supports [all the sites it does](https://github.com/AtoraSuunva/booru/blob/HEAD/src/sites.json).
- Define multiple searches for different sites with various chances of being used. See [`find`](#find) for more info.
- If MagicMirror is being used on a device with a mouse or touchscreen, then clicking on the image will bring up the post in the default browser.
  [MMM-Cursor](https://github.com/uxigene/MMM-Cursor) can be used to make the cursor temporarily visible.

## Installation

Open a terminal session, navigate to your MagicMirror's `modules` folder and execute `git clone https://github.com/iguessthislldo/MMM-Booru`.

Enable the module by adding it to the `config/config.js` file of the MagicMirror as shown [below](#using-the-module).

The [table](#configuration-options) below that lists all possible configuration options.

You also have to install all dependencies inside the module directory by calling
```
npm install --only=prod
```

## Using the module

```javascript
    modules: [
        {
            module: "MMM-Booru",
            position: "top_right",
            config: {
                find: [
                    {
                        site: "danbooru.donmai.us",
                        extraTags: ["rating:general"],
                        find: [
                            ["hatsune_miku", "score:>=20"],
                        ],
                    },
                ],
            }
        }
    ]
```

### Tips

- Try to understand how [`find`](#find) works. It's probably over-engineered, but it should make it easy to add to and modify searches.
- Look at the site's help page for tags. `score` and `rating` filters might be useful if the site supports them.
- Make the actual searches to get an example of what the booru has.
  - Personally when working on my searches so far I try to make sure there's at least 5+ pages of results, or ideally 10+.
    This is to make sure there's a nice healthy selection that's not too repetitive.
    If the number of results is small or in the long run seems repetitive, then the search could be broadened or the `weight` could be made smaller.
    The `weight` should be able to be made less than 1 if desired.
  - A `score:>=X` search term (if the booru supports it) may be too high and give a small number or no posts. On the other hand, one that's too low may give weird/unwanted posts.
- This probably doesn't need to be said, but because of the nature of these sites, this module can easily show explicit images.
  If you want that, then you do you. If you don't, then all the more reason to make sure you know how the rating tags on the site you're using works.

## Configuration options

The following configuration options can be set and/or changed:

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `updateInterval` | integer | `10 * 60` (10 minutes) | Get a new image after this many seconds |
| `retryInterval` | integer | `10` | Try again this many seconds after something fails |
| `limitWidth` | integer | `400` | Limit the maximum display width of the image (0 implies to use the maximal width of the image) |
| `limitHeight` | integer | `0` | Limit the maximum display height of the image (0 implies to use the maximal height of the image) |
| `showTitle` | `Boolean` | `true` | Display the site and post id in the header |
| `postLog` | `Boolean` | `false` | Log the URL of the post |
| `debugLog` | `Boolean` | `false` | Log debug info such as the actual searches that are going to be done |
| `site` | `String` | not defined | The [site](https://github.com/AtoraSuunva/booru/blob/HEAD/src/sites.json) to use for searches (Can also be used in [`find` objects](#find-object-members)) |
| `weight` | floating point | `1` | The probability weight searches, should be positive (Can also be used in [`find` objects](#find-object-members)) |
| `extraTags` | `Array` of `String` | `[]` | Extra tags to add to all searches (Can also be used in [`find` objects](#find-object-members)) |
| `tags` | `Array` of `String` | not defined | Define a search (Meant to be used in [`find` objects](#find-object-members)) |
| `find` | `Array` | See [Using the module](#using-the-module) | Top-level `find`, See [`find`](#find) for details. |

### `find`

`find` contains the tags for all the searches that have a chance of occurring each time the image is refreshed.
You could not set `find` and only set a top-level `tags`, but that sets up only a single search.
After the search is picked and made, a random valid post with an image is chosen from the results and shown.
If there are no valid posts or something fails, then it waits for a short time (`retryInterval`) and tries another random search.

#### Examples

In the simplest cases, you can use a string for a single search with a single tag or an array of strings for a single search with multiple tags:

```javascript
{
  site: "danbooru.donmai.us",
  extraTags: ["rating:general"],
  find: [
    "tamamo_no_mae_(fate/extra)",
    ["hatsune_miku", "pink_hair"],
  ],
}
```

This will result in:

- A 1 in 2 chance to pick an image from `tamamo_no_mae_(fate/extra) rating:general order:random`
- A 1 in 2 chance to pick an image from `hatsune_miku pink_hair rating:general order:random`

More complicated searches are possible by using objects in `find`.
For example, let's say we want Miku with pink hair to show up twice as often compared to Miku with blue hair.
This can be accomplished with `weight` values:

```javascript
{
  site: "danbooru.donmai.us",
  extraTags: ["rating:general"],
  find: [
    "tamamo_no_mae_(fate/extra)",
    {
      extraTags: ["hatsune_miku"],
      find: [
        "blue_hair",
        {tags: ["pink_hair"], weight: 2},
      ],
    },
  ],
}
```

This will result in:

- A 1 in 4 chance to pick an image from `tamamo_no_mae_(fate/extra) rating:general order:random`
- A 1 in 4 chance to pick an image from `blue_hair rating:general hatsune_miku order:random`
- A 2 in 4 chance to pick an image from `pink_hair rating:general hatsune_miku order:random`

So in addition to strings and arrays of strings, the `find` array also takes these objects that can be used to pass more options, including nested `find` arrays.
These objects only become potential searches when there's a `tags` member though.
That's why the object with `extraTags: ["hatsune_miku"]` doesn't result in a search.

This can also be used to define searches for more than one site:

```javascript
{
  find: [
    {
      site: "danbooru.donmai.us",
      extraTags: ["rating:general"],
      find: [
        "sans"
        "hatsune_miku",
      ]
    },
    {
      site: "e926.net",
      find: [
        "sans_(undertale)",
        "hatsune_miku",
      ],
    },
  ],
}
```

This will result in:

- A 1 in 4 chance to pick an image from `sans rating:general order:random` on Danbooru
- A 1 in 4 chance to pick an image from `hatsune_miku rating:general order:random` on Danbooru
- A 1 in 4 chance to pick an image from `sans_(undertale) order:random` on e926
- A 1 in 4 chance to pick an image from `hatsune_miku order:random` on e926

#### `find` object members

The members of the objects in `find` are shared with the [top-level `config` object](configuration-options) and have the following additional behavior inside `find`:

| Option | Behavior |
| ---- | ---- |
| `site` | Overrides for all searches within the object |
| `weight` | Overrides for all searches within the object |
| `extraTags` | Appends to all searches within the object |
| `tags` | Turns the object into a search |
| `find` | Define additional objects based on this one |
