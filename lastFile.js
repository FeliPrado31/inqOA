const fs = require("fs").promises;
const path = require("path");

async function getLastModifiedFile(dir) {
  const files = await fs.readdir(dir);
  const fileStats = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(dir, file);
      const stats = await fs.lstat(filePath);
      return { file: filePath, mtime: stats.mtime };
    })
  );

  const sortedFiles = fileStats.sort((a, b) => b.mtime - a.mtime);
  return sortedFiles[0].file;
}
module.exports = {
  getLastModifiedFile,
};
