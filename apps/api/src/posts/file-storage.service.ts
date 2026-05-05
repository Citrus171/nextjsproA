import { BadRequestException, Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { ImageProcessingService } from "./image-processing.service";

const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const SAFE_URL_RE = /^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.jpg$/;

@Injectable()
export class FileStorageService {
  constructor(private imageProcessing: ImageProcessingService) {}

  async saveFile(postId: string, file: Express.Multer.File): Promise<string> {
    if (!SAFE_ID_RE.test(postId)) {
      throw new BadRequestException("不正なpostIdです");
    }
    const uploadDir = path.join(__dirname, "../../uploads", postId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const processedBuffer = await this.imageProcessing.process(file.buffer);

    const fileName = `${uuidv4()}.jpg`;
    fs.writeFileSync(path.join(uploadDir, fileName), processedBuffer);
    return `uploads/${postId}/${fileName}`;
  }

  deleteFile(url: string): void {
    if (!SAFE_URL_RE.test(url)) {
      return;
    }
    const filePath = path.join(__dirname, "../../", url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
