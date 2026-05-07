import { Injectable } from "@nestjs/common";
import { ImageProcessingService } from "../shared/image-processing.service";
import { FileStorageBase } from "../shared/file-storage.base";

@Injectable()
export class ConversationFileStorageService extends FileStorageBase {
  protected readonly subdir = "conversations";
  protected readonly invalidIdMessage = "不正なconversationIdです";

  constructor(imageProcessing: ImageProcessingService) {
    super(imageProcessing);
  }
}
