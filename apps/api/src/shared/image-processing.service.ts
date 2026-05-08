import { Injectable, BadRequestException } from "@nestjs/common";
import * as sharp from "sharp";

@Injectable()
export class ImageProcessingService {
  async process(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        "画像処理に失敗しました。ファイルが破損または無効な形式です。"
      );
    }
  }
}
