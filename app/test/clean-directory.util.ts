import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);

export async function cleanDirectory(directoryPath: string): Promise<void> {
  try {
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      console.log(`Directory ${directoryPath} does not exist`);
      return;
    }

    // Read all files in the directory
    const files = await readdirAsync(directoryPath);

    // Delete each file
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directoryPath, file);
        try {
          await unlinkAsync(filePath);
          console.log(`Successfully deleted ${filePath}`);
        } catch (error) {
          console.warn(`Failed to delete ${filePath}:`, error.message);
        }
      }),
    );

    console.log(`Successfully cleaned directory ${directoryPath}`);
  } catch (error) {
    console.error(`Error cleaning directory ${directoryPath}:`, error.message);
    throw error;
  }
}
