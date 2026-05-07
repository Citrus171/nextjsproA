import { BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { ImageProcessingService } from "./image-processing.service";

export abstract class FileStorageBase {
  protected readonly uploadsBase = path.resolve(__dirname, "../../uploads");

  protected abstract readonly subdir: string;
  protected abstract readonly invalidIdMessage: string;

  constructor(protected readonly imageProcessing: ImageProcessingService) {}

  async saveFile(id: string, file: Express.Multer.File): Promise<string> {
    const relDir = this.subdir ? `${this.subdir}/${id}` : id;
    const uploadDir = path.resolve(this.uploadsBase, relDir);
    if (!uploadDir.startsWith(this.uploadsBase + path.sep)) {
      throw new BadRequestException(this.invalidIdMessage);
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const processedBuffer = await this.imageProcessing.process(file.buffer);

    const fileName = `${uuidv4()}.jpg`;
    const filePath = path.resolve(uploadDir, fileName);
    if (!filePath.startsWith(this.uploadsBase + path.sep)) {
      throw new BadRequestException("不正なファイルパスです");
    }
    fs.writeFileSync(filePath, processedBuffer);
    return `uploads/${relDir}/${fileName}`;
  }

  deleteFile(url: string): void {
    const filePath = path.resolve(__dirname, "../../", url);
    if (!filePath.startsWith(this.uploadsBase + path.sep)) {
      return;
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
