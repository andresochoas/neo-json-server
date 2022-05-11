const http = require("http");
const fs = require('fs');
const {getCliArg} = require("./utils");

const database = getCliArg("--db");
if (!database) {
    console.error("You need to define a database file...");
    return;
}

const db = JSON.parse(fs.readFileSync(database, 'utf8'));
const routes = mapJson(db);

function mapJson(json) {
    if (typeof json === "object" && !Array.isArray(json)) {
        return deep(json);
    } else {
        return "wrong json format...";
    }
}

function deep(json, map = new Map(), parent = "") {
    if (typeof json === "object") {
        if (Array.isArray(json)) {
            map.set(parent, {type: "array", properties: null});
            for (const item of json) {
                deep(item, map, parent + "*.");
            }
        } else {
            const keys = Object.keys(json);
            for (const index in keys) {
                const key = keys[index], value = json[key];
                if (typeof value === "object") {
                    deep(value, map, parent + `${key}.`);
                } else {
                    let format = null;
                    if (map.has(parent)) {
                        const previousFormat = map.get(parent);
                        if (previousFormat.properties.includes(key)) {
                            format = {...previousFormat};
                        } else {
                            format = {...previousFormat, properties: [...previousFormat.properties, key]};
                        }
                    } else {
                        format = {type: "object", properties: [key]}
                    }
                    map.set(parent, format);
                }
            }
        }
    } else {
        map.set(parent, {type: typeof json, properties: null})
    }

    return map;
}

function generateAccessor(url) {
    const split = url.split("/");
    split.shift();

    let accessor = "";
    for (const path of split) {
        if (isNaN(path)) {
            accessor += (path + ".");
        } else {
            accessor += "*.";
        }
    }

    return accessor;
}

function isValidUrl(url) {
    const accessor = generateAccessor(url);

    return routes.has(accessor);
}

function getResponseFromUrl(url) {
    if (isValidUrl(url)) {
        const split = url.split("/");
        split.shift();

        let data = db;
        for (const path of split) {
            if (isNaN(path)) {
                data = data[path];
            } else {
                data = data[parseInt(path)];
            }
        }

        return data;
    } else {
        return null;
    }
}

http.createServer((req, res) => {
    const url = req.url;
    res.setHeader("Content-Type", "application/json");

    if (url === "/") {
        res.write(JSON.stringify(db, null, 2));
    } else {
        const data = getResponseFromUrl(url);
        if (typeof data === "object" && data !== null) {
            res.write(JSON.stringify(data, null, 2));
        } else {
            res.statusCode = 404;
        }
    }

    res.end();
}).listen(3000, () => {
    console.log("Running json-server...");
})
