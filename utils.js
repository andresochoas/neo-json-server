module.exports = {
    getCliArg: (name) => {
        for (const arg of process.argv) {
            if (arg === name) {
                return process.argv.at(process.argv.indexOf(arg) + 1);
            }
        }
    }
}
