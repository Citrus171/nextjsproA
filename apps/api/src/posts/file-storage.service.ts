import { BadRequestException, Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { ImageProcessingService } from "./image-processing.service";

@Injectable()
export class FileStorageService {
  private readonly uploadsBase = path.resolve(__dirname, "../../uploads");

  constructor(private imageProcessing: ImageProcessingService) {}

  async saveFile(postId: string, file: Express.Multer.File): Promise<string> {
    const uploadDir = path.resolve(this.uploadsBase, postId);
    if (!uploadDir.startsWith(this.uploadsBase + path.sep)) {
      throw new BadRequestException("不正なpostIdです");
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
    return `uploads/${postId}/${fileName}`;
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
