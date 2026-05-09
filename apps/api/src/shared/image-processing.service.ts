import { Injectable, BadRequestException } from "@nestjs/common";
import * as sharp from "sharp";
import { ERROR_CODES } from "../common/error-codes";

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
      throw new BadRequestException({
        code: ERROR_CODES.IMAGE_PROCESSING_ERROR,
        message: "画像処理に失敗しました。ファイルが破損または無効な形式です。",
      });
    }
  }
}
