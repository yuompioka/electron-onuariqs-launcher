function jsonReader(filePath, cb) {
    fs.readFile(filePath, (err, fileData) => {
        if (err) {
            return cb && cb(err)
        }
        try {
            const object = JSON.parse(fileData)
            return cb && cb(null, object)
        } catch(err) {
            return cb && cb(err)
        }
    })
}

function jsonWriter(filepath, object) {
    fs.writeFile(filepath, JSON.stringify(object), (err) => {
        if (err) console.log('Error writing file:', err)
    })
}

function writeConfig(path, data) {
    jsonWriter(path, data)
}